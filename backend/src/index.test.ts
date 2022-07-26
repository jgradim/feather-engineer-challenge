import request from 'supertest';
import * as uuid from 'uuid';

import app, { server } from './index';
import prisma from './db';

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

    it('searches family members names in versions', async () => {
      let policy = await prisma.policy.findFirst({
        where: { provider: 'TK' },
        include: { customer: true, familyMembers: true },
      });

      await request(app)
        .put(`/policies/${policy?.id}`)
        .send({
          familyMembers: { add: [{ firstName: 'John', lastName: 'Doe', dateOfBirth: '2022-01-01' }] }
        });

      let res = await request(app)
        .put(`/policies/${policy?.id}`)
        .send({
          familyMembers: { add: [{ firstName: 'Jane', lastName: 'Doe', dateOfBirth: '2022-01-01' }] }
        });

      let search = await request(app)
        .get('/policies?search=john')

      expect(search.status).toBe(200);
      expect(search.body).toHaveLength(1);

      await request(app)
        .put(`/policies/${policy?.id}`)
        .send({
          familyMembers: {
            remove: [
              { id: res.body.familyMembers[0].id },
              { id: res.body.familyMembers[1].id },
            ]
          }
        });

      const versions = await prisma.policyVersion.findMany({
        where: { policyId: policy?.id },
      });

      expect(versions).toHaveLength(3);

      search = await request(app)
        .get('/policies?search=john')

      expect(search.status).toBe(200);
      expect(search.body).toHaveLength(1);

      search = await request(app)
        .get('/policies?search=JANE')

      expect(search.status).toBe(200);
      expect(search.body).toHaveLength(1);

      search = await request(app)
        .get('/policies?search=doE')

      expect(search.status).toBe(200);
      expect(search.body).toHaveLength(1);
    });
  });

  describe('GET /policies/:id/history', () => {
    it('returns 400 if params are invalid', async () => {
      const res = await request(app)
        .get('/policies/1/history');

      expect(res.status).toBe(400);
    });

    it('returns 404 if policy is not found', async () => {
      const res = await request(app)
        .get(`/policies/${uuid.v4()}/history`);

      expect(res.status).toBe(404);
    });

    it('returns policy versions', async () => {
      const policy = await prisma.policy.findFirst({
        where: { provider: 'AOK' },
        include: { customer: true, familyMembers: true },
      });

      expect(policy?.latestVersion).toBe(0);
      expect(policy?.familyMembers).toHaveLength(0);

      await request(app)
        .put(`/policies/${policy?.id}`)
        .send({
          familyMembers: { add: [{ firstName: 'John', lastName: 'Doe', dateOfBirth: '2022-01-01' }] }
        });

      let versions = await request(app)
        .get(`/policies/${policy?.id}/history`)

      expect(versions.status).toBe(200);
      expect(versions.body).toHaveLength(1);

      await request(app)
        .put(`/policies/${policy?.id}`)
        .send({
          familyMembers: { add: [{ firstName: 'Jane', lastName: 'Doe', dateOfBirth: '2022-01-01' }] }
        });

      versions = await request(app)
        .get(`/policies/${policy?.id}/history`)

      expect(versions.status).toBe(200);
      expect(versions.body).toHaveLength(2);
    });
  });

  describe('PUT /policies/:id', () => {
    it('returns 400 if params are invalid', async () => {
      const res = await request(app)
        .put('/policies/1');

      expect(res.status).toBe(400);
    });

    it('returns 204 if request body does not produce any updates', async () => {
      const policy = await prisma.policy.findFirst();

      const res = await request(app)
        .put(`/policies/${policy?.id}`)
        .send({
          familyMembers: {
            create: [{ firstName: 'John', lastName: 'Doe', dateOfBirth: '2022-01-01' }],
            delete: [{ id: uuid.v4() }],
          }
        });

      expect(res.status).toBe(204);
    });

    it('returns 400 if request body is invalid', async () => {
      const policy = await prisma.policy.findFirst();

      let res = await request(app)
        .put(`/policies/${policy?.id}`)
        .send({
          familyMembers: {
            add: [{ firstName: '', lastName: 'Doe', dateOfBirth: 'earlier this year' }],
            remove: [{ id: 1 }],
          }
        });

      expect(res.status).toBe(400);

      res = await request(app)
        .put(`/policies/${policy?.id}`)
        .send({
          familyMembers: {
            add: { firstName: 'John', lastName: 'Doe', dateOfBirth: 'earlier this year' },
          }
        });

      expect(res.status).toBe(400);
    });

    it('returns 404 if policy is not found', async () => {
      const res = await request(app)
        .put(`/policies/${uuid.v4()}`);

      expect(res.status).toBe(404);
    });

    it('adds and removes family members, creates versions', async () => {
      const policy = await prisma.policy.findFirst({
        where: { provider: 'DAK' },
        include: { customer: true, familyMembers: true },
      });

      expect(policy?.latestVersion).toBe(0);
      expect(policy?.familyMembers).toHaveLength(0);

      const add = await request(app)
        .put(`/policies/${policy?.id}`)
        .send({
          familyMembers: {
            add: [
              { firstName: 'John', lastName: 'Doe', dateOfBirth: '2022-01-01' },
              { firstName: 'Jane', lastName: 'Doe', dateOfBirth: '2022-01-01' },
            ],
          }
        });

      expect(add.status).toBe(200);
      expect(add.body.familyMembers).toHaveLength(2);

      let versions = await prisma.policyVersion.findMany({
        where: { policyId: policy?.id },
        orderBy: { version: 'asc' },
      });

      expect(versions).toHaveLength(1);
      // @ts-ignore
      expect(versions[0].data.familyMembers).toHaveLength(0);
      expect(versions[0].version).toBe(1);

      const remove = await request(app)
        .put(`/policies/${policy?.id}`)
        .send({
          familyMembers: {
            remove: [
              { id: add.body.familyMembers[0].id }
            ]
          }
        });

      expect(remove.status).toBe(200);
      expect(remove.body.familyMembers).toHaveLength(1);

      versions = await prisma.policyVersion.findMany({
        where: { policyId: policy?.id },
        orderBy: { version: 'asc' },
      });

      expect(versions).toHaveLength(2);
      // @ts-ignore
      expect(versions[0].data.familyMembers).toHaveLength(0);
      expect(versions[0].version).toBe(1);
      // @ts-ignore
      expect(versions[1].data.familyMembers).toHaveLength(2);
      expect(versions[1].version).toBe(2);
    });
  });
});
