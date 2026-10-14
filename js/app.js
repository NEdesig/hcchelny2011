
/* =========================================
   ХК ЧЕЛНЫ 2011 — PUBLIC APP
   File: js/app.js
========================================= */

(() => {
  "use strict";

  const db = window.supabaseClient;

  if (!db) {
    console.error("Supabase не подключён. Проверь js/config.js");
    return;
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const BUCKET = window.STORAGE_BUCKET || "site-media";

  let activeStoryTimer = null;
  let activeStoryProgress = null;
  let storyItems = [];
  let activeStatType = "scorers";

  // ========================================
  // HELPERS
  // ========================================

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function formatDate(value, options = {}) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      ...options
    }).format(date);
  }

  function formatDateTime(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function getLocalDayDifference(value) {
    const date = new Date(value);
    const now = new Date();

    const targetDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    return Math.round((targetDay - today) / 86400000);
  }

  function getMatchDayLabel(value) {
    const difference = getLocalDayDifference(value);

    if (difference === 0) return "Сегодня";
    if (difference === 1) return "Завтра";

    return formatDate(value, { weekday: "long" });
  }

  function getImageURL(path) {
    if (!path) return "";

    if (/^https?:\/\//i.test(path)) return path;

    const { data } = db.storage.from(BUCKET).getPublicUrl(path);

    return data?.publicUrl || "";
  }

  function imageHTML(path, alt, className = "") {
    const url = getImageURL(path);

    if (!url) return "";

    return `
      <img
        class="${escapeHTML(className)}"
        src="${escapeHTML(url)}"
        alt="${escapeHTML(alt)}"
        loading="lazy"
      >
    `;
  }

  function setError(element, message) {
    if (!element) return;

    element.innerHTML = `
      <p class="error-state">${escapeHTML(message)}</p>
    `;
  }

  function setEmpty(element, message) {
    if (!element) return;

    element.innerHTML = `
      <p class="empty-state">${escapeHTML(message)}</p>
    `;
  }

  async function fetchRows(table, options = {}) {
    let query = db.from(table).select(options.select || "*");

    if (options.order) {
      query = query.order(options.order.column, {
        ascending: options.order.ascending ?? false
      });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.filters) {
      for (const filter of options.filters) {
        query = query[filter.operator](
          filter.column,
          filter.value
        );
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Ошибка загрузки ${table}:`, error);
      throw error;
    }

    return data || [];
  }

  function showToastMessage(message) {
    console.info(message);
  }

  // ========================================
  // SETTINGS
  // ========================================

  async function loadSettings() {
    try {
      const rows = await fetchRows("site_settings", {
        order: { column: "updated_at", ascending: false },
        limit: 1
      });

      const settings = rows[0];

      if (!settings) return;

      const root = document.documentElement;

      root.style.setProperty(
        "--primary",
        settings.primary_color || "#000056"
      );

      root.style.setProperty(
        "--accent",
        settings.accent_color || "#0875dc"
      );

      root.style.setProperty(
        "--gold",
        settings.gold_color || "#ffcd00"
      );

      root.style.setProperty(
        "--white",
        settings.white_color || "#ffffff"
      );

      const teamName = $("#teamName");
      const subtitle = $("#teamSubtitle");
      const footerName = $("#footerTeamName");
      const footerCity = $("#footerCity");

      if (teamName) teamName.textContent = settings.team_name || "Челны 2011";
      if (subtitle) subtitle.textContent = settings.subtitle || "хоккейный клуб";
      if (footerName) footerName.textContent = settings.team_name || "Челны 2011";
      if (footerCity) footerCity.textContent = settings.city || "Набережные Челны";

      if (settings.logo_path) {
        const logoURL = getImageURL(settings.logo_path);

        ["#teamLogo", "#footerLogo"].forEach(selector => {
          const image = $(selector);

          if (image) image.src = logoURL;
        });
      }
    } catch (error) {
      console.error("Не удалось загрузить настройки:", error);
    }
  }

  // ========================================
  // NEWS
  // ========================================

  async function loadNews() {
    const container = $("#newsList");
    if (!container) return;

    try {
      const news = await fetchRows("news", {
        order: { column: "published_at", ascending: false },
        limit: 20
      });

      if (!news.length) {
        setEmpty(container, "Новости скоро появятся");
        return;
      }

      container.innerHTML = news.map(item => `
        <article class="news-card">
          ${imageHTML(item.image_path, item.title, "news-card-image")}

          <div class="news-card-content">
            <span class="news-card-tag">
              ${escapeHTML(item.tag || "Новости")}
            </span>

            <h3 class="news-card-title">
              ${escapeHTML(item.title)}
            </h3>

            <time class="news-card-date">
              ${escapeHTML(formatDateTime(item.published_at))}
            </time>
          </div>

          <a
            class="news-card-link"
            href="news.html?id=${encodeURIComponent(item.id)}"
            aria-label="Читать: ${escapeHTML(item.title)}"
          ></a>
        </article>
      `).join("");
    } catch (error) {
      setError(container, "Не удалось загрузить новости");
    }
  }

  // ========================================
  // STORIES
  // ========================================

  async function loadStories() {
    const container = $("#storiesList");
    if (!container) return;

    try {
      const now = new Date().toISOString();

      const stories = await fetchRows("stories", {
        order: { column: "created_at", ascending: false },
        filters: [
          { column: "expires_at", operator: "gt", value: now }
        ]
      });

      storyItems = stories;

      if (!stories.length) {
        setEmpty(container, "Новых историй пока нет");
        return;
      }

      container.innerHTML = stories.map((story, index) => `
        <button
          class="story-item"
          type="button"
          data-story-index="${index}"
          aria-label="Открыть историю ${index + 1}"
        >
          <span class="story-image-wrap">
            ${imageHTML(story.image_path, "История команды", "story-image")}
          </span>
          <span class="story-title">
            ${escapeHTML(formatDate(story.created_at))}
          </span>
        </button>
      `).join("");

      $$(".story-item", container).forEach(button => {
        button.addEventListener("click", () => {
          const index = Number(button.dataset.storyIndex);
          openStory(index);
        });
      });
    } catch (error) {
      setError(container, "Не удалось загрузить истории");
    }
  }

  function openStory(index) {
    const story = storyItems[index];
    if (!story) return;

    const viewer = $("#storyViewer");
    const image = $("#storyViewerImage");
    const progress = $("#storyProgressBar");

    if (!viewer || !image || !progress) return;

    clearTimeout(activeStoryTimer);
    cancelAnimationFrame(activeStoryProgress);

    image.src = getImageURL(story.image_path);

    viewer.classList.add("open");
    viewer.setAttribute("aria-hidden", "false");
    document.body.classList.add("viewer-open");

    progress.style.transition = "none";
    progress.style.width = "0%";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        progress.style.transition = "width 15s linear";
        progress.style.width = "100%";
      });
    });

    activeStoryTimer = setTimeout(closeStory, 15000);
  }

  function closeStory() {
    clearTimeout(activeStoryTimer);
    cancelAnimationFrame(activeStoryProgress);

    const viewer = $("#storyViewer");
    const image = $("#storyViewerImage");
    const progress = $("#storyProgressBar");

    if (viewer) {
      viewer.classList.remove("open");
      viewer.setAttribute("aria-hidden", "true");
    }

    if (image) image.src = "";
    if (progress) {
      progress.style.transition = "none";
      progress.style.width = "0%";
    }

    document.body.classList.remove("viewer-open");
  }

  $("#storyViewerClose")?.addEventListener("click", closeStory);

  $("#storyViewer")?.addEventListener("click", event => {
    if (event.target.id === "storyViewer") closeStory();
  });

  $("#storyViewerImage")?.addEventListener("click", closeStory);

  // ========================================
  // MATCHES
  // ========================================

  async function loadMatches() {
    const container = $("#matchesList");
    if (!container) return;

    try {
      const matches = await fetchRows("matches", {
        select: `
          id, match_date, venue, competition, status,
          home_score, away_score, home_club_id, away_club_id,
          home:clubs!matches_home_club_id_fkey(id,name,logo_path),
          away:clubs!matches_away_club_id_fkey(id,name,logo_path)
        `,
        order: { column: "match_date", ascending: false },
        limit: 50
      });

      if (!matches.length) {
        setEmpty(container, "Матчи пока не добавлены");
        return;
      }

      const now = Date.now();

      matches.sort((a, b) => {
        const aDate = new Date(a.match_date).getTime();
        const bDate = new Date(b.match_date).getTime();

        const aFuture = a.status !== "finished" && aDate >= now;
        const bFuture = b.status !== "finished" && bDate >= now;

        if (aFuture && !bFuture) return -1;
        if (!aFuture && bFuture) return 1;

        return aFuture ? aDate - bDate : bDate - aDate;
      });

      container.innerHTML = matches.map(renderMatchRow).join("");

      loadLastMatches(matches);
      loadMatchday(matches);
    } catch (error) {
      setError(container, "Не удалось загрузить матчи. Проверь связи таблиц clubs и matches.");
      console.error(error);
    }
  }

  function renderMatchRow(match) {
    const home = match.home?.name || "Хозяева";
    const away = match.away?.name || "Гости";

    const finished = match.status === "finished";
    const live = match.status === "live";

    const score = `${Number(match.home_score || 0)} : ${Number(match.away_score || 0)}`;

    const statusText = finished
      ? "Завершён"
      : live
        ? "Идёт матч"
        : "Запланирован";

    return `
      <a class="match-row" href="match.html?id=${encodeURIComponent(match.id)}">
        <div class="match-row-date">
          ${escapeHTML(formatDate(match.match_date, { day: "numeric", month: "short" }))}
          <br>
          ${escapeHTML(new Date(match.match_date).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit"
          }))}
        </div>

        <div class="match-row-teams">
          ${escapeHTML(home)}<br>
          ${escapeHTML(away)}
          <span class="match-status ${live ? "live" : ""}">
            ${statusText}
          </span>
        </div>

        <div class="match-row-score">
          ${finished || live ? escapeHTML(score) : "—"}
        </div>
      </a>
    `;
  }

  async function loadMatchday(matches) {
    const container = $("#nextMatch");
    const dateElement = $("#matchdayDate");

    if (!container) return;

    const now = Date.now();

    const next = matches
      .filter(match => {
        if (match.status === "finished") return false;

        const date = new Date(match.match_date).getTime();

        return date >= now || match.status === "live";
      })
      .sort((a, b) => new Date(a.match_date) - new Date(b.match_date))[0];

    // Показываем последний завершённый матч до конца местного дня,
    // если на сегодня больше нет предстоящих игр.
    const today = new Date();

    const todayEnd = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    ).getTime();

    const finishedToday = matches
      .filter(match =>
        match.status === "finished" &&
        new Date(match.match_date).getTime() < todayEnd &&
        new Date(match.match_date).getTime() >=
          new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
      )
      .sort((a, b) => new Date(b.match_date) - new Date(a.match_date))[0];

    const match = next || finishedToday;

    if (!match) {
      if (dateElement) dateElement.textContent = "СКОРО";
      setEmpty(container, "Ближайший матч ещё не опубликован");
      return;
    }

    if (dateElement) {
      dateElement.textContent = match.status === "finished"
        ? "ИТОГ МАТЧА"
        : getMatchDayLabel(match.match_date);
    }

    const finished = match.status === "finished";
    const live = match.status === "live";

    container.innerHTML = `
      <div class="match-card">
        <div class="match-teams">
          <div class="match-team">
            ${imageHTML(match.home?.logo_path, match.home?.name || "Хозяева", "match-team-logo")}
            <span class="match-team-name">
              ${escapeHTML(match.home?.name || "Хозяева")}
            </span>
          </div>

          <div class="${finished || live ? "match-result" : "match-vs"}">
            ${finished || live
              ? `${Number(match.home_score || 0)} : ${Number(match.away_score || 0)}`
              : "VS"}
          </div>

          <div class="match-team">
            ${imageHTML(match.away?.logo_path, match.away?.name || "Гости", "match-team-logo")}
            <span class="match-team-name">
              ${escapeHTML(match.away?.name || "Гости")}
            </span>
          </div>
        </div>

        <p class="match-time">
          ${escapeHTML(formatDateTime(match.match_date))}
          ${live ? " · ИДЁТ МАТЧ" : ""}
        </p>

        <p class="match-venue">
          ${escapeHTML(match.venue || "Место проведения уточняется")}
        </p>

        <a class="match-review" href="match.html?id=${encodeURIComponent(match.id)}">
          ${finished ? "Обзор матча" : live ? "Следить за матчем" : "О матче"}
        </a>
      </div>
    `;
  }

  async function loadLastMatches(matches) {
    const container = $("#lastMatches");
    if (!container) return;

    const last = matches
      .filter(match => match.status === "finished")
      .sort((a, b) => new Date(b.match_date) - new Date(a.match_date))
      .slice(0, 3);

    if (!last.length) {
      setEmpty(container, "Завершённых матчей пока нет");
      return;
    }

    container.innerHTML = last.map(match => `
      <a class="last-match-row" href="match.html?id=${encodeURIComponent(match.id)}">
        <span class="last-match-team">
          ${escapeHTML(match.home?.name || "Хозяева")}
        </span>

        <span class="last-match-score">
          ${Number(match.home_score || 0)} : ${Number(match.away_score || 0)}
        </span>

        <span class="last-match-team">
          ${escapeHTML(match.away?.name || "Гости")}
        </span>
      </a>
    `).join("");
  }

  // ========================================
  // STANDINGS
  // ========================================

  async function loadStandings() {
    const body = $("#standingsBody");
    if (!body) return;

    try {
      const rows = await fetchRows("standings", {
        order: { column: "place", ascending: true }
      });

      if (!rows.length) {
        body.innerHTML = `
          <tr><td colspan="10">Таблица пока не заполнена</td></tr>
        `;
        return;
      }

      body.innerHTML = rows.map(row => `
        <tr>
          <td>${Number(row.place || 0)}</td>
          <td>${escapeHTML(row.team_name)}</td>
          <td>${Number(row.games || 0)}</td>
          <td>${Number(row.wins || 0)}</td>
          <td>${Number(row.overtime_wins || 0)}</td>
          <td>${Number(row.shootout_wins || 0)}</td>
          <td>${Number(row.losses || 0)}</td>
          <td>${Number(row.overtime_losses || 0)}</td>
          <td>${Number(row.shootout_losses || 0)}</td>
          <td><strong>${Number(row.points || 0)}</strong></td>
        </tr>
      `).join("");
    } catch (error) {
      body.innerHTML = `
        <tr><td colspan="10">Не удалось загрузить таблицу</td></tr>
      `;
    }
  }

  // ========================================
  // PLAYER STATS
  // ========================================

  async function loadStats(type = activeStatType) {
    activeStatType = type;

    const container = $("#statsList");
    if (!container) return;

    $$(".stats-tab").forEach(button => {
      const active = button.dataset.statType === type;

      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });

    try {
      const rows = await fetchRows("player_stats", {
        order: {
          column: "value",
          ascending: type === "plus_minus"
        },
        filters: [
          { column: "stat_type", operator: "eq", value: type }
        ],
        limit: 30
      });

      if (!rows.length) {
        setEmpty(container, "Статистика пока не заполнена");
        return;
      }

      // Для плюс/минус положительные значения выше отрицательных.
      if (type === "plus_minus") {
        rows.sort((a, b) => Number(b.value) - Number(a.value));
      }

      container.innerHTML = rows.map((player, index) => `
        <div class="stat-row">
          <span class="stat-rank">
            ${String(index + 1).padStart(2, "0")}
          </span>

          <div>
            <div class="stat-player-name">
              ${escapeHTML(player.player_name)}
            </div>

            <span class="stat-player-meta">
              № ${Number(player.player_number || 0)}
              ${player.position ? ` · ${escapeHTML(player.position)}` : ""}
            </span>
          </div>

          <span class="stat-value">
            ${type === "plus_minus" && Number(player.value) > 0 ? "+" : ""}
            ${escapeHTML(player.value)}
          </span>
        </div>
      `).join("");
    } catch (error) {
      setError(container, "Не удалось загрузить статистику");
    }
  }

  $("#statsTabs")?.addEventListener("click", event => {
    const button = event.target.closest("[data-stat-type]");
    if (!button) return;

    loadStats(button.dataset.statType);
  });

  // ========================================
  // TEAM LEADERS
  // ========================================

  const leaderLabels = {
    scorer: "Лучший бомбардир",
    sniper: "Лучший снайпер",
    defender: "Лучший защитник-бомбардир",
    plus_minus: "Плюс/минус"
  };

  async function loadLeaders() {
    const container = $("#leadersList");
    if (!container) return;

    try {
      const rows = await fetchRows("team_leaders");

      if (!rows.length) {
        setEmpty(container, "Лидеры команды пока не добавлены");
        return;
      }

      const order = ["scorer", "sniper", "defender", "plus_minus"];

      rows.sort((a, b) =>
        order.indexOf(a.leader_type) - order.indexOf(b.leader_type)
      );

      container.innerHTML = rows.map(leader => `
        <article class="leader-card">
          <span class="leader-number">
            ${Number(leader.player_number || 0)}
          </span>

          ${imageHTML(
            leader.image_path,
            leader.player_name || "Игрок команды",
            "leader-image"
          )}

          <div class="leader-info">
            <span class="leader-type">
              ${escapeHTML(leaderLabels[leader.leader_type] || "Лидер команды")}
            </span>

            <h3 class="leader-name">
              ${escapeHTML(leader.player_name || "Игрок не выбран")}
            </h3>

            <p class="leader-position">
              ${escapeHTML(leader.position || "")}
            </p>

            <div class="leader-stat">
              ${escapeHTML(leader.statistic || "—")}
            </div>
          </div>
        </article>
      `).join("");
    } catch (error) {
      setError(container, "Не удалось загрузить лидеров");
    }
  }

  // ========================================
  // ALBUMS
  // ========================================

  async function loadAlbums() {
    const container = $("#albumsList");
    if (!container) return;

    try {
      const albums = await fetchRows("albums", {
        order: { column: "album_date", ascending: false },
        limit: 30
      });

      if (!albums.length) {
        setEmpty(container, "Фотоальбомы пока не опубликованы");
        return;
      }

      container.innerHTML = albums.map(album => `
        <a class="album-card" href="album.html?id=${encodeURIComponent(album.id)}">
          <div class="album-cover-wrap">
            ${imageHTML(album.cover_path, album.title, "album-cover")}
          </div>

          <p class="album-date">
            ${escapeHTML(formatDate(album.album_date))}
          </p>

          <h3 class="album-title">
            ${escapeHTML(album.title)}
          </h3>
        </a>
      `).join("");
    } catch (error) {
      setError(container, "Не удалось загрузить фотоальбомы");
    }
  }

  // ========================================
  // MENU
  // ========================================

  const menuButton = $("#menuButton");
  const mobileMenu = $("#mobileMenu");
  const menuClose = $("#menuClose");

  function openMenu() {
    if (!mobileMenu) return;

    mobileMenu.classList.add("open");
    mobileMenu.setAttribute("aria-hidden", "false");
    menuButton?.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
  }

  function closeMenu() {
    if (!mobileMenu) return;

    mobileMenu.classList.remove("open");
    mobileMenu.setAttribute("aria-hidden", "true");
    menuButton?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  }

  menuButton?.addEventListener("click", () => {
    mobileMenu?.classList.contains("open") ? closeMenu() : openMenu();
  });

  menuClose?.addEventListener("click", closeMenu);

  mobileMenu?.addEventListener("click", event => {
    if (event.target === mobileMenu) closeMenu();
  });

  $$(".mobile-menu-panel a").forEach(link => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeMenu();
      closeStory();
      closeContentViewer();
    }
  });

  // ========================================
  // FOOTER
  // ========================================

  const footerYear = $("#footerYear");

  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }

  // ========================================
  // CONTENT VIEWER
  // ========================================

  function closeContentViewer() {
    const viewer = $("#contentViewer");
    const body = $("#contentViewerBody");

    if (viewer) {
      viewer.classList.remove("open");
      viewer.setAttribute("aria-hidden", "true");
    }

    if (body) body.innerHTML = "";

    document.body.classList.remove("viewer-open");
  }

  $("#contentViewerClose")?.addEventListener("click", closeContentViewer);

  // ========================================
  // STARTUP
  // ========================================

  async function startApp() {
    await Promise.all([
      loadSettings(),
      loadNews(),
      loadStories(),
      loadStandings(),
      loadStats("scorers"),
      loadLeaders(),
      loadAlbums(),
      loadMatches()
    ]);

    console.info("Публичная страница ХК Челны 2011 загружена");
  }

  startApp();
})();
