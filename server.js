const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Auto-load .env file into process.env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split(/\r?\n/).forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            const eqIdx = line.indexOf('=');
            if (eqIdx !== -1) {
                const key = line.substring(0, eqIdx).trim();
                let val = line.substring(eqIdx + 1).trim();
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.slice(1, -1);
                }
                process.env[key] = val;
            }
        }
    });
}

const db = require('./db');

const PORT = parseInt(process.env.PORT || '3000', 10);
const IS_VERCEL = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = IS_VERCEL ? path.join(os.tmpdir(), 'freshbasket-data') : path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

// MIME TYPES FOR STATIC ASSETS
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// DEFAULT SEED DATA
const DEFAULT_PRODUCTS = [
    {
        id: 1,
        name: "Fresh Tomatoes",
        category: "Vegetables",
        price: 120,
        image: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=500"
    },
    {
        id: 2,
        name: "Red Onions",
        category: "Vegetables",
        price: 150,
        image: "https://images.unsplash.com/photo-1508747703725-719777637510?w=500"
    },
    {
        id: 3,
        name: "Bananas",
        category: "Fruits",
        price: 100,
        image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500"
    },
    {
        id: 4,
        name: "Apples",
        category: "Fruits",
        price: 280,
        image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500"
    },
    {
        id: 5,
        name: "Fresh Milk",
        category: "Dairy",
        price: 75,
        image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500"
    },
    {
        id: 6,
        name: "Eggs",
        category: "Dairy",
        price: 480,
        image: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=500"
    },
    {
        id: 7,
        name: "Rice",
        category: "Groceries",
        price: 320,
        image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500"
    },
    {
        id: 8,
        name: "Cooking Oil",
        category: "Groceries",
        price: 250,
        image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500"
    }
];

const DEFAULT_USERS = [
    {
        id: 1,
        name: "Store Administrator",
        email: "admin@freshbasket.com",
        password: "admin123",
        role: "admin"
    },
    {
        id: 2,
        name: "Jane Client",
        email: "client@freshbasket.com",
        password: "client123",
        role: "client"
    }
];

// IN-MEMORY STORAGE CACHE (Guarantees zero-crash on serverless/read-only environments)
const memStorage = {
    'products.json': Array.isArray(DEFAULT_PRODUCTS) ? [...DEFAULT_PRODUCTS] : DEFAULT_PRODUCTS,
    'users.json': Array.isArray(DEFAULT_USERS) ? [...DEFAULT_USERS] : DEFAULT_USERS,
    'orders.json': []
};

// INITIALIZE FALLBACK FILE STORAGE
function initDatabase() {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        if (!fs.existsSync(PRODUCTS_FILE)) {
            fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(DEFAULT_PRODUCTS, null, 2));
        }
        if (!fs.existsSync(USERS_FILE)) {
            fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2));
        }
        if (!fs.existsSync(ORDERS_FILE)) {
            fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
        }
    } catch (err) {
        // Read-only filesystem on Vercel: safely continue with in-memory storage
        console.warn('Read-only storage mode active (in-memory storage enabled):', err.message);
    }
}

initDatabase();

function readData(filePath, fallback = []) {
    const fileName = path.basename(filePath);
    try {
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf-8');
            const parsed = JSON.parse(raw);
            memStorage[fileName] = parsed;
            return parsed;
        }
    } catch (e) {}

    // Check if original bundled data file exists in __dirname/data
    try {
        const bundledPath = path.join(__dirname, 'data', fileName);
        if (fs.existsSync(bundledPath)) {
            const raw = fs.readFileSync(bundledPath, 'utf-8');
            const parsed = JSON.parse(raw);
            memStorage[fileName] = parsed;
            return parsed;
        }
    } catch (e) {}

    if (memStorage[fileName]) {
        return memStorage[fileName];
    }
    memStorage[fileName] = Array.isArray(fallback) ? [...fallback] : fallback;
    return memStorage[fileName];
}

function writeData(filePath, data) {
    const fileName = path.basename(filePath);
    memStorage[fileName] = data;
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        // Successfully saved in memory if filesystem is read-only
        return true;
    }
}

