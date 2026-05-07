import { describe, expect, it } from 'vitest';
import {
  FLAG_DEFINITIONS,
  evaluateAllFlags,
  evaluateFlag,
  type FlagName,
} from './featureFlags.js';

describe('featureFlags — definitions', () => {
  it('every definition has variants summing to 10000', () => {
    for (const def of FLAG_DEFINITIONS) {
      const total = def.variants.reduce((sum, v) => sum + v.weight, 0);
      expect(total).toBe(10000);
    }
  });

  it('every definition has a non-empty name', () => {
    for (const def of FLAG_DEFINITIONS) {
      expect(def.name.length).toBeGreaterThan(0);
    }
  });
});

describe('evaluateFlag — determinism', () => {
  it('returns the same variant for the same user across calls', () => {
    const a = evaluateFlag('user-deterministic-1', 'welcome_banner');
    const b = evaluateFlag('user-deterministic-1', 'welcome_banner');
    const c = evaluateFlag('user-deterministic-1', 'welcome_banner');
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('different user ids land in different buckets across many users', () => {
    // The whole point of bucketing is that not every user gets the same
    // variant. With a 50/50 flag and 100 distinct users, we expect both
    // variants to show up (the chance that 100 SHA-256 hashes all land
    // on the same side is astronomically small).
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      seen.add(evaluateFlag(`bucket-spread-user-${i}`, 'welcome_banner'));
      if (seen.size === 2) break;
    }
    expect(seen.size).toBe(2);
  });
});

describe('evaluateFlag — distribution', () => {
  it('a 50/50 flag splits within ±5% over 2000 users', () => {
    let controls = 0;
    let variantAs = 0;
    for (let i = 0; i < 2000; i++) {
      const variant = evaluateFlag(`distribution-user-${i}`, 'welcome_banner');
      if (variant === 'control') controls++;
      else if (variant === 'variant_a') variantAs++;
    }
    // Expected 1000 each; chi-square at ±100 (5%) is comfortable for n=2000.
    expect(controls).toBeGreaterThan(900);
    expect(controls).toBeLessThan(1100);
    expect(variantAs).toBeGreaterThan(900);
    expect(variantAs).toBeLessThan(1100);
    expect(controls + variantAs).toBe(2000);
  });

  it('a 100/0 flag returns "enabled" for every user', () => {
    for (let i = 0; i < 200; i++) {
      const variant = evaluateFlag(`kill-switch-user-${i}`, 'home_offers_visible');
      expect(variant).toBe('enabled');
    }
  });
});

describe('evaluateAllFlags', () => {
  it('returns a value for every defined flag', () => {
    const all = evaluateAllFlags('all-flags-user');
    for (const def of FLAG_DEFINITIONS) {
      expect(all[def.name]).toBeDefined();
      const variantNames = def.variants.map((v) => v.name);
      expect(variantNames).toContain(all[def.name]);
    }
  });

  it('agrees with single-flag evaluation', () => {
    const userId = 'agreement-user';
    const all = evaluateAllFlags(userId);
    for (const def of FLAG_DEFINITIONS) {
      expect(all[def.name]).toBe(evaluateFlag(userId, def.name as FlagName));
    }
  });
});
