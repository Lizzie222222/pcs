import type { RequestHandler } from "express";
import { storage } from "../../storage";

/**
 * Middleware to check if user is authenticated
 */
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  
  res.status(401).json({ 
    success: false, 
    message: "Authentication required" 
  });
};

/**
 * Middleware to check if user is a member of the school in the route params
 */
export const isSchoolMember: RequestHandler = async (req, res, next) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    const schoolId = req.params.schoolId || req.params.id;
    if (!schoolId) {
      return res.status(400).json({ 
        success: false, 
        message: "School ID is required" 
      });
    }

    // Check if user is admin or a member of the school
    if (req.user.isAdmin) {
      return next(); // Admins have access to all schools
    }

    const schoolUser = await storage.getSchoolUser(schoolId, req.user.id);
    if (!schoolUser) {
      return res.status(403).json({ 
        success: false, 
        message: "You do not have access to this school" 
      });
    }

    next();
  } catch (error) {
    console.error('Error checking school membership:', error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to verify school membership" 
    });
  }
};

/**
 * Middleware to require admin privileges
 */
export const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Failed to verify admin status" });
  }
};

/**
 * Middleware to allow both admin and partner roles
 */
export const requireAdminOrPartner = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user || (!user.isAdmin && user.role !== 'partner')) {
      return res.status(403).json({ message: "Admin or Partner access required" });
    }

    // Attach user to request for later checks
    req.fullUser = user;
    next();
  } catch (error) {
    console.error("Error checking admin/partner status:", error);
    res.status(500).json({ message: "Failed to verify access" });
  }
};
