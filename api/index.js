// Vercel Serverless Function Entry Point for FreshBasket / Freshmat APIs
const handleRequest = require('../server');

module.exports = async (req, res) => {
    try {
        return await handleRequest(req, res);
    } catch (err) {
        console.error('Serverless Function Error:', err);
        if (!res.headersSent) {
            res.writeHead(500, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
                success: false,
                error: err.message || 'Internal Server Error'
            }));
        }
    }
};

