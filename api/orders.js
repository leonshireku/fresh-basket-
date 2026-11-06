const db = require('../db');
const { readFallbackData, writeFallbackData, parseBody, sendJson } = require('./_helper');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.writeHead(204);
        res.end();
        return;
    }

    const method = req.method;

    // GET /api/orders
    if (method === 'GET') {
        try {
            if (await db.checkConnection()) {
                const rows = await db.query(`
                    SELECT o.id, o.order_number, o.customer_name AS customer, o.customer_email AS email,
                           o.delivery_address AS address, o.delivery_phone AS phone, o.payment_method AS payment,
                           o.total_amount AS total, o.status, o.created_at AS date,
                           COALESCE(
                               (SELECT JSON_ARRAYAGG(JSON_OBJECT('name', oi.product_name, 'quantity', oi.quantity, 'price', oi.unit_price))
                                FROM order_items oi WHERE oi.order_id = o.id),
                               JSON_ARRAY()
                           ) AS products
                    FROM orders o
                    ORDER BY o.id DESC
                `);
                return sendJson(res, 200, { success: true, orders: rows });
            }
        } catch (e) {
            // fallback
        }
        const orders = readFallbackData('orders', []);
        return sendJson(res, 200, { success: true, orders });
    }

    // POST /api/orders
    if (method === 'POST') {
        try {
            const body = await parseBody(req);
            const { customer, email, products, total, address, phone, payment } = body;

            if (!customer || !products || !products.length || !address || !phone) {
                return sendJson(res, 400, { success: false, message: 'Missing order details.' });
            }

            const orderNum = "ORD-" + Date.now().toString().slice(-6);
            const cleanTotal = parseFloat(total) || 0;

            try {
                if (await db.checkConnection()) {
                    const result = await db.query(
                        `INSERT INTO orders (order_number, customer_name, customer_email, delivery_address, delivery_phone, payment_method, total_amount)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [orderNum, customer, email, address, phone, payment || 'Cash on Delivery', cleanTotal]
                    );

                    const orderId = result.insertId;
                    for (const item of products) {
                        await db.query(
                            `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
                             VALUES (?, ?, ?, ?, ?, ?)`,
                            [orderId, item.id || null, item.name, item.price, item.quantity, item.price * item.quantity]
                        );
                    }

                    return sendJson(res, 201, {
                        success: true,
                        order: { id: orderNum, customer, total: cleanTotal },
                        message: `Order ${orderNum} placed successfully in database!`
                    });
                }
            } catch (e) {
                // fallback
            }

            const orders = readFallbackData('orders', []);
            const newOrder = {
                id: orderNum,
                customer,
                email,
                products,
                total: cleanTotal,
                address,
                phone,
                payment: payment || 'Cash on Delivery',
                date: new Date().toLocaleString()
            };
            orders.unshift(newOrder);
            writeFallbackData('orders', orders);

            return sendJson(res, 201, {
                success: true,
                order: newOrder,
                message: `Order ${newOrder.id} placed successfully!`
            });
        } catch (e) {
            return sendJson(res, 400, { success: false, message: e.message });
        }
    }

    return sendJson(res, 405, { success: false, message: `Method ${method} Not Allowed` });
};
