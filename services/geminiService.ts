
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ThreatLevel, IndicatorType, ThreatActorProfile, ExternalIntel, VulnerabilityProfile } from "../types";
import { getAISettings } from "./settingsService";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Strict Factual Prompt
const BASE_SYSTEM_INSTRUCTION = `
You are Gnosis4012, a strictly factual Threat Intelligence Engine. 
Your job is to synthesize data about Indicators of Compromise (IoCs).

RULES:
1. **NO SIMULATION**: If information is unknown or the IoC appears benign/unregistered, report it as SAFE or LOW risk with "No malicious evidence found". Do NOT invent threat actors or C2 infrastructure.
2. **GROUNDING**: Use the provided 'Google Search' tool and the 'External Context' JSON provided in the prompt to form your verdict.
3. **JSON OUTPUT**: You must output valid JSON. Do not wrap it in markdown code blocks.
4. **RISK SCORING**: 
   - If External Context has high scores (e.g. VirusTotal > 5), align your verdict with them.
   - If Google Search reveals reports of abuse, align with them.
   - If no evidence exists, Risk Score must be < 20.
`;

const getDynamicInstruction = () => {
    const settings = getAISettings();
    let instruction = BASE_SYSTEM_INSTRUCTION;
    
    if (settings.riskTolerance === 'aggressive') {
        instruction += `\nRISK BIAS: Aggressive. Treat unverified hosting providers or fresh domains as suspiciously MEDIUM risk (40-60).`;
    }

    if (settings.language !== 'English') {
        instruction += `\nOutput string values in ${settings.language}, but keep JSON keys in English.`;
    }

    if (settings.customInstructions) {
        instruction += `\n\nUSER OVERRIDE: ${settings.customInstructions}`;
    }

    return instruction;
};

// We cannot use 'responseSchema' together with 'googleSearch' tool in the SDK easily for all models.
// We will rely on prompt engineering for JSON structure when tools are enabled.
const JSON_STRUCTURE_TEMPLATE = `
{
  "ioc": "string",
  "type": "IP Address | Domain | Hash | URL",
  "riskScore": 0,
  "verdict": "CRITICAL | HIGH | MEDIUM | LOW | SAFE",
  "threatActors": ["string"],
  "threatActorDetails": [{ "name": "string", "description": "string", "origin": "string", "motivation": "string", "ttps": ["string"], "preferredMalware": ["string"], "relationships": { "affiliated_with": [], "rival_of": [] } }],
  "malwareFamilies": ["string"],
  "geoGeolocation": "string",
  "description": "string",
  "mitigationSteps": ["string"],
  "technicalDetails": { "asn": "string", "registrar": "string", "openPorts": [0], "lastSeen": "string" }
}
`;

export const analyzeIndicator = async (ioc: string, explicitType?: IndicatorType, externalContext?: ExternalIntel[]): Promise<AnalysisResult> => {
  const settings = getAISettings();
  const model = settings.activeModel || "gemini-2.5-flash"; 
  
  let contextString = "No external tools configured.";
  if (externalContext && externalContext.length > 0) {
      contextString = JSON.stringify(externalContext);
  }

  const promptText = `
    Analyze this IOC: "${ioc}".
    Explicit Type: ${explicitType || 'Auto-detect'}.
    
    EXTERNAL CONTEXT (INTEGRATION DATA):
    ${contextString}

    INSTRUCTIONS:
    1. Use the 'googleSearch' tool to validate ownership, WHOIS info, and recent abuse reports.
    2. Combine Search results + External Context to form a verdict.
    3. If External Context indicates 'Clean' and Search finds nothing, verdict is SAFE.
    4. Return ONLY raw JSON matching this structure:
    ${JSON_STRUCTURE_TEMPLATE}
  `;
  
  const config: any = {
    systemInstruction: getDynamicInstruction(),
    temperature: settings.temperature,
    topP: settings.topP,
    topK: settings.topK,
    maxOutputTokens: settings.maxOutputTokens,
    // Enable Grounding
    tools: [{ googleSearch: {} }]
  };

  const response = await ai.models.generateContent({
    model,
    contents: promptText,
    config
  });

  if (!response.text) {
    throw new Error("No response from AI");
  }

  // Extract Grounding Metadata (URLs)
  const groundingUrls: string[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
      chunks.forEach((c: any) => {
          if (c.web?.uri) groundingUrls.push(c.web.uri);
      });
  }

  try {
    // Sanitize markdown if present
    let jsonStr = response.text.trim();
    if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '');
    } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '');
    }

    const data = JSON.parse(jsonStr);
    return {
      ...data,
      groundingUrls: groundingUrls,
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    console.error("Failed to parse AI response", e);
    console.log("Raw Response:", response.text);
    throw new Error("Analysis failed: AI returned invalid format. Ensure requested IOC is valid.");
  }
};

