import { verifyToken } from './jwt';

export async function requireAuth(request: Request): Promise<{ uid: string; email: string; role: string } | null> {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/cinqd_session=([^;]+)/);
  if (!match) return null;
  const payload = await verifyToken(match[1]);
  if (!payload) return null;
  return { uid: payload.uid as string, email: payload.email as string, role: payload.role as string };
}

export function unauth() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
