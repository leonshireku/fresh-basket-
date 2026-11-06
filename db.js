const fs = require('fs');
const path = require('path');

// Auto-load .env variables into process.env
function loadEnv() {
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
}

loadEnv();

let pool = null;
let isConnected = false;
let lastConfigHash = '';

// Flexible configuration extractor: accepts TiDB Cloud, standard MySQL, or connection strings
function getDatabaseConfig() {
    loadEnv();

    // 1. Connection string support (DATABASE_URL / TIDB_URL / MYSQL_URL)
    const connUrl = process.env.DATABASE_URL || process.env.TIDB_URL || process.env.MYSQL_URL;
    if (connUrl) {
        try {
            const parsed = new URL(connUrl);
            const isRemote = parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1';
            return {
                host: parsed.hostname,
                port: parseInt(parsed.port || (parsed.hostname.includes('tidbcloud') ? '4000' : '3306'), 10),
                user: decodeURIComponent(parsed.username || 'root'),
                password: decodeURIComponent(parsed.password || ''),
                database: (parsed.pathname || '').replace(/^\//, '') || 'freshbasket',
                ssl: isRemote ? { minVersion: 'TLSv1.2', rejectUnauthorized: false } : undefined
            };
        } catch (e) {
            console.warn('[Database] Could not parse DATABASE_URL, checking individual env variables...');
        }
    }

    // 2. Individual Environment Variables (accepts both TIDB_* and DB_* / exact TiDB modal labels)
    let host = 'localhost';
    if (process.env.TIDB_HOST) {
        host = process.env.TIDB_HOST;
    } else if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1') {
        host = process.env.DB_HOST;
    } else if (process.env.HOST && process.env.HOST !== '0.0.0.0' && process.env.HOST !== 'localhost') {
        host = process.env.HOST;
    } else if (process.env.DB_HOST) {
        host = process.env.DB_HOST;
    }

    const isRemote = host !== 'localhost' && host !== '127.0.0.1';
    const isTiDB = host.toLowerCase().includes('tidbcloud');

    let portRaw = process.env.TIDB_PORT;
    if (!portRaw && isTiDB) {
        portRaw = (process.env.DB_PORT && process.env.DB_PORT !== '3306') ? process.env.DB_PORT : (process.env.PORT && process.env.PORT !== '3000' ? process.env.PORT : '4000');
    }
    if (!portRaw) {
        portRaw = process.env.DB_PORT || process.env.MYSQL_PORT || (isTiDB ? '4000' : '3306');
    }
    const port = parseInt(portRaw, 10);

    let user = 'root';
    if (process.env.TIDB_USER) {
        user = process.env.TIDB_USER;
    } else if (process.env.TIDB_USERNAME) {
        user = process.env.TIDB_USERNAME;
    } else if (process.env.DB_USER && process.env.DB_USER !== 'root') {
        user = process.env.DB_USER;
    } else if (process.env.DB_USERNAME) {
        user = process.env.DB_USERNAME;
    } else if (process.env.USERNAME && process.env.USERNAME !== 'root' && !process.env.USERNAME.includes('\\') && process.env.USERNAME !== 'Administrator') {
        user = process.env.USERNAME;
    } else if (process.env.DB_USER) {
        user = process.env.DB_USER;
    }

    const password = process.env.TIDB_PASSWORD || 
                     process.env.DB_PASSWORD || 
                     process.env.MYSQL_PASSWORD || 
                     process.env.PASSWORD || 
                     '';

    const database = process.env.TIDB_DATABASE || 
                     process.env.TIDB_DB_NAME || 
                     process.env.DB_DATABASE || 
                     process.env.DATABASE || 
                     process.env.DB_NAME || 
                     process.env.MYSQL_DATABASE || 
                     'freshbasket';

    const enableSsl = process.env.TIDB_ENABLE_SSL === 'true' || 
                      process.env.DB_SSL === 'true' || 
                      process.env.MYSQL_SSL === 'true' || 
                      isRemote; 
                      process.env.MYSQL_SSL === 'true' || 
                      isRemote;

    const ssl = enableSsl ? { minVersion: 'TLSv1.2', rejectUnauthorized: false } : undefined;

    return {
        host,
        port,
        user,
        password,
        database,
        ssl
    };
}

