(() => {
  "use strict";

  const root = document.documentElement;
  const themeButtons = document.querySelectorAll("[data-theme-toggle]");
  const storedTheme = localStorage.getItem("schemami-theme");
  if (storedTheme === "light" || storedTheme === "dark") root.dataset.theme = storedTheme;

  const themeLabel = () => root.dataset.theme || "system";
  const updateThemeButton = () => {
    themeButtons.forEach((themeButton) => {
      themeButton.textContent = `Theme: ${themeLabel()}`;
      themeButton.setAttribute("aria-label", `Theme is ${themeLabel()}. Change theme`);
    });
  };
  updateThemeButton();
  themeButtons.forEach((themeButton) => {
    themeButton.addEventListener("click", () => {
      const next = themeLabel() === "system" ? "light" : themeLabel() === "light" ? "dark" : "system";
      if (next === "system") {
        delete root.dataset.theme;
        localStorage.removeItem("schemami-theme");
      } else {
        root.dataset.theme = next;
        localStorage.setItem("schemami-theme", next);
      }
      updateThemeButton();
    });
  });

  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = document.getElementById(button.getAttribute("data-copy"));
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.textContent.trim());
        const original = button.textContent;
        button.textContent = "Copied";
        window.setTimeout(() => { button.textContent = original; }, 1500);
      } catch {
        target.focus?.();
      }
    });
  });

  const jsonSource = (source) => {
    const trimmed = source.trim();
    if (!trimmed) return false;
    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      if (!trimmed.startsWith('"') || !trimmed.includes("\":")) return false;
      try {
        JSON.parse(`{${trimmed}}`);
        return true;
      } catch {
        return false;
      }
    }
  };

  const highlightJSON = (codeBlock) => {
    const source = codeBlock.textContent;
    if (!jsonSource(source)) return;
    const tokenPattern = /("(?:\\.|[^"\\])*")(?=\s*:)|("(?:\\.|[^"\\])*")|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b|[{}[\],:]/g;
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    for (const match of source.matchAll(tokenPattern)) {
      const index = match.index;
      if (index > cursor) fragment.append(document.createTextNode(source.slice(cursor, index)));
      const token = match[0];
      const span = document.createElement("span");
      span.className = match[1]
        ? "sm-token-property"
        : match[2]
          ? "sm-token-string"
          : /^(?:true|false|null)$/.test(token)
            ? "sm-token-boolean"
            : /^-?\d/.test(token)
              ? "sm-token-number"
              : "sm-token-punctuation";
      span.textContent = token;
      fragment.append(span);
      cursor = index + token.length;
    }
    if (cursor < source.length) fragment.append(document.createTextNode(source.slice(cursor)));
    codeBlock.replaceChildren(fragment);
    codeBlock.closest("pre")?.setAttribute("data-syntax", "json");
  };

  document.querySelectorAll("pre.sm-code > code").forEach(highlightJSON);

  const searchInput = document.querySelector("[data-site-search]");
  const searchResults = document.querySelector("[data-search-results]");
  const pages = Array.isArray(window.__SCHEMAMI_SEARCH__) ? window.__SCHEMAMI_SEARCH__ : [];
  const renderSearch = () => {
    if (!searchInput || !searchResults) return;
    const query = searchInput.value.trim().toLocaleLowerCase("en");
    searchResults.replaceChildren();
    if (!query) {
      searchResults.hidden = true;
      return;
    }
    const matches = pages.filter((page) => `${page.title} ${page.description} ${page.keywords}`.toLocaleLowerCase("en").includes(query)).slice(0, 8);
    matches.forEach((page) => {
      const link = document.createElement("a");
      link.href = page.path;
      const title = document.createElement("strong");
      title.textContent = page.title;
      const description = document.createElement("span");
      description.textContent = page.description;
      link.append(title, description);
      searchResults.append(link);
    });
    if (!matches.length) {
      const empty = document.createElement("p");
      empty.textContent = "No matching documentation.";
      searchResults.append(empty);
    }
    searchResults.hidden = false;
  };
  searchInput?.addEventListener("input", renderSearch);
  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      searchInput.value = "";
      renderSearch();
    }
  });

  const path = location.pathname.replace(/index\.html$/, "");
  document.querySelectorAll("[data-nav-path]").forEach((link) => {
    const target = link.getAttribute("data-nav-path");
    if (target === "/" ? path === "/" : path.startsWith(target)) link.setAttribute("aria-current", "page");
  });
})();
