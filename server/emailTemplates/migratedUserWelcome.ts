export interface MigratedUserWelcomeData {
  firstName: string;
  schoolName: string;
  temporaryPassword: string;
  loginUrl: string;
}

export function getMigratedUserWelcomeTemplate(data: MigratedUserWelcomeData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to the New Plastic Clever Schools Platform</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #204969; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background-color: #204969; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .credentials { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .warning { background: #fff3cd; border-left: 4px solid #ff6b6b; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome Back, ${data.firstName}!</h1>
      <p>Your account has been migrated to our new platform</p>
    </div>
    
    <div class="content">
      <p>Hello ${data.firstName},</p>
      
      <p>Great news! We've successfully migrated your ${data.schoolName} account from our old WordPress system to the new and improved Plastic Clever Schools platform.</p>
      
      <h3>What's New?</h3>
      <ul>
        <li>Enhanced dashboard with better progress tracking</li>
        <li>Improved evidence submission process</li>
        <li>Better team management tools</li>
        <li>Faster performance and modern interface</li>
      </ul>
      
      <div class="credentials">
        <h3>Your Login Credentials</h3>
        <p><strong>Temporary Password:</strong> <code>${data.temporaryPassword}</code></p>
        <p><em>Please change this password after your first login for security.</em></p>
      </div>
      
      <div style="text-align: center;">
        <a href="${data.loginUrl}" class="button">Login to Your Account</a>
      </div>
      
      <div class="warning">
        <h3>⚠️ Important: Evidence Resubmission Required</h3>
        <p>Due to system changes during migration, any evidence you previously submitted needs to be resubmitted in the new platform. Don't worry – your progress has been preserved, you just need to re-upload your evidence files to continue.</p>
      </div>
      
      <h3>Need Help?</h3>
      <p>If you have any questions or encounter any issues:</p>
      <ul>
        <li>Visit our <a href="${data.loginUrl.replace('/login', '/help-center')}">Help Center</a></li>
        <li>Contact us through the support chat in the platform</li>
      </ul>
      
      <p>We're excited to have you on the new platform and look forward to supporting your plastic reduction journey!</p>
      
      <p>Best regards,<br>The Plastic Clever Schools Team</p>
    </div>
    
    <div class="footer">
      <p>This email was sent because your account was migrated to our new platform.</p>
      <p>&copy; ${new Date().getFullYear()} Plastic Clever Schools. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function getMigratedUserWelcomeSubject(): string {
  return 'Welcome to the New Plastic Clever Schools Platform – Action Required';
}
