const http = require('http');

function post(path, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function get(path) { // Simple get, doesn't handle cookie jar for session continuation in this simple script
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET'
        };
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: body ? JSON.parse(body) : {} }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function testAuth() {
    console.log("TESTING AUTHENTICATION...");

    // 1. Register
    const username = `user_${Date.now()}`;
    const password = "password123";
    const data = JSON.stringify({ username, password });

    try {
        const regRes = await post('/api/auth/register', data);
        console.log(`Register Status: ${regRes.status} (Expected 201)`);
        if (regRes.status !== 201) console.error("Register Failed", regRes.body);

        // 2. Login
        const loginRes = await post('/api/auth/login', data);
        console.log(`Login Status: ${loginRes.status} (Expected 200)`);
        if (loginRes.status !== 200) console.error("Login Failed", loginRes.body);

        // 3. Unauthorized access check
        // Note: 'get' helper here doesn't persist cookies, so we expect this to fail or return 401 equivalent if we had a protected API route.
        // But /api/auth/status checks session. Without cookie, it should be false.
        const statusRes = await get('/api/auth/status');
        console.log(`Auth Status check without cookie: ${JSON.stringify(statusRes.body)} (Expected authenticated: false)`);

    } catch (e) {
        console.error("Test Error:", e);
    }
}

// Wait for server to start if running via another process, or just run this standalone
setTimeout(testAuth, 2000);
