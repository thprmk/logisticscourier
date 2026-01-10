/**
 * Pricing Calculator Service
 * Handles all price calculations based on weight tiers and zone surcharges
 */

import dbConnect from './dbConnect';
import WeightTier from '@/models/WeightTier.model';
import ZoneSurcharge from '@/models/ZoneSurcharge.model';

export interface PriceCalculationResult {
  basePrice: number;
  zoneSurcharge: number;
  finalPrice: number;
  breakdown: {
    weight: number;
    weightTier?: {
      minWeight: number;
      maxWeight: number;
      price: number;
    };
    fromZone?: string;
    toZone?: string;
    surchargeType?: 'same-zone' | 'different-zone';
  };
}

export interface PriceCalculationError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Calculate base price based on package weight
 * @param weight - Package weight in kg
 * @returns Base price in ₹
 * @throws Error if no matching weight tier found
 */
export async function calculateBasePrice(weight: number): Promise<number> {
  if (weight < 0) {
    throw new Error('Weight cannot be negative');
  }

  await dbConnect();

  // Get all active weight tiers, sorted by minWeight
  const weightTiers = await WeightTier.find({ isActive: true })
    .sort({ minWeight: 1 })
    .lean();

  if (weightTiers.length === 0) {
    throw new Error('No weight tiers configured. Please configure weight tiers first.');
  }

  // Find the appropriate weight tier
  // Logic: weight >= minWeight AND weight < maxWeight (except for last tier where weight <= maxWeight)
  for (let i = 0; i < weightTiers.length; i++) {
    const tier = weightTiers[i];
    const isLastTier = i === weightTiers.length - 1;

    if (weight >= tier.minWeight && (isLastTier ? weight <= tier.maxWeight : weight < tier.maxWeight)) {
      return tier.price;
    }
  }

  // If weight exceeds all tiers, use the last tier's price
  const lastTier = weightTiers[weightTiers.length - 1];
  if (weight >= lastTier.minWeight) {
    return lastTier.price;
  }

  throw new Error(`No weight tier found for weight: ${weight} kg. Please configure weight tiers.`);
}

/**
 * Get weight tier details for a given weight
 * @param weight - Package weight in kg
 * @returns Weight tier details or null if not found
 */
export async function getWeightTierDetails(weight: number): Promise<{
  minWeight: number;
  maxWeight: number;
  price: number;
} | null> {
  if (weight < 0) {
    return null;
  }

  await dbConnect();

  const weightTiers = await WeightTier.find({ isActive: true })
    .sort({ minWeight: 1 })
    .lean();

  if (weightTiers.length === 0) {
    return null;
  }

  for (let i = 0; i < weightTiers.length; i++) {
    const tier = weightTiers[i];
    const isLastTier = i === weightTiers.length - 1;

    if (weight >= tier.minWeight && (isLastTier ? weight <= tier.maxWeight : weight < tier.maxWeight)) {
      return {
        minWeight: tier.minWeight,
        maxWeight: tier.maxWeight,
        price: tier.price,
      };
    }
  }

  // Return last tier if weight exceeds all
  const lastTier = weightTiers[weightTiers.length - 1];
  if (weight >= lastTier.minWeight) {
    return {
      minWeight: lastTier.minWeight,
      maxWeight: lastTier.maxWeight,
      price: lastTier.price,
    };
  }

  return null;
}

/**
 * Calculate zone surcharge based on origin and destination zones
 * @param fromZoneId - Origin zone ID
 * @param toZoneId - Destination zone ID
 * @returns Zone surcharge in ₹ (0 if not found or same zone with no surcharge)
 */
export async function calculateZoneSurcharge(
  fromZoneId: string,
  toZoneId: string
): Promise<number> {
  if (!fromZoneId || !toZoneId) {
    throw new Error('Both origin and destination zone IDs are required');
  }

  await dbConnect();

  // Check if same zone
  const isSameZone = fromZoneId.toString() === toZoneId.toString();

  // Find the zone surcharge
  const zoneSurcharge = await ZoneSurcharge.findOne({
    fromZoneId,
    toZoneId,
    isActive: true,
  }).lean();

  if (zoneSurcharge) {
    return zoneSurcharge.surcharge;
  }

  // If no surcharge found, return 0 (no surcharge)
  // This allows the system to work even if surcharges aren't configured
  return 0;
}

/**
 * Get zone surcharge details
 * @param fromZoneId - Origin zone ID
 * @param toZoneId - Destination zone ID
 * @returns Surcharge details or null
 */
