import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface EmailContent {
  subject: string;
  preheader?: string;
  title: string;
  preTitle?: string;
  messageContent: string;
}

const LANGUAGE_MAP: Record<string, string> = {
  'en': 'English',
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

export async function translateEmailContent(
  content: EmailContent,
  targetLanguage: string
): Promise<EmailContent> {
  try {
    const languageName = LANGUAGE_MAP[targetLanguage] || targetLanguage;
    
    const prompt = `You are a professional translator. Translate the following email content to ${languageName}. 
Preserve all HTML tags exactly as they are. Only translate the text content, not the HTML structure.
Return the translation in the same JSON format.

Content to translate:
${JSON.stringify(content, null, 2)}

Return ONLY the translated JSON object with the same structure.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Always return valid JSON with the exact same structure as the input.'
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
    
    return {
      subject: translatedContent.subject || content.subject,
      preheader: translatedContent.preheader || content.preheader,
      title: translatedContent.title || content.title,
      preTitle: translatedContent.preTitle || content.preTitle,
      messageContent: translatedContent.messageContent || content.messageContent,
    };
  } catch (error) {
    console.error('Translation error:', error);
    // Return original content if translation fails
    return content;
  }
}

export interface EventContent {
  title: string;
  description: string;
}

export async function translateEventContent(
  content: EventContent,
  targetLanguage: string
): Promise<EventContent> {
  try {
    const languageName = LANGUAGE_MAP[targetLanguage] || targetLanguage;
    
    const prompt = `You are a professional translator. Translate the following event content to ${languageName}. 
Preserve all HTML tags exactly as they are. Only translate the text content, not the HTML structure.
Return the translation in the same JSON format.

Content to translate:
${JSON.stringify(content, null, 2)}

Return ONLY the translated JSON object with the same structure (title and description fields).`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Always return valid JSON with the exact same structure as the input.'
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
    
    return {
      title: translatedContent.title || content.title,
      description: translatedContent.description || content.description,
    };
  } catch (error) {
    console.error('Event translation error:', error);
    // Return original content if translation fails
    return content;
  }
}
