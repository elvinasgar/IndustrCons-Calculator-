/**
 * IndustrCons — storage.js
 * Handles "Save Project" (localStorage) and "Share Estimate" (encoded URL).
 *
 * FUTURE BACKEND NOTE:
 * Every function below is written as if it could be async and network-backed.
 * To swap localStorage for a real backend (Firebase/Supabase) later, only
 * this file needs to change — replace the localStorage calls with fetch()/SDK
 * calls that return the same shapes. Nothing in app.js or wizard.js needs to
 * know the difference, since they only call these named functions.
 *
 * Public API (window.ICStorage):
 *   - saveProject(name, input, result) -> savedProject
 *   - listProjects() -> Array<savedProject>
 *   - loadProject(id) -> savedProject|null
 *   - deleteProject(id) -> boolean
 *   - generateShareLink(input) -> string (full URL)
 *   - readShareLinkFromUrl() -> input|null
 */

(function (global) {
  "use strict";

  const STORAGE_KEY = "ic_saved_projects_v1";

  function readAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("IndustrCons: layihələr oxuna bilmədi", e);
      return [];
    }
  }

  function writeAll(projects) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      return true;
    } catch (e) {
      console.warn("IndustrCons: layihələr yadda saxlanıla bilmədi", e);
      return false;
    }
  }

  /**
   * Saves a project snapshot (input + result) locally in the browser.
   * NOTE: this is per-browser, per-device storage — not synced across
   * devices. A future backend would replace this with an authenticated
   * API call keyed by user account instead of by browser.
   */
  function saveProject(name, input, result) {
    const projects = readAll();
    const project = {
      id: "proj_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: name || `Layihə ${projects.length + 1}`,
      savedAt: new Date().toISOString(),
      input,
      grandTotal: result ? result.grandTotal : null
    };
    projects.unshift(project);
    // Keep the most recent 20 to avoid unbounded localStorage growth
    writeAll(projects.slice(0, 20));
    return project;
  }

  function listProjects() {
    return readAll();
  }

  function loadProject(id) {
    return readAll().find((p) => p.id === id) || null;
  }

  function deleteProject(id) {
    const projects = readAll().filter((p) => p.id !== id);
    return writeAll(projects);
  }

  /**
   * Encodes the wizard input into a URL so an estimate can be shared without
   * a backend. The receiving browser decodes it and pre-fills the wizard.
   *
   * FUTURE BACKEND NOTE: once a backend exists, this should instead POST
   * the input to an API, receive back a short opaque ID, and build the URL
   * as https://industrcons.az/s/{id} — the function signature here can stay
   * the same (just becomes async), so call sites barely change.
   */
  function generateShareLink(input) {
    try {
      const json = JSON.stringify(input);
      const encoded = btoa(unescape(encodeURIComponent(json)));
      const url = new URL(window.location.href);
      url.hash = "calculator";
      url.searchParams.set("share", encoded);
      return url.toString();
    } catch (e) {
      console.warn("IndustrCons: paylaşım linki yaradıla bilmədi", e);
      return null;
    }
  }

  /**
   * Reads a `?share=` param from the current URL (if present) and decodes
   * it back into an input object. Returns null if absent or invalid.
   */
  function readShareLinkFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get("share");
      if (!encoded) return null;
      const json = decodeURIComponent(escape(atob(encoded)));
      return JSON.parse(json);
    } catch (e) {
      console.warn("IndustrCons: paylaşım linki oxuna bilmədi", e);
      return null;
    }
  }

  global.ICStorage = {
    saveProject,
    listProjects,
    loadProject,
    deleteProject,
    generateShareLink,
    readShareLinkFromUrl
  };
})(window);

