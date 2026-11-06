const db = require('../../db');
const { DEFAULT_PRODUCTS, readFallbackData, writeFallbackData, sendJson } = require('../_helper');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.writeHead(204);
        res.end();
        return;
    }

    const idParam = req.query && req.query.id 
        ? req.query.id 
        : (req.url.split('/').pop().split('?')[0]);
    const id = parseInt(idParam, 10);

    if (!id) {
        return sendJson(res, 400, { success: false, message: 'Invalid product ID' });
    }

    if (req.method === 'DELETE') {
        try {
            if (await db.checkConnection()) {
                await db.query('DELETE FROM products WHERE id = ?', [id]);
                return sendJson(res, 200, { success: true, message: 'Product deleted from database.' });
            }
        } catch (e) {
            // fallback
        }

        let products = readFallbackData('products', DEFAULT_PRODUCTS);
        products = products.filter(p => p.id !== id);
        writeFallbackData('products', products);
        return sendJson(res, 200, { success: true, message: 'Product deleted successfully.' });
    }

    return sendJson(res, 405, { success: false, message: `Method ${req.method} Not Allowed` });
};

