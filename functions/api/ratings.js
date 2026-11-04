// Cloudflare Pages Function: send ratings to EmailJS without storing them.
// POST /api/ratings
export async function onRequestPost({ request }) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };

  try {
    const payload = await request.json();

    const rating = Number(payload?.rating);
    const comment = String(payload?.comment ?? "").trim();
    const doorNumber = Number(payload?.door ?? 0);
    const language = String(payload?.language ?? "ar").slice(0, 5);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid rating." }), {
        status: 400, headers
      });
    }

    if (comment.length > 50) {
      return new Response(JSON.stringify({ ok: false, error: "Comment must be 50 characters or fewer." }), {
        status: 400, headers
      });
    }

    if (!Number.isInteger(doorNumber) || doorNumber < 0 || doorNumber > 6) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid door." }), {
        status: 400, headers
      });
    }

    const emailResponse = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: "service_2klbddg",
        template_id: "template_zgb2478",
        user_id: "vRtu99xC8ZQoYMloJ",
        template_params: {
          rating,
          comment: comment || "بدون تعليق",
          door: doorNumber || "غير محدد",
          createdAt: String(payload?.createdAt ?? new Date().toISOString()),
          language,
          page_url: request.headers.get("Referer") || ""
        }
      })
    });

    if (!emailResponse.ok) {
      const detail = await emailResponse.text();
      console.error("EmailJS rejected rating:", emailResponse.status, detail);
      return new Response(JSON.stringify({
        ok: false,
        error: "Email service rejected the rating."
      }), { status: 502, headers });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers
    });
  } catch (error) {
    console.error("Rating email endpoint error:", error);
    return new Response(JSON.stringify({ ok: false, error: "Unable to send rating." }), {
      status: 500, headers
    });
  }
}

export async function onRequest({ request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "no-store"
      }
    });
  }

  return new Response(JSON.stringify({ ok: false, error: "Method not allowed." }), {
    status: 405,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Allow": "POST, OPTIONS",
      "Cache-Control": "no-store"
    }
  });
}
