// Load environment variables FIRST before any other imports
import './config/env';

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createServer } from 'http';

// Import middleware
import { 
  corsOptions, 
  helmetConfig, 
  generalRateLimit, 
  securityHeaders, 
  requestLogger, 
  errorHandler 
} from './middleware/security';

// Import routes
import authRoutes from './routes/auth';
import certificateRoutes from './routes/certificates';

// Import services
import { checkDbConnection } from './db';
import { sql } from 'drizzle-orm';
import ipfsService from './services/ipfs';
import blockchainService from './services/blockchain';

// Import workers
import './workers';

// Create Express app
const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmetConfig);
app.use(securityHeaders);

// CORS
app.use(cors(corsOptions));

// Rate limiting
app.use(generalRateLimit);

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
app.use(requestLogger);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await checkDbConnection();
    const ipfsConnected = await ipfsService.testConnection();
    const blockchainConnected = await blockchainService.checkConnection();
    const blockchainStatus = blockchainService.getStatus();

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: {
          status: dbConnected ? 'connected' : 'disconnected',
          type: 'neon-postgresql',
        },
        ipfs: {
          status: ipfsConnected ? 'connected' : 'disconnected',
          type: 'pinata',
        },
        blockchain: {
          status: blockchainConnected ? 'connected' : 'disconnected',
          ready: blockchainStatus.isReady,
          walletAddress: blockchainStatus.walletAddress,
          contractAddress: blockchainStatus.contractAddress,
        },
        workers: {
          status: 'running',
          queues: ['certificates', 'ipfs-retry', 'email'],
        },
      },
      environment: process.env.NODE_ENV || 'development',
    };

    // Overall health status
    const allServicesHealthy = dbConnected && ipfsConnected && blockchainConnected;
    if (!allServicesHealthy) {
      health.status = 'degraded';
    }

    res.status(allServicesHealthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API routes
app.use('/api/admin', authRoutes);
app.use('/api', certificateRoutes);

// GET /api/institutions - Get all institutions
app.get('/api/institutions', async (req, res) => {
  try {
    const { database } = await import('./db');
    const { institutions } = await import('./db/schema');
    
    if (!database) {
      return res.status(500).json({ 
        success: false,
        error: 'Database connection not available' 
      });
    }
    
    const result = await database.select().from(institutions);
    
    return res.json({ 
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get institutions error:', error);
    return res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get institutions'
    });
  }
});

// Database test route
app.get('/test-db', async (req, res) => {
  try {
    const { database } = await import('./db');
    if (!database) {
      return res.status(500).json({ 
        error: 'Database connection not available',
        status: 'disconnected' 
      });
    }
    
    const result = await database.execute(sql`SELECT NOW() as current_time`);
    return res.json({ 
      success: true,
      dbTime: result.rows[0]?.current_time,
      message: 'Database connection successful'
    });
  } catch (error) {
    console.error('Database test failed:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Database test failed',
      status: 'error'
    });
  }
});

// API documentation endpoint
app.get('/api', (_req, res) => {
  return res.json({
    name: 'BlockVerify API',
    version: '1.0.0',
    description: 'Blockchain-based certificate verification system',
    endpoints: {
      authentication: {
        'POST /api/admin/login': 'Admin login with optional wallet signature',
        'POST /api/admin/register': 'Create new admin user',
        'POST /api/admin/wallet-challenge': 'Generate wallet signature challenge',
        'POST /api/admin/refresh-token': 'Refresh JWT token',
        'POST /api/admin/logout': 'Logout user',
        'GET /api/admin/profile': 'Get current user profile',
      },
      certificates: {
        'POST /api/issue': 'Issue new certificate with PDF upload',
        'GET /api/verify/:tokenId': 'Verify certificate by token ID',
        'GET /api/verify/code/:verificationCode': 'Verify certificate by verification code',
        'POST /api/revoke/:tokenId': 'Revoke certificate',
        'GET /api/certificates': 'List certificates with pagination',
      },
      system: {
        'GET /health': 'System health check',
        'GET /api': 'API documentation',
      },
    },
    documentation: 'Visit /health for system status',
  });
});

// 404 handler
app.use('*', (req, res) => {
  return res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    requestedPath: req.originalUrl,
    method: req.method,
  });
});

// Error handling middleware
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(async () => {
    console.log('HTTP server closed');
    
    try {
      // Close database connections
      const { closeDbConnection } = await import('./db');
      await closeDbConnection();
      console.log('Database connections closed');
      
      // Close queue connections
      const workers = await import('./workers');
      await workers.certificateQueue.close();
      await workers.ipfsRetryQueue.close();
      await workers.emailQueue.close();
      console.log('Queue connections closed');
      
      console.log('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('Forceful shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Start server
const startServer = async () => {
  try {
    // Check database connection
    const dbConnected = await checkDbConnection();
    if (!dbConnected) {
      console.warn('Warning: Database connection failed. Some features may not work properly.');
    }
    
    // Check IPFS connection
    const ipfsConnected = await ipfsService.testConnection();
    if (!ipfsConnected) {
      console.warn('Warning: IPFS connection failed. File storage may not work properly.');
    }
    
    // Check blockchain connection
    const blockchainConnected = await blockchainService.checkConnection();
    if (!blockchainConnected) {
      console.warn('Warning: Blockchain connection failed. Certificate issuance may not work properly.');
    }
    
    // Start HTTP server
    server.listen(PORT, () => {
      console.log('🚀 BlockVerify Backend Server Started');
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API docs: http://localhost:${PORT}/api`);
      console.log('');
      console.log('🔧 Service Status:');
      console.log(`   Database: ${dbConnected ? '✅ Connected' : '❌ Disconnected'}`);
      console.log(`   IPFS: ${ipfsConnected ? '✅ Connected' : '❌ Disconnected'}`);
      console.log(`   Blockchain: ${blockchainConnected ? '✅ Connected' : '❌ Disconnected'}`);
      console.log('');
      console.log('📋 Available Endpoints:');
      console.log('   POST /api/admin/login - Admin authentication');
      console.log('   POST /api/issue - Issue new certificate');
      console.log('   GET /api/verify/:tokenId - Verify certificate');
      console.log('   POST /api/revoke/:tokenId - Revoke certificate');
      console.log('');
      console.log('🎯 Ready to process requests!');
      
      // Log frontend URL for CORS
      if (process.env.FRONTEND_URL) {
        console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Initialize server
startServer();

export default app;