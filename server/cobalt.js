/**
 * cobalt.js
 * ─────────────────────────────────────────────────────────────────────
 * Social-media video extraction via Cobalt API instances.
 * Handles failover across multiple Cobalt endpoints and validates
 * the returned stream before accepting it.
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

// ── Cobalt API instances (failover order) ─────────────────────────────
const COBALT_INSTANCES = [
  'https://api.cobalt.tools/api/json',
  'https://cobalt-api.vps.sh/api/json',
  'https://api.cobalt.black/api/json',
  'https://cobalt.api.unblocker.it/api/json',
];

// ── Social-media URL pattern ──────────────────────────────────────────
const SOCIAL_MEDIA_PATTERN =
  /youtube\.com|youtu\.be|instagram\.com|tiktok\.com|twitter\.com|x\.com|pinterest\.com|vimeo\.com|reddit\.com|vk\.com|bilibili\.com/;

export const isSocialMediaUrl = (url) => SOCIAL_MEDIA_PATTERN.test(url);

// ── Stream validation ─────────────────────────────────────────────────

/**
 * Validates that a URL actually points to a media stream
 * (not XML error pages or HTML fallbacks).
 */
export function validateStream(url) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const protocol = parsed.protocol === 'https:' ? https : http;

      const req = protocol.request(
        url,
        { method: 'HEAD', timeout: 5000 },
        (res) => {
          const contentType = res.headers['content-type'] || '';
          if (contentType.includes('xml') || contentType.includes('html')) {
            return resolve(false);
          }
          resolve(res.statusCode < 400);
        },
      );

      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end();
    } catch {
      resolve(false);
    }
  });
}

// ── Single-instance extraction ────────────────────────────────────────

function tryExtract(apiUrl, targetUrl) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      url: targetUrl,
      videoQuality: '720',
      downloadMode: 'auto',
    });

    const options = {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://cobalt.tools',
        'Referer': 'https://cobalt.tools/',
      },
      timeout: 8000,
    };

    const req = https.request(apiUrl, options, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Status ${res.statusCode}`));
        }
        try {
          const json = JSON.parse(data);
          let fUrl = json.url;
          if (json.status === 'picker' && json.picker?.length > 0) {
            fUrl = json.picker[0].url;
          }
          if (!fUrl) return reject(new Error('No media found'));
          resolve(fUrl);
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

// ── Multi-instance extraction with failover ───────────────────────────

/**
 * Attempts extraction across all Cobalt instances in order.
 * Returns the first validated stream URL or throws with all errors.
 */
export async function extractMediaUrl(url) {
  const errors = [];

  for (const api of COBALT_INSTANCES) {
    try {
      const extractedUrl = await tryExtract(api, url);
      const isValid = await validateStream(extractedUrl);

      if (isValid) return extractedUrl;

      errors.push(`${new URL(api).hostname}: Invalid stream (XML/Error)`);
    } catch (e) {
      console.warn(`[Cobalt] Failover from ${api}: ${e.message}`);
      errors.push(`${new URL(api).hostname}: ${e.message}`);
    }
  }

  throw new Error(`All extractors failed: ${errors.join(', ')}`);
}
