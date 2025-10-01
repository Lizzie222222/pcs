import { MailService } from '@sendgrid/mail';
import { storage } from './storage';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable not set");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('Cannot send email: SENDGRID_API_KEY not configured');
    return false;
  }

  try {
    const emailData: any = {
      to: params.to,
      from: params.from || process.env.FROM_EMAIL || 'noreply@plasticclever.org',
      subject: params.subject,
    };
    
    if (params.text) emailData.text = params.text;
    if (params.html) emailData.html = params.html;
    if (params.templateId) emailData.templateId = params.templateId;
    if (params.dynamicTemplateData) emailData.dynamicTemplateData = params.dynamicTemplateData;
    
    await mailService.send(emailData);

    // Log email for tracking
    await storage.logEmail({
      recipientEmail: params.to,
      subject: params.subject,
      template: params.templateId || 'custom',
      status: 'sent',
    });

    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    
    // Log failed email
    await storage.logEmail({
      recipientEmail: params.to,
      subject: params.subject,
      template: params.templateId || 'custom',
      status: 'failed',
    });

    return false;
  }
}

export async function sendWelcomeEmail(userEmail: string, schoolName: string): Promise<boolean> {
  return await sendEmail({
    to: userEmail,
    from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
    subject: `Welcome to Plastic Clever Schools - ${schoolName}`,
    templateId: '67435cbdbfbf42d5b3b3167a7efa2e1c',
    dynamicTemplateData: {
      schoolName: schoolName,
      dashboardUrl: process.env.FRONTEND_URL || 'https://plasticclever.org',
    },
  });
}

