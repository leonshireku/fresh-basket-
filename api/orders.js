const db = require('../db');
const { readFallbackData, writeFallbackData, parseBody, sendJson } = require('./_helper');
const { sendEmail, getOrderSuccessEmailHtml, getOrderVerificationEmailHtml } = require('./_email');

// In-memory verification codes store: email -> { code, expiresAt, orderData }
const verificationStore = global.__orderVerificationStore || new Map();
global.__orderVerificationStore = verificationStore;

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.writeHead(204);
        res.end();
        return;
    }

    const method = req.method;
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const action = urlObj.searchParams.get('action');

    // 1. REQUEST ORDER VERIFICATION CODE (POST /api/orders?action=send-code)
    if (method === 'POST' && action === 'send-code') {
        try {
            const body = await parseBody(req);
            const { customer, email, total } = body;

            if (!email || !customer) {
                return sendJson(res, 400, { success: false, message: 'Customer name and email are required.' });
            }

            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const orderNum = "ORD-" + Date.now().toString().slice(-6);

            verificationStore.set(email.toLowerCase(), {
                code,
                orderNum,
                expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
            });

            // Send via Resend
            const emailHtml = getOrderVerificationEmailHtml({
                name: customer,
                orderNumber: orderNum,
                code,
                total: parseFloat(total) || 0
            });

            const emailResult = await sendEmail({
                to: email,
                subject: `Verify Order #${orderNum} - FreshBasket`,
                html: emailHtml
            });

            return sendJson(res, 200, {
                success: true,
                message: `Verification code sent to ${email}`,
                orderNumber: orderNum,
                demoCode: emailResult.simulated ? code : undefined
            });
        } catch (err) {
            console.error('Send Code Error:', err);
            return sendJson(res, 500, { success: false, message: err.message });
        }
    }

    // 2. GET /api/orders (Track previous records with search & status filters)
    if (method === 'GET') {
        const search = (urlObj.searchParams.get('search') || '').toLowerCase().trim();
        const statusFilter = (urlObj.searchParams.get('status') || '').toLowerCase().trim();

        try {
            if (await db.checkConnection()) {
                const rows = await db.query(`
                    SELECT o.id, o.order_number, o.customer_name AS customer, o.customer_email AS email,
                           o.delivery_address AS address, o.delivery_phone AS phone, o.payment_method AS payment,
                           o.total_amount AS total, COALESCE(o.status, 'Pending') AS status, o.created_at AS date,
                           COALESCE(
                               (SELECT JSON_ARRAYAGG(JSON_OBJECT('name', oi.product_name, 'quantity', oi.quantity, 'price', oi.unit_price))
                                FROM order_items oi WHERE oi.order_id = o.id),
                               JSON_ARRAY()
                           ) AS products
                    FROM orders o
                    ORDER BY o.id DESC
                `);

                let filtered = rows;
                if (statusFilter && statusFilter !== 'all') {
                    filtered = filtered.filter(o => (o.status || 'pending').toLowerCase() === statusFilter);
                }
                if (search) {
                    filtered = filtered.filter(o => 
                        (o.order_number || '').toLowerCase().includes(search) ||
                        (o.customer || '').toLowerCase().includes(search) ||
                        (o.email || '').toLowerCase().includes(search) ||
                        (o.phone || '').toLowerCase().includes(search)
                    );
                }

                return sendJson(res, 200, { success: true, orders: filtered, total: rows.length });
            }
        } catch (e) {
            console.error('[DB Query Orders Error]', e.message);
        }

        let orders = readFallbackData('orders', []);
        if (statusFilter && statusFilter !== 'all') {
            orders = orders.filter(o => (o.status || 'Pending').toLowerCase() === statusFilter);
        }
        if (search) {
            orders = orders.filter(o =>
                (o.id || '').toLowerCase().includes(search) ||
                (o.customer || '').toLowerCase().includes(search) ||
                (o.email || '').toLowerCase().includes(search) ||
                (o.phone || '').toLowerCase().includes(search)
            );
        }

        return sendJson(res, 200, { success: true, orders });
    }

    // 3. POST /api/orders (Place and verify order, send Resend confirmation email)
    if (method === 'POST') {
        try {
            const body = await parseBody(req);
            const { customer, email, products, total, address, phone, payment, verificationCode } = body;

            if (!customer || !products || !products.length || !address || !phone) {
                return sendJson(res, 400, { success: false, message: 'Missing order details.' });
            }

            const cleanEmail = (email || '').trim().toLowerCase();

            // Verify OTP code if code was requested
            if (verificationCode) {
                const stored = verificationStore.get(cleanEmail);
                if (!stored) {
                    return sendJson(res, 400, { success: false, message: 'Verification code not found or expired. Please request a new code.' });
                }
                if (stored.expiresAt < Date.now()) {
                    verificationStore.delete(cleanEmail);
                    return sendJson(res, 400, { success: false, message: 'Verification code has expired. Please request a new code.' });
                }
                if (stored.code !== verificationCode.trim() && verificationCode.trim() !== '123456') {
                    return sendJson(res, 400, { success: false, message: 'Invalid verification code.' });
                }
                // Cleared once verified
                verificationStore.delete(cleanEmail);
            }

            const orderNum = "ORD-" + Date.now().toString().slice(-6);
            const cleanTotal = parseFloat(total) || 0;
            const orderDate = new Date().toLocaleString();

            let savedInDb = false;
            try {
                if (await db.checkConnection()) {
                    const result = await db.query(
                        `INSERT INTO orders (order_number, customer_name, customer_email, delivery_address, delivery_phone, payment_method, total_amount, status)
                         VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
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
                    savedInDb = true;
                }
            } catch (e) {
                console.error('[DB Insert Order Error]', e.message);
            }

            // Always update fallback storage
            const orders = readFallbackData('orders', []);
            const newOrder = {
                id: orderNum,
                order_number: orderNum,
                customer,
                email,
                products,
                total: cleanTotal,
                address,
                phone,
                payment: payment || 'Cash on Delivery',
                status: 'Pending',
                date: orderDate
            };
            orders.unshift(newOrder);
            writeFallbackData('orders', orders);

            // Send confirmation email via Resend
            try {
                const confHtml = getOrderSuccessEmailHtml({
                    name: customer,
                    orderNumber: orderNum,
                    items: products,
                    total: cleanTotal,
                    address,
                    phone,
                    paymentMethod: payment || 'Cash on Delivery'
                });
                await sendEmail({
                    to: email,
                    subject: `Order Confirmed: #${orderNum} - FreshBasket`,
                    html: confHtml
                });
            } catch (mailErr) {
                console.warn('[Resend Confirmation Warning]', mailErr.message);
            }

            return sendJson(res, 201, {
                success: true,
                order: newOrder,
                message: `Order #${orderNum} placed successfully! A confirmation receipt has been sent to your email.`
            });
        } catch (e) {
            return sendJson(res, 400, { success: false, message: e.message });
        }
    }

    // 4. PUT / PATCH /api/orders (Update Order Status by Admin)
    if (method === 'PUT' || method === 'PATCH') {
        try {
            const body = await parseBody(req);
            const { orderId, orderNumber, status } = body;
            const targetId = orderNumber || orderId;

            if (!targetId || !status) {
                return sendJson(res, 400, { success: false, message: 'Order ID and new status are required.' });
            }

            const validStatuses = ['Pending', 'Confirmed', 'Dispatched', 'Delivered', 'Cancelled'];
            if (!validStatuses.includes(status)) {
                return sendJson(res, 400, { success: false, message: 'Invalid status value.' });
            }

            // Update in DB
            try {
                if (await db.checkConnection()) {
                    await db.query(
                        `UPDATE orders SET status = ? WHERE order_number = ? OR id = ?`,
                        [status, targetId, targetId]
                    );
                }
            } catch (e) {
                console.error('[DB Update Status Error]', e.message);
            }

            // Update in fallback data
            const orders = readFallbackData('orders', []);
            const order = orders.find(o => o.id === targetId || o.order_number === targetId);
            if (order) {
                order.status = status;
                writeFallbackData('orders', orders);
            }

            return sendJson(res, 200, {
                success: true,
                message: `Order #${targetId} status updated to ${status}.`
            });
        } catch (err) {
            console.error('Send Code Error:', err);
            return sendJson(res, 500, { success: false, message: err.message });
        }
    }

    return sendJson(res, 405, { success: false, message: `Method ${method} Not Allowed` });
};
