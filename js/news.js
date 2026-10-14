
(() => {
  "use strict";

  const db = window.supabaseClient;
  const BUCKET = window.STORAGE_BUCKET || "site-media";
  const article = document.getElementById("articleContent");

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function imageURL(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;

    const { data } = db.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl || "";
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function showError(message) {
    article.innerHTML = `
      <div class="article-state">
        <p>${escapeHTML(message)}</p>
        <a href="index.html#news">Вернуться к новостям</a>
      </div>
    `;
  }

  async function loadSettings() {
    const { data, error } = await db
      .from("site_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error || !data?.length) return;

    const settings = data[0];
    const root = document.documentElement;

    if (settings.primary_color) {
      root.style.setProperty("--primary", settings.primary_color);
    }
    if (settings.accent_color) {
      root.style.setProperty("--accent", settings.accent_color);
    }
    if (settings.gold_color) {
      root.style.setProperty("--gold", settings.gold_color);
    }
    if (settings.white_color) {
      root.style.setProperty("--white", settings.white_color);
    }

    const teamName = settings.team_name || "Челны 2011";
    const subtitle = settings.subtitle || "хоккейный клуб";
    const city = settings.city || "Набережные Челны";
    const logo = imageURL(settings.logo_path);

    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };

    setText("teamName", teamName);
    setText("teamSubtitle", subtitle);
    setText("footerTeamName", teamName);
    setText("footerCity", city);

    ["teamLogo", "footerLogo"].forEach(id => {
      const element = document.getElementById(id);
      if (!element) return;

      if (logo) {
        element.src = logo;
        element.hidden = false;
      } else {
        element.hidden = true;
      }
    });
  }

  async function loadNews() {
    const id = new URLSearchParams(window.location.search).get("id");

    if (!id) {
      showError("Не указана новость.");
      return;
    }

    const { data, error } = await db
      .from("news")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Ошибка загрузки новости:", error);
      showError("Не удалось загрузить новость. Попробуйте обновить страницу.");
      return;
    }

    if (!data) {
      showError("Новость не найдена или была удалена.");
      return;
    }

    const title = data.title || "Без названия";
    const tag = data.tag || "Новости";
    const date = formatDate(data.published_at || data.created_at);
    const image = imageURL(data.image_path);
    const text = data.text || "";

    document.title = `${title} — ХК Челны 2011`;

    article.innerHTML = `
      <div class="article-tag">${escapeHTML(tag)}</div>
      <h1 class="article-title">${escapeHTML(title)}</h1>
      ${date ? `<div class="article-date">${escapeHTML(date)}</div>` : ""}
      ${image ? `
        <img class="article-image"
          src="${escapeHTML(image)}"
          alt="${escapeHTML(title)}">
      ` : ""}
      <div class="article-text">${escapeHTML(text)}</div>
    `;
  }

  async function init() {
    if (!db) {
      showError("Не удалось подключиться к базе данных. Проверьте js/config.js.");
      return;
    }

    await Promise.allSettled([loadSettings(), loadNews()]);
  }

  init();
})();
