import { AlertRule, AnalysisResult, TriggeredAlert, AlertCondition, AlertGroup } from "../types";
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
    else if (condition.field === 'malwareFamilies') {
        return result.malwareFamilies ? result.malwareFamilies.some(malware => 
            malware.toLowerCase().includes(String(condition.value).toLowerCase())
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

const evaluateGroup = (result: AnalysisResult, group: AlertGroup): boolean => {
    if (!group.conditions || group.conditions.length === 0) return true;

    if (group.logic === 'AND') {
        return group.conditions.every(cond => evaluateCondition(result, cond));
    } else {
        // OR
        return group.conditions.some(cond => evaluateCondition(result, cond));
    }
};

export const alertService = {
    // Check an analysis result against all enabled rules
    evaluateRules: async (result: AnalysisResult): Promise<TriggeredAlert[]> => {
        const rules = await dbService.getRules();
        const triggered: TriggeredAlert[] = [];

        for (const rule of rules) {
            if (!rule.enabled) continue;
            
            // Handle legacy rules or empty rules
            if (!rule.groups || rule.groups.length === 0) {
                 // Check if it has legacy 'conditions' property (runtime check)
                 const legacyConditions = (rule as any).conditions;
                 if (legacyConditions && legacyConditions.length > 0) {
                     // Evaluate as implicit AND
                     const isMatch = legacyConditions.every((c: any) => evaluateCondition(result, c));
                     if (isMatch) await trigger(rule);
                 }
                 continue;
            }

            // Evaluate Groups based on Rule Logic
            let isMatch = false;
            if (rule.logic === 'AND') {
                isMatch = rule.groups.every(group => evaluateGroup(result, group));
            } else {
                isMatch = rule.groups.some(group => evaluateGroup(result, group));
            }

            if (isMatch) {
                await trigger(rule);
            }
        }

        async function trigger(rule: AlertRule) {
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