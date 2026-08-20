/**
 * POST /api/contact — Cloudflare Pages Function
 *
 * Receives the contact form and emails it to Sylvia.
 *
 * The destination address is NEVER in this file. It comes from the CONTACT_TO
 * environment variable, set as a secret in the Cloudflare dashboard. This repo
 * is public: an address committed here would be scraped far faster than one
 * rendered on the page.
 *
 * Required environment variables (Pages → Settings → Environment variables):
 *   RESEND_API_KEY   Resend API key. Mark as a secret.
 *   CONTACT_TO       Where enquiries land. Mark as a secret.
 *   CONTACT_FROM     Verified sender, e.g. "Website <hello@sylviathomas.com>".
 *
 * Optional:
 *   TURNSTILE_SECRET If set, a Cloudflare Turnstile token is required and
 *                    verified. See README for wiring the widget.
 */

const MAX = { name: 120, email: 200, show: 300, message: 5000 };

/** Escape for safe interpolation into the HTML email body. */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Strip CR/LF so a field can never inject an extra email header. */
function clean(v, limit) {
  return String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim().slice(0, limit);
}

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

/**
 * Respond in the shape the caller can use: JSON for the fetch path, a plain
 * HTML page for a no-JS native form post.
 */
function respond(request, status, ok, message) {
  const wantsJSON = (request.headers.get('accept') || '').includes('application/json');

  if (wantsJSON) {
    return new Response(JSON.stringify({ ok, message }), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${ok ? 'Message sent' : 'Something went wrong'}</title>
<style>
  body{background:#F8F4EE;color:#17131F;font:400 18px/1.65 system-ui,sans-serif;
       display:grid;place-items:center;min-height:100vh;margin:0;padding:24px}
  main{max-width:52ch;text-align:center}
  h1{font-size:40px;line-height:1.05;letter-spacing:-.02em;margin:0 0 16px}
  a{display:inline-block;margin-top:32px;background:#E8336D;color:#fff;
    text-decoration:none;font-weight:600;padding:18px 30px;border-radius:999px}
</style></head><body><main>
<h1>${ok ? 'Got it.' : 'That did not send.'}</h1>
<p>${esc(message)}</p>
<a href="/">Back to the site</a>
</main></body></html>`;

  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

async function readBody(request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) return await request.json();
  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

async function handlePost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await readBody(request);
  } catch {
    return respond(request, 400, false, 'That form submission could not be read.');
  }

  // --- spam traps -----------------------------------------------------------
  // Honeypot: a field hidden from humans. Anything in it is a bot. Report
  // success so the bot does not learn to retry, but send nothing.
  if (clean(body.company, 100)) {
    return respond(request, 200, true, 'Thanks. Your message is on its way.');
  }

  // Time trap: a human cannot read that page and submit in under three seconds.
  const started = parseInt(body.started, 10);
  if (Number.isFinite(started) && Date.now() - started < 3000) {
    return respond(request, 200, true, 'Thanks. Your message is on its way.');
  }

  // Optional Turnstile verification.
  if (env.TURNSTILE_SECRET) {
    const token = clean(body['cf-turnstile-response'], 3000);
    if (!token) {
      return respond(request, 400, false, 'Please complete the verification and try again.');
    }
    const verify = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET,
          response: token,
          remoteip: request.headers.get('CF-Connecting-IP') || undefined,
        }),
      }
    );
    const outcome = await verify.json().catch(() => ({ success: false }));
    if (!outcome.success) {
      return respond(request, 400, false, 'Verification failed. Please try again.');
    }
  }

  // --- validate -------------------------------------------------------------
  const name = clean(body.name, MAX.name);
  const email = clean(body.email, MAX.email);
  const show = clean(body.show, MAX.show);
  const message = String(body.message == null ? '' : body.message).trim().slice(0, MAX.message);

  if (!name || !email || !message) {
    return respond(request, 400, false, 'Please fill in your name, your email and a message.');
  }
  if (!isEmail(email)) {
    return respond(request, 400, false, 'That email address does not look right.');
  }

  // --- config ---------------------------------------------------------------
  const { RESEND_API_KEY, CONTACT_TO, CONTACT_FROM } = env;
  if (!RESEND_API_KEY || !CONTACT_TO || !CONTACT_FROM) {
    console.error('contact: missing env', {
      hasKey: !!RESEND_API_KEY, hasTo: !!CONTACT_TO, hasFrom: !!CONTACT_FROM,
    });
    return respond(
      request, 500, false,
      'The form is not configured yet. Please reach out on LinkedIn in the meantime.'
    );
  }

  // --- send -----------------------------------------------------------------
  const subject = show
    ? `New enquiry from ${name} — ${show}`
    : `New enquiry from ${name}`;

  const text = [
    `Name:  ${name}`,
    `Email: ${email}`,
    `Show:  ${show || '(not given)'}`,
    '',
    message,
    '',
    '---',
    'Sent from the contact form. Reply directly to reach them.',
  ].join('\n');

  const html = `
<div style="font:400 16px/1.6 system-ui,sans-serif;color:#17131F">
  <p style="margin:0 0 4px"><strong>Name</strong> ${esc(name)}</p>
  <p style="margin:0 0 4px"><strong>Email</strong>
     <a href="mailto:${esc(email)}">${esc(email)}</a></p>
  <p style="margin:0 0 20px"><strong>Show</strong> ${esc(show) || '<em>not given</em>'}</p>
  <div style="border-left:3px solid #E8336D;padding-left:16px;white-space:pre-wrap">${esc(message)}</div>
  <p style="margin-top:24px;color:#5B5468;font-size:14px">
    Sent from the contact form. Reply directly to reach them.
  </p>
</div>`.trim();

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: CONTACT_FROM,
        to: [CONTACT_TO],
        reply_to: email,          // so hitting reply reaches the sender
        subject,
        text,
        html,
      }),
    });

    if (!res.ok) {
      // Log the provider's reason, never leak it to the visitor.
      console.error('contact: resend failed', res.status, await res.text());
      return respond(
        request, 502, false,
        'That did not send. Please try again, or reach out on LinkedIn.'
      );
    }
  } catch (err) {
    console.error('contact: send threw', err);
    return respond(
      request, 502, false,
      'That did not send. Please try again, or reach out on LinkedIn.'
    );
  }

  return respond(
    request, 200, true,
    'Thanks. That came straight to Sylvia and she will reply herself.'
  );
}

/**
 * Single catch-all export. Pages treats `onRequest` as the handler for every
 * method, so dispatch here rather than also exporting `onRequestPost` — with
 * both defined, which one wins is not worth depending on. Passing the whole
 * context through also keeps `env` intact, which the POST handler needs.
 */
export async function onRequest(context) {
  if (context.request.method === 'POST') return handlePost(context);
  return new Response('Method not allowed', {
    status: 405,
    headers: { allow: 'POST' },
  });
}
