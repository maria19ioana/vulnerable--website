const { encrypt, decrypt } = require('./utils/encryption');

const testValue = '12345'; // This simulates an event ID or club ID

const encrypted = encrypt(testValue);
console.log('Encrypted:', encrypted);

const decrypted = decrypt(encrypted);
console.log('Decrypted:', decrypted);
