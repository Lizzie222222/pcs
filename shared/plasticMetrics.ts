import type { ReductionPromise } from './schema';

/**
 * Weight conversion factors for common plastic items (in grams)
 * Based on research and average weights of typical disposable plastic items
 */
export const PLASTIC_ITEM_WEIGHTS: Record<string, number> = {
  // Original items
  plastic_cups: 5,           // disposable cup
  plastic_bottles: 15,       // standard water bottle (500ml)
  plastic_straws: 0.42,     // single straw
  plastic_bags: 5,          // shopping bag
  plastic_cutlery: 4,       // fork/spoon/knife
  plastic_plates: 8,        // disposable plate
  food_wrappers: 2,         // snack wrapper
  bottle_caps: 2,           // plastic cap
  styrofoam_containers: 12, // takeout container
  plastic_stirrers: 0.5,    // coffee stirrer
  juice_pouches: 6,         // drink pouch
  sandwich_bags: 4,         // ziplock bag
  chip_bags: 3,             // potato chip bag
  plastic_wrap: 1.5,        // cling film (per meter)
  yogurt_containers: 5,     // single-serve yogurt
  milk_bottles: 30,         // 1-liter milk bottle
  soda_bottles: 18,         // 500ml soda bottle
  detergent_bottles: 50,    // laundry detergent bottle
  shampoo_bottles: 25,      // standard shampoo bottle
  plastic_lids: 3,          // container lids
  balloons: 2,              // latex/plastic balloon
  plastic_gloves: 4,        // disposable gloves (pair)
  disposable_razors: 8,     // plastic razor
  toothbrushes: 18,         // plastic toothbrush
  plastic_utensils_set: 12, // fork, knife, spoon set
  
  // Audit-specific items
  snack_wrappers: 2,        // snack wrapper (food packaging)
  yoghurt_pots: 5,          // yoghurt pot
  takeaway_containers: 12,  // takeaway container
  cling_film: 1.5,          // cling film
  pens_pencils: 3,          // plastic pens & pencils (average)
  stationery: 4,            // misc stationery items
  display_materials: 2,     // display/decoration materials
  soap_bottles: 25,         // soap dispenser bottles
  bin_liners: 8,            // bin bags/liners
  cups_dispensers: 3,       // disposable cups/dispensers
  period_products: 5,       // plastic-wrapped period products
  sport_equipment: 50,      // plastic sports equipment (average)
  toys_equipment: 30,       // plastic toys/equipment
  lab_equipment: 15,        // lab plastics (pipettes, etc.)
  art_supplies: 10,         // art plastic supplies
};

/**
 * Fun metrics interface with ocean-themed comparisons
 */
export interface FunMetrics {
  seaTurtles: number;
  dolphins: number;
  oceanPlasticBottles: number;
  plasticBags: number;
  fishSaved: number;
  descriptions: {
    seaTurtles: string;
    dolphins: string;
    oceanPlasticBottles: string;
    plasticBags: string;
    fishSaved: string;
  };
}

/**
 * Serious environmental impact metrics
 */
export interface SeriousMetrics {
  kilograms: number;
  tons: number;
  co2Prevented: number; // kg CO2
  oilSaved: number; // liters
  plasticBagEquivalent: number;
  yearlyOceanPlasticPrevented: number; // percentage
}

/**
 * Aggregated metrics from multiple reduction promises
 */
export interface AggregatedMetrics {
  totalGramsReduced: number;
  funMetrics: FunMetrics;
  seriousMetrics: SeriousMetrics;
  byItemType: Array<{
    itemType: string;
    itemLabel: string;
    totalReduction: number;
    gramsReduced: number;
  }>;
}

/**
 * Convert plastic item type and quantity to weight in various units
 * 
 * @param itemType - Type of plastic item (must exist in PLASTIC_ITEM_WEIGHTS)
 * @param quantity - Number of items
 * @returns Object containing weight in grams, kilograms, and tons
 * 
 * @example
 * convertToWeight('plastic_bottles', 100)
 * // Returns: { grams: 1500, kilograms: 1.5, tons: 0.0015 }
 */
