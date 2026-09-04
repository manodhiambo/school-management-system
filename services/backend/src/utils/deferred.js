import { waitUntil } from '@vercel/functions';

const IS_VERCEL = !!process.env.VERCEL;

// Wraps a fire-and-forget async call (audit logging, last_login updates,
// session upserts) so it isn't cut off mid-flight after the response is
// sent. On Vercel, a serverless invocation can be frozen/reclaimed the
// instant res.json() finishes — waitUntil() keeps it alive until the
// promise settles. On Render's persistent process this is just a
// passthrough (the event loop already keeps running on its own).
export function deferred(promise) {
  const settled = Promise.resolve(promise).catch(() => {});
  if (IS_VERCEL) waitUntil(settled);
  return settled;
}
