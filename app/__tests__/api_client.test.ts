import { fetchHealth, parseHealth } from '../src/api/client';

const okBody = { status: 'ok', version: '0.1.0', postgres: '17.11', postgis: '3.3.7' };

const fakeFetch = (status: number, body: unknown) =>
  (async () => ({ status, json: async () => body })) as unknown as typeof fetch;

describe('Client API /v1/health — conforme à docs/api/openapi.yaml', () => {
  test('réponse 200 conforme → ok', () => {
    expect(parseHealth(200, okBody)).toEqual(okBody);
  });

  test('réponse 200 incomplète → degraded', () => {
    expect(parseHealth(200, { status: 'ok' })).toEqual({ status: 'degraded' });
  });

  test('réponse 503 → degraded', () => {
    expect(parseHealth(503, { status: 'degraded', version: '0.1.0' })).toEqual({ status: 'degraded' });
  });

  test('fetchHealth : succès', async () => {
    await expect(fetchHealth(fakeFetch(200, okBody))).resolves.toEqual(okBody);
  });

  test('fetchHealth : erreur réseau → degraded, sans exception', async () => {
    const failing = (async () => {
      throw new Error('réseau');
    }) as unknown as typeof fetch;
    await expect(fetchHealth(failing)).resolves.toEqual({ status: 'degraded' });
  });
});
