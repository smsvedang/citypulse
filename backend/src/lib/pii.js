const allowList = ['route_name', 'zone_name', 'road_name'];
const phoneRegex = /(\+?\d[\d\s().-]{7,}\d)/g;
const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function scrubPii(metadata = {}) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};

  const next = {};
  let redactions = 0;

  for (const [key, value] of Object.entries(metadata)) {
    if (/(name|phone|mobile|email|address|user|reporter|device|imei|ip|account|aadhaar|license|plate)/i.test(key) && !allowList.includes(key)) {
      redactions += 1;
      continue;
    }

    if (typeof value === 'string') {
      let out = value;
      if (emailRegex.test(out)) {
        out = out.replace(emailRegex, '[redacted]');
      }
      if (phoneRegex.test(out)) {
        out = out.replace(phoneRegex, '[redacted]');
      }
      if (out !== value) redactions += 1;
      next[key] = out;
    } else {
      next[key] = value;
    }
  }

  if (redactions > 0) {
    next.pii_redactions = redactions;
  }

  return next;
}
