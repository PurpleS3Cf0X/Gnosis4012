import { AISettingsConfig } from '../types';

const KEY = 'gnosis_ai_settings_v2'; // Incremented version to force new defaults if needed

const DEFAULT_SETTINGS: AISettingsConfig = {
    activeModel: 'gemini-2.5-flash',
    temperature: 0.4,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    thinkingBudget: 0, // Default to 0 (let model decide or disabled)
    language: 'English',
    detailLevel: 'detailed',
    riskTolerance: 'balanced',
    maxContextItems: 5,
    customInstructions: ''
};

export const getAISettings = (): AISettingsConfig => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
        const stored = localStorage.getItem(KEY);
        if (!stored) return DEFAULT_SETTINGS;
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
        return DEFAULT_SETTINGS;
    }
};

export const saveAISettings = (settings: AISettingsConfig) => {
    localStorage.setItem(KEY, JSON.stringify(settings));
};