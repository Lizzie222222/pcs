import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { storage } from "./storage";
import type { User, CreatePasswordUser } from "@shared/schema";
import { z } from "zod";
import { logUserActivity } from "./auditLog";

// Extend express-session to include returnTo property
declare module "express-session" {
  interface SessionData {
    returnTo?: string;
  }
}

// Extend Express.User interface for TypeScript
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string | null;
      emailVerified: boolean | null;
      passwordHash: string | null;
      firstName: string | null;
      lastName: string | null;
      role: string | null;
      isAdmin: boolean | null;
      preferredLanguage: string | null;
      hasSeenOnboarding: boolean | null;
      createdAt: Date | null;
      updatedAt: Date | null;
    }
  }
}

// Validation schemas
const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["teacher", "admin"]).default("teacher"),
  preferredLanguage: z.string().default("en"),
});

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// Module-level session store instance
let sessionStore: any = null;

export function getSession() {
  const sessionTtl = 30 * 24 * 60 * 60 * 1000; // 30 days
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Initialize session store if not already created
  if (!sessionStore) {
    if (isProduction && process.env.DATABASE_URL) {
      const pgStore = connectPg(session);
      sessionStore = new pgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: false,
        ttl: sessionTtl,
        tableName: "sessions",
      });
    } else {
      // Create explicit MemoryStore for development so WebSocket can access it
      const MemoryStore = createMemoryStore(session);
      sessionStore = new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
        ttl: sessionTtl,
      });
    }
  }
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction, // Non-secure cookies in development
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: sessionTtl,
    },
  });
}

export function getSessionStore() {
  // Ensure session store is initialized
  if (sessionStore === null) {
    getSession();
  }
  return sessionStore;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport Local Strategy
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email: string, password: string, done) => {
    try {
      const user = await storage.findUserByEmail(email);
      if (!user) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      if (!user.passwordHash) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      const isValidPassword = await storage.verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  // Serialize/deserialize user for session
  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || false);
    } catch (error) {
      done(error);
    }
  });

  // Authentication Routes

  // POST /api/auth/register - Register with email/password
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.findUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: "An account with this email already exists" 
        });
      }

      // Hash password and create user
      const passwordHash = await storage.hashPassword(validatedData.password);
      const userData: CreatePasswordUser = {
        ...validatedData,
        passwordHash,
        emailVerified: false,
        isAdmin: validatedData.role === "admin",
      };

      const user = await storage.createUserWithPassword(userData);
      
      // Log the user in automatically
      req.login(user, (err) => {
        if (err) {
          console.error('Login after registration error:', err);
          return res.status(500).json({ 
            success: false, 
            message: "Account created but login failed. Please try logging in." 
          });
        }
        
        res.json({ 
          success: true, 
          message: "Account created successfully",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isAdmin: user.isAdmin,
            emailVerified: user.emailVerified,
            preferredLanguage: user.preferredLanguage,
          }
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.errors,
        });
      }
      
      console.error('Registration error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to create account" 
      });
    }
  });

  // POST /api/auth/login - Login with email/password
  app.post("/api/auth/login", (req, res, next) => {
    try {
      loginSchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.errors,
        });
      }
    }

    passport.authenticate('local', (err: any, user: Express.User | false, info: any) => {
      if (err) {
        console.error('Login authentication error:', err);
        return res.status(500).json({ 
          success: false, 
          message: "Login failed" 
        });
      }
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: info?.message || "Invalid credentials" 
        });
      }

      req.login(user, async (err) => {
        if (err) {
          console.error('Login session error:', err);
          return res.status(500).json({ 
            success: false, 
            message: "Login failed" 
          });
        }
        
        // Log successful login
        await logUserActivity(
          user.id,
          user.email || undefined,
          'login',
          {
            role: user.role,
            isAdmin: user.isAdmin,
          },
          undefined,
          undefined,
          req
        );
        
        res.json({ 
          success: true, 
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isAdmin: user.isAdmin,
            emailVerified: user.emailVerified,
            preferredLanguage: user.preferredLanguage,
          }
        });
      });
    })(req, res, next);
  });

  // POST /api/auth/logout - Logout and destroy session (for API calls)
  app.post("/api/auth/logout", async (req, res) => {
    const user = req.user; // Capture user before logout
    
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ 
          success: false, 
          message: "Logout failed" 
        });
      }
      
      req.session.destroy(async (err) => {
        if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).json({ 
            success: false, 
            message: "Logout completed but session cleanup failed" 
          });
        }
        
        // Log successful logout
        if (user) {
          await logUserActivity(
            user.id,
            user.email || undefined,
            'logout',
            undefined,
            undefined,
            undefined,
            req
          );
        }
        
        res.clearCookie('connect.sid');
        res.json({ 
          success: true, 
          message: "Logout successful" 
        });
      });
    });
  });

  // GET /api/auth/logout - Logout and redirect to landing page (for direct navigation)
  app.get("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.redirect('/?error=logout_failed');
      }
      
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
        }
        
        res.clearCookie('connect.sid');
        res.redirect('/');
      });
    });
  });

  // GET /api/auth/user - Get current authenticated user
  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Not authenticated" 
      });
    }

    res.json({ 
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        isAdmin: req.user.isAdmin,
        emailVerified: req.user.emailVerified,
        preferredLanguage: req.user.preferredLanguage,
        hasSeenOnboarding: req.user.hasSeenOnboarding,
        hasPassword: !!req.user.passwordHash, // True if user has password authentication enabled
      }
    });
  });

  // POST /api/auth/onboarding-complete - Mark onboarding as complete
  app.post("/api/auth/onboarding-complete", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated"
      });
    }

    try {
      const updatedUser = await storage.markOnboardingComplete(req.user.id);
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Update the session user object so subsequent requests get the updated value
      req.user.hasSeenOnboarding = true;

      res.json({
        success: true,
        message: "Onboarding marked as complete"
      });
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
      res.status(500).json({
        success: false,
        message: "Failed to mark onboarding as complete"
      });
    }
  });


  // TEST-ONLY: Authentication bypass for Playwright E2E tests
  // This endpoint allows tests to authenticate without external providers
  if (process.env.NODE_ENV === 'development' || process.env.REPLIT_CONTEXT === 'testing') {
    app.post('/api/test-auth/login', async (req, res) => {
      try {
        const { email, firstName, lastName, sub, isAdmin, role } = req.body;
        
        if (!email || !firstName || !lastName || !sub) {
          return res.status(400).json({ error: 'Missing required fields: email, firstName, lastName, sub' });
        }
        
        // Check if role indicates admin (for OIDC testing compatibility)
        const shouldBeAdmin = isAdmin || (role && role.toLowerCase().includes('admin'));
        
        console.log(`[Test Auth] Logging in test user: ${email}, admin: ${shouldBeAdmin}`);
        
        // Find or create user by email
        let user = await storage.findUserByEmail(email);
        
        if (!user) {
          console.log(`[Test Auth] Creating new user: ${email}`);
          // Create with a random password hash (test users won't need to log in with password)
          const passwordHash = await storage.hashPassword(`test-${sub}-${Date.now()}`);
          user = await storage.createUserWithPassword({
            email,
            firstName,
            lastName,
            passwordHash,
            emailVerified: true,
            role: 'teacher',
            isAdmin: shouldBeAdmin,
            preferredLanguage: 'en'
          });
        } else {
          console.log(`[Test Auth] Found existing user: ${email}`);
          // Set isAdmin if specified and different from current value
          if (shouldBeAdmin && !user.isAdmin) {
            const { db } = await import('./db');
            const { users } = await import('@shared/schema');
            const { eq } = await import('drizzle-orm');
            
            const [updatedUser] = await db
              .update(users)
              .set({ isAdmin: true, updatedAt: new Date() })
              .where(eq(users.id, user.id))
              .returning();
            user = updatedUser;
            console.log(`[Test Auth] Updated user to admin: ${user.email}`);
          }
        }
        
        // Use Passport's login method to establish session
        req.login(user, (err) => {
          if (err) {
            console.error('[Test Auth] Login failed:', err);
            return res.status(500).json({ error: 'Failed to establish session' });
          }
          
          console.log(`[Test Auth] Session established for user: ${user.id}`);
          res.json({ 
            success: true,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              isAdmin: user.isAdmin
            }
          });
        });
      } catch (error) {
        console.error('[Test Auth] Error:', error);
        res.status(500).json({ error: 'Authentication failed' });
      }
    });
    
    console.log('[Test Auth] Test-only authentication endpoint enabled at POST /api/test-auth/login');
  }
}

