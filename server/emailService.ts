import { MailService } from '@sendgrid/mail';
import { storage } from './storage';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable not set");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

function getBaseUrl(): string {
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  
  if (process.env.FRONTEND_URL) {
    const url = process.env.FRONTEND_URL;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  }
  
  return 'https://plasticclever.org';
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
  } catch (error: any) {
    console.error('SendGrid email error:', error);
    
    // Log detailed error information
    if (error.response && error.response.body && error.response.body.errors) {
      console.error('SendGrid error details:', JSON.stringify(error.response.body.errors, null, 2));
    }
    
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
    templateId: 'd-67435cbdbfbf42d5b3b3167a7efa2e1c',
    dynamicTemplateData: {
      schoolName: schoolName,
      dashboardUrl: getBaseUrl(),
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
    templateId: 'd-3349376322ca47c79729d04b402372c6',
    dynamicTemplateData: {
      schoolName: schoolName,
      evidenceTitle: evidenceTitle,
      dashboardUrl: getBaseUrl(),
    },
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
    templateId: 'd-df7b17c32ee04fc78db7dc888f6849da',
    dynamicTemplateData: {
      schoolName: schoolName,
      evidenceTitle: evidenceTitle,
      feedback: feedback,
      dashboardUrl: getBaseUrl(),
    },
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
    templateId: 'd-0940098ba7ec4188824e4b14274e668c',
    dynamicTemplateData: {
      schoolName: schoolName,
      inviterName: inviterName,
      invitationUrl: `${getBaseUrl()}/invitations/${token}`,
      expiresInDays: expiresInDays,
    },
  });
}

