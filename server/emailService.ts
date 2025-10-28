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

export async function sendWelcomeEmail(userEmail: string, schoolName: string): Promise<boolean> {
  return await sendEmail({
    to: userEmail,
    from: getFromAddress(),
    subject: `Welcome to Plastic Clever Schools - ${schoolName}`,
    templateId: 'd-67435cbdbfbf42d5b3b3167a7efa2e1c',
    dynamicTemplateData: {
      schoolName: schoolName,
      dashboardUrl: getBaseUrl(),
    },
  });
}

export async function sendMigratedUserWelcomeEmail(
  userEmail: string,
  tempPassword: string,
  schoolName: string,
  firstName?: string
): Promise<boolean> {
  const loginUrl = `${getBaseUrl()}/login`;
  const logoBase64 = `iVBORw0KGgoAAAANSUhEUgAACP4AAAddCAYAAAD6egTaAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAsVmSURBVHgB7P3dchv3nh/8/hqgHD9TyTJ9A3sBkrxOTeUGDK2jmdkHlnIDFlNe1FJctSXlAh5RuYBI2lXeGlGrQuoGRvLJzlSlKqJvIKJPY0mAb2AvOjWVeEwC/90NSLZl64XdaLx/Pi4AJEXQQKPx1v3F9xcBAAAAAAAAAAAsnCwAAACA2drtrscPsR6n+hsxyE+j+UGkwYeRNX7/4jdaEWk9UvFvUbybL07XT/S3U/RenOcwPzp88dP8Z/3vI+XfZ6kXjfzfUsoPa4dxKv+3zfZhAAAAAABzT/AHAAAApuFutzUK9jR/H9FvR8ry02yjVIhneorgT28UFOp/E9HsRnb8zTAYtNU+CAAAAABgLgj+AAAAQJ1eCfjERqTUmdNwzzgO8uvVi6yxPwwEra0daAkCAAAAgOkT/AEAAICqihFd/X4nBtEZNvhkWSeWK+BTxkG+meEgGrGfL49vNAMBAAAAwOQJ/gAAAMBJFW0+zX4novnJiyafVvAmvXwZHUSz8SiO4uu40u4FAAAAAFArwR8AAAB4k18GfSJdiNVt86nDQcTg68jSo/jTR/sBAAAAAIxN8AcAAABeKkZ3HcdGpP6FSI1PNfpMzGG+SeJRNPpfxednHwUAAAAAUIngDwAAAKutCPscFUGf7NPIsk5o9Zm2UQgoO36gCQgAAAAAyhH8AQAAYPUMwz7x2YvxXZ1gXvTyTRX70Y+bcaXdCwAAAADgrQR/AAAAWA3CPovmIBrZ7WjGV7HZPgwAAAAA4DcEfwAAAFheRdjnx+hElq6GsM+i6mkBAgAAAIDXE/wBAABg+dzvdiL1L0Q0Psu/Ww+WQ0qPojG4E3/6aD8AAAAAAMEfAAAAlsRyj/I6jJQfsjgcfl1I2cvv3yzFemRp/Rfft4an2YvTxdWLRrYdn7cfBAAAAACsMMEfAAAAFtuit/uk4Sirg2GIJw2+i0HKvy8Oa714P//ZZvswJqEISv1QLK/jVjSy9ciav8///x/my/HjYVioCAnNf0BIAAgAAACAlSb4AwAAwGIaBn7SjViMdp8ivNMbBnwiDiL1v4tB8yCutHsx777sbsRav5Vf9o0XoaD869iI+SIABAAAAMBKEvwBAABgcRQtNcdxNVK6FvPb7nMYKduPbPBd9NNBRHN/IQI+ZRWBoEY/PzQ6+daFj2M+wkACQAAAAACsFMEfAAAA5t98B34OItLXSx3yOYnh6LDjF0Gg7JOYaRNTth/92FzZ2wIAAACAlSH4AwAAwPy6221Fo78dWeOzmB/7Eemb6A8exftrB7HZPgxe7+63nWg2LuSbH4og0AwagbK96MdNASAAAAAAlpXgDwAAAPNnngI/KXqRpa8ipf14r7kv6FNRcZtGvwgCFbdpJ6bnMLLsdvypfTMAAAAAYMkI/gAAADA/5ifws5+/ZX4U/fhKW8wEzCYE1It+fzOufLQfAAAAALAkBH8AAACYvdkHfooWn4PoDx7E+81HWn2mqLjtm/FppHQt30rRiokz/gsAAACA5SH4AwAAwOzsdtfjOK5GStsxfcI+8+put51oNC/lWysmHQDrRSPbjs/bDwIAAAAAFpjgDwAAANP3c+DnWv7dekzX/nCM16l4IOwzp4YtQINrkbJPJ9oClGXb8af2zQAAAACABSX4AwAAwHTdfXopmo1bMd3Az2GkdCfea9wW9lkwxfrSaNyYYADoIPrZRaO/AAAAAFhEgj8AAABMx/1uJ1K6kX/Viekowj77MRjciSsf7QeLbbIBoF70s/PCPwAAAAAsGsEfAAAAJqsY6/Vj/3Zkjc9iOrT7LLPJBYAOo5Fdi8/bDwIAAAAAFoTgDwAAAJOz070akbZjOmO99qPfv6ndZ0Xce3Yt36xxtfYAUJZtx5/aNwMAAAAAFoDgDwAAAJPxl+5nMUi7MZ3Az0H0s/O1j8ViWgaNTgzS3ot1f5wnj/7gr1HeQWy1zwcAAAAAzDHBHwAAAOpXNK2k9DiymEzo5yia6WJsng5mZtQ+FJE6UTXo9lP4Z9Z6Uf7+l9JeLFXQDQAAAICVJ/gDAABAvYrGlUZ6HNUdxNbp87EZzMywfah4jHgY1VuXivWu1v+fKYVl/lLq99eisR0AAAAAMMcEfwAAAKjPaIzX46islz8WXHmxo56p6Ee/3xmeA5ZFI7s13Ip5UYR/rBMAAAAAzDHBHwAAAMa3212PHxuP49RwXNNGVNeLfudybAaz1Bq2/ET+VXGfXJz151/i8tn9YJ7dd/8DAAAAgDkn+AMAAMCYiv8YT3tiGFiJgxhEO66094N5U7SLpPQoqreezEfw51Jz+2hdjvmmdQgAAACAOSX4AwAAQHV/6X4Wg/Qwyhm1/kRKD+Pz0w+CeVQE3dKTqO4gTs1J8KcI/lQZ9/VSEV7S+gMAAADAHBL8AQAAoJrd7nr82HgcKW1EGcPWn35stt8P5lXR+vPk5SivkoqA3Tw9Blw+ux8v18d3OMyPU3YtAAAAAGDOCP4AAABQXklFiOHl2K6z+RjrJYN5Nmz9iepjvg6jP0fjvl669+xa/ngwrnR/N8/n/ufAFwAAAAAwJwR/AAAAOLnd7nr82Hgc5fSind2Ky2d7wSIoxnyldDuqOYyjbL6CPy+N2/pz+PuPAwAAAADmhOAPAAAAJ/OX7mfD/xhvRBlFe0pKNyPajv8spnHafx7HzbjSnn/FfdOoLz1u8a+/fSMAAAAAYE4I/gAAAPBu97vFP/S3y519tH3+fPBzw+APbbZWJ2u7ZwIAAAAA5ofgDwAAAG+3212PHxuPI422SpyzF/3+rdi6fT5YRMWYr5Si0hg4/35YePddCQAAAACYI4I/AAAAvNnw//hTPw7+T/9WlJHSw7jc3A4W2aBlKqrZahe/sAjuftsJAAAAAJgDgj8AAAD82v1uJ1K6EGWk/vX4/PS9YBkU7VH90gGf7vz8++u89P7aQVRvKfs+AAAAAGAOCP4AAADwi/vdG/Hj8D/Py/tppQfxp/bNYJkUY8TKu9TeXNiQVzE2rlnpn4vQ13cBAAAAAHNA8AcAAGDV7XbX48fG4ygnRWN4rONbQp/MPCvaf8o7taBjvl669+xalFasp5diEUJzAAAAAKw8wR8AAIBV95fG48jSVpSR+tfi8tn9YBkV7T/lNeJUtlihn8LL8NdJpehFv3/+xTkBAAAAgBkS/AEAAFhVxT/Ut6OcdvabQM/iqtrC05qv0WPTMGj0o6yUH93S+gMAAADAjAn+AAAArKK/dD+LH9PtKCcGn59uB8tsp3s1UrpQ6pxH6W4swsizSblydj9K69e2bgAAAADA7An+AAAArJrd7nqk/CuuF+38P/bbtGJUNL6Up/1n0WWN/6tU+Ku4qQAAAAAwSwu3IQYAAIDx1BKQ6V+Pz08/CFbBl91OZNl2qfMcvgheLKKj/yv/e1Ru3FevFQAAAAAwY4I/AAAAq6SuQE/xj/SXgjKshqL9aJwGqJ3udizysrxydj9K229FI7sWAAAAADBjRn0BAACsgvvd4h/pLwVlpO5ctKBw7+mFSGkjynj5c/Nc1nh5P8h/PwoAAAAAmDGNPwAAAMtuOErrx1J/6Zf616MIn8QgbQeLphiBthv1hMdSdBdqHNo0tLJWpP5+lJFiLQAAAABgDmj8AQAAWGZ/6X42Rv94yuNKexescuhn0O1EShdi0Qzv6zfv75fiKP+a+q/h7xTf/6l9M/jZYe0/BgAAAAAm6v8PAFjnSr4zrLSCAAAAAElFTkSuQmCC`;
  
  return await sendEmail({
    to: userEmail,
    from: getFromAddress(),
    subject: '🎉 You\'re Invited to the NEW Plastic Clever Schools!',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Plastic Clever Schools</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%);">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%);">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(2, 187, 180, 0.3); overflow: hidden;">
                
                <!-- Logo Section -->
                <tr>
                  <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #02BBB4 0%, #0284BC 100%);">
                    <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1); letter-spacing: -0.5px;">
                      Plastic Clever Schools
                    </h1>
                  </td>
                </tr>
                
                <!-- Exciting Header -->
                <tr>
                  <td style="padding: 30px 30px 20px; text-align: center; background: linear-gradient(135deg, #02BBB4 0%, #0284BC 100%);">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      🎉 You're Invited${firstName ? `, ${firstName}` : ''}! 🎉
                    </h1>
                    <p style="margin: 15px 0 0; color: #e0f7fa; font-size: 18px; font-weight: 500;">
                      Welcome to our brand NEW platform!
                    </p>
                  </td>
                </tr>
                
                <!-- Body Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    
                    <!-- Exciting intro -->
                    <div style="text-align: center; margin-bottom: 30px;">
                      <p style="font-size: 20px; color: #0B3D5D; font-weight: 600; margin: 0 0 15px 0; line-height: 1.4;">
                        ✨ Something Amazing is Waiting for You! ✨
                      </p>
                      <p style="font-size: 16px; color: #333333; margin: 0; line-height: 1.6;">
                        We're absolutely thrilled to welcome you to the <strong>all-new Plastic Clever Schools platform</strong>! 🌊 Your ${schoolName} account has been upgraded to our exciting new system, packed with incredible features and improvements!
                      </p>
                    </div>
                    
                    <!-- What's New Highlights -->
                    <div style="background: #ffffff; padding: 25px; border-radius: 12px; margin: 25px 0; border: 3px solid #02BBB4; box-shadow: 0 4px 12px rgba(2, 187, 180, 0.15);">
                      <h2 style="color: #0B3D5D; margin: 0 0 15px 0; font-size: 22px; font-weight: 700; text-align: center;">
                        🚀 What's New & Exciting?
                      </h2>
                      <ul style="color: #1f2937; line-height: 2; margin: 0; padding-left: 25px; font-size: 15px; font-weight: 500;">
                        <li><strong style="color: #0B3D5D;">Modern, intuitive design</strong> - easier than ever to navigate!</li>
                        <li><strong style="color: #0B3D5D;">Enhanced dashboard</strong> - see your impact at a glance</li>
                        <li><strong style="color: #0B3D5D;">Powerful new tools</strong> - track your plastic-free journey</li>
                        <li><strong style="color: #0B3D5D;">Faster performance</strong> - lightning-quick responses</li>
                        <li><strong style="color: #0B3D5D;">Mobile-friendly</strong> - access anywhere, anytime!</li>
                      </ul>
                    </div>
                    
                    <!-- Your Login Details -->
                    <div style="background: #ffffff; border: 3px solid #02BBB4; padding: 25px; margin: 25px 0; border-radius: 12px; box-shadow: 0 4px 12px rgba(2, 187, 180, 0.15);">
                      <h2 style="color: #02BBB4; margin: 0 0 20px 0; font-size: 20px; font-weight: 700; text-align: center;">
                        🔑 Your Exclusive Access Details
                      </h2>
                      <table style="width: 100%; border-spacing: 0;">
                        <tr>
                          <td style="padding: 8px 0; color: #4b5563; font-weight: 600;">🏫 School:</td>
                          <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${schoolName}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #4b5563; font-weight: 600;">📧 Email:</td>
                          <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${userEmail}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #4b5563; font-weight: 600; vertical-align: top;">🔐 Temp Password:</td>
                          <td style="padding: 8px 0;">
                            <code style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 8px 12px; border-radius: 6px; font-size: 15px; font-weight: 600; color: #92400e; display: inline-block; border: 2px solid #fbbf24;">${tempPassword}</code>
                          </td>
                        </tr>
                      </table>
                    </div>
                    
                    <!-- Important Notice -->
                    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 5px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 25px 0;">
                      <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.6;">
                        <strong>⚠️ Important:</strong> This is a <strong>temporary password</strong> for your first login. You'll create your own secure password right after logging in - keeping your account safe and sound! 🛡️
                      </p>
                    </div>
                    
                    <!-- What We've Brought Over -->
                    <div style="margin: 30px 0;">
                      <h3 style="color: #0B3D5D; margin: 0 0 15px 0; font-size: 18px; font-weight: 700;">
                        📦 Everything You Love, All Here!
                      </h3>
                      <p style="color: #4b5563; margin: 0 0 10px 0; font-size: 15px;">We've carefully migrated all your valuable data:</p>
                      <ul style="color: #4b5563; line-height: 1.8; margin: 5px 0; padding-left: 25px; font-size: 15px;">
                        <li>✅ Your school information and details</li>
                        <li>✅ Your program progress (Learn, Plan, Act stages)</li>
                        <li>✅ Your team members and school associations</li>
                        <li>✅ All your achievements and milestones</li>
                      </ul>
                    </div>
                    
                    <!-- Quick Start Guide -->
                    <div style="background: #f9fafb; padding: 25px; border-radius: 12px; margin: 30px 0; border: 2px solid #e5e7eb;">
                      <h3 style="color: #0B3D5D; margin: 0 0 15px 0; font-size: 18px; font-weight: 700;">
                        🎯 Your Quick Start Guide
                      </h3>
                      <ol style="color: #4b5563; line-height: 2; margin: 0; padding-left: 25px; font-size: 15px;">
                        <li><strong>Click the magic button below</strong> to access your new dashboard</li>
                        <li><strong>Use your temporary password</strong> to log in</li>
                        <li><strong>Create your new password</strong> - make it memorable!</li>
                        <li><strong>Update your profile</strong> - add a photo, confirm your details</li>
                        <li><strong>Explore the new features</strong> - discover what's possible!</li>
                        <li><strong>Start making an impact</strong> - continue your plastic-free journey! 🌍</li>
                      </ol>
                    </div>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 40px 0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                        <tr>
                          <td style="border-radius: 50px; background: linear-gradient(135deg, #02BBB4 0%, #0284BC 100%); box-shadow: 0 8px 20px rgba(2, 187, 180, 0.4);">
                            <a href="${loginUrl}" style="display: inline-block; padding: 18px 50px; color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 700; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px;">
                              🚀 Launch My New Dashboard!
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="color: #6b7280; font-size: 13px; margin: 15px 0 0 0; font-style: italic;">
                        Your plastic-free adventure awaits!
                      </p>
                    </div>
                    
                    <!-- Excitement Footer -->
                    <div style="text-align: center; margin: 30px 0 20px;">
                      <p style="color: #02BBB4; font-size: 16px; font-weight: 600; margin: 0;">
                        We can't wait to see what you'll achieve! 🌟
                      </p>
                    </div>
                    
                    <!-- Support -->
                    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
                      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                        <strong>Need help getting started?</strong><br>
                        Our friendly team is here for you! Reach out anytime at<br>
                        <a href="mailto:education@commonseas.com" style="color: #02BBB4; font-weight: 600; text-decoration: none;">education@commonseas.com</a>
                      </p>
                    </div>
                    
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px; background: linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%); text-align: center; border-top: 3px solid #02BBB4;">
                    <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 14px; font-weight: 600;">
                      🌊 Plastic Clever Schools 🌊
                    </p>
                    <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                      Together, we're creating a plastic-free future
                    </p>
                    <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 11px; line-height: 1.4;">
                      This email was sent because your account was upgraded to our new platform.<br>
                      © ${new Date().getFullYear()} Plastic Clever Schools. Making Education Plastic Clever.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}

