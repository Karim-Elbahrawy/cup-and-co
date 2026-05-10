/**
 * Order favorites repository — Phase 6.1 of UPGRADE-PLAN.md.
 *
 * Stores entire saved order configurations ("my usual") — distinct
 * from the existing product `favorites` table (heart icon). Each
 * favorite is a self-contained order shape that can be one-tap
 * reordered into the cart.
 *
 * In-memory mirror for the dev/demo path. Production swap is a
 * one-file change to point at Supabase via `order_favorites` table
 * (migration `0009_order_favorites.sql`).
 */
import { randomUUID } from 'node:crypto';

export interface OrderFavoriteItem {
  productId: string;
  productNameEn: string;
  productNameAr: string;
  imageUrl: string;
  quantity: number;
  options: Record<string, string>;
  unitPriceEgp: number;
}

export type TimeOfDay = 'morning' | 'midday' | 'evening';

export interface OrderFavorite {
  id: string;
  userId: string;
  name: string;
  items: OrderFavoriteItem[];
  timeOfDay: TimeOfDay | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const favoritesByUser = new Map<string, OrderFavorite[]>();

export function listOrderFavorites(userId: string): OrderFavorite[] {
  const list = favoritesByUser.get(userId) ?? [];
  return [...list].sort((a, b) => {
    // Default first, then by createdAt desc.
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function getOrderFavorite(userId: string, id: string): OrderFavorite | null {
  return (favoritesByUser.get(userId) ?? []).find((f) => f.id === id) ?? null;
}

export interface CreateOrderFavoriteInput {
  name: string;
  items: OrderFavoriteItem[];
  timeOfDay?: TimeOfDay | null;
  isDefault?: boolean;
}

export function createOrderFavorite(userId: string, input: CreateOrderFavoriteInput): OrderFavorite {
  const list = favoritesByUser.get(userId) ?? [];
  const now = new Date().toISOString();
  const fav: OrderFavorite = {
    id: randomUUID(),
    userId,
    name: input.name,
    items: input.items,
    timeOfDay: input.timeOfDay ?? null,
    isDefault: input.isDefault === true,
    createdAt: now,
    updatedAt: now,
  };
  // Enforce one-default-per-user.
  if (fav.isDefault) {
    for (const f of list) f.isDefault = false;
  }
  list.push(fav);
  favoritesByUser.set(userId, list);
  return fav;
}

export interface UpdateOrderFavoriteInput {
  name?: string;
  items?: OrderFavoriteItem[];
  timeOfDay?: TimeOfDay | null;
  isDefault?: boolean;
}

export function updateOrderFavorite(
  userId: string,
  id: string,
  input: UpdateOrderFavoriteInput,
): OrderFavorite | null {
  const list = favoritesByUser.get(userId) ?? [];
  const fav = list.find((f) => f.id === id);
  if (!fav) return null;

  if (input.name !== undefined) fav.name = input.name;
  if (input.items !== undefined) fav.items = input.items;
  if (input.timeOfDay !== undefined) fav.timeOfDay = input.timeOfDay;

  if (input.isDefault === true) {
    for (const f of list) f.isDefault = f.id === id;
  } else if (input.isDefault === false) {
    fav.isDefault = false;
  }
  fav.updatedAt = new Date().toISOString();
  return fav;
}

export function deleteOrderFavorite(userId: string, id: string): boolean {
  const list = favoritesByUser.get(userId) ?? [];
  const idx = list.findIndex((f) => f.id === id);
  if (idx < 0) return false;
  list.splice(idx, 1);
  favoritesByUser.set(userId, list);
  return true;
}

/**
 * Default favorite for a user — used by the morning push and the
 * suggestion engine (Phase 6.4).
 */
export function getDefaultOrderFavorite(userId: string): OrderFavorite | null {
  return (favoritesByUser.get(userId) ?? []).find((f) => f.isDefault) ?? null;
}
