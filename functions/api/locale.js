/**
 * Cloudflare Pages Function: /api/locale
 *
 * Returns only ISO 3166-1 alpha-2 country code provided by Cloudflare's edge
 * (request.cf.country or CF-IPCountry header) for automatic language fallback.
 *
 * Privacy guarantees:
 * - Visitor IP addresses are NEVER read, logged, stored, or returned.
 * - No external geolocation APIs or databases are queried.
 */
export async function onRequestGet(context) {
  const { request } = context;

  let rawCountry = '';
  if (request && request.cf && typeof request.cf.country === 'string') {
    rawCountry = request.cf.country;
  } else if (request && request.headers && typeof request.headers.get === 'function') {
    rawCountry = request.headers.get('cf-ipcountry') || '';
  }

  const normalized = String(rawCountry || '').trim().toUpperCase();
  const isValidCountry =
    /^[A-Z]{2}$/.test(normalized) && normalized !== 'XX' && normalized !== 'T1';

  return new Response(
    JSON.stringify({
      country: isValidCountry ? normalized : null,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    }
  );
}
