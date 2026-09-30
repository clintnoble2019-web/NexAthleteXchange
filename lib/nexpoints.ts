export const NEXPOINTS_SYMBOL = "N⟡";

export function formatNexPoints(value: number, decimals = 2) {
  const formatted = Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  return `${NEXPOINTS_SYMBOL}${formatted}`;
}

export function formatSignedNexPoints(value: number, decimals = 2) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatNexPoints(Math.abs(value), decimals)}`;
}
