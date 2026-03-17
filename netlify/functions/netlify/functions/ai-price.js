// netlify/functions/ai-price.js
const { rateLimit, getIP, limitedResponse } = require('./rate-limit');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const ip = getIP(event);
  const { limited } = rateLimit(ip, 'ai-price', 20, 60000);
  if (limited) return limitedResponse();

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'Missing key' }) };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { title, budget_min, budget_max, category } = body;
  if (!title) return { statusCode: 400, body: JSON.stringify({ error: 'Missing title' }) };

  const budgetStr = budget_max ? `$${budget_min || 0}–$${budget_max}` : budget_min ? `$${budget_min}+` : 'not set';

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
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `A buyer on a marketplace wants to buy: "${title}" ${category ? `(category: ${category})` : ''}.
Their budget is: ${budgetStr}.

Based on typical US market prices, is their budget reasonable?

Return ONLY valid JSON, no markdown:
{
  "status": "good" | "low" | "high" | "unknown",
  "typical_range": "e.g. $500–$1,500" or null if unknown,
  "message": "One short sentence of friendly advice, max 12 words" or null
}

Be concise. Only return a message if the budget seems notably off. If budget is not set, return status "unknown" with no message.`
        }]
      })
    });

    const data = await res.json();
    const raw = data.content?.[0]?.text || '{}';
    const clean = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch(err) {
    return { statusCode: 200, body: JSON.stringify({ status: 'unknown', message: null }) };
  }
};
