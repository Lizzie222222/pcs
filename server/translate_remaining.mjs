import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const REMAINING_LANGUAGES = {
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
  const languageName = REMAINING_LANGUAGES[targetLanguage];
  
  const prompt = `Translate the following authentication UI text to ${languageName}. 
This is for a user onboarding flow where WordPress users are being migrated to a new platform.
Preserve JSON structure and keys. Only translate text values.
Preserve placeholders like {{current}}, {{total}}, {{name}} exactly.

${JSON.stringify(content, null, 2)}

Return ONLY the translated JSON.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a translator. Return valid JSON with the same structure. Preserve {{placeholders}}.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}

async function main() {
  const localesDir = path.join(process.cwd(), 'client', 'src', 'locales');
  const enAuth = JSON.parse(fs.readFileSync(path.join(localesDir, 'en', 'auth.json'), 'utf8'));
  const migratedUserContent = enAuth.migratedUser;
  
  for (const [langCode, langName] of Object.entries(REMAINING_LANGUAGES)) {
    console.log(`Translating to ${langName} (${langCode})...`);
    
    const authPath = path.join(localesDir, langCode, 'auth.json');
    const authData = JSON.parse(fs.readFileSync(authPath, 'utf8'));
    
    const translated = await translateMigratedUserSection(migratedUserContent, langCode);
    authData.migratedUser = translated;
    
    fs.writeFileSync(authPath, JSON.stringify(authData, null, 2) + '\n', 'utf8');
    console.log(`✓ ${langName} completed\n`);
  }
  
  console.log('All remaining translations completed!');
}

main().catch(console.error);
