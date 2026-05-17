import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/db';
import { signToken } from '@/lib/jwt';

export const POST: APIRoute = async ({ request }) => {
  let email: string, password: string;

  try {
    ({ email, password } = await request.json());
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  if (!email || !password) {
    return json({ error: 'Email and password are required.' }, 400);
  }

  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT id, email, password_hash, role FROM cinqd_users WHERE email = $1 LIMIT 1',
    [email.trim().toLowerCase()]
  );

  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' }, 401);
  }

  const token = await signToken({ uid: user.id, email: user.email, role: user.role });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': [
        `cinqd_session=${token}`,
        'HttpOnly',
        'Path=/',
        'Domain=.mkd-distrib.com',
        'SameSite=Strict',
        'Max-Age=28800',
      ].join('; '),
    },
  });
};

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
