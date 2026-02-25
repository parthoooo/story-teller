import { logger } from '../utils/logger';

describe('logger', () => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  beforeEach(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  });

  it('logs info with level and event', () => {
    logger.info('test_event', { foo: 'bar' });

    expect(console.log).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(console.log.mock.calls[0][0]);
    expect(payload.level).toBe('info');
    expect(payload.event).toBe('test_event');
    expect(payload.foo).toBe('bar');
    expect(typeof payload.timestamp).toBe('string');
  });

  it('logs warn with level and event', () => {
    logger.warn('warn_event', { a: 1 });

    expect(console.warn).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(console.warn.mock.calls[0][0]);
    expect(payload.level).toBe('warn');
    expect(payload.event).toBe('warn_event');
    expect(payload.a).toBe(1);
  });

  it('sanitizes error objects in error logs', () => {
    const err = new Error('boom');
    logger.error('error_event', { error: err });

    expect(console.error).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(console.error.mock.calls[0][0]);
    expect(payload.level).toBe('error');
    expect(payload.event).toBe('error_event');
    expect(payload.error).toBeDefined();
  });
});

