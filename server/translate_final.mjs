import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function translate(content, language, languageName) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a translator. Return valid JSON with the same structure. Preserve {{placeholders}}.' },
      { role: 'user', content: `Translate this auth UI text to ${languageName}. Preserve JSON keys and {{placeholders}}:\n${JSON.stringify(content, null, 2)}` }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });
  return JSON.parse(response.choices[0].message.content || '{}');
}

async function main() {
  const localesDir = 'client/src/locales';
  const enAuth = JSON.parse(fs.readFileSync(`${localesDir}/en/auth.json`, 'utf8'));
  const content = enAuth.migratedUser;
  
  // Greek
  console.log('Translating to Greek...');
  let authData = JSON.parse(fs.readFileSync(`${localesDir}/el/auth.json`, 'utf8'));
  authData.migratedUser = await translate(content, 'el', 'Greek');
  fs.writeFileSync(`${localesDir}/el/auth.json`, JSON.stringify(authData, null, 2) + '\n');
  console.log('✓ Greek completed');
  
  // Welsh
  console.log('Translating to Welsh...');
  authData = JSON.parse(fs.readFileSync(`${localesDir}/cy/auth.json`, 'utf8'));
  authData.migratedUser = await translate(content, 'cy', 'Welsh');
  fs.writeFileSync(`${localesDir}/cy/auth.json`, JSON.stringify(authData, null, 2) + '\n');
  console.log('✓ Welsh completed');
  
  console.log('\nAll 14 languages completed! 🎉');
}

main().catch(console.error);
