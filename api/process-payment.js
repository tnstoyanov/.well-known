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

// Utility function to calculate checksum for payment
function calculatePaymentChecksum(merchantId, merchantSiteId, clientRequestId, amount, currency, timeStamp, secretKey) {
    // For payment API, use the same order as openOrder: merchantId, merchantSiteId, clientRequestId, amount, currency, timeStamp, merchantSecretKey
    const merchantIdStr = String(merchantId);
    const merchantSiteIdStr = String(merchantSiteId);
    const clientRequestIdStr = String(clientRequestId);
    const amountStr = String(amount);
    const currencyStr = String(currency);
    const timeStampStr = String(timeStamp);
    const secretKeyStr = String(secretKey);
    
    const concatenated = merchantIdStr + merchantSiteIdStr + clientRequestIdStr + amountStr + currencyStr + timeStampStr + secretKeyStr;
    
    console.log('🔐 Checksum calculation for payment:');
    console.log(`   merchantId: "${merchantIdStr}"`);
    console.log(`   merchantSiteId: "${merchantSiteIdStr}"`);
    console.log(`   clientRequestId: "${clientRequestIdStr}"`);
    console.log(`   amount: "${amountStr}"`);
    console.log(`   currency: "${currencyStr}"`);
    console.log(`   timeStamp: "${timeStampStr}"`);
    console.log(`   secretKey: "${secretKeyStr}"`);
    console.log(`   concatenated: "${concatenated}"`);
    
    const checksum = crypto.createHash('sha256').update(concatenated, 'utf8').digest('hex');
    console.log(`   payment checksum: ${checksum}`);
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

// Serverless function handler - STEP 3: Process Payment (called after Apple Pay completion)
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
    
    console.log('💳 Step 3: Processing payment after Apple Pay completion');
    console.log('📋 Request body:', req.body);
    
    try {
        const { sessionToken, orderId, applePayToken, billingContact, amount, currency = "USD" } = req.body;
        
        if (!sessionToken || !orderId || !applePayToken || !amount) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['sessionToken', 'orderId', 'applePayToken', 'amount']
            });
        }
        
        console.log(`💰 Processing payment for order: ${orderId}`);
        console.log(`🔑 Using session token: ${sessionToken}`);
        
        // Generate payment request
        const paymentTimestamp = generateTimestamp();
        const paymentClientRequestId = `${orderId}-payment`;
        
        const paymentParams = {
            sessionToken: sessionToken,
            merchantId: NUVEI_CONFIG.merchantId,
            merchantSiteId: NUVEI_CONFIG.merchantSiteId,
            clientRequestId: paymentClientRequestId,
            amount: amount.toString(),
            currency: currency,
            paymentOption: {
                card: {
                    externalToken: {
                        externalTokenProvider: "ApplePay",
                        mobileToken: applePayToken
                    }
                }
            },
            billingAddress: {},
            deviceDetails: {
                ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1'
            },
            urlDetails: URL_DETAILS,
            timeStamp: paymentTimestamp
        };
        
        // Add billing address if available
        if (billingContact && billingContact.postalAddress) {
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
        
        // Calculate payment checksum (same order as openOrder: merchantId, merchantSiteId, clientRequestId, amount, currency, timeStamp, merchantSecretKey)
        paymentParams.checksum = calculatePaymentChecksum(
            NUVEI_CONFIG.merchantId,
            NUVEI_CONFIG.merchantSiteId,
            paymentClientRequestId,
            amount.toString(),
            currency,
            paymentTimestamp,
            NUVEI_CONFIG.merchantSecretKey
        );
        
        console.log('💳 Processing payment with Nuvei...');
        const paymentResponse = await makeNuveiRequest('payment', paymentParams);
        
        console.log('💰 Payment response:', JSON.stringify(paymentResponse, null, 2));
        
        // Return payment result
        res.status(200).json({
            success: true,
            orderId: orderId,
            transactionStatus: paymentResponse.transactionStatus,
            transactionId: paymentResponse.transactionId,
            approved: paymentResponse.transactionStatus === 'APPROVED',
            nuveiResponse: paymentResponse
        });
        
    } catch (error) {
        console.error('❌ Payment processing failed:', error);
        res.status(500).json({ 
            error: 'Payment processing failed',
            message: error.message
        });
    }
}
