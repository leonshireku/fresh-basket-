const db = require('../db');
const { sendJson } = require('./_helper');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.writeHead(204);
        res.end();
        return;
    }

    try {
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
    } catch (err) {
        sendJson(res, 500, {
            success: false,
            databaseConnected: false,
            error: err.message
        });
    }
};
