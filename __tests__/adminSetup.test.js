import handler from '../pages/api/admin/setup';

jest.mock('../lib/mongodb', () => jest.fn(async () => {}));

const mockSave = jest.fn(async () => {});

jest.mock('../models/Admin', () => ({
  __esModule: true,
  default: {
    countDocuments: jest.fn(async () => 0),
  },
  // For `new Admin()`
  default: function Admin(doc) {
    Object.assign(this, doc);
    this.save = mockSave;
  },
}));

describe('admin setup API', () => {
  const makeRes = () => {
    const res = {};
    res.statusCode = 200;
    res.body = null;
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.body = data;
      return res;
    };
    return res;
  };

  it('rejects non-POST methods', async () => {
    const req = { method: 'GET' };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: 'Method not allowed' });
  });

  it('validates missing required fields', async () => {
    const req = {
      method: 'POST',
      body: { username: '', email: '', password: '' },
    };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Username, email, and password are required');
  });

  it('validates invalid email', async () => {
    const req = {
      method: 'POST',
      body: { username: 'admin', email: 'not-an-email', password: 'password123' },
    };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('validates weak password', async () => {
    const req = {
      method: 'POST',
      body: { username: 'admin', email: 'admin@example.com', password: 'short' },
    };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Password must be at least 8 characters');
  });
});

