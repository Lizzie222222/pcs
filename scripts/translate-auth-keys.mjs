import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const languages = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'id', name: 'Indonesian' },
  { code: 'el', name: 'Greek' },
  { code: 'cy', name: 'Welsh' }
];

const keysToTranslate = {
  login: {
    success_title: "Welcome back!",
    success_description: "Successfully signed in as {{name}}",
    error_title: "Login failed",
    error_description_default: "Login failed. Please try again."
  },
  register: {
    success_title: "Account created successfully!",
    success_description: "Welcome to Plastic Clever Schools, {{name}}!",
    error_title: "Registration failed",
    error_description_default: "Registration failed. Please try again.",
    error_registration_failed: "Registration failed"
  },
  logout: {
    success_title: "Signed out",
    success_description: "You have been successfully signed out",
    error_title: "Logout failed",
    error_description: "There was an issue signing you out. Please try again.",
    error_logout_failed: "Logout failed"
  }
};

async function translateKeys(targetLanguage, languageName) {
  console.log(`\nTranslating to ${languageName} (${targetLanguage})...`);
  
  const prompt = `You are a professional translator for an education platform called "Plastic Clever Schools". 
Translate the following authentication messages from English to ${languageName}.

IMPORTANT INSTRUCTIONS:
1. Keep {{name}} placeholders EXACTLY as they are - do not translate them
2. Maintain the same level of formality and tone
3. Keep translations concise and natural for the target language
4. Return ONLY valid JSON with the exact same structure as provided
5. Do not add any explanations or additional text

Here is the JSON to translate:

${JSON.stringify(keysToTranslate, null, 2)}

Return the translated JSON:`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a professional translator. Return only valid JSON without any markdown formatting or explanations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
    });

    const responseText = completion.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    const cleanedResponse = responseText
      .replace(/^```json\n/, '')
      .replace(/^```\n/, '')
      .replace(/\n```$/, '');
    
    const translations = JSON.parse(cleanedResponse);
    console.log(`✓ Successfully translated to ${languageName}`);
    return translations;
  } catch (error) {
    console.error(`✗ Error translating to ${languageName}:`, error.message);
    throw error;
  }
}

async function updateLanguageFile(langCode, translations) {
  const filePath = path.join(__dirname, '..', 'client', 'src', 'locales', langCode, 'auth.json');
  
  try {
    // Read existing file
    const existingContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Merge translations
    const updatedContent = {
      ...existingContent,
      login: {
        ...existingContent.login,
        ...translations.login
      },
      register: {
        ...existingContent.register,
        ...translations.register
      },
      logout: {
        ...existingContent.logout,
        ...translations.logout
      }
    };
    
    // Write updated content
    fs.writeFileSync(filePath, JSON.stringify(updatedContent, null, 2) + '\n', 'utf8');
    console.log(`✓ Updated ${langCode}/auth.json`);
  } catch (error) {
    console.error(`✗ Error updating ${langCode}/auth.json:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('Starting translation of authentication keys...\n');
  console.log('Keys to translate:');
  console.log('- login: success_title, success_description, error_title, error_description_default');
  console.log('- register: success_title, success_description, error_title, error_description_default, error_registration_failed');
  console.log('- logout: success_title, success_description, error_title, error_description, error_logout_failed');
  console.log('\nTranslating to 13 languages...\n');
  
  for (const lang of languages) {
    try {
      const translations = await translateKeys(lang.code, lang.name);
      await updateLanguageFile(lang.code, translations);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to process ${lang.name}. Stopping.`);
      process.exit(1);
    }
  }
  
  console.log('\n✓ All translations completed successfully!');
  console.log('\nUpdated files:');
  languages.forEach(lang => {
    console.log(`  - client/src/locales/${lang.code}/auth.json`);
  });
}

main().catch(console.error);
