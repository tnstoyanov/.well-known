// Simple test to verify Nuvei API connectivity
async function testNuveiConnectivity() {
    const testParams = {
        merchantId: "3832456837996201334",
        merchantSiteId: "184063",
        clientRequestId: "test-connectivity-" + Date.now(),
        amount: "1.00",
        currency: "USD",
        timeStamp: "20250628220000"
    };
    
    // Calculate test checksum
    const concatenated = testParams.merchantId + testParams.merchantSiteId + 
                        testParams.clientRequestId + testParams.amount + 
                        testParams.currency + testParams.timeStamp + 
                        "puT8KQYqIbbQDHN5cQNAlYyuDedZxRYjA9WmEsKq1wrIPhxQqOx77Ep1uOA7sUde";
    
    const crypto = require('crypto');
    testParams.checksum = crypto.createHash('sha256').update(concatenated, 'utf8').digest('hex');
    
    console.log('🧪 Testing Nuvei API connectivity...');
    console.log('📤 Test payload:', JSON.stringify(testParams, null, 2));
    
    try {
        const response = await fetch('https://ppp-test.nuvei.com/ppp/api/v1/openOrder.do', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'ApplePayNuveiIntegration/Test'
            },
            body: JSON.stringify(testParams),
            timeout: 10000
        });
        
        const responseText = await response.text();
        console.log(`📥 Test response status: ${response.status}`);
        console.log('📥 Test response:', responseText);
        
        if (response.ok) {
            const jsonResponse = JSON.parse(responseText);
            console.log('✅ Nuvei API is reachable and responding');
            return jsonResponse;
        } else {
            console.log('❌ Nuvei API returned error status');
            return null;
        }
    } catch (error) {
        console.error('❌ Failed to reach Nuvei API:', error);
        return null;
    }
}

// Export handler for Vercel
export default async function handler(req, res) {
    if (req.method === 'GET' && req.url === '/api/test-nuvei') {
        const result = await testNuveiConnectivity();
        return res.json({ test: result });
    }
    
    res.status(404).json({ error: 'Not found' });
}
