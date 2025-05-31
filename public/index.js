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

async function trigger_order(req, res) {
    try {
        const { key, ...params } = req.body;
        const result = await MexcAPI.trigger_order(key, params);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
}

async function query_cancel(req, res) {
    try {
        const { key, ...params } = req.body;
        const result = await MexcAPI.query_cancel(key, params);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
}

async function limit_order(req, res) {
    try {
        const { key, ...params } = req.body;
        const result = await MexcAPI.limit_order(key, params);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
}

async function get_holding_positions(req, res) {
    try {
        const { key, ...params } = req.body;
        const result = await MexcAPI.get_holding_positions(key, params);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
}

async function get_account_info(req, res) {
    try {
        const { key } = req.body;
        const result = await MexcAPI.get_account_info(key);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
}

export default function handler(req, res) {
    const { method, url } = req;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Rate limiting
    if (!checkRateLimit(ip)) {
        return res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'You can only request once every 10 seconds in demo test.',
        });
    }

    if (method === 'POST' && url === '/trigger') {
        return trigger_order(req, res);
    }

    if (method === 'POST' && url === '/cancel') {
        return query_cancel(req, res);
    }

    if (method === 'POST' && url === '/limit') {
        return limit_order(req, res);
    }

    res.status(404).json({ error: 'Not found' });
}