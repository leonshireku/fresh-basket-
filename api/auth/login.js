const db = require('../../db');
const { DEFAULT_USERS, readFallbackData, parseBody, sendJson } = require('../_helper');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method !== 'POST') {
        return sendJson(res, 405, { success: false, message: `Method ${req.method} Not Allowed` });
    }

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
                    return sendJson(res, 200, {
                        success: true,
                        user: { name: user.name, email: user.email, role: user.role },
                        message: `Welcome back, ${user.name}!`
                    });
                }
            }
        } catch (e) {
            // fallback
        }

        const users = readFallbackData('users', DEFAULT_USERS);
        const user = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);

        if (!user) {
            return sendJson(res, 401, { success: false, message: 'Invalid email or password.' });
        }

        return sendJson(res, 200, {
            success: true,
            user: {
                name: user.name,
                email: user.email,
                role: user.role || role || 'client'
            },
            message: `Welcome back, ${user.name}!`
        });
    } catch (e) {
        return sendJson(res, 400, { success: false, message: e.message });
    }
};
