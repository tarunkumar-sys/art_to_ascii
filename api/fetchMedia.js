/**
 * Production-safe Serverless Function for Media Fetching (CORS Proxy + Extractor)
 * Handles direct URLs and extracts social media streams via Cobalt (server-side).
 * Includes robust failover logic for multiple Cobalt instances and stream validation.
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

const COBALT_INSTANCES = [
  'https://api.cobalt.tools/api/json',
  'https://cobalt-api.vps.sh/api/json',
  'https://api.cobalt.black/api/json',
  'https://cobalt.api.unblocker.it/api/json'
];

/**
 * Validates if a URL actually points to a media stream (not an error page)
 */
async function validateStream(url) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const protocol = parsed.protocol === 'https:' ? https : http;
    
    const req = protocol.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
      const contentType = res.headers['content-type'] || '';
      const isMedia = contentType.startsWith('video/') || 
                      contentType.startsWith('image/') || 
                      contentType.includes('application/octet-stream');
      
      // If it's XML or HTML, it's likely an error page from the storage provider
      if (contentType.includes('xml') || contentType.includes('html')) {
        return resolve(false);
      }
      resolve(isMedia || res.statusCode < 400);
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

async function tryExtract(apiUrl, targetUrl) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      url: targetUrl,
      videoQuality: '720',
      downloadMode: 'auto'
    });

    const options = {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://cobalt.tools',
        'Referer': 'https://cobalt.tools/'
      },
      timeout: 8000
    };

    const req = https.request(apiUrl, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`Status ${res.statusCode}`));
        try {
          const json = JSON.parse(data);
          if (json.status === 'error') return reject(new Error(json.text));
          
          let finalUrl = json.url;
          if (json.status === 'picker' && json.picker?.length > 0) {
            finalUrl = json.picker[0].url;
          }
          
          if (!finalUrl) return reject(new Error('No media found'));
          resolve(finalUrl);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function extractMediaUrl(url) {
  const errors = [];
  for (const api of COBALT_INSTANCES) {
    try {
      const extractedUrl = await tryExtract(api, url);
      
      // CRITICAL: Validate that the extracted URL is actually accessible and not an error page
      const isValid = await validateStream(extractedUrl);
      if (isValid) return extractedUrl;
      
      errors.push(`${new URL(api).hostname}: Extracted URL returned error/invalid type`);
    } catch (e) {
      console.warn(`[Proxy] Failover from ${api}: ${e.message}`);
      errors.push(`${new URL(api).hostname}: ${e.message}`);
    }
  }
  throw new Error(`All extractors failed: ${errors.join(', ')}`);
}

export default async (req, res) => {
  const inputUrl = req.query.url;

  if (!inputUrl) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'URL is required' }));
  }

  try {
    let targetUrl = decodeURIComponent(inputUrl);

    // 1. Detect social media and extract via Cobalt
    const isSocial = /youtube\.com|youtu\.be|instagram\.com|tiktok\.com|twitter\.com|x\.com|pinterest\.com|vimeo\.com|reddit\.com|vk\.com|bilibili\.com/.test(targetUrl);
    
    if (isSocial) {
      try {
        targetUrl = await extractMediaUrl(targetUrl);
      } catch (err) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: 'Extraction failed: ' + err.message }));
      }
    }

    // 2. Fetch the actual media stream
    const parsedUrl = new URL(targetUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    protocol.get(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    }, (remoteRes) => {
      const contentType = remoteRes.headers['content-type'] || '';
      
      // If we somehow got here with a bad type, reject it
      if (contentType.includes('xml') || contentType.includes('html')) {
        res.statusCode = 415;
        return res.end(JSON.stringify({ error: 'Invalid media response: ' + contentType }));
      }

      res.setHeader('Content-Type', contentType || 'video/mp4');
      res.setHeader('Access-Control-Allow-Origin', '*');
      remoteRes.pipe(res);
    }).on('error', (err) => {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Stream fetch failed: ' + err.message }));
    });

  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Proxy Error: ' + error.message }));
  }
};
