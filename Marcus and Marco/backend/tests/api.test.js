const request = require('supertest');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const app = require('../server');
const User = require('../models/User');

let token;
let userId;

beforeAll(async () => {
  // Clean up test data
  await User.deleteMany({ email: 'test@skilltrack.com' });
});

afterAll(async () => {
  await User.deleteMany({ email: 'test@skilltrack.com' });
  await mongoose.connection.close();
});

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@skilltrack.com',
          password: 'password123'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.name).toBe('Test User');
      expect(res.body.user.email).toBe('test@skilltrack.com');
      expect(res.body.user).not.toHaveProperty('password');

      token = res.body.token;
      userId = res.body.user.id;
    });

    it('should not register with existing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User 2',
          email: 'test@skilltrack.com',
          password: 'password123'
        });

      expect(res.status).toBe(400);
    });

    it('should not register without required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'incomplete@test.com' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@skilltrack.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('test@skilltrack.com');
    });

    it('should not login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@skilltrack.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user profile when authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('test@skilltrack.com');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
    });
  });
});

describe('Goals API', () => {
  let goalId;

  describe('POST /api/goals', () => {
    it('should create a goal', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test Goal',
          subject: 'Testing',
          startDate: new Date(),
          targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          priority: 'High',
          targetStudyHours: 20
        });

      expect(res.status).toBe(201);
      expect(res.body.goal.title).toBe('Test Goal');
      goalId = res.body.goal._id;
    });
  });

  describe('GET /api/goals', () => {
    it('should get all goals for user', async () => {
      const res = await request(app)
        .get('/api/goals')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.goals)).toBe(true);
      expect(res.body.goals.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/goals/:id', () => {
    it('should update a goal', async () => {
      const res = await request(app)
        .put(`/api/goals/${goalId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Goal', status: 'In Progress' });

      expect(res.status).toBe(200);
      expect(res.body.goal.title).toBe('Updated Goal');
      expect(res.body.goal.status).toBe('In Progress');
    });
  });

  describe('DELETE /api/goals/:id', () => {
    it('should delete a goal', async () => {
      const res = await request(app)
        .delete(`/api/goals/${goalId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });
});
