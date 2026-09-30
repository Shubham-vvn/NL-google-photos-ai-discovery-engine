const https = require('https');
const { URL } = require('url');

/**
 * Google Gemini API Client
 * Optimized for Free Tier (15 RPM limit, gemini-2.0-flash)
 */

let lastCallTimestamp = 0;
const MIN_INTERVAL_MS = 4200; // 4.2 seconds = ~14.2 requests per minute (strictly under 15 RPM)

/**
 * Throttle helper to enforce free-tier rate limits
 */
async function enforceRateLimit() {
  const now = Date.now();
  const elapsed = now - lastCallTimestamp;
  if (elapsed < MIN_INTERVAL_MS) {
    const delay = MIN_INTERVAL_MS - elapsed;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  lastCallTimestamp = Date.now();
}

/**
 * Execute HTTP POST request using Node native https
 */
function makeHttpsRequest(urlStr, payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const bodyStr = JSON.stringify(payload);

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, body: data });
        } else {
          reject(new Error(`Gemini API HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Gemini API request timed out after 30s'));
    });

    req.write(bodyStr);
    req.end();
  });
}

/**
 * Call Gemini API with rate limiting, JSON formatting, and error handling
 * @param {string} prompt - Prompt to send
 * @param {object} options - Optional config
 * @returns {Promise<object>} Parsed JSON object
 */
async function callGemini(prompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.warn('[Gemini] GEMINI_API_KEY not configured or placeholder detected. Falling back to deterministic NLP extraction.');
    return null; // Signals processor to use NLP rule-based extraction
  }

  await enforceRateLimit();

  const model = options.model || 'gemini-2.0-flash';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: options.temperature !== undefined ? options.temperature : 0.1,
      maxOutputTokens: options.maxOutputTokens || 2048
    }
  };

  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const response = await makeHttpsRequest(apiUrl, requestBody);
      const parsedRes = JSON.parse(response.body);

      const candidate = parsedRes.candidates && parsedRes.candidates[0];
      if (!candidate || !candidate.content || !candidate.content.parts) {
        throw new Error('Gemini returned empty or blocked response');
      }

      const textOutput = candidate.content.parts[0].text;
      return JSON.parse(textOutput);
    } catch (err) {
      console.warn(`[Gemini] Attempt ${attempts} failed: ${err.message}`);
      if (attempts >= maxAttempts) {
        throw err;
      }
      // Wait 5 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

module.exports = {
  callGemini,
  enforceRateLimit
};
