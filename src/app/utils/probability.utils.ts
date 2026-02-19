const factorialCache = new Map<number, number>();

function factorial(n: number): number {
  if (factorialCache.has(n)) {
    return factorialCache.get(n)!;
  }
  if (n <= 0) {
    return 1;
  }
  const result = n * factorial(n - 1);
  factorialCache.set(n, result);
  return result;
}

/** Binomial probability P(X = k) for n trials with success probability p */
export function bernoulli(n: number, k: number, p: number): number {
  return (factorial(n) / (factorial(k) * factorial(n - k))) * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

/** Prewarm cache for common values */
export function prewarmFactorialCache(maxN: number): void {
  factorial(maxN);
}

prewarmFactorialCache(20);
