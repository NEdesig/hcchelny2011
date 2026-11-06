
(() => {
  "use strict";

  const db = window.supabaseClient;
  const BUCKET = window.STORAGE_BUCKET || "site-media";
  const root = document.getElementById("matchContent");

  const VOTER_KEY = "hcchelny_match_voter_token";

  // =========================================
  // ОСНОВНЫЕ ФУНКЦИИ
  // =========================================

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

  function clubName(club) {
    return club?.name || "Команда";
  }

  function clubLogo(club) {
    return imageURL(club?.logo_path);
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

  function teamLabel(side, homeName, awayName) {
    if (side === "home") return homeName;
    if (side === "away") return awayName;
    return side || "";
  }

  // =========================================
  // НАСТРОЙКИ САЙТА
  // =========================================

  async function loadSettings() {
    const { data, error } = await db
      .from("site_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error || !data?.length) return;

    const settings = data[0];
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

  // =========================================
  // ИДЕНТИФИКАТОР УСТРОЙСТВА
  // =========================================

  function createUUID() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    if (window.crypto?.getRandomValues) {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);

      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      const hex = Array.from(bytes, b =>
        b.toString(16).padStart(2, "0")
      ).join("");

      return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20)
      ].join("-");
    }

    throw new Error("Браузер не поддерживает генерацию UUID.");
  }

  function getVoterToken() {
    try {
      let token = localStorage.getItem(VOTER_KEY);

      if (!token) {
        token = createUUID();
        localStorage.setItem(VOTER_KEY, token);
      }

      return token;
    } catch (error) {
      console.warn("Ошибка сохранения токена:", error);

      if (!window.matchWinnerTemporaryToken) {
        window.matchWinnerTemporaryToken = createUUID();
      }

      return window.matchWinnerTemporaryToken;
    }
  }

  // =========================================
  // СТИЛИ ГОЛОСОВАНИЯ
  // =========================================

  function injectPollStyles() {
    if (document.getElementById("matchWinnerPollStyles")) return;

    const style = document.createElement("style");
    style.id = "matchWinnerPollStyles";

    style.textContent = `
      .winner-poll {
        margin: 26px 0 34px;
        padding: 24px 20px;
        border-radius: 12px;
        background: #101522;
        color: #fff;
        text-align: center;
      }

      .winner-poll-title {
        margin: 0 0 8px;
        font-size: clamp(24px, 5vw, 34px);
        line-height: 1.15;
        font-weight: 900;
        text-transform: uppercase;
      }

      .winner-poll-subtitle {
        margin: 0 0 22px;
        font-size: 16px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .winner-poll-teams {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .winner-poll-team {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        min-width: 0;
        padding: 15px 10px;
        border: 2px solid transparent;
        border-radius: 9px;
        background: #202b3b;
        color: white;
        font: inherit;
        cursor: pointer;
        transition: .2s ease;
      }

      .winner-poll-team:hover:not(:disabled) {
        border-color: #32c9ed;
        transform: translateY(-2px);
      }

      .winner-poll-team:disabled {
        cursor: default;
        opacity: .8;
      }

      .winner-poll-team img {
        width: 65px;
        height: 65px;
        object-fit: contain;
      }

      .winner-poll-team span {
        font-size: 15px;
        font-weight: 800;
        overflow-wrap: anywhere;
      }

      .winner-poll-team.selected {
        border-color: #32c9ed;
        background: #183b4c;
      }

      .winner-poll-results {
        margin-top: 22px;
      }

      .winner-poll-bar {
        display: grid;
        grid-template-columns: 1fr 1fr;
        min-height: 76px;
        border: 3px solid #a2b0b4;
        overflow: hidden;
      }

      .winner-poll-result {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px 6px;
        font-size: clamp(22px, 5vw, 34px);
        font-weight: 900;
        background: #151a25;
      }

      .winner-poll-result:first-child {
        border-right: 2px solid #a2b0b4;
      }

      .winner-poll-result.leading {
        background: #91a1a5;
        color: white;
      }

      .winner-poll-total {
        margin-top: 14px;
        font-size: 15px;
        font-weight: 800;
      }

      .winner-poll-message {
        min-height: 22px;
        margin-top: 14px;
        font-size: 14px;
        font-weight: 700;
        overflow-wrap: anywhere;
      }

      .winner-poll-closed {
        margin-top: 18px;
        color: #aab8c5;
        font-size: 14px;
        font-weight: 800;
      }

      .winner-poll-error {
        color: #ff8585;
      }

      @media (max-width: 480px) {
        .winner-poll {
          padding: 22px 12px;
        }

        .winner-poll-team {
          padding: 12px 6px;
        }

        .winner-poll-team img {
          width: 50px;
          height: 50px;
        }

        .winner-poll-team span {
          font-size: 13px;
        }

        .winner-poll-bar {
          min-height: 62px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // =========================================
  // СОСТОЯНИЕ ГОЛОСОВАНИЯ
  // =========================================

  function isPollEligible(match) {
    if (
      match.status === "live" ||
      match.status === "in_progress"
    ) {
      return true;
    }

    if (
      match.status === "scheduled" ||
      match.status === "upcoming"
    ) {
      return match.match_date &&
        new Date(match.match_date).getTime() > Date.now();
    }

    return false;
  }

  function pollMarkup(home, away, closed = false) {
    injectPollStyles();

    const homeName = clubName(home);
    const awayName = clubName(away);

    const homeLogo = clubLogo(home);
    const awayLogo = clubLogo(away);

    return `
      <section class="winner-poll" id="winnerPoll">

        <h2 class="winner-poll-title">Кто победит?</h2>

        <div class="winner-poll-subtitle">
          ${closed
            ? "Итоги голосования"
            : "Проголосуйте за свой клуб"
          }
        </div>

        <div class="winner-poll-teams" id="winnerPollButtons">

          <button
            class="winner-poll-team"
            type="button"
            data-side="home"
            ${closed ? "disabled" : ""}
          >
            ${homeLogo
              ? `<img src="${esc(homeLogo)}" alt="">`
              : ""
            }
            <span>${esc(homeName)}</span>
          </button>

          <button
            class="winner-poll-team"
            type="button"
            data-side="away"
            ${closed ? "disabled" : ""}
          >
            ${awayLogo
              ? `<img src="${esc(awayLogo)}" alt="">`
              : ""
            }
            <span>${esc(awayName)}</span>
          </button>

        </div>

        <div class="winner-poll-results" id="winnerPollResults" hidden>

          <div class="winner-poll-bar">

            <div class="winner-poll-result" id="winnerPollHome">
              0%
            </div>

            <div class="winner-poll-result" id="winnerPollAway">
              0%
            </div>

          </div>

          <div class="winner-poll-total" id="winnerPollTotal">
            Всего проголосовало: 0
          </div>

        </div>

        <div class="winner-poll-message" id="winnerPollMessage"></div>

        <div class="winner-poll-closed" id="winnerPollClosed" hidden>
          Голосование завершено. Результаты зафиксированы.
        </div>

      </section>
    `;
  }

  // =========================================
  // ПОЛУЧЕНИЕ РЕЗУЛЬТАТОВ
  // =========================================

  async function getPollData(matchId) {
    const response = await db.rpc(
      "get_match_winner_poll",
      { p_match_id: matchId }
    );

    if (response.error) {
      console.error("Ошибка получения голосования:", {
        message: response.error.message,
        details: response.error.details,
        hint: response.error.hint,
        code: response.error.code
      });

      throw response.error;
    }

    return response.data;
  }

  function renderWinnerPollResults(result) {
    const homeVotes = Number(result.home_votes || 0);
    const awayVotes = Number(result.away_votes || 0);
    const total = Number(result.total_votes || 0);

    const homePercent = total
      ? Math.round(homeVotes / total * 100)
      : 0;

    const awayPercent = total
      ? 100 - homePercent
      : 0;

    const results = document.getElementById("winnerPollResults");
    const homeElement = document.getElementById("winnerPollHome");
    const awayElement = document.getElementById("winnerPollAway");
    const totalElement = document.getElementById("winnerPollTotal");

    if (!results || !homeElement || !awayElement || !totalElement) {
      return;
    }

    results.hidden = false;

    homeElement.textContent = `${homePercent}%`;
    awayElement.textContent = `${awayPercent}%`;

    homeElement.classList.toggle(
      "leading",
      total > 0 && homeVotes > awayVotes
    );

    awayElement.classList.toggle(
      "leading",
      total > 0 && awayVotes > homeVotes
    );

    totalElement.textContent =
      `Всего проголосовало: ${total}`;
  }

  // =========================================
  // ОБНОВЛЕНИЕ РЕЗУЛЬТАТОВ
  // =========================================

  async function refreshWinnerPoll(matchId) {
    try {
      const data = await getPollData(matchId);

      if (!data?.length) return;

      renderWinnerPollResults(data[0]);

      if (data[0].is_closed === true) {
        const closed = document.getElementById("winnerPollClosed");
        const buttons = document.querySelectorAll(
          "#winnerPollButtons button"
        );

        if (closed) closed.hidden = false;

        buttons.forEach(button => {
          button.disabled = true;
        });
      }
    } catch (error) {
      console.error("Не удалось обновить результаты:", error);
    }
  }

  // =========================================
  // ОТПРАВКА ГОЛОСА
  // =========================================

  async function submitWinnerVote(matchId, side, token, buttons) {
    const message = document.getElementById("winnerPollMessage");

    buttons.forEach(button => {
      button.disabled = true;
    });

    message.classList.remove("winner-poll-error");
    message.textContent = "Сохраняем ваш голос…";

    try {
      const { data, error } = await db.rpc(
        "cast_match_winner_vote",
        {
          p_match_id: matchId,
          p_team_side: side,
          p_voter_token: token
        }
      );

      if (error) {
        console.error("ОШИБКА ОТПРАВКИ ГОЛОСА:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });

        message.classList.add("winner-poll-error");

        message.textContent =
          "Ошибка Supabase: " +
          (error.message || "неизвестная ошибка") +
          (error.code ? ` (код: ${error.code})` : "");

        buttons.forEach(button => {
          button.disabled = false;
        });

        return;
      }

      if (!data?.success) {
        message.classList.add("winner-poll-error");
        message.textContent =
          data?.message || "Голос не был принят.";

        // Повторно проверяем состояние голосования
        await refreshWinnerPoll(matchId);

        const closed = document.getElementById("winnerPollClosed");

        if (!closed || closed.hidden) {
          buttons.forEach(button => {
            button.disabled = false;
          });
        }

        return;
      }

      message.textContent = "Ваш голос учтён!";

      buttons.forEach(button => {
        if (button.dataset.side === side) {
          button.classList.add("selected");
        }
      });

      // Обновляем проценты
      await refreshWinnerPoll(matchId);

    } catch (error) {
      console.error("Критическая ошибка голосования:", error);

      message.classList.add("winner-poll-error");
      message.textContent =
        "Ошибка: " + (error?.message || String(error));

      buttons.forEach(button => {
        button.disabled = false;
      });
    }
  }

  // =========================================
  // ЗАГРУЗКА ГОЛОСОВАНИЯ
  // =========================================

  async function loadWinnerPoll(match, home, away) {
    const eligible = isPollEligible(match);
    const finished = ["finished", "completed"].includes(match.status);

    if (!eligible && !finished) return;

    const pollContainer = document.getElementById("winnerPollContainer");
    if (!pollContainer) return;

    try {
      const data = await getPollData(match.id);

      if (!data?.length) return;

      const result = data[0];
      const closed = result.is_closed === true || finished;

      pollContainer.innerHTML = pollMarkup(
        home,
        away,
        closed
      );

      renderWinnerPollResults(result);

      if (closed) {
        const closedMessage = document.getElementById("winnerPollClosed");
        if (closedMessage) closedMessage.hidden = false;
        return;
      }

      const token = getVoterToken();

      const buttons = Array.from(
        document.querySelectorAll("#winnerPollButtons button")
      );

      buttons.forEach(button => {
        button.addEventListener("click", () => {
          submitWinnerVote(
            match.id,
            button.dataset.side,
            token,
            buttons
          );
        });
      });

    } catch (error) {
      console.error("Ошибка загрузки голосования:", error);

      pollContainer.innerHTML = `
        <section class="winner-poll">
          <div class="winner-poll-title">Голосование</div>
          <div class="winner-poll-message winner-poll-error">
            Не удалось загрузить голосование:
            ${esc(error?.message || "ошибка базы данных")}
          </div>
        </section>
      `;
    }
  }

  // =========================================
  // ЗАГРУЗКА МАТЧА
  // =========================================

  async function loadMatch() {
    const id = new URLSearchParams(window.location.search).get("id");

    if (!id) {
      root.innerHTML =
        '<div class="match-page-state">Не указан матч.</div>';
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

      root.innerHTML =
        '<div class="match-page-state">Не удалось загрузить матч.</div>';

      return;
    }

    if (!match) {
      root.innerHTML =
        '<div class="match-page-state">Матч не найден.</div>';

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
      ? `
        <div class="match-score">
          <span>${esc(match.home_score)}</span>
          <span class="match-score-separator">:</span>
          <span>${esc(match.away_score)}</span>
        </div>
      `
      : `
        <div class="match-score">
          <span>—</span>
          <span>:</span>
          <span>—</span>
        </div>
      `;

    root.innerHTML = `
      <section class="match-hero">

        ${match.competition
          ? `<div class="match-competition">${esc(match.competition)}</div>`
          : ""
        }

        <div class="match-scoreboard">
          ${clubMarkup(home)}
          ${score}
          ${clubMarkup(away)}
        </div>

        <div class="match-status">
          ${esc(statusNames[match.status] || match.status || "Статус не указан")}
        </div>

        <div class="match-meta">
          ${match.match_date
            ? `<div>${esc(formatDate(match.match_date))}</div>`
            : ""
          }

          ${match.venue
            ? `<div>${esc(match.venue)}</div>`
            : ""
          }
        </div>

      </section>

      <div id="winnerPollContainer"></div>

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
      loadGoals(match.id, home, away),
      loadPenalties(match.id, home, away),
      loadRoster(match.id, home, away),
      loadWinnerPoll(match, home, away)
    ]);
  }

  // =========================================
  // ГОЛЫ
  // =========================================

  async function loadGoals(matchId, home, away) {
    const container = document.getElementById("matchGoals");

    const { data, error } = await db
      .from("match_goals")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Ошибка загрузки голов:", error);

      container.innerHTML =
        '<div class="match-page-state">Не удалось загрузить голы.</div>';

      return;
    }

    if (!data?.length) {
      container.innerHTML =
        '<div class="match-page-state">Информация о голах пока не добавлена.</div>';

      return;
    }

    const homeName = displayTeam(home.name, "Хозяева");
    const awayName = displayTeam(away.name, "Гости");

    container.innerHTML = data.map(goal => `
      <div class="match-event">

        <div class="match-event-time">
          ${esc(goal.goal_time || "—")}
        </div>

        <div class="match-event-description">
          <strong>${esc(goal.player_name || "Автор не указан")}</strong>

          ${goal.player_number !== null && goal.player_number !== undefined
            ? `<span> · №${esc(goal.player_number)}</span>`
            : ""
          }

          ${goal.strength
            ? `<div>${esc(goal.strength)}</div>`
            : ""
          }
        </div>

        <div class="match-event-team">
          ${esc(teamLabel(goal.team_side, homeName, awayName))}
        </div>

      </div>
    `).join("");
  }

  // =========================================
  // ШТРАФЫ
  // =========================================

  async function loadPenalties(matchId, home, away) {
    const container = document.getElementById("matchPenalties");

    const { data, error } = await db
      .from("match_penalties")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Ошибка загрузки штрафов:", error);

      container.innerHTML =
        '<div class="match-page-state">Не удалось загрузить штрафы.</div>';

      return;
    }

    if (!data?.length) {
      container.innerHTML =
        '<div class="match-page-state">Информация об удалениях пока не добавлена.</div>';

      return;
    }

    const homeName = displayTeam(home.name, "Хозяева");
    const awayName = displayTeam(away.name, "Гости");

    container.innerHTML = data.map(penalty => `
      <div class="match-event">

        <div class="match-event-time">
          ${esc(penalty.penalty_time || "—")}
        </div>

        <div class="match-event-description">
          <strong>${esc(penalty.player_name || "Игрок не указан")}</strong>

          ${penalty.player_number !== null && penalty.player_number !== undefined
            ? `<span> · №${esc(penalty.player_number)}</span>`
            : ""
          }

          <div>
            ${esc(penalty.reason || "Причина не указана")}
            ${penalty.minutes
              ? ` · ${esc(penalty.minutes)} мин.`
              : ""
            }
          </div>
        </div>

        <div class="match-event-team">
          ${esc(teamLabel(penalty.team_side, homeName, awayName))}
        </div>

      </div>
    `).join("");
  }

  // =========================================
  // СОСТАВЫ
  // =========================================

  async function loadRoster(matchId, home, away) {
    const container = document.getElementById("matchRosters");

    const { data, error } = await db
      .from("match_roster")
      .select("*")
      .eq("match_id", matchId)
      .order("player_number", { ascending: true });

    if (error) {
      console.error("Ошибка загрузки составов:", error);

      container.innerHTML =
        '<div class="match-page-state">Не удалось загрузить составы.</div>';

      return;
    }

    if (!data?.length) {
      container.innerHTML =
        '<div class="match-page-state">Составы пока не опубликованы.</div>';

      return;
    }

    const homeName = displayTeam(home.name, "Хозяева");
    const awayName = displayTeam(away.name, "Гости");

    const homePlayers = data.filter(player =>
      player.team_side === "home"
    );

    const awayPlayers = data.filter(player =>
      player.team_side === "away"
    );

    function rosterMarkup(title, players) {
      return `
        <div>

          <div class="match-roster-title">
            ${esc(title)}
          </div>

          ${players.length
            ? players.map(player => `
              <div class="match-player">

                <div class="match-player-number">
                  ${player.player_number !== null && player.player_number !== undefined
                    ? `#${esc(player.player_number)}`
                    : "—"
                  }
                </div>

                <div>
                  ${esc(player.player_name || "Игрок")}

                  ${player.position
                    ? `<div class="match-player-position">${esc(player.position)}</div>`
                    : ""
                  }
                </div>

              </div>
            `).join("")
            : '<div class="match-page-state">Состав не опубликован.</div>'
          }

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

  // =========================================
  // ЗАПУСК
  // =========================================

  async function init() {
    if (!root) {
      console.error("Не найден элемент #matchContent");
      return;
    }

    if (!db) {
      root.innerHTML =
        '<div class="match-page-state">Нет подключения к базе данных. Проверь js/config.js.</div>';

      return;
    }

    await Promise.allSettled([
      loadSettings(),
      loadMatch()
    ]);
  }

  init();
})();
