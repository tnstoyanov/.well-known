const crypto = require('crypto');

// Test checksum calculation locally
const merchantId = "3832456837996201334";
const merchantSiteId = "184063";
const clientRequestId = "apple-pay-20250628214551-c06zja-open";
const amount = "10.00";
const currency = "USD";
const timeStamp = "20250628214551";
const secretKey = "puT8KQYqIbbQDHN5cQNAlYyuDedZxRYjA9WmEsKq1wrIPhxQqOx77Ep1uOA7sUde";

// Concatenate in exact order: merchantId, merchantSiteId, clientRequestId, amount, currency, timeStamp, merchantSecretKey
const concatenated = merchantId + merchantSiteId + clientRequestId + amount + currency + timeStamp + secretKey;

console.log('🔐 Local checksum test:');
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

// Test the exact payload structure
const payload = {
    merchantId: merchantId,
    merchantSiteId: merchantSiteId,
    clientRequestId: clientRequestId,
    amount: amount,
    currency: currency,
    timeStamp: timeStamp,
    checksum: checksum
};

console.log('\n📤 Payload that would be sent:');
console.log(JSON.stringify(payload, null, 2));
