import axios from 'axios';
import md5 from 'md5';

const  get_signature = (key, obj = '') => {
    let date_now = String(Date.now());
    let g = md5(key + date_now).substring(7);
    let s = JSON.stringify(obj);
    let sign = md5(date_now + s + g);

    return { time: date_now, sign: sign };    
}

const get_headers = (key, sign) => {
    return {
        accept: "*/*",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        "authorization": key,
        "content-type": "application/json",
        "x-kl-ajax-request": "Ajax_Request",
        "x-mxc-nonce": sign.time,
        "x-mxc-sign": sign.sign,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/',
    }   
}

async function trigger_order(req, res) {
    if (!req.body.key) {
        res.status(400).json({ success: false, message: 'No authority!' });
        return;
    }
    let obj = req.body.params;
    if (!req.body.key || !obj) {
        res.status(400).json({ success: false, message: 'Missing parameters: Required [key, params]' });
        return;
    }
    const mandatory_params = [
        'symbol',       // The name of the contract
        'side',         // 1: buy long, 2: buy short, 3: sell short, 4: sell long
        'vol',          // Volume
        'price',        // Price   
        'triggerPrice', // Trigger price
        'triggerType',  // 1: >=, 2: <=
        'executeCycle', // Execution cycle, 1: 24 hours, 2: 7 days
        'orderType',    // 1: limit, 2: Post Only, 3: Close or cancel instantly, 4: Close or cancel completely, 5: Market order
        'trend',        // 1: Lastest price, 2: Fair price, 3: Index price
        'openType',     // 1. isolated, 2. cross
        'stopLossPrice', // Stop loss price
        'takeProfitPrice', // Take profit price
    ]

    const required_params = [
        'triggerPrice',
        'triggerType',
        'symbol',
        'side',
        'vol',
    ]
    for (let key of required_params) {
        if (!obj[key]) {
            res.status(400).json({ success: false, message: `Missing parameter for params: Required [symbol, side, vol, price]` });
            return;
        }
    }
    if (!obj.executeCycle) obj.executeCycle = 3;
    if (!obj.orderType) obj.orderType = 5;
    if (!obj.trend) obj.trend = 1;
    if (!obj.priceProtect) obj.priceProtect = "0";
    if (!obj.price) obj.price = obj.triggerPrice;
    if (!obj.openType) obj.openType = 2;

    const sign = get_signature(req.body.key, obj);
    try {
        const response = await axios({
            method: 'POST',
            url: 'https://futures.mexc.com/api/v1/private/planorder/place',
            data: obj,
            headers: get_headers(req.body.key, sign)
        })
        res.status(200).json(response.data);
    } catch(error) {
        res.status(400).json({ success: false, error: error.response.data});
    }
}

async function limit_order(req, res) {
    if (!req.body.key) {
        res.status(400).json({ success: false, message: 'No authority!' });
        return;
    }
    req.body.params = req.body.params;
    let obj = req.body.params;
    if (!req.body.key || !obj) {
        res.status(400).json({ success: false, message: 'Missing parameters: Required [key, params]' });
        return;
    }
    const mandatory_params = [
        'symbol',       // The name of the contract
        'price',        // Price
        'vol',          // Volume
        'side',         // 1: buy long, 2: buy short, 3: sell short, 4: sell long
        'type',         // 1: limit, 2: Post Only, 3: Transact or cancel instantly, 4: Transact or cancel completely, 5: Market order, 6: Convert market price to current price
        'openType',     // 1. isolated, 2. cross
        'stopLossPrice', // Stop loss price
        'takeProfitPrice', // Take profit price
    ];
    const required_params = [
        'symbol',
        'side',
        'vol',
        'price',
    ];

    if (!obj.type) obj.type = "2";
    if (!obj.openType) obj.openType = 2;
    if (!obj.priceProtect) obj.priceProtect = "0";

    for (let key of required_params) {
        if (!obj[key]) {
            res.status(400).json({ success: false, message: `Missing parameter for params: Required [symbol, side, vol, price]` });
            return;
        }
    }

    let sign = get_signature(req.body.key, obj);
    
    try {
        const request_time = Date.now();
        const response = await axios({
            method: 'POST',
            url: 'https://futures.mexc.com/api/v1/private/order/submit',
            data: obj,
            headers: get_headers(req.body.key, sign)
        });
        res.status(200).json({ response: response.data});
    } catch (error) {
        console.log(error)
        res.status(400).json({ response: error.response.data});
    }
}

