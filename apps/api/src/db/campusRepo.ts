/**
 * Campus + Kiosk repository — Phase 2.2 of UPGRADE-PLAN.md.
 *
 * Mirrors the seeded migration (`0005_multi_campus.sql`) for the in-memory
 * dev path. Production swaps in Supabase queries when the API repos move
 * off in-memory state.
 *
 * Scope of this module: read-only for v1.5 (the campuses + kiosks tables
 * are pre-seeded; dynamic creation is admin-only and lives in the admin
 * app — Phase 2.3).
 */
import type { Campus, Kiosk } from '@cup-and-co/types';

// Default campus id used as fallback for users who haven't picked one yet.
const DEFAULT_CAMPUS_ID = '00000000-0000-0000-0000-00000000ca11'; // mnemonic for cairo-main
const DEFAULT_KIOSK_ID = '00000000-0000-0000-0000-00000000c001'; // mnemonic for "the only one"

const campuses: Campus[] = [
  {
    id: DEFAULT_CAMPUS_ID,
    slug: 'cairo-main',
    name_en: 'Cairo Main Campus',
    name_ar: 'الحرم الجامعي الرئيسي',
    timezone: 'Africa/Cairo',
    currency: 'EGP',
    default_language: 'en',
    is_active: true,
    created_at: new Date('2026-01-01').toISOString(),
  },
];

const kiosks: Kiosk[] = [
  {
    id: DEFAULT_KIOSK_ID,
    campus_id: DEFAULT_CAMPUS_ID,
    slug: 'main',
    name_en: 'Main Kiosk',
    name_ar: 'الكيوسك الرئيسي',
    building: null,
    lat: null,
    lng: null,
    is_open: true,
    is_active: true,
    message_en: 'We are open — your morning is handled',
    message_ar: 'مفتوحون — صباحك معانا',
    capacity_per_slot: 10,
    slot_minutes: 15,
    opens_at: '07:00',
    closes_at: '22:00',
  },
];

export function listCampuses(): Campus[] {
  return campuses.filter((c) => c.is_active);
}

export function getCampus(id: string): Campus | null {
  return campuses.find((c) => c.id === id && c.is_active) ?? null;
}

export function getCampusBySlug(slug: string): Campus | null {
  return campuses.find((c) => c.slug === slug && c.is_active) ?? null;
}

export function listKiosksForCampus(campusId: string): Kiosk[] {
  return kiosks.filter((k) => k.campus_id === campusId && k.is_active);
}

export function getDefaultCampusId(): string {
  return DEFAULT_CAMPUS_ID;
}

export function isValidCampusId(id: string): boolean {
  return campuses.some((c) => c.id === id && c.is_active);
}
