import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import app from '../app.js';
import { Instructor } from '../models/Instructor.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  await Instructor.create([
    {
      name: 'Prof. Alice Smith',
      username: 'prof.smith',
      password: 'password123',
      department: 'CS',
      role: 'instructor',
      privateEmail: 'alice.smith@university.edu',
      privatePhone: '+1-555-0101'
    },
    {
      name: 'Portal Administrator',
      username: 'admin',
      password: 'S3cr3t-Admin-Pw!',
      department: 'IT',
      role: 'superadmin',
      apiKey: 'secret-api-key',
      privateEmail: 'root@university.edu',
      privatePhone: '+1-555-0000'
    }
  ]);
});

afterEach(async () => {
  await Instructor.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('instructor portal', () => {
  it('authenticates valid credentials and returns only public profile fields', async () => {
    const response = await request(app)
      .post('/api/instructors/login')
      .send({ username: 'prof.smith', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body.instructor).toMatchObject({
      name: 'Prof. Alice Smith',
      username: 'prof.smith',
      department: 'CS',
      role: 'instructor'
    });
    expect(response.body.instructor).not.toHaveProperty('password');
    expect(response.body.instructor).not.toHaveProperty('apiKey');
    expect(response.body.instructor).not.toHaveProperty('privateEmail');
    expect(response.body.instructor).not.toHaveProperty('privatePhone');
  });

  it('rejects invalid credentials', async () => {
    const response = await request(app)
      .post('/api/instructors/login')
      .send({ username: 'admin', password: 'wrong' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Invalid credentials' });
  });

  it.each([
    ['not-equal operator', { username: { $ne: null }, password: { $ne: null } }],
    ['greater-than operator', { username: { $gt: '' }, password: { $gt: '' } }],
    ['password regex operator', { username: 'admin', password: { $regex: '^S' } }]
  ])('rejects login input containing a %s', async (_label, payload) => {
    const response = await request(app).post('/api/instructors/login').send(payload);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Invalid request' });
  });

  it('searches by a literal name substring and returns only public fields', async () => {
    const response = await request(app).get('/api/instructors/search?name=Smith');

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.instructors[0]).toMatchObject({
      name: 'Prof. Alice Smith',
      department: 'CS',
      role: 'instructor'
    });
    expect(response.body.instructors[0]).not.toHaveProperty('password');
    expect(response.body.instructors[0]).not.toHaveProperty('apiKey');
    expect(response.body.instructors[0]).not.toHaveProperty('privateEmail');
    expect(response.body.instructors[0]).not.toHaveProperty('privatePhone');
  });

  it('rejects operator injection in instructor search', async () => {
    const response = await request(app)
      .get('/api/instructors/search?role%5B%24ne%5D=instructor');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Invalid request' });
  });

  it('rejects a $where search instead of passing it to MongoDB', async () => {
    const response = await request(app)
      .get('/api/instructors/search?%24where=this.password.length%3E10');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Invalid request' });
  });

  it('rejects search fields outside the public search allow-list', async () => {
    const response = await request(app).get('/api/instructors/search?privateEmail=hidden');

    expect(response.status).toBe(400);
  });

  it('does not select password hashes for instructor directory results', async () => {
    const response = await request(app).get('/api/instructors/');

    expect(response.status).toBe(200);
    expect(response.body.instructors).toHaveLength(2);
    for (const instructor of response.body.instructors) {
      expect(instructor).not.toHaveProperty('password');
      expect(instructor).not.toHaveProperty('apiKey');
      expect(instructor).not.toHaveProperty('privateEmail');
      expect(instructor).not.toHaveProperty('privatePhone');
    }
  });

  it('stores passwords as bcrypt hashes', async () => {
    const instructor = await Instructor.findOne({ username: 'prof.smith' }).select('+password');

    expect(instructor.password).toMatch(/^\$2[aby]\$/);
    expect(await instructor.comparePassword('password123')).toBe(true);
  });
});
