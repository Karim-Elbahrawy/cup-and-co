import type { Offer } from '@cup-and-co/types';

/**
 * Mutable offers store shared between admin CRUD and customer catalog.
 * Admin endpoints in app.ts write to this array.
 * catalogRouter reads from it to include active offers in the catalog response.
 */
export const adminOffers: Offer[] = [];
