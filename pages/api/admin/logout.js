import { serialize } from 'cookie';

const TOKEN_NAME = 'adminToken';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const isProduction = process.env.NODE_ENV === 'production';

  // Clear the auth cookie by setting it expired
  res.setHeader(
    'Set-Cookie',
    serialize(TOKEN_NAME, '', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  );

  res.status(200).json({ message: 'Logged out' });
}

