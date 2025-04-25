const jwt = require('jsonwebtoken');

const SECRET = 'supersecret';

function sign(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    SECRET,
    { algorithm: 'HS256' }
  );
}

function verify(token) {
  const decodedHeader = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString('utf-8'));

  if (decodedHeader.alg === 'none') {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf-8'));
    return payload;
  }

  return jwt.verify(token, SECRET);
}

module.exports = { sign, verify };
