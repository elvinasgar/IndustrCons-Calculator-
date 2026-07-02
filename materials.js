/**
 * IndustrCons — materials.js
 * Renders the Material Price Center table: current unit price, last-updated
 * date, and price trend (↑ / ↓ / →) for each tracked material.
 *
 * Reads from prices.materialUnitPrices (existing, used by calculator.js)
 * and prices.materialMeta (new, additive — calculator.js does not depend
 * on it, so this module can evolve freely without risk to core estimation).
 *
 * Public API (window.ICMaterials):
 *   - renderMaterialPriceCenter(containerEl, prices)
 */

(function (global) {
  "use strict";

  const TREND_ICON = { up: "▲", down: "▼", stable: "→" };
  const TREND_CLASS = { up: "trend-up", down: "trend-down", stable: "trend-stable" };

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString("az-AZ");
    } catch (e) {
      return iso;
    }
  }

  function renderMaterialPriceCenter(containerEl, prices) {
    if (!containerEl) return;
    const labels = (global.ICCalculator && global.ICCalculator.MATERIAL_LABELS_AZ) || {};
    const meta = prices.materialMeta || {};

    const rows = Object.entries(prices.materialUnitPrices)
      .map(([key, price]) => {
        const m = meta[key] || {};
        const trend = m.trend || "stable";
        const changePct = typeof m.changePct === "number" ? m.changePct : 0;
        const changeLabel =
          changePct === 0 ? "" : `${changePct > 0 ? "+" : ""}${changePct.toFixed(1)}%`;
        return `
          <tr>
            <td>${labels[key] || key}</td>
            <td class="text-right">${price.toLocaleString("az-AZ")} ₼</td>
            <td class="text-right text-muted">${prices.materialUnits[key] || ""}</td>
            <td class="text-right text-muted">${m.lastUpdated ? fmtDate(m.lastUpdated) : "—"}</td>
            <td class="text-right"><span class="${TREND_CLASS[trend]}">${TREND_ICON[trend]} ${changeLabel}</span></td>
          </tr>
        `;
      })
      .join("");

    containerEl.innerHTML = `
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Material</th>
              <th class="text-right">Cari Qiymət</th>
              <th class="text-right">Vahid</th>
              <th class="text-right">Son Yenilənmə</th>
              <th class="text-right">Trend</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="text-muted" style="font-size:0.8rem; margin-top:10px;">
        Trend göstəriciləri son bazar müşahidələrinə əsaslanır və gələcək real-vaxt inteqrasiyası üçün nəzərdə tutulub.
      </p>
    `;
  }

  global.ICMaterials = { renderMaterialPriceCenter };
})(window);