export function convertToWeight(
  itemType: string,
  quantity: number
): { grams: number; kilograms: number; tons: number } {
  const weightPerItem = PLASTIC_ITEM_WEIGHTS[itemType] || 0;
  const grams = weightPerItem * quantity;
  
  return {
    grams,
    kilograms: grams / 1000,
    tons: grams / 1000000,
  };
}

/**
 * Convert grams of plastic reduced to fun, relatable ocean-themed metrics
 * 
 * @param gramsReduced - Total grams of plastic waste prevented
 * @returns Fun metrics with ocean comparisons and descriptions
 * 
 * Conversion factors:
 * - Sea Turtle: 140kg average weight
 * - Dolphin: 180kg average weight
 * - Ocean Plastic Bottle: 15g standard bottle
 * - Plastic Bag: 5g shopping bag
 * - Fish Saved: Based on 50g plastic ingestion threshold
 */
export function convertToFunMetrics(gramsReduced: number): FunMetrics {
  const seaTurtles = gramsReduced / 140000;
  const dolphins = gramsReduced / 180000;
  const oceanPlasticBottles = gramsReduced / 15;
  const plasticBags = gramsReduced / 5;
  const fishSaved = gramsReduced / 50;

  return {
    seaTurtles,
    dolphins,
    oceanPlasticBottles,
    plasticBags,
    fishSaved,
    descriptions: {
      seaTurtles: `🐢 Equivalent to ${seaTurtles.toFixed(2)} sea turtle${seaTurtles !== 1 ? 's' : ''} worth of plastic saved!`,
      dolphins: `🐬 That's ${dolphins.toFixed(2)} dolphin${dolphins !== 1 ? 's' : ''} worth of plastic prevented!`,
      oceanPlasticBottles: `🍾 ${Math.floor(oceanPlasticBottles).toLocaleString()} plastic bottles kept out of the ocean!`,
      plasticBags: `🛍️ ${Math.floor(plasticBags).toLocaleString()} plastic bags prevented from polluting our seas!`,
      fishSaved: `🐟 Potentially saved ${Math.floor(fishSaved).toLocaleString()} fish from plastic ingestion!`,
    },
  };
}

/**
 * Convert grams of plastic reduced to serious environmental impact metrics
 * 
 * @param gramsReduced - Total grams of plastic waste prevented
 * @returns Serious metrics including CO2, oil savings, and ocean impact
 * 
 * Conversion factors:
 * - CO2: 6kg CO2 emissions per kg of plastic produced
 * - Oil: 2kg of oil per kg of plastic produced
 * - Yearly Ocean Plastic: 8 million tons enter oceans annually
 */
export function convertToSeriousMetrics(gramsReduced: number): SeriousMetrics {
  const kilograms = gramsReduced / 1000;
  const tons = gramsReduced / 1000000;
  
  return {
    kilograms,
    tons,
    co2Prevented: kilograms * 6, // ~6kg CO2 per kg plastic
    oilSaved: kilograms * 2, // ~2kg (liters) oil per kg plastic
    plasticBagEquivalent: gramsReduced / 5,
    yearlyOceanPlasticPrevented: (tons / 8000000) * 100, // percentage of 8 million tons yearly
  };
}

/**
 * Calculate aggregate metrics from an array of reduction promises
 * 
 * @param promises - Array of reduction promises from the database
 * @returns Aggregated metrics including totals, fun metrics, serious metrics, and breakdown by item type
 * 
 * Frequency multipliers for annualization:
 * - week: 52 (annual)
 * - month: 12 (annual)
 * - year: 1 (already annual)
 */
