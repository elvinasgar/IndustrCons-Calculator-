/**
 * IndustrCons — calculator.js
 * Pure calculation engine. No DOM access here — keeps logic portable
 * for future reuse (Node backend, Firebase Cloud Function, mobile app, etc).
 *
 * Public API (exposed on window.ICCalculator):
 *   - loadPrices()              -> Promise<pricesObject>
 *   - estimate(input, prices)   -> result object
 */

(function (global) {
  "use strict";

  const DATA_URL = "prices.json";
  let cachedPrices = null;

  /**
   * Fetches and caches the price database.
   */
  async function loadPrices(forceReload = false) {
    if (cachedPrices && !forceReload) return cachedPrices;
    const res = await fetch(DATA_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("Qiymət bazası yüklənmədi (prices.json)");
    cachedPrices = await res.json();
    return cachedPrices;
  }

  /**
   * Main estimation function.
   * @param {Object} input
   *   area: number (m²)
   *   floors: number
   *   buildingType: string (key in prices.baseRatePerM2)
   *   finishLevel: string (key in prices.finishLevels)
   *   foundationType: string
   *   roofType: string
   *   city: string
   *   landPriceOverride: number|null  (AZN per m², optional manual override)
   *   includeLand: boolean
   * @param {Object} prices - loaded prices.json
   */
  function estimate(input, prices) {
    const {
      area,
      floors,
      buildingType,
      finishLevel,
      foundationType,
      roofType,
      city,
      landPriceOverride,
      includeLand
    } = input;

    if (!area || area <= 0) throw new Error("Sahə düzgün daxil edilməyib");
    if (!floors || floors <= 0) throw new Error("Mərtəbə sayı düzgün deyil");

    const baseRate = prices.baseRatePerM2[buildingType];
    const finish = prices.finishLevels[finishLevel];
    const foundation = prices.foundationTypes[foundationType];
    const roof = prices.roofTypes[roofType];
    const cityMult = prices.cityMultipliers[city] ?? prices.cityMultipliers["Other / Digər"];

    if (!baseRate || !finish || !foundation || !roof) {
      throw new Error("Hesablama üçün bəzi parametrlər tapılmadı");
    }

    const extraFloors = Math.max(0, floors - 1);
    const floorMult =
      prices.floorMultiplier.base + extraFloors * prices.floorMultiplier.perExtraFloor;

    // Effective AZN/m² after all multipliers
    const effectiveRate =
      baseRate * finish.multiplier * foundation.multiplier * roof.multiplier * cityMult * floorMult;

    const totalBuildingArea = area * floors;
    const constructionCost = effectiveRate * totalBuildingArea;

    // Land cost
    const landRate =
      landPriceOverride != null && landPriceOverride > 0
        ? landPriceOverride
        : prices.landPricePerM2ByCity[city] ?? prices.landPricePerM2ByCity["Other / Digər"];
    const landCost = includeLand ? landRate * area : 0;

    // Detailed breakdown (percentages apply to construction cost only, not land)
    const breakdown = {};
    let breakdownSum = 0;
    for (const [key, pct] of Object.entries(prices.costBreakdownPercentages)) {
      const value = constructionCost * pct;
      breakdown[key] = value;
      breakdownSum += value;
    }
    // Normalize rounding drift back into contingency-free total
    const breakdownTotal = breakdownSum;

    // Material quantities (based on total building floor area)
    const materials = {};
    for (const [key, qtyPerM2] of Object.entries(prices.materialQuantitiesPerM2)) {
      const quantity = qtyPerM2 * totalBuildingArea * finish.multiplier;
      const unitPrice = prices.materialUnitPrices[key] ?? 0;
      materials[key] = {
        quantity,
        unit: prices.materialUnits[key] || "",
        unitPrice,
        totalPrice: quantity * unitPrice
      };
    }

    const grandTotal = constructionCost + landCost;

    return {
      input,
      effectiveRatePerM2: effectiveRate,
      totalBuildingArea,
      constructionCost,
      landCost,
      grandTotal,
      costPerM2: grandTotal / totalBuildingArea,
      breakdown,
      breakdownTotal,
      materials,
      currency: prices.meta.currency,
      currencySymbol: prices.meta.currencySymbol,
      generatedAt: new Date().toISOString()
    };
  }

  const BREAKDOWN_LABELS_AZ = {
    excavation: "Qazıntı işləri",
    foundation: "Təməl",
    concrete: "Beton",
    reinforcement: "Armatur (Rebar)",
    masonry: "Hörgü",
    columnsBeams: "Sütun və Tirlər",
    roof: "Dam örtüyü",
    doorsWindows: "Qapı və Pəncərələr",
    electrical: "Elektrik",
    plumbing: "Santexnika",
    hvac: "İstilik / Ventilyasiya (HVAC)",
    interiorFinishing: "Daxili Tamamlama",
    exteriorFinishing: "Xarici Tamamlama",
    landscaping: "Ərazi Quruluşu",
    contingency: "Ehtiyat Fond (Contingency)"
  };

  const MATERIAL_LABELS_AZ = {
    concreteM3: "Beton",
    rebarTon: "Armatur",
    cementBags: "Sement",
    sandM3: "Qum",
    gravelM3: "Çınqıl",
    brickPcs: "Kərpic/Blok",
    paintLiters: "Boya",
    tilesM2: "Kafel/Plitka",
    steelKg: "Polad",
    waterproofingM2: "Hidroizolyasiya"
  };

  global.ICCalculator = {
    loadPrices,
    estimate,
    BREAKDOWN_LABELS_AZ,
    MATERIAL_LABELS_AZ
  };
})(window);