// Authentication middleware
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  
  res.status(401).json({ 
    success: false, 
    message: "Authentication required" 
  });
};

// Admin middleware
export const isAdmin: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && req.user && req.user.isAdmin) {
    return next();
  }
  
  res.status(403).json({ 
    success: false, 
    message: "Admin access required" 
  });
};

// Head Teacher middleware - checks if user is head teacher of a specific school
export const isHeadTeacher: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ 
      success: false, 
      message: "Authentication required" 
    });
  }
  
  const schoolId = req.params.schoolId;
  if (!schoolId) {
    return res.status(400).json({ 
      success: false, 
      message: "School ID required" 
    });
  }
  
  try {
    const schoolUser = await storage.getSchoolUser(schoolId, req.user.id);
    if (schoolUser && schoolUser.role === 'head_teacher' && schoolUser.isVerified) {
      return next();
    }
    
    // Also allow platform admins
    if (req.user.isAdmin) {
      return next();
    }
    
    return res.status(403).json({ 
      success: false, 
      message: "Head teacher access required" 
    });
  } catch (error) {
    console.error("Error checking head teacher status:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to verify head teacher status" 
    });
  }
};

// School Member middleware - checks if user is a verified member of a school
export const isSchoolMember: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ 
      success: false, 
      message: "Authentication required" 
    });
  }
  
  const schoolId = req.params.schoolId;
  if (!schoolId) {
    return res.status(400).json({ 
      success: false, 
      message: "School ID required" 
    });
  }
  
  try {
    const schoolUser = await storage.getSchoolUser(schoolId, req.user.id);
    if (schoolUser && schoolUser.isVerified) {
      // Attach school role to request for use in route handlers
      (req as any).schoolRole = schoolUser.role;
      return next();
    }
    
    // Also allow platform admins
    if (req.user.isAdmin) {
      (req as any).schoolRole = 'admin';
      return next();
    }
    
    return res.status(403).json({ 
      success: false, 
      message: "School membership required" 
    });
  } catch (error) {
    console.error("Error checking school membership:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to verify school membership" 
    });
  }
};