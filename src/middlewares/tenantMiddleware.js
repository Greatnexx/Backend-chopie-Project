import Restaurant from "../models/restaurantModel.js";

export const tenantMiddleware = async (req, res, next) => {
  try {
    let restaurantId = null;

    // Method 1: Get from X-Tenant-Subdomain header (highest priority for path-based routing)
    if (!restaurantId && req.headers['x-tenant-subdomain']) {
      const subdomain = req.headers['x-tenant-subdomain'];
      const restaurant = await Restaurant.findOne({ 
        subdomain: subdomain.toLowerCase(),
        isActive: true 
      });
      if (restaurant) {
        restaurantId = restaurant._id;
      }
    }

    // Method 2: Get from subdomain in hostname
    if (!restaurantId) {
      const host = req.get('host') || req.headers.host;
      if (host) {
        const subdomain = host.split('.')[0];
        const knownBackendHosts = ['backend-chopie-project', 'localhost', '127', 'api', 'www'];
        if (subdomain && !knownBackendHosts.includes(subdomain)) {
          const restaurant = await Restaurant.findOne({ 
            subdomain: subdomain.toLowerCase(),
            isActive: true 
          });
          if (restaurant) {
            restaurantId = restaurant._id;
          }
        }
      }
    }

    // Method 3: Get from URL path (e.g., /r/danny)
    if (!restaurantId && req.path) {
      const pathMatch = req.path.match(/^\/r\/([^/]+)/);
      if (pathMatch) {
        const subdomain = pathMatch[1];
        const restaurant = await Restaurant.findOne({ 
          subdomain: subdomain.toLowerCase(),
          isActive: true 
        });
        if (restaurant) {
          restaurantId = restaurant._id;
        }
      }
    }

    // Method 4: Get from X-Restaurant-ID header
    if (!restaurantId && req.headers['x-restaurant-id']) {
      restaurantId = req.headers['x-restaurant-id'];
    }

    // Method 5: Get from authenticated user's restaurantId
    if (!restaurantId && req.user && req.user.restaurantId) {
      restaurantId = req.user.restaurantId;
    }

    // Method 6: Get from query parameter (for development)
    if (!restaurantId && req.query.restaurantId) {
      restaurantId = req.query.restaurantId;
    }

    if (restaurantId) {
      // Verify restaurant exists and is active
      const restaurant = await Restaurant.findOne({
        _id: restaurantId,
        isActive: true
      });

      if (restaurant) {
        req.restaurantId = restaurantId;
        req.restaurant = restaurant;
      }
    }

    next();
  } catch (error) {
    next();
  }
};

export const requireTenant = (req, res, next) => {
  if (!req.restaurantId) {
    return res.status(400).json({
      status: false,
      message: "Restaurant context required"
    });
  }
  next();
};