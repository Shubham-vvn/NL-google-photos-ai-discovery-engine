const https = require('https');
const { URL } = require('url');

/**
 * Google Gemini API Client
 * Optimized for Free Tier with multi-model fallback (gemini-3-flash-preview, gemini-3.1-flash-lite)
 */

let lastCallTimestamp = 0;
const MIN_INTERVAL_MS = 2500; // ~24 requests per minute limit safety

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
    let resolved = false;
    const url = new URL(urlStr);
    const bodyStr = JSON.stringify(payload);

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      agent: false,
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'close',
        'Content-Length': Buffer.byteLength(bodyStr)
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolved = true;
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, body: data });
        } else {
          reject(new Error(`Gemini API HTTP ${res.statusCode}: ${data}`));
        }
      });
      res.on('error', (err) => {
        if (!resolved) reject(err);
      });
    });

    req.on('socket', (socket) => {
      socket.on('error', () => {});
    });

    req.on('error', (err) => {
      if (!resolved) reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      if (!resolved) {
        reject(new Error('Gemini API request timed out after 30s'));
      }
    });

    req.write(bodyStr);
    req.end();
  });
}

/**
 * Cleanly parse JSON from LLM text, stripping any markdown wrapping
 */
function cleanJsonParse(text) {
  if (!text) return null;
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

/**
 * Call Gemini API with rate limiting, JSON formatting, and model fallback
 * @param {string} prompt - Prompt to send
 * @param {object} options - Optional config
 * @returns {Promise<object>} Parsed JSON object
 */
async function callGemini(prompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.warn('[Gemini] GEMINI_API_KEY not configured or placeholder detected. Falling back to deterministic NLP extraction.');
    return null;
  }

  await enforceRateLimit();

  const candidateModels = options.model 
    ? [options.model] 
    : ['gemini-3.1-flash-lite', 'gemini-3-flash-preview', 'gemini-flash-latest'];

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: options.temperature !== undefined ? options.temperature : 0.1,
      maxOutputTokens: options.maxOutputTokens || 2500,
      thinkingConfig: { thinkingBudget: 0 }
    }
  };

  for (const model of candidateModels) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await makeHttpsRequest(apiUrl, requestBody);
      const parsedRes = JSON.parse(response.body);

      const candidate = parsedRes.candidates && parsedRes.candidates[0];
      if (!candidate || !candidate.content || !candidate.content.parts) {
        throw new Error('Gemini returned empty or blocked response');
      }

      // Find the text part (ignoring thinking parts if any)
      const textPart = candidate.content.parts.find(p => p.text && !p.thought);
      const textOutput = textPart ? textPart.text : candidate.content.parts[0].text;
      
      return cleanJsonParse(textOutput);
    } catch (err) {
      console.warn(`[Gemini] Model ${model} failed: ${err.message}`);
      // Continue to next candidate model
    }
  }

  console.warn('[Gemini] All candidate models failed. Falling back to deterministic extraction.');
  return null;
}

module.exports = {
  callGemini,
  enforceRateLimit
};
