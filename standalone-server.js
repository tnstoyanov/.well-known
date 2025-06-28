const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Utility function to calculate checksum for payment
function calculatePaymentChecksum(merchantId, merchantSiteId, clientRequestId, amount, currency, timeStamp, secretKey) {
    const merchantIdStr = String(merchantId);
    const merchantSiteIdStr = String(merchantSiteId);
    const clientRequestIdStr = String(clientRequestId);
    const amountStr = String(amount);
    const currencyStr = String(currency);
    const timeStampStr = String(timeStamp);
    const secretKeyStr = String(secretKey);
    
    const concatenated = merchantIdStr + merchantSiteIdStr + clientRequestIdStr + amountStr + currencyStr + timeStampStr + secretKeyStr;
    
    console.log('🔐 Checksum calculation for payment:');
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
            console.error(`❌ HTTP Error ${response.status}: ${response.statusText}`);
            throw new Error(`HTTP ${response.status} ${response.statusText}: ${responseText}`);
        }
        
        try {
            const jsonResponse = JSON.parse(responseText);
            console.log('✅ Successfully parsed JSON response');
            return jsonResponse;
        } catch (parseError) {
            console.error('❌ Failed to parse JSON response:', parseError);
            throw new Error(`Invalid JSON response: ${parseError.message}`);
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('❌ Request timed out after 15 seconds');
            throw new Error('Request timed out - Nuvei API did not respond within 15 seconds');
        }
        
        console.error('❌ Nuvei API request failed:', error);
        throw error;
    }
}

// Enable CORS for all routes
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json());

// Serve static files (for testing the frontend locally)
app.use(express.static('.'));

// API routes
app.get('/api/health', (req, res) => {
    console.log('🏥 Health check requested');
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'Apple Pay Nuvei Backend'
    });
});

app.post('/api/open-order', async (req, res) => {
    console.log('🔓 OpenOrder requested');
    
    try {
        const { amount, currency = "USD" } = req.body;
        
        if (!amount) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['amount']
            });
        }
        
        const timestamp = generateTimestamp();
        const clientRequestId = `order-${timestamp}-${Math.random().toString(36).substring(2, 8)}`;
        
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
        
        const openOrderResponse = await makeNuveiRequest('openOrder', openOrderParams);
        
        if (openOrderResponse.status !== 'SUCCESS') {
            console.error('❌ Failed to open order:', openOrderResponse);
            return res.status(500).json({ 
                error: 'Failed to open order',
                details: openOrderResponse
            });
        }
        
        res.json({
            success: true,
            sessionToken: openOrderResponse.sessionToken,
            orderId: clientRequestId
        });
        
    } catch (error) {
        console.error('❌ OpenOrder failed:', error);
        res.status(500).json({ 
            error: 'OpenOrder failed',
            message: error.message
        });
    }
});

app.post('/api/validate-merchant', async (req, res) => {
    console.log('🍎 Apple Pay merchant validation requested');
    
    try {
        const { validationURL, domainName } = req.body;
        
        if (!validationURL) {
            return res.status(400).json({ 
                error: 'Missing validationURL' 
            });
        }
        
        console.log(`🔐 Validation URL: ${validationURL}`);
        console.log(`🌐 Domain: ${domainName}`);
        
        // For testing purposes, we'll return a mock validation response
        // In production, you need to:
        // 1. Have Apple Pay merchant certificates
        // 2. Call Apple's validation endpoint with the certificates
        // 3. Return the validation response
        
        // Mock validation response (this won't work for real payments)
        const mockValidation = {
            epochTimestamp: Date.now(),
            expiresAt: Date.now() + 3600000, // 1 hour from now
            merchantSessionIdentifier: `mock-session-${Date.now()}`,
            nonce: `mock-nonce-${Math.random().toString(36).substring(7)}`,
            merchantIdentifier: 'merchant.com.test.applepay',
            domainName: domainName || 'localhost',
            displayName: 'Test Apple Pay Store',
            signature: 'mock-signature'
        };
        
        console.log('⚠️  WARNING: Using mock merchant validation - this will not work for real payments');
        console.log('📝 Mock validation:', JSON.stringify(mockValidation, null, 2));
        
        res.json(mockValidation);
        
    } catch (error) {
        console.error('❌ Merchant validation failed:', error);
        res.status(500).json({ 
            error: 'Merchant validation failed',
            message: error.message
        });
    }
});

app.post('/api/process-payment', async (req, res) => {
    console.log('💳 Process payment requested');
    
    try {
        const { sessionToken, paymentData, billingContact, amount } = req.body;
        
        if (!sessionToken || !paymentData || !amount) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['sessionToken', 'paymentData', 'amount']
            });
        }
        
        const paymentTimestamp = generateTimestamp();
        const paymentClientRequestId = `payment-${paymentTimestamp}-${Math.random().toString(36).substring(2, 8)}`;
        
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
        
        // Calculate payment checksum
        paymentParams.checksum = calculatePaymentChecksum(
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
        
        res.json({
            success: true,
            transactionStatus: paymentResponse.transactionStatus,
            transactionId: paymentResponse.transactionId,
            nuveiResponse: paymentResponse
        });
        
    } catch (error) {
        console.error('❌ Payment processing failed:', error);
        res.status(500).json({ 
            error: 'Payment processing failed',
            message: error.message
        });
    }
});

// Handle preflight requests
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index-production.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} to test locally`);
    console.log(`🔧 Health check: http://localhost:${PORT}/api/health`);
});
