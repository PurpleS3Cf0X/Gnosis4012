import { AlertRule, AnalysisResult, TriggeredAlert, AlertCondition } from "../types";
import { dbService } from "./dbService";

// Helper to evaluate a single condition
const evaluateCondition = (result: AnalysisResult, condition: AlertCondition): boolean => {
    let actualValue: any;

    // Map field to actual data
    if (condition.field === 'riskScore') actualValue = result.riskScore;
    else if (condition.field === 'verdict') actualValue = result.verdict;
    else if (condition.field === 'type') actualValue = result.type;
    else if (condition.field === 'ioc') actualValue = result.ioc;
    else if (condition.field === 'threatActor') {
        // Complex check for array
        return result.threatActors ? result.threatActors.some(actor => 
            actor.toLowerCase().includes(String(condition.value).toLowerCase())
        ) : false;
    }

    // Evaluate operator
    switch (condition.operator) {
        case 'greaterThan':
            return Number(actualValue) > Number(condition.value);
        case 'lessThan':
            return Number(actualValue) < Number(condition.value);
        case 'equals':
            return String(actualValue).toLowerCase() === String(condition.value).toLowerCase();
        case 'contains':
            return String(actualValue).toLowerCase().includes(String(condition.value).toLowerCase());
        default:
            return false;
    }
};

export const alertService = {
    // Check an analysis result against all enabled rules
    evaluateRules: async (result: AnalysisResult): Promise<TriggeredAlert[]> => {
        const rules = await dbService.getRules();
        const triggered: TriggeredAlert[] = [];

        for (const rule of rules) {
            if (!rule.enabled) continue;

            // Check if ALL conditions match (AND logic)
            const isMatch = rule.conditions.every(cond => evaluateCondition(result, cond));

            if (isMatch) {
                const alert: TriggeredAlert = {
                    id: crypto.randomUUID(),
                    ruleId: rule.id,
                    ruleName: rule.name,
                    severity: rule.severity,
                    ioc: result.ioc,
                    analysisId: result.id,
                    timestamp: new Date().toISOString(),
                    status: 'NEW',
                    details: `Triggered by rule "${rule.name}" on ${result.type}.`
                };
                
                await dbService.saveTriggeredAlert(alert);
                triggered.push(alert);
            }
        }
        return triggered;
    },

    createRule: async (rule: Omit<AlertRule, 'id' | 'created'>) => {
        const newRule: AlertRule = {
            ...rule,
            id: crypto.randomUUID(),
            created: new Date().toISOString()
        };
        await dbService.saveRule(newRule);
        return newRule;
    },

    updateAlertStatus: async (alert: TriggeredAlert, status: 'ACKNOWLEDGED' | 'RESOLVED') => {
        const updated = { ...alert, status };
        await dbService.saveTriggeredAlert(updated);
        return updated;
    }
};