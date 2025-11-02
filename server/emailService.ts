import { MailService } from '@sendgrid/mail';
import { storage } from './storage';
import { translateEmailContent, type EmailContent } from './translationService';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable not set");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

export function getBaseUrl(): string {
  let baseUrl: string;
  
  // Check if we're in production deployment
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1' || process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Production: Use REPLIT_DOMAINS or FRONTEND_URL
    if (process.env.REPLIT_DOMAINS) {
      // REPLIT_DOMAINS is comma-separated, use the first non-empty one
      const domains = process.env.REPLIT_DOMAINS.split(',').map(d => d.trim()).filter(d => d.length > 0);
      if (domains.length > 0) {
        baseUrl = `https://${domains[0]}`;
        console.log(`[Email Service] Production - Using REPLIT_DOMAINS: ${baseUrl}`);
      } else {
        console.warn(`[Email Service] Production - REPLIT_DOMAINS is empty, falling back...`);
        baseUrl = 'https://plasticcleverschools.org';
        console.log(`[Email Service] Production - Using fallback: ${baseUrl}`);
      }
    } else if (process.env.FRONTEND_URL) {
      const url = process.env.FRONTEND_URL;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        baseUrl = url;
      } else {
        baseUrl = `https://${url}`;
      }
      console.log(`[Email Service] Production - Using FRONTEND_URL: ${baseUrl}`);
    } else {
      baseUrl = 'https://plasticcleverschools.org';
      console.log(`[Email Service] Production - Using fallback: ${baseUrl}`);
    }
  } else {
    // Development: Use REPLIT_DEV_DOMAIN
    if (process.env.REPLIT_DEV_DOMAIN) {
      baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
      console.log(`[Email Service] Development - Using REPLIT_DEV_DOMAIN: ${baseUrl}`);
    } else if (process.env.FRONTEND_URL) {
      const url = process.env.FRONTEND_URL;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        baseUrl = url;
      } else {
        baseUrl = `https://${url}`;
      }
      console.log(`[Email Service] Development - Using FRONTEND_URL: ${baseUrl}`);
    } else {
      baseUrl = 'http://localhost:5000';
      console.warn(`[Email Service] Development - No domain set, using fallback: ${baseUrl}`);
    }
  }
  
  return baseUrl;
}

export function getFromAddress(): string {
  const defaultEmail = 'noreply@plasticcleverschools.org';
  const displayName = 'Plastic Clever Schools';
  
  if (process.env.FROM_EMAIL) {
    const emailMatch = process.env.FROM_EMAIL.match(/<(.+?)>|^(.+)$/);
    const emailAddress = emailMatch ? (emailMatch[1] || emailMatch[2]).trim() : defaultEmail;
    return `${displayName} <${emailAddress}>`;
  }
  
  return `${displayName} <${defaultEmail}>`;
}

/**
 * Generate beautiful HTML email template with gradient design and logo
 * Following the modern design pattern from admin invitation emails
 */
interface EmailTemplateParams {
  title: string;
  preTitle?: string;
  content: string;
  callToActionText?: string;
  callToActionUrl?: string;
  footerText?: string;
}

