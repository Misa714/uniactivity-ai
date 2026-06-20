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

});