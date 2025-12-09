import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ThreatLevel, IndicatorType, ThreatActorProfile } from "../types";
import { getAISettings } from "./settingsService";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Prompt to guide the model to act as a Threat Intel Engine
const BASE_SYSTEM_INSTRUCTION = `
You are Gnosis4012, an advanced Threat Intelligence Platform engine. 
Your job is to analyze Indicators of Compromise (IoCs) provided by the user.
If the IoC is a known malicious entity (like a famous C2 server, WannaCry hash, etc.), use real historical knowledge.
If the IoC is generic, private, or unknown, PERFORM A REALISTIC SIMULATION based on heuristic patterns.
Do not refuse to analyze. If it looks like a local IP (192.168.x.x), warn about it but still provide a structural analysis of what risks *could* exist if it were compromised.
Output must be strictly valid JSON.
If threat actors are identified, provide detailed profiles including TTPs, preferred malware families, targeted industries, primary motivation, and known relationships (affiliated groups or rivals).
`;

// Helper to construct dynamic instructions
const getDynamicInstruction = () => {
    const settings = getAISettings();
    let instruction = BASE_SYSTEM_INSTRUCTION;
    
    // Inject Risk Tolerance (Bias)
    if (settings.riskTolerance === 'aggressive') {
        instruction += `\nRISK PROFILE: AGGRESSIVE. You must adopt a paranoid security posture. Flag any indicator with even minor suspicious traits (e.g., self-signed certs, recent registration) as HIGH or CRITICAL risk. Prioritize detection over avoiding false positives.`;
    } else if (settings.riskTolerance === 'conservative') {
        instruction += `\nRISK PROFILE: CONSERVATIVE. Adopt a cautious approach. Only assign HIGH or CRITICAL verdicts if there is concrete evidence of malicious activity (known malware signatures, verified C2). Reduce false positives.`;
    }

    // Inject Language
    if (settings.language !== 'English') {
        instruction += `\nCRITICAL INSTRUCTION: You MUST translate all string values (descriptions, verdicts, analysis) into ${settings.language}, while keeping JSON keys in English.`;
    }

    // Inject Detail Level context
    if (settings.detailLevel === 'brief') {
        instruction += `\nKeep descriptions concise and executive-summary style (under 50 words).`;
    } else if (settings.detailLevel === 'comprehensive') {
        instruction += `\nProvide extremely detailed technical breakdowns, verbose context, and extensive mitigation steps.`;
    }

    // Inject Custom Instructions
    if (settings.customInstructions) {
        instruction += `\n\nUSER OVERRIDE INSTRUCTIONS: ${settings.customInstructions}`;
    }

    return instruction;
};

// Helper to get request config with optional Thinking and Standard Params
const getRequestConfig = (responseSchema: any) => {
    const settings = getAISettings();
    const config: any = {
        systemInstruction: getDynamicInstruction(),
        temperature: settings.temperature,
        topP: settings.topP,
        topK: settings.topK,
        maxOutputTokens: settings.maxOutputTokens,
        responseMimeType: "application/json",
        responseSchema
    };

    // Apply Thinking Config ONLY for Gemini 2.5 series if budget > 0
    if (settings.activeModel.includes('gemini-2.5') && settings.thinkingBudget > 0) {
        config.thinkingConfig = { thinkingBudget: settings.thinkingBudget };
    }

    return config;
};

export const analyzeIndicator = async (ioc: string, explicitType?: IndicatorType): Promise<AnalysisResult> => {
  const settings = getAISettings();
  const model = settings.activeModel || "gemini-2.5-flash"; 
  
  let promptText = `Analyze this Indicator of Compromise: ${ioc}`;
  if (explicitType) {
    promptText += `. Treat this indicator specifically as a ${explicitType}.`;
  }
  
  const response = await ai.models.generateContent({
    model,
    contents: promptText,
    config: getRequestConfig({
        type: Type.OBJECT,
        properties: {
          ioc: { type: Type.STRING },
          type: { 
            type: Type.STRING, 
            enum: [IndicatorType.IP, IndicatorType.DOMAIN, IndicatorType.HASH, IndicatorType.URL] 
          },
          riskScore: { type: Type.INTEGER, description: "0 to 100 integer" },
          verdict: { 
            type: Type.STRING,
            enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "SAFE"]
          },
          threatActors: { type: Type.ARRAY, items: { type: Type.STRING } },
          threatActorDetails: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                ttps: { type: Type.ARRAY, items: { type: Type.STRING } },
                preferredMalware: { type: Type.ARRAY, items: { type: Type.STRING } },
                origin: { type: Type.STRING },
                description: { type: Type.STRING },
                targetedIndustries: { type: Type.ARRAY, items: { type: Type.STRING } },
                motivation: { type: Type.STRING },
                relationships: {
                  type: Type.OBJECT,
                  properties: {
                      affiliated_with: { type: Type.ARRAY, items: { type: Type.STRING } },
                      rival_of: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              }
            }
          },
          malwareFamilies: { type: Type.ARRAY, items: { type: Type.STRING } },
          geoGeolocation: { type: Type.STRING, description: "Country or City if applicable" },
          description: { type: Type.STRING, description: "A detailed paragraph explaining the threat context." },
          mitigationSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
          technicalDetails: {
            type: Type.OBJECT,
            properties: {
              asn: { type: Type.STRING },
              registrar: { type: Type.STRING },
              openPorts: { type: Type.ARRAY, items: { type: Type.INTEGER } },
              lastSeen: { type: Type.STRING }
            }
          }
        },
        required: ["ioc", "type", "riskScore", "verdict", "description", "mitigationSteps", "technicalDetails"]
    })
  });

  if (!response.text) {
    throw new Error("No response from AI");
  }

  try {
    const data = JSON.parse(response.text);
    return {
      ...data,
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    console.error("Failed to parse AI response", e);
    throw new Error("Analysis failed: Invalid data format");
  }
};