export function calculateAggregateMetrics(promises: ReductionPromise[]): AggregatedMetrics {
  // Handle empty array
  if (!promises || promises.length === 0) {
    return {
      totalGramsReduced: 0,
      funMetrics: convertToFunMetrics(0),
      seriousMetrics: convertToSeriousMetrics(0),
      byItemType: [],
    };
  }

  // Frequency multipliers for annualization
  const frequencyMultipliers: Record<string, number> = {
    week: 52,
    month: 12,
    year: 1,
  };

  // Calculate total grams and breakdown by item type
  const itemTypeMap = new Map<string, {
    itemType: string;
    itemLabel: string;
    totalReduction: number;
    gramsReduced: number;
  }>();

  let totalGramsReduced = 0;

  for (const promise of promises) {
    const weightPerItem = PLASTIC_ITEM_WEIGHTS[promise.plasticItemType] || 0;
    const frequencyMultiplier = frequencyMultipliers[promise.timeframeUnit] || 1;
    const annualizedReduction = promise.reductionAmount * frequencyMultiplier;
    const gramsReduced = annualizedReduction * weightPerItem;

    totalGramsReduced += gramsReduced;

    // Aggregate by item type
    const existing = itemTypeMap.get(promise.plasticItemType);
    if (existing) {
      existing.totalReduction += annualizedReduction;
      existing.gramsReduced += gramsReduced;
    } else {
      itemTypeMap.set(promise.plasticItemType, {
        itemType: promise.plasticItemType,
        itemLabel: promise.plasticItemLabel,
        totalReduction: annualizedReduction,
        gramsReduced,
      });
    }
  }

  return {
    totalGramsReduced,
    funMetrics: convertToFunMetrics(totalGramsReduced),
    seriousMetrics: convertToSeriousMetrics(totalGramsReduced),
    byItemType: Array.from(itemTypeMap.values()).sort((a, b) => b.gramsReduced - a.gramsReduced),
  };
}

/**
 * Format a fun metric value with emoji and description
 * 
 * @param value - Numeric value to format
 * @param type - Type of fun metric (seaTurtles, dolphins, etc.)
 * @returns Formatted string with emoji and description
 * 
 * @example
 * formatFunMetric(2.5, 'seaTurtles')
 * // Returns: "🐢 2.5 sea turtles worth of plastic saved!"
 */
export function formatFunMetric(value: number, type: string): string {
  const formatters: Record<string, (v: number) => string> = {
    seaTurtles: (v) => `🐢 ${v.toFixed(2)} sea turtle${v !== 1 ? 's' : ''} worth of plastic saved!`,
    dolphins: (v) => `🐬 ${v.toFixed(2)} dolphin${v !== 1 ? 's' : ''} worth of plastic prevented!`,
    oceanPlasticBottles: (v) => `🍾 ${Math.floor(v).toLocaleString()} plastic bottle${Math.floor(v) !== 1 ? 's' : ''} kept out of the ocean!`,
    plasticBags: (v) => `🛍️ ${Math.floor(v).toLocaleString()} plastic bag${Math.floor(v) !== 1 ? 's' : ''} prevented from polluting our seas!`,
    fishSaved: (v) => `🐟 Potentially saved ${Math.floor(v).toLocaleString()} fish from plastic ingestion!`,
  };

  const formatter = formatters[type];
  return formatter ? formatter(value) : `${value.toFixed(2)}`;
}

/**
 * Format a serious metric value with appropriate units
 * 
 * @param value - Numeric value to format
 * @param type - Type of serious metric (kilograms, tons, co2Prevented, etc.)
 * @returns Formatted string with units
 * 
 * @example
 * formatSeriousMetric(12.5, 'kilograms')
 * // Returns: "12.5 kg of plastic waste prevented"
 */
export function formatSeriousMetric(value: number, type: string): string {
  const formatters: Record<string, (v: number) => string> = {
    kilograms: (v) => `${v.toFixed(2)} kg of plastic waste prevented`,
    tons: (v) => `${v.toFixed(4)} tons of plastic waste prevented`,
    co2Prevented: (v) => `${v.toFixed(2)} kg of CO₂ emissions prevented`,
    oilSaved: (v) => `${v.toFixed(2)} liters of oil saved`,
    plasticBagEquivalent: (v) => `Equivalent to ${Math.floor(v).toLocaleString()} plastic bags`,
    yearlyOceanPlasticPrevented: (v) => `${v.toFixed(6)}% of yearly ocean plastic pollution prevented`,
  };

  const formatter = formatters[type];
  return formatter ? formatter(value) : `${value.toFixed(2)}`;
}
