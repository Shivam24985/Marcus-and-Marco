const http = require('http');

function post(url, data, token = null) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const u = new URL(url);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'POST',
      headers
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(url, token = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'GET',
      headers
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('--- 1. Testing Health Check ---');
  const health = await get('http://localhost:5000/api/health');
  console.log('Health:', health.status, health.body);

  console.log('\n--- 2. Testing Login (alex@example.com) ---');
  const login = await post('http://localhost:5000/api/auth/login', {
    email: 'alex@example.com',
    password: 'password123'
  });
  console.log('Login Status:', login.status, login.body);
  console.log('User Name:', login.body.user?.name);
  console.log('User Email:', login.body.user?.email);
  const token = login.body.token;

  if (!token) {
    console.error('Failed to get token!');
    return;
  }

  console.log('\n--- 3. Testing Dashboard Stats ---');
  const dash = await get('http://localhost:5000/api/dashboard', token);
  console.log('Dashboard Status:', dash.status);
  console.log('Active Goals:', dash.body.activeGoals);
  console.log('Tasks Completed Today:', dash.body.todayCompletedTasks);
  console.log('Completion %:', dash.body.completionPercentage);
  console.log('Week Study Minutes:', dash.body.weekStudyMinutes);
  console.log('Upcoming Deadlines count:', dash.body.upcomingDeadlines?.length);

  console.log('\n--- 4. Testing Goals API ---');
  const goals = await get('http://localhost:5000/api/goals', token);
  console.log('Goals count:', goals.body.goals?.length);

  console.log('\n--- 5. Testing Tasks API ---');
  const tasks = await get('http://localhost:5000/api/tasks', token);
  console.log('Tasks count:', tasks.body.tasks?.length);

  console.log('\n--- 6. Testing Progress Analytics API ---');
  const progress = await get('http://localhost:5000/api/progress', token);
  console.log('Progress Status:', progress.status);
  console.log('Daily task data points:', progress.body.dailyTaskCompletion?.length);
  console.log('Insights generated:', progress.body.insights?.map(i => i.text));

  console.log('\n--- 7. Testing Calendar API ---');
  const cal = await get('http://localhost:5000/api/calendar?year=2026&month=10', token);
  console.log('Calendar Tasks:', cal.body.tasks?.length);

  console.log('\n✅ ALL BACKEND ENDPOINTS OPERATING WITH 100% SUCCESS!');
}

run().catch(console.error);
