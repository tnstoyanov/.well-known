const crypto = require('crypto');

// Nuvei configuration
const NUVEI_CONFIG = {
    merchantId: "3832456837996201334",
    merchantSiteId: "184063",
    merchantSecretKey: "puT8KQYqIbbQDHN5cQNAlYyuDedZxRYjA9WmEsKq1wrIPhxQqOx77Ep1uOA7sUde", // Exact string as provided
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

// Utility function to calculate checksum for openOrder
function calculateOpenOrderChecksum(merchantId, merchantSiteId, clientRequestId, amount, currency, timeStamp, secretKey) {
    // Concatenate in exact order: merchantId, merchantSiteId, clientRequestId, amount, currency, timeStamp, merchantSecretKey
    // Make sure all values are strings and concatenated without spaces
    const merchantIdStr = String(merchantId);
    const merchantSiteIdStr = String(merchantSiteId);
    const clientRequestIdStr = String(clientRequestId);
    const amountStr = String(amount);
    const currencyStr = String(currency);
    const timeStampStr = String(timeStamp);
    const secretKeyStr = String(secretKey);
    
    const concatenated = merchantIdStr + merchantSiteIdStr + clientRequestIdStr + amountStr + currencyStr + timeStampStr + secretKeyStr;
    
    console.log('🔐 Checksum calculation for openOrder:');
    console.log(`   merchantId: "${merchantIdStr}"`);
    console.log(`   merchantSiteId: "${merchantSiteIdStr}"`);
    console.log(`   clientRequestId: "${clientRequestIdStr}"`);
    console.log(`   amount: "${amountStr}"`);
    console.log(`   currency: "${currencyStr}"`);
    console.log(`   timeStamp: "${timeStampStr}"`);
    console.log(`   secretKey: "${secretKeyStr}"`);
    console.log(`   concatenated: "${concatenated}"`);
    console.log(`   concatenated length: ${concatenated.length}`);
    
    const checksum = crypto.createHash('sha256').update(concatenated, 'utf8').digest('hex');
    console.log(`   checksum: ${checksum}`);
    return checksum;
}

// Utility function to calculate checksum for payment (specific order for payment API)
function calculatePaymentChecksum(sessionToken, merchantId, merchantSiteId, clientRequestId, amount, currency, timeStamp, secretKey) {
    // For payment API, the order might be different. Let's try the most common pattern:
    // sessionToken, merchantId, merchantSiteId, clientRequestId, amount, currency, timeStamp, secretKey
    const sessionTokenStr = String(sessionToken);
    const merchantIdStr = String(merchantId);
    const merchantSiteIdStr = String(merchantSiteId);
    const clientRequestIdStr = String(clientRequestId);
    const amountStr = String(amount);
    const currencyStr = String(currency);
    const timeStampStr = String(timeStamp);
    const secretKeyStr = String(secretKey);
    
    const concatenated = sessionTokenStr + merchantIdStr + merchantSiteIdStr + clientRequestIdStr + amountStr + currencyStr + timeStampStr + secretKeyStr;
    
    console.log('🔐 Checksum calculation for payment:');
    console.log(`   sessionToken: "${sessionTokenStr}"`);
    console.log(`   merchantId: "${merchantIdStr}"`);
    console.log(`   merchantSiteId: "${merchantSiteIdStr}"`);
    console.log(`   clientRequestId: "${clientRequestIdStr}"`);
    console.log(`   amount: "${amountStr}"`);
    console.log(`   currency: "${currencyStr}"`);
    console.log(`   timeStamp: "${timeStampStr}"`);
    console.log(`   secretKey: "${secretKeyStr}"`);
    console.log(`   concatenated: "${concatenated}"`);
    console.log(`   concatenated length: ${concatenated.length}`);
    
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
        // Use fetch with better error handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
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
        console.log(`📥 Response headers:`, Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('📥 Response text:', responseText);
        
        if (!response.ok) {
            console.error(`❌ HTTP Error ${response.status}: ${response.statusText}`);
            throw new Error(`HTTP ${response.status} ${response.statusText}: ${responseText}`);
        }
        
        // Try to parse JSON response
        try {
            const jsonResponse = JSON.parse(responseText);
            console.log('✅ Successfully parsed JSON response');
            return jsonResponse;
        } catch (parseError) {
            console.error('❌ Failed to parse JSON response:', parseError);
            console.error('❌ Raw response text:', responseText);
            throw new Error(`Invalid JSON response: ${parseError.message}`);
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('❌ Request timed out after 15 seconds');
            throw new Error('Request timed out - Nuvei API did not respond within 15 seconds');
        }
        
        console.error('❌ Nuvei API request failed:', error);
        console.error('❌ Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
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
        
        console.log('✅ Basic validation passed');
        console.log(`💰 Processing payment of ${amount} with data: ${paymentData.substring(0, 20)}...`);
        
        // Generate unique order ID
        const timestamp = generateTimestamp();
        const orderId = `apple-pay-${timestamp}-${Math.random().toString(36).substring(2, 8)}`;
        
        console.log(`📝 Generated order ID: ${orderId}`);
        console.log(`⏰ Timestamp: ${timestamp}`);
        console.log('🔍 Verifying Nuvei config:');
        console.log(`   merchantId: "${NUVEI_CONFIG.merchantId}"`);
        console.log(`   merchantSiteId: "${NUVEI_CONFIG.merchantSiteId}"`);
        console.log(`   secretKey length: ${NUVEI_CONFIG.merchantSecretKey.length}`);
        console.log(`   secretKey starts with: "${NUVEI_CONFIG.merchantSecretKey.substring(0, 10)}..."`);
        
        // Step 1: Open Order with Nuvei
        const clientRequestId = `${orderId}-open`;
        const openOrderAmount = amount.toString();
        const currency = "USD";
        
        // Calculate checksum in the exact order specified
        const openOrderChecksum = calculateOpenOrderChecksum(
            NUVEI_CONFIG.merchantId,
            NUVEI_CONFIG.merchantSiteId, 
            clientRequestId,
            openOrderAmount,
            currency,
            timestamp,
            NUVEI_CONFIG.merchantSecretKey
        );
        
        const openOrderParams = {
            merchantId: NUVEI_CONFIG.merchantId,
            merchantSiteId: NUVEI_CONFIG.merchantSiteId,
            clientRequestId: clientRequestId,
            amount: openOrderAmount,
            currency: currency,
            timeStamp: timestamp,
            checksum: openOrderChecksum
        };
        
        console.log('🔓 Opening order with Nuvei...');
        console.log('📤 About to send openOrder request with params:', JSON.stringify(openOrderParams, null, 2));
        
        let openOrderResponse;
        try {
            openOrderResponse = await makeNuveiRequest('openOrder', openOrderParams);
            console.log('✅ openOrder request completed successfully');
        } catch (openOrderError) {
            console.error('❌ openOrder request failed:', openOrderError);
            return res.status(500).json({ 
                error: 'Failed to communicate with Nuvei openOrder API',
                message: openOrderError.message,
                details: {
                    url: `${NUVEI_CONFIG.baseUrl}/openOrder.do`,
                    payload: openOrderParams,
                    errorType: openOrderError.name || 'Unknown'
                }
            });
        }
        
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
        const paymentTimestamp = generateTimestamp();
        const paymentClientRequestId = `${orderId}-payment`;
        
        const paymentParams = {
            sessionToken: sessionToken,
            merchantId: NUVEI_CONFIG.merchantId,
            merchantSiteId: NUVEI_CONFIG.merchantSiteId,
            clientRequestId: paymentClientRequestId,
            amount: amount.toString(),
            currency: "USD",
            paymentOption: {
                card: {
                    externalToken: {
                        externalTokenProvider: "ApplePay",
                        mobileToken: paymentData
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
        
        // Calculate payment checksum with the correct parameters
        paymentParams.checksum = calculatePaymentChecksum(
            sessionToken,
            NUVEI_CONFIG.merchantId,
            NUVEI_CONFIG.merchantSiteId,
            paymentClientRequestId,
            amount.toString(),
            "USD",
            paymentTimestamp,
            NUVEI_CONFIG.merchantSecretKey
        );
        
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
