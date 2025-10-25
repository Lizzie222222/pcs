import { MailService } from '@sendgrid/mail';
import { storage } from './storage';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable not set");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

export function getBaseUrl(): string {
  let baseUrl: string;
  
  if (process.env.REPLIT_DEV_DOMAIN) {
    baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    console.log(`[Email Service] Using REPLIT_DEV_DOMAIN: ${baseUrl}`);
  } else if (process.env.FRONTEND_URL) {
    const url = process.env.FRONTEND_URL;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      baseUrl = url;
    } else {
      baseUrl = `https://${url}`;
    }
    console.log(`[Email Service] Using FRONTEND_URL: ${baseUrl}`);
  } else {
    baseUrl = 'https://plasticclever.org';
    console.warn(`[Email Service] WARNING: No REPLIT_DEV_DOMAIN or FRONTEND_URL set, using fallback: ${baseUrl}`);
  }
  
  return baseUrl;
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  replyTo?: string;
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
    if (params.replyTo) emailData.replyTo = params.replyTo;
    
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
  const baseUrl = getBaseUrl();
  const acceptUrl = `${baseUrl}/admin-invitations/${token}`;
  
  // Log with redacted token for security (show only first 8 chars)
  console.log(`[Admin Invitation Email] Sending to ${recipientEmail} with token ${token.substring(0, 8)}... to URL: ${baseUrl}/admin-invitations/[REDACTED]`);
  
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
  const baseUrl = getBaseUrl();
  const acceptUrl = `${baseUrl}/admin-invitations/${token}`;
  
  // Log with redacted token for security (show only first 8 chars)
  console.log(`[Partner Invitation Email] Sending to ${recipientEmail} with token ${token.substring(0, 8)}... to URL: ${baseUrl}/admin-invitations/[REDACTED]`);
  
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
    publicSlug?: string;
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

  const eventUrl = event.publicSlug 
    ? `${getBaseUrl()}/events/${event.publicSlug}`
    : `${getBaseUrl()}/events/${event.id}`;

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
                        <a href="${eventUrl}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
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
    publicSlug?: string;
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
             <a href="${event.publicSlug ? getBaseUrl() + '/events/' + event.publicSlug : getBaseUrl() + '/events/' + event.id}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
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
    publicSlug?: string;
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
                        <a href="${event.publicSlug ? getBaseUrl() + '/events/' + event.publicSlug : getBaseUrl() + '/events/' + event.id}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
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

// SendGrid Event Announcement Functions

