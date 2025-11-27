import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { ethers } from 'ethers';
import database from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  walletAddress?: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

// JWT Token payload interface
interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  walletAddress?: string | undefined;
  iat?: number;
  exp?: number;
}

// Generate JWT token for user
export function generateToken(user: AuthenticatedUser): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    walletAddress: user.walletAddress || undefined,
  };

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as SignOptions);
}

// Verify JWT token
export function verifyToken(token: string): JwtPayload {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
    return jwt.verify(token, secret) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Middleware to authenticate JWT token
export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ 
        success: false, 
        error: 'Access token required' 
      });
      return;
    }

    const decoded = verifyToken(token);
    
    // Fetch user from database to ensure they still exist and are active
    const userResult = await database
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (userResult.length === 0) {
      res.status(401).json({ 
        success: false, 
        error: 'User not found' 
      });
      return;
    }

    const user = userResult[0];
    
    if (!user.isActive) {
      res.status(401).json({ 
        success: false, 
        error: 'User account is deactivated' 
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      walletAddress: user.walletAddress || undefined,
    };

    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }
}

// Middleware to check specific roles
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
      return;
    }

    next();
  };
}

// Verify wallet signature for additional security
export function verifyWalletSignature(
  message: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    const messageHash = ethers.hashMessage(message);
    const recoveredAddress = ethers.recoverAddress(messageHash, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error('Wallet signature verification failed:', error);
    return false;
  }
}

// Generate challenge message for wallet signature
export function generateWalletChallenge(userEmail: string): string {
  const timestamp = Date.now();
  return `BlockVerify Login Challenge\n\nEmail: ${userEmail}\nTimestamp: ${timestamp}\n\nSign this message to authenticate with your wallet.`;
}

// Middleware for optional wallet signature verification
export async function verifyWalletAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { walletAddress, signature, message } = req.body;

    // If wallet authentication is provided, verify it
    if (walletAddress && signature && message) {
      const isValidSignature = verifyWalletSignature(message, signature, walletAddress);
      
      if (!isValidSignature) {
        res.status(401).json({ 
          success: false, 
          error: 'Invalid wallet signature' 
        });
        return;
      }

      // Check if the wallet belongs to the user
      if (req.user && req.user.walletAddress) {
        if (req.user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          res.status(401).json({ 
            success: false, 
            error: 'Wallet address does not match user account' 
          });
          return;
        }
      }
    }

    next();
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Wallet verification failed' 
    });
  }
}

// Refresh token functionality
export async function refreshToken(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
      return;
    }

    const newToken = generateToken(req.user);
    
    res.json({
      success: true,
      data: {
        token: newToken,
        user: req.user,
      },
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to refresh token' 
    });
  }
}

export default {
  generateToken,
  verifyToken,
  authenticateToken,
  requireRole,
  verifyWalletSignature,
  generateWalletChallenge,
  verifyWalletAuth,
  refreshToken,
};
