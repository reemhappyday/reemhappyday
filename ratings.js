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

  let selectedRating = 0;
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
      .replace(/[\\u064B-\\u065F\\u0670\\u0640]/g, "")
      .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
      .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
      .replace(/[\\s\\u200b-\\u200f.,،؛;:!؟?*~_+=()\\[\\]{}<>/\\\\|\\-]+/g, "");
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
      selectedRating = Number(button.dataset.rate);
      context.selectedRating = selectedRating;
      buttons.forEach(item => {
        const active = Number(item.dataset.rate) === selectedRating;
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
    if (!selectedRating) {
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
      rating: selectedRating,
      comment: value,
      door: Number(context.chosenDoor),
      createdAt: new Date().toISOString(),
      language: language()
    };

    submit.disabled = true;
    status.textContent = message("جارٍ إرسال تقييمك إلى البريد الإلكتروني...", "Sending your rating by email...");
    try {
      const response = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload),
        credentials: "same-origin"
      });
      let result;
      try { result = await response.json(); }
      catch (_) { throw new Error("The server returned an invalid response."); }
      if (!response.ok || !result || result.ok !== true) {
        throw new Error((result && result.error) || "Rating submission failed.");
      }

      status.textContent = message("شكرا لك، وصل تقييمك بنجاح.", "Thank you. Your rating was sent successfully.");
      comment.value = "";
      selectedRating = 0;
      context.selectedRating = 0;
      buttons.forEach(button => {
        button.classList.remove("selected");
        button.setAttribute("aria-pressed", "false");
      });
      updateCounter();
    } catch (error) {
      console.error("Rating submission error:", error);
      status.textContent = message(
        "تعذر إرسال التقييم. لم يتم تأكيد وصوله؛ يرجى المحاولة مرة أخرى.",
        "The rating was not confirmed as delivered. Please try again."
      );
    } finally {
      submit.disabled = false;
    }
  });
})();
