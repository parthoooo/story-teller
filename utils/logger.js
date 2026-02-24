const isProduction = process.env.NODE_ENV === 'production';

function base(event) {
  return {
    timestamp: new Date().toISOString(),
    event,
  };
}

export const logger = {
  info(event, details = {}) {
    // In production this could be wired to a real log sink
    console.log(JSON.stringify({ level: 'info', ...base(event), ...details }));
  },
  warn(event, details = {}) {
    console.warn(JSON.stringify({ level: 'warn', ...base(event), ...details }));
  },
  error(event, details = {}) {
    // Avoid leaking sensitive data
    const safeDetails = { ...details };
    if (safeDetails.error instanceof Error) {
      safeDetails.error = isProduction
        ? safeDetails.error.message
        : { message: safeDetails.error.message, stack: safeDetails.error.stack };
    }
    console.error(JSON.stringify({ level: 'error', ...base(event), ...safeDetails }));
  },
};

