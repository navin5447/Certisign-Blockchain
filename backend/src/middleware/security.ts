import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { body, validationResult, ValidationChain } from 'express-validator';
import multer from 'multer';
import path from 'path';

// Rate limiting configurations
export const generalRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Increased limit for testing - limit each IP to 50 requests per windowMs for auth endpoints
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const verificationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 verification requests per minute
  message: {
    success: false,
    error: 'Too many verification requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
export const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:8080',
      'http://localhost:3000',
      'http://localhost:8080',
      'http://localhost:8081', // Added for Vite dev server
      'http://127.0.0.1:8080',
      'http://127.0.0.1:8081',
      'http://127.0.0.1:3000',
      'http://localhost:4001', // Added for API testing
    ];
    
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma'],
};

// Helmet security configuration
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// File upload configuration
const storage = multer.memoryStorage(); // Store files in memory for processing

export const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    files: 5, // Maximum 5 files
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'application/pdf,image/jpeg,image/png').split(',');
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
    }
  },
});

// Input validation schemas
export const validateLogin: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('walletAddress')
    .optional()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid Ethereum wallet address'),
  body('signature')
    .optional()
    .isString()
    .withMessage('Signature must be a string'),
  body('message')
    .optional()
    .isString()
    .withMessage('Message must be a string'),
];

export const validateCertificateIssue: ValidationChain[] = [
  body('studentName')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Student name must be between 2 and 255 characters'),
  body('studentEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid student email'),
  body('rollNumber')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Roll number is required and must be less than 100 characters'),
  body('course')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Course name must be between 2 and 255 characters'),
  body('specialization')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Specialization must be less than 255 characters'),
  body('grade')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Grade must be less than 50 characters'),
  body('cgpa')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 10 })
    .withMessage('CGPA must be a number between 0 and 10'),
  body('issueDate')
    .isISO8601()
    .withMessage('Issue date must be a valid ISO date'),
  body('graduationDate')
    .isISO8601()
    .withMessage('Graduation date must be a valid ISO date'),
  body('institutionId')
    .isUUID()
    .withMessage('Institution ID must be a valid UUID'),
];

export const validateTokenId: ValidationChain[] = [
  body('tokenId')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Token ID must be a string between 1 and 100 characters'),
];

export const validateRevocation: ValidationChain[] = [
  body('reason')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Revocation reason must be between 10 and 1000 characters'),
];

// Validation result middleware
export function handleValidationErrors(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', errors.array());
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
    return;
  }
  
  next();
}

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ${req.ip}`);
  });
  
  next();
}

// Error handling middleware
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);

  // Multer file upload errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        error: 'File size too large',
      });
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        success: false,
        error: 'Too many files',
      });
      return;
    }
  }

  // File type validation errors
  if (err.message && err.message.includes('Invalid file type')) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? (err.message || 'Unknown error') : 'Internal server error',
  });
}

// Security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

export default {
  generalRateLimit,
  strictRateLimit,
  verificationRateLimit,
  corsOptions,
  helmetConfig,
  upload,
  validateLogin,
  validateCertificateIssue,
  validateTokenId,
  validateRevocation,
  handleValidationErrors,
  requestLogger,
  errorHandler,
  securityHeaders,
};
