import { executeWithKeyRotation } from './keyManager';

const FIREWORKS_PREFIX = 'VITE_FIREWORKS_KEY';
const MODEL_ID = "accounts/fireworks/models/llama-v3p3-70b-instruct"; 

export interface MeetingAnalysis {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  sentimentScore: number;
}

// 👇 NEW: Dynamic Prompt Generator based on Context Mode
const getSystemPrompt = (mode: string) => {
  let focus = "general insights";
  if (mode === 'Educational') focus = "definitions, exam concepts, and learning outcomes";
  if (mode === 'Legal') focus = "agreements, liabilities, dates, and compliance issues";
  if (mode === 'Creative') focus = "wild ideas, brainstorming suggestions, and inspiration";

  return `
    You are an expert Meeting Analyzer acting in '${mode}' mode.
    Analyze the transcript focusing specifically on ${focus}.
    
    Return VALID JSON ONLY. No Markdown. Structure:
    {
      "summary": "Executive summary based on the mode.",
      "keyPoints": ["Point 1", "Point 2"],
      "actionItems": ["Action 1", "Action 2"],
      "sentiment": "Positive" | "Neutral" | "Negative",
      "sentimentScore": 0 to 100
    }
  `;
};

const SYSTEM_PROMPT_TRANSLATION = `
You are a professional translator. 
Translate the text into English. Return ONLY the translation.
`;

const extractJson = (text: string): unknown => {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) return JSON.parse(text.substring(start, end + 1));
    return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) { return null; }
};

// ... (keep chunkText and translateToEnglish functions EXACTLY as they were) ...
// Copy-paste them from previous steps, I will omit them here to save space but keep them in your file!
const chunkText = (text: string, chunkSize: number = 6000): string[] => {
    const chunks: string[] = [];
    let currentChunk = "";
    const lines = text.split('\n');
    for (const line of lines) {
      if ((currentChunk.length + line.length) > chunkSize) {
        chunks.push(currentChunk);
        currentChunk = "";
      }
      currentChunk += line + "\n";
    }
    if (currentChunk.trim().length > 0) chunks.push(currentChunk);
    return chunks;
  };
  
  export const translateToEnglish = async (fullText: string, onProgress?: (msg: string) => void): Promise<string> => {
    const chunks = chunkText(fullText);
    let finalTranslation = "";
  
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (onProgress) onProgress(`Translating part ${i + 1} of ${chunks.length}...`);
  
      const chunkResult = await executeWithKeyRotation(FIREWORKS_PREFIX, async (apiKey) => {
        const response = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: MODEL_ID, 
            messages: [{ role: "system", content: SYSTEM_PROMPT_TRANSLATION }, { role: "user", content: chunk }],
            temperature: 0.3, 
            max_tokens: 2000, 
          }),
        });
        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        return data.choices[0].message.content;
      });
      finalTranslation += chunkResult + "\n";
    }
    return finalTranslation;
  };

// 👇 UPDATED: Now accepts 'mode'
export const analyzeTranscript = async (transcript: string, mode: string = 'General'): Promise<MeetingAnalysis> => {
  return await executeWithKeyRotation(FIREWORKS_PREFIX, async (apiKey) => {
    const safeTranscript = transcript.length > 50000 ? transcript.substring(0, 50000) : transcript;

    const response = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_ID,
        messages: [
          { role: "system", content: getSystemPrompt(mode) }, // Use dynamic prompt
          { role: "user", content: `Transcript:\n\n${safeTranscript}` }
        ],
        temperature: 0.6,
        max_tokens: 3000, 
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    const parsed = extractJson(data.choices[0].message.content);

    if (parsed) return parsed as MeetingAnalysis;
    
    return {
        summary: "Analysis failed or raw output.",
        keyPoints: [],
        actionItems: [],
        sentiment: 'Neutral',
        sentimentScore: 50
    };
  });
};