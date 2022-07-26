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
      expect(res.body[0]).toMatchObject({
        customer: expect.any(Object),
        familyMembers: expect.any(Array),
      });
    });

    it('filters policies', async () => {
      const res = await request(app)
        .get('/policies?search=this-record-does-not-exist');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body).toHaveLength(0);
    });

    it('sorts policies', async () => {
      const resAsc = await request(app)
        .get('/policies?sortField=provider&sortOrder=asc');

      expect(resAsc.status).toBe(200);
      expect(resAsc.headers['content-type']).toMatch(/application\/json/);
      expect(resAsc.body).toBeInstanceOf(Array);
      expect(resAsc.body[0].provider).toBe('AOK');

      const resDesc = await request(app)
        .get('/policies?sortField=provider&sortOrder=desc');

      expect(resDesc.status).toBe(200);
      expect(resDesc.headers['content-type']).toMatch(/application\/json/);
      expect(resDesc.body).toBeInstanceOf(Array);
      expect(resDesc.body[0].provider).toBe('TK');
    });

    it('paginates policies', async () => {
      const firstPage = await request(app)
        .get('/policies?page=1&count=10');

      expect(firstPage.status).toBe(200);
      expect(firstPage.headers['content-type']).toMatch(/application\/json/);
      expect(firstPage.body).toBeInstanceOf(Array);
      expect(firstPage.body).toHaveLength(10);

      const lastPage = await request(app)
        .get('/policies?page=4&count=10');

      expect(lastPage.status).toBe(200);
      expect(lastPage.headers['content-type']).toMatch(/application\/json/);
      expect(lastPage.body).toBeInstanceOf(Array);
      expect(lastPage.body).toHaveLength(10);

      const noPage = await request(app)
        .get('/policies?page=5&count=10');

      expect(noPage.status).toBe(200);
      expect(noPage.headers['content-type']).toMatch(/application\/json/);
      expect(noPage.body).toBeInstanceOf(Array);
      expect(noPage.body).toHaveLength(0);

      const invalidQuery = await request(app)
        .get('/policies?page=a&count=b');

      expect(invalidQuery.status).toBe(200);
      expect(invalidQuery.headers['content-type']).toMatch(/application\/json/);
      expect(invalidQuery.body).toBeInstanceOf(Array);
      expect(invalidQuery.body).toHaveLength(0);

      const negativePage = await request(app)
        .get('/policies?page=-1&count=10');

      expect(negativePage.status).toBe(200);
      expect(negativePage.headers['content-type']).toMatch(/application\/json/);
      expect(negativePage.body).toBeInstanceOf(Array);
      expect(negativePage.body).toHaveLength(10);

      const negativeCount = await request(app)
        .get('/policies?page=1&count=-10');

      expect(negativeCount.status).toBe(200);
      expect(negativeCount.headers['content-type']).toMatch(/application\/json/);
      expect(negativeCount.body).toBeInstanceOf(Array);
      expect(negativeCount.body).toHaveLength(0);
    });

    it('searches, sorts, and paginates', async () => {
      // provider: AOK | TK | DAK => 28 policies in seed file
      const firstPage = await request(app)
        .get('/policies?search=K&sortField=provider&sortOrder=asc&page=1&count=10');

      expect(firstPage.status).toBe(200);
      expect(firstPage.headers['content-type']).toMatch(/application\/json/);
      expect(firstPage.body).toBeInstanceOf(Array);
      expect(firstPage.body).toHaveLength(10);
      expect(firstPage.body[0].provider).toBe('AOK');

      const lastPage = await request(app)
        .get('/policies?search=K&sortField=provider&sortOrder=asc&page=3&count=10');

      expect(lastPage.status).toBe(200);
      expect(lastPage.headers['content-type']).toMatch(/application\/json/);
      expect(lastPage.body).toBeInstanceOf(Array);
      expect(lastPage.body).toHaveLength(8);
      expect(lastPage.body[0].provider).toBe('TK');
    });
  });

});