// REQUEST BODY PARSER (Supports both raw Node streams and pre-parsed Serverless bodies)
function parseBody(req) {
    if (req.body && typeof req.body === 'object') {
        return Promise.resolve(req.body);
    }
    if (typeof req.body === 'string' && req.body.length > 0) {
        try {
            return Promise.resolve(JSON.parse(req.body));
        } catch (e) {
            return Promise.reject(new Error('Invalid JSON'));
        }
    }
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 2e6) {
                req.destroy();
                reject(new Error('Payload too large'));
            }
        });
        req.on('end', () => {
            if (!body) return resolve({});
            try {
                resolve(JSON.parse(body));
            } catch (err) {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

// JSON RESPONSE HELPER
function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(JSON.stringify(data));
}

// STATIC FILE HANDLER
function serveStaticFile(req, res, pathname) {
    let safePath = (pathname === '/' || pathname === '' || pathname === '/index') ? '/index.html' : pathname;
    const decoded = decodeURI(safePath);

    // Candidate locations for local dev and serverless containers
    const candidates = [
        path.join(__dirname, decoded),
        path.join(process.cwd(), decoded),
        path.join(__dirname, '..', decoded)
    ];

    let filePath = candidates.find(p => fs.existsSync(p));

    // Fallback: If looking for index.html, check directly in root
    if (!filePath && safePath === '/index.html') {
        const indexCandidates = [
            path.join(__dirname, 'index.html'),
            path.join(process.cwd(), 'index.html')
        ];
        filePath = indexCandidates.find(p => fs.existsSync(p));
    }

    if (!filePath) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`404 Not Found: ${safePath}`);
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Server Error: ' + err.code);
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
}

// MAIN HTTP REQUEST HANDLER (Dual-mode: Standalone Server + Vercel Serverless Function)
async function handleRequest(req, res) {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end();
        return;
    }

    let effectiveUrl = req.url || '/';
    if (req.headers && req.headers['x-matched-path']) {
        const matched = req.headers['x-matched-path'].split('?')[0];
        if (matched && matched.startsWith('/api') && !matched.startsWith('/api/index')) {
            effectiveUrl = matched;
        }
    } else if (req.headers && req.headers['x-forwarded-uri']) {
        const forwarded = req.headers['x-forwarded-uri'].split('?')[0];
        if (forwarded && forwarded.startsWith('/api') && !forwarded.startsWith('/api/index')) {
            effectiveUrl = forwarded;
        }
    }

    const urlObj = new URL(effectiveUrl, `http://${req.headers.host || 'localhost'}`);
    let pathname = urlObj.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
    }
    const method = req.method;

    // --- REST API ENDPOINTS ---

    // DEBUG ENDPOINT FOR VERCEL
    if (pathname === '/api/debug') {
        sendJson(res, 200, {
            url: req.url,
            effectiveUrl,
            pathname,
            method,
            headers: req.headers,
            cwd: process.cwd(),
            dirname: __dirname,
            cwdFiles: fs.existsSync(process.cwd()) ? fs.readdirSync(process.cwd()) : [],
            dirnameFiles: fs.existsSync(__dirname) ? fs.readdirSync(__dirname) : []
        });
        return;
    }

    // 0. GET /api/db-status
    if (pathname === '/api/db-status' && method === 'GET') {
        const isConn = await db.checkConnection();
        const cfg = db.getDatabaseConfig ? db.getDatabaseConfig() : {};
        const isTiDB = cfg.host && cfg.host.toLowerCase().includes('tidbcloud');
        sendJson(res, 200, {
            success: true,
            databaseConnected: isConn,
            type: isConn ? (isTiDB ? 'TiDB Cloud (Serverless)' : 'MySQL / MariaDB') : 'JSON Storage (Fallback)',
            config: {
                host: cfg.host || 'localhost',
                port: cfg.port || 3306,
                user: cfg.user || 'root',
                database: cfg.database || 'freshbasket',
                ssl: !!cfg.ssl
            }
        });
        return;
    }

    // 1. GET /api/products
    if (pathname === '/api/products' && method === 'GET') {
        try {
            if (await db.checkConnection()) {
                const rows = await db.query('SELECT * FROM products ORDER BY id DESC');
                sendJson(res, 200, { success: true, products: rows, source: 'mysql' });
                return;
            }
        } catch (e) {
            // fallback
        }
        const products = readData(PRODUCTS_FILE, DEFAULT_PRODUCTS);
        sendJson(res, 200, { success: true, products, source: 'fallback' });
        return;
    }

    // 2. POST /api/products (Admin)
    if (pathname === '/api/products' && method === 'POST') {
        try {
            const body = await parseBody(req);
            const { name, category, price, image } = body;

            if (!name || !price || isNaN(price)) {
                sendJson(res, 400, { success: false, message: 'Valid name and price required.' });
                return;
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
                    sendJson(res, 201, { success: true, product: newProd, message: 'Product added to MySQL!' });
                    return;
                }
            } catch (e) {
                // fallback
            }

            const products = readData(PRODUCTS_FILE, DEFAULT_PRODUCTS);
            const newProduct = {
                id: Date.now(),
                name: name.trim(),
                category: category || 'Groceries',
                price: cleanPrice,
                image: cleanImage
            };
            products.push(newProduct);
            writeData(PRODUCTS_FILE, products);

            sendJson(res, 201, { success: true, product: newProduct, message: 'Product added successfully!' });
        } catch (e) {
            sendJson(res, 400, { success: false, message: e.message });
        }
        return;
    }

    // 3. DELETE /api/products/:id (Admin)
    if (pathname.startsWith('/api/products/') && method === 'DELETE') {
        const idParam = pathname.split('/')[3];
        const id = parseInt(idParam, 10);

        if (!id) {
            sendJson(res, 400, { success: false, message: 'Invalid product ID' });
            return;
        }

        try {
            if (await db.checkConnection()) {
                await db.query('DELETE FROM products WHERE id = ?', [id]);
                sendJson(res, 200, { success: true, message: 'Product deleted from database.' });
                return;
            }
        } catch (e) {
            // fallback
        }

        let products = readData(PRODUCTS_FILE, DEFAULT_PRODUCTS);
        products = products.filter(p => p.id !== id);
        writeData(PRODUCTS_FILE, products);
        sendJson(res, 200, { success: true, message: 'Product deleted successfully.' });
        return;
    }

    // 4. POST /api/auth/login
    if (pathname === '/api/auth/login' && method === 'POST') {
        try {
            const { email, password, role } = await parseBody(req);
            const cleanEmail = (email || '').trim().toLowerCase();

            try {
                if (await db.checkConnection()) {
                    const rows = await db.query(
                        'SELECT id, name, email, role FROM users WHERE LOWER(email) = ? AND password = ? LIMIT 1',
                        [cleanEmail, password]
                    );
                    if (rows.length > 0) {
                        const user = rows[0];
                        sendJson(res, 200, {
                            success: true,
                            user: { name: user.name, email: user.email, role: user.role },
                            message: `Welcome back, ${user.name}!`
                        });
                        return;
                    }
                }
            } catch (e) {
                // fallback
            }

            const users = readData(USERS_FILE, DEFAULT_USERS);
            const user = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);

            if (!user) {
                sendJson(res, 401, { success: false, message: 'Invalid email or password.' });
                return;
            }

            sendJson(res, 200, {
                success: true,
                user: {
                    name: user.name,
                    email: user.email,
                    role: user.role || role || 'client'
                },
                message: `Welcome back, ${user.name}!`
            });
        } catch (e) {
            sendJson(res, 400, { success: false, message: e.message });
        }
        return;
    }

    // 5. POST /api/auth/register
    if (pathname === '/api/auth/register' && method === 'POST') {
        try {
            const { name, email, password, role } = await parseBody(req);
            const cleanEmail = (email || '').trim().toLowerCase();

            if (!name || !email || !password || password.length < 6) {
                sendJson(res, 400, { success: false, message: 'Password must be at least 6 characters.' });
                return;
            }

            try {
                if (await db.checkConnection()) {
                    const existing = await db.query('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
                    if (existing.length > 0) {
                        sendJson(res, 409, { success: false, message: 'An account with this email already exists.' });
                        return;
                    }
                    const userRole = role === 'admin' ? 'admin' : 'client';
                    await db.query(
                        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                        [name.trim(), cleanEmail, password, userRole]
                    );
                    sendJson(res, 201, {
                        success: true,
                        user: { name: name.trim(), email: cleanEmail, role: userRole },
                        message: 'Account created successfully in database!'
                    });
                    return;
                }
            } catch (e) {
                // fallback
            }

            const users = readData(USERS_FILE, DEFAULT_USERS);
            if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
                sendJson(res, 409, { success: false, message: 'An account with this email already exists.' });
                return;
            }

            const newUser = {
                id: Date.now(),
                name: name.trim(),
                email: cleanEmail,
                password,
                role: role === 'admin' ? 'admin' : 'client'
            };
            users.push(newUser);
            writeData(USERS_FILE, users);

            sendJson(res, 201, {
                success: true,
                user: { name: newUser.name, email: newUser.email, role: newUser.role },
                message: 'Account created successfully!'
            });
        } catch (e) {
            sendJson(res, 400, { success: false, message: e.message });
        }
        return;
    }

    // 6. GET /api/orders (Admin)
    if (pathname === '/api/orders' && method === 'GET') {
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
                sendJson(res, 200, { success: true, orders: rows });
                return;
            }
        } catch (e) {
            // fallback
        }
        const orders = readData(ORDERS_FILE, []);
        sendJson(res, 200, { success: true, orders });
        return;
    }

    // 7. POST /api/orders (Client)
    if (pathname === '/api/orders' && method === 'POST') {
        try {
            const body = await parseBody(req);
            const { customer, email, products, total, address, phone, payment } = body;

            if (!customer || !products || !products.length || !address || !phone) {
                sendJson(res, 400, { success: false, message: 'Missing order details.' });
                return;
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

                    sendJson(res, 201, {
                        success: true,
                        order: { id: orderNum, customer, total: cleanTotal },
                        message: `Order ${orderNum} placed successfully in database!`
                    });
                    return;
                }
            } catch (e) {
                // fallback
            }

            const orders = readData(ORDERS_FILE, []);
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
            writeData(ORDERS_FILE, orders);

            sendJson(res, 201, {
                success: true,
                order: newOrder,
                message: `Order ${newOrder.id} placed successfully!`
            });
        } catch (e) {
            sendJson(res, 400, { success: false, message: e.message });
        }
        return;
    }

    // 8. GET /api/stats
    if (pathname === '/api/stats' && method === 'GET') {
        try {
            if (await db.checkConnection()) {
                const [pCount] = await db.query('SELECT COUNT(*) AS total FROM products');
                const [oStats] = await db.query('SELECT COUNT(*) AS total_orders, COALESCE(SUM(total_amount), 0) AS total_revenue FROM orders');
                sendJson(res, 200, {
                    success: true,
                    stats: {
                        totalProducts: pCount.total,
                        totalOrders: oStats.total_orders,
                        totalRevenue: parseFloat(oStats.total_revenue)
                    }
                });
                return;
            }
        } catch (e) {
            // fallback
        }

        const products = readData(PRODUCTS_FILE, DEFAULT_PRODUCTS);
        const orders = readData(ORDERS_FILE, []);
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

        sendJson(res, 200, {
            success: true,
            stats: {
                totalProducts: products.length,
                totalOrders: orders.length,
                totalRevenue
            }
        });
        return;
    }

    // STATIC FILES
    serveStaticFile(req, res, pathname);
}

// CREATE HTTP SERVER INSTANCE
const server = http.createServer(handleRequest);

// Only listen on port if running as standalone process (not serverless on Vercel)
if (require.main === module && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    server.listen(PORT, async () => {
        console.log(`===============================================`);
        console.log(`🥬 FreshBasket Server running on http://localhost:${PORT}`);
        console.log(`⚙️ Loaded configuration from .env:`);
        console.log(`   - DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
        console.log(`   - DB_PORT: ${process.env.DB_PORT || '3306'}`);
        console.log(`   - DB_USER: ${process.env.DB_USER || 'root'}`);
        console.log(`   - DB_NAME: ${process.env.DB_NAME || 'freshbasket'}`);

        const hasMySQL = await db.checkConnection();
        if (hasMySQL) {
            console.log(`🐬 MySQL Connected! Live SQL queries active.`);
        } else {
            console.log(`📁 File Database Ready. Connect MySQL anytime via .env.`);
        }
        console.log(`===============================================`);
    });
}

module.exports = handleRequest;
module.exports.server = server;
module.exports.handleRequest = handleRequest;
