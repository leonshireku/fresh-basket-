const db = require('../../db');
const { DEFAULT_USERS, readFallbackData, writeFallbackData, parseBody, sendJson } = require('../_helper');

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
        const { name, email, password, role } = await parseBody(req);
        const cleanEmail = (email || '').trim().toLowerCase();

        if (!name || !email || !password || password.length < 6) {
            return sendJson(res, 400, { success: false, message: 'Password must be at least 6 characters.' });
        }

        try {
            if (await db.checkConnection()) {
                const existing = await db.query('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
                if (existing.length > 0) {
                    return sendJson(res, 409, { success: false, message: 'An account with this email already exists.' });
                }
                const userRole = role === 'admin' ? 'admin' : 'client';
                await db.query(
                    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                    [name.trim(), cleanEmail, password, userRole]
                );
                return sendJson(res, 201, {
                    success: true,
                    user: { name: name.trim(), email: cleanEmail, role: userRole },
                    message: 'Account created successfully in database!'
                });
            }
        } catch (e) {
            // fallback
        }

        const users = readFallbackData('users', DEFAULT_USERS);
        if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
            return sendJson(res, 409, { success: false, message: 'An account with this email already exists.' });
        }

        const newUser = {
            id: Date.now(),
            name: name.trim(),
            email: cleanEmail,
            password,
            role: role === 'admin' ? 'admin' : 'client'
        };
        users.push(newUser);
        writeFallbackData('users', users);

        return sendJson(res, 201, {
            success: true,
            user: { name: newUser.name, email: newUser.email, role: newUser.role },
            message: 'Account created successfully!'
        });
    } catch (e) {
        return sendJson(res, 400, { success: false, message: e.message });
    }
};
