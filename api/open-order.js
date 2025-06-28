const crypto = require('crypto');

// Nuvei configuration
const NUVEI_CONFIG = {
    merchantId: "3832456837996201334",
    merchantSiteId: "184063",
    merchantSecretKey: "puT8KQYqIbbQDHN5cQNAlYyuDedZxRYjA9WmEsKq1wrIPhxQqOx77Ep1uOA7sUde",
    baseUrl: "https://ppp-test.nuvei.com/ppp/api/v1"
};

// Utility function to generate timestamp
function generateTimestamp() {
    const now = new Date();
    return now.getFullYear().toString() +
           (now.getMonth() + 1).toString().padStart(2, '0') +
           now.getDate().toString().padStart(2, '0') +
           now.getHours().toString().padStart(2, '0') +
           now.getMinutes().toString().padStart(2, '0') +
           now.getSeconds().toString().padStart(2, '0');
}

// Utility function to calculate checksum for openOrder
function calculateOpenOrderChecksum(merchantId, merchantSiteId, clientRequestId, amount, currency, timeStamp, secretKey) {
    const merchantIdStr = String(merchantId);
    const merchantSiteIdStr = String(merchantSiteId);
    const clientRequestIdStr = String(clientRequestId);
    const amountStr = String(amount);
    const currencyStr = String(currency);
    const timeStampStr = String(timeStamp);
    const secretKeyStr = String(secretKey);
    
    const concatenated = merchantIdStr + merchantSiteIdStr + clientRequestIdStr + amountStr + currencyStr + timeStampStr + secretKeyStr;
    
    console.log('🔐 Checksum calculation for openOrder:');
    console.log(`   concatenated: "${concatenated}"`);
    
    const checksum = crypto.createHash('sha256').update(concatenated, 'utf8').digest('hex');
    console.log(`   checksum: ${checksum}`);
    return checksum;
}

// Function to make API calls to Nuvei
async function makeNuveiRequest(endpoint, payload) {
    const url = `${NUVEI_CONFIG.baseUrl}/${endpoint}.do`;
    
    console.log(`🔗 Making request to: ${url}`);
    console.log('📤 Request payload:', JSON.stringify(payload, null, 2));
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'ApplePayNuveiIntegration/1.0',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log(`📥 Response status: ${response.status}`);
        
        const responseText = await response.text();
        console.log('📥 Response text:', responseText);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${responseText}`);
        }
        
        return JSON.parse(responseText);
        
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Request timed out');
        }
        console.error('❌ Nuvei API request failed:', error);
        throw error;
    }
}

// Serverless function handler - STEP 1: Open Order (called on button click)
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed',
            message: `Expected POST, got ${req.method}` 
        });
    }
    
    console.log('🔓 Step 1: Opening order with Nuvei on button click');
    console.log('📋 Request body:', req.body);
    
    try {
        const { amount, currency = "USD" } = req.body;
        
        if (!amount) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['amount']
            });
        }
        
        // Generate unique order ID
        const timestamp = generateTimestamp();
        const orderId = `apple-pay-${timestamp}-${Math.random().toString(36).substring(2, 8)}`;
        const clientRequestId = `${orderId}-open`;
        
        console.log(`📝 Generated order ID: ${orderId}`);
        
        // Calculate checksum for openOrder
        const openOrderChecksum = calculateOpenOrderChecksum(
            NUVEI_CONFIG.merchantId,
            NUVEI_CONFIG.merchantSiteId, 
            clientRequestId,
            amount.toString(),
            currency,
            timestamp,
            NUVEI_CONFIG.merchantSecretKey
        );
        
        const openOrderParams = {
            merchantId: NUVEI_CONFIG.merchantId,
            merchantSiteId: NUVEI_CONFIG.merchantSiteId,
            clientRequestId: clientRequestId,
            amount: amount.toString(),
            currency: currency,
            timeStamp: timestamp,
            checksum: openOrderChecksum
        };
        
        console.log('🔓 Opening order with Nuvei...');
        const openOrderResponse = await makeNuveiRequest('openOrder', openOrderParams);
        
        if (openOrderResponse.status !== 'SUCCESS') {
            console.error('❌ Failed to open order:', openOrderResponse);
            return res.status(500).json({ 
                error: 'Failed to open order',
                details: openOrderResponse
            });
        }
        
        const sessionToken = openOrderResponse.sessionToken;
        console.log(`✅ Order opened successfully. Session token: ${sessionToken}`);
        
        // Return success with sessionToken - frontend will now show Apple Pay overlay
        res.status(200).json({
            success: true,
            sessionToken: sessionToken,
            orderId: orderId,
            amount: amount,
            currency: currency,
            message: 'Order opened successfully. Ready for Apple Pay.'
        });
        
    } catch (error) {
        console.error('❌ Failed to open order:', error);
        res.status(500).json({ 
            error: 'Failed to open order',
            message: error.message
        });
    }
}
