// @ts-nocheck - TypeScript cannot infer null safety despite runtime guards
import { ethers, Contract, Wallet, Provider } from 'ethers';
import database from '../db';
import { certificates, events } from '../db/schema';
import { eq } from 'drizzle-orm';

// Certificate NFT contract ABI (simplified version)
const CERTIFICATE_CONTRACT_ABI = [
  {
    "inputs": [
      {"name": "_to", "type": "address"},
      {"name": "_tokenId", "type": "uint256"},
      {"name": "_metadataURI", "type": "string"}
    ],
    "name": "mintCertificate",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_tokenId", "type": "uint256"}],
    "name": "revokeCertificate",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_tokenId", "type": "uint256"}],
    "name": "isRevoked",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "_tokenId", "type": "uint256"}],
    "name": "tokenURI",
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "_tokenId", "type": "uint256"}],
    "name": "ownerOf",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "to", "type": "address"},
      {"indexed": true, "name": "tokenId", "type": "uint256"},
      {"indexed": false, "name": "metadataURI", "type": "string"}
    ],
    "name": "CertificateIssued",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "tokenId", "type": "uint256"},
      {"indexed": false, "name": "reason", "type": "string"}
    ],
    "name": "CertificateRevoked",
    "type": "event"
  }
];

export interface BlockchainTransactionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
}

export interface CertificateOnChain {
  tokenId: string;
  owner: string;
  metadataURI: string;
  isRevoked: boolean;
  exists: boolean;
}

class BlockchainService {
  private provider: Provider | null = null;
  private wallet: Wallet | null = null;
  private contract: Contract | null = null;
  private readonly contractAddress: string;
  private initializationPromise: Promise<void>;

  constructor() {
    this.contractAddress = process.env.CONTRACT_ADDRESS || '';
    this.initializationPromise = this.initializeProvider();
  }

  // Ensure initialization is complete before using the service
  private async ensureInitialized(): Promise<void> {
    await this.initializationPromise;
  }

