const generateCSP = () => {
  const policy = {};

  const add = (directive, value, options = {}) => {
    // eslint-disable-next-line no-undef
    if (options.devOnly && SENTRY_ENVIRONMENT !== 'development') return;
    const curr = policy[directive];
    policy[directive] = curr ? [...curr, value] : [value];
  };

  add('default-src', `'none'`);
  add('script-src-elem', `'self'`);
  add('style-src', `'unsafe-inline'`);
  add('style-src', 'https://fonts.googleapis.com');
  add('font-src', 'https://fonts.gstatic.com');
  add('manifest-src', `'self'`);
  add('img-src', `'self'`);
  add('script-src', `'unsafe-eval'`, { devOnly: true });
  add('connect-src', `'self'`, { devOnly: true });
  add('connect-src', 'https://*.ingest.sentry.io');

  return Object.entries(policy)
    .map(([key, value]) => `${key} ${value.join(' ')}`)
    .join('; ');
};

export default generateCSP;
