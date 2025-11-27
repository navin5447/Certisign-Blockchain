import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { eq, and } from 'drizzle-orm';
import database from '../db';
import { users, events } from '../db/schema';
import { 
  generateToken, 
  verifyWalletSignature, 
  generateWalletChallenge,
  AuthRequest,
  refreshToken
} from '../middleware/auth';
import { 
  validateLogin, 
  handleValidationErrors, 
  strictRateLimit 
} from '../middleware/security';

const router = Router();

// Apply rate limiting to all auth routes
router.use(strictRateLimit);

// POST /admin/login - Admin authentication with optional wallet signature
router.post('/login', validateLogin, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { email, password, walletAddress, signature, message } = req.body;

    // Find user by email
    const userResult = await database
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (userResult.length === 0) {
      // Log failed login attempt with a placeholder UUID
      await database.insert(events).values({
        type: 'login_failed',
        entityType: 'user',
        entityId: '00000000-0000-0000-0000-000000000000',
        description: `Failed login attempt for email: ${email}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        data: { email, reason: 'user_not_found' },
      });

      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
      return;
    }

    const user = userResult[0];

    // Check if user is active
    if (!user.isActive) {
      // Log failed login attempt
      await database.insert(events).values({
        type: 'login_failed',
        entityType: 'user',
        entityId: user.id,
        description: 'Login attempt for inactive user',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        data: { email, reason: 'user_inactive' },
      });

      res.status(401).json({
        success: false,
        error: 'Account is deactivated',
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // Log failed login attempt
      await database.insert(events).values({
        type: 'login_failed',
        entityType: 'user',
        entityId: user.id,
        description: 'Login attempt with invalid password',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        data: { email, reason: 'invalid_password' },
      });

      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
      return;
    }

    // If wallet authentication is provided, verify it
    if (walletAddress && signature && message) {
      // Check if the wallet belongs to the user
      if (user.walletAddress && user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        res.status(401).json({
          success: false,
          error: 'Wallet address does not match user account',
        });
        return;
      }

      // Verify wallet signature
      const isValidSignature = verifyWalletSignature(message, signature, walletAddress);
      if (!isValidSignature) {
        // Log failed wallet verification
        await database.insert(events).values({
          type: 'wallet_auth_failed',
          entityType: 'user',
          entityId: user.id,
          description: 'Failed wallet signature verification',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || '',
          data: { email, walletAddress, reason: 'invalid_signature' },
        });

        res.status(401).json({
          success: false,
          error: 'Invalid wallet signature',
        });
        return;
      }

      // Update user's wallet address if not set
      if (!user.walletAddress) {
        await database
          .update(users)
          .set({ 
            walletAddress: walletAddress.toLowerCase(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      }
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      walletAddress: user.walletAddress || walletAddress?.toLowerCase(),
    });

    // Update last login timestamp
    await database
      .update(users)
      .set({ 
        lastLogin: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Log successful login
    await database.insert(events).values({
      type: 'login_success',
      entityType: 'user',
      entityId: user.id,
      userId: user.id,
      description: 'Successful login',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
      data: { 
        email, 
        walletAddress: walletAddress?.toLowerCase(),
        hasWalletAuth: !!(walletAddress && signature && message),
      },
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          walletAddress: user.walletAddress || walletAddress?.toLowerCase(),
        },
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// POST /admin/register - Create new admin user (restricted)
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role = 'admin', walletAddress } = req.body;

    // Basic validation
    if (!email || !password || !name) {
      res.status(400).json({
        success: false,
        error: 'Email, password, and name are required',
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await database
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      res.status(409).json({
        success: false,
        error: 'User with this email already exists',
      });
      return;
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await database
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        name,
        role,
        walletAddress: walletAddress?.toLowerCase(),
      })
      .returning();

    // Log user creation
    await database.insert(events).values({
      type: 'user_created',
      entityType: 'user',
      entityId: newUser[0].id,
      description: 'New admin user created',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
      data: { email: email.toLowerCase(), name, role },
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser[0].id,
          email: newUser[0].email,
          name: newUser[0].name,
          role: newUser[0].role,
          walletAddress: newUser[0].walletAddress,
        },
      },
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// POST /admin/wallet-challenge - Generate wallet signature challenge
router.post('/wallet-challenge', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: 'Email is required',
      });
      return;
    }

    // Verify user exists
    const userResult = await database
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (userResult.length === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    const challenge = generateWalletChallenge(email.toLowerCase());

    res.json({
      success: true,
      data: {
        challenge,
        timestamp: Date.now(),
      },
    });

  } catch (error) {
    console.error('Wallet challenge error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// POST /admin/refresh-token - Refresh JWT token
router.post('/refresh-token', async (req: AuthRequest, res: Response) => {
  await refreshToken(req, res);
});

// POST /admin/logout - Logout (primarily for logging purposes)
router.post('/logout', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user) {
      // Log logout event
      await database.insert(events).values({
        type: 'logout',
        entityType: 'user',
        entityId: req.user.id,
        userId: req.user.id,
        description: 'User logged out',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        data: { email: req.user.email },
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// GET /admin/profile - Get current user profile
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Get fresh user data from database
    const userResult = await database
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        walletAddress: users.walletAddress,
        isActive: users.isActive,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (userResult.length === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: userResult[0],
      },
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
