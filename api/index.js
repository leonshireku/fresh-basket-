const { sendJson } = require('./_helper');

module.exports = async (req, res) => {
    sendJson(res, 200, {
        success: true,
        message: 'FreshBasket API is operational',
        endpoints: [
            '/api/products',
            '/api/orders',
            '/api/stats',
            '/api/db-status',
            '/api/auth/login',
            '/api/auth/register'
        ]
    });
};
