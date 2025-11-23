// API Reference: Branch-to-Branch Transfer Workflow

/**
 * MANIFEST SYSTEM - Branch-to-Branch Transfer API
 * 
 * This system handles the complete workflow for transferring packages between branches.
 * 
 * WORKFLOW PHASES:
 * 
 * Phase 1: Preparation at Origin Branch
 * - Shipments are created with status "At Origin Branch"
 * - Shipments have originBranchId, destinationBranchId, and currentBranchId fields
 * - Packages are waiting to be dispatched
 * 
 * Phase 2: Dispatch from Origin Branch
 * - Admin selects shipments to dispatch
 * - Creates a Manifest with origin branch, destination branch, and shipment list
 * - System updates all shipment statuses to "In Transit to Destination"
 * 
 * Phase 3: In Transit
 * - Manifest status: "In Transit"
 * - Destination branch can see the incoming manifest
 * - Packages are physically being transported
 * 
 * Phase 4: Receiving at Destination Branch
 * - Destination branch admin receives the manifest
 * - System updates manifest status to "Completed"
 * - All shipments are updated to "At Destination Branch"
 * - currentBranchId is updated to the destination branch
 * 
 * ============================================================================
 * API ENDPOINTS
 * ============================================================================
 */

// ============================================================================
// 1. GET /api/manifests - Fetch Manifests
// ============================================================================

/**
 * Fetch manifests for the current branch
 * 
 * Query Parameters:
 *   - type: 'incoming' | 'outgoing' (optional)
 *     - 'incoming': Manifests being received at current branch (toBranchId = current)
 *     - 'outgoing': Manifests being dispatched from current branch (fromBranchId = current)
 *     - Omit for all manifests
 *   - status: 'In Transit' | 'Completed' (optional)
 * 
 * Authentication: Required (Bearer token in cookie)
 * Authorization: Admin role
 * 
 * Response:
 *   [
 *     {
 *       _id: ObjectId,
 *       fromBranchId: { _id: ObjectId, name: string },
 *       toBranchId: { _id: ObjectId, name: string },
 *       shipmentIds: [ObjectId],
 *       status: 'In Transit' | 'Completed',
 *       vehicleNumber: string (optional),
 *       driverName: string (optional),
 *       dispatchedAt: Date,
 *       receivedAt: Date (optional),
 *       notes: string (optional),
 *       createdAt: Date,
 *       updatedAt: Date
 *     }
 *   ]
 * 
 * Example:
 *   GET /api/manifests?type=incoming&status=In Transit
 *   GET /api/manifests?type=outgoing
 */

// ============================================================================
// 2. POST /api/manifests - Create Manifest (Dispatch Shipments)
// ============================================================================

/**
 * Create a manifest to dispatch shipments from origin to destination branch
 * 
 * This is the key operation in Phase 2: Dispatch from Origin Branch
 * 
 * Authentication: Required (Bearer token in cookie)
 * Authorization: Admin role
 * 
 * Request Body:
 * {
 *   toBranchId: string (ObjectId),                    // Required: Destination branch ID
 *   shipmentIds: string[] (array of ObjectIds),       // Required: Shipments to dispatch
 *   vehicleNumber: string (optional),                 // Truck/vehicle identifier
 *   driverName: string (optional),                    // Driver's name
 *   notes: string (optional)                          // Additional notes
 * }
 * 
 * Response (201 Created):
 * {
 *   _id: ObjectId,
 *   fromBranchId: ObjectId (set to current user's tenantId),
 *   toBranchId: ObjectId,
 *   shipmentIds: [ObjectId],
 *   status: 'In Transit',
 *   vehicleNumber: string,
 *   driverName: string,
 *   dispatchedAt: Date (set to current time),
 *   notes: string
 * }
 * 
 * Errors:
 *   400: Invalid request (missing toBranchId, empty shipmentIds, etc.)
 *   400: Some shipments do not exist, are not at origin branch, or have wrong status
 *   401: Unauthorized
 *   403: Forbidden (not an admin)
 * 
 * Side Effects:
 *   - Creates a new Manifest document
 *   - Updates all shipments:
 *     - status → "In Transit to Destination"
 *     - Adds entry to statusHistory with note about manifest dispatch
 * 
 * Example:
 *   POST /api/manifests
 *   {
 *     "toBranchId": "507f1f77bcf86cd799439011",
 *     "shipmentIds": ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
 *     "vehicleNumber": "KA01AB1234",
 *     "driverName": "Ramesh Kumar"
 *   }
 */

// ============================================================================
// 3. GET /api/manifests/[manifestId] - Get Single Manifest
// ============================================================================

