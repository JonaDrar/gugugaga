// Simple localStorage persistence for Gugugaga
(function () {
  const GG = (window.GG = window.GG || {});
  GG.SAVE_KEY = "gugugaga.save.v1";

  GG.Save = {
    load() {
      try {
        return JSON.parse(localStorage.getItem(GG.SAVE_KEY));
      } catch (e) {
        return null;
      }
    },
    save(state) {
      try {
        localStorage.setItem(GG.SAVE_KEY, JSON.stringify(state));
      } catch (e) {
        /* storage full or blocked — ignore */
      }
    },
    clear() {
      try {
        localStorage.removeItem(GG.SAVE_KEY);
      } catch (e) {}
    },
  };
})();
