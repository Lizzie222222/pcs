import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import type { User, CreatePasswordUser, CreateOAuthUser } from "@shared/schema";
import { z } from "zod";

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
      googleId: string | null;
      firstName: string | null;
      lastName: string | null;
      profileImageUrl: string | null;
      role: string | null;
      isAdmin: boolean | null;
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
});

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Use PostgreSQL store in production, memory store in development/test
  let sessionStore;
  if (isProduction && process.env.DATABASE_URL) {
    const pgStore = connectPg(session);
    sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      ttl: sessionTtl,
      tableName: "sessions",
    });
  } else {
    // Fall back to memory store for development/test
    sessionStore = undefined; // Uses default MemoryStore
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
        return done(null, false, { message: 'Please use Google Sign-In for this account' });
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

  // Configure Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback"
    }, async (accessToken: string, refreshToken: string, profile: any, done) => {
      try {
        // Check if user already exists with this Google ID
        let user = await storage.getUserByGoogleId(profile.id);
        
        if (user) {
          return done(null, user);
        }

        // Check if user exists with the same email
        const email = profile.emails?.[0]?.value;
        if (email) {
          const existingUser = await storage.findUserByEmail(email);
          if (existingUser) {
            // Link Google account to existing user
            user = await storage.linkGoogleAccount(existingUser.id, profile.id);
            return done(null, user);
          }
        }

        // Create new user with OAuth
        const userData: CreateOAuthUser = {
          email: email || '',
          emailVerified: true, // Google emails are verified
          googleId: profile.id,
          firstName: profile.name?.givenName || '',
          lastName: profile.name?.familyName || '',
          profileImageUrl: profile.photos?.[0]?.value || null,
          role: "teacher",
          isAdmin: false,
        };

        user = await storage.createUserWithOAuth(userData);
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }));
  }

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

      req.login(user, (err) => {
        if (err) {
          console.error('Login session error:', err);
          return res.status(500).json({ 
            success: false, 
            message: "Login failed" 
          });
        }
        
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
          }
        });
      });
    })(req, res, next);
  });

  // POST /api/auth/logout - Logout and destroy session (for API calls)
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ 
          success: false, 
          message: "Logout failed" 
        });
      }
      
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).json({ 
            success: false, 
            message: "Logout completed but session cleanup failed" 
          });
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
        profileImageUrl: req.user.profileImageUrl,
      }
    });
  });

  // GET /api/auth/google - Initiate Google OAuth flow
  app.get("/api/auth/google", (req, res, next) => {
    // Handle returnTo parameter for secure redirects
    const returnTo = req.query.returnTo as string;
    if (returnTo && typeof returnTo === 'string') {
      // Sanitize returnTo - only allow relative paths starting with '/'
      // Reject external URLs, protocol-relative URLs, and non-relative paths
      if (returnTo.startsWith('/') && !returnTo.startsWith('//') && !returnTo.includes('://')) {
        req.session.returnTo = returnTo;
      }
    }

    passport.authenticate('google', {
      scope: ['profile', 'email']
    })(req, res, next);
  });

  // GET /api/auth/google/callback - Handle Google OAuth callback
  app.get("/api/auth/google/callback", (req, res, next) => {
    passport.authenticate('google', (err: any, user: Express.User | false) => {
      if (err) {
        console.error('Google OAuth error:', err);
        return res.redirect('/?error=oauth_failed');
      }
      
      if (!user) {
        return res.redirect('/?error=oauth_cancelled');
      }

      req.login(user, (err) => {
        if (err) {
          console.error('Google OAuth login error:', err);
          return res.redirect('/?error=login_failed');
        }
        
        // DEBUG: Log user details
        console.log('OAuth user logged in:', {
          id: user.id,
          email: user.email,
          role: user.role,
          isAdmin: user.isAdmin
        });
        
        // Redirect based on user role (same logic as login)
        // Admin users go directly to admin dashboard, others to returnTo or home
        let redirectPath = req.session.returnTo || '/';
        delete req.session.returnTo;
        
        // Override redirect for admin users
        if (user.isAdmin || user.role === 'admin') {
          console.log('Admin user detected, redirecting to /admin');
          redirectPath = '/admin';
        } else {
          console.log('Non-admin user, redirecting to:', redirectPath);
        }
        
        // Add auth=success flag to signal successful OAuth to client
        const redirectUrl = new URL(redirectPath, `${req.protocol}://${req.get('host')}`);
        redirectUrl.searchParams.set('auth', 'success');
        console.log('Final redirect URL:', redirectUrl.toString());
        res.redirect(redirectUrl.toString());
      });
    })(req, res, next);
  });
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