export const analyzeVulnerability = async (query: string): Promise<VulnerabilityProfile> => {
    const settings = getAISettings();
    const model = settings.activeModel || "gemini-2.5-flash";

    const VULN_SYSTEM_PROMPT = `
        You are Gnosis4012, a Vulnerability Research & Detection Engineer.
        Your task is to analyze a CVE ID or Malware Name and provide a deep technical report.
        
        CRITICAL TASK: Generate detection rules (YARA, SIGMA, or SNORT) based on the technical characteristics found.
        
        OUTPUT FORMAT: JSON Only.
        {
            "id": "CVE-XXXX-XXXX or Malware Name",
            "type": "CVE" or "MALWARE",
            "title": "Short descriptive title",
            "description": "Executive summary of the threat.",
            "cvssScore": 9.8,
            "severity": "CRITICAL",
            "affectedSystems": ["List", "Of", "Systems"],
            "exploitationStatus": "Active" | "PoC Available" | "None" | "Unknown",
            "technicalAnalysis": "Deep dive into HOW it works (buffer overflow details, infection chain, etc).",
            "mitigationSteps": ["Step 1", "Step 2"],
            "detectionRules": [
                {
                    "type": "YARA" | "SIGMA" | "SNORT",
                    "description": "Rule explanation",
                    "content": "rule name { ... }"
                }
            ],
            "publishedDate": "YYYY-MM-DD",
            "references": ["url1", "url2"]
        }
    `;

    const config: any = {
        systemInstruction: VULN_SYSTEM_PROMPT,
        temperature: 0.3, 
        topP: 0.95,
        maxOutputTokens: settings.maxOutputTokens,
        tools: [{ googleSearch: {} }]
    };

    try {
        const response = await ai.models.generateContent({
            model,
            contents: `Analyze this threat: "${query}". Find the latest CVSS scores, active exploitation status, and generate a valid detection rule if enough technical detail exists.`,
            config
        });

        if (!response.text) throw new Error("No response generated.");

        let jsonStr = response.text.trim();
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '');
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '');
        }

        const profile = JSON.parse(jsonStr);

        // Extract citations/grounding chunks
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const searchRefs: string[] = [];
        if (chunks) {
            chunks.forEach((c: any) => {
                if (c.web?.uri) searchRefs.push(c.web.uri);
            });
        }
        profile.references = Array.from(new Set([...(profile.references || []), ...searchRefs]));

        return profile;

    } catch (e: any) {
        throw new Error(`Vulnerability analysis failed: ${e.message}`);
    }
};

