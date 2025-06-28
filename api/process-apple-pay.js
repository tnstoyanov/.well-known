const crypto = require('crypto');

// Nuvei configuration
const NUVEI_CONFIG = {
    merchantId: "3832456837996201334",
    merchantSiteId: "184063",
    merchantSecretKey: "puT8KQYqIbbQDHN5cQNAlYyuDedZxRYjA9WmEsKq1wrIPhxQqOx77Ep1uOA7sUde",
    baseUrl: "https://ppp-test.nuvei.com/ppp/api/v1"
};

// URLs for payment flow
const URL_DETAILS = {
    successUrl: "https://tnstoyanov.wixsite.com/payment-response/success",
    failureUrl: "https://tnstoyanov.wixsite.com/payment-response/failed",
    pendingUrl: "https://tnstoyanov.wixsite.com/payment-response/pending",
    notificationUrl: "https://34028ab3c57f9867b19b64a815e6a373.m.pipedream.net"
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

// Utility function to calculate checksum
function calculateChecksum(params, secretKey) {
    const sortedKeys = Object.keys(params).sort();
    const concatenated = sortedKeys.map(key => params[key]).join('') + secretKey;
    return crypto.createHash('sha256').update(concatenated, 'utf8').digest('hex');
}

// Function to make API calls to Nuvei
async function makeNuveiRequest(endpoint, payload) {
    const url = `${NUVEI_CONFIG.baseUrl}/${endpoint}.do`;
    
    console.log(`🔗 Making request to: ${url}`);
    console.log('📤 Request payload:', JSON.stringify(payload, null, 2));
    
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'ApplePayNuveiIntegration/1.0'
            },
            body: JSON.stringify(payload)
        });
        
        const responseText = await response.text();
        console.log(`📥 Response status: ${response.status}`);
        console.log('📥 Response text:', responseText);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${responseText}`);
        }
        
        return JSON.parse(responseText);
    } catch (error) {
        console.error('❌ Nuvei API request failed:', error);
        throw error;
    }
}

// Serverless function handler
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
        console.log(`❌ Method ${req.method} not allowed`);
        return res.status(405).json({ 
            error: 'Method not allowed',
            message: `Expected POST, got ${req.method}` 
        });
    }
    
    console.log('🍎 Apple Pay processing started:', new Date().toISOString());
    console.log('📋 Request body:', req.body);
    
    try {
        const { paymentData, billingContact, amount } = req.body;
        
        if (!paymentData || !amount) {
            console.log('❌ Missing required fields');
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['paymentData', 'amount']
            });
        }
        
        // Generate unique order ID
        const timestamp = generateTimestamp();
        const orderId = `apple-pay-${timestamp}-${Math.random().toString(36).substring(2, 8)}`;
        
        console.log(`📝 Generated order ID: ${orderId}`);
        
        // Step 1: Open Order with Nuvei
        const openOrderParams = {
            merchantId: NUVEI_CONFIG.merchantId,
            merchantSiteId: NUVEI_CONFIG.merchantSiteId,
            clientRequestId: `${orderId}-open`,
            amount: amount.toString(),
            currency: "USD",
            timeStamp: timestamp
        };
        
        openOrderParams.checksum = calculateChecksum(openOrderParams, NUVEI_CONFIG.merchantSecretKey);
        
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
        
        // Step 2: Process Payment with Apple Pay token
        const paymentParams = {
            sessionToken: sessionToken,
            merchantId: NUVEI_CONFIG.merchantId,
            merchantSiteId: NUVEI_CONFIG.merchantSiteId,
            clientRequestId: `${orderId}-payment`,
            amount: amount.toString(),
            currency: "USD",
            paymentOption: {
                card: {
                    applePayToken: paymentData
                }
            },
            billingAddress: {},
            deviceDetails: {
                ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1'
            },
            urlDetails: URL_DETAILS,
            timeStamp: generateTimestamp()
        };
        
        // Add billing address if available
        if (billingContact) {
            if (billingContact.postalAddress) {
                paymentParams.billingAddress = {
                    firstName: billingContact.givenName || '',
                    lastName: billingContact.familyName || '',
                    address: billingContact.postalAddress.street || '',
                    city: billingContact.postalAddress.city || '',
                    state: billingContact.postalAddress.state || '',
                    zip: billingContact.postalAddress.postalCode || '',
                    country: billingContact.postalAddress.countryCode || 'US',
                    email: billingContact.emailAddress || ''
                };
            }
        }
        
        paymentParams.checksum = calculateChecksum(paymentParams, NUVEI_CONFIG.merchantSecretKey);
        
        console.log('💳 Processing payment with Nuvei...');
        const paymentResponse = await makeNuveiRequest('payment', paymentParams);
        
        console.log('💰 Payment response:', JSON.stringify(paymentResponse, null, 2));
        
        // Return success response
        res.status(200).json({
            success: true,
            orderId: orderId,
            transactionStatus: paymentResponse.transactionStatus,
            transactionId: paymentResponse.transactionId,
            nuveiResponse: paymentResponse
        });
        
    } catch (error) {
        console.error('❌ Payment processing failed:', error);
        res.status(500).json({ 
            error: 'Payment processing failed',
            message: error.message,
            details: error.stack
        });
    }
}
