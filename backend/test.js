const { encrypt, decrypt } = require('./utils/encryption');

const testValue = '12345'; 

const encrypted = encrypt(testValue);
console.log('Encrypted:', encrypted);

const decrypted = decrypt(encrypted);
console.log('Decrypted:', decrypted);