/**
 * Fetch a single manifest with all details
 * 
 * Authentication: Required (Bearer token in cookie)
 * Authorization: Admin from origin or destination branch
 * 
 * Response (200 OK):
 * {
 *   _id: ObjectId,
 *   fromBranchId: { _id: ObjectId, name: string },
 *   toBranchId: { _id: ObjectId, name: string },
 *   shipmentIds: [
 *     {
 *       _id: ObjectId,
 *       trackingId: string,
 *       status: string,
 *       sender: { name, address, phone },
 *       recipient: { name, address, phone },
 *       originBranchId: ObjectId,
 *       destinationBranchId: ObjectId,
 *       currentBranchId: ObjectId,
 *       ... (full shipment details)
 *     }
 *   ],
 *   status: 'In Transit' | 'Completed',
 *   vehicleNumber: string,
 *   driverName: string,
 *   dispatchedAt: Date,
 *   receivedAt: Date (optional),
 *   notes: string
 * }
 * 
 * Errors:
 *   404: Manifest not found
 *   403: Forbidden (not authorized to view this manifest)
 *   401: Unauthorized
 * 
 * Example:
 *   GET /api/manifests/507f1f77bcf86cd799439011
 */

// ============================================================================
// 4. PUT /api/manifests/[manifestId]/receive - Receive Manifest
// ============================================================================

/**
 * Receive a manifest at the destination branch
 * 
 * This is the key operation in Phase 4: Receiving at Destination Branch
 * 
 * Authentication: Required (Bearer token in cookie)
 * Authorization: Admin role from destination branch
 * 
 * Request Body: {} (empty, or can include verification/notes)
 * 
 * Response (200 OK):
 * {
 *   _id: ObjectId,
 *   fromBranchId: ObjectId,
 *   toBranchId: ObjectId,
 *   shipmentIds: [ObjectId],
 *   status: 'Completed',
 *   vehicleNumber: string,
 *   driverName: string,
 *   dispatchedAt: Date,
 *   receivedAt: Date (set to current time),
 *   notes: string
 * }
 * 
 * Errors:
 *   404: Manifest not found
 *   400: Invalid manifest status (not "In Transit")
 *   403: Forbidden (not from destination branch)
 *   401: Unauthorized
 * 
 * Side Effects:
 *   - Updates Manifest:
 *     - status → "Completed"
 *     - receivedAt → current timestamp
 *   - Updates all associated Shipments:
 *     - status → "At Destination Branch"
 *     - currentBranchId → destination branch ID
 *     - Adds entry to statusHistory
 * 
 * Example:
 *   PUT /api/manifests/507f1f77bcf86cd799439011/receive
 *   {}
 */

// ============================================================================
// 5. GET /api/manifests/available-shipments - Get Available Shipments
// ============================================================================

/**
 * Get shipments available for dispatch at the origin branch
 * 
 * Returns all shipments in "At Origin Branch" status at the current branch
 * 
 * Authentication: Required (Bearer token in cookie)
 * Authorization: Admin role
 * 
 * Query Parameters:
 *   - destinationBranchId: string (ObjectId) (optional)
 *     - Filter by destination branch
 * 
 * Response (200 OK):
 * [
 *   {
 *     _id: ObjectId,
 *     trackingId: string,
 *     status: 'At Origin Branch',
 *     sender: { name, address, phone },
 *     recipient: { name, address, phone },
 *     packageInfo: { weight, type, details },
 *     originBranchId: { _id: ObjectId, name: string },
 *     destinationBranchId: { _id: ObjectId, name: string },
 *     currentBranchId: ObjectId,
 *     createdAt: Date,
 *     updatedAt: Date
 *   }
 * ]
 * 
 * Example:
 *   GET /api/manifests/available-shipments
 *   GET /api/manifests/available-shipments?destinationBranchId=507f1f77bcf86cd799439011
 */

// ============================================================================
// 6. POST /api/shipments - Create Shipment
// ============================================================================

/**
 * Create a new shipment with branch tracking information
 * 
 * This sets the foundation for the entire workflow
 * 
 * Authentication: Required (Bearer token in cookie)
 * Authorization: Admin role
 * 
 * Request Body:
 * {
 *   sender: { name, address, phone },                 // Required
 *   recipient: { name, address, phone },              // Required
 *   packageInfo: { weight, type, details },           // Required
 *   originBranchId: string (ObjectId),                // Required: Where shipment starts
 *   destinationBranchId: string (ObjectId),           // Required: Final destination
 *   assignedTo: string (ObjectId) (optional)          // Driver to assign to
 * }
 * 
 * Response (201 Created):
 * {
 *   _id: ObjectId,
 *   trackingId: string (auto-generated, e.g., "TRK-ABC123DEF45"),
 *   tenantId: ObjectId (current branch),
 *   originBranchId: ObjectId,
 *   destinationBranchId: ObjectId,
 *   currentBranchId: ObjectId (set to originBranchId initially),
 *   status: 'At Origin Branch',
 *   sender: { name, address, phone },
 *   recipient: { name, address, phone },
 *   packageInfo: { weight, type, details },
 *   statusHistory: [
 *     { status: 'At Origin Branch', timestamp: Date }
 *   ],
 *   createdAt: Date,
 *   updatedAt: Date
 * }
 * 
 * Errors:
 *   400: originBranchId and destinationBranchId are required
 *   400: Validation error (missing required fields)
 *   401: Unauthorized
 *   403: Forbidden (not an admin)
 * 
 * Example:
 *   POST /api/shipments
 *   {
 *     "sender": {
 *       "name": "John Sender",
 *       "address": "123 Chennai Road, Chennai",
 *       "phone": "9876543210"
 *     },
 *     "recipient": {
 *       "name": "Jane Recipient",
 *       "address": "456 Madurai Street, Madurai",
 *       "phone": "9123456789"
 *     },
 *     "packageInfo": {
 *       "weight": 2.5,
 *       "type": "Parcel",
 *       "details": "Electronics - Fragile"
 *     },
 *     "originBranchId": "507f1f77bcf86cd799439010",
 *     "destinationBranchId": "507f1f77bcf86cd799439011"
 *   }
 */

