require('dotenv').config();

module.exports = {
    NODE_SERVER_PORT: process.env.NODE_SERVER_PORT || 3000,
    PYTHON_AGENT_URL: process.env.PYTHON_AGENT_URL || 'http://localhost:5000',
    PYTHON_VISION_URL: process.env.PYTHON_VISION_URL || 'http://localhost:5001',
}