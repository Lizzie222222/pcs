import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const LANGUAGE_MAP = {
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'nl': 'Dutch',
  'ru': 'Russian',
  'zh': 'Chinese',
  'ko': 'Korean',
  'ar': 'Arabic',
  'id': 'Indonesian',
  'el': 'Greek',
  'cy': 'Welsh',
};

async function translateMigratedUserSection(content, targetLanguage) {
  try {
    const languageName = LANGUAGE_MAP[targetLanguage] || targetLanguage;
    
    const prompt = `You are a professional translator. Translate the following authentication UI text content to ${languageName}. 
This is for a user onboarding flow where WordPress users are being migrated to a new platform.
Preserve all JSON structure and keys exactly as they are. Only translate the text values, not the keys.
Preserve any placeholders like {{current}}, {{total}}, {{name}} exactly as they are.
Return the translation in the same JSON format.

Content to translate:
${JSON.stringify(content, null, 2)}

Return ONLY the translated JSON object with the same structure.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Always return valid JSON with the exact same structure as the input. Preserve all placeholders like {{variable}} exactly as they appear.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error(`Translation error for ${targetLanguage}:`, error);
    throw error;
  }
}

async function main() {
  const localesDir = path.join(process.cwd(), 'client', 'src', 'locales');
  
  // Read English source
  const enAuthPath = path.join(localesDir, 'en', 'auth.json');
  const enAuth = JSON.parse(fs.readFileSync(enAuthPath, 'utf8'));
  const migratedUserContent = enAuth.migratedUser;
  
  console.log('Starting translation of migratedUser section to 13 languages...\n');
  
  // Translate to each language
  for (const [langCode, langName] of Object.entries(LANGUAGE_MAP)) {
    console.log(`Translating to ${langName} (${langCode})...`);
    
    const authPath = path.join(localesDir, langCode, 'auth.json');
    
    // Read existing auth.json
    const authData = JSON.parse(fs.readFileSync(authPath, 'utf8'));
    
    // Translate the migratedUser section
    const translatedMigratedUser = await translateMigratedUserSection(migratedUserContent, langCode);
    
    // Add to auth.json
    authData.migratedUser = translatedMigratedUser;
    
    // Write back
    fs.writeFileSync(authPath, JSON.stringify(authData, null, 2) + '\n', 'utf8');
    
    console.log(`✓ ${langName} (${langCode}) completed\n`);
  }
  
  console.log('All translations completed successfully!');
}

main().catch(console.error);