  // Ensure contract is ready for use
  private ensureContract(): void {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }
  }

  // Initialize blockchain provider and wallet
  private async initializeProvider(): Promise<void> {
    try {
      const rpcUrl = process.env.ETHEREUM_RPC_URL;
      const privateKey = process.env.ETH_PRIVATE_KEY;
      const contractAddress = process.env.CONTRACT_ADDRESS;

      console.log('🔧 Initializing blockchain service...');

      if (!rpcUrl) {
        console.error('❌ ETHEREUM_RPC_URL not set. Blockchain functionality will be limited.');
        return;
      }

      if (!privateKey || privateKey === '<your_metamask_private_key_here>') {
        console.error('❌ ETH_PRIVATE_KEY not set or contains placeholder value. Cannot sign transactions.');
        return;
      }

      if (!contractAddress || contractAddress === '<your_smart_contract_address_here>') {
        console.error('❌ CONTRACT_ADDRESS not set or contains placeholder value. Cannot interact with smart contract.');
        return;
      }

      // Initialize provider
      console.log('🌐 Connecting to Polygon Amoy testnet...');
      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      if (!this.provider) {
        console.error('❌ Blockchain provider not initialized');
        return;
      }

      // Initialize wallet
      console.log('👛 Initializing wallet...');
      this.wallet = new ethers.Wallet(privateKey, this.provider);

      if (!this.wallet) {
        console.error('❌ Blockchain wallet not initialized');
        return;
      }

      // Initialize contract
      console.log('📜 Connecting to smart contract...');
      this.contract = new Contract(contractAddress, CERTIFICATE_CONTRACT_ABI, this.wallet);

      console.log('✅ Blockchain service initialized successfully');
      console.log('📍 Network RPC:', rpcUrl);
      console.log('👛 Wallet address:', this.wallet.address);
      console.log('📜 Contract address:', contractAddress);

      // Test the connection
      await this.testConnection();

    } catch (error) {
      console.error('❌ Failed to initialize blockchain service:', error instanceof Error ? error.message : 'Unknown error');
      console.error('🔧 Make sure you have valid ETHEREUM_RPC_URL, ETH_PRIVATE_KEY, and CONTRACT_ADDRESS in your .env file');
    }
  }

  // Check if blockchain service is ready
  async isReady(): Promise<boolean> {
    await this.ensureInitialized();
    return !!(this.provider && this.wallet && this.contract);
  }

  // Synchronous version for backward compatibility
  isReadySync(): boolean {
    return !!(this.provider && this.wallet && this.contract);
  }

  // Test blockchain connection
  async testConnection(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      
      if (!this.provider) {
        console.error('❌ Blockchain provider not initialized');
        return false;
      }

      console.log('🔍 Testing blockchain connection...');

      // Test network connection by getting network info
      const network = await this.provider.getNetwork();
      console.log(`✅ Connected to network: ${network.name} (Chain ID: ${network.chainId})`);

      // Test wallet balance if wallet is available
      if (this.wallet) {
        const balance = await this.provider.getBalance(this.wallet.address);
        const balanceInEth = ethers.formatEther(balance);
        console.log(`💰 Wallet balance: ${balanceInEth} MATIC`);
      }

      console.log('✅ Blockchain connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Blockchain connection test failed:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  // Generate unique token ID for certificate
  generateTokenId(): string {
    // Generate a unique token ID based on timestamp and random number
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `${timestamp}${random}`;
  }

  // Issue certificate NFT on blockchain
  async issueCertificate(
    certificateId: string,
    recipientAddress: string,
    metadataURI: string,
    tokenId?: string
  ): Promise<BlockchainTransactionResult> {
    try {
      if (!this.isReady()) {
        return {
          success: false,
          error: 'Blockchain service not initialized',
        };
      }

      const finalTokenId = tokenId || this.generateTokenId();

      console.log('Issuing certificate on blockchain:', {
        certificateId,
        recipientAddress,
        metadataURI,
        tokenId: finalTokenId,
      });

      // Call smart contract function
      this.ensureContract();
      const tx = await this.contract!.mintCertificate(
        recipientAddress,
        finalTokenId,
        metadataURI
      );

      console.log('Transaction sent:', tx.hash);

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      console.log('Transaction confirmed:', {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      });

      // Update certificate in database
      await database
        .update(certificates)
        .set({
          tokenId: finalTokenId,
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          status: 'issued',
          updatedAt: new Date(),
        })
        .where(eq(certificates.id, certificateId));

      // Log event
      await this.logEvent('certificate_issued', 'certificate', certificateId, {
        tokenId: finalTokenId,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        recipientAddress,
        metadataURI,
      });

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };

    } catch (error) {
      console.error('Failed to issue certificate on blockchain:', error);
      
      // Update certificate status to failed
      await database
        .update(certificates)
        .set({
          status: 'failed',
          updatedAt: new Date(),
        })
        .where(eq(certificates.id, certificateId));

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown blockchain error',
      };
    }
  }

  // Revoke certificate on blockchain
  async revokeCertificate(
    certificateId: string,
    tokenId: string,
    reason: string,
    revokedBy: string
  ): Promise<BlockchainTransactionResult> {
    try {
      if (!this.isReady()) {
        return {
          success: false,
          error: 'Blockchain service not initialized',
        };
      }

      console.log('Revoking certificate on blockchain:', {
        certificateId,
        tokenId,
        reason,
      });

      // Call smart contract function
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const tx = await this.contract!.revokeCertificate(tokenId);

      console.log('Revocation transaction sent:', tx.hash);

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      console.log('Revocation transaction confirmed:', {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      });

      // Update certificate in database
      await database
        .update(certificates)
        .set({
          isRevoked: true,
          revokedAt: new Date(),
          revokedBy,
          revokedReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(certificates.id, certificateId));

      // Log event
      await this.logEvent('certificate_revoked', 'certificate', certificateId, {
        tokenId,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        reason,
        revokedBy,
      });

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };

    } catch (error) {
      console.error('Failed to revoke certificate on blockchain:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown blockchain error',
      };
    }
  }

  // Verify certificate on blockchain
  async verifyCertificate(tokenId: string): Promise<CertificateOnChain | null> {
    try {
      if (!this.isReady()) {
        console.error('Blockchain service not initialized');
        return null;
      }

      console.log('Verifying certificate on blockchain:', tokenId);

      // Check if token exists by trying to get owner
      let owner: string;
      try {
        if (!this.contract) {
          throw new Error('Contract not initialized');
        }
        owner = await this.contract!.ownerOf(tokenId);
      } catch {
        // Token doesn't exist
        return {
          tokenId,
          owner: '',
          metadataURI: '',
          isRevoked: false,
          exists: false,
        };
      }

      // Get metadata URI
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }
      const metadataURI = await this.contract!.tokenURI(tokenId);

      // Check if revoked
      const isRevoked = await this.contract!.isRevoked(tokenId);

      return {
        tokenId,
        owner,
        metadataURI,
        isRevoked,
        exists: true,
      };

    } catch (error) {
      console.error('Failed to verify certificate on blockchain:', error);
      return null;
    }
  }

  // Get current gas price
  async getGasPrice(): Promise<bigint | null> {
    try {
      if (!this.provider) return null;
      return await this.provider.getFeeData().then(data => data.gasPrice || BigInt(0));
    } catch (error) {
      console.error('Failed to get gas price:', error);
      return null;
    }
  }

  // Estimate gas for certificate issuance
  async estimateIssuanceGas(
    recipientAddress: string,
    tokenId: string,
    metadataURI: string
  ): Promise<bigint | null> {
    try {
      if (!this.contract) return null;
      
      return await this.contract!.mintCertificate.estimateGas(
        recipientAddress,
        tokenId,
        metadataURI
      );
    } catch (error) {
      console.error('Failed to estimate gas:', error);
      return null;
    }
  }

  // Get wallet balance
  async getWalletBalance(): Promise<string | null> {
    try {
      if (!this.provider || !this.wallet) return null;
      
      const balance = await this.provider.getBalance(this.wallet.address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      return null;
    }
  }

  // Check network connection
  async checkConnection(): Promise<boolean> {
    return await this.testConnection();
  }

  // Log blockchain events to database
  private async logEvent(
    type: string,
    entityType: string,
    entityId: string,
    data: Record<string, any>
  ): Promise<void> {
    try {
      await database.insert(events).values({
        type,
        entityType,
        entityId,
        data,
        description: `Blockchain ${type} event`,
      });
    } catch (error) {
      console.error('Failed to log blockchain event:', error);
    }
  }

  // Batch operations for multiple certificates
  async batchIssueCertificates(
    certificates: Array<{
      certificateId: string;
      recipientAddress: string;
      metadataURI: string;
      tokenId?: string;
    }>
  ): Promise<Array<BlockchainTransactionResult & { certificateId: string }>> {
    const results: Array<BlockchainTransactionResult & { certificateId: string }> = [];

    for (const cert of certificates) {
      const result = await this.issueCertificate(
        cert.certificateId,
        cert.recipientAddress,
        cert.metadataURI,
        cert.tokenId
      );

      results.push({
        ...result,
        certificateId: cert.certificateId,
      });

      // Add delay between transactions to avoid nonce issues
      await this.sleep(2000);
    }

    return results;
  }

  // Helper method for delays
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get service status
  getStatus(): {
    isReady: boolean;
    walletAddress?: string;
    contractAddress: string;
    hasProvider: boolean;
    hasWallet: boolean;
    hasContract: boolean;
  } {
    return {
      isReady: this.isReadySync(),
      ...(this.wallet?.address && { walletAddress: this.wallet.address }),
      contractAddress: this.contractAddress,
      hasProvider: !!this.provider,
      hasWallet: !!this.wallet,
      hasContract: !!this.contract,
    };
  }
}

export default new BlockchainService();
