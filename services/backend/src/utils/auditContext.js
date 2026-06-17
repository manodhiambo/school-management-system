import { UAParser } from 'ua-parser-js';

// Builds the "who/where/how" metadata captured on every audit log entry.
export function buildAuditContext(req) {
  const ipAddress =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    null;

  const userAgent = req.headers['user-agent'] || null;
  const { device, browser, os } = userAgent
    ? new UAParser(userAgent).getResult()
    : { device: {}, browser: {}, os: {} };

  const browserStr = browser?.name ? `${browser.name} ${browser.version || ''}`.trim() : null;
  const osStr = os?.name ? `${os.name} ${os.version || ''}`.trim() : null;

  return {
    ipAddress,
    userAgent,
    deviceType: device?.type || 'desktop',
    browser: browserStr,
    os: osStr,
  };
}
