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
