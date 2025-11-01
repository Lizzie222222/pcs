import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const LANGUAGES = {
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'nl': 'Dutch',
  'ru': 'Russian',
  'zh': 'Chinese (Simplified)',
  'ko': 'Korean',
  'ar': 'Arabic',
  'id': 'Indonesian',
  'el': 'Greek',
  'cy': 'Welsh'
};

const englishResetPassword = {
  "page_title": "Create New Password",
  "page_description": "Please enter your new password below.",
  "card_title": "Reset Your Password",
  "new_password_label": "New Password",
  "new_password_placeholder": "Enter new password",
  "confirm_password_label": "Confirm Password",
  "confirm_password_placeholder": "Confirm new password",
  "requirements_title": "Password requirements:",
  "requirement_1": "At least 8 characters long",
  "requirement_2": "Contains uppercase letter (A-Z)",
  "requirement_3": "Contains lowercase letter (a-z)",
  "requirement_4": "Contains number (0-9)",
  "submit_button": "Reset Password",
  "submit_button_loading": "Resetting Password...",
  "success_title": "Password Reset Successful!",
  "success_description": "Your password has been reset successfully. You can now log in with your new password.",
  "success_redirect_message": "You will be redirected to the login page in a moment...",
  "success_login_button": "Log In Now",
  "invalidToken_title": "Invalid Reset Link",
  "invalidToken_description": "This password reset link is invalid or has expired.",
  "invalidToken_reasons_title": "Common reasons:",
  "invalidToken_reason_1": "The link has expired (links are valid for 1 hour)",
  "invalidToken_reason_2": "The link has already been used",
  "invalidToken_reason_3": "The link was copied incorrectly",
  "invalidToken_request_new_button": "Request New Reset Link",
  "invalidToken_back_to_login_button": "Back to Login",
  "validation_password_min_length": "Password must be at least 8 characters long",
  "validation_password_uppercase": "Password must contain at least one uppercase letter",
  "validation_password_lowercase": "Password must contain at least one lowercase letter",
  "validation_password_number": "Password must contain at least one number",
  "validation_passwords_match": "Passwords don't match",
  "error_title": "Error",
  "error_invalid_token": "Invalid reset token. Please request a new password reset.",
  "error_reset_failed": "Failed to reset password. Please try again.",
  "error_generic": "An error occurred. Please try again later."
};

async function translateResetPassword(targetLanguage, languageName) {
  try {
    console.log(`Translating to ${languageName}...`);
    
    const prompt = `You are a professional translator specializing in web application interfaces. 
Translate the following password reset page content from English to ${languageName}.
This is for a school environmental education platform called "Plastic Clever Schools".

Maintain a professional, clear, and user-friendly tone appropriate for educators.
Keep the meaning precise and contextually appropriate.

Content to translate:
${JSON.stringify(englishResetPassword, null, 2)}

Return ONLY a valid JSON object with the exact same keys, but with all values translated to ${languageName}.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Always return valid JSON with the exact same structure and keys as the input, only translate the values.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const translatedContent = JSON.parse(response.choices[0].message.content || '{}');
    console.log(`✓ Successfully translated to ${languageName}`);
    return translatedContent;
  } catch (error) {
    console.error(`Error translating to ${languageName}:`, error.message);
    return englishResetPassword; // Fallback to English
  }
}

async function updateAuthFile(langCode, translatedContent) {
  try {
    const authFilePath = path.join(__dirname, '..', 'client', 'src', 'locales', langCode, 'auth.json');
    
    // Read the existing auth.json
    const authContent = JSON.parse(fs.readFileSync(authFilePath, 'utf-8'));
    
    // Ensure migratedUser section exists
    if (!authContent.migratedUser) {
      authContent.migratedUser = {};
    }
    
    // Add resetPassword section
    authContent.migratedUser.resetPassword = translatedContent;
    
    // Write back to file
    fs.writeFileSync(authFilePath, JSON.stringify(authContent, null, 2) + '\n', 'utf-8');
    console.log(`✓ Updated ${langCode}/auth.json`);
  } catch (error) {
    console.error(`Error updating ${langCode}/auth.json:`, error.message);
  }
}

async function main() {
  console.log('Starting translation of resetPassword keys to 13 languages...\n');
  
  for (const [langCode, languageName] of Object.entries(LANGUAGES)) {
    const translatedContent = await translateResetPassword(langCode, languageName);
    await updateAuthFile(langCode, translatedContent);
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✓ All translations completed successfully!');
}

main().catch(console.error);