export const generateExecutiveSummary = async (recentAnalyses: AnalysisResult[]): Promise<string> => {
    if (recentAnalyses.length === 0) return "No data available for summary.";
    
    const settings = getAISettings();
    const context = JSON.stringify(recentAnalyses.slice(0, settings.maxContextItems));
    const model = settings.activeModel || "gemini-2.5-flash";

    // Summary generally doesn't need high thinking budget, keeping standard config
    const response = await ai.models.generateContent({
        model,
        contents: `Generate a short executive threat briefing based on these recent analyses: ${context}. Focus on trends and highest risks.`,
        config: {
            systemInstruction: getDynamicInstruction(),
            temperature: settings.temperature,
            topP: settings.topP,
            topK: settings.topK,
            maxOutputTokens: settings.maxOutputTokens
        }
    });

    return response.text || "Could not generate summary.";
};

export const lookupThreatActor = async (query: string): Promise<ThreatActorProfile> => {
  const settings = getAISettings();
  const model = settings.activeModel || "gemini-2.5-flash";
  
  const BASE_KB_INSTRUCTION = `
    You are an expert Threat Intelligence Analyst maintaining a Knowledgebase.
    Provide a comprehensive dossier on the requested Threat Actor.
    Include relationship data: who they are 'affiliated_with' and who they are a 'rival_of'.
    Assign a 'notabilityScore' from 1 to 10.
    IMPORTANT: Provide a list of 3-5 sample Indicators of Compromise (IoCs).
  `;

  let kbInstruction = BASE_KB_INSTRUCTION;
  if (settings.language !== 'English') {
      kbInstruction += `\nTranslate content to ${settings.language}, keep field names in English.`;
  }

  // Construct config with potential thinking budget
  const config: any = {
      systemInstruction: kbInstruction,
      temperature: settings.temperature,
      topP: settings.topP,
      topK: settings.topK,
      maxOutputTokens: settings.maxOutputTokens,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          aliases: { type: Type.ARRAY, items: { type: Type.STRING } },
          origin: { type: Type.STRING },
          firstSeen: { type: Type.STRING },
          notabilityScore: { type: Type.INTEGER },
          description: { type: Type.STRING },
          motivation: { type: Type.STRING },
          targetedIndustries: { type: Type.ARRAY, items: { type: Type.STRING } },
          ttps: { type: Type.ARRAY, items: { type: Type.STRING } },
          preferredMalware: { type: Type.ARRAY, items: { type: Type.STRING } },
          notableAttacks: { type: Type.ARRAY, items: { type: Type.STRING } },
          tools: { type: Type.ARRAY, items: { type: Type.STRING } },
          sample_iocs: { type: Type.ARRAY, items: { type: Type.STRING } },
          relationships: {
            type: Type.OBJECT,
            properties: {
                affiliated_with: { type: Type.ARRAY, items: { type: Type.STRING } },
                rival_of: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          timeline: {
              type: Type.ARRAY,
              items: {
                  type: Type.OBJECT,
                  properties: {
                      date: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING }
                  }
              }
          }
        },
        required: ["name", "description", "origin", "motivation", "ttps", "notabilityScore"]
      }
  };

  if (settings.activeModel.includes('gemini-2.5') && settings.thinkingBudget > 0) {
      config.thinkingConfig = { thinkingBudget: settings.thinkingBudget };
  }

  const response = await ai.models.generateContent({
    model,
    contents: `Generate a detailed profile for the threat actor: ${query}`,
    config
  });

  if (!response.text) throw new Error("AI failed to generate profile");
  return JSON.parse(response.text);
};

export const discoverThreatActors = async (filters: { origin?: string, motivation?: string, industry?: string }): Promise<string[]> => {
    const settings = getAISettings();
    const model = settings.activeModel || "gemini-2.5-flash";
    
    let prompt = "List up to 8 prominent Threat Actors or APT groups that match the following criteria:\n";
    if (filters.origin) prompt += `- Origin: ${filters.origin}\n`;
    if (filters.motivation) prompt += `- Motivation: ${filters.motivation}\n`;
    if (filters.industry) prompt += `- Targets Industry: ${filters.industry}\n`;
    prompt += "Return ONLY a JSON array of strings containing their names.";

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    });

    if (!response.text) return [];
    try {
        return JSON.parse(response.text);
    } catch (e) {
        return [];
    }
};

export const testGeminiConnection = async (): Promise<{ success: boolean; message: string }> => {
  const settings = getAISettings();
  const model = settings.activeModel || "gemini-2.5-flash";
  try {
    await ai.models.generateContent({
      model: model,
      contents: "Ping",
    });
    return { success: true, message: "Connection Successful" };
  } catch (e: any) {
    let msg = e.message || "Connection Failed";
    if (msg.includes("API key")) msg = "Invalid or Missing API Key";
    return { success: false, message: msg };
  }
};