export const generateExecutiveSummary = async (recentAnalyses: AnalysisResult[]): Promise<string> => {
    if (recentAnalyses.length === 0) return "No data available for summary.";
    
    const settings = getAISettings();
    const context = JSON.stringify(recentAnalyses.slice(0, settings.maxContextItems));
    const model = settings.activeModel || "gemini-2.5-flash";

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
    You are an expert Threat Intelligence Analyst.
    Provide a comprehensive dossier on the requested Threat Actor.
    Use Google Search to find the latest campaigns and TTPs.
  `;

  let kbInstruction = BASE_KB_INSTRUCTION;
  if (settings.language !== 'English') {
      kbInstruction += `\nTranslate content to ${settings.language}, keep field names in English.`;
  }

  const config: any = {
      systemInstruction: kbInstruction,
      temperature: settings.temperature,
      topP: settings.topP,
      topK: settings.topK,
      maxOutputTokens: settings.maxOutputTokens,
      tools: [{ googleSearch: {} }]
      // JSON Schema removed here to allow search tool usage, we rely on prompt for structure if needed, 
      // but for specific types it's safer to prompt for JSON text.
  };

  const response = await ai.models.generateContent({
    model,
    contents: `Generate a JSON profile for threat actor: "${query}". 
    Format: { "name": "", "description": "", "origin": "", "motivation": "", "notabilityScore": 1-10, "ttps": [], "preferredMalware": [], "targetedIndustries": [], "relationships": { "affiliated_with": [], "rival_of": [] }, "sample_iocs": [], "lastUpdated": "ISO String", "references": [] }`,
    config
  });

  if (!response.text) throw new Error("AI failed to generate profile");
  
  let jsonStr = response.text.trim();
  if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '');
  } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '');
  }

  return JSON.parse(jsonStr);
};

export const enrichThreatActor = async (name: string): Promise<ThreatActorProfile> => {
    const settings = getAISettings();
    const model = settings.activeModel || "gemini-2.5-flash";

    const ENRICH_INSTRUCTION = `
      You are a specialized Threat Intelligence Research AI.
      Your goal is to UPDATE and ENRICH the profile for the Threat Actor: "${name}".
      
      MANDATORY REQUIREMENTS:
      1. Use Google Search to find the most recent campaigns, reports, and IOCs (2024-2025). Do NOT use outdated data if new data exists.
      2. FACTUALITY: Only include confirmed details from cybersecurity vendors (e.g., Mandiant, CrowdStrike, CISA, Microsoft).
      3. IOCs: Include real, de-fanged sample IOCs (IPs, Hashes) if publicly cited in reports.
      4. SCREENSHOTS/IMAGES: If you find public URLs for attack diagrams or logos from trusted sources, include them in the 'images' array.
      5. OUTPUT: Return strictly valid JSON.
      6. FORMAT: 
         {
           "name": "${name}",
           "description": "Updated detailed summary including recent activity...",
           "origin": "Country/Region",
           "motivation": "Financial/Espionage/etc",
           "notabilityScore": 1-10,
           "ttps": ["T1059", "T1190", ...],
           "preferredMalware": ["Name1", "Name2"],
           "targetedIndustries": ["Industry1", "Industry2"],
           "relationships": { "affiliated_with": [], "rival_of": [] },
           "sample_iocs": ["1.2.3.4", "hash..."],
           "timeline": [ { "date": "YYYY-MM", "title": "Campaign Name", "description": "Details" } ],
           "images": ["url_to_image"],
           "lastUpdated": "${new Date().toISOString()}",
           "references": ["url1", "url2"]
         }
    `;

    const config: any = {
        systemInstruction: ENRICH_INSTRUCTION,
        temperature: 0.3, // Lower temperature for more factual responses
        topP: 0.95,
        topK: 40,
        maxOutputTokens: settings.maxOutputTokens,
        tools: [{ googleSearch: {} }]
    };

    try {
        const response = await ai.models.generateContent({
            model,
            contents: `Find the absolute latest intelligence for ${name}. Prioritize events from the last 12 months. Ensure all data is factually verified by Google Search results.`,
            config
        });

        if (!response.text) throw new Error("No response generated.");

        let jsonStr = response.text.trim();
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '');
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '');
        }

        const profile = JSON.parse(jsonStr);

        // Extract citations/grounding chunks for references if not provided by model explicitly
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const searchRefs: string[] = [];
        if (chunks) {
            chunks.forEach((c: any) => {
                if (c.web?.uri) searchRefs.push(c.web.uri);
            });
        }
        
        // Merge references unique
        profile.references = Array.from(new Set([...(profile.references || []), ...searchRefs]));
        // Ensure timestamp is set
        profile.lastUpdated = new Date().toISOString();

        return profile;

    } catch (e: any) {
        console.error("Enrichment failed:", e);
        throw new Error(`Failed to enrich profile: ${e.message}`);
    }
};


export const discoverThreatActors = async (filters: { origin?: string, motivation?: string, industry?: string }): Promise<string[]> => {
    // This function can stay simple/simulated or use search if needed, sticking to basics for now.
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
