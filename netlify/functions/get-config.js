// get-config.js — serves public config to frontend
// Keeps publishable keys out of source code

exports.handler = async (event) => {
  const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({
      stripePk: process.env.STRIPE_PUBLISHABLE_KEY,
    }),
  };
};
