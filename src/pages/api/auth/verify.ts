import type { APIRoute } from 'astro';
import { verifyToken } from '@/lib/jwt';

export const GET: APIRoute = async ({ request }) => {
  const cookie = request.headers.get('cookie') ?? '';
  const match  = cookie.match(/cinqd_session=([^;]+)/);
  const token  = match?.[1];

  if (!token) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ authenticated: true, user: payload }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
