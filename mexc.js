import axios from 'axios';
import md5 from 'md5';

class MexcAPI {
    static get_signature(key, obj = '') {
        let date_now = String(Date.now());
        let g = md5(key + date_now).substring(7);
        let s = JSON.stringify(obj);
        let sign = md5(date_now + s + g);

        return { time: date_now, sign: sign };    
    }

    static get_headers(key, sign) {
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

    static async trigger_order(key, params) {
        if (!key) {
            throw new Error('No authority!');
        }
        
        if (!params) {
            throw new Error('Missing parameters: Required [key, params]');
        }

        const required_params = [
            'triggerPrice',
            'triggerType',
            'symbol',
            'side',
            'vol',
        ];

        for (let param of required_params) {
            if (!params[param]) {
                throw new Error(`Missing parameter: ${param}`);
            }
        }

        if (!params.executeCycle) params.executeCycle = 3;
        if (!params.orderType) params.orderType = 5;
        if (!params.trend) params.trend = 1;
        if (!params.priceProtect) params.priceProtect = "0";
        if (!params.price) params.price = params.triggerPrice;
        if (!params.openType) params.openType = 2;

        const sign = this.get_signature(key, params);
        
        const response = await axios({
            method: 'POST',
            url: 'https://futures.mexc.com/api/v1/private/planorder/place',
            data: params,
            headers: this.get_headers(key, sign)
        });
        
        return response.data;
    }

    static async limit_order(key, params) {
        if (!key) {
            throw new Error('No authority!');
        }
        
        if (!params) {
            throw new Error('Missing parameters: Required [key, params]');
        }

        const required_params = [
            'symbol',
            'side',
            'vol',
            'price',
        ];

        for (let param of required_params) {
            if (!params[param]) {
                throw new Error(`Missing parameter: ${param}`);
            }
        }

        if (!params.type) params.type = "2";
        if (!params.openType) params.openType = 2;
        if (!params.priceProtect) params.priceProtect = "0";

        let sign = this.get_signature(key, params);
        
        const response = await axios({
            method: 'POST',
            url: 'https://futures.mexc.com/api/v1/private/order/submit',
            data: params,
            headers: this.get_headers(key, sign)
        });
        
        return response.data;
    }

    static async cancel_trigger(key, params) {
        if (!key) {
            throw new Error('No authority!');
        }
        
        if (!params || !params.orders) {
            return { success: true, message: 'No order to cancel!' };
        }

        if (params.orders.length === 0) {
            return { success: true, message: 'No order to cancel!' };
        }

        let sign = this.get_signature(key, params.orders);
        
        const response = await axios({
            method: 'POST',
            url: 'https://futures.mexc.com/api/v1/private/planorder/cancel',
            data: params.orders,
            headers: this.get_headers(key, sign),
        });
        
        return response.data;
    }

    static async cancel(key, params) {
        if (!key) {
            throw new Error('No authority!');
        }
        
        if (!params || !params.orderIds) {
            return { success: true, message: 'No order to cancel!' };
        }

        if (params.orderIds.length === 0) {
            return { success: true, message: 'No order to cancel!' };
        }

        let sign = this.get_signature(key, params.orderIds);
        
        const response = await axios({
            method: 'POST',
            url: 'https://futures.mexc.com/api/v1/private/order/cancel',
            data: params.orderIds,
            headers: this.get_headers(key, sign)
        });
        
        return response.data;
    }

    static async query_cancel(key, params) {
        if (!key || !params) {
            throw new Error('Missing parameters: Required [key, params]');
        }

        if (!params.symbol) {
            throw new Error('Missing parameter: symbol');
        }

        const accepted_params = [
            'symbol', 'side', 'vol', 'price', 'orderId', 'leverage'
        ];
        
        for (let param of Object.keys(params)) {
            if (!accepted_params.includes(param)) {
                throw new Error(`Invalid parameter: ${param}`);
            }
        }

        const query_req = { symbol: params.symbol };
        
        let pending_orders = await this.get_limit_pending_orders(key, query_req);
        pending_orders = pending_orders.data || [];
        
        let trigger_orders = await this.get_trigger_pending_orders(key, query_req);
        trigger_orders = trigger_orders.data || [];
        
        let marked_orders = {
            'limit': [],
            'trigger': []
        };

        for (let order of pending_orders.concat(trigger_orders)) {
            let match = true;
            for (let param of Object.keys(params)) {
                if (param === 'orderId') {
                    let order_id = order.orderId ? BigInt(order.orderId)/1000n : BigInt(order.id)/1000n;
                    if (BigInt(params[param])/1000n !== order_id) match = false;
                } 
                else if (order[param] && order[param] !== params[param]) match = false;
            }
            if (match) {
                if (order.orderId) marked_orders.limit.push(order.orderId);
                else marked_orders.trigger.push({symbol: params.symbol, orderId: order.id});
            }
        }

        if (marked_orders.limit.length === 0 && marked_orders.trigger.length === 0) {
            return { success: true, message: 'No matched orders!' };
        }

        const limit_response = marked_orders.limit.length > 0 ? 
            await this.cancel(key, { orderIds: marked_orders.limit }) : null;
        
        const trigger_response = marked_orders.trigger.length > 0 ? 
            await this.cancel_trigger(key, { orders: marked_orders.trigger }) : null;

        return {
            success: true,
            limit_response: limit_response,
            trigger_response: trigger_response
        };
    }

    static async get_trigger_pending_orders(key, params = {}) {
        if (!key) {
            throw new Error('No authority!');
        }

        if (!params.states) params.states = "1";

        let req_url = `https://futures.mexc.com/api/v1/private/planorder/list/orders?`;
        for (let param of Object.keys(params)) {
            req_url += `${param}=${params[param]}&`;
        }

        let sign = this.get_signature(key);

        const response = await axios({
            method: 'GET',
            url: req_url,
            headers: this.get_headers(key, sign)
        });
        
        return response.data;
    }

    static async get_limit_pending_orders(key, params) {
        if (!key || !params) {
            throw new Error('Missing parameters: Required [key, params]');
        }
        
        if (!params.symbol) {
            throw new Error('Missing parameter: symbol');
        }

        let sign = this.get_signature(key);

        const response = await axios({
            method: 'GET',
            url: `https://futures.mexc.com/api/v1/private/order/list/open_orders/${params.symbol}`,
            headers: this.get_headers(key, sign)
        });
        
        return response.data;
    }

    static async get_holding_positions(key, params) {
        if (!key) {
            throw new Error('No authority!');
        }
        
        if (!params || !params.symbol) {
            throw new Error('Missing parameter: symbol');
        }

        let req_url = `https://futures.mexc.com/api/v1/private/position/open_positions?symbol=${params.symbol}`;
        let sign = this.get_signature(key);

        const response = await axios({
            method: 'GET',
            url: req_url,
            headers: this.get_headers(key, sign)
        });
        
        return response.data;
    }

    static async get_account_info(key) {
        if (!key) {
            throw new Error('No authority!');
        }

        let req_url = "https://futures.mexc.com/api/v1/private/account/asset/USDT";
        let sign = this.get_signature(key);

        const response = await axios({
            method: 'GET',
            url: req_url,
            headers: this.get_headers(key, sign)
        });
        
        return response.data;
    }
}

export default MexcAPI;
