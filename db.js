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

function getConfigHash() {
    return [
        process.env.DB_HOST || 'localhost',
        process.env.DB_PORT || '3306',
        process.env.DB_USER || 'root',
        process.env.DB_PASSWORD || '',
        process.env.DB_NAME || 'freshbasket'
    ].join('::');
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

        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306', 10),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'freshbasket',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
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
        const host = process.env.DB_HOST || 'localhost';
        const port = parseInt(process.env.DB_PORT || '3306', 10);
        const user = process.env.DB_USER || 'root';
        const password = process.env.DB_PASSWORD || '';
        const dbName = process.env.DB_NAME || 'freshbasket';

        // Connect directly to MySQL server without database specified
        const conn = await mysql.createConnection({
            host,
            port,
            user,
            password
        });

        // Create database if not exists
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await conn.query(`USE \`${dbName}\``);

        // Check if tables already exist
        const [tables] = await conn.query("SHOW TABLES LIKE 'products'");
        if (tables.length === 0) {
            console.log(`[Database] Auto-initializing schema for '${dbName}' from database.sql...`);
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
                console.log(`[Database] Database '${dbName}' successfully created and tables seeded.`);
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
    loadEnv,
    checkConnection,
    query
};