export async function sendEvidenceApprovalEmail(
  userEmail: string, 
  schoolName: string, 
  evidenceTitle: string,
  reviewerName?: string
): Promise<boolean> {
  return await sendEmail({
    to: userEmail,
    from: getFromAddress(),
    subject: `Evidence Approved - ${evidenceTitle}`,
    templateId: 'd-3349376322ca47c79729d04b402372c6',
    dynamicTemplateData: {
      schoolName: schoolName,
      evidenceTitle: evidenceTitle,
      reviewerName: reviewerName || 'Platform Admin',
      dashboardUrl: getBaseUrl(),
    },
  });
}

export async function sendEvidenceRejectionEmail(
  userEmail: string, 
  schoolName: string, 
  evidenceTitle: string, 
  feedback: string,
  reviewerName?: string
): Promise<boolean> {
  return await sendEmail({
    to: userEmail,
    from: getFromAddress(),
    subject: `Evidence Feedback - ${evidenceTitle}`,
    templateId: 'd-df7b17c32ee04fc78db7dc888f6849da',
    dynamicTemplateData: {
      schoolName: schoolName,
      evidenceTitle: evidenceTitle,
      feedback: feedback,
      reviewerName: reviewerName || 'Platform Admin',
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
    from: getFromAddress(),
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
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%);">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%);">
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(2, 187, 180, 0.3); overflow: hidden;">
              
              <!-- Header Section -->
              <tr>
                <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #02BBB4 0%, #0284BC 100%);">
                  <h1 style="margin: 0 0 20px 0; color: #ffffff; font-size: 36px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1); letter-spacing: -0.5px;">
                    Plastic Clever Schools
                  </h1>
                  <h2 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    🎉 You're Invited to Lead! 🎉
                  </h2>
                  <p style="margin: 15px 0 0; color: #ffffff; font-size: 18px; font-weight: 500;">
                    Join our team as an Administrator
                  </p>
                </td>
              </tr>
              
              <!-- Body Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  
                  <!-- Exciting intro -->
                  <div style="text-align: center; margin-bottom: 30px;">
                    <p style="font-size: 20px; color: #0B3D5D; font-weight: 600; margin: 0 0 15px 0; line-height: 1.4;">
                      ✨ An Exciting Opportunity Awaits! ✨
                    </p>
                    <p style="font-size: 16px; color: #333333; margin: 0; line-height: 1.6;">
                      <strong>${inviterName}</strong> has chosen <em>you</em> to join the Plastic Clever Schools team as an <strong>Administrator</strong>! 🌊 Together, we're creating a global movement to eliminate plastic waste from schools worldwide!
                    </p>
                  </div>
                  
                  <!-- What You'll Do Highlights -->
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
                  
                  <!-- CTA Section -->
                  <div style="text-align: center; margin: 40px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td style="border-radius: 50px; background: linear-gradient(135deg, #02BBB4 0%, #0284BC 100%); box-shadow: 0 8px 20px rgba(2, 187, 180, 0.4);">
                          <a href="${acceptUrl}" style="display: inline-block; padding: 18px 50px; color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 700; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px;">
                            🎯 Accept Your Invitation!
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #6b7280; font-size: 13px; margin: 15px 0 0 0; font-style: italic;">
                      Let's create change together!
                    </p>
                  </div>
                  
                  <!-- Link fallback -->
                  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 14px; text-align: center;">
                      <strong>Or copy and paste this link:</strong>
                    </p>
                    <p style="margin: 0; color: #02BBB4; font-size: 13px; word-break: break-all; text-align: center;">
                      ${acceptUrl}
                    </p>
                  </div>
                  
                  <!-- Important Notice -->
                  <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 5px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.6;">
                      <strong>⏰ Time-Sensitive:</strong> This special invitation will expire in <strong>${expiresInDays} day${expiresInDays !== 1 ? 's' : ''}</strong>. Don't miss this opportunity to join our mission! 🌟
                    </p>
                  </div>
                  
                  <!-- Excitement Footer -->
                  <div style="text-align: center; margin: 30px 0 20px;">
                    <p style="color: #02BBB4; font-size: 16px; font-weight: 600; margin: 0;">
                      We're thrilled to have you on board! 🎊
                    </p>
                  </div>
                  
                  <!-- Support -->
                  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                      <strong>Questions or unexpected invitation?</strong><br>
                      Our friendly team is here for you! Reach out anytime at<br>
                      <a href="mailto:education@commonseas.com" style="color: #02BBB4; font-weight: 600; text-decoration: none;">education@commonseas.com</a>
                    </p>
                  </div>
                  
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background: linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%); text-align: center; border-top: 3px solid #02BBB4;">
                  <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 14px; font-weight: 600;">
                    🌊 Plastic Clever Schools 🌊
                  </p>
                  <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                    Together, we're creating a plastic-free future, one school at a time
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
    from: getFromAddress(),
    subject: "🎉 You're Invited to Lead Plastic Clever Schools!",
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
    from: getFromAddress(),
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
    from: getFromAddress(),
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
    from: getFromAddress(),
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
    from: getFromAddress(),
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
    from: getFromAddress(),
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
    from: getFromAddress(),
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
    from: getFromAddress(),
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
    from: getFromAddress(),
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
    from: getFromAddress(),
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
    from: getFromAddress(),
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
        from: getFromAddress(),
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
    from: getFromAddress(),
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
    from: getFromAddress(),
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
    from: getFromAddress(),
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
    from: getFromAddress(),
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
    from: getFromAddress(),
    replyTo: email,
    subject: `Contact Form: ${subject}`,
    html: html,
  });
}

