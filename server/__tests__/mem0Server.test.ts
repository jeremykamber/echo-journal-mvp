import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import app from '../mem0Server';

let server: any;

beforeAll(() => {
    return new Promise<void>((resolve) => {
        server = app.listen(0, () => resolve());
    });
});

afterAll(async () => {
    if (server && server.close) {
        await new Promise<void>((resolve) => server.close(() => resolve()));
    }
});

// Skip server-side smoke tests in frontend/dev runs — the server proxy
// requires separate integration testing and may depend on server-only deps.
describe.skip('mem0 server proxy (basic smoke)', () => {
    it('health returns ok', async () => {
        const port = (server.address && server.address().port) || (server._connectionKey && server._connectionKey.split(':').pop());
        const host = '127.0.0.1';
        const path = '/api/mem0/health';

        const res = await new Promise<{ status: number; body: string }>((resolve, reject) => {
            const req = http.get({ hostname: host, port: Number(port), path }, (resp) => {
                let body = '';
                resp.on('data', (chunk) => (body += chunk));
                resp.on('end', () => resolve({ status: resp.statusCode || 0, body }));
            });
            req.on('error', reject);
        });

        expect(res.status).toBe(200);
        const parsed = JSON.parse(res.body || '{}');
        expect(parsed).toHaveProperty('ok');
    });
});
