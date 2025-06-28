const crypto = require('crypto');

// Test payment checksum calculation
const merchantId = "3832456837996201334";
const merchantSiteId = "184063";
const clientRequestId = "apple-pay-20250628223532-abpccg-payment";
const amount = "25.00";
const currency = "USD";
const timeStamp = "20250628223545";
const secretKey = "puT8KQYqIbbQDHN5cQNAlYyuDedZxRYjA9WmEsKq1wrIPhxQqOx77Ep1uOA7sUde";

// Calculate checksum with corrected order: merchantId, merchantSiteId, clientRequestId, amount, currency, timeStamp, merchantSecretKey
const concatenated = merchantId + merchantSiteId + clientRequestId + amount + currency + timeStamp + secretKey;

console.log('🔐 Payment checksum test:');
console.log(`merchantId: "${merchantId}"`);
console.log(`merchantSiteId: "${merchantSiteId}"`);
console.log(`clientRequestId: "${clientRequestId}"`);
console.log(`amount: "${amount}"`);
console.log(`currency: "${currency}"`);
console.log(`timeStamp: "${timeStamp}"`);
console.log(`secretKey: "${secretKey}"`);
console.log(`concatenated: "${concatenated}"`);
console.log(`concatenated length: ${concatenated.length}`);

const checksum = crypto.createHash('sha256').update(concatenated, 'utf8').digest('hex');
console.log(`checksum: ${checksum}`);
