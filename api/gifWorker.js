/**
 * Proxy for gif.worker.js to bypass cross-origin restrictions.
 * Returns the worker script from the same origin.
 */

import https from 'https';

export default async (req, res) => {
  const WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js';

  try {
    https.get(WORKER_URL, (remoteRes) => {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Access-Control-Allow-Origin', '*');
      remoteRes.pipe(res);
    }).on('error', (err) => {
      res.statusCode = 500;
      res.end('Failed to fetch worker: ' + err.message);
    });
  } catch (error) {
    res.statusCode = 500;
    res.end('Proxy Error: ' + error.message);
  }
};
