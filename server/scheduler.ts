import cron from 'node-cron';
import { storage } from './storage';
import { sendWeeklyAdminDigest, type WeeklyDigestData } from './emailService';

/**
 * @description Initialize the automated weekly digest scheduler
 * Runs every Monday at 9:00 AM UK time (Europe/London timezone)
 * Sends weekly platform digest to all admin users
 */
export function initScheduler(): void {
  console.log('[Scheduler] Initializing automated weekly digest scheduler...');
  
  // Schedule weekly digest for every Monday at 9:00 AM UK time
  // Cron expression: '0 9 * * 1' means: minute 0, hour 9, any day of month, any month, Monday (1)
  cron.schedule('0 9 * * 1', async () => {
    console.log('[Scheduler] Starting weekly admin digest generation...');
    
    try {
      // Get date range for the past week
      const weekEnd = new Date();
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      
      console.log(`[Scheduler] Digest period: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);
      
      // Get all evidence submissions from the past week
      const allEvidence = await storage.getAllEvidence({});
      const weeklyEvidence = allEvidence.filter(e => {
        const submittedDate = e.submittedAt || new Date();
        const submittedAt = new Date(submittedDate);
        return submittedAt >= weekStart && submittedAt <= weekEnd;
      });
      
      // Get all users created in the past week
      const allUsers = await storage.getAllUsers();
      const weeklyUsers = allUsers.filter(u => {
        if (!u.createdAt) return false;
        const joinedAt = new Date(u.createdAt);
        return joinedAt >= weekStart && joinedAt <= weekEnd;
      });
      
      // Get platform stats
      const stats = await storage.getSchoolStats();
      const totalSchools = stats.totalSchools || 0;
      const activeSchools = 0; // This field is not in the stats type
      
      // Count total evidence and users
      const totalEvidence = allEvidence.length;
      const totalUsers = allUsers.length;
      
      // Prepare evidence submissions data
      const evidenceSubmissions = await Promise.all(
        weeklyEvidence.slice(0, 20).map(async (e) => {
          const school = await storage.getSchool(e.schoolId);
          const submitter = await storage.getUser(e.submittedBy);
          const submittedDate = e.submittedAt || new Date();
          return {
            schoolName: school?.name || 'Unknown School',
            evidenceTitle: e.title,
            submitterName: `${submitter?.firstName || ''} ${submitter?.lastName || ''}`.trim() || 'Unknown User',
            submittedAt: new Date(submittedDate)
          };
        })
      );
      
      // Prepare new users data
      const newUsers = await Promise.all(
        weeklyUsers.slice(0, 20).map(async (u) => {
          const userSchools = await storage.getUserSchools(u.id);
          return {
            email: u.email || 'unknown@example.com',
            schoolName: userSchools.length > 0 ? userSchools[0].name : 'No School',
            role: u.role || 'unknown',
            joinedAt: new Date(u.createdAt || new Date())
          };
        })
      );
      
      // Prepare digest data
      const digestData: WeeklyDigestData = {
        evidenceCount: weeklyEvidence.length,
        evidenceSubmissions,
        newUsersCount: weeklyUsers.length,
        newUsers,
        platformStats: {
          totalSchools,
          totalEvidence,
          totalUsers,
          activeSchools
        },
        weekStart,
        weekEnd
      };
      
      // Get all admin users
      const adminUsers = allUsers.filter(u => u.isAdmin);
      
      if (adminUsers.length === 0) {
        console.log('[Scheduler] No admin users found to send digest to');
        return;
      }
      
      console.log(`[Scheduler] Sending digest to ${adminUsers.length} admin users...`);
      
      // Send digest to all admins
      let sent = 0;
      let failed = 0;
      
      for (const admin of adminUsers) {
        try {
          if (!admin.email) {
            console.warn(`[Scheduler] Admin user ${admin.id} has no email address`);
            failed++;
            continue;
          }
          
          const emailSent = await sendWeeklyAdminDigest(
            admin.email,
            digestData,
            admin.preferredLanguage || 'en'
          );
          
          if (emailSent) {
            sent++;
            console.log(`[Scheduler] ✓ Sent digest to ${admin.email}`);
          } else {
            failed++;
            console.error(`[Scheduler] ✗ Failed to send digest to ${admin.email}`);
          }
        } catch (error) {
          console.error(`[Scheduler] Error sending digest to ${admin.email}:`, error);
          failed++;
        }
      }
      
      console.log(`[Scheduler] Weekly digest completed: ${sent} sent, ${failed} failed`);
      console.log(`[Scheduler] Digest summary: ${weeklyEvidence.length} evidence submissions, ${weeklyUsers.length} new users`);
      
    } catch (error) {
      console.error('[Scheduler] Error generating weekly digest:', error);
    }
  }, {
    timezone: 'Europe/London'
  } as any);
  
  console.log('[Scheduler] ✓ Weekly digest scheduler initialized (runs every Monday at 9:00 AM UK time)');
}