async function cancel_trigger(req, res, set_status = true) {
    if (!req.body.key) {
        res.status(400).json({ success: false, message: 'No authority!' });
        return;
    }
    let obj = req.body.params;
    if (!req.body.key || !obj) {
        if (!set_status) return [];
        res.status(400).json({ success: false, message: 'Missing parameters: Required [orderIds: Array[string]]' });
        return;
    }

    const required_params = [
        'orders'
    ]
    for (let key of required_params) {
        if (!obj[key]) {
            if (!set_status) return {success: true, message: 'No order to cancel!'};
            res.status(400).json({ success: false, message: `Missing parameter for params: Required [symbol]` });
            return;
        }
    }
    if (obj.orders.length === 0) {
        if (!set_status) return [];
        res.status(200).json({ success: true, message: 'No order to cancel!' });
    }

    let sign = get_signature(req.body.key, obj.orders);
    
    try {
        const response = await axios({
            method: 'POST',
            url: 'https://futures.mexc.com/api/v1/private/planorder/cancel',
            data: obj.orders,
            headers: get_headers(req.body.key, sign),
        });
        if (!set_status) return response.data;
        res.status(200).json({  response: response.data });
    } catch (error) {
        if (!set_status) return [];
        res.status(400).json(response.data);
    }
}
/**
 * This API works, but since MEXC response the wrong orderId after placing orders, this API will not working as expected, I recommend using query_cancel instead
 * You can have the right orderIds by fetching all pending orders from mexc API, or on browser, switch to open orders, inspect one of the order then get the orderID
 * data-row-key attribute of its element
 */
async function cancel(req, res, set_status = true) {
    if (!req.body.key) {
        res.status(400).json({ success: false, message: 'No authority!' });
        return;
    }
    let obj = req.body.params;
    if (!req.body.key || !obj) {
        if (!set_status) return [];
        res.status(400).json({ success: false, message: 'Missing parameters: Required [orderIds: Array[string]]' });
        return;
    }

    const required_params = [
        'orderIds'
    ]
    for (let key of required_params) {
        if (!obj[key]) {
            if (!set_status) return [];
            res.status(400).json({ success: false, message: `Missing parameter for params: Required [symbol]` });
            return;
        }
    }
    if (obj.orderIds.length === 0) {
        if (!set_status) return {success: true, message: 'No order to cancel!'};
        res.status(200).json({ success: true, message: 'No order to cancel!' });
    }

    let sign = get_signature(req.body.key, obj.orderIds);
    
    try {
        const response = await axios({
            method: 'POST',
            url: 'https://futures.mexc.com/api/v1/private/order/cancel',
            data: obj.orderIds,
            headers: get_headers(req.body.key, sign)
        });
        if (!set_status) return response.data;
        res.status(200).json(response.data);
    } catch (error) {
        if (!set_status) return [];
        res.status(400).json({ response: response.data});
    }
}
/**
 * This API will cancel all orders that match the parameters in the request, you can add multiple parameters to narrow down the search
 * Note that orderIDs returned from mexc are bot correct since it's maintaining, so we will need to request for all pending orders and filter them out
 */
async function query_cancel(req, res) {
    let obj = req.body.params;
    if (!req.body.key || !obj) {
        res.status(400).json({ success: false, message: 'Missing parameters: Required [key, params]' });
        return;
    }

    const required_params = [
        'symbol',
    ];
    for (let key of required_params) {
        if (!obj[key]) {
            res.status(400).json({ success: false, message: `Missing parameter for params: Required [symbol]` });
            return;
        }
    }

    const accepted_params = [
        'symbol', // The name of the contract
        'side', // 1: buy long, 2: buy short, 3: sell short, 4: sell long
        'vol', // Volume
        'price', // Price
        'orderId', // Order ID
        'leverage', // Leverage
    ];
    for (let key of Object.keys(obj)) {
        if (!accepted_params.includes(key)) {
            res.status(400).json({ success: false, message: `Invalid parameter for params: Accepted [symbol, side, vol, createTime, price, orderId]` });
            return;
        }
    }

    try {
        const query_req = {symbol: obj.symbol};
        let pending_orders = await get_limit_pending_orders({
            body: {
                key: req.body.key,
                params: query_req
            }
        }, res, false);
        pending_orders = pending_orders.data;
        if (!pending_orders) pending_orders = [];
        let trigger_orders = await get_trigger_pending_orders({
            body: {
                key: req.body.key,
                params: query_req
            }
        }, res, false);
        trigger_orders = trigger_orders.data;
        if (!trigger_orders) trigger_orders = [];
        let marked_orders = {
            'limit': [],
            'trigger': []
        };
        console.log(pending_orders, trigger_orders);
        for (let order of pending_orders.concat(trigger_orders)) {
            let match = true;
            for (let key of Object.keys(obj)) {
                if (key === 'orderId') {
                    let order_id = order.orderId ? BigInt(order.orderId)/1000n : BigInt(order.id)/1000n;
                    if (BigInt(obj[key])/1000n !== order_id) match = false;
                } 
                else if (order[key] && order[key] !== obj[key]) match = false;
            }
            if (match) {
                if (order.orderId) marked_orders.limit.push(order.orderId);
                else marked_orders.trigger.push({symbol: obj.symbol, orderId: order.id});
            }
        }
        console.log(marked_orders);
        if (marked_orders.length === 0) {
            res.status(200).json({ success: true, message: 'No matched orders!' });
            return;
        }
        const limit_cancel_req = {
            body: {
                key: req.body.key,
                params: { orderIds: marked_orders.limit }
            }
        };
        const limit_response = await cancel(limit_cancel_req, res, false);
        const trigger_cancel_req = {
            body: {
                key: req.body.key,
                params: { orders: marked_orders.trigger }
            }
        };
        const trigger_response = await cancel_trigger(trigger_cancel_req, res, false);
        const response = {
            success: true,
            limit_response: limit_response,
            trigger_response: trigger_response
        }
        if (response && response.success) {
            res.status(200).json({ response: response });
        }
    } catch (error) {
        console.log(error);
        res.status(400).json(response.data);
    }

}

