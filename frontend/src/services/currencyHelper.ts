/**
 * E-Money System Currency Utility
 * 
 * Core Exchange Rules:
 * 1 Unit = 10 USD
 * 1 Unit = 45,000 MMK
 */

export const UNIT_TO_USD = 10;
export const UNIT_TO_MMK = 45000;
export const WALLET_RATE_LABEL = '(1 Unit = 10 USD and 1 Unit = 45000 MMK)';

/**
 * Converts Units to USD
 */
export const unitsToUsd = (units: number): number => {
  return (units || 0) * UNIT_TO_USD;
};

/**
 * Converts Units to MMK
 */
export const unitsToMmk = (units: number): number => {
  return (units || 0) * UNIT_TO_MMK;
};

/**
 * Converts USD to Units
 */
export const usdToUnits = (usd: number): number => {
  return (usd || 0) / UNIT_TO_USD;
};

/**
 * Converts MMK to Units
 */
export const mmkToUnits = (mmk: number): number => {
  return (mmk || 0) / UNIT_TO_MMK;
};

/**
 * Format primary amount in Units (e.g. "7,120,000 Units", "500 Units")
 */
export const formatUnits = (amountInUnits: number | undefined | null): string => {
  if (amountInUnits === undefined || amountInUnits === null || isNaN(amountInUnits)) {
    return '0 Units';
  }
  if (amountInUnits === 0) return '0 Units';

  const formatted = amountInUnits.toLocaleString(undefined, {
    minimumFractionDigits: amountInUnits % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} Units`;
};

/**
 * Short formatting for compact buttons and tags (e.g. "+500 Units", "1.2M Units")
 */
export const formatUnitsShort = (amountInUnits: number): string => {
  if (!amountInUnits) return '0 Units';

  if (amountInUnits >= 1000000) {
    const m = amountInUnits / 1000000;
    return `${m.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}M Units`;
  }
  if (amountInUnits >= 1000) {
    const k = amountInUnits / 1000;
    return `${k.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}K Units`;
  }
  return `${amountInUnits.toLocaleString()} Units`;
};

/**
 * Generates subtitle conversion text for any Units price:
 * e.g. "≈ $71,200,000 USD • 320,400,000,000 MMK"
 */
export const formatUnitsConversions = (amountInUnits: number | undefined | null): string => {
  const units = amountInUnits || 0;
  const usd = unitsToUsd(units);
  const mmk = unitsToMmk(units);
  return `≈ $${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD • ${mmk.toLocaleString(undefined, { maximumFractionDigits: 0 })} MMK`;
};

/**
 * Adaptive bid increments in Units based on current lot price
 */
export const getAdaptiveIncrements = (currentPriceInUnits: number): [number, number, number] => {
  if (!currentPriceInUnits || currentPriceInUnits <= 0) {
    return [100, 500, 1000];
  }

  const rawBase = currentPriceInUnits * 0.01;
  const power = Math.pow(10, Math.floor(Math.log10(rawBase)));
  const factor = rawBase / power;
  let normalizedBase = factor >= 5 ? 5 * power : factor >= 2 ? 2 * power : power;
  normalizedBase = Math.max(10, Math.round(normalizedBase / 10) * 10);

  return [normalizedBase, normalizedBase * 5, normalizedBase * 10];
};

// Aliases for seamless backward compatibility during transition
export const formatLakhs = formatUnits;
export const formatLakhsShort = formatUnitsShort;