export async function getZoneSurchargeDetails(
  fromZoneId: string,
  toZoneId: string
): Promise<{
  surcharge: number;
  type: 'same-zone' | 'different-zone';
} | null> {
  if (!fromZoneId || !toZoneId) {
    return null;
  }

  await dbConnect();

  const isSameZone = fromZoneId.toString() === toZoneId.toString();
  const zoneSurcharge = await ZoneSurcharge.findOne({
    fromZoneId,
    toZoneId,
    isActive: true,
  }).lean();

  if (zoneSurcharge) {
    return {
      surcharge: zoneSurcharge.surcharge,
      type: isSameZone ? 'same-zone' : 'different-zone',
    };
  }

  return {
    surcharge: 0,
    type: isSameZone ? 'same-zone' : 'different-zone',
  };
}

/**
 * Calculate final price for a shipment
 * @param weight - Package weight in kg
 * @param fromZoneId - Origin zone ID
 * @param toZoneId - Destination zone ID
 * @returns Complete price calculation result
 */
export async function calculateFinalPrice(
  weight: number,
  fromZoneId: string,
  toZoneId: string
): Promise<PriceCalculationResult> {
  try {
    // Validate inputs
    if (weight < 0) {
      throw new Error('Weight cannot be negative');
    }
    if (!fromZoneId || !toZoneId) {
      throw new Error('Both origin and destination zone IDs are required');
    }

    // Calculate base price
    const basePrice = await calculateBasePrice(weight);
    const weightTier = await getWeightTierDetails(weight);

    // Calculate zone surcharge
    const zoneSurcharge = await calculateZoneSurcharge(fromZoneId, toZoneId);
    const surchargeDetails = await getZoneSurchargeDetails(fromZoneId, toZoneId);

    // Calculate final price
    const finalPrice = basePrice + zoneSurcharge;

    // Get zone names for breakdown (optional, for better UX)
    let fromZoneName: string | undefined;
    let toZoneName: string | undefined;

    try {
      const Zone = (await import('@/models/Zone.model')).default;
      await dbConnect();
      const [fromZone, toZone] = await Promise.all([
        Zone.findById(fromZoneId).lean(),
        Zone.findById(toZoneId).lean(),
      ]);
      fromZoneName = fromZone?.name;
      toZoneName = toZone?.name;
    } catch (error) {
      // Zone names are optional, continue without them
      console.warn('Could not fetch zone names:', error);
    }

    return {
      basePrice,
      zoneSurcharge,
      finalPrice,
      breakdown: {
        weight,
        weightTier: weightTier || undefined,
        fromZone: fromZoneName,
        toZone: toZoneName,
        surchargeType: surchargeDetails?.type,
      },
    };
  } catch (error: any) {
    // Re-throw with more context
    throw new Error(`Price calculation failed: ${error.message}`);
  }
}

/**
 * Validate weight tier configuration
 * Checks for overlapping tiers and gaps
 * @returns Validation result
 */
export async function validateWeightTiers(): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  await dbConnect();

  const weightTiers = await WeightTier.find({ isActive: true })
    .sort({ minWeight: 1 })
    .lean();

  const errors: string[] = [];
  const warnings: string[] = [];

  if (weightTiers.length === 0) {
    errors.push('No weight tiers configured');
    return { isValid: false, errors, warnings };
  }

  // Check for gaps and overlaps
  for (let i = 0; i < weightTiers.length; i++) {
    const current = weightTiers[i];
    const next = weightTiers[i + 1];

    // Validate current tier
    if (current.maxWeight <= current.minWeight) {
      errors.push(`Tier ${i + 1}: maxWeight (${current.maxWeight}) must be greater than minWeight (${current.minWeight})`);
    }

    if (current.price < 0) {
      errors.push(`Tier ${i + 1}: price cannot be negative`);
    }

    // Check for gaps (except between last tier and infinity)
    if (next && current.maxWeight !== next.minWeight) {
      warnings.push(`Gap between tier ${i + 1} (ends at ${current.maxWeight} kg) and tier ${i + 2} (starts at ${next.minWeight} kg)`);
    }

    // Check for overlaps
    if (next && current.maxWeight > next.minWeight) {
      errors.push(`Overlap between tier ${i + 1} (ends at ${current.maxWeight} kg) and tier ${i + 2} (starts at ${next.minWeight} kg)`);
    }
  }

  // Check if first tier starts at 0
  if (weightTiers[0].minWeight > 0) {
    warnings.push(`First tier starts at ${weightTiers[0].minWeight} kg. Packages below this weight will not be priced.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

