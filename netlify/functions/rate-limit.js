// Shared in-memory rate limiter for Netlify functions
const requestCounts = {};

function rateLimit(ip, key, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const id = `${key}:${ip}`;

  if (!requestCounts[id]) {
    requestCounts[id] = { count: 1, resetAt: now + windowMs };
    return { limited: false, remaining: limit - 1, resetAt: requestCounts[id].resetAt };
  }

  if (now > requestCounts[id].resetAt) {
    requestCounts[id] = { count: 1, resetAt: now + windowMs };
    return { limited: false, remaining: limit - 1, resetAt: requestCounts[id].resetAt };
  }

  requestCounts[id].count++;

  if (requestCounts[id].count > limit) {
    return { limited: true, remaining: 0, resetAt: requestCounts[id].resetAt };
  }

  return { limited: false, remaining: limit - requestCounts[id].count, resetAt: requestCounts[id].resetAt };
}

function getIP(event) {
  return event.headers['cf-connecting-ip'] ||
         event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         event.headers['x-real-ip'] ||
         'unknown';
}

function limitedResponse() {
  return {
    statusCode: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    body: JSON.stringify({ error: 'Too many requests. Please try again in a minute.' })
  };
}

module.exports = { rateLimit, getIP, limitedResponse };
