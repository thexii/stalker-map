export function tokenizeCondition(raw: string | null | undefined): string[] {
    if (!raw) {
        return [];
    }

    return raw
        .split(/\s+/)
        .map(token => token.replace(/^[+=]+/, ''))
        .filter(token => token.length > 0);
}

export function matchCondlist<T>(
    entries: T[],
    getCondition: (entry: T) => string,
    worldTokens: string[]
): T | undefined {
    const world = new Set(worldTokens);

    for (const entry of entries) {
        const tokens = tokenizeCondition(getCondition(entry));
        if (tokens.every(token => world.has(token))) {
            return entry;
        }
    }

    return undefined;
}

export function compareConditionTokens(first: string, second: string): number {
    const firstNumber = Number(first.match(/(\d+)$/)?.[1]);
    const secondNumber = Number(second.match(/(\d+)$/)?.[1]);
    const firstHasNumber = !Number.isNaN(firstNumber);
    const secondHasNumber = !Number.isNaN(secondNumber);

    if (firstHasNumber && secondHasNumber && firstNumber !== secondNumber) {
        return firstNumber - secondNumber;
    }

    return first.localeCompare(second);
}