export async function sendAdminInvitationEmail(
  recipientEmail: string,
  inviterName: string,
  token: string,
  expiresInDays: number
): Promise<boolean> {
  const acceptUrl = `${getBaseUrl()}/admin-invitations/${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Invitation - Plastic Clever Schools</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f5f5f5;">
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background-color: #0B3D5D; padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                    Plastic Clever Schools
                  </h1>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #0B3D5D; font-size: 24px; font-weight: 600;">
                    You've Been Invited as an Administrator
                  </h2>
                  
                  <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    Hello,
                  </p>
                  
                  <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    <strong>${inviterName}</strong> has invited you to join Plastic Clever Schools as an Administrator. As an admin, you'll have the ability to oversee schools, review evidence submissions, and help manage the platform to support our mission of reducing plastic waste in schools worldwide.
                  </p>
                  
                  <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    Click the button below to accept your invitation and get started:
                  </p>
                  
                  <!-- Button -->
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                    <tr>
                      <td style="border-radius: 6px; background-color: #019ADE;">
                        <a href="${acceptUrl}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                          Accept Invitation
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    Or copy and paste this link into your browser:
                  </p>
                  
                  <p style="margin: 0 0 30px 0; color: #019ADE; font-size: 14px; line-height: 1.6; word-break: break-all;">
                    ${acceptUrl}
                  </p>
                  
                  <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-left: 4px solid #019ADE; border-radius: 4px;">
                    <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                      <strong>⏰ Important:</strong> This invitation will expire in <strong>${expiresInDays} day${expiresInDays !== 1 ? 's' : ''}</strong>. Please accept it before then to maintain access.
                    </p>
                  </div>
                  
                  <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    If you have any questions or didn't expect this invitation, please contact us or the person who invited you.
                  </p>
                  
                  <p style="margin: 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    Thank you for joining our mission to create a plastic-free future!
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    Plastic Clever Schools
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.6;">
                    Together, we're making schools plastic clever
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
  
  return await sendEmail({
    to: recipientEmail,
    from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
    subject: "You've been invited to join Plastic Clever Schools as an Administrator",
    html: html,
  });
}

export async function sendPartnerInvitationEmail(
  recipientEmail: string,
  inviterName: string,
  token: string,
  expiresInDays: number
): Promise<boolean> {
  const acceptUrl = `${getBaseUrl()}/admin-invitations/${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Partner Invitation - Plastic Clever Schools</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f5f5f5;">
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background-color: #0B3D5D; padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                    Plastic Clever Schools
                  </h1>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #0B3D5D; font-size: 24px; font-weight: 600;">
                    You've Been Invited as a Partner
                  </h2>
                  
                  <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    Hello,
                  </p>
                  
                  <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    <strong>${inviterName}</strong> has invited you to join Plastic Clever Schools as a Partner. As a partner, you'll have access to view schools, review evidence submissions, and help support our mission of reducing plastic waste in schools worldwide.
                  </p>
                  
                  <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    Click the button below to accept your invitation and get started:
                  </p>
                  
                  <!-- Button -->
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                    <tr>
                      <td style="border-radius: 6px; background-color: #019ADE;">
                        <a href="${acceptUrl}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                          Accept Invitation
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    Or copy and paste this link into your browser:
                  </p>
                  
                  <p style="margin: 0 0 30px 0; color: #019ADE; font-size: 14px; line-height: 1.6; word-break: break-all;">
                    ${acceptUrl}
                  </p>
                  
                  <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-left: 4px solid #019ADE; border-radius: 4px;">
                    <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                      <strong>⏰ Important:</strong> This invitation will expire in <strong>${expiresInDays} day${expiresInDays !== 1 ? 's' : ''}</strong>. Please accept it before then to maintain access.
                    </p>
                  </div>
                  
                  <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    If you have any questions or didn't expect this invitation, please contact us or the person who invited you.
                  </p>
                  
                  <p style="margin: 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    Thank you for joining our mission to create a plastic-free future!
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    Plastic Clever Schools
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.6;">
                    Together, we're making schools plastic clever
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
  
  return await sendEmail({
    to: recipientEmail,
    from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
    subject: "You've been invited to join Plastic Clever Schools as a Partner",
    html: html,
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
    templateId: 'd-19393590bcaf43e091737b69c49139ac',
    dynamicTemplateData: {
      schoolName: schoolName,
      requesterName: requesterName,
      requesterEmail: requesterEmail,
      evidence: evidence,
      reviewUrl: `${getBaseUrl()}/dashboard/team-management?tab=requests`,
    },
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
    templateId: 'd-adcb01d8edd5403490263da8ab97f402',
    dynamicTemplateData: {
      schoolName: schoolName,
      reviewerName: reviewerName,
      dashboardUrl: `${getBaseUrl()}/dashboard`,
      reviewNotes: reviewNotes || '',
    },
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
    templateId: 'd-6df35ffa36604ed9a62e919f5fa48962',
    dynamicTemplateData: {
      schoolName: schoolName,
      reviewerName: reviewerName,
      reviewNotes: reviewNotes || '',
      helpCenterUrl: `${getBaseUrl()}/help`,
    },
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
    templateId: 'd-2a045eb4f5a0477689d385a315dc2938',
    dynamicTemplateData: {
      schoolName: schoolName,
      evidenceTitle: evidenceTitle,
      stage: stage,
      dashboardUrl: getBaseUrl(),
    },
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
    templateId: 'd-cf5207c6e0734984bc8008f5285fcef4',
    dynamicTemplateData: {
      schoolName: schoolName,
      evidenceTitle: evidenceTitle,
      stage: stage,
      submitterName: submitterName,
      adminUrl: `${getBaseUrl()}/admin`,
    },
  });
}

// Audit email functions
export async function sendAuditSubmissionEmail(
  userEmail: string,
  schoolName: string
): Promise<boolean> {
  return await sendEmail({
    to: userEmail,
    from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
    subject: `Plastic Waste Audit Submitted - ${schoolName}`,
    templateId: 'd-audit-submission-placeholder',
    dynamicTemplateData: {
      schoolName: schoolName,
      dashboardUrl: getBaseUrl(),
    },
  });
}

export async function sendAdminNewAuditEmail(
  adminEmail: string,
  schoolName: string,
  submitterName: string
): Promise<boolean> {
  return await sendEmail({
    to: adminEmail,
    from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
    subject: `New Audit Submission - ${schoolName}`,
    templateId: 'd-admin-audit-notification-placeholder',
    dynamicTemplateData: {
      schoolName: schoolName,
      submitterName: submitterName,
      adminUrl: `${getBaseUrl()}/admin`,
    },
  });
}

export async function sendAuditApprovalEmail(
  userEmail: string,
  schoolName: string
): Promise<boolean> {
  return await sendEmail({
    to: userEmail,
    from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
    subject: `Audit Approved - ${schoolName}`,
    templateId: 'd-audit-approval-placeholder',
    dynamicTemplateData: {
      schoolName: schoolName,
      dashboardUrl: getBaseUrl(),
    },
  });
}

export async function sendAuditRejectionEmail(
  userEmail: string,
  schoolName: string,
  feedback: string
): Promise<boolean> {
  return await sendEmail({
    to: userEmail,
    from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
    subject: `Audit Feedback - ${schoolName}`,
    templateId: 'd-audit-rejection-placeholder',
    dynamicTemplateData: {
      schoolName: schoolName,
      feedback: feedback,
      dashboardUrl: getBaseUrl(),
    },
  });
}

// Bulk email functions for admin use
// 
// IMPORTANT: You must create a SendGrid dynamic template with the following variables:
// - {{subject}} - Email subject line
// - {{preheader}} - Preview text shown in email clients (optional)
// - {{title}} - Main heading displayed in the email
// - {{preTitle}} - Subtitle displayed under the title (optional)
// - {{{messageContent}}} - Main body content (use triple braces to allow HTML)
//
// The template ID should be set in the BULK_EMAIL_TEMPLATE_ID constant below.
// Once you have created the template in SendGrid, replace 'BULK_EMAIL_TEMPLATE_ID' 
// with your actual template ID (e.g., 'd-1234567890abcdef1234567890abcdef').

const BULK_EMAIL_TEMPLATE_ID = 'd-b546db54234145adaf87db5db37b3edc';

export interface BulkEmailParams {
  recipients: string[];
  subject: string;
  preheader?: string;
  title: string;
  preTitle?: string;
  messageContent: string;
}

export async function sendBulkEmail(params: BulkEmailParams): Promise<{ sent: number; failed: number; details: Array<{email: string; success: boolean}> }> {
  const results = { sent: 0, failed: 0, details: [] as Array<{email: string; success: boolean}> };
  
  for (const email of params.recipients) {
    try {
      const success = await sendEmail({
        to: email,
        from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
        subject: params.subject,
        templateId: BULK_EMAIL_TEMPLATE_ID,
        dynamicTemplateData: {
          subject: params.subject,
          preheader: params.preheader || '',
          title: params.title,
          preTitle: params.preTitle || '',
          messageContent: params.messageContent,
        },
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

export async function sendEventRegistrationEmail(
  to: string,
  user: { firstName?: string; lastName?: string },
  event: {
    id: string;
    title: string;
    description: string;
    startDateTime: Date | string;
    endDateTime: Date | string;
    timezone?: string;
    location?: string;
    isVirtual?: boolean;
    meetingLink?: string;
  }
): Promise<boolean> {
  const userName = user.firstName ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : 'there';
  const startDate = new Date(event.startDateTime);
  const endDate = new Date(event.endDateTime);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const locationInfo = event.isVirtual 
    ? `<p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
         <strong>🌐 Virtual Event:</strong><br/>
         ${event.meetingLink ? `Join the event using this link:<br/><a href="${event.meetingLink}" style="color: #019ADE; text-decoration: none;">${event.meetingLink}</a>` : 'Meeting link will be shared closer to the event date.'}
       </p>`
    : `<p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
         <strong>📍 Location:</strong><br/>
         ${event.location || 'To be announced'}
       </p>`;

  const calendarUrl = `${getBaseUrl()}/events/${event.id}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Registration Confirmed - Plastic Clever Schools</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f5f5f5;">
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background-color: #0B3D5D; padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                    Plastic Clever Schools
                  </h1>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #0B3D5D; font-size: 24px; font-weight: 600;">
                    You're Registered! ✅
                  </h2>
                  
                  <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    Hi ${userName},
                  </p>
                  
                  <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    Your registration for <strong>${event.title}</strong> has been confirmed! We're excited to have you join us.
                  </p>
                  
                  <!-- Event Details Card -->
                  <div style="margin: 0 0 30px 0; padding: 25px; background-color: #f8f9fa; border-left: 4px solid #019ADE; border-radius: 4px;">
                    <h3 style="margin: 0 0 15px 0; color: #0B3D5D; font-size: 18px; font-weight: 600;">
                      Event Details
                    </h3>
                    
                    <p style="margin: 0 0 15px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                      <strong>📅 Date:</strong><br/>
                      ${formatDate(startDate)}
                    </p>
                    
                    <p style="margin: 0 0 15px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                      <strong>🕐 Time:</strong><br/>
                      ${formatTime(startDate)} - ${formatTime(endDate)}${event.timezone ? ` (${event.timezone})` : ''}
                    </p>
                    
                    ${locationInfo}
                    
                    <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                      ${event.description}
                    </p>
                  </div>
                  
                  <!-- Action Buttons -->
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                    <tr>
                      <td style="border-radius: 6px; background-color: #019ADE; padding-right: 10px;">
                        <a href="${calendarUrl}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                          View Event Details
                        </a>
                      </td>
                      ${event.meetingLink ? `
                      <td style="border-radius: 6px; background-color: #0B3D5D;">
                        <a href="${event.meetingLink}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                          Join Event
                        </a>
                      </td>
                      ` : ''}
                    </tr>
                  </table>
                  
                  <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    We'll send you a reminder before the event starts. If you need to cancel your registration, you can do so from your dashboard.
                  </p>
                  
                  <p style="margin: 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    Looking forward to seeing you there!
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    Plastic Clever Schools
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.6;">
                    Together, we're making schools plastic clever
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return await sendEmail({
    to: to,
    from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
    subject: `Registration Confirmed: ${event.title}`,
    html: html,
  });
}

export async function sendEventCancellationEmail(
  to: string,
  user: { firstName?: string; lastName?: string },
  event: {
    id: string;
    title: string;
    startDateTime: Date | string;
  }
): Promise<boolean> {
  const userName = user.firstName ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : 'there';
  const startDate = new Date(event.startDateTime);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const eventsUrl = `${getBaseUrl()}/events`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Registration Cancelled - Plastic Clever Schools</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f5f5f5;">
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background-color: #0B3D5D; padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                    Plastic Clever Schools
                  </h1>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #0B3D5D; font-size: 24px; font-weight: 600;">
                    Registration Cancelled
                  </h2>
                  
                  <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    Hi ${userName},
                  </p>
                  
                  <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    Your registration for <strong>${event.title}</strong> on <strong>${formatDate(startDate)}</strong> has been cancelled as requested.
                  </p>
                  
                  <div style="margin: 0 0 30px 0; padding: 20px; background-color: #f8f9fa; border-left: 4px solid #019ADE; border-radius: 4px;">
                    <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                      We're sorry you can't make it! If you change your mind and spots are still available, you're welcome to register again.
                    </p>
                  </div>
                  
                  <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    Don't miss out on other upcoming events! Browse our event calendar to find more opportunities to connect with the Plastic Clever Schools community.
                  </p>
                  
                  <!-- Action Button -->
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                    <tr>
                      <td style="border-radius: 6px; background-color: #019ADE;">
                        <a href="${eventsUrl}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                          Browse Upcoming Events
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    Thank you for being part of our community!
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    Plastic Clever Schools
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.6;">
                    Together, we're making schools plastic clever
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return await sendEmail({
    to: to,
    from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
    subject: `Registration Cancelled: ${event.title}`,
    html: html,
  });
}

export async function sendEventReminderEmail(
  to: string,
  user: { firstName?: string; lastName?: string },
  event: {
    id: string;
    title: string;
    description: string;
    startDateTime: Date | string;
    endDateTime: Date | string;
    timezone?: string;
    location?: string;
    isVirtual?: boolean;
    meetingLink?: string;
  },
  hoursUntil: number
): Promise<boolean> {
  const userName = user.firstName ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : 'there';
  const startDate = new Date(event.startDateTime);
  const endDate = new Date(event.endDateTime);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const timeMessage = hoursUntil === 24 
    ? 'tomorrow' 
    : hoursUntil === 1 
    ? 'in 1 hour' 
    : `in ${hoursUntil} hours`;

  const locationInfo = event.isVirtual 
    ? `<p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
         <strong>🌐 Virtual Event:</strong><br/>
         ${event.meetingLink ? `<a href="${event.meetingLink}" style="color: #019ADE; text-decoration: none; font-weight: 600;">${event.meetingLink}</a>` : 'Meeting link will be shared closer to the event date.'}
       </p>`
    : `<p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
         <strong>📍 Location:</strong><br/>
         ${event.location || 'To be announced'}
       </p>`;

  const actionButton = event.isVirtual && event.meetingLink
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
         <tr>
           <td style="border-radius: 6px; background-color: #019ADE;">
             <a href="${event.meetingLink}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
               Join Event Now
             </a>
           </td>
         </tr>
       </table>`
    : `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
         <tr>
           <td style="border-radius: 6px; background-color: #019ADE;">
             <a href="${getBaseUrl()}/events/${event.id}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
               View Event Details
             </a>
           </td>
         </tr>
       </table>`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Reminder - Plastic Clever Schools</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f5f5f5;">
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background-color: #0B3D5D; padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                    Plastic Clever Schools
                  </h1>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #0B3D5D; font-size: 24px; font-weight: 600;">
                    Event Reminder: ${event.title}
                  </h2>
                  
                  <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    Hi ${userName},
                  </p>
                  
                  <p style="margin: 0 0 30px 0; color: #333333; font-size: 18px; line-height: 1.6; font-weight: 600;">
                    ⏰ Your event starts ${timeMessage}!
                  </p>
                  
                  <!-- Event Details Card -->
                  <div style="margin: 0 0 30px 0; padding: 25px; background-color: #f8f9fa; border-left: 4px solid #019ADE; border-radius: 4px;">
                    <h3 style="margin: 0 0 15px 0; color: #0B3D5D; font-size: 18px; font-weight: 600;">
                      Event Details
                    </h3>
                    
                    <p style="margin: 0 0 15px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                      <strong>📅 Date:</strong><br/>
                      ${formatDate(startDate)}
                    </p>
                    
                    <p style="margin: 0 0 15px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                      <strong>🕐 Time:</strong><br/>
                      ${formatTime(startDate)} - ${formatTime(endDate)}${event.timezone ? ` (${event.timezone})` : ''}
                    </p>
                    
                    ${locationInfo}
                  </div>
                  
                  ${actionButton}
                  
                  <p style="margin: 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    We look forward to seeing you there!
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    Plastic Clever Schools
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.6;">
                    Together, we're making schools plastic clever
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return await sendEmail({
    to: to,
    from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
    subject: `Reminder: ${event.title} starts ${timeMessage}`,
    html: html,
  });
}

export async function sendEventUpdatedEmail(
  to: string,
  user: { firstName?: string; lastName?: string },
  event: {
    id: string;
    title: string;
    description: string;
    startDateTime: Date | string;
    endDateTime: Date | string;
    timezone?: string;
    location?: string;
    isVirtual?: boolean;
    meetingLink?: string;
  },
  changes: string[]
): Promise<boolean> {
  const userName = user.firstName ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : 'there';
  const startDate = new Date(event.startDateTime);
  const endDate = new Date(event.endDateTime);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const changesHtml = changes.map(change => 
    `<li style="margin-bottom: 8px; color: #333333; font-size: 15px;">${change}</li>`
  ).join('');

  const locationInfo = event.isVirtual 
    ? `<p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
         <strong>🌐 Virtual Event:</strong><br/>
         ${event.meetingLink ? `<a href="${event.meetingLink}" style="color: #019ADE; text-decoration: none;">${event.meetingLink}</a>` : 'Meeting link will be shared closer to the event date.'}
       </p>`
    : `<p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
         <strong>📍 Location:</strong><br/>
         ${event.location || 'To be announced'}
       </p>`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Updated - Plastic Clever Schools</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f5f5f5;">
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background-color: #0B3D5D; padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                    Plastic Clever Schools
                  </h1>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #0B3D5D; font-size: 24px; font-weight: 600;">
                    Event Updated: ${event.title}
                  </h2>
                  
                  <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    Hi ${userName},
                  </p>
                  
                  <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    The event <strong>${event.title}</strong> that you're registered for has been updated. Please review the changes below:
                  </p>
                  
                  <!-- Changes Card -->
                  <div style="margin: 0 0 30px 0; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                    <h3 style="margin: 0 0 15px 0; color: #856404; font-size: 16px; font-weight: 600;">
                      📝 What's Changed:
                    </h3>
                    <ul style="margin: 0; padding-left: 20px;">
                      ${changesHtml}
                    </ul>
                  </div>
                  
                  <!-- Updated Event Details -->
                  <div style="margin: 0 0 30px 0; padding: 25px; background-color: #f8f9fa; border-left: 4px solid #019ADE; border-radius: 4px;">
                    <h3 style="margin: 0 0 15px 0; color: #0B3D5D; font-size: 18px; font-weight: 600;">
                      Updated Event Details
                    </h3>
                    
                    <p style="margin: 0 0 15px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                      <strong>📅 Date:</strong><br/>
                      ${formatDate(startDate)}
                    </p>
                    
                    <p style="margin: 0 0 15px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                      <strong>🕐 Time:</strong><br/>
                      ${formatTime(startDate)} - ${formatTime(endDate)}${event.timezone ? ` (${event.timezone})` : ''}
                    </p>
                    
                    ${locationInfo}
                    
                    <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                      ${event.description}
                    </p>
                  </div>
                  
                  <!-- Action Button -->
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                    <tr>
                      <td style="border-radius: 6px; background-color: #019ADE;">
                        <a href="${getBaseUrl()}/events/${event.id}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                          View Event Details
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    If these changes don't work for you, you can cancel your registration from your dashboard at any time.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    Plastic Clever Schools
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.6;">
                    Together, we're making schools plastic clever
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return await sendEmail({
    to: to,
    from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
    subject: `Event Updated: ${event.title}`,
    html: html,
  });
}

