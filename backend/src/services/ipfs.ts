import axios from 'axios';
import FormData from 'form-data';
import database from '../db';
import { ipfsPins } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export interface IpfsUploadResult {
  success: boolean;
  cid?: string;
  error?: string;
  size?: number;
  timestamp?: string;
}

export interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
  isDuplicate?: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}

class IpfsService {
  private readonly pinataApiKey: string;
  private readonly pinataSecretKey: string;
  private readonly pinataJwt: string;
  private readonly retryConfig: RetryConfig;

  constructor() {
    // Use provided credentials for testing, fallback to environment variables
    this.pinataApiKey = process.env.PINATA_API_KEY || '8145f7000d1b68cbe0ef';
    this.pinataSecretKey = process.env.PINATA_SECRET || '2050ba0cbfaa61a3ee04de841b8fb1e1377d775aa7db3ec34df5419d7228a25e';
    this.pinataJwt = process.env.PINATA_JWT || '';
    
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
    };

    if (!this.pinataApiKey || !this.pinataSecretKey) {
      console.warn('Pinata credentials not found. IPFS functionality will be limited.');
    } else {
      console.log('Pinata service initialized with credentials');
    }
  }

  // Test Pinata connection
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Pinata connection...');
      
      const response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
        headers: {
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey,
        },
        timeout: 10000, // 10 second timeout
      });
      
      const isConnected = response.status === 200 && response.data.message === 'Congratulations! You are communicating with the Pinata API!';
      
      if (isConnected) {
        console.log('✅ Pinata connected successfully');
        return true;
      } else {
        console.error('❌ Pinata connection failed: Invalid response');
        return false;
      }
    } catch (error) {
      console.error('❌ Pinata connection test failed:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  // Upload JSON metadata to IPFS
  async uploadJsonMetadata(
    metadata: Record<string, any>,
    fileName: string,
    entityType: string,
    entityId: string
  ): Promise<IpfsUploadResult> {
    try {
      const jsonData = JSON.stringify(metadata, null, 2);
      const formData = new FormData();
      
      formData.append('file', Buffer.from(jsonData), {
        filename: fileName,
        contentType: 'application/json',
      });

      const pinataMetadata = {
        name: fileName,
        keyvalues: {
          entityType,
          entityId,
          type: 'metadata',
          createdAt: new Date().toISOString(),
        },
      };

      formData.append('pinataMetadata', JSON.stringify(pinataMetadata));

      const result = await this.uploadWithRetry(formData, 'metadata', entityType, entityId, fileName);
      return result;
    } catch (error) {
      console.error('Failed to upload JSON metadata:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Upload file (PDF, image, etc.) to IPFS
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    entityType: string,
    entityId: string
  ): Promise<IpfsUploadResult> {
    try {
      const formData = new FormData();
      
      formData.append('file', fileBuffer, {
        filename: fileName,
        contentType: mimeType,
      });

      const fileType = this.getFileTypeFromMimeType(mimeType);
      const pinataMetadata = {
        name: fileName,
        keyvalues: {
          entityType,
          entityId,
          type: fileType,
          mimeType,
          createdAt: new Date().toISOString(),
        },
      };

      formData.append('pinataMetadata', JSON.stringify(pinataMetadata));

      const result = await this.uploadWithRetry(formData, fileType, entityType, entityId, fileName, mimeType);
      return result;
    } catch (error) {
      console.error('Failed to upload file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Upload with retry logic
  private async uploadWithRetry(
    formData: FormData,
    type: string,
    entityType: string,
    entityId: string,
    fileName: string,
    mimeType?: string
  ): Promise<IpfsUploadResult> {
    let lastError: Error | null = null;
    let delay = this.retryConfig.retryDelay;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await axios.post(
          'https://api.pinata.cloud/pinning/pinFileToIPFS',
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              'pinata_api_key': this.pinataApiKey,
              'pinata_secret_api_key': this.pinataSecretKey,
            },
            timeout: 30000, // 30 seconds timeout
          }
        );

        const pinataResponse: PinataResponse = response.data;

        // Save successful pin to database
        await this.savePinRecord({
          cid: pinataResponse.IpfsHash,
          type,
          entityType,
          entityId,
          status: 'pinned',
          pinataResponse: response.data,
          fileName,
          fileSize: pinataResponse.PinSize,
          mimeType: mimeType || 'application/json',
          retryCount: attempt,
        });

        return {
          success: true,
          cid: pinataResponse.IpfsHash,
          size: pinataResponse.PinSize,
          timestamp: pinataResponse.Timestamp,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`Upload attempt ${attempt + 1} failed:`, lastError.message);

        if (attempt < this.retryConfig.maxRetries) {
          console.log(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
          delay *= this.retryConfig.backoffMultiplier;
        }
      }
    }

    // Save failed pin record
    await this.savePinRecord({
      cid: '',
      type,
      entityType,
      entityId,
      status: 'failed',
      fileName,
      mimeType: mimeType || 'application/json',
      retryCount: this.retryConfig.maxRetries,
      errorMessage: lastError?.message || 'Unknown error',
    });

    return {
      success: false,
      error: lastError?.message || 'All retry attempts failed',
    };
  }

  // Get file content from IPFS
  async getFile(cid: string): Promise<Buffer | null> {
    try {
      const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Failed to get file from IPFS:', error);
      return null;
    }
  }

  // Get JSON metadata from IPFS
  async getJsonMetadata(cid: string): Promise<Record<string, any> | null> {
    try {
      const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`, {
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get JSON metadata from IPFS:', error);
      return null;
    }
  }

  // Unpin file from Pinata
  async unpinFile(cid: string): Promise<boolean> {
    try {
      await axios.delete(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
        headers: {
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey,
        },
      });

      // Update database record
      await database
        .update(ipfsPins)
        .set({ 
          status: 'unpinned',
          updatedAt: new Date(),
        })
        .where(eq(ipfsPins.cid, cid));

      return true;
    } catch (error) {
      console.error('Failed to unpin file:', error);
      return false;
    }
  }

  // Get pin status from database
  async getPinStatus(cid: string): Promise<any> {
    try {
      const pins = await database
        .select()
        .from(ipfsPins)
        .where(eq(ipfsPins.cid, cid))
        .limit(1);

      return pins[0] || null;
    } catch (error) {
      console.error('Failed to get pin status:', error);
      return null;
    }
  }

  // Retry failed pins
  async retryFailedPins(): Promise<void> {
    try {
      const failedPins = await database
        .select()
        .from(ipfsPins)
        .where(
          and(
            eq(ipfsPins.status, 'failed'),
            // Only retry pins that haven't been retried recently
            // Add your time-based logic here if needed
          )
        );

      for (const pin of failedPins) {
        console.log(`Retrying failed pin: ${pin.id}`);
        // Implement retry logic based on the original file data
        // This would require storing the original file data or having a way to regenerate it
      }
    } catch (error) {
      console.error('Failed to retry failed pins:', error);
    }
  }

  // Save pin record to database
  private async savePinRecord(data: {
    cid: string;
    type: string;
    entityType: string;
    entityId: string;
    status: string;
    pinataResponse?: any;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    retryCount?: number;
    errorMessage?: string;
  }): Promise<void> {
    try {
      await database.insert(ipfsPins).values({
        cid: data.cid,
        type: data.type,
        entityType: data.entityType,
        entityId: data.entityId,
        status: data.status,
        pinataResponse: data.pinataResponse,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        retryCount: data.retryCount || 0,
        errorMessage: data.errorMessage,
      });
    } catch (error) {
      console.error('Failed to save pin record:', error);
    }
  }

  // Helper methods
  private getFileTypeFromMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('text/')) return 'text';
    return 'file';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Generate IPFS URL for a CID
  generateIpfsUrl(cid: string): string {
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }

  // Validate CID format
  isValidCid(cid: string): boolean {
    // Basic CID validation (you can make this more robust)
    return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$|^baf[a-z0-9]{56}$/.test(cid);
  }

  // Convenience method: Upload certificate PDF
  async uploadCertificatePdf(
    pdfBuffer: Buffer,
    certificateId: string,
    fileName?: string
  ): Promise<IpfsUploadResult> {
    const finalFileName = fileName || `certificate-${certificateId}.pdf`;
    
    console.log(`📤 Uploading certificate PDF to IPFS: ${finalFileName}`);
    
    const result = await this.uploadFile(
      pdfBuffer,
      finalFileName,
      'application/pdf',
      'certificate',
      certificateId
    );

    if (result.success) {
      console.log(`✅ Certificate PDF uploaded successfully: ${result.cid}`);
    } else {
      console.error(`❌ Failed to upload certificate PDF: ${result.error}`);
    }

    return result;
  }

  // Convenience method: Upload certificate metadata JSON
  async uploadCertificateMetadata(
    metadata: Record<string, any>,
    certificateId: string,
    fileName?: string
  ): Promise<IpfsUploadResult> {
    const finalFileName = fileName || `certificate-metadata-${certificateId}.json`;
    
    console.log(`📤 Uploading certificate metadata to IPFS: ${finalFileName}`);
    
    const result = await this.uploadJsonMetadata(
      metadata,
      finalFileName,
      'certificate',
      certificateId
    );

    if (result.success) {
      console.log(`✅ Certificate metadata uploaded successfully: ${result.cid}`);
    } else {
      console.error(`❌ Failed to upload certificate metadata: ${result.error}`);
    }

    return result;
  }

  // Get connection status (useful for health checks)
  getConnectionStatus(): { connected: boolean; credentials: boolean } {
    const hasCredentials = !!(this.pinataApiKey && this.pinataSecretKey);
    return {
      connected: hasCredentials, // Basic check - would need to call testConnection() for real status
      credentials: hasCredentials,
    };
  }
}

export default new IpfsService();
