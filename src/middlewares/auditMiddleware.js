import { logAuditTrail } from "../Controllers/auditTrailController.js";

// Middleware to log audit trail for specific actions
export const auditMiddleware = (action, entityType) => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = function(data) {
      // Only log if the operation was successful
      if (data.status || data.success) {
        // Extract entity ID from response or request
        let entityId = null;
        if (data.data && data.data._id) {
          entityId = data.data._id;
        } else if (req.params.id) {
          entityId = req.params.id;
        }

        // Log the audit trail asynchronously
        setImmediate(async () => {
          try {
            await logAuditTrail({
              restaurantId: req.restaurantId,
              userId: req.user._id,
              action,
              entityType,
              entityId,
              details: {
                method: req.method,
                path: req.path,
                body: req.method !== 'GET' ? req.body : undefined
              },
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            });
          } catch (error) {
            console.error('Error logging audit trail:', error);
          }
        });
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Login audit middleware
export const loginAuditMiddleware = async (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (data.status && data.data && data.data.user) {
      setImmediate(async () => {
        try {
          await logAuditTrail({
            restaurantId: data.data.user.restaurantId,
            userId: data.data.user._id,
            action: "LOGIN",
            entityType: "Auth",
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });
        } catch (error) {
          console.error('Error logging login audit:', error);
        }
      });
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};