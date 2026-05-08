/**
 * Feature flag service — deterministic A/B assignment without an external SaaS.
 *
 * Why this exists:
 *   We want to ship features behind flags (kill-switches, % rollouts, simple
 *   A/B experiments) before adopting GrowthBook/Statsig/etc. The contract
 *   below is deliberately a subset of what those tools expose, so swapping
 *   later is a single-file refactor.
 *
 * Determinism:
 *   `evaluateFlag(userId, flagName)` hashes `userId + ":" + flagName` with
 *   SHA-256, takes the first 4 bytes as a uint32, and assigns the variant
 *   whose cumulative weight covers that bucket out of 10000. Same user +
 *   same flag → same variant, forever (until the flag definition changes).
 *   Different flag names give independent buckets, so a user can be in
 *   `variant_a` for flag X and `control` for flag Y.
 *
 * Adding a flag:
 *   1. Add a new entry to FLAG_DEFINITIONS below.
 *   2. Variants must sum to 10000 (one decimal of percentage precision).
 *   3. The first variant is the implicit fallback for unknown errors.
 *   4. Add the literal name to FlagName so callers get autocomplete.
 *
 * What this is NOT:
 *   - Not a server-side targeting engine (no rules on role/country/etc.).
 *     If we need that, we'd add a `targeting` array to the definition.
 *   - Not persisted; flag definitions live in code, not in the DB. That
 *     keeps changes auditable via git and avoids a control-plane outage
 *     turning the app into a coin flip.
 */

import { createHash } from 'node:crypto';

export type FlagName =
  | 'welcome_banner'
  | 'home_offers_visible';

export interface FlagVariant {
  /** Variant identifier exposed to the client. */
  name: string;
  /** Weight out of 10000. All variants in a flag must sum to 10000. */
  weight: number;
}

export interface FlagDefinition {
  name: FlagName;
  description: string;
  variants: FlagVariant[];
}

/**
 * Source of truth for every flag the app knows about.
 *
 * Initial entries:
 *   - `welcome_banner` 50/50 — proves bucketing works end-to-end.
 *   - `home_offers_visible` 100% on — operational kill-switch we can flip
 *     to 100% off in code without touching UI components.
 */
export const FLAG_DEFINITIONS: readonly FlagDefinition[] = [
  {
    name: 'welcome_banner',
    description:
      'Show a personal welcome-back pill above the home greeting. 50/50 demo.',
    variants: [
      { name: 'control', weight: 5000 },
      { name: 'variant_a', weight: 5000 },
    ],
  },
  {
    name: 'home_offers_visible',
    description:
      'Render the OffersCarousel on the home page. Kill-switch: flip to 0/10000 to hide instantly.',
    variants: [
      { name: 'enabled', weight: 10000 },
      { name: 'disabled', weight: 0 },
    ],
  },
];

const FLAG_BY_NAME: Record<FlagName, FlagDefinition> =
  FLAG_DEFINITIONS.reduce<Record<FlagName, FlagDefinition>>(
    (acc, def) => {
      acc[def.name] = def;
      return acc;
    },
    {} as Record<FlagName, FlagDefinition>,
  );

export type FlagAssignments = Partial<Record<FlagName, string>>;

/** Number of buckets across which traffic is split. Keep at 10000 (4 dp). */
const BUCKET_SPACE = 10000;

/**
 * Hash `userId:flagName` and project into [0, 10000). Splitting per flag
 * (not per user) means the buckets are uncorrelated — a user can land in
 * variant_a for one flag and control for another. That's the property
 * Statsig/GrowthBook call "independent randomization units".
 */
function bucketFor(userId: string, flagName: FlagName): number {
  const hash = createHash('sha256').update(`${userId}:${flagName}`).digest();
  // First 4 bytes as unsigned 32-bit, then mod into bucket space. The mod
  // bias at 10000/2^32 is ~2.3e-6 — comfortably below experiment noise.
  const u32 = hash.readUInt32BE(0);
  return u32 % BUCKET_SPACE;
}

/**
 * Validate that a definition's variant weights sum to BUCKET_SPACE.
 * Throws at call time so a bad deploy fails loudly during the first flag
 * evaluation rather than silently degrading to fallback for everyone.
 */
function assertValidDefinition(def: FlagDefinition): void {
  const total = def.variants.reduce((sum, v) => sum + v.weight, 0);
  if (total !== BUCKET_SPACE) {
    throw new Error(
      `Flag "${def.name}" has variant weights summing to ${total}, expected ${BUCKET_SPACE}.`,
    );
  }
  if (def.variants.length === 0) {
    throw new Error(`Flag "${def.name}" has no variants.`);
  }
}

/**
 * Resolve the variant name for `userId` on `flagName`. Returns the first
 * variant as fallback if the flag is unknown or malformed — callers should
 * always treat the return as an opaque string compared against expected
 * variant names.
 */
export function evaluateFlag(userId: string, flagName: FlagName): string {
  const def = FLAG_BY_NAME[flagName];
  if (!def) {
    // Should be unreachable thanks to the FlagName union, but defensive
    // for runtime callers (e.g. dynamic strings from URL params).
    return 'control';
  }
  assertValidDefinition(def);

  const bucket = bucketFor(userId, flagName);
  let cumulative = 0;
  for (const variant of def.variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) return variant.name;
  }
  // Unreachable because weights sum to BUCKET_SPACE, but keeps TS happy.
  return def.variants[0]!.name;
}

/**
 * Resolve every known flag for a user. This is what `GET /me/feature-flags`
 * returns; the client caches it for the session and reads it via
 * `useFeatureFlag(name)`.
 */
export function evaluateAllFlags(userId: string): FlagAssignments {
  const out: FlagAssignments = {};
  for (const def of FLAG_DEFINITIONS) {
    out[def.name] = evaluateFlag(userId, def.name);
  }
  return out;
}
