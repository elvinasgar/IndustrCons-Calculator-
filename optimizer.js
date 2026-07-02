/**
 * IndustrCons — optimizer.js
 * "What-if" budget optimizer. Re-runs the estimation engine with cheaper
 * alternatives for finish level, foundation type, and roof type, then
 * reports the potential savings — without ever downgrading the user's
 * actual selection. Pure logic module, no DOM access.
 *
 * Public API (window.ICOptimizer):
 *   - getSavingsSuggestions(input, prices, currentResult) -> [{ title, savings, description }]
 */

(function (global) {
  "use strict";

  /**
   * Given an ordered tier list (cheapest → most expensive) and the current
   * key, returns the key one tier cheaper, or null if already cheapest.
   */
  function getCheaperTier(orderedKeys, currentKey) {
    const idx = orderedKeys.indexOf(currentKey);
    if (idx <= 0) return null;
    return orderedKeys[idx - 1];
  }

  function fmt(n) {
    return Math.round(n).toLocaleString("az-AZ").replace(/,/g, " ");
  }

  /**
   * @param {Object} input - the same input object passed to ICCalculator.estimate()
   * @param {Object} prices - loaded prices.json
   * @param {Object} currentResult - output of ICCalculator.estimate(input, prices)
   * @returns {Array<{title, savings, description}>}
   */
  function getSavingsSuggestions(input, prices, currentResult) {
    const suggestions = [];
    const calc = global.ICCalculator;
    if (!calc || !calc.estimateWithOverride) return suggestions;

    // 1) Finish level tier-down
    const finishTiers = ["ekonom", "standart", "premium"];
    const cheaperFinish = getCheaperTier(finishTiers, input.finishLevel);
    if (cheaperFinish) {
      const alt = calc.estimateWithOverride(input, prices, { finishLevel: cheaperFinish });
      if (alt) {
        const savings = currentResult.grandTotal - alt.grandTotal;
        if (savings > 0) {
          const label = prices.finishLevels[cheaperFinish]?.label || cheaperFinish;
          suggestions.push({
            title: `${label} tamamlama səviyyəsinə keçid`,
            savings,
            description: `"${prices.finishLevels[input.finishLevel]?.label || input.finishLevel}" əvəzinə "${label}" seçsəniz, təxminən ${fmt(savings)} ₼ qənaət edə bilərsiniz.`
          });
        }
      }
    }

    // 2) Foundation tier-down (sorted cheapest→most expensive by multiplier)
    const foundationKeys = Object.keys(prices.foundationTypes).sort(
      (a, b) => prices.foundationTypes[a].multiplier - prices.foundationTypes[b].multiplier
    );
    const cheaperFoundation = getCheaperTier(foundationKeys, input.foundationType);
    if (cheaperFoundation && cheaperFoundation !== input.foundationType) {
      const alt = calc.estimateWithOverride(input, prices, { foundationType: cheaperFoundation });
      if (alt) {
        const savings = currentResult.grandTotal - alt.grandTotal;
        if (savings > 0) {
          const label = prices.foundationTypes[cheaperFoundation]?.label || cheaperFoundation;
          suggestions.push({
            title: `${label} tətbiqi`,
            savings,
            description: `Torpaq şəraiti uyğun olarsa, "${label}" seçimi ilə təxminən ${fmt(savings)} ₼ qənaət mümkündür (mühəndis rəyi tövsiyə olunur).`
          });
        }
      }
    }

    // 3) Roof tier-down
    const roofKeys = Object.keys(prices.roofTypes).sort(
      (a, b) => prices.roofTypes[a].multiplier - prices.roofTypes[b].multiplier
    );
    const cheaperRoof = getCheaperTier(roofKeys, input.roofType);
    if (cheaperRoof && cheaperRoof !== input.roofType) {
      const alt = calc.estimateWithOverride(input, prices, { roofType: cheaperRoof });
      if (alt) {
        const savings = currentResult.grandTotal - alt.grandTotal;
        if (savings > 0) {
          const label = prices.roofTypes[cheaperRoof]?.label || cheaperRoof;
          suggestions.push({
            title: `${label} seçimi`,
            savings,
            description: `Dam növünü "${label}" olaraq dəyişsəniz, təxminən ${fmt(savings)} ₼ qənaət edə bilərsiniz.`
          });
        }
      }
    }

    // Sort by biggest savings first
    suggestions.sort((a, b) => b.savings - a.savings);
    return suggestions;
  }

  global.ICOptimizer = { getSavingsSuggestions };
})(window);
