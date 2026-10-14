
(() => {
  "use strict";

  const db = window.supabaseClient;
  const BUCKET = window.STORAGE_BUCKET || "site-media";
  const root = document.getElementById("matchContent");

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
    return db.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl || "";
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  async function loadSettings() {
    const { data, error } = await db
      .from("site_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error || !data?.length) return;

    const settings = data[0];
    const css = document.documentElement.style;

    if (settings.primary_color) css.setProperty("--primary", settings.primary_color);
    if (settings.accent_color) css.setProperty("--accent", settings.accent_color);
    if (settings.gold_color) css.setProperty("--gold", settings.gold_color);
    if (settings.white_color) css.setProperty("--white", settings.white_color);

    setText("teamName", settings.team_name || "Челны 2011");
    setText("teamSubtitle", settings.subtitle || "хоккейный клуб");
    setText("footerTeamName", settings.team_name || "Челны 2011");
    setText("footerCity", settings.city || "Набережные Челны");

    const logo = imageURL(settings.logo_path);
    ["teamLogo", "footerLogo"].forEach(id => {
      const img = document.getElementById(id);
      if (!img) return;
      if (logo) {
        img.src = logo;
        img.hidden = false;
      } else {
        img.hidden = true;
      }
    });
  }

  function clubName(club) {
    return club?.name || "Команда";
  }

  function clubLogo(club) {
    const url = imageURL(club?.logo_path);
    return url || "";
  }

  function clubMarkup(club) {
    const name = clubName(club);
    const logo = clubLogo(club);

    return `
      <div class="match-club">
        ${logo ? `<img src="${esc(logo)}" alt="${esc(name)}">` : ""}
        <div class="match-club-name">${esc(name)}</div>
      </div>
    `;
  }

  function displayTeam(team, fallback) {
    return team || fallback || "Команда";
  }

  async function loadMatch() {
    const id = new URLSearchParams(window.location.search).get("id");

    if (!id) {
      root.innerHTML = '<div class="match-page-state">Не указан матч.</div>';
      return;
    }

    const { data: match, error } = await db
      .from("matches")
      .select(`
        *,
        home:clubs!matches_home_club_id_fkey(id,name,city,logo_path),
        away:clubs!matches_away_club_id_fkey(id,name,city,logo_path)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Ошибка загрузки матча:", error);
      root.innerHTML = '<div class="match-page-state">Не удалось загрузить матч.</div>';
      return;
    }

    if (!match) {
      root.innerHTML = '<div class="match-page-state">Матч не найден.</div>';
      return;
    }

    const home = match.home || {};
    const away = match.away || {};
    const statusNames = {
      scheduled: "Матч не начался",
      upcoming: "Матч не начался",
      live: "Матч идёт",
      in_progress: "Матч идёт",
      finished: "Матч завершён",
      completed: "Матч завершён",
      postponed: "Матч перенесён",
      cancelled: "Матч отменён"
    };

    document.title =
      `${clubName(home)} — ${clubName(away)} | ХК Челны 2011`;

    const scoreAvailable =
      match.home_score !== null &&
      match.home_score !== undefined &&
      match.away_score !== null &&
      match.away_score !== undefined;

    const score = scoreAvailable
      ? `<div class="match-score">
           <span>${esc(match.home_score)}</span>
           <span class="match-score-separator">:</span>
           <span>${esc(match.away_score)}</span>
         </div>`
      : `<div class="match-score"><span>—</span><span>:</span><span>—</span></div>`;

    root.innerHTML = `
      <section class="match-hero">
        ${match.competition
          ? `<div class="match-competition">${esc(match.competition)}</div>`
          : ""}
        <div class="match-scoreboard">
          ${clubMarkup(home)}
          ${score}
          ${clubMarkup(away)}
        </div>
        <div class="match-status">
          ${esc(statusNames[match.status] || match.status || "Статус не указан")}
        </div>
        <div class="match-meta">
          ${match.match_date ? `<div>${esc(formatDate(match.match_date))}</div>` : ""}
          ${match.venue ? `<div>${esc(match.venue)}</div>` : ""}
        </div>
      </section>

      <section class="match-details">
        <div class="match-detail-card">
          <h2>Голы</h2>
          <div id="matchGoals">
            <div class="match-page-state">Загрузка голов…</div>
          </div>
        </div>

        <div class="match-detail-card">
          <h2>Штрафы</h2>
          <div id="matchPenalties">
            <div class="match-page-state">Загрузка штрафов…</div>
          </div>
        </div>

        <div class="match-detail-card">
          <h2>Составы команд</h2>
          <div id="matchRosters">
            <div class="match-page-state">Загрузка составов…</div>
          </div>
        </div>
      </section>
    `;

    await Promise.all([
      loadGoals(match.id),
      loadPenalties(match.id),
      loadRoster(match.id, home, away)
    ]);
  }

  async function loadGoals(matchId) {
    const container = document.getElementById("matchGoals");

    const { data, error } = await db
      .from("match_goals")
      .select("*")
      .eq("match_id", matchId)
      .order("minute", { ascending: true });

    if (error) {
      console.error("Ошибка загрузки голов:", error);
      container.innerHTML = '<div class="match-page-state">Не удалось загрузить голы.</div>';
      return;
    }

    if (!data?.length) {
      container.innerHTML = '<div class="match-page-state">Информация о голах пока не добавлена.</div>';
      return;
    }

    container.innerHTML = data.map(goal => `
      <div class="match-event">
        <div class="match-event-time">${esc(goal.minute ?? "—")}'</div>
        <div class="match-event-description">
          <strong>${esc(goal.player_name || "Автор не указан")}</strong>
          ${goal.player_number !== null && goal.player_number !== undefined
            ? `<span> · №${esc(goal.player_number)}</span>`
            : ""}
          ${goal.strength ? `<div>${esc(goal.strength)}</div>` : ""}
        </div>
        <div class="match-event-team">${esc(goal.team || "")}</div>
      </div>
    `).join("");
  }

  async function loadPenalties(matchId) {
    const container = document.getElementById("matchPenalties");

    const { data, error } = await db
      .from("match_penalties")
      .select("*")
      .eq("match_id", matchId)
      .order("penalty_time", { ascending: true });

    if (error) {
      console.error("Ошибка загрузки штрафов:", error);
      container.innerHTML = '<div class="match-page-state">Не удалось загрузить штрафы.</div>';
      return;
    }

    if (!data?.length) {
      container.innerHTML = '<div class="match-page-state">Информация об удалениях пока не добавлена.</div>';
      return;
    }

    container.innerHTML = data.map(penalty => `
      <div class="match-event">
        <div class="match-event-time">${esc(penalty.penalty_time ?? "—")}'</div>
        <div class="match-event-description">
          <strong>${esc(penalty.player_name || "Игрок не указан")}</strong>
          ${penalty.player_number !== null && penalty.player_number !== undefined
            ? `<span> · №${esc(penalty.player_number)}</span>`
            : ""}
          <div>
            ${esc(penalty.reason || "Причина не указана")}
            ${penalty.minutes ? ` · ${esc(penalty.minutes)} мин.` : ""}
          </div>
        </div>
        <div class="match-event-team">${esc(penalty.team || "")}</div>
      </div>
    `).join("");
  }

  async function loadRoster(matchId, home, away) {
    const container = document.getElementById("matchRosters");

    const { data, error } = await db
      .from("match_roster")
      .select("*")
      .eq("match_id", matchId)
      .order("player_number", { ascending: true });

    if (error) {
      console.error("Ошибка загрузки составов:", error);
      container.innerHTML = '<div class="match-page-state">Не удалось загрузить составы.</div>';
      return;
    }

    if (!data?.length) {
      container.innerHTML = '<div class="match-page-state">Составы пока не опубликованы.</div>';
      return;
    }

    const homeName = displayTeam(home.name, "Хозяева");
    const awayName = displayTeam(away.name, "Гости");

    const homePlayers = data.filter(player =>
      ["home", homeName].includes(player.team)
    );

    const awayPlayers = data.filter(player =>
      ["away", awayName].includes(player.team)
    );

    function rosterMarkup(title, players) {
      return `
        <div>
          <div class="match-roster-title">${esc(title)}</div>
          ${players.length ? players.map(player => `
            <div class="match-player">
              <div class="match-player-number">
                ${player.player_number !== null && player.player_number !== undefined
                  ? `#${esc(player.player_number)}`
                  : "—"}
              </div>
              <div>${esc(player.player_name || "Игрок")}
                ${player.position
                  ? `<div class="match-player-position">${esc(player.position)}</div>`
                  : ""}
              </div>
            </div>
          `).join("") : '<div class="match-page-state">Состав не опубликован.</div>'}
        </div>
      `;
    }

    container.innerHTML = `
      <div class="match-roster-grid">
        ${rosterMarkup(homeName, homePlayers)}
        ${rosterMarkup(awayName, awayPlayers)}
      </div>
    `;
  }

  async function init() {
    if (!db) {
      root.innerHTML = '<div class="match-page-state">Нет подключения к базе данных. Проверь js/config.js.</div>';
      return;
    }

    await Promise.allSettled([loadSettings(), loadMatch()]);
  }

  init();
})();