function getConfigHash() {
    const cfg = getDatabaseConfig();
    return [cfg.host, cfg.port, cfg.user, cfg.password, cfg.database, cfg.ssl ? 'ssl' : 'plain'].join('::');
}

function initPool() {
    try {
        const mysql = require('mysql2/promise');
        const currentHash = getConfigHash();
        if (pool && lastConfigHash === currentHash) {
            return pool;
        }

        if (pool) {
            try { pool.end(); } catch (e) {}
        }

        const cfg = getDatabaseConfig();
        const poolConfig = {
            host: cfg.host,
            port: cfg.port,
            user: cfg.user,
            password: cfg.password,
            database: cfg.database,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        };

        if (cfg.ssl) {
            poolConfig.ssl = cfg.ssl;
        }

        pool = mysql.createPool(poolConfig);
        lastConfigHash = currentHash;
        return pool;
    } catch (e) {
        return null;
    }
}

initPool();

// Automatically creates the database and executes schema if missing
async function autoInitDatabase() {
    try {
        const mysql = require('mysql2/promise');
        const cfg = getDatabaseConfig();

        const connConfig = {
            host: cfg.host,
            port: cfg.port,
            user: cfg.user,
            password: cfg.password
        };
        if (cfg.ssl) {
            connConfig.ssl = cfg.ssl;
        }

        // Connect directly to MySQL server without database specified
        const conn = await mysql.createConnection(connConfig);

        // Create database if not exists
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await conn.query(`USE \`${cfg.database}\``);

        // Check if tables already exist
        const [tables] = await conn.query("SHOW TABLES LIKE 'products'");
        if (tables.length === 0) {
            console.log(`[Database] Auto-initializing schema for '${cfg.database}' from database.sql...`);
            const sqlPath = path.join(__dirname, 'database.sql');
            if (fs.existsSync(sqlPath)) {
                const sqlScript = fs.readFileSync(sqlPath, 'utf8');
                const statements = sqlScript
                    .split(/;\s*[\r\n]+/)
                    .map(s => s.trim())
                    .filter(s => s.length > 0 && !s.startsWith('--') && !s.toLowerCase().startsWith('create database') && !s.toLowerCase().startsWith('use '));

                for (const stmt of statements) {
                    try {
                        await conn.query(stmt);
                    } catch (stmtErr) {
                        // Continue on non-fatal statement warnings
                    }
                }
                console.log(`[Database] Database '${cfg.database}' successfully created and tables seeded.`);
            }
        }
        await conn.end();
        return true;
    } catch (err) {
        return false;
    }
}

// Test connection, re-reading .env dynamically if needed
async function checkConnection() {
    loadEnv();
    const currentHash = getConfigHash();
    if (!pool || lastConfigHash !== currentHash) {
        initPool();
    }
    if (!pool) return false;

    try {
        const conn = await pool.getConnection();
        await conn.ping();
        conn.release();
        isConnected = true;
        return true;
    } catch (err) {
        // If database does not exist yet or connection failed, attempt automatic provisioning
        if (err.code === 'ER_BAD_DB_ERROR' || err.code === 'ECONNREFUSED') {
            const autoSuccess = await autoInitDatabase();
            if (autoSuccess) {
                lastConfigHash = '';
                initPool();
                try {
                    const conn2 = await pool.getConnection();
                    await conn2.ping();
                    conn2.release();
                    isConnected = true;
                    return true;
                } catch (e2) {}
            }
        }
        isConnected = false;
        return false;
    }
}

// Safe SQL query runner with automatic reconnection
async function query(sql, params = []) {
    const connected = await checkConnection();
    if (!connected || !pool) {
        throw new Error('Database not connected. Please verify your credentials in .env');
    }
    const [rows, fields] = await pool.query(sql, params);
    return rows;
}

module.exports = {
    get pool() { return pool; },
    get isConnected() { return isConnected; },
    getDatabaseConfig,
    loadEnv,
    checkConnection,
    query
};
