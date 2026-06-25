const request = require('supertest');
const app = require('../src/app');

describe('Pruebas Funcionales Base de la API', () => {
  it('Debería responder status ok en el endpoint de health', async () => {
    const res = await request(app).get('/api/health');

    // Aserciones estrictas para verificar la respuesta
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body.status).toEqual('ok');
    expect(res.body.message).toContain('Servidor UniActivity AI levantado.');
  });

  describe('Pruebas de Seguridad (Middleware de Autenticación)', () => {
    it('Debería denegar el acceso a GET /api/activities sin un token JWT', async () => {
      const res = await request(app).get('/api/activities');
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Acceso denegado. Token no proporcionado.');
    });

    it('Debería denegar el acceso a POST /api/ai/generate sin un token JWT', async () => {
      const res = await request(app).post('/api/ai/generate').send({ title: 'Docker' });
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toContain('Acceso denegado. Token no proporcionado.');
    });
  });
});
