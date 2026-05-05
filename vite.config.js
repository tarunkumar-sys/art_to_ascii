import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import https from 'https'
import http from 'http'
import { URL } from 'url'

const COBALT_INSTANCES = [
  'https://api.cobalt.tools/api/json',
  'https://cobalt-api.vps.sh/api/json',
  'https://api.cobalt.black/api/json',
  'https://cobalt.api.unblocker.it/api/json'
];

/**
 * Validates if a URL actually points to a media stream
 */
async function validateStream(url) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const protocol = parsed.protocol === 'https:' ? https : http;
      const req = protocol.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
        const contentType = res.headers['content-type'] || '';
        if (contentType.includes('xml') || contentType.includes('html')) return resolve(false);
        resolve(res.statusCode < 400);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end();
    } catch (e) { resolve(false); }
  });
}

async function tryExtract(apiUrl, targetUrl) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ url: targetUrl, videoQuality: '720', downloadMode: 'auto' });
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
      res.on('data', (d) => data += d);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`Status ${res.statusCode}`));
        try {
          const json = JSON.parse(data);
          let fUrl = json.url;
          if (json.status === 'picker' && json.picker?.length > 0) fUrl = json.picker[0].url;
          if (!fUrl) return reject(new Error('No media found'));
          resolve(fUrl);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Helper to extract social media URLs via Cobalt (mirrors backend logic)
async function extractMediaUrl(url) {
  const errors = [];
  for (const api of COBALT_INSTANCES) {
    try {
      const extractedUrl = await tryExtract(api, url);
      
      // Validate the stream before returning
      const isValid = await validateStream(extractedUrl);
      if (isValid) return extractedUrl;
      
      errors.push(`${new URL(api).hostname}: Invalid stream (XML/Error)`);
    } catch (e) {
      console.warn(`[DevProxy] Failover from ${api}: ${e.message}`);
      errors.push(`${new URL(api).hostname}: ${e.message}`);
    }
  }
  throw new Error(`All extractors failed: ${errors.join(', ')}`);
}

// Custom dev-server plugin to simulate serverless functions locally
const apiProxy = () => ({
  name: 'api-proxy',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url.startsWith('/api/fetchMedia')) {
        const urlParams = new URL(req.url, `http://${req.headers.host}`)
        let targetUrl = urlParams.searchParams.get('url')

        if (!targetUrl) {
          res.statusCode = 400
          return res.end(JSON.stringify({ error: 'URL is required' }))
        }

        try {
          targetUrl = decodeURIComponent(targetUrl)
          
          // Detect social media and extract
          const isSocial = /youtube\.com|youtu\.be|instagram\.com|tiktok\.com|twitter\.com|x\.com|pinterest\.com|vimeo\.com|reddit\.com|vk\.com|bilibili\.com/.test(targetUrl);
          if (isSocial) {
            try {
              targetUrl = await extractMediaUrl(targetUrl);
            } catch (err) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ error: 'Extraction failed: ' + err.message }));
            }
          }

          const parsedUrl = new URL(targetUrl)
          const protocol = parsedUrl.protocol === 'https:' ? https : http

          protocol.get(targetUrl, (remoteRes) => {
            const contentType = remoteRes.headers['content-type'] || ''
            
            // Final check to prevent XML errors reaching frontend
            if (contentType.includes('xml') || contentType.includes('html')) {
              res.statusCode = 415
              return res.end(JSON.stringify({ error: 'Invalid media response' }))
            }

            res.setHeader('Content-Type', contentType || 'video/mp4')
            res.setHeader('Access-Control-Allow-Origin', '*')
            remoteRes.pipe(res)
          }).on('error', (err) => {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          })
          return
        } catch (e) {
          res.statusCode = 500
          return res.end(JSON.stringify({ error: e.message }))
        }
      }
      
      // Handle GIF worker proxy
      if (req.url.startsWith('/api/gifWorker')) {
        const WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js'
        https.get(WORKER_URL, (remoteRes) => {
          res.setHeader('Content-Type', 'application/javascript')
          res.setHeader('Access-Control-Allow-Origin', '*')
          remoteRes.pipe(res)
        }).on('error', (err) => {
          res.statusCode = 500
          res.end(err.message)
        })
        return
      }
      
      next()
    })
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), apiProxy()],
})
