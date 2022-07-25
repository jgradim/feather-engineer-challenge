import request from 'supertest';

import app, { server } from './index';

describe('HTTP Server', () => {
  afterAll(() => {
    server.close();
  });

  describe('GET /', () => {
    it('responds with text', () => (
      request(app)
        .get('/')
        .expect('content-type', /text/)
        .expect('Server is up and running 🚀')
        .expect(200)
    ));
  });

  describe('GET /policies', () => {
    it('responds with JSON', async () => {
      const res = await request(app)
        .get('/policies');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('filters policies', async () => {
      const res = await request(app)
        .get('/policies?search=this-record-does-not-exist');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body).toHaveLength(0);
    });
  });
});
