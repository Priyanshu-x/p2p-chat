const request = require('supertest');
const { app, server } = require('../server');
const fs = require('fs');
const path = require('path');

// Clean up database after tests? 
// For now, these tests run against the persistent dev DB if we don't config otherwise.
// Ideally usage of NODE_ENV=test should switch to :memory: DB, but let's just test basic connectivity 
// and logic without destructive actions or mocking too much for this prototype.
// Actually, let's just allow it to create users in the main DB for now for simplicity, 
// or maybe fail if user exists.

describe('Authentication API', () => {
    let testUser = `testuser_${Date.now()}`;
    let testPass = 'password123';

    afterAll((done) => {
        server.close(done);
    });

    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: testUser,
                password: testPass
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('userId');
    });

    it('should login with the new user', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                username: testUser,
                password: testPass
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Logged in');
    });

    it('should block unauthorized access', async () => {
        const res = await request(app)
            .get('/api/auth/me');

        expect(res.statusCode).toEqual(401);
    });
});
