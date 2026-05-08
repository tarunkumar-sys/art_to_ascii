/**
 * middleware.js
 * ─────────────────────────────────────────────────────────────────────
 * Route handlers for the Vite dev-server API proxy.
 * Each handler is a standalone async function that owns one route.
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';
import { extractMediaUrl, isSocialMediaUrl } from './cobalt.js';

// ── /api/uploadMedia ──────────────────────────────────────────────────

export async function handleUploadMedia(req, res) {
  try {
    const handler = await import('../api/uploadMedia.js');
    return handler.default(req, res);
  } catch (e) {
    console.error('[API] Upload proxy error:', e);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Upload proxy error', details: e.message }));
  }
}

// ── /api/fetchMedia ───────────────────────────────────────────────────

export async function handleFetchMedia(req, res) {
  const urlParams = new URL(req.url, `http://${req.headers.host}`);
  let targetUrl = urlParams.searchParams.get('url');

  if (!targetUrl) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'URL is required' }));
  }

  try {
    targetUrl = decodeURIComponent(targetUrl);

    // Social-media extraction via Cobalt
    if (isSocialMediaUrl(targetUrl)) {
      try {
        targetUrl = await extractMediaUrl(targetUrl);
      } catch (err) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: 'Extraction failed: ' + err.message }));
      }
    }

    const parsedUrl = new URL(targetUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    protocol
      .get(targetUrl, (remoteRes) => {
        const contentType = remoteRes.headers['content-type'] || '';

        // Reject non-media responses
        if (contentType.includes('xml') || contentType.includes('html')) {
          res.statusCode = 415;
          return res.end(JSON.stringify({ error: 'Invalid media response' }));
        }

        res.setHeader('Content-Type', contentType || 'video/mp4');
        res.setHeader('Access-Control-Allow-Origin', '*');
        remoteRes.pipe(res);
      })
      .on('error', (err) => {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err.message }));
      });
  } catch (e) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: e.message }));
  }
}

// ── /api/gifWorker ────────────────────────────────────────────────────

const GIF_WORKER_CDN =
  'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js';

export function handleGifWorker(_req, res) {
  https
    .get(GIF_WORKER_CDN, (remoteRes) => {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Access-Control-Allow-Origin', '*');
      remoteRes.pipe(res);
    })
    .on('error', (err) => {
      res.statusCode = 500;
      res.end(err.message);
    });
}
