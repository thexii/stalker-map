import { FactorSelector, FactorSelectorGroupConfig } from '../models/mechanic-discount-selector.model';
import { compareConditionTokens, tokenizeCondition } from './condlist';

export function buildFactorSelectors(
    groups: FactorSelectorGroupConfig[],
    sourceConditions: string[],
    noneLabel = 'selector_none'
): FactorSelector[] {
    const tokens = [...new Set(sourceConditions.flatMap(condition => tokenizeCondition(condition)))];

    return groups.map(group => {
        const options = group.options?.length
            ? group.options
            : [
                { condition: '', label: noneLabel },
                ...tokens
                    .filter(token => group.conditionPrefix && token.startsWith(group.conditionPrefix))
                    .sort(compareConditionTokens)
                    .map(token => ({ condition: token, label: token }))
            ];

        return {
            name: group.name,
            label: group.label,
            selectedCondition: '',
            options
        };
    });
}

export function collectWorldTokens(selectors: FactorSelector[]): string[] {
    return selectors.flatMap(selector => tokenizeCondition(selector.selectedCondition));
}
