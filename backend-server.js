const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const app = express();
const port = 3000;

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

app.use(cors());
app.use(express.json());

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

// Utility function to generate checksum
function generateChecksum(data) {
    const concatenated = Object.values(data).join('') + NUVEI_CONFIG.merchantSecretKey;
    return crypto.createHash('sha256').update(concatenated).digest('hex');
}

// Step 1: Open Order (Session Token)
async function openOrder(amount, currency, billingAddress) {
    const timestamp = generateTimestamp();
    const clientUniqueId = timestamp;
    
    const checksumData = {
        merchantId: NUVEI_CONFIG.merchantId,
        merchantSiteId: NUVEI_CONFIG.merchantSiteId,
        clientUniqueId: clientUniqueId,
        amount: amount,
        currency: currency,
        timeStamp: timestamp
    };
    
    const checksum = generateChecksum(checksumData);
    
    const orderData = {
        merchantId: NUVEI_CONFIG.merchantId,
        merchantSiteId: NUVEI_CONFIG.merchantSiteId,
        clientUniqueId: clientUniqueId,
        currency: currency,
        amount: amount,
        timeStamp: timestamp,
        urlDetails: URL_DETAILS,
        billingAddress: billingAddress,
        checksum: checksum
    };

    try {
        const response = await fetch(`${NUVEI_CONFIG.baseUrl}/openOrder.do`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();
        console.log('Open Order Response:', result);
        return result;
    } catch (error) {
        console.error('Open Order Error:', error);
        throw error;
    }
}

// Step 2: Process Payment with Apple Pay token
async function processPayment(sessionToken, mobileToken, amount, currency, billingAddress) {
    const timestamp = generateTimestamp();
    const clientRequestId = timestamp;
    
    const checksumData = {
        merchantId: NUVEI_CONFIG.merchantId,
        merchantSiteId: NUVEI_CONFIG.merchantSiteId,
        clientRequestId: clientRequestId,
        amount: amount,
        currency: currency,
        timeStamp: timestamp
    };
    
    const checksum = generateChecksum(checksumData);
    
    const paymentData = {
        sessionToken: sessionToken,
        merchantId: NUVEI_CONFIG.merchantId,
        merchantSiteId: NUVEI_CONFIG.merchantSiteId,
        clientRequestId: clientRequestId,
        amount: amount,
        currency: currency,
        paymentOption: {
            card: {
                externalToken: {
                    externalTokenProvider: "ApplePay",
                    mobileToken: mobileToken
                }
            }
        },
        billingAddress: billingAddress,
        userDetails: {
            dateOfBirth: "1970-06-31"
        },
        recipientDetails: {
            firstName: billingAddress.firstName,
            lastName: billingAddress.lastName
        },
        deviceDetails: {
            ipAddress: "127.0.0.1" // You should get the real IP address
        },
        timeStamp: timestamp,
        checksum: checksum
    };

    try {
        const response = await fetch(`${NUVEI_CONFIG.baseUrl}/payment.do`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentData)
        });

        const result = await response.json();
        console.log('Payment Response:', result);
        return result;
    } catch (error) {
        console.error('Payment Error:', error);
        throw error;
    }
}

// Main endpoint to handle Apple Pay payments
app.post('/process-apple-pay', async (req, res) => {
    try {
        const { mobileToken, billingContact, amount, currency } = req.body;
        
        console.log('Received Apple Pay data:', { mobileToken, billingContact, amount, currency });
        
        // Convert Apple Pay billing contact to Nuvei format
        const billingAddress = {
            firstName: billingContact?.givenName || "Tony",
            lastName: billingContact?.familyName || "Stoyanov",
            email: billingContact?.emailAddress || "tony.stoyanov@tiebreak.solutions",
            country: billingContact?.countryCode || "BG",
            address: billingContact?.addressLines?.[0] || "3 Nikola Tesla St.",
            city: billingContact?.locality || "Sofia",
            zip: billingContact?.postalCode || "1000",
            phone: billingContact?.phoneNumber || "+359888123456"
        };

        // Step 1: Open Order to get session token
        console.log('Step 1: Opening order...');
        const orderResult = await openOrder(amount, currency, billingAddress);
        
        if (orderResult.status !== 'SUCCESS') {
            console.error('Failed to open order:', orderResult);
            return res.json({
                status: 'FAILED',
                error: 'Failed to open order',
                details: orderResult
            });
        }

        const sessionToken = orderResult.sessionToken;
        console.log('Session token received:', sessionToken);

        // Step 2: Process payment with Apple Pay token
        console.log('Step 2: Processing payment...');
        const paymentResult = await processPayment(
            sessionToken, 
            mobileToken, 
            amount, 
            currency, 
            billingAddress
        );

        // Return result to frontend
        res.json({
            status: paymentResult.transactionStatus || paymentResult.status,
            transactionStatus: paymentResult.transactionStatus,
            transactionId: paymentResult.transactionId,
            orderId: paymentResult.orderId,
            details: paymentResult
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            status: 'ERROR',
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Apple Pay Nuvei Backend Server is running' });
});

app.listen(port, () => {
    console.log(`Apple Pay Nuvei backend server running at http://localhost:${port}`);
    console.log('Endpoints:');
    console.log(`  POST http://localhost:${port}/process-apple-pay`);
    console.log(`  GET  http://localhost:${port}/health`);
});

module.exports = app;
