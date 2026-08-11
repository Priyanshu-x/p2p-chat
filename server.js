require('dotenv').config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const logger = require('./config/logger');
const authRoutes = require('./routes/authRoutes');
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

// Session Setup
const sessionMiddleware = session({
    store: new SQLiteStore({ db: 'sessions.db', dir: './database' }),
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
});

app.use(sessionMiddleware);

// Logging request
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);

// Static files (protected or public?)
// We'll serve login/register freely, but protect dashboard if we had one.
// The root '/' serves index.html, which now needs auth check.
app.use(express.static(path.join(__dirname, "public"), { extensions: ['html'] }));

// Route to check auth status for frontend redirection
app.get('/api/auth/status', (req, res) => {
    if (req.session.userId) res.json({ authenticated: true });
    else res.json({ authenticated: false });
});

// Socket.io Setup
const io = socketIo(server, {
    cors: {
        origin: "*", // Adjust for production
        methods: ["GET", "POST"]
    }
});

// Share session with socket.io
const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));

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
