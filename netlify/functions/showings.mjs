// GET/POST /api/showings on Netlify (Functions v2). All logic lives in server/showings-core.mjs; this file
// only adapts the Request/Response and keeps the data in Netlify Blobs (store "cinema", key "showings").
// Set ADMIN_PIN in the site's environment variables to change the dashboard PIN.
import { getStore } from '@netlify/blobs';
import { handleShowings, MAX_BODY } from '../../server/showings-core.mjs';

function blobStore() {
  const store = getStore({ name: 'cinema', consistency: 'strong' });
  return {
    get: (key) => store.get(key, { type: 'json' }),
    set: (key, value) => store.setJSON(key, value),
  };
}

export default async (req, context) => {
  let body = '';
  if (req.method === 'POST') {
    body = await req.text();
    if (body.length > MAX_BODY) body = body.slice(0, MAX_BODY + 1);
  }
  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  const r = await handleShowings({ method: req.method, body, ip }, blobStore());
  return new Response(req.method === 'HEAD' || r.status === 204 ? null : r.body, { status: r.status, headers: r.headers });
};

export const config = { path: '/api/showings' };
