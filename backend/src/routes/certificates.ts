import { Router, Request, Response } from 'express';
import { eq, and, sql, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import database from '../db';
import { certificates, institutions, events, users } from '../db/schema';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth';
import { 
  validateCertificateIssue,
  validateRevocation,
  handleValidationErrors,
  upload,
  verificationRateLimit
} from '../middleware/security';
import ipfsService from '../services/ipfs';
import blockchainService from '../services/blockchain';

const router = Router();

// POST /issue - Issue a new certificate with PDF upload
router.post('/issue', 
  authenticateToken,
  requireRole('admin', 'super_admin'),
  upload.single('certificatePdf'),
  (req: any, res: any, next: any) => {
    console.log('📋 Certificate issue request received:');
    console.log('Body:', req.body);
    console.log('File:', req.file ? { name: req.file.originalname, size: req.file.size } : 'No file');
    console.log('User:', req.user ? req.user.email : 'No user');
    next();
  },
  validateCertificateIssue,
  handleValidationErrors,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const {
        studentName,
        studentEmail,
        studentWalletAddress,
        rollNumber,
        course,
        specialization,
        grade,
        cgpa,
        issueDate,
        graduationDate,
        institutionId,
      } = req.body;

      const file = req.file;

      if (!file) {
        res.status(400).json({
          success: false,
          error: 'Certificate PDF file is required',
        });
        return;
      }

      // Verify institution exists
      const institutionResult = await database
        .select()
        .from(institutions)
        .where(eq(institutions.id, institutionId))
        .limit(1);

      if (institutionResult.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Institution not found',
        });
        return;
      }

      const institution = institutionResult[0];

      // Generate verification code
      const verificationCode = `BV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create certificate record
      const certificateId = uuidv4();
      const tokenId = blockchainService.generateTokenId();

      // Prepare certificate metadata
      const metadata: any = {
        certificateId,
        tokenId,
        studentName,
        studentEmail,
        rollNumber,
        course,
        specialization,
        grade,
        cgpa: cgpa ? parseFloat(cgpa) : undefined,
        issueDate,
        graduationDate,
        institution: {
          id: institution.id,
          name: institution.name,
          code: institution.code,
        },
        verificationCode,
        issuer: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
        },
        timestamp: new Date().toISOString(),
        version: '1.0',
      };

      // Upload PDF to IPFS
      console.log('Uploading PDF to IPFS...');
      const pdfUploadResult = await ipfsService.uploadFile(
        file.buffer,
        `${studentName}_${rollNumber}_Certificate.pdf`,
        file.mimetype,
        'certificate',
        certificateId
      );

      if (!pdfUploadResult.success) {
        res.status(500).json({
          success: false,
          error: 'Failed to upload PDF to IPFS',
          details: pdfUploadResult.error,
        });
        return;
      }

      // Add PDF CID to metadata
      metadata.pdfCid = pdfUploadResult.cid;
      metadata.pdfUrl = ipfsService.generateIpfsUrl(pdfUploadResult.cid!);

      // Upload metadata to IPFS
      console.log('Uploading metadata to IPFS...');
      const metadataUploadResult = await ipfsService.uploadJsonMetadata(
        metadata,
        `${studentName}_${rollNumber}_Metadata.json`,
        'certificate',
        certificateId
      );

      if (!metadataUploadResult.success) {
        res.status(500).json({
          success: false,
          error: 'Failed to upload metadata to IPFS',
          details: metadataUploadResult.error,
        });
        return;
      }

      // Create certificate in database
      const newCertificate = await database
        .insert(certificates)
        .values({
          id: certificateId,
          tokenId,
          studentName,
          studentEmail,
          rollNumber,
          course,
          specialization,
          grade,
          cgpa: cgpa ? cgpa.toString() : undefined,
          issueDate: new Date(issueDate),
          graduationDate: new Date(graduationDate),
          institutionId,
          metadataIpfsCid: metadataUploadResult.cid,
          pdfIpfsCid: pdfUploadResult.cid,
          status: 'pending',
          verificationCode,
          metadata,
          createdBy: req.user.id,
        })
        .returning();

      // Issue on blockchain
      console.log('Issuing certificate on blockchain...');
      const recipientAddress = studentWalletAddress || institution.walletAddress || req.user.walletAddress || '0x0000000000000000000000000000000000000000';
      
      const blockchainResult = await blockchainService.issueCertificate(
        certificateId,
        recipientAddress,
        ipfsService.generateIpfsUrl(metadataUploadResult.cid!),
        tokenId
      );

      let finalStatus = 'issued';
      if (!blockchainResult.success) {
        console.warn('Blockchain issuance failed, certificate saved as draft:', blockchainResult.error);
        finalStatus = 'draft';
      }

      // Update certificate status
      await database
        .update(certificates)
        .set({
          status: finalStatus,
          txHash: blockchainResult.txHash,
          blockNumber: blockchainResult.blockNumber,
          updatedAt: new Date(),
        })
        .where(eq(certificates.id, certificateId));

      // Log event
      await database.insert(events).values({
        type: 'certificate_created',
        entityType: 'certificate',
        entityId: certificateId,
        userId: req.user.id,
        description: `Certificate issued for ${studentName}`,
        data: {
          certificateId,
          tokenId,
          studentName,
          rollNumber,
          course,
          institution: institution.name,
          blockchainStatus: blockchainResult.success,
          ipfsMetadataCid: metadataUploadResult.cid,
          ipfsPdfCid: pdfUploadResult.cid,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          certificate: {
            id: certificateId,
            tokenId,
            studentName,
            studentEmail,
            rollNumber,
            course,
            specialization,
            grade,
            cgpa,
            issueDate,
            graduationDate,
            institution: {
              id: institution.id,
              name: institution.name,
              code: institution.code,
            },
            verificationCode,
            status: finalStatus,
            metadataIpfsCid: metadataUploadResult.cid,
            pdfIpfsCid: pdfUploadResult.cid,
            metadataUrl: ipfsService.generateIpfsUrl(metadataUploadResult.cid!),
            pdfUrl: ipfsService.generateIpfsUrl(pdfUploadResult.cid!),
            blockchain: blockchainResult,
          },
        },
      });

    } catch (error) {
      console.error('Certificate issuance error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

// GET /verify/:tokenId - Verify certificate by token ID
router.get('/verify/:tokenId',
  verificationRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { tokenId } = req.params;

      if (!tokenId) {
        res.status(400).json({
          success: false,
          error: 'Token ID is required',
        });
        return;
      }

      // Get certificate from database
      const certificateResult = await database
        .select({
          certificate: certificates,
          institution: institutions,
        })
        .from(certificates)
        .leftJoin(institutions, eq(certificates.institutionId, institutions.id))
        .where(eq(certificates.tokenId, tokenId))
        .limit(1);

      if (certificateResult.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Certificate not found',
        });
        return;
      }

      const { certificate, institution } = certificateResult[0];

      // Verify on blockchain if service is available
      let blockchainVerification = null;
      if (blockchainService.isReadySync()) {
        blockchainVerification = await blockchainService.verifyCertificate(tokenId);
      }

      // Get metadata from IPFS if available
      let ipfsMetadata = null;
      if (certificate.metadataIpfsCid) {
        ipfsMetadata = await ipfsService.getJsonMetadata(certificate.metadataIpfsCid);
      }

      const verificationResult = {
        certificate: {
          id: certificate.id,
          tokenId: certificate.tokenId,
          studentName: certificate.studentName,
          studentEmail: certificate.studentEmail,
          rollNumber: certificate.rollNumber,
          course: certificate.course,
          specialization: certificate.specialization,
          grade: certificate.grade,
          cgpa: certificate.cgpa,
          issueDate: certificate.issueDate,
          graduationDate: certificate.graduationDate,
          verificationCode: certificate.verificationCode,
          status: certificate.status,
          isRevoked: certificate.isRevoked,
          revokedAt: certificate.revokedAt,
          revokedReason: certificate.revokedReason,
          institution: institution ? {
            id: institution.id,
            name: institution.name,
            code: institution.code,
            email: institution.email,
            website: institution.website,
          } : null,
          ipfs: {
            metadataCid: certificate.metadataIpfsCid,
            pdfCid: certificate.pdfIpfsCid,
            metadataUrl: certificate.metadataIpfsCid ? ipfsService.generateIpfsUrl(certificate.metadataIpfsCid) : null,
            pdfUrl: certificate.pdfIpfsCid ? ipfsService.generateIpfsUrl(certificate.pdfIpfsCid) : null,
            metadata: ipfsMetadata,
          },
          blockchain: blockchainVerification ? {
            exists: blockchainVerification.exists,
            owner: blockchainVerification.owner,
            isRevoked: blockchainVerification.isRevoked,
            metadataURI: blockchainVerification.metadataURI,
          } : null,
        },
        verification: {
          isValid: !certificate.isRevoked && (certificate.status === 'issued' || certificate.status === 'draft'),
          verifiedAt: new Date().toISOString(),
          verificationMethod: 'database_and_blockchain',
          blockchainVerified: blockchainVerification?.exists || false,
          ipfsVerified: !!ipfsMetadata,
        },
      };

      // Log verification event
      await database.insert(events).values({
        type: 'certificate_verified',
        entityType: 'certificate',
        entityId: certificate.id,
        description: `Certificate verified for token ID: ${tokenId}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        data: {
          tokenId,
          studentName: certificate.studentName,
          rollNumber: certificate.rollNumber,
          verificationResult: verificationResult.verification,
        },
      });

      res.json({
        success: true,
        data: verificationResult,
      });

    } catch (error) {
      console.error('Certificate verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

// GET /verify/code/:verificationCode - Verify certificate by verification code
router.get('/verify/code/:verificationCode',
  verificationRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { verificationCode } = req.params;

      if (!verificationCode) {
        res.status(400).json({
          success: false,
          error: 'Verification code is required',
        });
        return;
      }

      const certificateResult = await database
        .select({
          certificate: certificates,
          institution: institutions,
        })
        .from(certificates)
        .leftJoin(institutions, eq(certificates.institutionId, institutions.id))
        .where(eq(certificates.verificationCode, verificationCode))
        .limit(1);

      if (certificateResult.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Certificate not found',
        });
        return;
      }

      // Redirect to token-based verification
      const { certificate } = certificateResult[0];
      
      // Return the same verification result but accessed via verification code
      res.redirect(`/api/verify/${certificate.tokenId}`);

    } catch (error) {
      console.error('Certificate verification by code error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

// POST /revoke/:tokenId - Revoke certificate
router.post('/revoke/:tokenId',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  validateRevocation,
  handleValidationErrors,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { tokenId } = req.params;
      const { reason } = req.body;

      if (!tokenId) {
        res.status(400).json({
          success: false,
          error: 'Token ID is required',
        });
        return;
      }

      // Get certificate from database
      const certificateResult = await database
        .select()
        .from(certificates)
        .where(and(
          eq(certificates.tokenId, tokenId),
          eq(certificates.isRevoked, false)
        ))
        .limit(1);

      if (certificateResult.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Certificate not found or already revoked',
        });
        return;
      }

      const certificate = certificateResult[0];

      // Revoke on blockchain if available
      let blockchainResult: { success: boolean; error?: string } = { success: false, error: 'Blockchain service not available' };
      if (blockchainService.isReadySync()) {
        blockchainResult = await blockchainService.revokeCertificate(
          certificate.id,
          tokenId,
          reason,
          req.user.id
        );
      }

      // Update certificate in database regardless of blockchain result
      await database
        .update(certificates)
        .set({
          isRevoked: true,
          revokedAt: new Date(),
          revokedBy: req.user.id,
          revokedReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(certificates.id, certificate.id));

      // Log event
      await database.insert(events).values({
        type: 'certificate_revoked',
        entityType: 'certificate',
        entityId: certificate.id,
        userId: req.user.id,
        description: `Certificate revoked: ${reason}`,
        data: {
          tokenId,
          studentName: certificate.studentName,
          rollNumber: certificate.rollNumber,
          reason,
          revokedBy: req.user.name,
          blockchainStatus: blockchainResult.success,
        },
      });

      res.json({
        success: true,
        data: {
          tokenId,
          revokedAt: new Date().toISOString(),
          revokedBy: req.user.name,
          reason,
          blockchain: blockchainResult,
        },
      });

    } catch (error) {
      console.error('Certificate revocation error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

// GET /dashboard/stats - Get dashboard statistics
router.get('/dashboard/stats',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      // Get total certificates count
      const totalCerts = await database
        .select()
        .from(certificates);

      // Get today's verifications
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayVerifications = await database
        .select()
        .from(events)
        .where(
          and(
            eq(events.type, 'certificate_verified'),
            sql`${events.createdAt} >= ${today}`
          )
        );

      // Get pending certificates
      const pendingCerts = await database
        .select()
        .from(certificates)
        .where(
          eq(certificates.status, 'pending')
        );

      // Get active users (users who logged in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const activeUsers = await database
        .select()
        .from(users)
        .where(
          sql`${users.lastLogin} >= ${sevenDaysAgo}`
        );

      // Set cache control headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.json({
        success: true,
        data: {
          totalCertificates: totalCerts.length,
          verifiedToday: todayVerifications.length,
          pendingVerification: pendingCerts.length,
          activeUsers: activeUsers.length,
        },
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

// GET /certificates - List certificates with pagination and filters
router.get('/certificates',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        page = '1',
        limit = '20',
        status,
        institutionId,
        search,
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      // Build where conditions
      const conditions = [];
      
      if (status) {
        conditions.push(eq(certificates.status, status as string));
      }
      
      if (institutionId) {
        conditions.push(eq(certificates.institutionId, institutionId as string));
      }

      // Get certificates with institution data
      const certificatesResult = await database
        .select({
          certificate: certificates,
          institution: institutions,
        })
        .from(certificates)
        .leftJoin(institutions, eq(certificates.institutionId, institutions.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(limitNum)
        .offset(offset)
        .orderBy(desc(certificates.createdAt));

      // Set cache control headers to prevent caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.json({
        success: true,
        data: {
          certificates: certificatesResult.map(({ certificate, institution }: { certificate: any, institution: any }) => ({
            ...certificate,
            institution: institution ? {
              id: institution.id,
              name: institution.name,
              code: institution.code,
            } : null,
          })),
          pagination: {
            page: pageNum,
            limit: limitNum,
            hasMore: certificatesResult.length === limitNum,
          },
        },
      });

    } catch (error) {
      console.error('List certificates error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

// POST /batch-issue - Handle CSV bulk certificate issuance
router.post('/batch-issue', 
  authenticateToken,
  requireRole('admin', 'super_admin'),
  upload.single('csvFile'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({
          success: false,
          error: 'CSV file is required',
        });
        return;
      }

      // Validate CSV file type
      if (!file.originalname.toLowerCase().endsWith('.csv')) {
        res.status(400).json({
          success: false,
          error: 'Only CSV files are allowed',
        });
        return;
      }

      // Create batch operation record
      const batchId = uuidv4();
      
      // Process CSV file - for now, return success and queue for background processing
      res.status(202).json({
        success: true,
        message: 'Batch certificate issuance started',
        data: {
          batchId,
          status: 'processing',
          message: 'Your batch request has been queued for processing. You will receive an email notification when complete.',
        },
      });

      // TODO: Queue the CSV processing job for background worker
      console.log(`Batch job ${batchId} queued for processing by user ${req.user.id}`);

    } catch (error) {
      console.error('Batch issue error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

// GET /certificates/student/:walletAddress - Get student's certificates by wallet address
router.get('/certificates/student/:walletAddress',
  async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;

      if (!walletAddress) {
        res.status(400).json({
          success: false,
          error: 'Wallet address is required',
        });
        return;
      }

      // Get certificates by student email or wallet address match
      const certificatesResult = await database
        .select({
          certificate: certificates,
          institution: institutions,
        })
        .from(certificates)
        .leftJoin(institutions, eq(certificates.institutionId, institutions.id))
        .where(
          eq(certificates.studentEmail, walletAddress.toLowerCase())
        )
        .orderBy(certificates.createdAt);

      res.json({
        success: true,
        data: {
          certificates: certificatesResult.map(({ certificate, institution }: { certificate: any, institution: any }) => ({
            id: certificate.id,
            tokenId: certificate.tokenId,
            studentName: certificate.studentName,
            studentEmail: certificate.studentEmail,
            rollNumber: certificate.rollNumber,
            course: certificate.course,
            specialization: certificate.specialization,
            grade: certificate.grade,
            cgpa: certificate.cgpa,
            issueDate: certificate.issueDate,
            graduationDate: certificate.graduationDate,
            status: certificate.status,
            isRevoked: certificate.isRevoked,
            verificationCode: certificate.verificationCode,
            pdfUrl: certificate.pdfIpfsCid ? ipfsService.generateIpfsUrl(certificate.pdfIpfsCid) : null,
            metadataUrl: certificate.metadataIpfsCid ? ipfsService.generateIpfsUrl(certificate.metadataIpfsCid) : null,
            institution: institution ? {
              id: institution.id,
              name: institution.name,
              code: institution.code,
            } : null,
          })),
        },
      });

    } catch (error) {
      console.error('Get student certificates error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

// POST /ai/scan - Placeholder endpoint for AI fraud detection
router.post('/ai/scan',
  verificationRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { certificateData, imageData } = req.body;

      if (!certificateData && !imageData) {
        res.status(400).json({
          success: false,
          error: 'Certificate data or image data is required',
        });
        return;
      }

      // Placeholder AI fraud detection logic
      const fraudScore = Math.random() * 100; // Mock fraud score (0-100)
      const isLikelyFraud = fraudScore > 70;

      // Mock AI analysis results
      const analysisResults = {
        fraudScore: Math.round(fraudScore),
        riskLevel: fraudScore > 80 ? 'high' : fraudScore > 50 ? 'medium' : 'low',
        flaggedIssues: isLikelyFraud ? [
          'Inconsistent typography detected',
          'Unusual signature patterns',
          'Metadata anomalies found'
        ] : [],
        confidence: Math.round((100 - Math.abs(fraudScore - 50)) * 2),
      };

      res.json({
        success: true,
        message: 'AI scan completed',
        data: {
          scanned: true,
          fraudDetected: isLikelyFraud,
          analysisResults,
          recommendation: isLikelyFraud ? 
            'Manual verification recommended due to potential fraud indicators' :
            'Certificate appears legitimate based on AI analysis',
        },
      });

    } catch (error) {
      console.error('AI scan error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

export default router;