function generateEmailTemplate(params: EmailTemplateParams): string {
  const {
    title,
    preTitle,
    content,
    callToActionText,
    callToActionUrl,
    footerText
  } = params;
  
  const baseUrl = getBaseUrl();
  const logoUrl = `${baseUrl}/api/email-logo`;
  const currentYear = new Date().getFullYear();
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
      <title>${title}</title>
      <style>
        :root {
          color-scheme: light dark;
          supported-color-schemes: light dark;
        }
        @media (prefers-color-scheme: dark) {
          .email-header {
            background-color: #204969 !important;
          }
        }
        @media (prefers-color-scheme: light) {
          .email-header {
            background-color: #204969 !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f4f4f4;">
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1); overflow: hidden;">
              
              <!-- Header with Navy Background and Logo -->
              <tr>
                <td class="email-header" style="background-color: #204969 !important; padding: 40px 30px; text-align: center;">
                  <img src="${logoUrl}" alt="Plastic Clever Schools" style="height: 125px; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto;">
                  ${preTitle ? `<p style="margin: 0 0 10px 0; color: #ffffff; font-size: 16px; font-weight: 500;">${preTitle}</p>` : ''}
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    ${title}
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <div style="color: #333333; font-size: 16px; line-height: 1.6;">
                    ${content}
                  </div>
                </td>
              </tr>
              
              ${callToActionText && callToActionUrl ? `
              <!-- Call to Action -->
              <tr>
                <td style="padding: 0 30px 40px; text-align: center;">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                    <tr>
                      <td style="border-radius: 8px; background-color: #204969; box-shadow: 0 4px 15px rgba(32, 73, 105, 0.3);">
                        <a href="${callToActionUrl}" style="display: inline-block; padding: 15px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; border-radius: 8px;">
                          ${callToActionText}
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ` : ''}
              
              <!-- Footer -->
              <tr>
                <td style="background: #0B3D5D; color: white; padding: 30px; text-align: center;">
                  <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">🌊 Plastic Clever Schools 🌊</p>
                  <p style="margin: 0 0 10px 0; font-size: 13px; color: #B8E6FF;">Making waves for a plastic-free future</p>
                  ${footerText ? `<p style="margin: 0 0 10px 0; font-size: 12px; color: #B8E6FF;">${footerText}</p>` : ''}
                  <p style="margin: 0; font-size: 11px; color: #B8E6FF;">
                    © ${currentYear} Plastic Clever Schools. All rights reserved.
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
}

/**
 * Send an email with automatic translation support based on user's preferred language
 */
async function sendTranslatedEmail(params: {
  to: string;
  userLanguage?: string;
  englishContent: EmailContent;
  callToActionText?: string;
  callToActionUrl?: string;
  footerText?: string;
}): Promise<boolean> {
  const {
    to,
    userLanguage = 'en',
    englishContent,
    callToActionText,
    callToActionUrl,
    footerText
  } = params;
  
  // Translate content if not English
  let content = englishContent;
  if (userLanguage !== 'en') {
    content = await translateEmailContent(englishContent, userLanguage);
  }
  
  // Generate HTML using the template
  // Use translated button/footer text from content if available, otherwise use params
  const html = generateEmailTemplate({
    title: content.title,
    preTitle: content.preTitle,
    content: content.messageContent,
    callToActionText: content.callToActionText || callToActionText,
    callToActionUrl,
    footerText: content.footerText || footerText
  });
  
  return await sendEmail({
    to,
    from: getFromAddress(),
    subject: content.subject,
    html
  });
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
    console.log('\n========================================');
    console.log('📧 EMAIL (Development Mode - Not Actually Sent)');
    console.log('========================================');
    console.log('To:', params.to);
    console.log('Subject:', params.subject);
    
    // Extract and log password reset link if present
    if (params.html) {
      const resetLinkMatch = params.html.match(/\/reset-password\?token=([a-f0-9]+)/);
      if (resetLinkMatch) {
        const resetUrl = `${getBaseUrl()}${resetLinkMatch[0]}`;
        console.log('\n🔗 PASSWORD RESET LINK:');
        console.log(resetUrl);
        console.log('\n📋 Copy this link to reset your password');
      }
    }
    console.log('========================================\n');
    return true;
  }

  try {
    const emailData: any = {
      to: params.to,
      from: params.from || getFromAddress(),
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

export async function sendWelcomeEmail(
  userEmail: string, 
  schoolName: string,
  userLanguage?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  
  const englishContent: EmailContent = {
    subject: `Welcome to Plastic Clever Schools!`,
    title: `Welcome to Plastic Clever Schools!`,
    preTitle: `${schoolName}`,
    messageContent: `
      <p style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">
        Hello! 👋
      </p>
      
      <p style="margin: 0 0 20px 0;">
        Welcome to <strong>Plastic Clever Schools</strong>! We're thrilled to have <strong>${schoolName}</strong> join our global community of schools committed to reducing plastic waste and protecting our ocean.
      </p>
      
      <p style="margin: 0 0 20px 0;">
        Your journey to becoming plastic clever starts now! Here's what you can do:
      </p>
      
      <ul style="margin: 0 0 25px 0; padding-left: 25px; line-height: 1.8;">
        <li><strong>Track your progress</strong> - Upload evidence of your plastic reduction efforts</li>
        <li><strong>Earn recognition</strong> - Work towards plastic clever certification</li>
        <li><strong>Inspire others</strong> - Share your success with schools worldwide</li>
        <li><strong>Access resources</strong> - Download toolkits and educational materials</li>
      </ul>
      
      <!-- First Step: Inspire -->
      <div style="background: #f0f9ff; border-left: 4px solid #009ADE; padding: 20px; margin: 25px 0; border-radius: 8px;">
        <h2 style="color: #0B3D5D; margin: 0; font-size: 20px; font-weight: 700;">
          🌟 This is your first step: Inspire
        </h2>
      </div>
      
      <p style="margin: 0 0 20px 0;">
        Together, we're making waves for a plastic-free future! 🌊
      </p>
      
      <p style="margin: 0; color: #666;">
        Need help getting started? Contact us at <a href="mailto:education@commonseas.com" style="color: #02BBB4; text-decoration: none;">education@commonseas.com</a>
      </p>
    `,
    callToActionText: 'Go to Dashboard',
    footerText: 'You received this email because your school joined Plastic Clever Schools.'
  };
  
  return await sendTranslatedEmail({
    to: userEmail,
    userLanguage,
    englishContent,
    callToActionUrl: baseUrl,
  });
}

export async function sendMigratedUserWelcomeEmail(
  userEmail: string,
  tempPassword: string,
  schoolName: string,
  firstName?: string,
  userLanguage?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const loginUrl = `${baseUrl}/login`;
  
  const englishContent: EmailContent = {
    subject: `🎉 You're Invited to the NEW Plastic Clever Schools!`,
    title: `You're Invited${firstName ? `, ${firstName}` : ''}!`,
    preTitle: `Welcome to our brand NEW platform!`,
    messageContent: `
      <div style="text-align: center; margin-bottom: 30px;">
        <p style="font-size: 20px; color: #0B3D5D; font-weight: 600; margin: 0 0 15px 0;">
          ✨ Something Amazing is Waiting for You! ✨
        </p>
        <p style="margin: 0;">
          We're absolutely thrilled to welcome you to the <strong>all-new Plastic Clever Schools platform</strong>! 🌊 Your <strong>${schoolName}</strong> account has been upgraded to our exciting new system, packed with incredible features and improvements!
        </p>
      </div>
      
      <!-- What's New -->
      <div style="background: #f9fafb; padding: 25px; border-radius: 12px; margin: 25px 0; border: 3px solid #02BBB4;">
        <h2 style="color: #0B3D5D; margin: 0 0 15px 0; font-size: 20px; font-weight: 700; text-align: center;">
          🚀 What's New & Exciting?
        </h2>
        <ul style="line-height: 1.8; margin: 0; padding-left: 25px;">
          <li><strong>Modern, intuitive design</strong> - easier than ever to navigate!</li>
          <li><strong>Enhanced dashboard</strong> - see your impact at a glance</li>
          <li><strong>Powerful new tools</strong> - track your plastic-free journey</li>
          <li><strong>Faster performance</strong> - lightning-quick responses</li>
          <li><strong>Mobile-friendly</strong> - access anywhere, anytime!</li>
        </ul>
      </div>
      
      <!-- Login Details -->
      <div style="background: #eff6ff; border: 3px solid #3b82f6; padding: 25px; margin: 25px 0; border-radius: 12px;">
        <h2 style="color: #1e40af; margin: 0 0 20px 0; font-size: 20px; font-weight: 700; text-align: center;">
          🔑 Your Exclusive Access Details
        </h2>
        <div style="background: white; padding: 20px; border-radius: 8px;">
          <p style="margin: 0 0 10px 0; color: #666;"><strong>🏫 School:</strong> ${schoolName}</p>
          <p style="margin: 0 0 10px 0; color: #666;"><strong>📧 Email:</strong> ${userEmail}</p>
          <p style="margin: 0 0 10px 0; color: #666;"><strong>🔐 Temporary Password:</strong></p>
          <div style="background: #fef3c7; border: 2px solid #fbbf24; padding: 15px; border-radius: 8px; text-align: center;">
            <code style="font-size: 18px; font-weight: 700; color: #92400e; letter-spacing: 1px;">${tempPassword}</code>
          </div>
        </div>
      </div>
      
      <!-- Important Notice -->
      <div style="background: #fef3c7; border-left: 5px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <p style="margin: 0; color: #92400e;">
          <strong>⚠️ Important:</strong> This is a <strong>temporary password</strong> for your first login. You'll create your own secure password right after logging in - keeping your account safe and sound! 🛡️
        </p>
      </div>
      
      <!-- What We've Brought Over -->
      <div style="margin: 30px 0;">
        <h3 style="color: #0B3D5D; margin: 0 0 15px 0; font-size: 18px; font-weight: 700;">
          📦 Everything You Love, All Here!
        </h3>
        <p style="margin: 0 0 10px 0;">We've carefully migrated all your valuable data:</p>
        <ul style="line-height: 1.8; margin: 5px 0; padding-left: 25px;">
          <li>✅ Your school information and details</li>
          <li>✅ Your programme progress (Learn, Plan, Act stages)</li>
          <li>✅ Your team members and school associations</li>
          <li>✅ All your achievements and milestones</li>
        </ul>
      </div>
      
      <!-- Quick Start Guide -->
      <div style="background: #f9fafb; padding: 25px; border-radius: 12px; margin: 30px 0;">
        <h3 style="color: #0B3D5D; margin: 0 0 15px 0; font-size: 18px; font-weight: 700;">
          🎯 Your Quick Start Guide
        </h3>
        <ol style="line-height: 2; margin: 0; padding-left: 25px;">
          <li><strong>Click the button below</strong> to access your new dashboard</li>
          <li><strong>Use your temporary password</strong> to log in</li>
          <li><strong>Create your new password</strong> - make it memorable!</li>
          <li><strong>Update your profile</strong> - add a photo, confirm your details</li>
          <li><strong>Explore the new features</strong> - discover what's possible!</li>
          <li><strong>Start making an impact</strong> - continue your plastic-free journey! 🌍</li>
        </ol>
      </div>
      
      <div style="text-align: center; margin: 30px 0 20px;">
        <p style="color: #02BBB4; font-size: 16px; font-weight: 600; margin: 0;">
          We can't wait to see what you'll achieve! 🌟
        </p>
      </div>
      
      <p style="margin: 0; color: #666; text-align: center;">
        <strong>Need help getting started?</strong><br>
        Contact us at <a href="mailto:education@commonseas.com" style="color: #02BBB4; text-decoration: none;">education@commonseas.com</a>
      </p>
    `,
    callToActionText: 'Launch My New Dashboard',
    footerText: 'This email was sent because your account was upgraded to our new platform.'
  };
  
  return await sendTranslatedEmail({
    to: userEmail,
    userLanguage,
    englishContent,
    callToActionUrl: loginUrl,
  });
}

export async function sendMigratedUserStandardWelcomeEmail(
  userEmail: string,
  schoolName: string,
  firstName?: string,
  userLanguage?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const loginUrl = `${baseUrl}/login`;
  
  const englishContent: EmailContent = {
    subject: `🎉 Welcome to the NEW Plastic Clever Schools!`,
    title: `Welcome${firstName ? `, ${firstName}` : ''}!`,
    preTitle: `Your account is ready!`,
    messageContent: `
      <div style="text-align: center; margin-bottom: 30px;">
        <p style="font-size: 20px; color: #0B3D5D; font-weight: 600; margin: 0 0 15px 0;">
          ✨ You're All Set! ✨
        </p>
        <p style="margin: 0;">
          We're thrilled to confirm that your <strong>${schoolName}</strong> account has been successfully upgraded to the <strong>all-new Plastic Clever Schools platform</strong>! 🌊 Your password has been set and you're ready to go!
        </p>
      </div>
      
      <!-- What's New -->
      <div style="background: #f9fafb; padding: 25px; border-radius: 12px; margin: 25px 0; border: 3px solid #02BBB4;">
        <h2 style="color: #0B3D5D; margin: 0 0 15px 0; font-size: 20px; font-weight: 700; text-align: center;">
          🚀 What's New & Exciting?
        </h2>
        <ul style="line-height: 1.8; margin: 0; padding-left: 25px;">
          <li><strong>Modern, intuitive design</strong> - easier than ever to navigate!</li>
          <li><strong>Enhanced dashboard</strong> - see your impact at a glance</li>
          <li><strong>Powerful new tools</strong> - track your plastic-free journey</li>
          <li><strong>Faster performance</strong> - lightning-quick responses</li>
          <li><strong>Mobile-friendly</strong> - access anywhere, anytime!</li>
        </ul>
      </div>
      
      <!-- What We've Brought Over -->
      <div style="margin: 30px 0;">
        <h3 style="color: #0B3D5D; margin: 0 0 15px 0; font-size: 18px; font-weight: 700;">
          📦 Everything You Love, All Here!
        </h3>
        <p style="margin: 0 0 10px 0;">We've carefully migrated all your valuable data:</p>
        <ul style="line-height: 1.8; margin: 5px 0; padding-left: 25px;">
          <li>✅ Your school information and details</li>
          <li>✅ Your programme progress (Learn, Plan, Act stages)</li>
          <li>✅ Your team members and school associations</li>
          <li>✅ All your achievements and milestones</li>
        </ul>
      </div>
      
      <!-- Next Steps -->
      <div style="background: #f0f9ff; border-left: 5px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 18px; font-weight: 700;">
          🎯 Next Steps
        </h3>
        <p style="margin: 0; color: #1e40af;">
          Just log in with your email and the password you just set, then complete a quick profile setup to personalize your experience. You'll be exploring your new dashboard in no time!
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0 20px;">
        <p style="color: #02BBB4; font-size: 16px; font-weight: 600; margin: 0;">
          We can't wait to see what you'll achieve! 🌟
        </p>
      </div>
      
      <p style="margin: 0; color: #666; text-align: center;">
        <strong>Need help getting started?</strong><br>
        Contact us at <a href="mailto:education@commonseas.com" style="color: #02BBB4; text-decoration: none;">education@commonseas.com</a>
      </p>
    `,
    callToActionText: 'Access My Dashboard',
    footerText: 'This email was sent because your account was upgraded to our new platform.'
  };
  
  return await sendTranslatedEmail({
    to: userEmail,
    userLanguage,
    englishContent,
    callToActionUrl: loginUrl,
  });
}

export async function sendPasswordResetEmail(
  userEmail: string,
  resetToken: string,
  firstName?: string,
  userLanguage?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
  
  const englishContent: EmailContent = {
    subject: `🔐 Reset Your Password - Plastic Clever Schools`,
    title: `Reset Your Password${firstName ? `, ${firstName}` : ''}`,
    preTitle: `Password Reset Request`,
    messageContent: `
      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 0 0 25px 0; border-radius: 8px;">
        <p style="margin: 0; color: #1e40af; font-size: 18px; font-weight: 700;">
          🔑 We received a request to reset your password
        </p>
      </div>
      
      <p style="margin: 0 0 20px 0; font-size: 16px;">
        Click the button below to create a new password for your Plastic Clever Schools account. If you didn't request this, you can safely ignore this email.
      </p>
      
      <!-- Important Notice -->
      <div style="background: #fef3c7; border-left: 5px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <p style="margin: 0 0 10px 0; color: #92400e; font-weight: 700;">
          ⏰ This link expires in 1 hour
        </p>
        <p style="margin: 0; color: #92400e;">
          For your security, this password reset link will only work for 1 hour. After that, you'll need to request a new one.
        </p>
      </div>
      
      <p style="margin: 25px 0 10px 0; color: #666; text-align: center; font-size: 14px;">
        Or copy and paste this link into your browser:
      </p>
      
      <p style="margin: 0 0 25px 0; color: #3b82f6; font-size: 14px; word-break: break-all; text-align: center; background: #f0f9ff; padding: 15px; border-radius: 8px;">
        ${resetUrl}
      </p>
      
      <!-- Security Notice -->
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <p style="margin: 0 0 10px 0; color: #0B3D5D; font-weight: 700;">
          🛡️ Security Tip
        </p>
        <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
          Never share your password with anyone. Plastic Clever Schools staff will never ask for your password via email.
        </p>
      </div>
      
      <p style="margin: 20px 0 0 0; color: #666; text-align: center;">
        <strong>Didn't request a password reset?</strong><br>
        If you didn't request this, please ignore this email. Your password will remain unchanged.
      </p>
      
      <p style="margin: 20px 0 0 0; color: #666; text-align: center;">
        Need help? Contact us at <a href="mailto:education@commonseas.com" style="color: #02BBB4; text-decoration: none;">education@commonseas.com</a>
      </p>
    `,
    callToActionText: 'Reset My Password',
    footerText: 'You received this email because a password reset was requested for your account.'
  };
  
  return await sendTranslatedEmail({
    to: userEmail,
    userLanguage,
    englishContent,
    callToActionUrl: resetUrl,
  });
}


export async function sendEvidenceApprovalEmail(
  userEmail: string, 
  schoolName: string, 
  evidenceTitle: string,
  reviewerName?: string,
  userLanguage?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const approver = reviewerName || 'Platform Admin';
  
  const englishContent: EmailContent = {
    subject: `✅ Evidence Approved: ${evidenceTitle}`,
    title: `Evidence Approved!`,
    preTitle: `${schoolName}`,
    messageContent: `
      <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 0 0 25px 0; border-radius: 8px;">
        <p style="margin: 0; color: #166534; font-size: 18px; font-weight: 700;">
          🎉 Great news!
        </p>
      </div>
      
      <p style="margin: 0 0 20px 0; font-size: 16px;">
        Your evidence submission has been <strong style="color: #22c55e;">approved</strong>!
      </p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">Evidence:</p>
        <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: 700; color: #019ADE;">${evidenceTitle}</p>
        
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">Reviewed by:</p>
        <p style="margin: 0; font-size: 16px; color: #333;">✓ ${approver}</p>
      </div>
      
      <p style="margin: 0 0 20px 0;">
        This evidence has been added to your school's progress and will help you on your journey to becoming plastic clever! Keep up the fantastic work! 🌊
      </p>
      
      <p style="margin: 0; color: #666;">
        View your evidence and track your progress in your dashboard.
      </p>
    `,
    callToActionText: 'View Dashboard',
    footerText: 'You received this email because evidence was approved for your school.'
  };
  
  return await sendTranslatedEmail({
    to: userEmail,
    userLanguage,
    englishContent,
    callToActionUrl: baseUrl,
  });
}

export async function sendEvidenceRejectionEmail(
  userEmail: string, 
  schoolName: string, 
  evidenceTitle: string, 
  feedback: string,
  reviewerName?: string,
  userLanguage?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const approver = reviewerName || 'Platform Admin';
  
  const englishContent: EmailContent = {
    subject: `📋 Feedback on Evidence: ${evidenceTitle}`,
    title: `Evidence Needs Attention`,
    preTitle: `${schoolName}`,
    messageContent: `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 0 0 25px 0; border-radius: 8px;">
        <p style="margin: 0; color: #92400e; font-size: 18px; font-weight: 700;">
          📝 Feedback from Reviewer
        </p>
      </div>
      
      <p style="margin: 0 0 20px 0; font-size: 16px;">
        Your evidence submission needs some adjustments before it can be approved.
      </p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">Evidence:</p>
        <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: 700; color: #019ADE;">${evidenceTitle}</p>
        
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">Reviewed by:</p>
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">${approver}</p>
        
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">Feedback:</p>
        <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #333; white-space: pre-wrap;">${feedback}</p>
        </div>
      </div>
      
      <p style="margin: 0 0 20px 0;">
        Don't worry! You can update your evidence and resubmit it. We're here to help you succeed! 💪
      </p>
      
      <p style="margin: 0; color: #666;">
        Need help? Contact us at <a href="mailto:education@commonseas.com" style="color: #02BBB4; text-decoration: none;">education@commonseas.com</a>
      </p>
    `,
    callToActionText: 'Update Evidence',
    footerText: 'You received this email because evidence was reviewed for your school.'
  };
  
  return await sendTranslatedEmail({
    to: userEmail,
    userLanguage,
    englishContent,
    callToActionUrl: baseUrl,
  });
}

export async function sendTeacherInvitationEmail(
  recipientEmail: string,
  schoolName: string,
  inviterName: string,
  token: string,
  expiresInDays: number,
  userLanguage?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const acceptUrl = `${baseUrl}/invitations/${token}`;
  
  // Enhanced logging for debugging production issues
  console.log(`[Teacher Invitation Email] Sending to ${recipientEmail} for ${schoolName}`);
  console.log(`[Teacher Invitation Email] Full acceptUrl: ${acceptUrl}`);
  
  const englishContent: EmailContent = {
    subject: `🎉 You're invited to join ${schoolName} - Plastic Clever Schools!`,
    title: `You're Invited!`,
    preTitle: `Join ${schoolName} on Plastic Clever Schools`,
    messageContent: `
      <div style="background-color: #02BBB4; padding: 20px; margin: -40px -30px 30px -30px; text-align: center;">
        <p style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">
          🌟 Welcome to the Team! 🌟
        </p>
      </div>
      
      <p style="margin: 0 0 20px 0; color: #333333; font-size: 18px; line-height: 1.6; font-weight: 600;">
        Hello! 👋
      </p>
      
      <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.8;">
        <strong style="color: #02BBB4;">${inviterName}</strong> from <strong style="color: #019ADE;">${schoolName}</strong> has invited you to join their team on Plastic Clever Schools!
      </p>
      
      <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.8;">
        Join your colleagues in making your school plastic-free and inspire others around the world to do the same. Together, you'll track progress, share evidence, and celebrate achievements! 🌍
      </p>
      
      <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
        Or copy and paste this link:
      </p>
      
      <p style="margin: 0 0 30px 0; color: #02BBB4; font-size: 14px; line-height: 1.6; word-break: break-all; text-align: center; background: #f0fdf4; padding: 15px; border-radius: 8px;">
        ${acceptUrl}
      </p>
      
      <div style="margin: 30px 0; padding: 25px; background-color: #fff3cd; border-left: 5px solid #ffc107; border-radius: 8px; box-shadow: 0 2px 8px rgba(255, 193, 7, 0.2);">
        <p style="margin: 0 0 10px 0; color: #856404; font-size: 16px; line-height: 1.6; font-weight: 700;">
          ⏰ Time-Sensitive Invitation
        </p>
        <p style="margin: 0; color: #856404; font-size: 15px; line-height: 1.6;">
          This invitation expires in <strong>${expiresInDays} day${expiresInDays !== 1 ? 's' : ''}</strong>. Accept it soon to join your school team!
        </p>
      </div>
      
      <div style="margin: 30px 0; padding: 25px; background-color: #e3f2fd; border-radius: 8px;">
        <p style="margin: 0 0 15px 0; color: #0B3D5D; font-size: 18px; font-weight: 700;">
          🎯 What You'll Do:
        </p>
        <ul style="margin: 0; padding-left: 20px; color: #0B3D5D;">
          <li style="margin-bottom: 10px; font-size: 15px; line-height: 1.6;">Collaborate with your school team on reducing plastic waste</li>
          <li style="margin-bottom: 10px; font-size: 15px; line-height: 1.6;">Upload and share evidence of your school's progress</li>
          <li style="margin-bottom: 10px; font-size: 15px; line-height: 1.6;">Track achievements and earn Plastic Clever Awards</li>
          <li style="margin-bottom: 0; font-size: 15px; line-height: 1.6;">Inspire students and the global community</li>
        </ul>
      </div>
      
      <p style="margin: 30px 0 0 0; color: #333333; font-size: 16px; line-height: 1.8; text-align: center;">
        We're excited to have you join <strong style="color: #02BBB4;">${schoolName}</strong> on this journey! 🌊
      </p>
    `,
    callToActionText: 'Join Your School',
    footerText: 'You received this invitation to join your school on Plastic Clever Schools.'
  };
  
  return await sendTranslatedEmail({
    to: recipientEmail,
    userLanguage,
    englishContent,
    callToActionUrl: acceptUrl,
  });
}

export async function sendAdminInvitationEmail(
  recipientEmail: string,
  inviterName: string,
  token: string,
  expiresInDays: number,
  userLanguage?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const acceptUrl = `${baseUrl}/admin-invitations/${token}`;
  
  // Log with redacted token for security (show only first 8 chars)
  console.log(`[Admin Invitation Email] Sending to ${recipientEmail} with token ${token.substring(0, 8)}... to URL: ${baseUrl}/admin-invitations/[REDACTED]`);
  
  const englishContent: EmailContent = {
    subject: "🎉 You're Invited to Lead Plastic Clever Schools!",
    title: "🎉 You're Invited to Lead! 🎉",
    preTitle: "Join our team as an Administrator",
    messageContent: `
      <div style="text-align: center; margin-bottom: 30px;">
        <p style="font-size: 20px; color: #0B3D5D; font-weight: 600; margin: 0 0 15px 0; line-height: 1.4;">
          ✨ An Exciting Opportunity Awaits! ✨
        </p>
        <p style="font-size: 16px; color: #333333; margin: 0; line-height: 1.6;">
          <strong>${inviterName}</strong> has chosen <em>you</em> to join the Plastic Clever Schools team as an <strong>Administrator</strong>! 🌊 Together, we're creating a global movement to eliminate plastic waste from schools worldwide!
        </p>
      </div>
      
      <div style="background: #ffffff; padding: 25px; border-radius: 12px; margin: 25px 0; border: 3px solid #02BBB4; box-shadow: 0 4px 12px rgba(2, 187, 180, 0.15);">
        <h2 style="color: #0B3D5D; margin: 0 0 15px 0; font-size: 22px; font-weight: 700; text-align: center;">
          🚀 Your Superpowers as Admin
        </h2>
        <ul style="color: #1f2937; line-height: 2; margin: 0; padding-left: 25px; font-size: 15px; font-weight: 500;">
          <li><strong style="color: #0B3D5D;">Inspire change</strong> - Oversee schools on their plastic-free journey</li>
          <li><strong style="color: #0B3D5D;">Review evidence</strong> - Celebrate progress and provide guidance</li>
          <li><strong style="color: #0B3D5D;">Manage the platform</strong> - Help shape our global movement</li>
          <li><strong style="color: #0B3D5D;">Make an impact</strong> - Support educators creating change</li>
          <li><strong style="color: #0B3D5D;">Build community</strong> - Connect schools worldwide!</li>
        </ul>
      </div>
      
      <p style="color: #6b7280; font-size: 13px; margin: 15px 0; text-align: center; font-style: italic;">
        Let's create change together!
      </p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 14px; text-align: center;">
          <strong>Or copy and paste this link:</strong>
        </p>
        <p style="margin: 0; color: #02BBB4; font-size: 13px; word-break: break-all; text-align: center;">
          ${acceptUrl}
        </p>
      </div>
      
      <div style="background-color: #fef3c7; border-left: 5px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.6;">
          <strong>⏰ Time-Sensitive:</strong> This special invitation will expire in <strong>${expiresInDays} day${expiresInDays !== 1 ? 's' : ''}</strong>. Don't miss this opportunity to join our mission! 🌟
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0 20px;">
        <p style="color: #02BBB4; font-size: 16px; font-weight: 600; margin: 0;">
          We're thrilled to have you on board! 🎊
        </p>
      </div>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
          <strong>Questions or unexpected invitation?</strong><br>
          Our friendly team is here for you! Reach out anytime at<br>
          <a href="mailto:education@commonseas.com" style="color: #02BBB4; font-weight: 600; text-decoration: none;">education@commonseas.com</a>
        </p>
      </div>
    `,
    callToActionText: 'Accept Your Invitation',
    footerText: 'You received this invitation to become an administrator on Plastic Clever Schools.'
  };
  
  return await sendTranslatedEmail({
    to: recipientEmail,
    userLanguage,
    englishContent,
    callToActionUrl: acceptUrl,
  });
}

export async function sendPartnerInvitationEmail(
  recipientEmail: string,
  inviterName: string,
  token: string,
  expiresInDays: number,
  userLanguage?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const acceptUrl = `${baseUrl}/admin-invitations/${token}`;
  
  // Log with redacted token for security (show only first 8 chars)
  console.log(`[Partner Invitation Email] Sending to ${recipientEmail} with token ${token.substring(0, 8)}... to URL: ${baseUrl}/admin-invitations/[REDACTED]`);
  
  const englishContent: EmailContent = {
    subject: "🤝 You're Invited to Partner with Plastic Clever Schools!",
    title: "You're Invited!",
    preTitle: "Join Plastic Clever Schools as a Partner",
    messageContent: `
      <div style="background-color: #02BBB4; padding: 20px; margin: -40px -30px 30px -30px; text-align: center;">
        <p style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">
          ✨ You're Making a Difference! ✨
        </p>
      </div>
      
      <p style="margin: 0 0 20px 0; color: #333333; font-size: 18px; line-height: 1.6; font-weight: 600;">
        Hello! 👋
      </p>
      
      <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.8;">
        <strong style="color: #019ADE;">${inviterName}</strong> has invited you to join <strong>Plastic Clever Schools</strong> as a <strong style="color: #02BBB4;">Partner</strong>! 
      </p>
      
      <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.8;">
        As a partner, you'll have special access to view schools, review evidence submissions, and help support our global mission of eliminating single-use plastics from schools worldwide. 🌍
      </p>
      
      <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
        Or copy and paste this link:
      </p>
      
      <p style="margin: 0 0 30px 0; color: #019ADE; font-size: 14px; line-height: 1.6; word-break: break-all; text-align: center; background: #f0f9ff; padding: 15px; border-radius: 8px;">
        ${acceptUrl}
      </p>
      
      <div style="margin: 30px 0; padding: 25px; background-color: #fff3cd; border-left: 5px solid #ffc107; border-radius: 8px; box-shadow: 0 2px 8px rgba(255, 193, 7, 0.2);">
        <p style="margin: 0 0 10px 0; color: #856404; font-size: 16px; line-height: 1.6; font-weight: 700;">
          ⏰ Time-Sensitive Invitation
        </p>
        <p style="margin: 0; color: #856404; font-size: 15px; line-height: 1.6;">
          This invitation expires in <strong>${expiresInDays} day${expiresInDays !== 1 ? 's' : ''}</strong>. Accept it soon to start making an impact!
        </p>
      </div>
      
      <div style="margin: 30px 0; padding: 25px; background: #ffffff; border: 3px solid #02BBB4; border-radius: 8px; box-shadow: 0 2px 8px rgba(2, 187, 180, 0.15);">
        <p style="margin: 0 0 15px 0; color: #0B3D5D; font-size: 18px; font-weight: 700;">
          🌟 What You Can Do as a Partner:
        </p>
        <ul style="margin: 0; padding-left: 20px; color: #1f2937;">
          <li style="margin-bottom: 10px; font-size: 15px; line-height: 1.6; font-weight: 500;">View and support schools on their plastic-free journey</li>
          <li style="margin-bottom: 10px; font-size: 15px; line-height: 1.6; font-weight: 500;">Review evidence submissions and progress</li>
          <li style="margin-bottom: 10px; font-size: 15px; line-height: 1.6; font-weight: 500;">Help shape the future of plastic-free education</li>
          <li style="margin-bottom: 0; font-size: 15px; line-height: 1.6; font-weight: 500;">Join a global community of changemakers</li>
        </ul>
      </div>
      
      <p style="margin: 30px 0 0 0; color: #333333; font-size: 16px; line-height: 1.8; text-align: center;">
        Thank you for joining our mission to create a <strong style="color: #02BBB4;">plastic-free future</strong>! 🌊
      </p>
    `,
    callToActionText: 'Accept Your Invitation',
    footerText: 'You received this invitation to become a partner with Plastic Clever Schools.'
  };
  
  return await sendTranslatedEmail({
    to: recipientEmail,
    userLanguage,
    englishContent,
    callToActionUrl: acceptUrl,
  });
}

export async function sendVerificationRequestEmail(
  headTeacherEmail: string,
  schoolName: string,
  requesterName: string,
  requesterEmail: string,
  evidence: string,
  userLanguage?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const reviewUrl = `${baseUrl}/dashboard/team-management?tab=requests`;
  
  const englishContent: EmailContent = {
    subject: `🔔 New Teacher Verification Request`,
    title: `New Teacher Verification Request`,
    preTitle: `${schoolName}`,
    messageContent: `
      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 0 0 25px 0; border-radius: 8px;">
        <p style="margin: 0; color: #1e40af; font-size: 18px; font-weight: 700;">
          📬 Action Required
        </p>
      </div>
      
      <p style="margin: 0 0 20px 0; font-size: 16px;">
        A teacher has requested verification to join <strong>${schoolName}</strong> on Plastic Clever Schools.
      </p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">Teacher Name:</p>
        <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: 700; color: #019ADE;">${requesterName}</p>
        
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">Email:</p>
        <p style="margin: 0 0 15px 0; color: #333;">${requesterEmail}</p>
        
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">Evidence Provided:</p>
        <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #333; white-space: pre-wrap;">${evidence}</p>
        </div>
      </div>
      
      <p style="margin: 0 0 20px 0;">
        Please review this request and approve or decline it from your Team Management dashboard.
      </p>
    `,
    callToActionText: 'Review Request',
    footerText: 'You received this email because you are a head teacher at this school.'
  };
  
  return await sendTranslatedEmail({
    to: headTeacherEmail,
    userLanguage,
    englishContent,
    callToActionUrl: reviewUrl,
  });
}

export async function sendVerificationApprovalEmail(
  requesterEmail: string,
  schoolName: string,
  reviewerName: string,
  reviewNotes?: string,
  userLanguage?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  
  const englishContent: EmailContent = {
    subject: `🎉 Welcome to ${schoolName}!`,
    title: `Verification Approved!`,
    preTitle: `${schoolName}`,
    messageContent: `
      <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 0 0 25px 0; border-radius: 8px;">
        <p style="margin: 0; color: #166534; font-size: 18px; font-weight: 700;">
          🎉 Congratulations!
        </p>
      </div>
      
      <p style="margin: 0 0 20px 0; font-size: 16px;">
        Your request to join <strong>${schoolName}</strong> has been <strong style="color: #22c55e;">approved</strong>!
      </p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">Approved by:</p>
        <p style="margin: 0 ${reviewNotes ? '20px' : ''}  0; font-size: 16px; color: #333;">✓ ${reviewerName}</p>
        
        ${reviewNotes ? `
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">Notes:</p>
        <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #333; white-space: pre-wrap;">${reviewNotes}</p>
        </div>
        ` : ''}
      </div>
      
      <p style="margin: 0 0 20px 0;">
        You can now access your school's dashboard and start contributing to your school's plastic clever journey! 🌊
      </p>
    `,
    callToActionText: 'Go to Dashboard',
    footerText: 'You received this email because your verification request was approved.'
  };
  
  return await sendTranslatedEmail({
    to: requesterEmail,
    userLanguage,
    englishContent,
    callToActionUrl: `${baseUrl}/dashboard`,
  });
}

export async function sendVerificationRejectionEmail(
  requesterEmail: string,
  schoolName: string,
  reviewerName: string,
  reviewNotes?: string,
  userLanguage?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  
  const englishContent: EmailContent = {
    subject: `Update on Your Request to Join ${schoolName}`,
    title: `Verification Request Update`,
    preTitle: `${schoolName}`,
    messageContent: `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 0 0 25px 0; border-radius: 8px;">
        <p style="margin: 0; color: #92400e; font-size: 18px; font-weight: 700;">
          📋 Request Status Update
        </p>
      </div>
      
      <p style="margin: 0 0 20px 0; font-size: 16px;">
        Your request to join <strong>${schoolName}</strong> could not be approved at this time.
      </p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">Reviewed by:</p>
        <p style="margin: 0 ${reviewNotes ? '20px' : ''} 0; font-size: 16px; color: #333;">${reviewerName}</p>
        
        ${reviewNotes ? `
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">Notes:</p>
        <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #333; white-space: pre-wrap;">${reviewNotes}</p>
        </div>
        ` : ''}
      </div>
      
      <p style="margin: 0 0 20px 0;">
        If you believe this is an error or have questions, please contact the school directly or reach out to our support team.
      </p>
      
      <p style="margin: 0; color: #666;">
        Need help? Contact us at <a href="mailto:education@commonseas.com" style="color: #02BBB4; text-decoration: none;">education@commonseas.com</a>
      </p>
    `,
    footerText: 'You received this email because your verification request was reviewed.'
  };
  
  return await sendTranslatedEmail({
    to: requesterEmail,
    userLanguage,
    englishContent,
  });
}

// New evidence submission notification functions
export async function sendEvidenceSubmissionEmail(
  userEmail: string, 
  schoolName: string, 
  evidenceTitle: string,
  stage: string,
  userLanguage?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  
  const englishContent: EmailContent = {
    subject: `✅ Evidence Submitted: ${evidenceTitle}`,
    title: `Evidence Submitted Successfully!`,
    preTitle: `${schoolName}`,
    messageContent: `
      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 0 0 25px 0; border-radius: 8px;">
        <p style="margin: 0; color: #1e40af; font-size: 18px; font-weight: 700;">
          📤 Submission Confirmed
        </p>
      </div>
      
      <p style="margin: 0 0 20px 0; font-size: 16px;">
        Your evidence has been successfully submitted and is now awaiting review!
      </p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">Evidence:</p>
        <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: 700; color: #019ADE;">${evidenceTitle}</p>
        
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">Stage:</p>
        <p style="margin: 0; color: #333;">${stage}</p>
      </div>
      
      <p style="margin: 0 0 20px 0;">
        Our team will review your submission and get back to you soon. You'll receive an email notification once your evidence has been reviewed. 📬
      </p>
      
      <p style="margin: 0; color: #666;">
        Keep up the great work making your school plastic clever! 🌊
      </p>
    `,
    callToActionText: 'View Dashboard',
    footerText: 'You received this email because you submitted evidence for your school.'
  };
  
  return await sendTranslatedEmail({
    to: userEmail,
    userLanguage,
    englishContent,
    callToActionUrl: baseUrl,
  });
}

export async function sendAdminNewEvidenceEmail(
  adminEmail: string,
  schoolName: string,
  evidenceTitle: string,
  stage: string,
  submitterName: string,
  userLanguage?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const adminUrl = `${baseUrl}/admin`;
  
  const englishContent: EmailContent = {
    subject: `🔔 New Evidence Submission: ${evidenceTitle}`,
    title: `New Evidence Awaiting Review`,
    preTitle: `Platform Administration`,
    messageContent: `
      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 0 0 25px 0; border-radius: 8px;">
        <p style="margin: 0; color: #1e40af; font-size: 18px; font-weight: 700;">
          📬 Action Required
        </p>
      </div>
      
      <p style="margin: 0 0 20px 0; font-size: 16px;">
        A new evidence submission requires your review.
      </p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">School:</p>
        <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: 700; color: #019ADE;">${schoolName}</p>
        
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">Evidence:</p>
        <p style="margin: 0 0 15px 0; color: #333;">${evidenceTitle}</p>
        
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">Stage:</p>
        <p style="margin: 0 0 15px 0; color: #333;">${stage}</p>
        
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">Submitted by:</p>
        <p style="margin: 0; color: #333;">${submitterName}</p>
      </div>
      
      <p style="margin: 0;">
        Please review this submission from your admin dashboard.
      </p>
    `,
    callToActionText: 'Review Evidence',
    footerText: 'You received this email because you are a platform administrator.'
  };
  
  return await sendTranslatedEmail({
    to: adminEmail,
    userLanguage,
    englishContent,
    callToActionUrl: adminUrl,
  });
}

// Audit email functions
export async function sendAuditSubmissionEmail(
  userEmail: string,
  schoolName: string,
  userLanguage?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  
  const englishContent: EmailContent = {
    subject: `✅ Plastic Waste Audit Submitted`,
    title: `Audit Submitted Successfully!`,
    preTitle: `${schoolName}`,
    messageContent: `
      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 0 0 25px 0; border-radius: 8px;">
        <p style="margin: 0; color: #1e40af; font-size: 18px; font-weight: 700;">
          📊 Submission Confirmed
        </p>
      </div>
      
      <p style="margin: 0 0 20px 0; font-size: 16px;">
        Your plastic waste audit has been successfully submitted and is now awaiting review!
      </p>
      
      <p style="margin: 0 0 20px 0;">
        Thank you for taking the time to audit your school's plastic waste. This important data helps us understand and reduce plastic pollution in schools worldwide. 🌍
      </p>
      
      <p style="margin: 0 0 20px 0;">
        Our team will review your audit submission and get back to you soon. You'll receive an email notification once your audit has been reviewed. 📬
      </p>
      
      <p style="margin: 0; color: #666;">
        Keep up the fantastic work! 🌊
      </p>
    `,
    callToActionText: 'View Dashboard',
    footerText: 'You received this email because you submitted a plastic waste audit for your school.'
  };
  
  return await sendTranslatedEmail({
    to: userEmail,
    userLanguage,
    englishContent,
    callToActionUrl: baseUrl,
  });
}

export async function sendAdminNewAuditEmail(
  adminEmail: string,
  schoolName: string,
  submitterName: string,
  userLanguage?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const adminUrl = `${baseUrl}/admin`;
  
  const englishContent: EmailContent = {
    subject: `🔔 New Audit Submission: ${schoolName}`,
    title: `New Audit Awaiting Review`,
    preTitle: `Platform Administration`,
    messageContent: `
      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 0 0 25px 0; border-radius: 8px;">
        <p style="margin: 0; color: #1e40af; font-size: 18px; font-weight: 700;">
          📬 Action Required
        </p>
      </div>
      
      <p style="margin: 0 0 20px 0; font-size: 16px;">
        A new plastic waste audit submission requires your review.
      </p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">School:</p>
        <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: 700; color: #019ADE;">${schoolName}</p>
        
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">Submitted by:</p>
        <p style="margin: 0; color: #333;">${submitterName}</p>
      </div>
      
      <p style="margin: 0;">
        Please review this audit submission from your admin dashboard.
      </p>
    `,
    callToActionText: 'Review Audit',
    footerText: 'You received this email because you are a platform administrator.'
  };
  
  return await sendTranslatedEmail({
    to: adminEmail,
    userLanguage,
    englishContent,
    callToActionUrl: adminUrl,
  });
}

export async function sendAuditApprovalEmail(
  userEmail: string,
  schoolName: string,
  reviewerName?: string,
  userLanguage?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const approver = reviewerName || 'Platform Admin';
  
  const englishContent: EmailContent = {
    subject: `✅ Audit Approved`,
    title: `Audit Approved!`,
    preTitle: `${schoolName}`,
    messageContent: `
      <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 0 0 25px 0; border-radius: 8px;">
        <p style="margin: 0; color: #166534; font-size: 18px; font-weight: 700;">
          🎉 Great news!
        </p>
      </div>
      
      <p style="margin: 0 0 20px 0; font-size: 16px;">
        Your plastic waste audit has been <strong style="color: #22c55e;">approved</strong>!
      </p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">Reviewed by:</p>
        <p style="margin: 0; font-size: 16px; color: #333;">✓ ${approver}</p>
      </div>
      
      <p style="margin: 0 0 20px 0;">
        Your audit data has been added to your school's records and will contribute to our global understanding of plastic waste in schools. This is an important step in your plastic clever journey! 🌊
      </p>
      
      <p style="margin: 0; color: #666;">
        View your audit results and track your progress in your dashboard.
      </p>
    `,
    callToActionText: 'View Dashboard',
    footerText: 'You received this email because your audit was approved.'
  };
  
  return await sendTranslatedEmail({
    to: userEmail,
    userLanguage,
    englishContent,
    callToActionUrl: baseUrl,
  });
}

export async function sendAuditRejectionEmail(
  userEmail: string,
  schoolName: string,
  feedback: string,
  reviewerName?: string,
  userLanguage?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const approver = reviewerName || 'Platform Admin';
  
  const englishContent: EmailContent = {
    subject: `📋 Feedback on Audit`,
    title: `Audit Needs Attention`,
    preTitle: `${schoolName}`,
    messageContent: `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 0 0 25px 0; border-radius: 8px;">
        <p style="margin: 0; color: #92400e; font-size: 18px; font-weight: 700;">
          📝 Feedback from Reviewer
        </p>
      </div>
      
      <p style="margin: 0 0 20px 0; font-size: 16px;">
        Your plastic waste audit needs some adjustments before it can be approved.
      </p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">Reviewed by:</p>
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">${approver}</p>
        
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #0B3D5D;">Feedback:</p>
        <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #333; white-space: pre-wrap;">${feedback}</p>
        </div>
      </div>
      
      <p style="margin: 0 0 20px 0;">
        Don't worry! You can update your audit and resubmit it. We're here to help you succeed! 💪
      </p>
      
      <p style="margin: 0; color: #666;">
        Need help? Contact us at <a href="mailto:education@commonseas.com" style="color: #02BBB4; text-decoration: none;">education@commonseas.com</a>
      </p>
    `,
    callToActionText: 'Update Audit',
    footerText: 'You received this email because your audit was reviewed.'
  };
  
  return await sendTranslatedEmail({
    to: userEmail,
    userLanguage,
    englishContent,
    callToActionUrl: baseUrl,
  });
}

// Weekly admin digest email
export interface WeeklyDigestData {
  evidenceCount: number;
  evidenceSubmissions: Array<{
    schoolName: string;
    evidenceTitle: string;
    submitterName: string;
    submittedAt: Date;
  }>;
  newUsersCount: number;
  newUsers: Array<{
    email: string;
    schoolName: string;
    role: string;
    joinedAt: Date;
  }>;
  platformStats: {
    totalSchools: number;
    totalEvidence: number;
    totalUsers: number;
    activeSchools: number;
  };
  weekStart: Date;
  weekEnd: Date;
}

export async function sendWeeklyAdminDigest(
  adminEmail: string,
  digestData: WeeklyDigestData,
  userLanguage?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const evidenceList = digestData.evidenceSubmissions.length > 0
    ? digestData.evidenceSubmissions.map(e => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          <strong>${e.evidenceTitle}</strong><br>
          <span style="color: #666; font-size: 14px;">${e.schoolName} • ${e.submitterName}</span>
        </td>
      </tr>
    `).join('')
    : '<tr><td style="padding: 20px; text-align: center; color: #999;">No evidence submissions this week</td></tr>';
  
  const usersList = digestData.newUsers.length > 0
    ? digestData.newUsers.map(u => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          <strong>${u.email}</strong><br>
          <span style="color: #666; font-size: 14px;">${u.schoolName} • ${u.role}</span>
        </td>
      </tr>
    `).join('')
    : '<tr><td style="padding: 20px; text-align: center; color: #999;">No new users this week</td></tr>';
  
  const englishContent: EmailContent = {
    subject: `📊 Weekly Platform Digest: ${formatDate(digestData.weekStart)} - ${formatDate(digestData.weekEnd)}`,
    title: `Weekly Platform Digest`,
    preTitle: `${formatDate(digestData.weekStart)} - ${formatDate(digestData.weekEnd)}`,
    messageContent: `
      <p style="margin: 0 0 30px 0; font-size: 16px;">
        Here's your weekly summary of platform activity.
      </p>
      
      <!-- Quick Stats -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 0 0 30px 0;">
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e;">
          <p style="margin: 0; color: #166534; font-size: 14px; font-weight: 600;">Evidence Submissions</p>
          <p style="margin: 5px 0 0 0; color: #166534; font-size: 32px; font-weight: 700;">${digestData.evidenceCount}</p>
        </div>
        <div style="background: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 600;">New Users</p>
          <p style="margin: 5px 0 0 0; color: #1e40af; font-size: 32px; font-weight: 700;">${digestData.newUsersCount}</p>
        </div>
      </div>
      
      <!-- Evidence Submissions -->
      <div style="margin: 0 0 30px 0;">
        <h2 style="color: #0B3D5D; margin: 0 0 15px 0; font-size: 20px; font-weight: 700;">
          📤 Evidence Submissions This Week
        </h2>
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
          ${evidenceList}
        </table>
      </div>
      
      <!-- New Users -->
      <div style="margin: 0 0 30px 0;">
        <h2 style="color: #0B3D5D; margin: 0 0 15px 0; font-size: 20px; font-weight: 700;">
          👥 New Users This Week
        </h2>
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
          ${usersList}
        </table>
      </div>
      
      <!-- Platform Stats -->
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 0 0 20px 0;">
        <h2 style="color: #0B3D5D; margin: 0 0 15px 0; font-size: 20px; font-weight: 700;">
          📊 Platform Overview
        </h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <p style="margin: 0; color: #666; font-size: 14px;">Total Schools</p>
            <p style="margin: 5px 0 0 0; color: #0B3D5D; font-size: 24px; font-weight: 700;">${digestData.platformStats.totalSchools}</p>
          </div>
          <div>
            <p style="margin: 0; color: #666; font-size: 14px;">Active Schools</p>
            <p style="margin: 5px 0 0 0; color: #02BBB4; font-size: 24px; font-weight: 700;">${digestData.platformStats.activeSchools}</p>
          </div>
          <div>
            <p style="margin: 0; color: #666; font-size: 14px;">Total Evidence</p>
            <p style="margin: 5px 0 0 0; color: #0B3D5D; font-size: 24px; font-weight: 700;">${digestData.platformStats.totalEvidence}</p>
          </div>
          <div>
            <p style="margin: 0; color: #666; font-size: 14px;">Total Users</p>
            <p style="margin: 5px 0 0 0; color: #02BBB4; font-size: 24px; font-weight: 700;">${digestData.platformStats.totalUsers}</p>
          </div>
        </div>
      </div>
      
      <p style="margin: 0; color: #666; font-size: 14px;">
        This digest is sent weekly every Monday at 9:00 AM.
      </p>
    `,
    callToActionText: 'Go to Admin Dashboard',
    footerText: 'You received this email because you are a platform administrator.'
  };
  
  return await sendTranslatedEmail({
    to: adminEmail,
    userLanguage,
    englishContent,
    callToActionUrl: `${baseUrl}/admin`,
  });
}

// Bulk email functions for admin use - Now using custom HTML templates

export interface BulkEmailParams {
  recipients: string[];
  subject: string;
  preheader?: string;
  title: string;
  preTitle?: string;
  messageContent: string;
  callToActionText?: string;
  callToActionUrl?: string;
}

export async function sendBulkEmail(params: BulkEmailParams): Promise<{ sent: number; failed: number; details: Array<{email: string; success: boolean}> }> {
  const results = { sent: 0, failed: 0, details: [] as Array<{email: string; success: boolean}> };
  
  // Generate the HTML email using our template system
  const html = generateEmailTemplate({
    title: params.title,
    preTitle: params.preTitle,
    content: params.messageContent,
    callToActionText: params.callToActionText,
    callToActionUrl: params.callToActionUrl,
    footerText: 'You received this email from Plastic Clever Schools.'
  });
  
  for (const email of params.recipients) {
    try {
      const success = await sendEmail({
        to: email,
        from: getFromAddress(),
        subject: params.subject,
        html,
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
    from: getFromAddress(),
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
  },
  userLanguage?: string
): Promise<boolean> {
  const userName = user.firstName ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : 'there';
  const startDate = new Date(event.startDateTime);
  const eventsUrl = `${getBaseUrl()}/events`;
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const englishContent: EmailContent = {
    subject: `Registration Cancelled: ${event.title}`,
    title: `Registration Cancelled`,
    preTitle: '',
    messageContent: `
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
      
      <p style="margin: 0; color: #333333; font-size: 16px; line-height: 1.6;">
        Thank you for being part of our community!
      </p>
    `,
    callToActionText: 'Browse Upcoming Events',
    footerText: 'You received this email because your event registration was cancelled.'
  };
  
  return await sendTranslatedEmail({
    to,
    userLanguage,
    englishContent,
    callToActionUrl: eventsUrl,
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
  hoursUntil: number,
  userLanguage?: string
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

  const callToActionText = event.isVirtual && event.meetingLink ? 'Join Event Now' : 'View Event Details';
  const callToActionUrl = event.isVirtual && event.meetingLink 
    ? event.meetingLink 
    : event.publicSlug ? `${getBaseUrl()}/events/${event.publicSlug}` : `${getBaseUrl()}/events/${event.id}`;

  const englishContent: EmailContent = {
    subject: `Reminder: ${event.title} starts ${timeMessage}`,
    title: `Event Reminder: ${event.title}`,
    preTitle: '',
    messageContent: `
      <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
        Hi ${userName},
      </p>
      
      <p style="margin: 0 0 30px 0; color: #333333; font-size: 18px; line-height: 1.6; font-weight: 600;">
        ⏰ Your event starts ${timeMessage}!
      </p>
      
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
      
      <p style="margin: 0; color: #333333; font-size: 16px; line-height: 1.6;">
        We look forward to seeing you there!
      </p>
    `,
    callToActionText,
    footerText: 'You received this reminder because you registered for this event.'
  };
  
  return await sendTranslatedEmail({
    to,
    userLanguage,
    englishContent,
    callToActionUrl,
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
  changes: string[],
  userLanguage?: string
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

  const eventUrl = event.publicSlug ? `${getBaseUrl()}/events/${event.publicSlug}` : `${getBaseUrl()}/events/${event.id}`;

  const englishContent: EmailContent = {
    subject: `Event Updated: ${event.title}`,
    title: `Event Updated: ${event.title}`,
    preTitle: '',
    messageContent: `
      <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
        Hi ${userName},
      </p>
      
      <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
        The event <strong>${event.title}</strong> that you're registered for has been updated. Please review the changes below:
      </p>
      
      <div style="margin: 0 0 30px 0; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
        <h3 style="margin: 0 0 15px 0; color: #856404; font-size: 16px; font-weight: 600;">
          📝 What's Changed:
        </h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${changesHtml}
        </ul>
      </div>
      
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
      
      <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
        If these changes don't work for you, you can cancel your registration from your dashboard at any time.
      </p>
    `,
    callToActionText: 'View Event Details',
    footerText: 'You received this email because an event you registered for was updated.'
  };
  
  return await sendTranslatedEmail({
    to,
    userLanguage,
    englishContent,
    callToActionUrl: eventUrl,
  });
}

// SendGrid Event Announcement Functions
// NOTE: Batch emails (sendEventAnnouncementEmail, sendEventDigestEmail) are kept in English for now
// These use SendGrid BCC to send to multiple recipients at once
// Can be enhanced with per-user language support later if needed

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
                <td style="background-color: #204969; padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
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
      to: getFromAddress(),
      bcc: recipients,
      from: getFromAddress(),
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
                <td style="background-color: #204969; padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
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
      to: getFromAddress(),
      bcc: recipients,
      from: getFromAddress(),
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
  certificateUrl?: string,
  userLanguage?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  
  const englishContent: EmailContent = {
    subject: `🎉 Congratulations! ${schoolName} Completed Round ${roundNumber}!`,
    title: `🎉 Congratulations! 🎉`,
    preTitle: schoolName,
    messageContent: `
      <!-- Exciting intro -->
      <div style="text-align: center; margin-bottom: 30px;">
        <p style="font-size: 24px; color: #0B3D5D; font-weight: 700; margin: 0 0 15px 0; line-height: 1.4;">
          ${roundNumber === 1 ? "🌟 You've Completed Your First Round! 🌟" : `✨ You've Completed Round ${roundNumber}! ✨`}
        </p>
        <p style="font-size: 16px; color: #333333; margin: 0; line-height: 1.6;">
          What an <strong>incredible achievement</strong>! ${schoolName} has successfully completed all three stages of the Plastic Clever Schools programme! 🎊
        </p>
      </div>
                  
      <!-- Achievement Stages Box -->
      <div style="background: #ffffff; padding: 25px; border-radius: 12px; margin: 25px 0; border: 3px solid #02BBB4; box-shadow: 0 4px 12px rgba(2, 187, 180, 0.15);">
        <h2 style="color: #0B3D5D; margin: 0 0 20px 0; font-size: 22px; font-weight: 700; text-align: center;">
          🏆 Your Journey to Success
        </h2>
        <div style="margin-bottom: 18px;">
          <span style="color: #02BBB4; font-size: 24px; font-weight: 700;">✓</span>
          <span style="margin-left: 12px; color: #0B3D5D; font-size: 18px; font-weight: 700;">Inspire</span>
          <span style="margin-left: 12px; color: #4b5563; font-size: 15px; font-weight: 500;">Building awareness and motivation</span>
        </div>
        <div style="margin-bottom: 18px;">
          <span style="color: #02BBB4; font-size: 24px; font-weight: 700;">✓</span>
          <span style="margin-left: 12px; color: #0B3D5D; font-size: 18px; font-weight: 700;">Investigate</span>
          <span style="margin-left: 12px; color: #4b5563; font-size: 15px; font-weight: 500;">Understanding the plastic problem</span>
        </div>
        <div>
          <span style="color: #02BBB4; font-size: 24px; font-weight: 700;">✓</span>
          <span style="margin-left: 12px; color: #0B3D5D; font-size: 18px; font-weight: 700;">Act</span>
          <span style="margin-left: 12px; color: #4b5563; font-size: 15px; font-weight: 500;">Taking concrete action for change</span>
        </div>
      </div>
      
      <!-- Celebration Message -->
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #02BBB4;">
        <p style="margin: 0; color: #0B3D5D; font-size: 16px; line-height: 1.7; font-weight: 500;">
          ${roundNumber === 1 
            ? '🎯 You are now <strong>officially a Plastic Clever School</strong>! Your commitment to reducing plastic waste is making a real difference in your school and community. This is just the beginning of your journey toward a plastic-free future!' 
            : `🚀 Completing Round ${roundNumber} shows your <strong>continued dedication to sustainability</strong>. Each round builds on your success and deepens your impact on reducing plastic waste. Your leadership is inspiring schools worldwide!`}
        </p>
      </div>
      
      <!-- Certificate Announcement -->
      <div style="background-color: #fef3c7; border-left: 5px solid #f59e0b; padding: 25px; border-radius: 12px; margin: 30px 0;">
        <p style="color: #92400e; margin: 0 0 10px 0; font-size: 18px; line-height: 1.6; font-weight: 700;">
          🏆 Your Round ${roundNumber} Completion Certificate!
        </p>
        <p style="color: #92400e; margin: 0; font-size: 15px; line-height: 1.6; font-weight: 500;">
          ${certificateUrl ? 'Your official certificate is ready to view and download!' : 'Your certificate will be available in your dashboard soon!'}
        </p>
      </div>
      
      <!-- Next Steps -->
      <div style="background: #f9fafb; padding: 25px; border-radius: 12px; margin: 30px 0;">
        <p style="margin: 0 0 15px 0; color: #0B3D5D; font-size: 17px; line-height: 1.6; font-weight: 600;">
          💪 Ready to take it even further?
        </p>
        <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
          You can start the next round anytime from your dashboard to continue your plastic reduction journey and deepen your impact!
        </p>
      </div>
      
      <!-- Thank You -->
      <div style="text-align: center; margin: 30px 0 0 0;">
        <p style="color: #02BBB4; font-size: 16px; font-weight: 600; margin: 0;">
          Thank you for leading the way to a plastic-free future! 🌊
        </p>
      </div>
    `,
    callToActionText: certificateUrl ? 'View Your Certificate' : 'Go to Dashboard',
    footerText: 'You received this email because your school completed a programme round.'
  };
  
  return await sendTranslatedEmail({
    to: recipientEmail,
    userLanguage,
    englishContent,
    callToActionUrl: certificateUrl || baseUrl,
  });
}

// NOTE: sendContactFormEmail is an internal admin notification (sent TO admin, not FROM user)
// Kept in English as it's not user-facing
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
                <td style="background-color: #204969; padding: 30px; text-align: center;">
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
    from: getFromAddress(),
    replyTo: email,
    subject: `Contact Form: ${subject}`,
    html: html,
  });
}

