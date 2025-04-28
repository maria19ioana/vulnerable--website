const jwt = require('jsonwebtoken');

const SECRET = 'supersecret';

function sign(user) {
  console.log(`Signing token for user: ${user.username} (ID: ${user.id})`);
  
  const isSuperUser = user.isSuperUser || user.is_superuser === 1; // <- TRUST database value

  const token = jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role, 
      email: user.email,
      isSuperUser: isSuperUser 
    },
    SECRET,
    { algorithm: 'HS256' }
  );
  
  console.log(`Token generated: ${token.substring(0, 20)}...`);
  return token;
}



function signInvite(data) {
  console.log(`Signing invite token for: ${data.email} (Club: ${data.group}, Role: ${data.level})`);
  const token = jwt.sign(
    { 
      group: data.group,        // Club ID
      email: data.email,        // Invited email 
      level: data.level,        // Role (member, admin, etc)
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days expiration
    },
    SECRET,
    { algorithm: 'HS256' }
  );
  console.log(`Invite token generated: ${token.substring(0, 20)}...`);
  return token;
}

function decode(token) {
  try {
    return jwt.decode(token);
  } catch (err) {
    console.error('JWT decode error:', err.message);
    return null;
  }
}

function verify(token) {
  try {
    const decodedHeader = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString('utf-8'));

    if (decodedHeader.alg === 'none') {
      console.log('Warning: Detected JWT "none" algorithm attack attempt!');
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf-8'));
      console.log('Payload from none algorithm:', payload);
      return payload; // Vulnerable by design
    }

    const decoded = jwt.verify(token, SECRET);
    console.log(`Token verified successfully for: ${decoded.username || decoded.email || 'unknown'}`);
    return decoded;
  } catch (err) {
    console.error('JWT verification error:', err.message);
    throw err;
  }
}

function verifyToken(token) {
  try {
    return verify(token);
  } catch (err) {
    console.error('JWT token verification failed:', err.message);
    return null;
  }
}

function debugToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { error: 'Invalid token format - not a valid JWT token' };
    }
    
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf-8'));
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    
    return {
      header,
      payload,
      signature: parts[2].substring(0, 10) + '...'
    };
  } catch (err) {
    return { error: `Could not parse token: ${err.message}` };
  }
}

module.exports = { sign, signInvite, verify, verifyToken, debugToken, decode, secret: SECRET };
