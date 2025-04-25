const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const key = crypto.scryptSync('secretpassword', 'salt', 32); // secure key generation
const iv = Buffer.alloc(16, 0); // fixed IV (initialization vector) for simplicity

function encrypt(text) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text.toString(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(encrypted) {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };
