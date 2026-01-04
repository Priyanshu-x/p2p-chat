const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../config/logger');

const dbPath = path.resolve(__dirname, 'chat.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        logger.error('Could not connect to database', err);
    } else {
        logger.info('Connected to SQLite database');
    }
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);
});

module.exports = db;
