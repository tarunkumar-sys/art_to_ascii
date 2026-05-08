/**
 * devApiProxy.js
 * ─────────────────────────────────────────────────────────────────────
 * Vite plugin that intercepts `/api/*` requests during local dev and
 * routes them to the appropriate handler. In production, these are
 * handled by Vercel serverless functions.
 */

import {
  handleUploadMedia,
  handleFetchMedia,
  handleGifWorker,
} from './middleware.js';

/**
 * Route table — maps URL prefixes to handler functions.
 * Add new API routes here as single-line entries.
 */
const routes = [
  { prefix: '/api/uploadMedia', handler: handleUploadMedia },
  { prefix: '/api/fetchMedia',  handler: handleFetchMedia },
  { prefix: '/api/gifWorker',   handler: handleGifWorker },
];

/**
 * Creates a Vite plugin that simulates the serverless API layer locally.
 */
export default function devApiProxy() {
  return {
    name: 'dev-api-proxy',

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const matched = routes.find((r) => req.url.startsWith(r.prefix));

        if (matched) {
          return matched.handler(req, res);
        }

        next();
      });
    },
  };
}
