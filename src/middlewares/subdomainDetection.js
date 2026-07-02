export const detectSubdomain = (req, res, next) => {
  const host = req.get('host') || req.headers.host;
  
  if (!host) {
    return next();
  }

  // Extract subdomain from host
  const parts = host.split('.');
  
  // For development (localhost:3000) or main domain
  if (parts.length <= 2 || host.includes('localhost') || host.includes('127.0.0.1')) {
    req.subdomain = null;
    return next();
  }

  // Extract subdomain (first part)
  const subdomain = parts[0];
  
  // Skip common subdomains
  if (['www', 'api', 'admin'].includes(subdomain)) {
    req.subdomain = null;
    return next();
  }

  req.subdomain = subdomain;
  next();
};