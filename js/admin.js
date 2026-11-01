
/* =========================================================
   ХК ЧЕЛНЫ 2011 — ADMIN.JS
   Supabase + полная административная панель
========================================================= */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const db = window.supabaseClient;
  const BUCKET = window.STORAGE_BUCKET || "site-media";

  if (!db) {
    console.error("Supabase client не найден. Проверь js/config.js");
    return;
  }

  const state = {
    user: null,
    clubs: [],
    matches: [],
    players: [],
    news: [],
    stories: [],
    standings: [],
    stats: [],
    leaders: [],
    albums: [],
    settings: null,
    editingStanding: null,
    editingStat: null,
    editingLeader: null,
    editingClub: null
  };

  /* =========================================================
     ОБЩИЕ ФУНКЦИИ
  ========================================================= */

  function esc(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function toast(message, error = false) {
    const el = $("toast");
    if (!el) return;

    el.textContent = message;
    el.classList.add("on");

    el.style.background = error ? "#9f293b" : "#17234c";

    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      el.classList.remove("on");
    }, 3500);
  }

  function showError(error, prefix = "Ошибка") {
    console.error(prefix, error);
    toast(`${prefix}: ${error?.message || error}`, true);
  }

  function dateText(value) {
    if (!value) return "Дата не указана";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function dateOnly(value) {
    if (!value) return "";

    return String(value).slice(0, 10);
  }

  function localDateTime(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset)
      .toISOString()
      .slice(0, 16);
  }

  function numberValue(id, fallback = 0) {
    const value = Number($(id)?.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function value(id) {
    return $(id)?.value?.trim() || "";
  }

  function fileValue(id) {
    return $(id)?.files?.[0] || null;
  }

  function imageUrl(path) {
    if (!path) return "";

    if (/^https?:\/\//i.test(path)) return path;

    const { data } = db.storage
      .from(BUCKET)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  function imageHTML(path, alt = "") {
    const url = imageUrl(path);

    if (!url) return "";

    return `
      <img
        src="${esc(url)}"
        alt="${esc(alt)}"
        style="
          width:58px;
          height:58px;
          object-fit:cover;
          border-radius:8px;
          flex-shrink:0;
        "
      >
    `;
  }

  function empty(text) {
    return `<p class="hint">${esc(text)}</p>`;
  }

  function itemActions(id, type, edit = true) {
    return `
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        ${edit ? `
          <button class="btn alt"
            data-action="edit"
            data-type="${type}"
            data-id="${esc(id)}">Изменить</button>
        ` : ""}
        <button class="btn red"
          data-action="delete"
          data-type="${type}"
          data-id="${esc(id)}">Удалить</button>
      </div>
    `;
  }

  async function selectRows(table, configure = q => q) {
    const { data, error } = await configure(
      db.from(table).select("*")
    );

    if (error) throw error;
    return data || [];
  }

  async function insertRow(table, values) {
    const { data, error } = await db
      .from(table)
      .insert(values)
      .select();

    if (error) throw error;
    return data?.[0] || null;
  }

  async function updateRow(table, id, values) {
    const { data, error } = await db
      .from(table)
      .update(values)
      .eq("id", id)
      .select();

    if (error) throw error;
    return data?.[0] || null;
  }

  async function deleteRow(table, id) {
    const { error } = await db
      .from(table)
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  async function uploadFile(file, folder) {
    if (!file) return null;

    const extension = (
      file.name.split(".").pop() || "jpg"
    ).toLowerCase().replace(/[^a-z0-9]/g, "");

    const filename =
      `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    const { error } = await db.storage
      .from(BUCKET)
      .upload(filename, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined
      });

    if (error) throw error;

    return filename;
  }

  function resetFile(id) {
    if ($(id)) $(id).value = "";
  }

  function resetFields(ids) {
    ids.forEach(id => {
      const el = $(id);
      if (!el) return;

      if (el.type === "file") {
        el.value = "";
      } else if (el.type === "checkbox") {
        el.checked = false;
      } else {
        el.value = "";
      }
    });
  }

  function bindAction(container, callback) {
    $(container)?.addEventListener("click", async event => {
      const button = event.target.closest("[data-action]");
      if (!button) return;

      const { action, type, id } = button.dataset;

      try {
        await callback(action, type, id);
      } catch (error) {
        showError(error);
      }
    });
  }

  /* =========================================================
     АВТОРИЗАЦИЯ
  ========================================================= */

  function showLogin() {
    $("login")?.classList.remove("hide");
    $("app")?.classList.add("hide");
  }

  function showApp() {
    $("login")?.classList.add("hide");
    $("app")?.classList.remove("hide");
    loadAll();
  }

  async function login(event) {
    event.preventDefault();

    $("loginErr").textContent = "";

    const email = value("email");
    const password = $("password")?.value || "";

    if (!email || !password) {
      $("loginErr").textContent = "Заполни все поля.";
      return;
    }

    try {
      const { data, error } = await db.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      state.user = data.user;
      showApp();
    } catch (error) {
      $("loginErr").textContent = error.message;
    }
  }

  async function logout() {
    const { error } = await db.auth.signOut();

    if (error) {
      showError(error);
      return;
    }

    state.user = null;
    showLogin();
  }

  $("loginForm")?.addEventListener("submit", login);
  $("logout")?.addEventListener("click", logout);

  async function checkAuth() {
    try {
      const { data, error } = await db.auth.getSession();
      if (error) throw error;

      state.user = data.session?.user || null;

      if (state.user) showApp();
      else showLogin();

    } catch (error) {
      showError(error, "Ошибка авторизации");
      showLogin();
    }
  }

  db.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user || null;
  });

  /* =========================================================
     НАВИГАЦИЯ
  ========================================================= */

  $("tabs")?.addEventListener("click", event => {
    const button = event.target.closest("[data-tab]");
    if (!button) return;

    const tab = button.dataset.tab;

    document.querySelectorAll("#tabs button").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    document.querySelectorAll(".panel").forEach(panel => {
      panel.classList.toggle("active", panel.id === tab);
    });
  });

  /* =========================================================
     ЗАГРУЗКА ВСЕХ ДАННЫХ
  ========================================================= */

  async function loadAll() {
    try {
      const results = await Promise.all([
        selectRows("clubs", q => q.order("name")),
        selectRows("matches", q => q.order("match_date", { ascending: false })),
        selectRows("players", q => q.order("number")),
        selectRows("news", q => q.order("published_at", { ascending: false })),
        selectRows("stories", q => q.order("created_at", { ascending: false })),
        selectRows("standings", q => q.order("place")),
        selectRows("player_stats", q => q.order("value", { ascending: false })),
        selectRows("team_leaders", q => q.order("created_at", { ascending: false })),
        selectRows("albums", q => q.order("created_at", { ascending: false }))
      ]);

      [
        state.clubs,
        state.matches,
        state.players,
        state.news,
        state.stories,
        state.standings,
        state.stats,
        state.leaders,
        state.albums
      ] = results;

      await Promise.all([
        renderNews(),
        renderStories(),
        renderMatches(),
        renderClubs(),
        renderStandings(),
        renderPlayers(),
        renderStats(),
        renderLeaders(),
        renderAlbums(),
        loadSettings()
      ]);

    } catch (error) {
      showError(error, "Не удалось загрузить данные");
    }
  }

  /* =========================================================
     НОВОСТИ
  ========================================================= */

  function resetNewsForm() {
    resetFields(["nid", "ntitle", "ntext", "nfile"]);
    $("ntag").value = "Новость";
    $("ndate").value = "";

    $("nh").textContent = "Добавить новость";
    $("nsave").textContent = "СОХРАНИТЬ НОВОСТЬ";
    $("nreset").classList.add("hide");
  }

  async function renderNews() {
    const box = $("nlist");
    if (!box) return;

    box.innerHTML = state.news.length
      ? state.news.map(item => `
        <div class="item">
          ${imageHTML(item.image_path, item.title)}
          <div class="main">
            <b>${esc(item.title)}</b>
            <div class="sub">${esc(item.tag || "Новость")}</div>
            <div class="sub">${dateText(item.published_at)}</div>
          </div>
          ${itemActions(item.id, "news")}
        </div>
      `).join("")
      : empty("Новостей пока нет.");
  }

  async function saveNews() {
    const id = value("nid");
    const title = value("ntitle");
    const text = value("ntext");

    if (!title || !text) {
      toast("Заполни заголовок и текст.", true);
      return;
    }

    try {
      const old = state.news.find(item => String(item.id) === id);

      let imagePath = old?.image_path || null;
      const file = fileValue("nfile");

      if (file) {
        imagePath = await uploadFile(file, "news");
      }

      const published = value("ndate");

      const values = {
        title,
        tag: value("ntag") || "Новость",
        text,
        image_path: imagePath,
        published_at: published
          ? new Date(published).toISOString()
          : new Date().toISOString()
      };

      if (id) {
        await updateRow("news", id, values);
      } else {
        await insertRow("news", values);
      }

      resetNewsForm();
      await loadAll();
      toast("Новость сохранена.");

    } catch (error) {
      showError(error, "Ошибка сохранения новости");
    }
  }

  async function editNews(id) {
    const item = state.news.find(row => String(row.id) === String(id));
    if (!item) return;

    $("nid").value = item.id;
    $("ntitle").value = item.title || "";
    $("ntag").value = item.tag || "Новость";
    $("ndate").value = localDateTime(item.published_at);
    $("ntext").value = item.text || "";

    $("nh").textContent = "Редактировать новость";
    $("nsave").textContent = "СОХРАНИТЬ ИЗМЕНЕНИЯ";
    $("nreset").classList.remove("hide");

    document.querySelector('[data-tab="news"]')?.click();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  $("nsave")?.addEventListener("click", saveNews);
  $("nreset")?.addEventListener("click", resetNewsForm);

  /* =========================================================
     ИСТОРИИ
  ========================================================= */

  async function renderStories() {
    const box = $("slist");
    if (!box) return;

    box.innerHTML = state.stories.length
      ? state.stories.map(item => `
        <div class="item">
          ${imageHTML(item.image_path, "История")}
          <div class="main">
            <b>${esc(item.caption || "История")}</b>
            <div class="sub">До: ${dateText(item.expires_at)}</div>
          </div>
          ${itemActions(item.id, "story", false)}
        </div>
      `).join("")
      : empty("Историй пока нет.");
  }

  async function addStory() {
    const file = fileValue("sfile");

    if (!file) {
      toast("Выбери изображение.", true);
      return;
    }

    try {
      const path = await uploadFile(file, "stories");
      const hours = Number(value("shours")) || 24;

      const expires = new Date(
        Date.now() + hours * 60 * 60 * 1000
      ).toISOString();

      await insertRow("stories", {
        image_path: path,
        caption: value("scaption") || null,
        expires_at: expires
      });

      resetFields(["sfile", "scaption"]);
      await loadAll();

      toast("История опубликована.");

    } catch (error) {
      showError(error, "Ошибка публикации");
    }
  }

  $("sadd")?.addEventListener("click", addStory);

  /* =========================================================
     КОМАНДЫ И МАТЧИ
  ========================================================= */

  function clubName(id) {
    return state.clubs.find(
      club => String(club.id) === String(id)
    )?.name || "Команда";
  }

  function matchName(match) {
    return `${clubName(match.home_club_id)} — ${clubName(match.away_club_id)}`;
  }

  function fillClubSelects() {
    ["home", "away"].forEach(id => {
      const select = $(id);
      if (!select) return;

      const previous = select.value;

      select.innerHTML = `
        <option value="">Выбери команду</option>
        ${state.clubs.map(club => `
          <option value="${esc(club.id)}">${esc(club.name)}</option>
        `).join("")}
      `;

      if (previous) select.value = previous;
    });
  }

  async function renderClubs() {
    fillClubSelects();

    const box = $("clist");
    if (!box) return;

    box.innerHTML = state.clubs.length
      ? state.clubs.map(club => `
        <div class="item">
          ${imageHTML(club.logo_path, club.name)}
          <div class="main">
            <b>${esc(club.name)}</b>
            <div class="sub">${esc(club.city || "")}</div>
          </div>
          ${itemActions(club.id, "club", false)}
        </div>
      `).join("")
      : empty("Добавь первую команду.");
  }

  async function addClub() {
    const name = value("cname");

    if (!name) {
      toast("Введи название команды.", true);
      return;
    }

    try {
      const logo = fileValue("clogo");
      const logoPath = logo
        ? await uploadFile(logo, "clubs")
        : null;

      await insertRow("clubs", {
        name,
        city: value("ccity") || null,
        logo_path: logoPath
      });

      resetFields(["cname", "ccity", "clogo"]);
      await loadAll();

      toast("Команда добавлена.");

    } catch (error) {
      showError(error, "Ошибка добавления команды");
    }
  }

  $("cadd")?.addEventListener("click", addClub);

  function resetMatchForm() {
    resetFields([
      "mid", "home", "away", "mdate",
      "hs", "as", "comp", "venue"
    ]);

    $("mstatus").value = "scheduled";
    $("hs").value = 0;
    $("as").value = 0;

    $("mh").textContent = "Создать матч";
    $("msave").textContent = "СОХРАНИТЬ МАТЧ";
    $("mreset").classList.add("hide");
  }

  async function renderMatches() {
    const box = $("mlist");
    if (!box) return;

    fillClubSelects();

    box.innerHTML = state.matches.length
      ? state.matches.map(match => `
        <div class="item">
          <div class="main">
            <b>${esc(matchName(match))}</b>
            <div class="sub">${dateText(match.match_date)}</div>
            <div class="sub">
              ${esc(match.competition || "")}
              ${match.venue ? " · " + esc(match.venue) : ""}
            </div>
            <div class="sub">
              ${Number(match.home_score || 0)} : ${Number(match.away_score || 0)}
              · ${esc(match.status)}
            </div>
          </div>

          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <button class="btn alt" data-match="events" data-id="${esc(match.id)}">События</button>
            <button class="btn alt" data-match="roster" data-id="${esc(match.id)}">Состав</button>
            <button class="btn alt" data-match="edit" data-id="${esc(match.id)}">Изменить</button>
            <button class="btn red" data-match="delete" data-id="${esc(match.id)}">Удалить</button>
          </div>
        </div>
      `).join("")
      : empty("Матчей пока нет.");

    box.querySelectorAll("[data-match]").forEach(button => {
      button.addEventListener("click", async () => {
        const id = button.dataset.id;
        const action = button.dataset.match;

        try {
          if (action === "edit") editMatch(id);
          if (action === "events") await openEvents(id);
          if (action === "roster") await openRoster(id);
          if (action === "delete") await removeMatch(id);
        } catch (error) {
          showError(error);
        }
      });
    });
  }

  function editMatch(id) {
    const match = state.matches.find(
      item => String(item.id) === String(id)
    );

    if (!match) return;

    $("mid").value = match.id;
    $("home").value = match.home_club_id;
    $("away").value = match.away_club_id;
    $("mdate").value = localDateTime(match.match_date);
    $("mstatus").value = match.status || "scheduled";
    $("hs").value = match.home_score ?? 0;
    $("as").value = match.away_score ?? 0;
    $("comp").value = match.competition || "";
    $("venue").value = match.venue || "";

    $("mh").textContent = "Редактировать матч";
    $("msave").textContent = "СОХРАНИТЬ ИЗМЕНЕНИЯ";
    $("mreset").classList.remove("hide");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveMatch() {
    const id = value("mid");
    const home = value("home");
    const away = value("away");
    const date = value("mdate");

    if (!home || !away || !date) {
      toast("Выбери обе команды и дату матча.", true);
      return;
    }

    if (home === away) {
      toast("Команды должны отличаться.", true);
      return;
    }

    try {
      const values = {
        home_club_id: home,
        away_club_id: away,
        match_date: new Date(date).toISOString(),
        competition: value("comp") || null,
        venue: value("venue") || null,
        status: value("mstatus"),
        home_score: numberValue("hs"),
        away_score: numberValue("as")
      };

      if (id) {
        await updateRow("matches", id, values);
      } else {
        await insertRow("matches", values);
      }

      resetMatchForm();
      await loadAll();

      toast("Матч сохранён.");

    } catch (error) {
      showError(error, "Ошибка сохранения матча");
    }
  }

  async function removeMatch(id) {
    if (!confirm("Удалить матч? Связанные голы, удаления и составы также будут удалены при настроенном CASCADE.")) {
      return;
    }

    await deleteRow("matches", id);
    await loadAll();

    $("eventbox")?.classList.add("hide");
    $("rosterbox")?.classList.add("hide");

    toast("Матч удалён.");
  }

  $("msave")?.addEventListener("click", saveMatch);
  $("mreset")?.addEventListener("click", resetMatchForm);

  /* =========================================================
     СОБЫТИЯ МАТЧА — ГОЛЫ И УДАЛЕНИЯ
  ========================================================= */

  async function openEvents(matchId) {
    const match = state.matches.find(
      item => String(item.id) === String(matchId)
    );

    if (!match) throw new Error("Матч не найден.");

    $("eventid").value = match.id;
    $("eventtitle").textContent = `События: ${matchName(match)}`;

    $("eventbox").classList.remove("hide");
    $("rosterbox").classList.add("hide");

    await renderEvents();

    $("eventbox").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  async function renderEvents() {
    const matchId = value("eventid");
    const box = $("elist");

    const [goals, penalties] = await Promise.all([
      selectRows("match_goals", q =>
        q.eq("match_id", matchId).order("created_at")
      ),
      selectRows("match_penalties", q =>
        q.eq("match_id", matchId).order("created_at")
      )
    ]);

    const rows = [
      ...goals.map(item => ({
        ...item,
        kind: "goal",
        time: item.goal_time,
        title: `Гол · ${item.player_name}`,
        side: item.team_side,
        description: `${item.player_number ? "#" + item.player_number + " · " : ""}${item.strength || ""}`
      })),
      ...penalties.map(item => ({
        ...item,
        kind: "penalty",
        time: item.penalty_time,
        title: `Удаление · ${item.player_name}`,
        side: item.team_side,
        description: `${item.minutes} мин. · ${item.reason || ""}`
      }))
    ];

    rows.sort((a, b) =>
      String(a.time).localeCompare(String(b.time))
    );

    box.innerHTML = rows.length
      ? rows.map(item => `
        <div class="item">
          <div class="main">
            <b>${esc(item.time)} · ${esc(item.title)}</b>
            <div class="sub">
              ${item.side === "home" ? "Хозяева" : "Гости"}
              · ${esc(item.description)}
            </div>
          </div>
          <button class="btn red"
            data-event-delete="${esc(item.id)}"
            data-event-kind="${item.kind}">Удалить</button>
        </div>
      `).join("")
      : empty("Событий пока нет.");

    box.querySelectorAll("[data-event-delete]").forEach(button => {
      button.addEventListener("click", async () => {
        if (!confirm("Удалить событие?")) return;

        const table = button.dataset.eventKind === "goal"
          ? "match_goals"
          : "match_penalties";

        try {
          await deleteRow(table, button.dataset.eventDelete);
          await renderEvents();
          toast("Событие удалено.");
        } catch (error) {
          showError(error);
        }
      });
    });
  }

  async function addGoal() {
    const matchId = value("eventid");
    const time = value("gminute");
    const player = value("gplayer");

    if (!matchId || !time || !player) {
      toast("Укажи время и автора гола.", true);
      return;
    }

    try {
      await insertRow("match_goals", {
        match_id: matchId,
        team_side: value("gteam"),
        goal_time: time,
        player_number: value("gnum")
          ? numberValue("gnum")
          : null,
        player_name: player,
        strength: value("gstrength")
      });

      const match = state.matches.find(
        item => String(item.id) === matchId
      );

      if (match) {
        const field = value("gteam") === "home"
          ? "home_score"
          : "away_score";

        await updateRow("matches", matchId, {
          [field]: Number(match[field] || 0) + 1
        });
      }

      resetFields(["gminute", "gnum", "gplayer"]);

      await loadAll();
      await renderEvents();

      toast("Гол добавлен.");

    } catch (error) {
      showError(error, "Ошибка добавления гола");
    }
  }

  async function addPenalty() {
    const matchId = value("eventid");
    const time = value("ptime");
    const player = value("pplayer");

    if (!matchId || !time || !player) {
      toast("Укажи время и игрока.", true);
      return;
    }

    try {
      await insertRow("match_penalties", {
        match_id: matchId,
        team_side: value("pteam"),
        penalty_time: time,
        player_number: value("pnum")
          ? numberValue("pnum")
          : null,
        player_name: player,
        reason: value("preason") || null,
        minutes: numberValue("pminutes", 2)
      });

      resetFields(["ptime", "pnum", "pplayer", "preason"]);

      await renderEvents();
      toast("Удаление добавлено.");

    } catch (error) {
      showError(error, "Ошибка добавления удаления");
    }
  }

  $("gadd")?.addEventListener("click", addGoal);
  $("padd")?.addEventListener("click", addPenalty);

  /* =========================================================
     СОСТАВЫ МАТЧА
  ========================================================= */

  function fillRosterSelect(id) {
    const select = $(id);
    if (!select) return;

    select.innerHTML = `
      <option value="">Выбери игрока</option>
      ${state.players.map(player => `
        <option value="${player.id}">
          #${player.number} · ${esc(player.name)}
        </option>
      `).join("")}
    `;
  }

  async function openRoster(matchId) {
    const match = state.matches.find(
      item => String(item.id) === String(matchId)
    );

    if (!match) throw new Error("Матч не найден.");

    $("rosterMatchId").value = match.id;

    $("rosterbox").classList.remove("hide");
    $("eventbox").classList.add("hide");

    fillRosterSelect("rosterHomePlayer");
    fillRosterSelect("rosterAwayPlayer");

    await renderRoster();

    $("rosterbox").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  async function renderRoster() {
    const matchId = value("rosterMatchId");

    const rows = await selectRows("match_roster", q =>
      q.eq("match_id", matchId).order("player_number")
    );

    ["home", "away"].forEach(side => {
      const box = side === "home"
        ? $("rosterHomeList")
        : $("rosterAwayList");

      const items = rows.filter(row => row.team_side === side);

      box.innerHTML = items.length
        ? items.map(row => `
          <div class="item">
            <div class="main">
              <b>#${row.player_number ?? "—"} · ${esc(row.player_name)}</b>
              <div class="sub">${esc(row.position || "")}</div>
            </div>
            <button class="btn red"
              data-roster-delete="${esc(row.id)}">Удалить</button>
          </div>
        `).join("")
        : empty("Игроки не добавлены.");
    });

    document.querySelectorAll("[data-roster-delete]").forEach(button => {
      button.addEventListener("click", async () => {
        try {
          await deleteRow("match_roster", button.dataset.rosterDelete);
          await renderRoster();
          toast("Игрок удалён из состава.");
        } catch (error) {
          showError(error);
        }
      });
    });
  }

  async function addRosterPlayer(side) {
    const prefix = side === "home" ? "rosterHome" : "rosterAway";
    const playerId = $(`${prefix}Player`).value;

    if (!playerId) {
      toast("Выбери игрока.", true);
      return;
    }

    const player = state.players.find(
      item => String(item.id) === String(playerId)
    );

    if (!player) {
      toast("Игрок не найден.", true);
      return;
    }

    const matchId = value("rosterMatchId");

    try {
      const existing = await selectRows("match_roster", q =>
        q.eq("match_id", matchId)
          .eq("team_side", side)
          .eq("player_name", player.name)
      );

      if (existing.length) {
        toast("Игрок уже есть в составе.", true);
        return;
      }

      await insertRow("match_roster", {
        match_id: matchId,
        team_side: side,
        player_number: $(`${prefix}Number`).value
          ? numberValue(`${prefix}Number`)
          : player.number,
        player_name: player.name,
        position: value(`${prefix}Role`)
      });

      resetFields([`${prefix}Number`]);

      await renderRoster();
      toast("Игрок добавлен в состав.");

    } catch (error) {
      showError(error, "Ошибка добавления игрока");
    }
  }

  $("rosterHomeAdd")?.addEventListener("click", () => addRosterPlayer("home"));
  $("rosterAwayAdd")?.addEventListener("click", () => addRosterPlayer("away"));

  /* =========================================================
     ТУРНИРНАЯ ТАБЛИЦА
  ========================================================= */

  function resetStandingForm() {
    state.editingStanding = null;

    [
      "tname", "tgames", "twins", "twins_ot",
      "twins_so", "tlosses", "tlosses_ot",
      "tlosses_so", "tpoints"
    ].forEach(id => {
      if ($(id)) $(id).value = 0;
    });

    $("tplace").value = 1;
    $("tname").value = "";

    $("tadd").textContent = "ДОБАВИТЬ";
  }

  async function renderStandings() {
    const box = $("tlist");
    if (!box) return;

    box.innerHTML = state.standings.length
      ? state.standings.map(item => `
        <div class="item">
          <div class="main">
            <b>${item.place ?? "—"}. ${esc(item.team_name)}</b>
            <div class="sub">
              И: ${item.games ?? 0} ·
              В: ${item.wins ?? 0} ·
              ВО: ${item.overtime_wins ?? item.wins_ot ?? 0} ·
              ВБ: ${item.shootout_wins ?? item.wins_so ?? 0}
            </div>
            <div class="sub">
              П: ${item.losses ?? 0} ·
              ПО: ${item.overtime_losses ?? item.losses_ot ?? 0} ·
              ПБ: ${item.shootout_losses ?? item.losses_so ?? 0} ·
              Очки: ${item.points ?? 0}
            </div>
          </div>
          ${itemActions(item.id, "standing")}
        </div>
      `).join("")
      : empty("Таблица пока пуста.");
  }

  function editStanding(id) {
    const item = state.standings.find(
      row => String(row.id) === String(id)
    );

    if (!item) return;

    state.editingStanding = item.id;

    $("tplace").value = item.place ?? item.position ?? 1;
    $("tname").value = item.team_name || item.team || "";
    $("tgames").value = item.games ?? 0;
    $("twins").value = item.wins ?? 0;
    $("twins_ot").value = item.overtime_wins ?? item.wins_ot ?? 0;
    $("twins_so").value = item.shootout_wins ?? item.wins_so ?? 0;
    $("tlosses").value = item.losses ?? 0;
    $("tlosses_ot").value = item.overtime_losses ?? item.losses_ot ?? 0;
    $("tlosses_so").value = item.shootout_losses ?? item.losses_so ?? 0;
    $("tpoints").value = item.points ?? 0;

    $("tadd").textContent = "СОХРАНИТЬ ИЗМЕНЕНИЯ";

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveStanding() {
    const name = value("tname");

    if (!name) {
      toast("Введи название команды.", true);
      return;
    }

    const winsOT = numberValue("twins_ot");
    const winsSO = numberValue("twins_so");
    const lossesOT = numberValue("tlosses_ot");
    const lossesSO = numberValue("tlosses_so");

    const values = {
      place: numberValue("tplace"),
      position: numberValue("tplace"),
      team_name: name,
      team: name,
      games: numberValue("tgames"),
      wins: numberValue("twins"),
      overtime_wins: winsOT,
      shootout_wins: winsSO,
      losses: numberValue("tlosses"),
      overtime_losses: lossesOT,
      shootout_losses: lossesSO,
      wins_ot: winsOT,
      wins_so: winsSO,
      losses_ot: lossesOT,
      losses_so: lossesSO,
      points: numberValue("tpoints")
    };

    try {
      if (state.editingStanding) {
        await updateRow("standings", state.editingStanding, values);
      } else {
        await insertRow("standings", values);
      }

      resetStandingForm();
      await loadAll();
      toast("Турнирная таблица сохранена.");

    } catch (error) {
      showError(error, "Ошибка сохранения таблицы");
    }
  }

  $("tadd")?.addEventListener("click", saveStanding);

  /* =========================================================
     ИГРОКИ
  ========================================================= */

  function resetPlayerForm() {
    resetFields([
      "pid", "pname", "pnumber", "pfile"
    ]);

    $("pposition").value = "Нападающий";
    $("pgames").value = 0;
    $("pgoals").value = 0;
    $("passists").value = 0;
    $("ppoints").value = 0;

    $("ph").textContent = "Добавить игрока";
    $("psave").textContent = "СОХРАНИТЬ ИГРОКА";
    $("preset").classList.add("hide");
  }

  async function renderPlayers() {
    const box = $("plist");
    if (!box) return;

    box.innerHTML = state.players.length
      ? state.players.map(player => `
        <div class="item">
          ${imageHTML(player.photo_url, player.name)}
          <div class="main">
            <b>#${player.number} · ${esc(player.name)}</b>
            <div class="sub">${esc(player.position)}</div>
          </div>
          ${itemActions(player.id, "player")}
        </div>
      `).join("")
      : empty("Игроков пока нет.");
  }

  async function editPlayer(id) {
    const player = state.players.find(
      item => String(item.id) === String(id)
    );

    if (!player) return;

    $("pid").value = player.id;
    $("pname").value = player.name || "";
    $("pnumber").value = player.number ?? "";
    $("pposition").value = player.position || "Нападающий";

    const stats = await selectRows("player_season_stats", q =>
      q.eq("player_id", player.id)
        .order("created_at", { ascending: false })
        .limit(1)
    );

    const row = stats[0] || {};

    $("pgames").value = row.games ?? 0;
    $("pgoals").value = row.goals ?? 0;
    $("passists").value = row.assists ?? 0;
    $("ppoints").value = row.points ?? 0;

    $("ph").textContent = "Редактировать игрока";
    $("psave").textContent = "СОХРАНИТЬ ИЗМЕНЕНИЯ";
    $("preset").classList.remove("hide");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function savePlayer() {
    const id = value("pid");
    const name = value("pname");
    const number = value("pnumber");

    if (!name || number === "") {
      toast("Заполни имя и игровой номер.", true);
      return;
    }

    try {
      const old = state.players.find(
        item => String(item.id) === id
      );

      let photo = old?.photo_url || null;

      const file = fileValue("pfile");
      if (file) photo = imageUrl(
        await uploadFile(file, "players")
      );

      const values = {
        name,
        number: Number(number),
        position: value("pposition"),
        photo_url: photo
      };

      let playerId;

      if (id) {
        await updateRow("players", id, values);
        playerId = Number(id);
      } else {
        const created = await insertRow("players", values);
        playerId = created.id;
      }

      const season = "2026/2027";

      const existingStats = await selectRows(
        "player_season_stats",
        q => q.eq("player_id", playerId).eq("season", season)
      );

      const statsValues = {
        player_id: playerId,
        season,
        games: numberValue("pgames"),
        goals: numberValue("pgoals"),
        assists: numberValue("passists"),
        points: numberValue("ppoints")
      };

      if (existingStats.length) {
        await updateRow(
          "player_season_stats",
          existingStats[0].id,
          statsValues
        );
      } else {
        await insertRow("player_season_stats", statsValues);
      }

      resetPlayerForm();
      await loadAll();

      toast("Игрок сохранён.");

    } catch (error) {
      showError(error, "Ошибка сохранения игрока");
    }
  }

  $("psave")?.addEventListener("click", savePlayer);
  $("preset")?.addEventListener("click", resetPlayerForm);

  /* =========================================================
     СТАТИСТИКА ИГРОКОВ
  ========================================================= */

  function resetStatForm() {
    state.editingStat = null;

    resetFields(["snum", "sname", "spos"]);
    $("svalue").value = 0;
    $("stype").value = "scorers";
    $("statadd").textContent = "ДОБАВИТЬ";
  }

  async function renderStats() {
    const box = $("statlist");
    if (!box) return;

    box.innerHTML = state.stats.length
      ? state.stats.map(item => `
        <div class="item">
          <div class="main">
            <b>${esc(item.player_name)}</b>
            <div class="sub">
              ${esc(item.stat_type)}
              · ${esc(item.position || "")}
              · ${item.value ?? 0}
            </div>
          </div>
          ${itemActions(item.id, "stat")}
        </div>
      `).join("")
      : empty("Статистика пока не заполнена.");
  }

  function editStat(id) {
    const item = state.stats.find(
      row => String(row.id) === String(id)
    );

    if (!item) return;

    state.editingStat = item.id;

    $("stype").value = item.stat_type || "scorers";
    $("snum").value = item.player_number ?? "";
    $("sname").value = item.player_name || "";
    $("spos").value = item.position || "";
    $("svalue").value = item.value ?? 0;

    $("statadd").textContent = "СОХРАНИТЬ ИЗМЕНЕНИЯ";
  }

  async function saveStat() {
    const name = value("sname");

    if (!name) {
      toast("Введи имя игрока.", true);
      return;
    }

    const values = {
      stat_type: value("stype"),
      category: value("stype"),
      player_name: name,
      player_number: value("snum")
        ? numberValue("snum")
        : null,
      position: value("spos") || null,
      value: numberValue("svalue")
    };

    try {
      if (state.editingStat) {
        await updateRow("player_stats", state.editingStat, values);
      } else {
        await insertRow("player_stats", values);
      }

      resetStatForm();
      await loadAll();

      toast("Статистика сохранена.");

    } catch (error) {
      showError(error, "Ошибка статистики");
    }
  }

  $("statadd")?.addEventListener("click", saveStat);

  /* =========================================================
     КАРТОЧКИ ЛИДЕРОВ
  ========================================================= */

  function resetLeaderForm() {
    state.editingLeader = null;

    resetFields(["lnum", "lname", "lpos", "lstat", "lfile"]);
    $("ltype").value = "scorer";
    $("ladd").textContent = "СОХРАНИТЬ КАРТОЧКУ";
  }

  async function renderLeaders() {
    const box = $("llist");
    if (!box) return;

    box.innerHTML = state.leaders.length
      ? state.leaders.map(item => `
        <div class="item">
          ${imageHTML(item.image_path, item.player_name)}
          <div class="main">
            <b>${esc(item.player_name)}</b>
            <div class="sub">
              ${esc(item.leader_type)}
              · ${esc(item.statistic || "")}
            </div>
          </div>
          ${itemActions(item.id, "leader")}
        </div>
      `).join("")
      : empty("Карточек лидеров пока нет.");
  }

  function editLeader(id) {
    const item = state.leaders.find(
      row => String(row.id) === String(id)
    );

    if (!item) return;

    state.editingLeader = item.id;

    $("ltype").value = item.leader_type || "scorer";
    $("lnum").value = item.player_number ?? "";
    $("lname").value = item.player_name || "";
    $("lpos").value = item.position || "";
    $("lstat").value = item.statistic || "";

    $("ladd").textContent = "СОХРАНИТЬ ИЗМЕНЕНИЯ";
  }

  async function saveLeader() {
    const name = value("lname");

    if (!name) {
      toast("Введи имя игрока.", true);
      return;
    }

    try {
      const old = state.leaders.find(
        item => String(item.id) === String(state.editingLeader)
      );

      let imagePath = old?.image_path || null;

      const file = fileValue("lfile");
      if (file) imagePath = await uploadFile(file, "leaders");

      const values = {
        leader_type: value("ltype"),
        player_name: name,
        player_number: value("lnum")
          ? numberValue("lnum")
          : 0,
        position: value("lpos"),
        statistic: value("lstat"),
        image_path: imagePath
      };

      if (state.editingLeader) {
        await updateRow("team_leaders", state.editingLeader, values);
      } else {
        await insertRow("team_leaders", values);
      }

      resetLeaderForm();
      await loadAll();

      toast("Карточка лидера сохранена.");

    } catch (error) {
      showError(error, "Ошибка сохранения карточки");
    }
  }

  $("ladd")?.addEventListener("click", saveLeader);

  /* =========================================================
     АЛЬБОМЫ И ФОТОГРАФИИ
  ========================================================= */

  async function renderAlbums() {
    const box = $("alist");
    if (!box) return;

    const photoRows = await selectRows("album_photos");

    box.innerHTML = state.albums.length
      ? state.albums.map(album => {
        const count = photoRows.filter(
          photo => photo.album_id === album.id
        ).length;

        return `
          <div class="item">
            ${imageHTML(album.cover_path, album.title)}
            <div class="main">
              <b>${esc(album.title)}</b>
              <div class="sub">${dateOnly(album.album_date)}</div>
              <div class="sub">Фотографий: ${count}</div>
            </div>
            ${itemActions(album.id, "album", false)}
          </div>
        `;
      }).join("")
      : empty("Альбомов пока нет.");
  }

  async function addAlbum() {
    const title = value("atitle");

    if (!title) {
      toast("Введи название альбома.", true);
      return;
    }

    const photos = [...($("aphotos")?.files || [])];
    const cover = fileValue("acover");

    if (!cover && !photos.length) {
      toast("Добавь обложку или фотографии.", true);
      return;
    }

    try {
      const coverPath = cover
        ? await uploadFile(cover, "albums/covers")
        : await uploadFile(photos[0], "albums/covers");

      const album = await insertRow("albums", {
        title,
        album_date: value("adate") || null,
        cover_path: coverPath
      });

      const files = photos.length ? photos : (cover ? [cover] : []);

      for (let i = 0; i < files.length; i++) {
        const path = await uploadFile(files[i], "albums/photos");

        await insertRow("album_photos", {
          album_id: album.id,
          image_path: path,
          sort_order: i
        });
      }

      resetFields(["atitle", "adate", "acover", "aphotos"]);

      await loadAll();
      toast("Фотоальбом создан.");

    } catch (error) {
      showError(error, "Ошибка создания альбома");
    }
  }

  $("aadd")?.addEventListener("click", addAlbum);

  /* =========================================================
     НАСТРОЙКИ САЙТА
  ========================================================= */

  async function loadSettings() {
    const rows = await selectRows("site_settings", q =>
      q.order("created_at", { ascending: true }).limit(1)
    );

    state.settings = rows[0] || null;

    const settings = state.settings;

    if (!settings) return;

    $("setname").value = settings.team_name || "ХК Челны 2011";
    $("setsubtitle").value = settings.subtitle || "";
    $("setcity").value = settings.city || "";

    $("setprimary").value = settings.primary_color || "#000056";
    $("setaccent").value = settings.accent_color || "#0875dc";
    $("setgold").value = settings.gold_color || "#ffcd00";
  }

  async function saveSettings() {
    try {
      const old = state.settings;

      let logoPath = old?.logo_path || null;

      const file = fileValue("setlogo");
      if (file) {
        logoPath = await uploadFile(file, "site");
      }

      const values = {
        team_name: value("setname"),
        subtitle: value("setsubtitle"),
        city: value("setcity"),
        logo_path: logoPath,
        primary_color: value("setprimary"),
        accent_color: value("setaccent"),
        gold_color: value("setgold"),
        white_color: "#ffffff",
        updated_at: new Date().toISOString()
      };

      if (old?.id) {
        await updateRow("site_settings", old.id, values);
      } else {
        const created = await insertRow("site_settings", values);
        state.settings = created;
      }

      await loadSettings();
      toast("Настройки сохранены.");

    } catch (error) {
      showError(error, "Ошибка сохранения настроек");
    }
  }

  $("setsave")?.addEventListener("click", saveSettings);

  /* =========================================================
     УДАЛЕНИЕ И РЕДАКТИРОВАНИЕ
  ========================================================= */

  async function handleAction(action, type, id) {
    if (action === "edit") {
      if (type === "news") return editNews(id);
      if (type === "player") return editPlayer(id);
      if (type === "standing") return editStanding(id);
      if (type === "stat") return editStat(id);
      if (type === "leader") return editLeader(id);
      return;
    }

    if (action !== "delete") return;

    if (!confirm("Точно удалить эту запись?")) return;

    if (type === "news") {
      await deleteRow("news", id);
    }

    if (type === "story") {
      await deleteRow("stories", id);
    }

    if (type === "club") {
      const used = state.matches.some(match =>
        String(match.home_club_id) === String(id) ||
        String(match.away_club_id) === String(id)
      );

      if (used) {
        toast("Нельзя удалить команду, участвующую в матчах.", true);
        return;
      }

      await deleteRow("clubs", id);
    }

    if (type === "standing") {
      await deleteRow("standings", id);
      if (String(state.editingStanding) === String(id)) {
        resetStandingForm();
      }
    }

    if (type === "player") {
      const linked = await selectRows("player_season_stats", q =>
        q.eq("player_id", id)
      );

      if (linked.length) {
        for (const row of linked) {
          await deleteRow("player_season_stats", row.id);
        }
      }

      await deleteRow("players", id);
    }

    if (type === "stat") {
      await deleteRow("player_stats", id);
    }

    if (type === "leader") {
      await deleteRow("team_leaders", id);
    }

    if (type === "album") {
      const photos = await selectRows("album_photos", q =>
        q.eq("album_id", id)
      );

      for (const photo of photos) {
        await deleteRow("album_photos", photo.id);
      }

      await deleteRow("albums", id);
    }

    await loadAll();
    toast("Запись удалена.");
  }

  [
    "nlist",
    "slist",
    "clist",
    "tlist",
    "plist",
    "statlist",
    "llist",
    "alist"
  ].forEach(id => bindAction(id, handleAction));

  /* =========================================================
     ЗАПУСК
  ========================================================= */

  $("eventbox")?.classList.add("hide");
  $("rosterbox")?.classList.add("hide");

  checkAuth();

})();
