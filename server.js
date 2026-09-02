require('dotenv').config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const logger = require('./config/logger');
const socketHandler = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

// Trust Proxy (Required for Render/Heroku SSL termination)
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-eval added as per requirement
            connectSrc: ["'self'", "ws:", "wss:"], // Needed for WebSocket
            imgSrc: ["'self'", "data:"],
            mediaSrc: ["'self'"]
        }
    }
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Logging request
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// Redirect .html requests to clean URLs
app.use((req, res, next) => {
    if (req.path.endsWith('.html')) {
        const cleanPath = req.path.slice(0, -5);
        return res.redirect(301, cleanPath === '' ? '/' : cleanPath);
    }
    next();
});

// Static files
app.use(express.static(path.join(__dirname, "public"), { extensions: ['html'] }));

// Socket.io Setup
const io = socketIo(server, {
    cors: {
        origin: "*", // Adjust for production
        methods: ["GET", "POST"]
    }
});

// Initialize Socket Logic
socketHandler(io);

// Only start server if this file is run directly
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        logger.info(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = { app, server };
