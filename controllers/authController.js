const bcrypt = require('bcryptjs');
const db = require('../database/init');
const logger = require('../config/logger');

exports.register = (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const hashedPassword = bcrypt.hashSync(password, 8);

    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashedPassword], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            logger.error('Error registering user', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        // Auto login after register
        req.session.userId = this.lastID;
        req.session.username = username;
        logger.info(`New user registered: ${username}`);
        res.status(201).json({ message: 'User registered', userId: this.lastID, username });
    });
};

exports.login = (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) {
            logger.error('Error logging in', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.userId = user.id;
        req.session.username = user.username;
        logger.info(`User logged in: ${username}`);
        res.json({ message: 'Logged in', userId: user.id, username: user.username });
    });
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            logger.error('Error logging out', err);
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.json({ message: 'Logged out' });
    });
};

exports.me = (req, res) => {
    if (req.session && req.session.userId) {
        res.json({ userId: req.session.userId, username: req.session.username });
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};
