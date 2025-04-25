const { verifyToken, secret } = require('./jwt');

const auth = (req, res, next) => {
  console.log('Auth middleware called for route:', req.path);
  
  // Get Authorization header
  const authHeader = req.headers.authorization;
  console.log('Headers received:', JSON.stringify(req.headers));
  console.log('Authorization header:', authHeader ? `${authHeader.substring(0, 15)}...` : 'not provided');
  
  if (!authHeader) {
    console.log('Authentication failed: No authorization header');
    return res.status(401).send('Access denied. No token provided.');
  }

  // Check for Bearer token format
  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    console.log('Authentication failed: Invalid token format');
    return res.status(401).send('Invalid token format. Use: Bearer <token>');
  }

  const token = tokenParts[1];
  console.log('Token to verify:', token.substring(0, 15) + '...');
  
  try {
    // Use our non-throwing verifyToken function
    const decoded = verifyToken(token);
    
    if (!decoded) {
      console.log('Token verification returned null - invalid token');
      return res.status(401).send('Invalid token.');
    }
    
    console.log('Token verified successfully for user ID:', decoded.id);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification exception:', err.message);
    return res.status(401).send('Invalid token.');
  }
};

module.exports = auth;
