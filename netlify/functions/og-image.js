// og-image.js — Dynamic OG share card for XEKIE
// Returns a sharp SVG (rendered as image/svg+xml) for each XEKIE
// Usage: /.netlify/functions/og-image?title=...&budget=...&location=...&category=...

exports.handler = async (event) => {
  const p = event.queryStringParameters || {};
  const title    = (p.title    || 'XEKIE — Trade Different').slice(0, 80);
  const budget   = (p.budget   || '').slice(0, 30);
  const location = (p.location || '').slice(0, 40);
  const category = (p.category || '').slice(0, 30);

  function wrapText(text, maxLen) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      if ((line + ' ' + word).trim().length <= maxLen) {
        line = (line + ' ' + word).trim();
      } else {
        if (line) lines.push(line);
        line = word;
      }
      if (lines.length === 2) { line = ''; break; }
    }
    if (line && lines.length < 2) lines.push(line);
    return lines;
  }

  function escapeXml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  const titleLines = wrapText(title, 28);
  const titleY1 = titleLines.length === 1 ? 230 : 210;
  const titleY2 = titleY1 + 68;

  const metaParts = [];
  if (location) metaParts.push('📍 ' + location);
  if (category) metaParts.push(category);
  const metaText = metaParts.join('  ·  ');

  const dots = Array.from({length: 12}, (_, row) =>
    Array.from({length: 20}, (_, col) =>
      `<circle cx="${col * 65 + 32}" cy="${row * 55 + 40}" r="1" fill="#ffffff" opacity="0.04"/>`
    ).join('')
  ).join('');

  const budgetWidth = Math.min(budget.length * 22 + 40, 400);
  const budgetY = titleY1 + (titleLines[1] ? 90 : 30);

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#1a0a05"/>
    </linearGradient>
    <linearGradient id="ag" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ff4d1c"/>
      <stop offset="100%" stop-color="#ff8c00"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="6" fill="url(#ag)"/>
  ${dots}
  <text x="72" y="100" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="52" letter-spacing="-2">
    <tspan fill="#ff4d1c">XE</tspan><tspan fill="#fafaf8">KIE</tspan>
  </text>
  <text x="72" y="128" font-family="Arial, sans-serif" font-size="15" fill="#666666" letter-spacing="3">TRADE DIFFERENT</text>
  <rect x="72" y="152" width="80" height="3" fill="#ff4d1c" rx="2"/>
  <text x="72" y="${titleY1}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="62" fill="#fafaf8" letter-spacing="-2">${escapeXml(titleLines[0] || '')}</text>
  ${titleLines[1] ? `<text x="72" y="${titleY2}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="62" fill="#fafaf8" letter-spacing="-2">${escapeXml(titleLines[1])}</text>` : ''}
  ${budget ? `<rect x="72" y="${budgetY}" width="${budgetWidth}" height="56" rx="28" fill="#ff4d1c"/>
  <text x="${72 + budgetWidth / 2}" y="${budgetY + 36}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle">${escapeXml(budget)}</text>` : ''}
  ${metaText ? `<text x="72" y="${budgetY + (budget ? 80 : 20)}" font-family="Arial, sans-serif" font-size="24" fill="#666666">${escapeXml(metaText.replace(/📍 /g, '📍 '))}</text>` : ''}
  <rect x="0" y="560" width="1200" height="70" fill="#111111"/>
  <text x="72" y="603" font-family="Arial, sans-serif" font-size="22" fill="#555555">Respond with your best offer at</text>
  <text x="430" y="603" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="22" fill="#ff4d1c">xekie.com</text>
  <circle cx="1050" cy="280" r="180" fill="#ff4d1c" opacity="0.06"/>
  <circle cx="1050" cy="280" r="120" fill="#ff4d1c" opacity="0.06"/>
  <circle cx="1050" cy="280" r="60" fill="#ff4d1c" opacity="0.08"/>
</svg>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
    body: svg,
  };
};
