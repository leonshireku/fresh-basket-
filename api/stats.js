const db = require('../db');
const { DEFAULT_PRODUCTS, readFallbackData, sendJson } = require('./_helper');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method !== 'GET') {
        return sendJson(res, 405, { success: false, message: `Method ${req.method} Not Allowed` });
    }

    try {
        if (await db.checkConnection()) {
            const [pCount] = await db.query('SELECT COUNT(*) AS total FROM products');
            const [oStats] = await db.query('SELECT COUNT(*) AS total_orders, COALESCE(SUM(total_amount), 0) AS total_revenue FROM orders');
            return sendJson(res, 200, {
                success: true,
                stats: {
                    totalProducts: pCount ? pCount.total : 0,
                    totalOrders: oStats ? oStats.total_orders : 0,
                    totalRevenue: oStats ? parseFloat(oStats.total_revenue) : 0
                }
            });
        }
    } catch (e) {
        // fallback
    }

    const products = readFallbackData('products', DEFAULT_PRODUCTS);
    const orders = readFallbackData('orders', []);
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

    return sendJson(res, 200, {
        success: true,
        stats: {
            totalProducts: products.length,
            totalOrders: orders.length,
            totalRevenue
        }
    });
};
