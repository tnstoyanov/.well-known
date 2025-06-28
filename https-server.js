const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch');
const https = require('https');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

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

// Utility functions (same as before)
function generateTimestamp() {
    const now = new Date();
    return now.getFullYear().toString() +
           (now.getMonth() + 1).toString().padStart(2, '0') +
           now.getDate().toString().padStart(2, '0') +
           now.getHours().toString().padStart(2, '0') +
           now.getMinutes().toString().padStart(2, '0') +
           now.getSeconds().toString().padStart(2, '0');
}

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

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static('.'));

// Routes (same as standalone-server.js)
app.get('/api/health', (req, res) => {
    console.log('🏥 Health check requested');
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'Apple Pay Nuvei Backend (HTTPS)',
        protocol: req.secure ? 'HTTPS' : 'HTTP'
    });
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
        
        const mockValidation = {
            epochTimestamp: Date.now(),
            expiresAt: Date.now() + 3600000,
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

app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index-local.html'));
});

// Check for certificates
const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    // HTTPS server
    const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };
    
    https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
        console.log(`🔒 HTTPS Server running on port ${HTTPS_PORT}`);
        console.log(`📱 Open https://localhost:${HTTPS_PORT} to test with HTTPS`);
        console.log(`🍎 Apple Pay will work properly with HTTPS`);
    });
} else {
    console.log('⚠️  SSL certificates not found. Apple Pay requires HTTPS for real device testing.');
    console.log('💡 Run: npm run generate-cert to create self-signed certificates');
}

// HTTP server for fallback
app.listen(PORT, () => {
    console.log(`🚀 HTTP Server running on port ${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} for basic testing`);
    console.log(`⚠️  Note: Apple Pay on real devices requires HTTPS`);
});