export async function sendEvidenceApprovalEmail(
  userEmail: string, 
  schoolName: string, 
  evidenceTitle: string
): Promise<boolean> {
  return await sendEmail({
    to: userEmail,
    from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
    subject: `Evidence Approved - ${evidenceTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #02BBB4 0%, #019ADE 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Evidence Approved!</h1>
        </div>
        <div style="padding: 40px 20px; background: #f9f9f9;">
          <h2 style="color: #0B3D5D;">Great work, ${schoolName}!</h2>
          <p style="color: #666; line-height: 1.6;">
            Your evidence submission "<strong>${evidenceTitle}</strong>" has been reviewed and approved by our team.
          </p>
          <p style="color: #666; line-height: 1.6;">
            This brings you one step closer to completing your current program stage. Keep up the excellent work!
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://plasticclever.org'}" 
               style="background: #02BBB4; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              View Your Progress
            </a>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendEvidenceRejectionEmail(
  userEmail: string, 
  schoolName: string, 
  evidenceTitle: string, 
  feedback: string
): Promise<boolean> {
  return await sendEmail({
    to: userEmail,
    from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
    subject: `Evidence Feedback - ${evidenceTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #FFC557 0%, #FF595A 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📝 Evidence Feedback</h1>
        </div>
        <div style="padding: 40px 20px; background: #f9f9f9;">
          <h2 style="color: #0B3D5D;">Feedback for ${schoolName}</h2>
          <p style="color: #666; line-height: 1.6;">
            Your evidence submission "<strong>${evidenceTitle}</strong>" has been reviewed by our team.
          </p>
          <div style="background: white; padding: 20px; border-left: 4px solid #FFC557; margin: 20px 0;">
            <h3 style="color: #0B3D5D; margin-top: 0;">Reviewer Feedback:</h3>
            <p style="color: #666; line-height: 1.6;">${feedback}</p>
          </div>
          <p style="color: #666; line-height: 1.6;">
            Please review the feedback and feel free to resubmit your evidence with any necessary improvements.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://plasticclever.org'}" 
               style="background: #019ADE; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Resubmit Evidence
            </a>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendTeacherInvitationEmail(
  recipientEmail: string,
  schoolName: string,
  inviterName: string,
  token: string,
  expiresInDays: number
): Promise<boolean> {
  return await sendEmail({
    to: recipientEmail,
    from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
    subject: `You've been invited to join ${schoolName} on Plastic Clever Schools`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0B3D5D 0%, #019ADE 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✉️ You've been invited!</h1>
        </div>
        <div style="padding: 40px 20px; background: #f9f9f9;">
          <h2 style="color: #0B3D5D;">Join ${schoolName} on Plastic Clever Schools</h2>
          <p style="color: #666; line-height: 1.6;">
            <strong>${inviterName}</strong> has invited you to join <strong>${schoolName}</strong> on Plastic Clever Schools.
          </p>
          <p style="color: #666; line-height: 1.6;">
            Plastic Clever Schools is a global program that empowers schools to tackle plastic pollution through education and action. 
            By joining your school's team, you'll be able to:
          </p>
          <ul style="color: #666; line-height: 1.8;">
            <li>Collaborate with colleagues on reducing plastic waste</li>
            <li>Access educational resources and lesson plans</li>
            <li>Track your school's progress through three program stages</li>
            <li>Submit evidence and earn recognition for your achievements</li>
            <li>Join a worldwide community of eco-conscious educators</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://plasticclever.org'}/invitations/${token}" 
               style="background: #019ADE; color: white; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <div style="background: #FFF3E0; border-left: 4px solid #FFC557; padding: 15px; margin: 20px 0;">
            <p style="color: #666; margin: 0; line-height: 1.6;">
              ⏰ <strong>Note:</strong> This invitation expires in ${expiresInDays} days.
            </p>
          </div>
          <p style="color: #666; line-height: 1.6;">
            If you have any questions, feel free to reply to this email or contact your school administrator.
          </p>
        </div>
        <div style="background: #0B3D5D; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p>© 2024 Plastic Clever Schools. Making waves for a plastic-free future.</p>
        </div>
      </div>
    `,
  });
}

export async function sendVerificationRequestEmail(
  headTeacherEmail: string,
  schoolName: string,
  requesterName: string,
  requesterEmail: string,
  evidence: string
): Promise<boolean> {
  return await sendEmail({
    to: headTeacherEmail,
    from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
    subject: `New Teacher Verification Request for ${schoolName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #019ADE 0%, #02BBB4 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">👥 New Team Member Request</h1>
        </div>
        <div style="padding: 40px 20px; background: #f9f9f9;">
          <h2 style="color: #0B3D5D;">Verification Request for ${schoolName}</h2>
          <p style="color: #666; line-height: 1.6;">
            <strong>${requesterName}</strong> (<a href="mailto:${requesterEmail}" style="color: #019ADE;">${requesterEmail}</a>) has requested to join ${schoolName} on Plastic Clever Schools.
          </p>
          <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #0B3D5D; margin-top: 0;">Evidence/Reason Provided:</h3>
            <p style="color: #666; line-height: 1.6; white-space: pre-wrap;">${evidence}</p>
          </div>
          <div style="background: #E3F2FD; border-left: 4px solid #019ADE; padding: 15px; margin: 20px 0;">
            <h4 style="color: #0B3D5D; margin: 0 0 10px 0;">📋 What you need to do:</h4>
            <ul style="color: #666; margin: 0; line-height: 1.6;">
              <li>Review the request and verify the teacher's identity</li>
              <li>Check if they are affiliated with your school</li>
              <li>Approve to grant them access to your school's dashboard</li>
              <li>Reject if you don't recognize them or need more information</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://plasticclever.org'}/dashboard/team-management?tab=requests" 
               style="background: #019ADE; color: white; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Review Request
            </a>
          </div>
          <p style="color: #666; line-height: 1.6; text-align: center; font-size: 14px;">
            You can approve or reject this request from your school's dashboard.
          </p>
        </div>
        <div style="background: #0B3D5D; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p>© 2024 Plastic Clever Schools. Making waves for a plastic-free future.</p>
        </div>
      </div>
    `,
  });
}

export async function sendVerificationApprovalEmail(
  requesterEmail: string,
  schoolName: string,
  reviewerName: string,
  reviewNotes?: string
): Promise<boolean> {
  return await sendEmail({
    to: requesterEmail,
    from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
    subject: `Welcome to ${schoolName} on Plastic Clever Schools!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4CAF50 0%, #02BBB4 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✅ Request Approved!</h1>
        </div>
        <div style="padding: 40px 20px; background: #f9f9f9;">
          <h2 style="color: #0B3D5D;">Welcome to the team!</h2>
          <p style="color: #666; line-height: 1.6;">
            Great news! <strong>${reviewerName}</strong> has approved your request to join <strong>${schoolName}</strong> on Plastic Clever Schools.
          </p>
          ${reviewNotes ? `
          <div style="background: white; padding: 20px; border-left: 4px solid #4CAF50; margin: 20px 0;">
            <h3 style="color: #0B3D5D; margin-top: 0;">Message from ${reviewerName}:</h3>
            <p style="color: #666; line-height: 1.6; white-space: pre-wrap;">${reviewNotes}</p>
          </div>
          ` : ''}
          <div style="background: #E8F5E9; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
            <h4 style="color: #2E7D32; margin: 0 0 10px 0;">🎯 What you can do now:</h4>
            <ul style="color: #666; margin: 0; line-height: 1.6;">
              <li>Access your school's dashboard and view progress</li>
              <li>Collaborate with your team on plastic reduction initiatives</li>
              <li>Submit evidence for program stages</li>
              <li>Access resources and educational materials</li>
              <li>Track your school's journey to becoming plastic clever</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://plasticclever.org'}/dashboard" 
               style="background: #4CAF50; color: white; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Access Your Dashboard
            </a>
          </div>
          <p style="color: #666; line-height: 1.6;">
            We're excited to have you on board. Together, we can make a real difference in tackling plastic pollution!
          </p>
        </div>
        <div style="background: #0B3D5D; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p>© 2024 Plastic Clever Schools. Making waves for a plastic-free future.</p>
        </div>
      </div>
    `,
  });
}

export async function sendVerificationRejectionEmail(
  requesterEmail: string,
  schoolName: string,
  reviewerName: string,
  reviewNotes?: string
): Promise<boolean> {
  return await sendEmail({
    to: requesterEmail,
    from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
    subject: `Update on Your Request to Join ${schoolName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #607D8B 0%, #455A64 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📋 Request Status Update</h1>
        </div>
        <div style="padding: 40px 20px; background: #f9f9f9;">
          <h2 style="color: #0B3D5D;">Update on Your Verification Request</h2>
          <p style="color: #666; line-height: 1.6;">
            <strong>${reviewerName}</strong> has reviewed your request to join <strong>${schoolName}</strong> on Plastic Clever Schools.
          </p>
          ${reviewNotes ? `
          <div style="background: white; padding: 20px; border-left: 4px solid #607D8B; margin: 20px 0;">
            <h3 style="color: #0B3D5D; margin-top: 0;">Feedback from ${reviewerName}:</h3>
            <p style="color: #666; line-height: 1.6; white-space: pre-wrap;">${reviewNotes}</p>
          </div>
          ` : `
          <p style="color: #666; line-height: 1.6;">
            Unfortunately, your request was not approved at this time.
          </p>
          `}
          <div style="background: #ECEFF1; border-left: 4px solid #607D8B; padding: 15px; margin: 20px 0;">
            <p style="color: #666; margin: 0; line-height: 1.6;">
              💡 <strong>What to do next:</strong> If you believe this is an error, please contact ${schoolName} directly to verify your affiliation and resolve any concerns.
            </p>
          </div>
          <p style="color: #666; line-height: 1.6;">
            If you have questions about the Plastic Clever Schools program or need assistance, our support team is here to help.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://plasticclever.org'}/help" 
               style="background: #607D8B; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Visit Help Center
            </a>
          </div>
        </div>
        <div style="background: #0B3D5D; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p>© 2024 Plastic Clever Schools. Making waves for a plastic-free future.</p>
        </div>
      </div>
    `,
  });
}

// New evidence submission notification functions
export async function sendEvidenceSubmissionEmail(
  userEmail: string, 
  schoolName: string, 
  evidenceTitle: string,
  stage: string
): Promise<boolean> {
  return await sendEmail({
    to: userEmail,
    from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
    subject: `Evidence Submitted Successfully - ${evidenceTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #02BBB4 0%, #019ADE 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📤 Evidence Submitted!</h1>
        </div>
        <div style="padding: 40px 20px; background: #f9f9f9;">
          <h2 style="color: #0B3D5D;">Thank you, ${schoolName}!</h2>
          <p style="color: #666; line-height: 1.6;">
            Your evidence submission "<strong>${evidenceTitle}</strong>" for the <strong>${stage}</strong> stage has been successfully submitted and is now under review.
          </p>
          <div style="background: #fff; border-left: 4px solid #02BBB4; padding: 20px; margin: 20px 0;">
            <h3 style="color: #02BBB4; margin-top: 0;">What happens next?</h3>
            <ul style="color: #666; margin-bottom: 0;">
              <li>Our team will review your submission within 5-7 business days</li>
              <li>You'll receive an email notification with the review outcome</li>
              <li>If approved, your progress will be updated automatically</li>
              <li>If revisions are needed, we'll provide detailed feedback</li>
            </ul>
          </div>
          <p style="color: #666; line-height: 1.6;">
            Keep up the excellent work on your plastic-free journey!
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://plasticclever.org'}" 
               style="background: #02BBB4; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              View Your Progress
            </a>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendAdminNewEvidenceEmail(
  adminEmail: string,
  schoolName: string,
  evidenceTitle: string,
  stage: string,
  submitterName: string
): Promise<boolean> {
  return await sendEmail({
    to: adminEmail,
    from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
    subject: `New Evidence Submission - ${evidenceTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0B3D5D 0%, #019ADE 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔔 New Evidence Submission</h1>
        </div>
        <div style="padding: 40px 20px; background: #f9f9f9;">
          <h2 style="color: #0B3D5D;">Review Required</h2>
          <p style="color: #666; line-height: 1.6;">
            A new evidence submission has been received and requires admin review.
          </p>
          <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #0B3D5D; margin-top: 0;">Submission Details:</h3>
            <ul style="color: #666; margin-bottom: 0; list-style: none; padding: 0;">
              <li style="margin-bottom: 8px;"><strong>Title:</strong> ${evidenceTitle}</li>
              <li style="margin-bottom: 8px;"><strong>School:</strong> ${schoolName}</li>
              <li style="margin-bottom: 8px;"><strong>Stage:</strong> ${stage}</li>
              <li style="margin-bottom: 8px;"><strong>Submitted by:</strong> ${submitterName}</li>
            </ul>
          </div>
          <p style="color: #666; line-height: 1.6;">
            Please review this submission and provide feedback to help the school continue their progress.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://plasticclever.org'}/admin" 
               style="background: #0B3D5D; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Review Evidence
            </a>
          </div>
        </div>
      </div>
    `,
  });
}

// Bulk email functions for admin use
export interface BulkEmailParams {
  recipients: string[];
  subject: string;
  content: string;
  template: 'announcement' | 'reminder' | 'invitation' | 'newsletter' | 'custom';
}

export async function sendBulkEmail(params: BulkEmailParams): Promise<{ sent: number; failed: number; details: Array<{email: string; success: boolean}> }> {
  const results = { sent: 0, failed: 0, details: [] as Array<{email: string; success: boolean}> };
  
  for (const email of params.recipients) {
    try {
      const success = await sendEmail({
        to: email,
        from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
        subject: params.subject,
        html: getBulkEmailTemplate(params.template, params.content, params.subject),
      });
      
      if (success) {
        results.sent++;
        results.details.push({ email, success: true });
      } else {
        results.failed++;
        results.details.push({ email, success: false });
      }
      
      // Rate limiting - delay between emails
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      results.failed++;
      results.details.push({ email, success: false });
    }
  }
  
  return results;
}

function getBulkEmailTemplate(template: string, content: string, subject: string): string {
  const baseUrl = process.env.FRONTEND_URL || 'https://plasticclever.org';
  
  switch (template) {
    case 'announcement':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0B3D5D 0%, #019ADE 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">📢 Plastic Clever Schools</h1>
            <p style="color: #B8E6FF; margin: 10px 0 0 0;">Important Announcement</p>
          </div>
          <div style="padding: 40px 20px; background: #f9f9f9;">
            <h2 style="color: #0B3D5D; border-left: 4px solid #019ADE; padding-left: 20px;">${subject}</h2>
            <div style="color: #666; line-height: 1.6; background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ${content}
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}" 
                 style="background: #019ADE; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                View Dashboard
              </a>
            </div>
          </div>
          <div style="background: #0B3D5D; color: white; padding: 20px; text-align: center; font-size: 14px;">
            <p>© 2024 Plastic Clever Schools. Making waves for a plastic-free future.</p>
          </div>
        </div>
      `;

    case 'reminder':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #FFC557 0%, #FF8A65 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">⏰ Plastic Clever Schools</h1>
            <p style="color: #FFF3E0; margin: 10px 0 0 0;">Friendly Reminder</p>
          </div>
          <div style="padding: 40px 20px; background: #fff8f0;">
            <div style="background: #FFF3E0; border: 1px solid #FFE0B2; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #E65100; margin: 0 0 10px 0;">⚡ Action Required</h3>
              <h2 style="color: #0B3D5D; margin: 0;">${subject}</h2>
            </div>
            <div style="color: #666; line-height: 1.6;">
              ${content}
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}" 
                 style="background: #FF8A65; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Take Action Now
              </a>
            </div>
          </div>
          <div style="background: #E65100; color: white; padding: 20px; text-align: center; font-size: 14px;">
            <p>© 2024 Plastic Clever Schools. Don't let this opportunity slip away!</p>
          </div>
        </div>
      `;

    case 'invitation':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #02BBB4 0%, #4CAF50 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Plastic Clever Schools</h1>
            <p style="color: #E0F7FA; margin: 10px 0 0 0;">You're Invited!</p>
          </div>
          <div style="padding: 40px 20px; background: #f1fdfc;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: linear-gradient(45deg, #02BBB4, #4CAF50); padding: 3px; border-radius: 12px;">
                <div style="background: white; padding: 15px 25px; border-radius: 10px;">
                  <h2 style="color: #02BBB4; margin: 0; font-size: 24px;">✨ Special Invitation ✨</h2>
                </div>
              </div>
            </div>
            <h3 style="color: #0B3D5D; text-align: center; margin-bottom: 20px;">${subject}</h3>
            <div style="color: #666; line-height: 1.6; text-align: center;">
              ${content}
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}" 
                 style="background: linear-gradient(45deg, #02BBB4, #4CAF50); color: white; padding: 18px 35px; text-decoration: none; border-radius: 25px; font-weight: bold; box-shadow: 0 4px 15px rgba(2,187,180,0.3);">
                Accept Invitation
              </a>
            </div>
          </div>
          <div style="background: #02BBB4; color: white; padding: 20px; text-align: center; font-size: 14px;">
            <p>© 2024 Plastic Clever Schools. Building a sustainable future together!</p>
          </div>
        </div>
      `;

    case 'newsletter':
      return `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #4A148C 0%, #7B1FA2 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 32px; font-family: 'Georgia', serif;">📰 PCS Newsletter</h1>
            <p style="color: #E1BEE7; margin: 10px 0 0 0; font-style: italic;">Plastic Clever Schools Monthly Update</p>
          </div>
          <div style="padding: 40px 20px; background: #fafafa; border-left: 4px solid #7B1FA2;">
            <h2 style="color: #4A148C; font-family: 'Georgia', serif; border-bottom: 2px solid #E1BEE7; padding-bottom: 10px;">${subject}</h2>
            <div style="color: #555; line-height: 1.8; font-size: 16px;">
              ${content}
            </div>
            <div style="background: #F3E5F5; padding: 20px; margin: 30px 0; border-radius: 8px; border-left: 4px solid #7B1FA2;">
              <h4 style="color: #4A148C; margin: 0 0 10px 0;">📚 This Month's Highlights</h4>
              <p style="color: #666; margin: 0; line-height: 1.6;">Stay updated with the latest developments, success stories, and upcoming events in our community.</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}" 
                 style="background: #7B1FA2; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Read Full Newsletter
              </a>
            </div>
          </div>
          <div style="background: #4A148C; color: white; padding: 20px; text-align: center; font-size: 14px;">
            <p>© 2024 Plastic Clever Schools Newsletter. Informing our global community.</p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #E1BEE7;">Subscribe • Unsubscribe • Update Preferences</p>
          </div>
        </div>
      `;

    case 'custom':
    default:
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0B3D5D 0%, #019ADE 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🌱 Plastic Clever Schools</h1>
          </div>
          <div style="padding: 40px 20px; background: #f9f9f9;">
            <h2 style="color: #0B3D5D;">${subject}</h2>
            <div style="color: #666; line-height: 1.6;">
              ${content}
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}" 
                 style="background: #FF595A; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Visit Plastic Clever Schools
              </a>
            </div>
          </div>
          <div style="background: #0B3D5D; color: white; padding: 20px; text-align: center; font-size: 14px;">
            <p>© 2024 Plastic Clever Schools. Making waves for a plastic-free future.</p>
            <p style="margin: 0; font-size: 12px;">You received this email because you're part of the Plastic Clever Schools community.</p>
          </div>
        </div>
      `;
  }
}
