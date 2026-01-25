# Audit Trail Isolation Fix

## Problem
When creating a new restaurant in the admin dashboard, the audit trail was showing logs from the previous restaurant instead of being properly isolated per restaurant. This was a multi-tenant isolation issue.

## Root Cause
The issue was in two main areas:

### 1. Missing restaurantId in Audit Log Creation
The `logAction` function in `restaurantAuth.js` was not storing the `restaurantId` when creating audit logs:

**Before:**
```javascript
const logAction = async (userId, action, details, ipAddress) => {
  try {
    await AuditLog.create({ userId, action, details, ipAddress });
  } catch (error) {
    console.error("Audit log error:", error);
  }
};
```

**After:**
```javascript
const logAction = async (userId, action, details, ipAddress, restaurantId = null) => {
  try {
    await AuditLog.create({ userId, restaurantId, action, details, ipAddress });
  } catch (error) {
    console.error("Audit log error:", error);
  }
};
```

### 2. Missing restaurantId Filter in Audit Log Retrieval
The `getAuditLogs` function was fetching ALL audit logs instead of filtering by restaurant:

**Before:**
```javascript
export const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find({})
      .populate("userId", "name email role")
      .populate("orderId", "orderNumber")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ status: true, data: logs });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
```

**After:**
```javascript
export const getAuditLogs = async (req, res) => {
  try {
    // Build query with restaurant filtering
    const query = {};
    if (req.restaurantId) {
      query.restaurantId = req.restaurantId;
    }

    const logs = await AuditLog.find(query)
      .populate("userId", "name email role")
      .populate("orderId", "orderNumber")
      .populate("restaurantId", "name subdomain")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ status: true, data: logs });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
```

## Files Modified

### 1. `/src/Controllers/restaurantAuth.js`
- Updated `logAction` function to accept and store `restaurantId`
- Updated `getAuditLogs` function to filter by `restaurantId`
- Updated all `logAction` calls to pass the appropriate `restaurantId`

### 2. `/src/Controllers/platformOwnerController.js`
- Fixed `getActivityFeed` function to sort by `createdAt` instead of `timestamp`
- Added optional restaurant filtering for platform owner dashboard

### 3. `/src/models/auditLogModel.js`
- Verified schema is correct with proper timestamps

## Actions Updated
All the following actions now properly store and filter by `restaurantId`:
- LOGIN
- CREATE_USER
- TOGGLE_USER_STATUS
- AWARD_STAR
- CHANGE_PASSWORD
- FIRST_TIME_PASSWORD_CHANGE
- RESET_PASSWORD
- TOGGLE_MENU
- DELETE_USER
- ACCEPT_ORDER (already working)
- REJECT_ORDER (already working)
- UPDATE_STATUS (already working)

## Testing
A test script `test-audit-isolation.js` was created to verify the isolation is working correctly.

## Result
Now when a new restaurant is created:
1. All audit logs are properly tagged with the correct `restaurantId`
2. The audit trail page only shows logs for the current restaurant
3. Each restaurant's audit trail is completely isolated from others
4. Platform owner can still see all logs or filter by specific restaurant

## Verification Steps
1. Create a new restaurant
2. Perform some actions (login, create user, etc.)
3. Check the audit trail - should only show logs for that restaurant
4. Switch to another restaurant - should show different logs
5. Run the test script to verify database-level isolation