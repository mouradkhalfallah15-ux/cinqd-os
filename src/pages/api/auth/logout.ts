import type { APIRoute } from 'astro';

export const POST: APIRoute = async () => {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'cinqd_session=; HttpOnly; Path=/; Domain=.mkd-distrib.com; SameSite=Strict; Max-Age=0',
    },
  });
};
