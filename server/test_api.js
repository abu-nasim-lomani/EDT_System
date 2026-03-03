const http = require('http');

const loginData = JSON.stringify({ email: "john@edt.com", password: "admin123" });

const req = http.request(
    { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length } },
    (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
            const token = JSON.parse(body).data.token;
            console.log("Token acquired.");

            http.get({ hostname: 'localhost', port: 5000, path: '/api/tasks', headers: { 'Authorization': `Bearer ${token}` } }, (res2) => {
                let body2 = '';
                res2.on('data', d => body2 += d);
                res2.on('end', () => console.log("Tasks response:", res2.statusCode, body2));
            }).on('error', console.error);
        });
    }
);
req.on('error', console.error);
req.write(loginData);
req.end();
