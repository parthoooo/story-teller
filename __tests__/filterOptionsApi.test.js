import handler from '../pages/api/filter-options';

jest.mock('../lib/mongodb', () => jest.fn(async () => {}));

const aggregateMock = jest.fn(async () => [
  { _id: 'health' },
  { _id: 'joy' },
]);

jest.mock('../models/Submission', () => ({
  __esModule: true,
  default: {
    aggregate: (...args) => aggregateMock(...args),
  },
}));

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

describe('/api/filter-options', () => {
  it('returns distinct tags from approved submissions', async () => {
    const req = { method: 'GET' };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.tags)).toBe(true);
    expect(res.body.tags).toContain('health');
    expect(res.body.tags).toContain('joy');
  });
});

