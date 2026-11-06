// Vercel Serverless Function Entry Point for FreshBasket / Freshmat APIs
const handleRequest = require('../server');

module.exports = async (req, res) => {
    return handleRequest(req, res);
};

