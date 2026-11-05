/* Palace of Messages — rating UI and submission.
   The backend validates the same fields again before sending email. */
(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const buttons = Array.from(document.querySelectorAll("#rating button[data-rate]"));
  const comment = $("comment");
  const submit = $("submitComment");
  const status = $("commentStatus");
  const counter = $("commentCounter");
  const context = window.__REEM_GAME_CONTEXT;

  if (!buttons.length || !comment || !submit || !status || !context) {
    console.error("Ratings module could not initialize: required page elements are missing.");
    return;
  }

  context.selectedRating = 0;
  const language = () => document.documentElement.lang === "en" ? "en" : "ar";
  const message = (ar, en) => language() === "ar" ? ar : en;

  function updateCounter() {
    const length = Array.from(comment.value).length;
    if (length > 50) comment.value = Array.from(comment.value).slice(0, 50).join("");
    if (counter) counter.textContent = Array.from(comment.value).length +
      (language() === "ar" ? " / 50 حرفا" : " / 50 characters");
  }

  function normalize(value) {
    return String(value || "").toLowerCase().normalize("NFKC")
      .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
      .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
      .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
      .replace(/[\s\u200b-\u200f.,،؛;:!؟?*~_+=()\\[\\]{}<>/\\|\\-]+/g, "");
  }

  const blocked = ["كس","كسمك","كسخت","طيز","زب","زبي","شرموط","شرموطة","متناك","منيوك","منيك",
    "عرص","قحبة","قواد","ديوث","خرا","يلعن","سافل","نجس","عاهر","مخنث","قذر","مقرف","خسيس",
    "مهين","غير جميل","مش حلو","بذئ","هتك","جحش","كحبة"];

  function hasBlockedLanguage(value) {
    const normalized = normalize(value);
    return blocked.some(word => normalized.includes(normalize(word)));
  }

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      context.selectedRating = Number(button.dataset.rate);
      buttons.forEach(item => {
        const active = Number(item.dataset.rate) === Number(context.selectedRating);
        item.classList.toggle("selected", active);
        item.setAttribute("aria-pressed", String(active));
      });
      status.textContent = "";
    });
  });

  comment.addEventListener("input", updateCounter);
  updateCounter();

  submit.addEventListener("click", async () => {
    const value = comment.value.trim();
    if (!Number(context.selectedRating)) {
      status.textContent = message("يرجى اختيار تقييم من 1 إلى 5 أولا.", "Please choose a rating from 1 to 5 first.");
      return;
    }
    if (Array.from(value).length > 50) {
      status.textContent = message("الحد الأقصى للتعليق 50 حرفا.", "Comments are limited to 50 characters.");
      return;
    }
    if (hasBlockedLanguage(value)) {
      status.textContent = message("يرجى تعديل التعليق؛ يحتوي على لفظ غير مسموح به.", "Please edit your comment; it contains a word that is not allowed.");
      comment.focus();
      return;
    }
    if (!Number.isInteger(Number(context.chosenDoor)) || Number(context.chosenDoor) < 1 || Number(context.chosenDoor) > 6) {
      status.textContent = message("افتح أحد الأبواب أولا قبل إرسال التقييم.", "Open one of the doors before submitting a rating.");
      return;
    }

    const payload = {
      rating: Number(context.selectedRating),
      comment: value,
      door: Number(context.chosenDoor),
      createdAt: new Date().toISOString(),
      language: language()
    };

    submit.disabled = true;
    status.textContent = message("جارٍ إرسال تقييمك إلى البريد الإلكتروني...", "Sending your rating by email...");
    try {
      if (!window.emailjs || typeof window.emailjs.send !== "function") {
        throw new Error("EmailJS browser SDK did not load.");
      }
      const templateParams = {
        to_email: "reemhappyday@gmail.com",
        rating: payload.rating,
        comment: payload.comment || "لم يترك الزائر تعليقاً.",
        door: payload.door,
        door_name: ["", "الفيروز", "الياقوت الوردي", "الذهب", "الزمرد", "الجمشت", "اللؤلؤ"][payload.door],
        created_at: payload.createdAt,
        createdAt: payload.createdAt,
        date: payload.createdAt,
        language: payload.language,
        site_name: "قصر الرسائل — الريم",
        subject: "تقييم جديد لقصر الرسائل",
        message: "تقييم جديد لقصر الرسائل",
        rating_text: payload.rating + " / 5"
      };
      const result = await window.emailjs.send(
        "service_2klbddg",
        "template_zgb2478",
        templateParams,
        { publicKey: "vRtu99xC8ZQoYMloJ" }
      );
      if (!result || Number(result.status) < 200 || Number(result.status) >= 300) {
        throw new Error("EmailJS did not confirm the email request.");
      }

      status.textContent = message("شكرا لك، قبلت خدمة البريد إرسال تقييمك بنجاح.", "Thank you. The email service accepted your rating.");
      comment.value = "";
      context.selectedRating = 0;
      buttons.forEach(button => {
        button.classList.remove("selected");
        button.setAttribute("aria-pressed", "false");
      });
      updateCounter();
    } catch (error) {
      console.error("Rating submission error:", error);
      status.textContent = message(
        "تعذر إرسال التقييم بالبريد. تأكدي من إعداد قالب EmailJS ثم حاولي مرة أخرى.",
        "The email could not be sent. Check the EmailJS template settings and try again."
      );
    } finally {
      submit.disabled = false;
    }
  });
})();
