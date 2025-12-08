import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ThreatLevel, IndicatorType, ThreatActorProfile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Prompt to guide the model to act as a Threat Intel Engine
const SYSTEM_INSTRUCTION = `
You are Gnosis4012, an advanced Threat Intelligence Platform engine. 
Your job is to analyze Indicators of Compromise (IoCs) provided by the user.
If the IoC is a known malicious entity (like a famous C2 server, WannaCry hash, etc.), use real historical knowledge.
If the IoC is generic, private, or unknown, PERFORM A REALISTIC SIMULATION based on heuristic patterns.
Do not refuse to analyze. If it looks like a local IP (192.168.x.x), warn about it but still provide a structural analysis of what risks *could* exist if it were compromised.
Output must be strictly valid JSON.
If threat actors are identified, provide detailed profiles including TTPs, preferred malware families, targeted industries, primary motivation, and known relationships (affiliated groups or rivals).
`;

export const analyzeIndicator = async (ioc: string, explicitType?: IndicatorType): Promise<AnalysisResult> => {
  const model = "gemini-2.5-flash"; // Efficient for structured data extraction
  
  let promptText = `Analyze this Indicator of Compromise: ${ioc}`;
  if (explicitType) {
    promptText += `. Treat this indicator specifically as a ${explicitType}.`;
  }
  
  const response = await ai.models.generateContent({
    model,
    contents: promptText,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.4, // Lower temperature for more deterministic/analytical outputs
      responseMimeType: "application/json",
      responseSchema: {
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
      }
    }
  });

  if (!response.text) {
    throw new Error("No response from AI");
  }

  try {
    const data = JSON.parse(response.text);
    // Add client-side timestamp
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
    
    // We summarize the last few analyses
    const context = JSON.stringify(recentAnalyses.slice(0, 5));

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Generate a short executive threat briefing based on these recent analyses: ${context}. Focus on trends and highest risks. Keep it under 200 words.`,
    });

    return response.text || "Could not generate summary.";
};

// New function for Knowledgebase
export const lookupThreatActor = async (query: string): Promise<ThreatActorProfile> => {
  const model = "gemini-2.5-flash";
  
  const SYSTEM_INSTRUCTION_KB = `
    You are an expert Threat Intelligence Analyst maintaining a Knowledgebase.
    Provide a comprehensive dossier on the requested Threat Actor (APT group, cybercrime gang, or hacktivist group).
    The user might search by a common alias (e.g., "Cozy Bear"), verify this and map it to the primary group name (e.g., "APT29").
    Use real-world data from MITRE ATT&CK and cybersecurity reports.
    Include relationship data: who they are 'affiliated_with' (allies, sponsors) and who they are a 'rival_of' (adversaries, competing groups).
    Construct a chronological timeline of significant events (first seen, major breaches, change in tactics, new malware deployment).
    Order the timeline chronologically (Oldest to Newest).
  `;

  const response = await ai.models.generateContent({
    model,
    contents: `Generate a detailed profile for the threat actor: ${query}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_KB,
      temperature: 0.3,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          aliases: { type: Type.ARRAY, items: { type: Type.STRING } },
          origin: { type: Type.STRING },
          firstSeen: { type: Type.STRING, description: "Year or approximate timeframe" },
          description: { type: Type.STRING, description: "Comprehensive history and operational style." },
          motivation: { type: Type.STRING },
          targetedIndustries: { type: Type.ARRAY, items: { type: Type.STRING } },
          ttps: { type: Type.ARRAY, items: { type: Type.STRING } },
          preferredMalware: { type: Type.ARRAY, items: { type: Type.STRING } },
          notableAttacks: { type: Type.ARRAY, items: { type: Type.STRING } },
          tools: { type: Type.ARRAY, items: { type: Type.STRING } },
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
                      date: { type: Type.STRING, description: "Year or specific date (YYYY-MM-DD)" },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING }
                  }
              }
          }
        },
        required: ["name", "description", "origin", "motivation", "ttps"]
      }
    }
  });

  if (!response.text) throw new Error("AI failed to generate profile");
  return JSON.parse(response.text);
};

// Function for filtering/discovery
export const discoverThreatActors = async (filters: { origin?: string, motivation?: string, industry?: string }): Promise<string[]> => {
    const model = "gemini-2.5-flash";
    
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