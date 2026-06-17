const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6_RE = /^[0-9a-fA-F:]+$/;

export function isValidIp(ip) {
  if (IPV4_RE.test(ip)) {
    return ip.split('.').every(octet => Number(octet) <= 255);
  }
  return ip.includes(':') && IPV6_RE.test(ip);
}

export function isPrivateIp(ip) {
  if (ip === '::1' || ip === '127.0.0.1') return true;
  const m = ip.match(IPV4_RE);
  if (m) {
    const [, a, b] = m.map(Number);
    return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 127;
  }
  return ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80');
}
