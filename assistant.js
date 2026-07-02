/**
 * IndustrCons — assistant.js
 * "IndustrCons Köməkçi" — a lightweight, rule-based question-answering
 * widget. It matches the user's question against a keyword knowledge base
 * and returns the best-matching canned answer.
 *
 * IMPORTANT — WHY NOT A REAL LLM:
 * This is a static site with no backend, so there is no secure place to
 * store an API key for a real AI model — embedding one in client-side JS
 * would expose it to anyone who views source. This widget is intentionally
 * simple and honest about that: it's a fast FAQ helper, not generative AI.
 * A true LLM-powered assistant is listed separately as a locked "Premium"
 * feature (see the Premium Features section) because it requires a backend
 * to keep the API key private.
 *
 * Public API (window.ICAssistant):
 *   - init(rootSelector) — mounts the floating widget once
 */

(function (global) {
  "use strict";

  const KNOWLEDGE_BASE = [
    {
      keywords: ["necə işləyir", "necə istifadə", "necə hesablanır", "nece isleyir"],
      answer:
        "Kalkulyator 7 addımlı sihirbazla işləyir: layihənin yeri, torpaq məlumatı, bina növü, mərtəbə sayı, sahə, tamamlama səviyyəsi və yoxlama. Son addımda \"Hesabla\" düyməsinə basdıqdan sonra dəqiq smeta və dashboard görünür."
    },
    {
      keywords: ["dəqiq", "dəqiqlik", "±10", "xəta", "yanlış"],
      answer:
        "Nəticələr ±10% dəqiqlik aralığında təxmindir. Bu, bazar araşdırmasına əsaslanan mühəndislik təxminidir — dəqiq qiymət üçün sahə ölçməsi və podratçı təklifi tövsiyə olunur."
    },
    {
      keywords: ["torpaq qiymət", "torpaq", "land"],
      answer:
        "Torpaq qiyməti seçdiyiniz şəhərə görə avtomatik doldurulur, amma \"Torpaq Məlumatı\" addımında bu rəqəmi əl ilə dəyişə bilərsiniz. Torpaq dəyərini smetaya daxil etməmək istəsəniz, checkbox-u söndürün."
    },
    {
      keywords: ["tamamlama", "ekonom", "standart", "premium", "fərq"],
      answer:
        "Ekonom büdcəli materiallarla sadə tamamlamadır, Standart orta keyfiyyətli materiallardır, Premium isə dizayner səviyyəli yüksək keyfiyyətdir. Hər səviyyə ümumi dəyəri fərqli əmsalla dəyişir — Büdcə Optimallaşdırıcısı bölməsində qənaət məbləğini görə bilərsiniz."
    },
    {
      keywords: ["cədvəl", "müddət", "neçə vaxt", "nə qədər çəkər", "timeline", "vaxt"],
      answer:
        "Tikinti Cədvəli bölməsi sahə hazırlığından xarici işlərə qədər hər mərhələnin təxmini müddətini həftələrlə göstərir. Bu, planlaşdırma məqsədli ümumi göstəricidir, dəqiq iş qrafiki podratçı ilə razılaşdırılmalıdır."
    },
    {
      keywords: ["pdf", "hesabat", "yüklə", "çap", "rapor"],
      answer:
        "Nəticə əldə etdikdən sonra \"PDF Hesabatı Yüklə\" düyməsi ilə müştəriyə təqdim edilə bilən rəsmi sənəd yarada bilərsiniz — loqo, xərc bölgüsü, material siyahısı, tikinti cədvəli və QR kod daxil olmaqla."
    },
    {
      keywords: ["saxla", "layihəni saxla", "yadda saxla", "save"],
      answer:
        "\"Layihəni Saxla\" düyməsi ilə hesablamanızı brauzerinizdə yerli olaraq saxlaya, daha sonra \"Saxlanmış Layihələr\" siyahısından yenidən aça bilərsiniz. Bu məlumat yalnız bu cihazda saxlanılır."
    },
    {
      keywords: ["paylaş", "link", "share"],
      answer:
        "\"Linklə Paylaş\" düyməsi hesablama parametrlərinizi ehtiva edən unikal link yaradır — bu linki göndərdiyiniz şəxs eyni məlumatlarla smetaya birbaşa baxa bilər."
    },
    {
      keywords: ["qiymət mənbə", "haradan", "material qiymət", "trend"],
      answer:
        "Bütün qiymətlər bazar araşdırması, podratçı sorğuları və material təchizatçılarının orta qiymətlərinə əsaslanır. Material Qiymət Mərkəzi bölməsində hər materialın son yenilənmə tarixini və qiymət trendini görə bilərsiniz."
    },
    {
      keywords: ["region", "şəhər", "bakı", "gəncə", "hansı şəhər"],
      answer:
        "Hazırda Bakı, Sumqayıt, Gəncə, Mingəçevir, Şirvan, Naxçıvan, Şəki, Lənkəran, Quba və digər regionlar üçün fərqli qiymət əmsalları mövcuddur."
    },
    {
      keywords: ["ai", "süni intellekt", "chatgpt", "claude"],
      answer:
        "Bu köməkçi hazırda sadə açar-söz əsaslı FAQ sistemidir, canlı süni intellekt deyil (statik sayt təhlükəsiz API açarı saxlaya bilmir). Tam AI Köməkçi funksiyası \"Premium\" bölməsində tezliklə gələcək backend dəstəyi ilə aktivləşəcək."
    },
    {
      keywords: ["əlaqə", "dəstək", "kömək", "telefon", "email", "whatsapp"],
      answer:
        "Bizimlə əlaqə: elvinasgarov12@gmail.com və ya +994 77 588 97 27. İcma dəstəyi üçün səhifənin \"İcma\" bölməsindəki WhatsApp qrupuna qoşula bilərsiniz."
    },
    {
      keywords: ["dark mode", "qaranlıq", "tema"],
      answer:
        "Yuxarı sağdakı ay ikonuna basaraq qaranlıq/işıqlı rejim arasında keçid edə bilərsiniz — seçiminiz brauzerinizdə yadda saxlanılır."
    }
  ];

  const FALLBACK_ANSWER =
    "Təəssüf ki, bu sualı tam başa düşmədim. Zəhmət olmasa daha sadə söz işlədin, ya da elvinasgarov12@gmail.com və ya WhatsApp icma qrupu vasitəsilə birbaşa bizimlə əlaqə saxlayın.";

  function findAnswer(question) {
    const q = question.toLowerCase();
    let best = null;
    let bestScore = 0;
    KNOWLEDGE_BASE.forEach((entry) => {
      const score = entry.keywords.reduce(
        (acc, kw) => acc + (q.includes(kw.toLowerCase()) ? kw.length : 0),
        0
      );
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    });
    return best ? best.answer : FALLBACK_ANSWER;
  }

  function buildWidget() {
    const wrap = document.createElement("div");
    wrap.id = "icAssistantWidget";
    wrap.innerHTML = `
      <button id="icAssistantToggle" class="ic-assistant-toggle" aria-label="Köməkçini aç" title="Sürətli Köməkçi">
        💬
      </button>
      <div id="icAssistantPanel" class="ic-assistant-panel" hidden>
        <div class="ic-assistant-header">
          <div>
            <strong>IndustrCons Köməkçi</strong>
            <div class="ic-assistant-subtitle">Sürətli cavablar · açar-söz əsaslı</div>
          </div>
          <button id="icAssistantClose" class="icon-btn" aria-label="Bağla" style="width:30px;height:30px;">✕</button>
        </div>
        <div id="icAssistantMessages" class="ic-assistant-messages">
          <div class="ic-assistant-msg ic-assistant-msg--bot">
            Salam! Kalkulyator, qiymətlər, PDF hesabat və ya digər mövzularda sualınızı yazın. (Qeyd: bu, açar-söz əsaslı sürətli köməkçidir, canlı AI deyil.)
          </div>
        </div>
        <form id="icAssistantForm" class="ic-assistant-form">
          <input type="text" id="icAssistantInput" placeholder="Sualınızı yazın..." autocomplete="off" />
          <button type="submit" class="btn btn-primary" style="padding:8px 14px;">Göndər</button>
        </form>
      </div>
    `;
    document.body.appendChild(wrap);

    const toggleBtn = document.getElementById("icAssistantToggle");
    const closeBtn = document.getElementById("icAssistantClose");
    const panel = document.getElementById("icAssistantPanel");
    const form = document.getElementById("icAssistantForm");
    const input = document.getElementById("icAssistantInput");
    const messages = document.getElementById("icAssistantMessages");

    function open() {
      panel.hidden = false;
      toggleBtn.classList.add("is-active");
      setTimeout(() => input.focus(), 50);
    }
    function close() {
      panel.hidden = true;
      toggleBtn.classList.remove("is-active");
    }

    toggleBtn.addEventListener("click", () => (panel.hidden ? open() : close()));
    closeBtn.addEventListener("click", close);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const question = input.value.trim();
      if (!question) return;

      const userMsg = document.createElement("div");
      userMsg.className = "ic-assistant-msg ic-assistant-msg--user";
      userMsg.textContent = question;
      messages.appendChild(userMsg);

      const answer = findAnswer(question);
      const botMsg = document.createElement("div");
      botMsg.className = "ic-assistant-msg ic-assistant-msg--bot";
      botMsg.textContent = answer;
      messages.appendChild(botMsg);

      input.value = "";
      messages.scrollTop = messages.scrollHeight;
    });
  }

  function init() {
    if (document.getElementById("icAssistantWidget")) return; // already mounted
    buildWidget();
  }

  global.ICAssistant = { init, findAnswer };
})(window);
