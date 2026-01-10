/**
 * Zone Service
 * Handles zone-related operations and lookups
 */

import dbConnect from './dbConnect';
import Tenant from '@/models/Tenant.model';
import Zone from '@/models/Zone.model';

/**
 * Get zone ID for a branch (tenant)
 * @param branchId - Branch/Tenant ID
 * @returns Zone ID or null if not assigned
 */
export async function getZoneByBranchId(branchId: string): Promise<string | null> {
  if (!branchId) {
    return null;
  }

  await dbConnect();

  try {
    const tenant = await Tenant.findById(branchId).select('zoneId').lean();
    return tenant?.zoneId ? tenant.zoneId.toString() : null;
  } catch (error) {
    console.error('Error getting zone by branch ID:', error);
    return null;
  }
}

/**
 * Get zone name by zone ID
 * @param zoneId - Zone ID
 * @returns Zone name or null if not found
 */
export async function getZoneName(zoneId: string): Promise<string | null> {
  if (!zoneId) {
    return null;
  }

  await dbConnect();

  try {
    const zone = await Zone.findById(zoneId).select('name').lean();
    return zone?.name || null;
  } catch (error) {
    console.error('Error getting zone name:', error);
    return null;
  }
}

/**
 * Get zone details by zone ID
 * @param zoneId - Zone ID
 * @returns Zone details or null if not found
 */
export async function getZoneDetails(zoneId: string): Promise<{
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
} | null> {
  if (!zoneId) {
    return null;
  }

  await dbConnect();

  try {
    const zone = await Zone.findById(zoneId).lean();
    if (!zone) {
      return null;
    }

    return {
      _id: zone._id.toString(),
      name: zone.name,
      description: zone.description,
      isActive: zone.isActive,
    };
  } catch (error) {
    console.error('Error getting zone details:', error);
    return null;
  }
}

/**
 * Get all active zones
 * @returns Array of active zones
 */
export async function getAllActiveZones(): Promise<Array<{
  _id: string;
  name: string;
  description?: string;
}>> {
  await dbConnect();

  try {
    const zones = await Zone.find({ isActive: true })
      .select('name description')
      .sort({ name: 1 })
      .lean();

    return zones.map(zone => ({
      _id: zone._id.toString(),
      name: zone.name,
      description: zone.description,
    }));
  } catch (error) {
    console.error('Error getting all active zones:', error);
    return [];
  }
}

/**
 * Get branches assigned to a zone
 * @param zoneId - Zone ID
 * @returns Array of branch IDs and names
 */
export async function getBranchesByZone(zoneId: string): Promise<Array<{
  _id: string;
  name: string;
}>> {
  if (!zoneId) {
    return [];
  }

  await dbConnect();

  try {
    const tenants = await Tenant.find({ zoneId })
      .select('name')
      .lean();

    return tenants.map(tenant => ({
      _id: tenant._id.toString(),
      name: tenant.name,
    }));
  } catch (error) {
    console.error('Error getting branches by zone:', error);
    return [];
  }
}

/**
 * Get zone information for origin and destination branches
 * @param originBranchId - Origin branch ID
 * @param destinationBranchId - Destination branch ID
 * @returns Zone information for both branches
 */
export async function getZonesForBranches(
  originBranchId: string,
  destinationBranchId: string
): Promise<{
  originZoneId: string | null;
  destinationZoneId: string | null;
  originZoneName: string | null;
  destinationZoneName: string | null;
  isSameZone: boolean;
}> {
  if (!originBranchId || !destinationBranchId) {
    return {
      originZoneId: null,
      destinationZoneId: null,
      originZoneName: null,
      destinationZoneName: null,
      isSameZone: false,
    };
  }

  await dbConnect();

  try {
    // Get zone IDs for both branches
    const [originZoneId, destinationZoneId] = await Promise.all([
      getZoneByBranchId(originBranchId),
      getZoneByBranchId(destinationBranchId),
    ]);

    // Get zone names
    const [originZoneName, destinationZoneName] = await Promise.all([
      originZoneId ? getZoneName(originZoneId) : null,
      destinationZoneId ? getZoneName(destinationZoneId) : null,
    ]);

    const isSameZone = originZoneId === destinationZoneId && originZoneId !== null;

    return {
      originZoneId,
      destinationZoneId,
      originZoneName,
      destinationZoneName,
      isSameZone,
    };
  } catch (error) {
    console.error('Error getting zones for branches:', error);
    return {
      originZoneId: null,
      destinationZoneId: null,
      originZoneName: null,
      destinationZoneName: null,
      isSameZone: false,
    };
  }
}

/**
 * Check if a branch has a zone assigned
 * @param branchId - Branch ID
 * @returns true if branch has a zone assigned
 */
export async function hasZoneAssigned(branchId: string): Promise<boolean> {
  const zoneId = await getZoneByBranchId(branchId);
  return zoneId !== null;
}

/**
 * Validate zone assignment for branches
 * Checks if both branches have zones assigned
 * @param originBranchId - Origin branch ID
 * @param destinationBranchId - Destination branch ID
 * @returns Validation result
 */
export async function validateZoneAssignment(
  originBranchId: string,
  destinationBranchId: string
): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const originZoneId = await getZoneByBranchId(originBranchId);
  const destinationZoneId = await getZoneByBranchId(destinationBranchId);

  if (!originZoneId) {
    errors.push('Origin branch does not have a zone assigned');
  }

  if (!destinationZoneId) {
    errors.push('Destination branch does not have a zone assigned');
  }

  if (originZoneId && destinationZoneId && originZoneId === destinationZoneId) {
    warnings.push('Both branches are in the same zone');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

