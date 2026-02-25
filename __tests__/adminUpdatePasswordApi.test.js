jest.mock('../lib/mongodb', () => jest.fn(async () => {}));

const comparePasswordMock = jest.fn();
const saveMock = jest.fn(async () => {});

jest.mock('../models/Admin', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(async () => ({
      _id: 'admin1',
      username: 'admin',
      comparePassword: comparePasswordMock,
      save: saveMock,
    })),
  },
}));

jest.mock('../middleware/adminAuth', () => ({
  __esModule: true,
  // Bypass auth in tests; delegate directly to handler
  default: (req, res, next) => next(),
  withAuth: (handler) => handler,
}));

import handler from '../pages/api/admin/update-password';

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

describe('/api/admin/update-password', () => {
  it('rejects non-POST methods', async () => {
    const req = { method: 'GET' };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
  });

  it('validates required fields', async () => {
    const req = { method: 'POST', body: { currentPassword: '', newPassword: '' } };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Current and new password are required');
  });

  it('validates new password length', async () => {
    const req = { method: 'POST', body: { currentPassword: 'oldpass', newPassword: 'short' } };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('at least 8 characters');
  });

  it('updates password when current password matches', async () => {
    comparePasswordMock.mockResolvedValueOnce(true);
    const req = { method: 'POST', body: { currentPassword: 'oldpass', newPassword: 'newpassword123' }, admin: { _id: 'admin1' } };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain('Password updated successfully');
    expect(saveMock).toHaveBeenCalled();
  });
});