export async function sendEventAnnouncementEmail(
  recipients: string[],
  event: {
    id: string;
    title: string;
    description: string;
    eventType: string;
    startDateTime: Date | string;
    endDateTime: Date | string;
    timezone?: string;
    location?: string;
    isVirtual?: boolean;
    meetingLink?: string;
    imageUrl?: string;
    capacity?: number;
    publicSlug?: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!process.env.SENDGRID_API_KEY) {
    return { success: false, error: 'SendGrid not configured' };
  }

  if (recipients.length === 0) {
    return { success: false, error: 'No recipients provided' };
  }

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

  const eventTypeLabels: { [key: string]: string } = {
    workshop: '🎨 Workshop',
    webinar: '💻 Webinar',
    community_event: '🌍 Community Event',
    training: '📚 Training',
    celebration: '🎉 Celebration',
    other: '📅 Event'
  };

  const eventTypeLabel = eventTypeLabels[event.eventType] || '📅 Event';
  const locationInfo = event.isVirtual 
    ? `<p style="margin: 0 0 15px 0; color: #333333; font-size: 16px; line-height: 1.6;">
         <strong>🌐 Virtual Event</strong><br/>
         ${event.meetingLink ? `<a href="${event.meetingLink}" style="color: #019ADE; text-decoration: none;">Join Meeting</a>` : 'Meeting link will be shared before the event'}
       </p>`
    : `<p style="margin: 0 0 15px 0; color: #333333; font-size: 16px; line-height: 1.6;">
         <strong>📍 Location:</strong><br/>
         ${event.location || 'To be announced'}
       </p>`;

  const capacityInfo = event.capacity 
    ? `<div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
         <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
           ⚠️ <strong>Limited Spaces:</strong> Only ${event.capacity} spots available - register soon to secure your place!
         </p>
       </div>`
    : '';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${eventTypeLabel}: ${event.title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f5f5f5;">
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #0B3D5D 0%, #019ADE 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="margin: 0 0 10px 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                    Plastic Clever Schools
                  </h1>
                  <p style="margin: 0; color: #B8E6FF; font-size: 16px;">
                    ${eventTypeLabel}
                  </p>
                </td>
              </tr>
              
              ${event.imageUrl ? `
              <!-- Event Image -->
              <tr>
                <td style="padding: 0;">
                  <img src="${event.imageUrl}" alt="${event.title}" style="width: 100%; height: auto; display: block; border-radius: 0;" />
                </td>
              </tr>
              ` : ''}
              
              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #0B3D5D; font-size: 24px; font-weight: 600;">
                    ${event.title}
                  </h2>
                  
                  <!-- Event Details Card -->
                  <div style="margin: 0 0 25px 0; padding: 25px; background-color: #f0f9ff; border-left: 4px solid #019ADE; border-radius: 4px;">
                    <p style="margin: 0 0 15px 0; color: #0B3D5D; font-size: 18px; font-weight: 600;">
                      📅 ${formatDate(startDate)}
                    </p>
                    
                    <p style="margin: 0 0 15px 0; color: #0B3D5D; font-size: 16px; line-height: 1.6;">
                      🕐 ${formatTime(startDate)} - ${formatTime(endDate)}${event.timezone ? ` (${event.timezone})` : ''}
                    </p>
                    
                    ${locationInfo}
                  </div>
                  
                  <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    ${event.description}
                  </p>
                  
                  ${capacityInfo}
                  
                  <!-- Action Button -->
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td style="border-radius: 6px; background-color: #FF595A;">
                        <a href="${event.publicSlug ? getBaseUrl() + '/events/' + event.publicSlug : getBaseUrl() + '/events/' + event.id}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 600; border-radius: 6px;">
                          Register Now
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    Don't miss this opportunity to connect with fellow educators and advance your plastic reduction journey!
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

  try {
    // SendGrid supports batch sending with BCC for privacy
    const emailData: any = {
      to: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
      bcc: recipients,
      from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
      subject: `${eventTypeLabel}: ${event.title}`,
      html: html,
    };
    
    const response = await mailService.send(emailData);
    const messageId = response[0]?.headers?.['x-message-id'] || 'unknown';

    // Log the email send
    await storage.logEmail({
      recipientEmail: `${recipients.length} recipients`,
      subject: `${eventTypeLabel}: ${event.title}`,
      template: 'event_announcement',
      status: 'sent',
    });

    return { success: true, messageId };
  } catch (error: any) {
    console.error('SendGrid event announcement error:', error);
    
    // Log failed email
    await storage.logEmail({
      recipientEmail: `${recipients.length} recipients`,
      subject: `${eventTypeLabel}: ${event.title}`,
      template: 'event_announcement',
      status: 'failed',
    });

    return { success: false, error: error.message || 'Failed to send event announcement' };
  }
}

export async function sendEventDigestEmail(
  recipients: string[],
  events: Array<{
    id: string;
    title: string;
    description: string;
    eventType: string;
    startDateTime: Date | string;
    endDateTime: Date | string;
    timezone?: string;
    location?: string;
    isVirtual?: boolean;
    imageUrl?: string;
    publicSlug?: string;
  }>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!process.env.SENDGRID_API_KEY) {
    return { success: false, error: 'SendGrid not configured' };
  }

  if (recipients.length === 0) {
    return { success: false, error: 'No recipients provided' };
  }

  if (events.length === 0) {
    return { success: false, error: 'No events to include in digest' };
  }

  const eventTypeLabels: { [key: string]: string } = {
    workshop: '🎨 Workshop',
    webinar: '💻 Webinar',
    community_event: '🌍 Community Event',
    training: '📚 Training',
    celebration: '🎉 Celebration',
    other: '📅 Event'
  };

  const eventsHtml = events.map(event => {
    const startDate = new Date(event.startDateTime);
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
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

    const eventTypeLabel = eventTypeLabels[event.eventType] || '📅 Event';
    const locationIcon = event.isVirtual ? '💻 Virtual' : `📍 ${event.location || 'TBA'}`;
    
    return `
      <div style="margin: 0 0 25px 0; padding: 20px; background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 8px;">
        <div style="display: flex; align-items: start; gap: 15px;">
          ${event.imageUrl ? `
            <img src="${event.imageUrl}" alt="${event.title}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 6px;" />
          ` : ''}
          <div style="flex: 1;">
            <p style="margin: 0 0 5px 0; color: #019ADE; font-size: 12px; font-weight: 600; text-transform: uppercase;">
              ${eventTypeLabel}
            </p>
            <h3 style="margin: 0 0 10px 0; color: #0B3D5D; font-size: 18px; font-weight: 600;">
              ${event.title}
            </h3>
            <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.5;">
              <strong>📅 ${formatDate(startDate)} at ${formatTime(startDate)}</strong> | ${locationIcon}
            </p>
            <p style="margin: 0 0 15px 0; color: #333333; font-size: 14px; line-height: 1.5;">
              ${event.description.substring(0, 120)}${event.description.length > 120 ? '...' : ''}
            </p>
            <a href="${event.publicSlug ? getBaseUrl() + '/events/' + event.publicSlug : getBaseUrl() + '/events/' + event.id}" style="display: inline-block; padding: 10px 20px; background-color: #019ADE; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 6px;">
              Learn More & Register
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Upcoming Events - Plastic Clever Schools</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f5f5f5;">
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #0B3D5D 0%, #019ADE 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="margin: 0 0 10px 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                    Plastic Clever Schools
                  </h1>
                  <p style="margin: 0; color: #B8E6FF; font-size: 16px;">
                    📅 Upcoming Events Digest
                  </p>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px; background-color: #f8f9fa;">
                  <h2 style="margin: 0 0 10px 0; color: #0B3D5D; font-size: 24px; font-weight: 600; text-align: center;">
                    Upcoming Events & Opportunities
                  </h2>
                  
                  <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6; text-align: center;">
                    Join us for exciting upcoming events designed to help you and your school reduce plastic waste!
                  </p>
                  
                  ${eventsHtml}
                  
                  <!-- View All Button -->
                  <div style="margin: 30px 0 0 0; padding: 30px; background-color: #ffffff; border-radius: 8px; text-align: center;">
                    <p style="margin: 0 0 20px 0; color: #0B3D5D; font-size: 18px; font-weight: 600;">
                      Want to see all our events?
                    </p>
                    <a href="${getBaseUrl()}/events" style="display: inline-block; padding: 16px 40px; background-color: #FF595A; color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 600; border-radius: 6px;">
                      View All Events
                    </a>
                  </div>
                  
                  <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
                    Stay connected with the Plastic Clever Schools community and make a difference together! 🌱
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

  try {
    // SendGrid batch sending with BCC for privacy
    const emailData: any = {
      to: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
      bcc: recipients,
      from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
      subject: `📅 Upcoming Events from Plastic Clever Schools`,
      html: html,
    };
    
    const response = await mailService.send(emailData);
    const messageId = response[0]?.headers?.['x-message-id'] || 'unknown';

    // Log the email send
    await storage.logEmail({
      recipientEmail: `${recipients.length} recipients`,
      subject: `📅 Upcoming Events Digest - ${events.length} events`,
      template: 'event_digest',
      status: 'sent',
    });

    return { success: true, messageId };
  } catch (error: any) {
    console.error('SendGrid event digest error:', error);
    
    // Log failed email
    await storage.logEmail({
      recipientEmail: `${recipients.length} recipients`,
      subject: `📅 Upcoming Events Digest - ${events.length} events`,
      template: 'event_digest',
      status: 'failed',
    });

    return { success: false, error: error.message || 'Failed to send event digest' };
  }
}

export async function sendCourseCompletionCelebrationEmail(
  recipientEmail: string,
  schoolName: string,
  roundNumber: number,
  certificateUrl?: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Congratulations! - Plastic Clever Schools</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f5f5f5;">
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
              <!-- Celebration Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #019ADE 0%, #0B3D5D 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
                  <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
                  <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">
                    Congratulations!
                  </h1>
                  <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 18px; opacity: 0.9;">
                    ${schoolName}
                  </p>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #0B3D5D; font-size: 24px; font-weight: 600; text-align: center;">
                    ${roundNumber === 1 ? "You've Completed Your First Round!" : `You've Completed Round ${roundNumber}!`}
                  </h2>
                  
                  <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    What an incredible achievement! ${schoolName} has successfully completed all three stages of the Plastic Clever Schools program:
                  </p>
                  
                  <div style="margin: 30px 0; padding: 30px; background-color: #f8f9fa; border-radius: 8px;">
                    <div style="margin-bottom: 15px;">
                      <span style="color: #019ADE; font-size: 20px; font-weight: 600;">✓</span>
                      <span style="margin-left: 10px; color: #333333; font-size: 16px; font-weight: 600;">Inspire</span>
                      <span style="margin-left: 10px; color: #666666; font-size: 14px;">- Building awareness</span>
                    </div>
                    <div style="margin-bottom: 15px;">
                      <span style="color: #019ADE; font-size: 20px; font-weight: 600;">✓</span>
                      <span style="margin-left: 10px; color: #333333; font-size: 16px; font-weight: 600;">Investigate</span>
                      <span style="margin-left: 10px; color: #666666; font-size: 14px;">- Understanding the problem</span>
                    </div>
                    <div>
                      <span style="color: #019ADE; font-size: 20px; font-weight: 600;">✓</span>
                      <span style="margin-left: 10px; color: #333333; font-size: 16px; font-weight: 600;">Act</span>
                      <span style="margin-left: 10px; color: #666666; font-size: 14px;">- Making real change</span>
                    </div>
                  </div>
                  
                  <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    ${roundNumber === 1 
                      ? 'You are now officially a Plastic Clever School! Your commitment to reducing plastic waste is making a real difference in your school and community.' 
                      : `Completing Round ${roundNumber} shows your continued dedication to sustainability. Each round builds on your success and deepens your impact on reducing plastic waste.`}
                  </p>
                  
                  <div style="margin: 30px 0; padding: 20px; background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-left: 4px solid #f39c12; border-radius: 4px;">
                    <p style="margin: 0; color: #856404; font-size: 15px; line-height: 1.6; font-weight: 600;">
                      🏆 Your Round ${roundNumber} completion certificate ${certificateUrl ? 'is ready to view in' : 'will be available in'} your dashboard!
                    </p>
                  </div>
                  
                  ${certificateUrl ? `
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td style="border-radius: 6px; background-color: #019ADE;">
                        <a href="${certificateUrl}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                          View Certificate
                        </a>
                      </td>
                    </tr>
                  </table>
                  ` : ''}
                  
                  <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    Thank you for your dedication to creating a plastic-free future. Your leadership and action inspire students, staff, and communities around the world.
                  </p>
                  
                  <p style="margin: 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    Ready to take it even further? You can start the next round anytime from your dashboard to continue your plastic reduction journey!
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6; font-weight: 600;">
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
    subject: `🎉 Congratulations! ${schoolName} Completed Round ${roundNumber}!`,
    html: html,
  });
}

