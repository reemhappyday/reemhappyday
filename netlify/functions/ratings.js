const EMAILJS_SERVICE_ID = "service_2klbddg";
const EMAILJS_TEMPLATE_ID = "template_zgb2478";
const EMAILJS_PUBLIC_KEY = "vRtu99xC8ZQoYMloJ";
const FEEDBACK_EMAIL = "reemhappyday@gmail.com";

function normalizeText(value) {
  return String(value || "").toLowerCase().normalize("NFKC")
    .replace(/[\\u064B-\\u065F\\u0670\\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[\\s\\u200b-\\u200f.,،؛;:!؟?*~_+=()\\[\\]{}<>/\\\\|\\-]+/g, "");
}

const BANNED_WORDS = [
  "كس","كسمك","كسخت","طيز","زب","زبي","شرموط","شرموطة","متناك","منيوك","منيك",
  "عرص","قحبة","قواد","ديوث","خرا","يلعن","سافل","نجس","عاهر","مخنث","قذر",
  "مقرف","خسيس","مهين","غير جميل","مش حلو","بذئ","هتك","جحش","كحبة"
];

function containsBlockedLanguage(value) {
  const normalized = normalizeText(value);
  return BANNED_WORDS.some(word => normalized.includes(normalizeText(word)));
}

async function sendRating(request, env = {}) {
  if (request.method !== "POST") {
    return { status: 405, body: { ok: false, error: "Method not allowed." } };
  }

  let data;
  try { data = await request.json(); }
  catch (_) { return { status: 400, body: { ok: false, error: "Invalid JSON." } }; }

  const rating = Number(data && data.rating);
  const door = Number(data && data.door);
  const comment = String(data && data.comment || "").trim();
  const language = data && data.language === "en" ? "en" : "ar";

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { status: 400, body: { ok: false, error: "Choose a rating from 1 to 5." } };
  }
  if (!Number.isInteger(door) || door < 1 || door > 6) {
    return { status: 400, body: { ok: false, error: "Invalid door selection." } };
  }
  if (Array.from(comment).length > 50) {
    return { status: 400, body: { ok: false, error: "Comment must be 50 characters or fewer." } };
  }
  if (containsBlockedLanguage(comment)) {
    return { status: 400, body: { ok: false, error: "Please edit the comment and try again." } };
  }

  const serviceId = env.EMAILJS_SERVICE_ID || EMAILJS_SERVICE_ID;
  const templateId = env.EMAILJS_TEMPLATE_ID || EMAILJS_TEMPLATE_ID;
  const publicKey = env.EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY;
  const createdAt = String(data.createdAt || new Date().toISOString());
  const doorNames = ["", "الفيروز", "الياقوت الوردي", "الذهب", "الزمرد", "الجمشت", "اللؤلؤ"];
  const templateParams = {
    to_email: env.FEEDBACK_EMAIL || FEEDBACK_EMAIL,
    rating,
    comment: comment || "لم يترك الزائر تعليقاً.",
    door,
    door_name: doorNames[door],
    created_at: createdAt,
    createdAt,
    date: createdAt,
    language,
    site_name: "قصر الرسائل — الريم",
    message: "تقييم جديد لقصر الرسائل"
  };

  try {
    const emailResponse = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: templateParams
      })
    });
    const responseText = await emailResponse.text();
    if (!emailResponse.ok) {
      return { status: 502, body: { ok: false, error: "Email delivery failed.", providerStatus: emailResponse.status, detail: responseText.slice(0, 300) } };
    }
    return { status: 200, body: { ok: true, message: "Rating sent." } };
  } catch (_) {
    return { status: 502, body: { ok: false, error: "Could not reach the email service." } };
  }
}

exports.handler = async function(event) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { ...headers, Allow: "POST" }, body: JSON.stringify({ ok: false, error: "Method not allowed." }) };
  }
  let body;
  try { body = event.body ? JSON.parse(event.body) : {}; }
  catch (_) { return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Invalid JSON." }) }; }
  const request = new Request("https://local.invalid/api/ratings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const result = await sendRating(request, process.env || {});
  return { statusCode: result.status, headers, body: JSON.stringify(result.body) };
};
