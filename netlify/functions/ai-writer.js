// netlify/functions/ai-writer.js
const { rateLimit, getIP, limitedResponse } = require('./rate-limit');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const ip = getIP(event);
  const { limited } = rateLimit(ip, 'ai-writer', 10, 60000);
  if (limited) return limitedResponse();

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'Missing API key' }) };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { title } = body;
  if (!title) return { statusCode: 400, body: JSON.stringify({ error: 'Missing title' }) };

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `You are helping a buyer write a compelling XEKIE listing. A XEKIE is a demand-side marketplace post where buyers tell sellers exactly what they want.

The buyer wants: "${title}"

Write a XEKIE listing for them. Return ONLY valid JSON with no markdown, no explanation:
{
  "title": "A specific, compelling title (max 80 chars)",
  "description": "2-3 sentences describing exactly what they want, including condition, specs, and any preferences (max 300 chars)",
  "category": "ONE of: Electronics, Trading Cards, Vehicles, Tools, Services, Household Items, Clothes & Apparel, Books, Toys, Music & Movies, Collectibles, Other",
  "budget_hint": "A suggested budget range as a string like '100-200' or '500-1000' based on typical market value"
}`
        }]
      })
    });

    const data = await res.json();
    const raw = data.content?.[0]?.text || '{}';
    const clean = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
