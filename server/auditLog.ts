import type { Request } from "express";
import { db } from "./db";
import { userActivityLogs } from "@shared/schema";
import { nanoid } from 'nanoid';

/**
 * @description Helper function to log user activities to the userActivityLogs table
 * @param userId - User ID (undefined for anonymous actions)
 * @param userEmail - User email (undefined for anonymous actions)
 * @param actionType - Type of action being logged (e.g., 'login', 'logout', 'evidence_submit')
 * @param actionDetails - Additional details about the action (optional)
 * @param targetId - ID of the target entity (optional, e.g., evidenceId, schoolId)
 * @param targetType - Type of the target entity (optional, e.g., 'evidence', 'school')
 * @param req - Express Request object to extract IP and user agent
 * @location server/auditLog.ts
 * @related shared/schema.ts (userActivityLogs table), server/auth.ts, server/routes.ts
 */
export async function logUserActivity(
  userId: string | undefined,
  userEmail: string | undefined,
  actionType: string,
  actionDetails: object | undefined,
  targetId: string | undefined,
  targetType: string | undefined,
  req: Request
): Promise<void> {
  try {
    // Extract IP address (check x-forwarded-for first, then req.ip)
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null;
    
    // Extract user agent
    const userAgent = req.headers['user-agent'] || null;

    // Insert activity log
    await db.insert(userActivityLogs).values({
      id: nanoid(),
      userId: userId || null,
      userEmail: userEmail || null,
      actionType,
      actionDetails: actionDetails ? JSON.parse(JSON.stringify(actionDetails)) : {},
      targetId: targetId || null,
      targetType: targetType || null,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    // Non-blocking: log error but don't throw
    console.error('[Audit Log] Failed to log user activity:', error);
  }
}
