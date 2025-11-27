import Queue from 'bull';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import nodemailer from 'nodemailer';
import database from '../db';
import { certificates, batchOperations, events, ipfsPins } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import ipfsService from '../services/ipfs';
import blockchainService from '../services/blockchain';

// Initialize Redis connection for Bull queue
const redisConfig = {
  redis: {
    port: parseInt(process.env.REDIS_PORT || '6379'),
    host: process.env.REDIS_HOST || 'localhost',
    password: process.env.REDIS_PASSWORD,
  },
};

// Create queues
export const certificateQueue = new Queue('certificate processing', redisConfig);
export const ipfsRetryQueue = new Queue('ipfs retry', redisConfig);
export const emailQueue = new Queue('email notifications', redisConfig);

// Email transporter setup
let emailTransporter: any = null;

try {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    console.warn('Email configuration not found. Email notifications will be disabled.');
  }
} catch (error) {
  console.warn('Failed to initialize email transporter:', error);
}

// Batch certificate issuance job processor
certificateQueue.process('batch-issue', async (job) => {
  const { batchId, csvData, institutionId, createdBy } = job.data;
  
  try {
    console.log(`Processing batch certificate issuance: ${batchId}`);
    
    // Update batch operation status
    await database
      .update(batchOperations)
      .set({ 
        status: 'processing',
        updatedAt: new Date(),
      })
      .where(eq(batchOperations.id, batchId));

    const results = [];
    let totalRecords = 0;
    let processedRecords = 0;
    let successfulRecords = 0;
    let failedRecords = 0;

    // Parse CSV data
    const stream = Readable.from([csvData]);
    const certificates = [];
    
    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on('data', (row) => {
          certificates.push(row);
          totalRecords++;
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Process each certificate
    for (const cert of certificates) {
      try {
        processedRecords++;
        
        // Validate required fields
        if (!cert.studentName || !cert.studentEmail || !cert.rollNumber || !cert.course) {
          throw new Error('Missing required fields');
        }

        // Generate certificate data
        const certificateId = require('uuid').v4();
        const tokenId = blockchainService.generateTokenId();
        const verificationCode = `BV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Create metadata
        const metadata = {
          certificateId,
          tokenId,
          studentName: cert.studentName,
          studentEmail: cert.studentEmail,
          rollNumber: cert.rollNumber,
          course: cert.course,
          specialization: cert.specialization || null,
          grade: cert.grade || null,
          cgpa: cert.cgpa ? parseFloat(cert.cgpa) : null,
          issueDate: cert.issueDate || new Date().toISOString(),
          graduationDate: cert.graduationDate || new Date().toISOString(),
          verificationCode,
          batchId,
          timestamp: new Date().toISOString(),
          version: '1.0',
        };

        // Upload metadata to IPFS
        const metadataUploadResult = await ipfsService.uploadJsonMetadata(
          metadata,
          `${cert.studentName}_${cert.rollNumber}_Metadata.json`,
          'certificate',
          certificateId
        );

        if (!metadataUploadResult.success) {
          throw new Error(`IPFS metadata upload failed: ${metadataUploadResult.error}`);
        }

        // Create certificate in database
        await database.insert(certificates).values({
          id: certificateId,
          tokenId,
          studentName: cert.studentName,
          studentEmail: cert.studentEmail,
          rollNumber: cert.rollNumber,
          course: cert.course,
          specialization: cert.specialization || null,
          grade: cert.grade || null,
          cgpa: cert.cgpa || null,
          issueDate: new Date(cert.issueDate || Date.now()),
          graduationDate: new Date(cert.graduationDate || Date.now()),
          institutionId,
          metadataIpfsCid: metadataUploadResult.cid,
          status: 'pending',
          verificationCode,
          metadata,
          createdBy,
        });

        // Issue on blockchain
        const blockchainResult = await blockchainService.issueCertificate(
          certificateId,
          '0x0000000000000000000000000000000000000000', // Default recipient
          ipfsService.generateIpfsUrl(metadataUploadResult.cid!),
          tokenId
        );

        // Update certificate status
        await database
          .update(certificates)
          .set({
            status: blockchainResult.success ? 'issued' : 'draft',
            txHash: blockchainResult.txHash || null,
            blockNumber: blockchainResult.blockNumber || null,
            updatedAt: new Date(),
          })
          .where(eq(certificates.id, certificateId));

        // Queue email notification
        await emailQueue.add('certificate-issued', {
          to: cert.studentEmail,
          studentName: cert.studentName,
          course: cert.course,
          verificationCode,
          certificateUrl: `${process.env.FRONTEND_URL}/verify/${tokenId}`,
        });

        results.push({
          row: processedRecords,
          status: 'success',
          certificateId,
          tokenId,
          verificationCode,
          blockchain: blockchainResult.success,
        });
        
        successfulRecords++;

      } catch (error) {
        console.error(`Failed to process certificate row ${processedRecords}:`, error);
        
        results.push({
          row: processedRecords,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        
        failedRecords++;
      }

      // Update progress
      await database
        .update(batchOperations)
        .set({
          processedRecords,
          successfulRecords,
          failedRecords,
          updatedAt: new Date(),
        })
        .where(eq(batchOperations.id, batchId));
    }

    // Final update
    await database
      .update(batchOperations)
      .set({
        status: 'completed',
        totalRecords,
        processedRecords,
        successfulRecords,
        failedRecords,
        results,
        updatedAt: new Date(),
      })
      .where(eq(batchOperations.id, batchId));

    console.log(`Batch processing completed: ${batchId}`);
    return { batchId, totalRecords, successfulRecords, failedRecords };

  } catch (error) {
    console.error(`Batch processing failed: ${batchId}`, error);
    
    await database
      .update(batchOperations)
      .set({
        status: 'failed',
        errorLog: [{ error: error instanceof Error ? error.message : 'Unknown error' }],
        updatedAt: new Date(),
      })
      .where(eq(batchOperations.id, batchId));

    throw error;
  }
});

// IPFS retry job processor
ipfsRetryQueue.process('retry-pin', async (job) => {
  const { pinId } = job.data;
  
  try {
    console.log(`Retrying IPFS pin: ${pinId}`);
    
    // Get pin record
    const pinResult = await database
      .select()
      .from(ipfsPins)
      .where(eq(ipfsPins.id, pinId))
      .limit(1);

    if (pinResult.length === 0) {
      throw new Error('Pin record not found');
    }

    const pin = pinResult[0];

    if (pin.status === 'pinned') {
      console.log(`Pin ${pinId} already successful`);
      return;
    }

    // Update retry count
    const newRetryCount = pin.retryCount + 1;
    await database
      .update(ipfsPins)
      .set({
        retryCount: newRetryCount,
        lastRetryAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(ipfsPins.id, pinId));

    // Attempt to re-pin based on type
    let result;
    if (pin.type === 'metadata') {
      // Retry metadata pinning - would need original data
      console.log(`Metadata retry for pin ${pinId} - requires original data`);
      return;
    } else {
      // Retry file pinning - would need original file
      console.log(`File retry for pin ${pinId} - requires original file`);
      return;
    }

  } catch (error) {
    console.error(`IPFS retry failed: ${pinId}`, error);
    
    // Update error message
    await database
      .update(ipfsPins)
      .set({
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date(),
      })
      .where(eq(ipfsPins.id, pinId));

    throw error;
  }
});

// Email notification job processor
emailQueue.process('certificate-issued', async (job) => {
  const { to, studentName, course, verificationCode, certificateUrl } = job.data;
  
  try {
    if (!emailTransporter) {
      console.log('Email transporter not available, skipping notification');
      return { success: false, error: 'Email not configured' };
    }
    
    console.log(`Sending certificate notification to: ${to}`);
    
    const mailOptions = {
      from: process.env.SMTP_USER,
      to,
      subject: 'Your Digital Certificate is Ready',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Congratulations, ${studentName}!</h2>
          
          <p>Your digital certificate for <strong>${course}</strong> has been successfully issued and is now available on the blockchain.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Certificate Details:</h3>
            <p><strong>Student:</strong> ${studentName}</p>
            <p><strong>Course:</strong> ${course}</p>
            <p><strong>Verification Code:</strong> ${verificationCode}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${certificateUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Your Certificate
            </a>
          </div>
          
          <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb;">
            <h4 style="margin-top: 0; color: #1e40af;">About Your Digital Certificate:</h4>
            <ul style="margin-bottom: 0;">
              <li>Secured on blockchain technology for permanent verification</li>
              <li>Stored on IPFS for decentralized access</li>
              <li>Verifiable anywhere, anytime using the verification code</li>
              <li>Tamper-proof and cryptographically secure</li>
            </ul>
          </div>
          
          <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
            You can verify this certificate at any time by visiting our verification portal and entering your verification code: <strong>${verificationCode}</strong>
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #6b7280; font-size: 12px; text-align: center;">
            This is an automated message from BlockVerify. Please do not reply to this email.
          </p>
        </div>
      `,
    };

    await emailTransporter.sendMail(mailOptions);
    
    console.log(`Certificate notification sent successfully to: ${to}`);
    return { success: true, recipient: to };

  } catch (error) {
    console.error(`Failed to send certificate notification to ${to}:`, error);
    throw error;
  }
});

// Verification notification processor
emailQueue.process('verification-notification', async (job) => {
  const { to, studentName, verifiedBy, verificationDate, certificateUrl } = job.data;
  
  try {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to,
      subject: 'Your Certificate Has Been Verified',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Certificate Verification Notification</h2>
          
          <p>Hello ${studentName},</p>
          
          <p>We're writing to inform you that your digital certificate has been verified.</p>
          
          <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
            <h3 style="margin-top: 0; color: #065f46;">Verification Details:</h3>
            <p><strong>Verified by:</strong> ${verifiedBy}</p>
            <p><strong>Verification Date:</strong> ${verificationDate}</p>
            <p><strong>Status:</strong> ✅ Verified and Valid</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${certificateUrl}" 
               style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Certificate Details
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            This verification confirms the authenticity and validity of your certificate on the blockchain.
          </p>
        </div>
      `,
    };

    await emailTransporter.sendMail(mailOptions);
    
    console.log(`Verification notification sent successfully to: ${to}`);
    return { success: true, recipient: to };

  } catch (error) {
    console.error(`Failed to send verification notification to ${to}:`, error);
    throw error;
  }
});

// Queue management functions
export async function addBatchCertificateJob(data: {
  batchId: string;
  csvData: string;
  institutionId: string;
  createdBy: string;
}) {
  return await certificateQueue.add('batch-issue', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
}

export async function addIpfsRetryJob(pinId: string) {
  return await ipfsRetryQueue.add('retry-pin', { pinId }, {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    delay: 60000, // Wait 1 minute before first retry
  });
}

export async function addEmailNotificationJob(type: string, data: any) {
  return await emailQueue.add(type, data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
}

// Cleanup completed jobs
export async function cleanupJobs() {
  await certificateQueue.clean(24 * 60 * 60 * 1000, 'completed'); // Clean completed jobs older than 24 hours
  await certificateQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // Clean failed jobs older than 7 days
  await ipfsRetryQueue.clean(24 * 60 * 60 * 1000, 'completed');
  await ipfsRetryQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed');
  await emailQueue.clean(24 * 60 * 60 * 1000, 'completed');
  await emailQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed');
}

// Get queue statistics
export async function getQueueStats() {
  const [certStats, ipfsStats, emailStats] = await Promise.all([
    {
      waiting: await certificateQueue.getWaiting().then(jobs => jobs.length),
      active: await certificateQueue.getActive().then(jobs => jobs.length),
      completed: await certificateQueue.getCompleted().then(jobs => jobs.length),
      failed: await certificateQueue.getFailed().then(jobs => jobs.length),
    },
    {
      waiting: await ipfsRetryQueue.getWaiting().then(jobs => jobs.length),
      active: await ipfsRetryQueue.getActive().then(jobs => jobs.length),
      completed: await ipfsRetryQueue.getCompleted().then(jobs => jobs.length),
      failed: await ipfsRetryQueue.getFailed().then(jobs => jobs.length),
    },
    {
      waiting: await emailQueue.getWaiting().then(jobs => jobs.length),
      active: await emailQueue.getActive().then(jobs => jobs.length),
      completed: await emailQueue.getCompleted().then(jobs => jobs.length),
      failed: await emailQueue.getFailed().then(jobs => jobs.length),
    },
  ]);

  return {
    certificates: certStats,
    ipfsRetry: ipfsStats,
    email: emailStats,
  };
}

// Start background job to retry failed IPFS pins
setInterval(async () => {
  try {
    console.log('Checking for failed IPFS pins to retry...');
    
    const failedPins = await database
      .select()
      .from(ipfsPins)
      .where(
        and(
          eq(ipfsPins.status, 'failed'),
          // Only retry if less than 5 attempts and last retry was more than 1 hour ago
        )
      )
      .limit(10);

    for (const pin of failedPins) {
      if (pin.retryCount < 5) {
        await addIpfsRetryJob(pin.id);
        console.log(`Queued retry for IPFS pin: ${pin.id}`);
      }
    }
  } catch (error) {
    console.error('Failed to queue IPFS retries:', error);
  }
}, 60 * 60 * 1000); // Run every hour

// Cleanup old jobs every day
setInterval(async () => {
  try {
    console.log('Cleaning up old jobs...');
    await cleanupJobs();
    console.log('Job cleanup completed');
  } catch (error) {
    console.error('Failed to cleanup jobs:', error);
  }
}, 24 * 60 * 60 * 1000); // Run every 24 hours

console.log('Background workers initialized');

export default {
  certificateQueue,
  ipfsRetryQueue,
  emailQueue,
  addBatchCertificateJob,
  addIpfsRetryJob,
  addEmailNotificationJob,
  getQueueStats,
  cleanupJobs,
};