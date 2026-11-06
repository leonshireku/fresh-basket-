const db = require('../../db');
const { DEFAULT_PRODUCTS, readFallbackData, writeFallbackData, parseBody, sendJson } = require('../_helper');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.writeHead(204);
        res.end();
        return;
    }

    const method = req.method;

    // GET /api/products
    if (method === 'GET') {
        try {
            if (await db.checkConnection()) {
                const rows = await db.query('SELECT * FROM products ORDER BY id DESC');
                return sendJson(res, 200, { success: true, products: rows, source: 'mysql' });
            }
        } catch (e) {
            // fallback
        }
        const products = readFallbackData('products', DEFAULT_PRODUCTS);
        return sendJson(res, 200, { success: true, products, source: 'fallback' });
    }

    // POST /api/products (Admin)
    if (method === 'POST') {
        try {
            const body = await parseBody(req);
            const { name, category, price, image } = body;

            if (!name || !price || isNaN(price)) {
                return sendJson(res, 400, { success: false, message: 'Valid name and price required.' });
            }

            const cleanPrice = parseFloat(price);
            const cleanImage = image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500';

            try {
                if (await db.checkConnection()) {
                    const result = await db.query(
                        'INSERT INTO products (name, category, price, image) VALUES (?, ?, ?, ?)',
                        [name.trim(), category || 'Groceries', cleanPrice, cleanImage]
                    );
                    const newProd = { id: result.insertId, name: name.trim(), category, price: cleanPrice, image: cleanImage };
                    return sendJson(res, 201, { success: true, product: newProd, message: 'Product added to database!' });
                }
            } catch (e) {
                // fallback
            }

            const products = readFallbackData('products', DEFAULT_PRODUCTS);
            const newProduct = {
                id: Date.now(),
                name: name.trim(),
                category: category || 'Groceries',
                price: cleanPrice,
                image: cleanImage
            };
            products.unshift(newProduct);
            writeFallbackData('products', products);

            return sendJson(res, 201, { success: true, product: newProduct, message: 'Product added successfully!' });
        } catch (e) {
            return sendJson(res, 400, { success: false, message: e.message });
        }
    }

    // DELETE /api/products?id=123
    if (method === 'DELETE') {
        const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const idParam = urlObj.searchParams.get('id') || (req.query && req.query.id);
        const id = parseInt(idParam, 10);

        if (!id) {
            return sendJson(res, 400, { success: false, message: 'Invalid product ID' });
        }

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

    return sendJson(res, 405, { success: false, message: `Method ${method} Not Allowed` });
};

