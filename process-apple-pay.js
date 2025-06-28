// Legacy endpoint for Nuvei SDK compatibility
// This redirects to the new two-step flow
export default async function handler(req, res) {
    console.log('🔄 Legacy /process-apple-pay endpoint called');
    console.log('📋 Request method:', req.method);
    console.log('📋 Request body:', req.body);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        console.log('✅ OPTIONS request handled for legacy endpoint');
        res.status(200).end();
        return;
    }
    
    // For now, just return a response indicating this endpoint is deprecated
    res.status(200).json({
        error: 'Endpoint deprecated',
        message: 'This endpoint (/process-apple-pay) is no longer used. Please use the new two-step flow: /api/open-order then /api/process-payment',
        timestamp: new Date().toISOString()
    });
}
