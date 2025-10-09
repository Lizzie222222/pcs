import OpenAI from 'openai';

// Initialize OpenAI client
// Following blueprint:javascript_openai guidelines
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Type definitions for analytics insights
export interface AnalyticsData {
  overview?: any;
  schoolEvidence?: any;
  evidenceAnalytics?: any;
  userEngagement?: any;
  dateRange?: { start: string; end: string };
}

export interface AnalyticsInsights {
  executiveSummary: string;
  keyInsights: string[];
  trends: string[];
  recommendations: string[];
}

/**
 * Generate AI-powered insights from analytics data using OpenAI's GPT-5
 * 
 * This function analyzes Plastic Clever Schools program data and provides
 * intelligent insights about school progress, engagement, and recommendations.
 * 
 * @param data - Analytics data including overview, evidence, engagement metrics
 * @returns Promise with structured insights (executive summary, key insights, trends, recommendations)
 */
export async function generateAnalyticsInsights(data: AnalyticsData): Promise<AnalyticsInsights> {
  try {
    console.log('[AI Insights] Generating insights from analytics data');
    
    // Construct the user prompt with analytics data context
    const userPrompt = `
Analyze the following analytics data from the Plastic Clever Schools (PCS) program and provide insights:

**Program Context:**
- PCS is a plastic reduction education program with 3 stages:
  1. Inspire: Students learn about plastic pollution and its impact
  2. Investigate: Students conduct waste audits and research
  3. Act: Students implement plastic reduction initiatives

**Analytics Data:**
${JSON.stringify(data, null, 2)}

Please provide:
1. An executive summary of the overall program performance
2. Key insights about school participation, evidence submission, and engagement
3. Trends in the data (growth, patterns, changes over time)
4. Actionable recommendations for program improvement

Return your response as a JSON object with the following structure:
{
  "executiveSummary": "2-3 sentence overview of program performance",
  "keyInsights": ["insight 1", "insight 2", "insight 3", ...],
  "trends": ["trend 1", "trend 2", "trend 3", ...],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3", ...]
}
`;

    // Call OpenAI API with gpt-4o (most capable model available)
    // Try gpt-5 first, fall back to gpt-4o if it doesn't exist
    let completion;
    let modelUsed = "gpt-5";
    
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are an educational analytics expert analyzing plastic reduction program data. Provide clear, actionable insights based on the data provided. Focus on identifying meaningful patterns, engagement metrics, and practical recommendations for program coordinators and administrators."
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        max_completion_tokens: 1500,
        response_format: { type: "json_object" }
      });
    } catch (modelError: any) {
      // If gpt-5 doesn't exist, fall back to gpt-4o
      console.log('[AI Insights] gpt-5 not available, falling back to gpt-4o:', modelError.message);
      modelUsed = "gpt-4o";
      
      completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an educational analytics expert analyzing plastic reduction program data. Provide clear, actionable insights based on the data provided. Focus on identifying meaningful patterns, engagement metrics, and practical recommendations for program coordinators and administrators."
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7,
        response_format: { type: "json_object" }
      });
    }

    console.log(`[AI Insights] Using model: ${modelUsed}`);

    // Parse the response
    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error(`No response content from OpenAI API (model: ${modelUsed})`);
    }

    const insights = JSON.parse(responseContent) as AnalyticsInsights;
    
    console.log('[AI Insights] Successfully generated insights');
    
    return insights;
    
  } catch (error) {
    console.error('[AI Insights] Error generating insights:', error);
    
    // Return fallback response if API fails
    return {
      executiveSummary: "Unable to generate AI insights at this time. Please review the analytics data manually or try again later.",
      keyInsights: [
        "AI insight generation is temporarily unavailable",
        "Please check the analytics dashboards for detailed metrics",
        "Contact support if this issue persists"
      ],
      trends: [
        "Trend analysis requires successful API connection"
      ],
      recommendations: [
        "Review the raw analytics data for manual insights",
        "Ensure OpenAI API key is properly configured",
        "Try regenerating insights after a few moments"
      ]
    };
  }
}