async function get_trigger_pending_orders(req, res, set_status = true) {
    if (!req.body.key) {
        res.status(400).json({ success: false, message: 'No authority!' });
        return;
    }
    let obj = {};
    if (req.body.params) obj = req.body.params;
    if (!req.body.key) {
        if (!set_status) return [];
        res.status(400).json({ success: false, message: 'Missing parameters: Required [key, params]' });
        return;
    }

    if (!obj.states) obj.states = "1";

    let req_url = `https://futures.mexc.com/api/v1/private/planorder/list/orders?`;
    for (let key of Object.keys(obj)) {
        req_url += `${key}=${obj[key]}&`;
    }

    let sign = get_signature(req.body.key);

    try {
        const response = await axios({
            method: 'GET',
            url: req_url,
            headers: get_headers(req.body.key, sign)
        });
        if (!set_status) return response.data
        res.status(200).json(response.data);
    } catch (error) {
        if (!set_status) return [];
        res.status(400).json(response.data);
    }
}

async function get_limit_pending_orders(req, res, set_status = true) {
    if (!req.body.key) {
        res.status(400).json({ success: false, message: 'No authority!' });
        return;
    }
    let obj = req.body.params;
    if (!req.body.key || !obj) {
        if (!set_status) return [];
        res.status(400).json({ success: false, message: 'Missing parameters: Required [key, params]' });
        return;
    }
    const required_params = [
        'symbol',
    ];

    for (let key of required_params) {
        if (!obj[key]) {
            if (!set_status) return [];
            res.status(400).json({ success: false, message: `Missing parameter for params: Required [symbol]` });
            return;
        }
    }
    let req_url = `https://futures.mexc.com/api/v1/private/order/list/open_orders/${obj.symbol}?`;
    for (let key of Object.keys(obj)) {
        if (key !== 'symbol') req_url += `${key}=${obj[key]}&`;
    }

    let sign = get_signature(req.body.key);

    try {
        const response = await axios({
            method: 'GET',
            url: `https://futures.mexc.com/api/v1/private/order/list/open_orders/${obj.symbol}`,
            headers: get_headers(req.body.key, sign)
        });
        if (!set_status) return response.data
        res.status(200).json(response.data);
    } catch (error) {
        if (!set_status) return [];
        res.status(400).json(response.data);
    }
}

async function get_holding_positions(req, res) {
    if (!req.body.key) {
        res.status(400).json({ success: false, message: 'No authority!' });
        return;
    }
    let obj = req.body.params;
    if (!obj || !obj.symbol) {
        res.status(400).json({ success: false, message: 'Missing parameter for params: Required [symbol]' });
        return;
    }
    let req_url = `https://futures.mexc.com/api/v1/private/position/open_positions`;
    if (obj.symbol) {
        req_url += `?symbol=${obj.symbol}`;
    }
    let sign = get_signature(req.body.key);

    try {
        const response = await axios({
            method: 'GET',
            url: req_url,
            headers: get_headers(req.body.key, sign)
        });
        res.status(200).json(response.data);
    } catch (error) {
        res.status(400).json({ success: false, error: error.response.data });
    }
}

async function get_account_info(req, res) {
    if (!req.body.key) {
        res.status(400).json({ success: false, message: 'No authority!' });
        return;
    }
    let req_url = "https://futures.mexc.com/api/v1/private/account/asset/USDT";
    let sign = get_signature(req.body.key);

    try {
        const response = await axios({
            method: 'GET',
            url: req_url,
            headers: get_headers(req.body.key, sign)
        });
        res.status(200).json(response.data);
    } catch (error) {
        res.status(400).json({ success: false, error: error.response.data });
    }
}



export {
    limit_order,
    trigger_order,
    cancel,
    query_cancel,
    get_limit_pending_orders,
    get_trigger_pending_orders,
    cancel_trigger,
    get_holding_positions,
    get_account_info
}