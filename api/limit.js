import MexcAPI from './mexc.js';

// Rate limiting state (in production, use a database or Redis)
const rateLimitStore = new Map();

function checkRateLimit(ip) {
    const now = Date.now();
    const lastRequest = rateLimitStore.get(ip);
    
    if (lastRequest && now - lastRequest < 10000) {
        return false;
    }
    
    rateLimitStore.set(ip, now);
    return true;
}

export default async function handler(req, res) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Rate limiting
    if (!checkRateLimit(ip)) {
        return res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'You can only request once every 10 seconds in demo test.',
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { key, params } = req.body;
        const result = await MexcAPI.limit_order(key, params);
        return res.status(200).json(result);
    } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
    }
}