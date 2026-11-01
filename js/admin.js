/* =========================================================
   ХК ЧЕЛНЫ 2011 — ADMIN.JS
   Supabase + матчи + события + составы
========================================================= */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const CONFIG = window.SITE_CONFIG;
  const SUPABASE = window.supabase;

  if (!CONFIG || !SUPABASE) {
    console.error("Не загружены config.js или Supabase.");
    return;
  }

  const db = SUPABASE.createClient(
    CONFIG.SUPABASE_URL,
    CONFIG.SUPABASE_KEY
  );

  const state = {
    user: null,
    section: "dashboard",
    matches: [],
    players: [],
    teams: [],
    events: [],
    periods: [],
    editingMatch: null
  };

  const TITLES = {
    dashboard: ["Обзор", "Общая информация о команде"],
    homepage: ["Главная страница", "Управление блоками сайта"],
    matches: ["Матчи", "Календарь и результаты"],
    players: ["Игроки", "Состав команды"],
    stats: ["Статистика", "Игровые показатели"],
    news: ["Новости", "Публикации команды"],
    media: ["Медиа", "Фотографии и альбомы"],
    products: ["Магазин", "Товары команды"],
    standings: ["Таблица", "Турнирное положение"],
    birthdays: ["Дни рождения", "Календарь именинников"],
    achievements: ["Достижения", "Награды команды"],
    registry: ["Справочники", "Команды и площадки"],
    design: ["Дизайн", "Оформление сайта"],
    settings: ["Настройки", "Основные параметры"]
  };

  /* =======================================================
     ОБЩИЕ ФУНКЦИИ
  ======================================================= */

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function toast(message, type = "success") {
    const el = $("adminToast");
    if (!el) {
      console.log(message);
      return;
    }

    el.textContent = message;
    el.className = `admin-toast ${type}`;
    el.classList.remove("hidden");

    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      el.classList.add("hidden");
    }, 3500);
  }

  function setLoading(loading) {
    $("adminLoader")?.classList.toggle("hidden", !loading);
  }

  function formatDate(value) {
    if (!value) return "Дата не указана";

    return new Date(value + "T00:00:00").toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function formatTime(value) {
    return value ? String(value).slice(0, 5) : "";
  }

  function getTeamName(id) {
    const team = state.teams.find(
      (item) => String(item.id) === String(id)
    );

    return team?.name || "Команда";
  }

  function getPlayerName(id) {
    const player = state.players.find(
      (item) => String(item.id) === String(id)
    );

    return player?.full_name || "Игрок";
  }

  function getMatchName(match) {
    return `${getTeamName(match.home_team_id)} — ${getTeamName(match.away_team_id)}`;
  }

  function showModal(title, html) {
    $("adminModalTitle").textContent = title;
    $("adminModalContent").innerHTML = html;
    $("adminModal")?.classList.remove("hidden");
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    $("adminModal")?.classList.add("hidden");
    document.body.classList.remove("modal-open");
    state.editingMatch = null;
  }

  function closeModalOnBackdrop(event) {
    if (
      event.target?.id === "adminModalBackdrop" ||
      event.target?.id === "adminModalClose"
    ) {
      closeModal();
    }
  }

  $("adminModalBackdrop")?.addEventListener("click", closeModalOnBackdrop);
  $("adminModalClose")?.addEventListener("click", closeModal);

  /* =======================================================
     SUPABASE
  ======================================================= */

  async function selectRows(table, query = (q) => q) {
    const result = await query(db.from(table).select("*"));

    if (result.error) throw result.error;
    return result.data || [];
  }

  async function insertRow(table, values) {
    const { data, error } = await db
      .from(table)
      .insert(values)
      .select();

    if (error) throw error;
    return data;
  }

  async function updateRow(table, id, values) {
    const { data, error } = await db
      .from(table)
      .update(values)
      .eq("id", id)
      .select();

    if (error) throw error;
    return data;
  }

  async function deleteRow(table, id) {
    const { error } = await db
      .from(table)
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  async function uploadImage(file, folder = "uploads") {
    if (!file) return null;

    const extension = file.name.split(".").pop();
    const fileName =
      `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    const { error } = await db.storage
      .from(CONFIG.STORAGE_BUCKET)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (error) throw error;

    const { data } = db.storage
      .from(CONFIG.STORAGE_BUCKET)
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  /* =======================================================
     АВТОРИЗАЦИЯ
  ======================================================= */

  async function checkAuth() {
    setLoading(true);

    try {
      const { data, error } = await db.auth.getSession();
      if (error) throw error;

      state.user = data.session?.user || null;

      if (state.user) {
        showAdmin();
      } else {
        showLogin();
      }
    } catch (error) {
      console.error(error);
      showLogin();
    } finally {
      setLoading(false);
    }
  }

  function showLogin() {
    $("loginScreen")?.classList.remove("hidden");
    $("adminApp")?.classList.add("hidden");
  }

  function showAdmin() {
    $("loginScreen")?.classList.add("hidden");
    $("adminApp")?.classList.remove("hidden");

    if ($("adminUserEmail")) {
      $("adminUserEmail").textContent = state.user?.email || "";
    }

    loadAll();
  }

  async function login(event) {
    event?.preventDefault();

    const email = $("loginEmail")?.value.trim();
    const password = $("loginPassword")?.value;

    if (!email || !password) {
      $("loginError").textContent = "Введите email и пароль.";
      return;
    }

    $("loginError").textContent = "";

    try {
      const { data, error } = await db.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      state.user = data.user;
      showAdmin();
    } catch (error) {
      $("loginError").textContent = error.message;
    }
  }

  async function logout() {
    const { error } = await db.auth.signOut();

    if (error) {
      toast(error.message, "error");
      return;
    }

    state.user = null;
    showLogin();
  }

  $("loginForm")?.addEventListener("submit", login);
  $("logoutButton")?.addEventListener("click", logout);

  db.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user || null;
  });

  /* =======================================================
     НАВИГАЦИЯ
  ======================================================= */

  function openSection(section) {
    if (!TITLES[section]) return;

    state.section = section;

    document.querySelectorAll(".admin-section").forEach((element) => {
      element.classList.add("hidden");
    });

    const target = $(`section-${section}`);
    target?.classList.remove("hidden");

    document.querySelectorAll(".sidebar-item").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.section === section
      );
    });

    if ($("currentSectionTitle")) {
      $("currentSectionTitle").textContent = TITLES[section][0];
    }

    if ($("currentSectionSubtitle")) {
      $("currentSectionSubtitle").textContent = TITLES[section][1];
    }

    $("adminSidebar")?.classList.remove("open");
  }

  document.querySelectorAll("[data-section]").forEach((button) => {
    button.addEventListener("click", () => {
      openSection(button.dataset.section);
    });
  });

  $("mobileMenuButton")?.addEventListener("click", () => {
    $("adminSidebar")?.classList.toggle("open");
  });

  $("refreshButton")?.addEventListener("click", loadAll);

  /* =======================================================
     ЗАГРУЗКА ДАННЫХ
  ======================================================= */

  async function loadAll() {
    setLoading(true);

    try {
      const [
        teams,
        matches,
        players
      ] = await Promise.all([
        selectRows("teams", (q) => q.order("name")),
        selectRows("matches", (q) => q.order("match_date", { ascending: false })),
        selectRows("players", (q) => q.order("number", { ascending: true }))
      ]);

      state.teams = teams;
      state.matches = matches;
      state.players = players;

      await Promise.allSettled([
        renderDashboard(),
        renderMatches(),
        renderPlayers(),
        renderStats(),
        renderNews(),
        renderAlbums(),
        renderProducts(),
        renderStandings(),
        renderBirthdays(),
        renderAchievements(),
        renderRegistry()
      ]);

      fillHomepageControls();
      fillDesignControls();

    } catch (error) {
      console.error(error);
      toast(`Ошибка загрузки: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     ГЛАВНАЯ / DASHBOARD
  ======================================================= */

  async function renderDashboard() {
    const [
      news,
      albums
    ] = await Promise.all([
      selectRows("news").catch(() => []),
      selectRows("albums").catch(() => [])
    ]);

    const stats = [
      ["Матчи", state.matches.length],
      ["Игроки", state.players.length],
      ["Новости", news.length],
      ["Альбомы", albums.length]
    ];

    if ($("dashboardStats")) {
      $("dashboardStats").innerHTML = stats.map(([name, value]) => `
        <div class="stat-card">
          <div class="stat-value">${value}</div>
          <div class="stat-label">${name}</div>
        </div>
      `).join("");
    }

    const nextMatch = [...state.matches]
      .filter((m) => m.status === "scheduled")
      .sort((a, b) => {
        return new Date(a.match_date) - new Date(b.match_date);
      })[0];

    if ($("dashboardNextMatch")) {
      $("dashboardNextMatch").innerHTML = nextMatch
        ? `<b>${escapeHTML(getMatchName(nextMatch))}</b>
           <p>${formatDate(nextMatch.match_date)} · ${formatTime(nextMatch.match_time)}</p>`
        : "Предстоящих матчей нет.";
    }

    if ($("dashboardPlayers")) {
      $("dashboardPlayers").textContent = state.players.length;
    }

    if ($("dashboardNews")) {
      $("dashboardNews").textContent = news.length;
    }

    if ($("dashboardAlbums")) {
      $("dashboardAlbums").textContent = albums.length;
    }
  }

  /* =======================================================
     МАТЧИ
  ======================================================= */

  async function renderMatches() {
    const box = $("matchesAdminList");
    if (!box) return;

    if (!state.matches.length) {
      box.innerHTML = `<div class="empty-state">Матчей пока нет.</div>`;
      return;
    }

    box.innerHTML = state.matches.map((match) => `
      <div class="admin-item">
        <div class="admin-item-main">
          <b>${escapeHTML(getMatchName(match))}</b>
          <span>${formatDate(match.match_date)} · ${formatTime(match.match_time)}</span>
          <span>${escapeHTML(match.tournament || "")}</span>
          <span>${escapeHTML(match.venue || "")}</span>
        </div>

        <div class="admin-item-actions">
          <button class="btn btn-small" data-match-action="events" data-id="${match.id}">
            События
          </button>

          <button class="btn btn-small" data-match-action="lineup" data-id="${match.id}">
            Состав
          </button>

          <button class="btn btn-small" data-match-action="edit" data-id="${match.id}">
            Изменить
          </button>

          <button class="btn btn-danger btn-small" data-match-action="delete" data-id="${match.id}">
            Удалить
          </button>
        </div>
      </div>
    `).join("");

    box.querySelectorAll("[data-match-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = Number(button.dataset.id);
        const action = button.dataset.matchAction;

        if (action === "events") await openEventsEditor(id);
        if (action === "lineup") await openLineupEditor(id);
        if (action === "edit") openMatchForm(id);
        if (action === "delete") await deleteMatch(id);
      });
    });
  }

  function openMatchForm(id = null) {
    const match = state.matches.find((m) => String(m.id) === String(id)) || {};

    showModal(id ? "Изменить матч" : "Добавить матч", `
      <form id="matchForm" class="admin-form">
        <label>Дата</label>
        <input name="match_date" type="date" value="${escapeHTML(match.match_date || "")}" required>

        <label>Время</label>
        <input name="match_time" type="time" value="${formatTime(match.match_time)}">

        <label>Хозяева</label>
        <select name="home_team_id" required>
          ${teamOptions(match.home_team_id)}
        </select>

        <label>Гости</label>
        <select name="away_team_id" required>
          ${teamOptions(match.away_team_id)}
        </select>

        <label>Турнир</label>
        <input name="tournament" value="${escapeHTML(match.tournament || "")}">

        <label>Место проведения</label>
        <input name="venue" value="${escapeHTML(match.venue || "")}">

        <label>Статус</label>
        <select name="status">
          <option value="scheduled" ${match.status === "scheduled" ? "selected" : ""}>Предстоящий</option>
          <option value="live" ${match.status === "live" ? "selected" : ""}>LIVE</option>
          <option value="finished" ${match.status === "finished" ? "selected" : ""}>Завершён</option>
          <option value="cancelled" ${match.status === "cancelled" ? "selected" : ""}>Отменён</option>
        </select>

        <label>Трансляция</label>
        <input name="stream_url" type="url" value="${escapeHTML(match.stream_url || "")}">

        <label>Главный судья</label>
        <input name="chief_referee" value="${escapeHTML(match.chief_referee || "")}">

        <label>Первый линейный</label>
        <input name="linesman1" value="${escapeHTML(match.linesman1 || "")}">

        <label>Второй линейный</label>
        <input name="linesman2" value="${escapeHTML(match.linesman2 || "")}">

        <button class="btn btn-primary" type="submit">Сохранить матч</button>
      </form>
    `);

    $("matchForm").addEventListener("submit", async (event) => {
      event.preventDefault();

      const form = new FormData(event.currentTarget);

      const values = {
        match_date: form.get("match_date"),
        match_time: form.get("match_time") || null,
        home_team_id: Number(form.get("home_team_id")),
        away_team_id: Number(form.get("away_team_id")),
        tournament: form.get("tournament") || null,
        venue: form.get("venue") || null,
        status: form.get("status"),
        stream_url: form.get("stream_url") || null,
        chief_referee: form.get("chief_referee") || null,
        linesman1: form.get("linesman1") || null,
        linesman2: form.get("linesman2") || null
      };

      try {
        if (id) {
          await updateRow("matches", id, values);
        } else {
          await insertRow("matches", values);
        }

        closeModal();
        toast("Матч сохранён.");
        await loadAll();
      } catch (error) {
        toast(error.message, "error");
      }
    });
  }

  function teamOptions(selected = "") {
    return `
      <option value="">Выберите команду</option>
      ${state.teams.map((team) => `
        <option value="${team.id}" ${String(selected) === String(team.id) ? "selected" : ""}>
          ${escapeHTML(team.name)}
        </option>
      `).join("")}
    `;
  }

  async function deleteMatch(id) {
    if (!confirm("Удалить матч? События и периоды этого матча также будут удалены.")) {
      return;
    }

    try {
      await deleteRow("matches", id);
      toast("Матч удалён.");
      await loadAll();
    } catch (error) {
      toast(error.message, "error");
    }
  }

  $("addMatchButton")?.addEventListener("click", () => openMatchForm());

  /* =======================================================
     СОБЫТИЯ МАТЧА
  ======================================================= */

  async function openEventsEditor(matchId) {
    const match = state.matches.find(
      (item) => String(item.id) === String(matchId)
    );

    if (!match) {
      toast("Матч не найден.", "error");
      return;
    }

    state.editingMatch = match;

    try {
      const [events, periods] = await Promise.all([
        selectRows("match_events", (q) =>
          q.eq("match_id", matchId).order("period").order("event_time")
        ),
        selectRows("match_periods", (q) =>
          q.eq("match_id", matchId).order("period")
        )
      ]);

      state.events = events;
      state.periods = periods;

      showModal("События матча", `
        <div class="match-editor">
          <h3>${escapeHTML(getMatchName(match))}</h3>
          <p>${formatDate(match.match_date)} · ${formatTime(match.match_time)}</p>

          <div class="editor-tabs">
            <button type="button" class="btn active" id="showEventsTab">События</button>
            <button type="button" class="btn" id="showPeriodsTab">Периоды</button>
          </div>

          <div id="eventsTab">
            <div id="eventsRows"></div>

            <button type="button" class="btn" id="addEventRow">
              + Добавить событие
            </button>
          </div>

          <div id="periodsTab" class="hidden">
            <p class="muted">Укажи счёт каждого периода. Если период не проводился, оставь нули.</p>
            ${[1, 2, 3, 4].map((period) => {
              const row = periods.find((p) => Number(p.period) === period) || {};

              return `
                <div class="period-row">
                  <b>${period === 4 ? "Овертайм" : `${period}-й период`}</b>

                  <label>Хозяева</label>
                  <input type="number" min="0" class="period-home" data-period="${period}"
                    value="${row.home_score ?? 0}">

                  <label>Гости</label>
                  <input type="number" min="0" class="period-away" data-period="${period}"
                    value="${row.away_score ?? 0}">

                  <label>Штрафные минуты</label>
                  <input type="number" min="0" class="period-pim" data-period="${period}"
                    value="${row.penalty_minutes ?? 0}">
                </div>
              `;
            }).join("")}
          </div>

          <button type="button" class="btn btn-primary" id="saveMatchEvents">
            Сохранить события и периоды
          </button>
        </div>
      `);

      renderEventRows(events);

      $("showEventsTab").addEventListener("click", () => {
        $("eventsTab").classList.remove("hidden");
        $("periodsTab").classList.add("hidden");
      });

      $("showPeriodsTab").addEventListener("click", () => {
        $("periodsTab").classList.remove("hidden");
        $("eventsTab").classList.add("hidden");
      });

      $("addEventRow").addEventListener("click", () => {
        addEventRow();
      });

      $("saveMatchEvents").addEventListener("click", () => {
        saveMatchEvents(matchId);
      });

    } catch (error) {
      toast(`Не удалось открыть события: ${error.message}`, "error");
    }
  }

  function playerOptions(selected = "") {
    return `
      <option value="">Не выбран</option>
      ${state.players.filter((p) => p.active !== false).map((player) => `
        <option value="${player.id}" ${String(selected) === String(player.id) ? "selected" : ""}>
          ${player.number != null ? `#${player.number} ` : ""}
          ${escapeHTML(player.full_name)}
        </option>
      `).join("")}
    `;
  }

  function eventRowHTML(event = {}) {
    return `
      <div class="event-editor-row">
        <div class="event-editor-grid">

          <label>Событие
            <select class="event-type">
              <option value="goal" ${event.event_type === "goal" ? "selected" : ""}>Гол</option>
              <option value="penalty" ${event.event_type === "penalty" ? "selected" : ""}>Удаление</option>
            </select>
          </label>

          <label>Команда
            <select class="event-team">
              <option value="${state.editingMatch.home_team_id}">
                ${escapeHTML(getTeamName(state.editingMatch.home_team_id))}
              </option>
              <option value="${state.editingMatch.away_team_id}">
                ${escapeHTML(getTeamName(state.editingMatch.away_team_id))}
              </option>
            </select>
          </label>

          <label>Период
            <select class="event-period">
              <option value="1" ${Number(event.period) === 1 ? "selected" : ""}>1</option>
              <option value="2" ${Number(event.period) === 2 ? "selected" : ""}>2</option>
              <option value="3" ${Number(event.period) === 3 ? "selected" : ""}>3</option>
              <option value="4" ${Number(event.period) === 4 ? "selected" : ""}>ОТ</option>
            </select>
          </label>

          <label>Время
            <input class="event-time" type="text" placeholder="12:34"
              value="${escapeHTML(event.event_time || "")}">
          </label>

          <label>Игрок
            <select class="event-player">${playerOptions(event.player_id)}</select>
          </label>

          <label>Передача 1
            <select class="event-assist1">${playerOptions(event.assist1_player_id)}</select>
          </label>

          <label>Передача 2
            <select class="event-assist2">${playerOptions(event.assist2_player_id)}</select>
          </label>

          <label>Штраф, минут
            <input class="event-pim" type="number" min="0"
              value="${event.penalty_minutes ?? ""}">
          </label>

          <label class="event-note-label">Примечание
            <input class="event-note" value="${escapeHTML(event.note || "")}">
          </label>
        </div>

        <button type="button" class="btn btn-danger btn-small remove-event">
          Удалить событие
        </button>
      </div>
    `;
  }

  function renderEventRows(events = []) {
    const box = $("eventsRows");
    if (!box) return;

    box.innerHTML = events.length
      ? events.map(eventRowHTML).join("")
      : `<div class="empty-state">Событий пока нет. Добавь первое событие.</div>`;

    box.querySelectorAll(".remove-event").forEach((button) => {
      button.addEventListener("click", () => {
        button.closest(".event-editor-row").remove();
      });
    });
  }

  function addEventRow() {
    const box = $("eventsRows");
    if (!box) return;

    const empty = box.querySelector(".empty-state");
    empty?.remove();

    box.insertAdjacentHTML("beforeend", eventRowHTML());

    box.querySelectorAll(".remove-event").forEach((button) => {
      if (button.dataset.bound) return;
      button.dataset.bound = "1";

      button.addEventListener("click", () => {
        button.closest(".event-editor-row").remove();
      });
    });
  }

  function collectEventRows(matchId) {
    const rows = [...document.querySelectorAll(".event-editor-row")];

    return rows.map((row) => {
      const type = row.querySelector(".event-type").value;
      const teamId = Number(row.querySelector(".event-team").value);
      const period = Number(row.querySelector(".event-period").value);
      const time = row.querySelector(".event-time").value.trim();
      const playerId = row.querySelector(".event-player").value;
      const assist1 = row.querySelector(".event-assist1").value;
      const assist2 = row.querySelector(".event-assist2").value;
      const pim = row.querySelector(".event-pim").value;
      const note = row.querySelector(".event-note").value.trim();

      const player = playerId ? getPlayerName(playerId) : "";
      const assist1Name = assist1 ? getPlayerName(assist1) : "";
      const assist2Name = assist2 ? getPlayerName(assist2) : "";

      let publicNote = note;

      if (type === "goal") {
        publicNote = [
          "Гол",
          player ? `Автор: ${player}` : "",
          assist1Name ? `Передача: ${assist1Name}` : "",
          assist2Name ? `Передача: ${assist2Name}` : "",
          note
        ].filter(Boolean).join(" · ");
      }

      if (type === "penalty") {
        publicNote = [
          "Удаление",
          player ? `Игрок: ${player}` : "",
          pim ? `${pim} мин.` : "",
          note
        ].filter(Boolean).join(" · ");
      }

      return {
        match_id: matchId,
        event_type: type,
        period,
        event_time: time || null,
        team_id: teamId,
        player_id: playerId ? Number(playerId) : null,
        assist1_player_id: assist1 ? Number(assist1) : null,
        assist2_player_id: assist2 ? Number(assist2) : null,
        penalty_minutes: pim ? Number(pim) : null,
        note: publicNote || null
      };
    }).filter((event) => {
      return event.player_id || event.note;
    });
  }

  async function saveMatchEvents(matchId) {
    try {
      const events = collectEventRows(matchId);

      const periods = [1, 2, 3, 4].map((period) => {
        const home = document.querySelector(
          `.period-home[data-period="${period}"]`
        )?.value;

        const away = document.querySelector(
          `.period-away[data-period="${period}"]`
        )?.value;

        const pim = document.querySelector(
          `.period-pim[data-period="${period}"]`
        )?.value;

        return {
          match_id: matchId,
          period,
          home_score: Number(home || 0),
          away_score: Number(away || 0),
          penalty_minutes: Number(pim || 0)
        };
      });

      const { error: deleteEventsError } = await db
        .from("match_events")
        .delete()
        .eq("match_id", matchId);

      if (deleteEventsError) throw deleteEventsError;

      if (events.length) {
        const { error } = await db
          .from("match_events")
          .insert(events);

        if (error) throw error;
      }

      const { error: periodsError } = await db
        .from("match_periods")
        .upsert(periods, {
          onConflict: "match_id,period"
        });

      if (periodsError) throw periodsError;

      closeModal();
      toast("События и периоды сохранены.");

    } catch (error) {
      console.error(error);
      toast(`Ошибка сохранения: ${error.message}`, "error");
    }
  }

  /* =======================================================
     СОСТАВ МАТЧА
  ======================================================= */

  async function openLineupEditor(matchId) {
    const match = state.matches.find(
      (item) => String(item.id) === String(matchId)
    );

    if (!match) {
      toast("Матч не найден.", "error");
      return;
    }

    const currentLineup = Array.isArray(match.lineup)
      ? match.lineup
      : [];

    const selectedNames = new Set(currentLineup);

    showModal("Состав на матч", `
      <div class="lineup-editor">
        <h3>${escapeHTML(getMatchName(match))}</h3>
        <p>${formatDate(match.match_date)}</p>

        <p class="muted">
          Отметь игроков, которые участвуют в матче. Выбери их позицию в составе.
          Сохранённый состав появится в карточке матча на сайте.
        </p>

        <div class="lineup-list">
          ${state.players.filter((p) => p.active !== false).map((player) => {
            const displayName = [
              player.number != null ? `#${player.number}` : "",
              player.full_name,
              player.position === "goalie" ? "— Вратарь" :
                player.position === "defense" ? "— Защитник" :
                  "— Нападающий"
            ].filter(Boolean).join(" ");

            return `
              <label class="lineup-player">
                <input type="checkbox" class="lineup-check"
                  value="${player.id}"
                  data-display="${escapeHTML(displayName)}"
                  ${selectedNames.has(displayName) ||
                    [...selectedNames].some((name) => name.includes(player.full_name))
                    ? "checked" : ""}>

                <span>
                  ${escapeHTML(displayName)}
                </span>
              </label>
            `;
          }).join("")}
        </div>

        <label>Дополнительная информация о составе</label>
        <textarea id="lineupExtra" rows="3"
          placeholder="Например: капитан — Иванов, ассистенты — Петров и Сидоров."></textarea>

        <button class="btn btn-primary" id="saveLineupButton">
          Сохранить состав
        </button>
      </div>
    `);

    $("saveLineupButton").addEventListener("click", async () => {
      const selected = [
        ...document.querySelectorAll(".lineup-check:checked")
      ];

      const lineup = selected.map((checkbox) => checkbox.dataset.display);

      const extra = $("lineupExtra").value.trim();
      if (extra) lineup.push(extra);

      try {
        const { error } = await db
          .from("matches")
          .update({ lineup })
          .eq("id", matchId);

        if (error) throw error;

        match.lineup = lineup;

        closeModal();
        toast("Состав матча сохранён.");
        await renderMatches();

      } catch (error) {
        toast(`Ошибка сохранения состава: ${error.message}`, "error");
      }
    });
  }

  /* =======================================================
     ИГРОКИ
  ======================================================= */

  async function renderPlayers() {
    const box = $("playersAdminList");
    if (!box) return;

    const filter = document.querySelector(
      ".admin-filter.active"
    )?.dataset.playerFilter || "all";

    let players = state.players;

    if (filter !== "all") {
      players = players.filter((p) => p.position === filter);
    }

    if (!players.length) {
      box.innerHTML = `<div class="empty-state">Игроков пока нет.</div>`;
      return;
    }

    box.innerHTML = players.map((player) => `
      <div class="admin-item">
        <div class="admin-item-main">
          <b>
            ${player.number != null ? `#${player.number} ` : ""}
            ${escapeHTML(player.full_name)}
          </b>
          <span>${escapeHTML(player.position || "")}</span>
          <span>${player.active === false ? "Неактивен" : "В составе"}</span>
        </div>
      </div>
    `).join("");
  }

  document.querySelectorAll(".admin-filter[data-player-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".admin-filter").forEach((b) => {
        b.classList.remove("active");
      });

      button.classList.add("active");
      renderPlayers();
    });
  });

  /* =======================================================
     СТАТИСТИКА
  ======================================================= */

  async function renderStats() {
    const box = $("statsAdminList");
    if (!box) return;

    const rows = await selectRows("player_season_stats").catch(() => []);

    if (!rows.length) {
      box.innerHTML = `<div class="empty-state">Статистика пока не заполнена.</div>`;
      return;
    }

    box.innerHTML = rows.map((row) => `
      <div class="admin-item">
        <b>${escapeHTML(getPlayerName(row.player_id))}</b>
        <span>Игр: ${row.games || 0}</span>
        <span>Голы: ${row.goals || 0}</span>
        <span>Передачи: ${row.assists || 0}</span>
        <span>Очки: ${row.points || 0}</span>
        <span>Штраф: ${row.pim || 0}</span>
      </div>
    `).join("");
  }

  /* =======================================================
     НОВОСТИ
  ======================================================= */

  async function renderNews() {
    const box = $("newsAdminList");
    if (!box) return;

    const rows = await selectRows("news", (q) =>
      q.order("published_at", { ascending: false })
    ).catch(() => []);

    box.innerHTML = rows.length
      ? rows.map((item) => `
        <div class="admin-item">
          <b>${escapeHTML(item.title)}</b>
          <span>${formatDate(item.published_at?.slice(0, 10))}</span>
        </div>
      `).join("")
      : `<div class="empty-state">Новостей пока нет.</div>`;
  }

  /* =======================================================
     МЕДИА
  ======================================================= */

  async function renderAlbums() {
    const box = $("albumsAdminList");
    if (!box) return;

    const rows = await selectRows("albums", (q) =>
      q.order("created_at", { ascending: false })
    ).catch(() => []);

    box.innerHTML = rows.length
      ? rows.map((item) => `
        <div class="admin-item">
          <b>${escapeHTML(item.title)}</b>
          <span>Фотографий: ${Array.isArray(item.photos) ? item.photos.length : 0}</span>
        </div>
      `).join("")
      : `<div class="empty-state">Альбомов пока нет.</div>`;
  }

  /* =======================================================
     ТОВАРЫ
  ======================================================= */

  async function renderProducts() {
    const box = $("productsAdminList");
    if (!box) return;

    const rows = await selectRows("products").catch(() => []);

    box.innerHTML = rows.length
      ? rows.map((item) => `
        <div class="admin-item">
          <b>${escapeHTML(item.name)}</b>
          <span>${item.price ?? 0} ₽</span>
        </div>
      `).join("")
      : `<div class="empty-state">Товаров пока нет.</div>`;
  }

  /* =======================================================
     ТУРНИРНАЯ ТАБЛИЦА
  ======================================================= */

  async function renderStandings() {
    const box = $("standingsAdminList");
    if (!box) return;

    const rows = await selectRows("standings").catch(() => []);

    box.innerHTML = rows.length
      ? rows.map((item) => `
        <div class="admin-item">
          <b>${item.place ?? "—"} место</b>
          <span>${item.games} игр · ${item.points} очков</span>
        </div>
      `).join("")
      : `<div class="empty-state">Таблица пока не заполнена.</div>`;
  }

  /* =======================================================
     ДНИ РОЖДЕНИЯ
  ======================================================= */

  async function renderBirthdays() {
    const box = $("birthdaysAdminList");
    if (!box) return;

    const rows = await selectRows("birthdays").catch(() => []);

    box.innerHTML = rows.length
      ? rows.map((item) => `
        <div class="admin-item">
          <b>${escapeHTML(getPlayerName(item.player_id))}</b>
          <span>${escapeHTML(item.birthday || "")}</span>
        </div>
      `).join("")
      : `<div class="empty-state">Дни рождения пока не добавлены.</div>`;
  }

  /* =======================================================
     ДОСТИЖЕНИЯ
  ======================================================= */

  async function renderAchievements() {
    const box = $("achievementsAdminList");
    if (!box) return;

    const rows = await selectRows("achievements").catch(() => []);

    box.innerHTML = rows.length
      ? rows.map((item) => `
        <div class="admin-item">
          <b>${escapeHTML(item.title)}</b>
          <span>${escapeHTML(item.description || "")}</span>
        </div>
      `).join("")
      : `<div class="empty-state">Достижений пока нет.</div>`;
  }

  /* =======================================================
     СПРАВОЧНИКИ
  ======================================================= */

  async function renderRegistry() {
    const teamsBox = $("registryTeamsList");
    const venuesBox = $("registryVenuesList");

    if (teamsBox) {
      teamsBox.innerHTML = state.teams.map((team) => `
        <div class="admin-item">
          <b>${escapeHTML(team.name)}</b>
        </div>
      `).join("") || `<div class="empty-state">Команд пока нет.</div>`;
    }

    if (venuesBox) {
      venuesBox.innerHTML = `
        <div class="empty-state">
          Площадки указываются в карточках матчей.
        </div>
      `;
    }
  }

  /* =======================================================
     НАСТРОЙКИ ГЛАВНОЙ СТРАНИЦЫ
  ======================================================= */

  async function getSettings() {
    const rows = await selectRows("settings", (q) =>
      q.eq("id", 1).limit(1)
    );

    return rows[0] || null;
  }

  async function fillHomepageControls() {
    try {
      const settings = await getSettings();
      if (!settings) return;

      const homepage = settings.homepage || {};

      const controls = {
        homepageShowLastMatch: homepage.showLastMatch,
        homepageShowNews: homepage.showNews,
        homepageShowLeaders: homepage.showStats,
        homepageShowAchievements: homepage.showAchievements,
        homepageShowBirthdays: homepage.showBirthdays
      };

      Object.entries(controls).forEach(([id, value]) => {
        if ($(id) && value !== undefined) {
          $(id).checked = Boolean(value);
        }
      });

      const select = $("homepageHeroMatch");

      if (select) {
        select.innerHTML = `
          <option value="">Автоматически</option>
          ${state.matches.map((match) => `
            <option value="${match.id}"
              ${String(homepage.featuredMatchId) === String(match.id) ? "selected" : ""}>
              ${escapeHTML(getMatchName(match))} · ${formatDate(match.match_date)}
            </option>
          `).join("")}
        `;
      }

    } catch (error) {
      console.warn("Настройки главной страницы:", error);
    }
  }

  $("saveHomepageButton")?.addEventListener("click", async () => {
    try {
      const old = await getSettings();
      const homepage = old?.homepage || {};

      const updated = {
        ...homepage,
        showLastMatch: $("homepageShowLastMatch")?.checked ?? true,
        showNews: $("homepageShowNews")?.checked ?? true,
        showStats: $("homepageShowLeaders")?.checked ?? true,
        showAchievements: $("homepageShowAchievements")?.checked ?? true,
        showBirthdays: $("homepageShowBirthdays")?.checked ?? true,
        featuredMatchId: $("homepageHeroMatch")?.value
          ? Number($("homepageHeroMatch").value)
          : null
      };

      const { error } = await db
        .from("settings")
        .update({ homepage: updated })
        .eq("id", 1);

      if (error) throw error;

      toast("Главная страница сохранена.");

    } catch (error) {
      toast(error.message, "error");
    }
  });

  /* =======================================================
     ДИЗАЙН
  ======================================================= */

  async function fillDesignControls() {
    try {
      const settings = await getSettings();
      if (!settings) return;

      const colors = {
        colorPrimary: settings.primary_color,
        colorAccent: settings.gold_color || settings.accent_color,
        colorBackground: settings.background_color,
        colorText: settings.text_color
      };

      Object.entries(colors).forEach(([id, value]) => {
        if ($(id) && value) $(id).value = value;
      });

      if ($("designTeamName")) {
        $("designTeamName").value = settings.team_name || "";
      }

      if ($("logoPreview") && settings.logo_url) {
        $("logoPreview").src = settings.logo_url;
      }

    } catch (error) {
      console.warn(error);
    }
  }

  $("saveDesignButton")?.addEventListener("click", async () => {
    try {
      const settings = await getSettings();

      const values = {
        team_name: $("designTeamName")?.value || CONFIG.DEFAULT_TEAM_NAME,
        primary_color: $("colorPrimary")?.value || "#000056",
        gold_color: $("colorAccent")?.value || "#ffcd00",
        background_color: $("colorBackground")?.value || "#050b22",
        text_color: $("colorText")?.value || "#ffffff"
      };

      const logo = $("logoUpload")?.files?.[0];

      if (logo) {
        values.logo_url = await uploadImage(logo, "logo");
      } else if (settings?.logo_url) {
        values.logo_url = settings.logo_url;
      }

      const { error } = await db
        .from("settings")
        .update(values)
        .eq("id", 1);

      if (error) throw error;

      toast("Дизайн сохранён.");

    } catch (error) {
      toast(error.message, "error");
    }
  });

  /* =======================================================
     КНОПКИ ДОБАВЛЕНИЯ
  ======================================================= */

  $("addPlayerButton")?.addEventListener("click", () => {
    toast("Редактор игроков подключим к форме игроков.", "error");
  });

  $("addGoalButton")?.addEventListener("click", () => {
    const match = state.matches[0];
    if (match) openEventsEditor(match.id);
    else toast("Сначала добавь матч.", "error");
  });

  $("addAssistButton")?.addEventListener("click", () => {
    const match = state.matches[0];
    if (match) openEventsEditor(match.id);
    else toast("Сначала добавь матч.", "error");
  });

  $("addPenaltyButton")?.addEventListener("click", () => {
    const match = state.matches[0];
    if (match) openEventsEditor(match.id);
    else toast("Сначала добавь матч.", "error");
  });

  $("addNewsButton")?.addEventListener("click", () => {
    toast("Раздел новостей загружен. Форму публикации можно подключить отдельно.");
  });

  $("addAlbumButton")?.addEventListener("click", () => {
    toast("Раздел альбомов загружен. Форму альбома можно подключить отдельно.");
  });

  $("addProductButton")?.addEventListener("click", () => {
    toast("Раздел товаров загружен. Форму товара можно подключить отдельно.");
  });

  $("addStandingButton")?.addEventListener("click", () => {
    toast("Раздел турнирной таблицы загружен.");
  });

  $("addBirthdayButton")?.addEventListener("click", () => {
    toast("Раздел дней рождения загружен.");
  });

  $("addAchievementButton")?.addEventListener("click", () => {
    toast("Раздел достижений загружен.");
  });

  $("addRegistryTeamButton")?.addEventListener("click", () => {
    toast("Команды добавляются в справочник через Supabase.");
  });

  $("addRegistryVenueButton")?.addEventListener("click", () => {
    toast("Площадки указываются в карточке матча.");
  });

  /* =======================================================
     БЫСТРЫЕ ДЕЙСТВИЯ
  ======================================================= */

  document.querySelectorAll(".quick-action[data-section]").forEach((button) => {
    button.addEventListener("click", () => {
      openSection(button.dataset.section);
    });
  });

  /* =======================================================
     ЗАПУСК
  ======================================================= */

  checkAuth();

})();
