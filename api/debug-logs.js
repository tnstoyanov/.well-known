// Debug endpoint to check Vercel logs
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    console.log('🔍 Debug endpoint called at:', new Date().toISOString());
    console.log('📋 Request method:', req.method);
    console.log('📋 Request headers:', req.headers);
    console.log('📋 Request body:', req.body);
    console.log('📋 Request query:', req.query);
    
    res.status(200).json({
        success: true,
        message: 'Debug endpoint working',
        timestamp: new Date().toISOString(),
        method: req.method,
        userAgent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });
}
