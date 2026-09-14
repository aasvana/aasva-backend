const MULTIPLIERS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/**
 * Parses a duration string such as "15m", "1h" or "7d" into milliseconds.
 * Throws on malformed input.
 */
export function parseDuration(input: string): number {
  const match = /^(\d+)([smhd])$/.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid duration string: "${input}"`);
  }
  return Number(match[1]) * MULTIPLIERS[match[2]];
}