export async function sendContactFormEmail(
  fullName: string,
  email: string,
  subject: string,
  message: string
): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL || 'info@plasticcleverschools.org';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Contact Form Submission</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #0066cc 0%, #004d99 100%); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                    New Contact Form Submission
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    You have received a new message through the Plastic Clever Schools contact form:
                  </p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
                    <tr>
                      <td style="padding: 10px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef;">
                        <strong style="color: #0066cc;">Name:</strong>
                      </td>
                      <td style="padding: 10px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef;">
                        ${fullName}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; background-color: #ffffff; border-bottom: 1px solid #e9ecef;">
                        <strong style="color: #0066cc;">Email:</strong>
                      </td>
                      <td style="padding: 10px; background-color: #ffffff; border-bottom: 1px solid #e9ecef;">
                        <a href="mailto:${email}" style="color: #0066cc; text-decoration: none;">${email}</a>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef;">
                        <strong style="color: #0066cc;">Subject:</strong>
                      </td>
                      <td style="padding: 10px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef;">
                        ${subject}
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2" style="padding: 15px; background-color: #ffffff;">
                        <strong style="color: #0066cc; display: block; margin-bottom: 10px;">Message:</strong>
                        <div style="padding: 15px; background-color: #f8f9fa; border-radius: 4px; color: #333333; line-height: 1.6;">
                          ${message.replace(/\n/g, '<br>')}
                        </div>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 20px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    Reply directly to this email to respond to ${fullName}.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6; font-weight: 600;">
                    Plastic Clever Schools
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.6;">
                    Contact form notification
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
    to: adminEmail,
    from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
    replyTo: email,
    subject: `Contact Form: ${subject}`,
    html: html,
  });
}

