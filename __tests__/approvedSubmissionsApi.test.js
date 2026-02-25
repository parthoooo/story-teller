import handler from '../pages/api/approved-submissions';

jest.mock('../lib/mongodb', () => jest.fn(async () => {}));

const findMock = jest.fn(() => ({
  select: () => ({
    sort: () => ({
      skip: () => ({
        limit: () => ({
          lean: async () => [
            {
              _id: 'abc123',
              personalInfo: { firstName: 'Alice', lastName: 'Doe' },
              content: {
                textStory: 'Hello',
                audioRecording: {
                  filename: 'a.webm',
                  duration: 10,
                  size: 1234,
                  transcriptGenerated: true,
                  fullTranscript: 'Transcript',
                  wordTimings: [],
                  transcriptConfidence: 0.9,
                },
              },
              submittedAt: new Date('2024-01-01'),
              procResponses: {},
              tags: ['health'],
              collectionSlug: 'youth-2025',
            },
          ],
        }),
      }),
    }),
  }),
}));

const countMock = jest.fn(async () => 1);

jest.mock('../models/Submission', () => ({
  __esModule: true,
  default: {
    find: (...args) => findMock(...args),
    countDocuments: (...args) => countMock(...args),
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

describe('/api/approved-submissions', () => {
  it('builds base query and returns formatted submissions', async () => {
    const req = {
      method: 'GET',
      query: { limit: '10', page: '1', tag: '', collection: '' },
    };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(findMock).toHaveBeenCalledWith({
      status: 'approved',
      'content.audioRecording.hasRecording': true,
      'content.audioRecording.filename': { $ne: '' },
    });
    expect(countMock).toHaveBeenCalled();
    expect(res.body.submissions).toHaveLength(1);
    const sub = res.body.submissions[0];
    expect(sub.id).toBe('abc123');
    expect(sub.tags).toEqual(['health']);
    expect(sub.collectionSlug).toBe('youth-2025');
  });

  it('applies tag and collection filters', async () => {
    const req = {
      method: 'GET',
      query: { tag: 'joy', collection: 'summer', limit: '5', page: '1' },
    };
    const res = makeRes();

    await handler(req, res);

    expect(findMock).toHaveBeenCalledWith({
      status: 'approved',
      'content.audioRecording.hasRecording': true,
      'content.audioRecording.filename': { $ne: '' },
      tags: 'joy',
      collectionSlug: 'summer',
    });
    expect(res.statusCode).toBe(200);
  });
});

