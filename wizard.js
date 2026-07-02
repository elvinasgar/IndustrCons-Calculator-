/**
 * IndustrCons — wizard.js
 * Turns the calculator form into a step-by-step wizard:
 *   1. Layihənin Yeri  2. Torpaq Məlumatı  3. Bina Növü
 *   4. Mərtəbə Sayı    5. Sahə             6. Tamamlama Səviyyəsi
 *   7. Yoxlama (Review) — submits the existing #calculatorForm
 *   8. Nəticə — the pre-existing #resultsSection becomes "step 8" visually
 *      once app.js finishes calculating (see markResultReached()).
 *
 * IMPORTANT: this module ONLY controls which .wizard-step is visible and
 * validates required fields per step. It does NOT reimplement calculation —
 * the real "Hesabla" button inside the Review step is a native
 * <button type="submit">, so app.js's existing form submit listener keeps
 * working exactly as before. This keeps the wizard additive and low-risk.
 *
 * Public API (window.ICWizard):
 *   - init()
 *   - markResultReached()  — call after a successful calculation
 */

(function (global) {
  "use strict";

  const STEP_TITLES = [
    "Layihənin Yeri",
    "Torpaq Məlumatı",
    "Bina Növü",
    "Mərtəbə Sayı",
    "Sahə",
    "Tamamlama Səviyyəsi",
    "Yoxlama"
  ];
  const RESULT_STEP_TITLE = "Nəticə";

  let steps = [];
  let currentIndex = 0;
  let progressEl = null;

  function miniToast(message) {
    const container = document.getElementById("toastContainer");
    if (!container) {
      alert(message);
      return;
    }
    const toast = document.createElement("div");
    toast.className = "toast toast--error";
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("toast--visible"));
    setTimeout(() => {
      toast.classList.remove("toast--visible");
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  function buildProgressBar() {
    progressEl = document.getElementById("wizardProgress");
    if (!progressEl) return;
    const allTitles = [...STEP_TITLES, RESULT_STEP_TITLE];
    progressEl.innerHTML = allTitles
      .map(
        (title, i) => `
        <div class="wizard-progress-step" data-index="${i}">
          <div class="wizard-progress-dot">${i + 1}</div>
          <div class="wizard-progress-label">${title}</div>
        </div>
      `
      )
      .join("");
    updateProgressUI();
  }

  function updateProgressUI(resultReached) {
    if (!progressEl) return;
    const dots = progressEl.querySelectorAll(".wizard-progress-step");
    dots.forEach((dot, i) => {
      dot.classList.remove("is-active", "is-complete");
      if (i < currentIndex) dot.classList.add("is-complete");
      if (i === currentIndex) dot.classList.add("is-active");
    });
    if (resultReached) {
      const last = dots[dots.length - 1];
      if (last) {
        last.classList.add("is-active", "is-complete");
      }
    }
  }

  function getStepFields(stepEl) {
    return Array.from(stepEl.querySelectorAll("input, select, textarea"));
  }

  function validateStep(index) {
    const stepEl = steps[index];
    if (!stepEl) return true;
    const fields = getStepFields(stepEl);
    for (const field of fields) {
      // Skip validation for hidden fields (e.g. landPrice when includeLand unchecked)
      const isHidden = field.closest('[style*="display: none"], [style*="display:none"]');
      if (isHidden) continue;
      if (field.hasAttribute("required") && !field.checkValidity()) {
        field.reportValidity ? field.reportValidity() : miniToast("Zəhmət olmasa bu sahəni doldurun.");
        return false;
      }
    }
    return true;
  }

  function populateReviewSummary() {
    const summaryEl = document.getElementById("wizardReviewSummary");
    if (!summaryEl) return;

    const getVal = (id) => {
      const el = document.getElementById(id);
      if (!el) return "—";
      if (el.tagName === "SELECT") {
        return el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : el.value;
      }
      return el.value || "—";
    };

    const includeLand = document.getElementById("includeLand")?.checked;

    const rows = [
      { label: "Şəhər / Region", value: getVal("city"), step: 0 },
      {
        label: "Torpaq",
        value: includeLand ? `Daxil edilib (${getVal("landPrice")} ₼/m²)` : "Daxil edilməyib",
        step: 1
      },
      { label: "Bina növü", value: getVal("buildingType"), step: 2 },
      { label: "Təməl növü", value: getVal("foundationType"), step: 2 },
      { label: "Dam növü", value: getVal("roofType"), step: 2 },
      { label: "Mərtəbə sayı", value: getVal("floors"), step: 3 },
      { label: "Sahə", value: `${getVal("area")} m²`, step: 4 },
      { label: "Tamamlama səviyyəsi", value: getVal("finishLevel"), step: 5 }
    ];

    summaryEl.innerHTML = rows
      .map(
        (r) => `
        <div class="wizard-review-row">
          <span class="wizard-review-label">${r.label}</span>
          <span class="wizard-review-value">${r.value}</span>
          <button type="button" class="wizard-review-edit" data-jump="${r.step}">Dəyiş</button>
        </div>
      `
      )
      .join("");

    summaryEl.querySelectorAll(".wizard-review-edit").forEach((btn) => {
      btn.addEventListener("click", () => {
        goToStep(parseInt(btn.dataset.jump, 10));
      });
    });
  }

  function showStep(index) {
    steps.forEach((stepEl, i) => {
      stepEl.hidden = i !== index;
    });
    currentIndex = index;
    updateProgressUI();
    if (STEP_TITLES[index] === "Yoxlama") {
      populateReviewSummary();
    }
    const panel = document.getElementById("wizardPanel");
    if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goToStep(index) {
    if (index < 0 || index >= steps.length) return;
    showStep(index);
  }

  function goNext() {
    if (!validateStep(currentIndex)) return;
    if (currentIndex < steps.length - 1) showStep(currentIndex + 1);
  }

  function goBack() {
    if (currentIndex > 0) showStep(currentIndex - 1);
  }

  function markResultReached() {
    updateProgressUI(true);
  }

  function init() {
    steps = Array.from(document.querySelectorAll("#calculatorForm .wizard-step"));
    if (!steps.length) return; // wizard markup not present — no-op

    buildProgressBar();
    showStep(0);

    document.querySelectorAll(".wizard-next").forEach((btn) => {
      btn.addEventListener("click", goNext);
    });
    document.querySelectorAll(".wizard-back").forEach((btn) => {
      btn.addEventListener("click", goBack);
    });
  }

  global.ICWizard = { init, markResultReached, goToStep };
})(window);
