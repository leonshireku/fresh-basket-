const fs = require('fs');
const path = require('path');

const DEFAULT_PRODUCTS = [
    { id: 1, name: "Fresh Tomatoes", category: "Vegetables", price: 120, image: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=500" },
    { id: 2, name: "Red Onions", category: "Vegetables", price: 150, image: "https://images.unsplash.com/photo-1508747703725-719777637510?w=500" },
    { id: 3, name: "Bananas", category: "Fruits", price: 100, image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500" },
    { id: 4, name: "Apples", category: "Fruits", price: 280, image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500" },
    { id: 5, name: "Fresh Milk", category: "Dairy", price: 75, image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500" },
    { id: 6, name: "Eggs", category: "Dairy", price: 480, image: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=500" },
    { id: 7, name: "Rice", category: "Groceries", price: 320, image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500" },
    { id: 8, name: "Cooking Oil", category: "Groceries", price: 250, image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500" }
];

const DEFAULT_USERS = [
    { id: 1, name: "Store Administrator", email: "admin@freshbasket.com", password: "admin123", role: "admin" },
    { id: 2, name: "Jane Customer", email: "jane@freshbasket.com", password: "client123", role: "client" }
];

const memStorage = {
    products: [...DEFAULT_PRODUCTS],
    users: [...DEFAULT_USERS],
    orders: []
};

function readFallbackData(key, defaultData) {
    if (memStorage[key] && memStorage[key].length > 0) {
        return memStorage[key];
    }
    try {
        const p = path.join(__dirname, '..', 'data', `${key}.json`);
        if (fs.existsSync(p)) {
            const raw = fs.readFileSync(p, 'utf-8');
            const parsed = JSON.parse(raw);
            memStorage[key] = parsed;
            return parsed;
        }
    } catch (e) {}
    return defaultData;
}

function writeFallbackData(key, data) {
    memStorage[key] = data;
    try {
        const dir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const p = path.join(dir, `${key}.json`);
        fs.writeFileSync(p, JSON.stringify(data, null, 2));
    } catch (e) {}
}

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

function sendJson(res, statusCode, data) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (typeof res.status === 'function' && typeof res.json === 'function') {
        return res.status(statusCode).json(data);
    }

    res.writeHead(statusCode);
    res.end(JSON.stringify(data));
}

module.exports = {
    DEFAULT_PRODUCTS,
    DEFAULT_USERS,
    readFallbackData,
    writeFallbackData,
    parseBody,
    sendJson
};

