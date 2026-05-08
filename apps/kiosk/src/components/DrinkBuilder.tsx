'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import type { Product, ProductOption } from '@cup-and-co/types';
import {
  drinkClassFor,
  iceLevel,
  hasWhippedCream,
  sizeScale,
  syrupTint,
  milkTint,
  type DrinkClass,
} from '@/lib/drinkClass';
import { HotMilkDrink } from './drink-builder/HotMilkDrink';
import { ColdCoffee } from './drink-builder/ColdCoffee';
import { EspressoShot } from './drink-builder/EspressoShot';

/**
 * K2.1 live drink-builder visual.
 *
 * Picks the right layered SVG class for the product, then translates the
 * customer's selected option NAMES into the visual props that drive each
 * layer. Falls back to the existing static product image when the class
 * is 'unknown' (desserts / breakfast / anything we don't have art for).
 *
 * Translation rules:
 *   size       → cup width scale (Small 0.86 / Medium 1.0 / Large 1.12)
 *   milk       → milk tint (whole / oat / almond / soy / skim)
 *   sugar      → ignored visually (loyalty/finance impact only)
 *   ice        → ice cube count (cold drinks only)
 *   extras     → whipped cream toggle (lenient: matches "whipped" / "كريمة")
 *   syrup/shots → drives drizzle tint / shot count
 *
 * The component is purely presentational — `selections` is the
 * resolved option map from ProductDetailPage. We don't read the cart.
 *
 * Per docs/KIOSK-PLAN.md K2.1.
 */

export interface DrinkBuilderProps {
  product: Product;
  /** Map of group_name → currently selected ProductOption (or undefined). */
  selectionsByGroup: Partial<Record<ProductOption['group_name'], ProductOption | undefined>>;
  /** Categories from the catalog response — used for drink-class detection. */
  categories: { id: string; slug: string }[];
}

export function DrinkBuilder({
  product,
  selectionsByGroup,
  categories,
}: DrinkBuilderProps) {
  // Resolve drink class once per product render.
  const klass: DrinkClass = useMemo(
    () => drinkClassFor(product, categories as never),
    [product, categories],
  );

  // Translate selected option names into builder props.
  const sizeName = selectionsByGroup.size?.name_en;
  const milkName = selectionsByGroup.milk?.name_en;
  const iceName = selectionsByGroup.ice?.name_en;
  const extrasName = selectionsByGroup.extras?.name_en;
  // Some catalogs surface the syrup as 'extras'; we read both. Hot-milk
  // drinks with explicit syrup names (Hazelnut Latte, Mocha Royale) get
  // tinted from the product NAME if no syrup option was modeled.
  const syrupOptionTint = syrupTint(extrasName);
  const productNameTint = syrupTint(product.name_en);
  const finalSyrupTint = syrupOptionTint ?? productNameTint;

  const scale = sizeScale(sizeName);
  const ice = iceLevel(iceName);
  const whipped = hasWhippedCream(extrasName);
  const milk = milkTint(milkName);

  // Foam level inferred from product NAME — cappuccino is foamy, latte is
  // smoother, flat white is barely a layer. Defaulting to 'normal' for
  // anything ambiguous.
  const lowerName = product.name_en.toLowerCase();
  const foamLevel: 'tall' | 'normal' | 'low' = lowerName.includes('cappuccino')
    ? 'tall'
    : lowerName.includes('flat white')
      ? 'low'
      : 'normal';

  // Shot count — 1 by default, 2 if any option name suggests a double.
  const shotsName = selectionsByGroup.shots?.name_en?.toLowerCase() ?? '';
  const shots: 1 | 2 = shotsName.includes('double') || shotsName.includes('2') ? 2 : 1;

  return (
    <div className="relative h-full w-full">
      {klass === 'hot_milk' ? (
        <HotMilkDrink
          sizeScale={scale}
          milkTint={milk}
          syrupTint={finalSyrupTint}
          whippedCream={whipped}
          foamLevel={foamLevel}
        />
      ) : klass === 'cold_coffee' ? (
        <ColdCoffee
          sizeScale={scale}
          ice={ice}
          milkTint={milkName ? milk : null}
          whippedCream={whipped}
          syrupTint={finalSyrupTint}
        />
      ) : klass === 'espresso' ? (
        <EspressoShot
          twist={lowerName.includes('romano')}
          shots={shots}
        />
      ) : (
        // Unknown / tea / blended → fall back to the static product image.
        // Better visual continuity than rendering an obviously-wrong SVG.
        <FallbackImage src={product.image_url} alt={product.name_en} />
      )}
    </div>
  );
}

function FallbackImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative h-full w-full">
      <Image src={src} alt={alt} fill sizes="60vw" className="object-contain" priority />
    </div>
  );
}
