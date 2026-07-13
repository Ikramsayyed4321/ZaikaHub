import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './app.js';

describe('auth api', () => {
  it('rejects invalid login credentials', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'missing@example.com',
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
  });
});
