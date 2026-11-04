const RECIPIENT = 'reemhappyday@gmail.com';
const MAX_COMMENT_LENGTH = 50;

function jsonResponse(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export const config = { path: '/api/ratings' };

export default async function ratings(request) {
  if (request.method !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed' });
  }

  const apiKey = Netlify.env.get('RESEND_API_KEY');
  const from = Netlify.env.get('RESEND_FROM_EMAIL');
  if (!apiKey || !from) {
    console.error('Rating email is not configured: set RESEND_API_KEY and RESEND_FROM_EMAIL.');
    return jsonResponse(503, { ok: false, error: 'Email service is not configured' });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, error: 'Invalid JSON body' });
  }

  const rating = Number(payload?.rating);
  const door = Number(payload?.door);
  const comment = typeof payload?.comment === 'string' ? payload.comment.trim() : '';
  const language = payload?.language === 'en' ? 'en' : 'ar';
  const createdAt = typeof payload?.createdAt === 'string' && !Number.isNaN(Date.parse(payload.createdAt))
    ? new Date(payload.createdAt).toISOString()
    : new Date().toISOString();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return jsonResponse(400, { ok: false, error: 'Rating must be between 1 and 5' });
  }
  if (!Number.isInteger(door) || door < 0 || door > 6) {
    return jsonResponse(400, { ok: false, error: 'Invalid door value' });
  }
  if (comment.length > MAX_COMMENT_LENGTH) {
    return jsonResponse(400, { ok: false, error: 'Comment exceeds 50 characters' });
  }

  const safeComment = escapeHtml(comment || '(no comment)');
  const safeDate = escapeHtml(createdAt);
  const subject = `New website rating: ${rating}/5`;
  const html = [
    '<h2>New rating submitted</h2>',
    `<p><strong>Rating:</strong> ${rating}/5</p>`,
    `<p><strong>Door:</strong> ${door || 'not specified'}</p>`,
    `<p><strong>Language:</strong> ${language}</p>`,
    `<p><strong>Comment:</strong><br>${safeComment.replaceAll('\n', '<br>')}</p>`,
    `<p><strong>Submitted:</strong> ${safeDate}</p>`
  ].join('\n');

  try {
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [RECIPIENT],
        subject,
        html
      })
    });

    if (!emailResponse.ok) {
      const providerError = await emailResponse.text();
      console.error('Resend rejected rating email:', emailResponse.status, providerError.slice(0, 500));
      return jsonResponse(502, { ok: false, error: 'Could not deliver the rating email' });
    }

    return jsonResponse(200, { ok: true });
  } catch (error) {
    console.error('Rating email delivery failed:', error);
    return jsonResponse(502, { ok: false, error: 'Could not deliver the rating email' });
  }
}
