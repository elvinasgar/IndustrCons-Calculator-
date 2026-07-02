/**
 * IndustrCons — timeline.js
 * Generates an estimated construction schedule (phase durations in weeks)
 * based on total building area and floor count. Pure calculation module —
 * no DOM access — so it can be reused in the PDF report and any future
 * backend/mobile context.
 *
 * Public API (window.ICTimeline):
 *   - generateTimeline(result) -> { phases: [...], totalWeeks, totalMonths }
 *   - PHASE_LABELS_AZ
 */

(function (global) {
  "use strict";

  const PHASE_LABELS_AZ = {
    sitePrep: "Sahə Hazırlığı",
    foundation: "Təməl İşləri",
    structural: "Struktur İşlər (Karkas)",
    masonry: "Hörgü",
    roofing: "Dam Örtüyü",
    mep: "Elektrik / Santexnika / HVAC (MEP)",
    fitOut: "Daxili Bitirmə (Fit-out)",
    exterior: "Xarici İşlər və Ərazi Quruluşu"
  };

  /**
   * Heuristic duration formulas (in weeks). These are simplified planning
   * estimates, not a substitute for a professional construction schedule —
   * this is made explicit in the UI and PDF report.
   */
  function computePhaseWeeks(area, floors) {
    const totalArea = area * floors;
    return {
      sitePrep: 1 + area / 500,
      foundation: 2 + area / 300,
      structural: 3 + totalArea / 250,
      masonry: 2 + area / 200,
      roofing: 1 + area / 400,
      mep: 3 + totalArea / 250,
      fitOut: 4 + totalArea / 150,
      exterior: 2 + area / 300
    };
  }

  /**
   * @param {Object} result - output of ICCalculator.estimate()
   * @returns {Object} { phases: [{key,label,weeks,startWeek,endWeek}], totalWeeks, totalMonths }
   */
  function generateTimeline(result) {
    const { area, floors } = result.input;
    const rawWeeks = computePhaseWeeks(area, floors);

    let cursor = 0;
    const phases = Object.entries(rawWeeks).map(([key, weeks]) => {
      const rounded = Math.round(weeks * 2) / 2; // nearest 0.5 week
      const startWeek = cursor;
      const endWeek = cursor + rounded;
      cursor = endWeek;
      return {
        key,
        label: PHASE_LABELS_AZ[key] || key,
        weeks: rounded,
        startWeek,
        endWeek
      };
    });

    const totalWeeks = Math.round(cursor * 2) / 2;
    const totalMonths = Math.round((totalWeeks / 4.345) * 10) / 10;

    return { phases, totalWeeks, totalMonths };
  }

  global.ICTimeline = { generateTimeline, PHASE_LABELS_AZ };
})(window);
