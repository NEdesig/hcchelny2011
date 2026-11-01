

/* =========================================================
   ХК ЧЕЛНЫ 2011 — MATCH.JS
   File: js/match.js
   Supabase: matches, clubs, match_goals,
             match_penalties, match_roster, site_settings
========================================================= */

(() => {
  "use strict";

  const db = window.supabaseClient;
  const BUCKET = window.STORAGE_BUCKET || "site-media";

  const $ = (selector) => document.querySelector(selector);

  if (!db) {
    console.error("Supabase не подключён. Проверь js/config.js");
    return;
  }

  // ---------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------

  function esc(value) {
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

    return db.storage
      .from(BUCKET)
      .getPublicUrl(path).data?.publicUrl || "";
  }

  function formatDate(value) {
    if (!value) return "Дата не указана";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Дата не указана";
    }

    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function statusName(status) {
    const statuses = {
      planned: "Матч не начался",
      scheduled: "Матч не начался",
      upcoming: "Матч не начался",
      live: "Матч идёт",
      in_progress: "Матч идёт",
      finished: "Матч завершён",
      completed: "Матч завершён",
      postponed: "Матч перенесён",
      cancelled: "Матч отменён"
    };

    return statuses[status] || status || "Статус не указан";
  }

  function timeValue(value) {
    const match = String(value || "").match(/(\d+):(\d+)/);

    if (!match) return 0;

    return Number(match[1]) * 60 + Number(match[2]);
  }

  function publicImage(path, alt, className = "") {
    const url = imageURL(path);

    if (!url) return "";

    return `
      <img
        src="${esc(url)}"
        alt="${esc(alt)}"
        class="${esc(className)}"
      >
    `;
  }

  // ---------------------------------------------------------
  // SETTINGS
  // ---------------------------------------------------------

  async function loadSettings() {
    const { data, error } = await db
      .from("site_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      console.warn("Настройки сайта:", error);
      return;
    }

    const settings = data?.[0];
    if (!settings) return;

    const name = settings.team_name || "Челны 2011";
    const subtitle = settings.subtitle || "хоккейный клуб";
    const city = settings.city || "Набережные Челны";

    const css = document.documentElement.style;

    if (settings.primary_color) {
      css.setProperty("--primary", settings.primary_color);
    }

    if (settings.accent_color) {
      css.setProperty("--accent", settings.accent_color);
    }

    if (settings.gold_color) {
      css.setProperty("--gold", settings.gold_color);
    }

    if (settings.white_color) {
      css.setProperty("--white", settings.white_color);
    }

    ["teamName", "footerTeamName"].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = name;
    });

    const subtitleElement = document.getElementById("teamSubtitle");
    if (subtitleElement) subtitleElement.textContent = subtitle;

    const cityElement = document.getElementById("footerCity");
    if (cityElement) cityElement.textContent = city;

    ["teamLogo", "footerLogo"].forEach(id => {
      const element = document.getElementById(id);
      if (!element) return;

      const url = imageURL(settings.logo_path);

      if (url) {
        element.src = url;
        element.hidden = false;
      } else {
        element.hidden = true;
      }
    });
  }

  // ---------------------------------------------------------
  // PAGE CONTENT
  // ---------------------------------------------------------

  function renderLayout() {
    const main = $(".match-page");
    if (!main) return null;

    let content = document.getElementById("matchContent");

    if (!content) {
      content = document.createElement("div");
      content.id = "matchContent";
      main.appendChild(content);
    }

    return content;
  }

  function renderLoading() {
    const root = renderLayout();

    if (root) {
      root.innerHTML = `
        <div class="match-loading">
          Загружаем информацию о матче...
        </div>
      `;
    }

    return root;
  }

  function renderError(message) {
    const root = document.getElementById("matchContent");

    if (root) {
      root.innerHTML = `
        <div class="match-error">
          ${esc(message)}
        </div>
      `;
    }
  }

  // ---------------------------------------------------------
  // MATCH
  // ---------------------------------------------------------

  async function loadMatch() {
    const root = renderLoading();

    if (!root) {
      console.error("Не найден элемент .match-page в match.html");
      return;
    }

    const matchId = new URLSearchParams(
      window.location.search
    ).get("id");

    if (!matchId) {
      renderError("Матч не указан. Откройте страницу из списка матчей.");
      return;
    }

    const { data: match, error } = await db
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .maybeSingle();

    if (error) {
      console.error("Ошибка загрузки матча:", error);
      renderError("Не удалось загрузить матч.");
      return;
    }

    if (!match) {
      renderError("Матч не найден.");
      return;
    }

    // Клубы загружаются отдельным запросом,
    // чтобы не зависеть от названий FK в Supabase.

    const clubIds = [
      match.home_club_id,
      match.away_club_id
    ].filter(Boolean);

    const { data: clubs, error: clubsError } = await db
      .from("clubs")
      .select("*")
      .in("id", clubIds);

    if (clubsError) {
      console.error("Ошибка загрузки клубов:", clubsError);
    }

    const clubMap = {};

    (clubs || []).forEach(club => {
      clubMap[club.id] = club;
    });

    const home = clubMap[match.home_club_id] || {};
    const away = clubMap[match.away_club_id] || {};

    const homeName = home.name || "Хозяева";
    const awayName = away.name || "Гости";

    document.title = `${homeName} — ${awayName} | ХК Челны 2011`;

    const scoreAvailable =
      match.home_score !== null &&
      match.home_score !== undefined &&
      match.away_score !== null &&
      match.away_score !== undefined;

    const score = scoreAvailable
      ? `${esc(match.home_score)} : ${esc(match.away_score)}`
      : "— : —";

    root.innerHTML = `
      <section class="match-hero">

        <div class="match-competition">
          ${esc(match.competition || "Хоккейный матч")}
        </div>

        <div class="match-main">

          <div class="match-club">
            ${publicImage(home.logo_path, homeName, "match-club-logo")}
            <div class="match-club-name">
              ${esc(homeName)}
            </div>
          </div>

          <div class="match-score">
            ${score}
          </div>

          <div class="match-club">
            ${publicImage(away.logo_path, awayName, "match-club-logo")}
            <div class="match-club-name">
              ${esc(awayName)}
            </div>
          </div>

        </div>

        <div class="match-status ${match.status === "live" ? "live" : ""}">
          ${esc(statusName(match.status))}
        </div>

        <div class="match-meta">
          <span>${esc(formatDate(match.match_date))}</span>
          <span>${esc(match.venue || "Место проведения не указано")}</span>
        </div>

      </section>

      <section class="match-section">
        <h2 class="match-section-title">События матча</h2>
        <div class="match-events" id="matchEvents">
          <div class="match-loading">Загрузка событий...</div>
        </div>
      </section>

      <section class="match-section">
        <h2 class="match-section-title">Составы команд</h2>

        <div class="match-rosters">

          <div class="match-roster">
            <h3>${esc(homeName)}</h3>
            <div id="homeRoster">
              <div class="match-loading">Загрузка состава...</div>
            </div>
          </div>

          <div class="match-roster">
            <h3>${esc(awayName)}</h3>
            <div id="awayRoster">
              <div class="match-loading">Загрузка состава...</div>
            </div>
          </div>

        </div>
      </section>
    `;

    await Promise.all([
      loadEvents(match.id),
      loadRoster(match.id)
    ]);
  }

  // ---------------------------------------------------------
  // EVENTS: GOALS + PENALTIES
  // ---------------------------------------------------------

  async function loadEvents(matchId) {
    const container = document.getElementById("matchEvents");

    const [goalsResult, penaltiesResult] = await Promise.all([
      db.from("match_goals")
        .select("*")
        .eq("match_id", matchId),

      db.from("match_penalties")
        .select("*")
        .eq("match_id", matchId)
    ]);

    if (goalsResult.error || penaltiesResult.error) {
      console.error(
        "Ошибка загрузки событий:",
        goalsResult.error || penaltiesResult.error
      );

      container.innerHTML = `
        <div class="match-error">
          Не удалось загрузить события матча.
        </div>
      `;
      return;
    }

    const goals = (goalsResult.data || []).map(item => ({
      type: "goal",
      time: item.goal_time,
      side: item.team_side,
      number: item.player_number,
      player: item.player_name,
      detail: item.strength
    }));

    const penalties = (penaltiesResult.data || []).map(item => ({
      type: "penalty",
      time: item.penalty_time,
      side: item.team_side,
      number: item.player_number,
      player: item.player_name,
      detail: item.reason,
      minutes: item.minutes
    }));

    const events = [...goals, ...penalties];

    events.sort((a, b) => timeValue(a.time) - timeValue(b.time));

    if (!events.length) {
      container.innerHTML = `
        <div class="match-empty">
          События матча пока не добавлены.
        </div>
      `;
      return;
    }

    container.innerHTML = events.map(event => {
      const isGoal = event.type === "goal";

      const title = isGoal ? "ГОЛ" : "УДАЛЕНИЕ";

      const detail = isGoal
        ? event.detail
        : [
            event.detail,
            event.minutes ? `${event.minutes} мин.` : ""
          ].filter(Boolean).join(" · ");

      return `
        <div class="match-event">

          <div class="match-event-time">
            ${esc(event.time || "—")}
          </div>

          <div class="match-event-info">

            <div class="match-event-player">
              ${isGoal ? "🏒" : "⏱️"}
              ${esc(title)} —
              ${esc(event.player || "Игрок не указан")}
              ${event.number !== null && event.number !== undefined
                ? ` · №${esc(event.number)}`
                : ""}
            </div>

            <div class="match-event-description">
              ${esc(detail || "")}
            </div>

            <div class="match-event-description">
              ${event.side === "home" ? "Хозяева" :
                event.side === "away" ? "Гости" : ""}
            </div>

          </div>

        </div>
      `;
    }).join("");
  }

  // ---------------------------------------------------------
  // ROSTERS
  // ---------------------------------------------------------

  async function loadRoster(matchId) {
    const { data, error } = await db
      .from("match_roster")
      .select("*")
      .eq("match_id", matchId)
      .order("player_number", { ascending: true });

    if (error) {
      console.error("Ошибка загрузки составов:", error);

      $("#homeRoster").innerHTML =
        '<div class="match-error">Не удалось загрузить состав.</div>';

      $("#awayRoster").innerHTML =
        '<div class="match-error">Не удалось загрузить состав.</div>';

      return;
    }

    const players = data || [];

    function renderTeam(side, selector) {
      const teamPlayers = players.filter(
        player => player.team_side === side
      );

      const container = $(selector);

      if (!teamPlayers.length) {
        container.innerHTML = `
          <div class="match-empty">
            Состав пока не опубликован.
          </div>
        `;
        return;
      }

      container.innerHTML = teamPlayers.map(player => `
        <div class="roster-player">

          <span class="roster-number">
            ${player.player_number !== null &&
              player.player_number !== undefined
              ? `#${esc(player.player_number)}`
              : "—"}
          </span>

          <span>
            ${esc(player.player_name)}
          </span>

          <span class="roster-position">
            ${esc(player.position || "")}
          </span>

        </div>
      `).join("");
    }

    renderTeam("home", "#homeRoster");
    renderTeam("away", "#awayRoster");
  }

  // ---------------------------------------------------------
  // INIT
  // ---------------------------------------------------------

  async function init() {
    const year = document.getElementById("footerYear");

    if (year) {
      year.textContent = new Date().getFullYear();
    }

    await Promise.allSettled([
      loadSettings(),
      loadMatch()
    ]);
  }

  init();

})();