// ============================================================================
// SHIPMENT STATUSES AND TRANSITIONS
// ============================================================================

/**
 * Status Transitions for Shipment:
 * 
 * Branch-to-Branch Transfer States:
 *   "At Origin Branch"           → Initial state at origin branch
 *   "In Transit to Destination"  → Being transported between branches
 *   "At Destination Branch"      → Arrived at final destination branch
 * 
 * Local Delivery States (at destination branch):
 *   "Assigned"                   → Assigned to a delivery driver
 *   "Out for Delivery"           → Driver is delivering the package
 *   "Delivered"                  → Successfully delivered
 *   "Failed"                     → Delivery failed
 * 
 * Flow Example:
 *   At Origin Branch
 *     ↓ (Create Manifest and Dispatch)
 *   In Transit to Destination
 *     ↓ (Receive Manifest)
 *   At Destination Branch
 *     ↓ (Assign to Driver)
 *   Assigned
 *     ↓ (Start Delivery)
 *   Out for Delivery
 *     ↓ (Complete Delivery)
 *   Delivered
 */

// ============================================================================
// KEY FIELDS IN SHIPMENT
// ============================================================================

/**
 * Important Fields:
 * 
 * - tenantId: The current branch holding the package
 *   (Updated during manifest receipt at destination)
 * 
 * - originBranchId: The branch where the shipment was initially created
 *   (Constant - never changes)
 * 
 * - destinationBranchId: The final destination branch
 *   (Constant - never changes)
 * 
 * - currentBranchId: The branch currently responsible for the package
 *   (Updated to tenantId after manifest receipt)
 *   Initially same as originBranchId
 *   Updated to destinationBranchId when manifest is received
 * 
 * - status: Current state of the package
 *   Updated during dispatch (to "In Transit to Destination")
 *   Updated during receipt (to "At Destination Branch")
 *   Updated during delivery operations (Assigned, Out for Delivery, etc.)
 * 
 * - statusHistory: Complete audit trail
 *   Records every status change with timestamp and notes
 *   Includes references to manifests when applicable
 */

// ============================================================================
// EXAMPLE WORKFLOW SEQUENCE
// ============================================================================

/**
 * 1. Chennai Admin creates shipment from Chennai to Madurai:
 *    POST /api/shipments
 *    Response: status = "At Origin Branch", currentBranchId = Chennai
 * 
 * 2. Chennai Admin views available shipments for dispatch:
 *    GET /api/manifests/available-shipments
 *    Returns: All "At Origin Branch" shipments
 * 
 * 3. Chennai Admin dispatches selected shipments:
 *    POST /api/manifests
 *    {
 *      "toBranchId": "madurai_id",
 *      "shipmentIds": ["shipment1_id", "shipment2_id"],
 *      "vehicleNumber": "KA01AB1234",
 *      "driverName": "Ramesh Kumar"
 *    }
 *    Result: 
 *      - Manifest created with status "In Transit"
 *      - All shipments updated to status "In Transit to Destination"
 * 
 * 4. Madurai Admin views incoming manifests:
 *    GET /api/manifests?type=incoming
 *    Returns: Manifests with status "In Transit" where toBranchId = Madurai
 * 
 * 5. Madurai Admin receives the manifest:
 *    PUT /api/manifests/manifest_id/receive
 *    Result:
 *      - Manifest status → "Completed"
 *      - Manifest receivedAt → current timestamp
 *      - All shipments:
 *        - status → "At Destination Branch"
 *        - currentBranchId → Madurai
 *        - tenantId → Madurai
 * 
 * 6. Madurai Admin assigns shipments to drivers:
 *    (Uses existing assignment logic for "Assigned" status)
 * 
 * 7. Driver picks up and delivers:
 *    (Uses existing delivery workflow: "Out for Delivery" → "Delivered")
 */

export {};
