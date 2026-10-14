const http = require('http');

function post(url, data) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(data);
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve(JSON.parse(b)));
    });
    req.write(payload);
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve(JSON.parse(b)); } catch(e) { resolve(b); }
      });
    });
    req.end();
  });
}

async function test() {
  console.log('Logging in as alex@example.com...');
  const res = await post('http://127.0.0.1:5000/api/auth/login', {
    email: 'alex@example.com',
    password: 'password123'
  });
  console.log('User:', res.user);
  const token = res.token;

  console.log('\nFetching /api/dashboard:');
  const dash = await get('http://127.0.0.1:5000/api/dashboard', token);
  console.log('Dashboard response:', JSON.stringify(dash, null, 2));

  console.log('\n--- Testing newly registered user ---');
  const newUser = await post('http://127.0.0.1:5000/api/auth/register', {
    name: 'Test Student',
    email: `student_${Date.now()}@test.com`,
    password: 'password123'
  });
  console.log('Registered User:', newUser.user);
  const newDash = await get('http://127.0.0.1:5000/api/dashboard', newUser.token);
  console.log('New User Dashboard:', JSON.stringify(newDash, null, 2));
}

test().catch(console.error);
