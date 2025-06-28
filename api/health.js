// Health check endpoint for Vercel
export default function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const timestamp = new Date().toISOString();
    
    res.status(200).json({
        status: 'healthy',
        timestamp: timestamp,
        service: 'apple-pay-nuvei-backend',
        version: '1.0.0',
        endpoints: {
            'POST /api/process-apple-pay': 'Process Apple Pay payments',
            'GET /api/health': 'Health check'
        }
    });
}
