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
    await mailService.send({
      to: params.to,
      from: params.from || process.env.FROM_EMAIL || 'noreply@plasticclever.org',
      subject: params.subject,
      text: params.text,
      html: params.html,
      templateId: params.templateId,
      dynamicTemplateData: params.dynamicTemplateData,
    });

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
    subject: `Welcome to Plastic Clever Schools - ${schoolName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0B3D5D 0%, #019ADE 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🌱 Welcome to Plastic Clever Schools!</h1>
        </div>
        <div style="padding: 40px 20px; background: #f9f9f9;">
          <h2 style="color: #0B3D5D;">Congratulations on joining our global movement!</h2>
          <p style="color: #666; line-height: 1.6;">
            Thank you for registering <strong>${schoolName}</strong> with the Plastic Clever Schools program. 
            You're now part of a worldwide community of educators and students working together to tackle plastic pollution.
          </p>
          <p style="color: #666; line-height: 1.6;">
            Your school's journey will take you through three exciting stages:
          </p>
          <ul style="color: #666; line-height: 1.8;">
            <li><strong>Inspire:</strong> Build awareness about plastic pollution</li>
            <li><strong>Investigate:</strong> Conduct research and audits</li>
            <li><strong>Act:</strong> Implement solutions and create lasting change</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://plasticclever.org'}" 
               style="background: #FF595A; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Access Your Dashboard
            </a>
          </div>
          <p style="color: #666; line-height: 1.6;">
            If you have any questions, our support team is here to help. Simply reply to this email or visit our help center.
          </p>
        </div>
        <div style="background: #0B3D5D; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p>© 2024 Plastic Clever Schools. Making waves for a plastic-free future.</p>
        </div>
      </div>
    `,
  });
}

export async function sendEvidenceApprovalEmail(
  userEmail: string, 
  schoolName: string, 
  evidenceTitle: string
): Promise<boolean> {
  return await sendEmail({
    to: userEmail,
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
