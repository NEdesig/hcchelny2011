/* =========================================================
   ХК ЧЕЛНЫ 2011 — ADMIN PANEL
   admin.js
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       CONFIG
       ===================================================== */

    const CONFIG = window.SITE_CONFIG || {};

    const SUPABASE_URL =
        CONFIG.SUPABASE_URL ||
        CONFIG.supabaseUrl;

    const SUPABASE_KEY =
        CONFIG.SUPABASE_KEY ||
        CONFIG.supabaseKey;

    const STORAGE_BUCKET =
        CONFIG.STORAGE_BUCKET ||
        "site-media";

    const DEFAULTS = {
        teamName: "ХК Челны 2011",
        subtitle: "НАБЕРЕЖНЫЕ ЧЕЛНЫ",
        colors: {
            primary: "#000056",
            accent: "#ffcd00",
            background: "#050b22",
            surface: "#0d1738",
            text: "#ffffff",
            muted: "#aab5d5",
            border: "#26345f"
        }
    };

    let db = null;
    let currentUser = null;

    let state = {
        settings: null,
        teams: [],
        venues: [],
        matches: [],
        players: [],
        stats: [],
        news: [],
        albums: [],
        products: [],
        standings: [],
        birthdays: [],
        achievements: [],
        icons: []
    };

    let currentPlayerFilter = "all";


    /* =====================================================
       DOM
       ===================================================== */

    const $ = (id) => document.getElementById(id);

    const $$ = (selector, root = document) =>
        Array.from(root.querySelectorAll(selector));


    /* =====================================================
       BASIC HELPERS
       ===================================================== */

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }


    function formatDateTime(date, time) {
        if (!date) return "—";

        return `${formatDate(date)}${time ? ` · ${String(time).slice(0, 5)}` : ""}`;
    }


    function formatMoney(value) {
        return `${Number(value || 0).toLocaleString("ru-RU")} ₽`;
    }


    function getTeam(id) {
        return state.teams.find(
            team => String(team.id) === String(id)
        );
    }


    function getPlayer(id) {
        return state.players.find(
            player => String(player.id) === String(id)
        );
    }


    function getMatch(id) {
        return state.matches.find(
            match => String(match.id) === String(id)
        );
    }


    function getTeamName(id) {
        return getTeam(id)?.name || "—";
    }


    function positionName(position) {
        const names = {
            goalie: "Вратарь",
            defense: "Защитник",
            forward: "Нападающий"
        };

        return names[position] || position || "—";
    }


    function statusName(status) {
        const names = {
            scheduled: "Запланирован",
            live: "Идёт",
            finished: "Завершён",
            cancelled: "Отменён"
        };

        return names[status] || status || "—";
    }


    function playerRoleName(role) {
        if (role === "K") return "К";
        if (role === "A") return "А";
        return "";
    }


    /* =====================================================
       TOAST
       ===================================================== */

    function toast(message, type = "success") {
        const element = $("adminToast");

        if (!element) return;

        element.textContent = message;

        element.classList.remove(
            "show",
            "success",
            "error",
            "warning"
        );

        element.classList.add("show", type);

        clearTimeout(toast.timer);

        toast.timer = setTimeout(() => {
            element.classList.remove("show");
        }, 3000);
    }


    /* =====================================================
       MODAL
       ===================================================== */

    function openModal(title, content) {
        const modal = $("adminModal");
        const modalTitle = $("adminModalTitle");
        const modalContent = $("adminModalContent");

        if (!modal || !modalTitle || !modalContent) return;

        modalTitle.textContent = title;
        modalContent.innerHTML = content;

        modal.classList.remove("hidden");
        document.body.classList.add("modal-open");
    }


    function closeModal() {
        const modal = $("adminModal");

        if (!modal) return;

        modal.classList.add("hidden");
        document.body.classList.remove("modal-open");
    }


    window.closeAdminModal = closeModal;


    /* =====================================================
       SUPABASE
       ===================================================== */

    function initSupabase() {
        if (!SUPABASE_URL || !SUPABASE_KEY) {
            throw new Error(
                "Не найдены SUPABASE_URL или SUPABASE_KEY в config.js"
            );
        }

        if (!window.supabase) {
            throw new Error(
                "Supabase JS не загрузился."
            );
        }

        db = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );
    }


    async function select(table, query = "*") {
        const { data, error } = await db
            .from(table)
            .select(query);

        if (error) throw error;

        return data || [];
    }


    async function insert(table, values) {
        const { data, error } = await db
            .from(table)
            .insert(values)
            .select();

        if (error) throw error;

        return data || [];
    }


    async function update(table, id, values) {
        const { data, error } = await db
            .from(table)
            .update(values)
            .eq("id", id)
            .select();

        if (error) throw error;

        return data || [];
    }


    async function remove(table, id) {
        const { error } = await db
            .from(table)
            .delete()
            .eq("id", id);

        if (error) throw error;
    }


    /* =====================================================
       AUTH
       ===================================================== */

    async function checkAuth() {
        const {
            data: {
                session
            }
        } = await db.auth.getSession();

        if (session?.user) {
            currentUser = session.user;
            showAdmin();
        } else {
            showLogin();
        }

        db.auth.onAuthStateChange(
            async (event, sessionData) => {

                if (sessionData?.user) {
                    currentUser = sessionData.user;
                    showAdmin();
                } else {
                    currentUser = null;
                    showLogin();
                }
            }
        );
    }


    function showLogin() {
        $("adminLoader")?.classList.add("hidden");
        $("adminApp")?.classList.add("hidden");
        $("loginScreen")?.classList.remove("hidden");
    }


    async function showAdmin() {
        $("loginScreen")?.classList.add("hidden");
        $("adminLoader")?.classList.add("hidden");
        $("adminApp")?.classList.remove("hidden");

        if ($("adminUserEmail")) {
            $("adminUserEmail").textContent =
                currentUser?.email || "";
        }

        await loadEverything();
    }


    async function login(event) {
        event?.preventDefault();

        const email = $("loginEmail")?.value.trim();
        const password = $("loginPassword")?.value;

        const errorElement = $("loginError");

        if (errorElement) {
            errorElement.textContent = "";
        }

        if (!email || !password) {
            if (errorElement) {
                errorElement.textContent =
                    "Введите email и пароль.";
            }

            return;
        }

        try {
            const {
                error
            } = await db.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

        } catch (error) {

            console.error(error);

            if (errorElement) {
                errorElement.textContent =
                    error.message ||
                    "Не удалось войти.";
            }
        }
    }


    async function logout() {
        try {
            await db.auth.signOut();
        } catch (error) {
            console.error(error);
        }
    }


    /* =====================================================
       LOADING
       ===================================================== */

    async function loadEverything() {

        setLoaderText("Загрузка данных...");

        try {

            const results = await Promise.allSettled([
                loadSettings(),
                loadTeams(),
                loadMatches(),
                loadPlayers(),
                loadStats(),
                loadNews(),
                loadAlbums(),
                loadProducts(),
                loadStandings(),
                loadBirthdays(),
                loadAchievements()
            ]);

            results.forEach(result => {
                if (result.status === "rejected") {
                    console.error(
                        "Ошибка загрузки:",
                        result.reason
                    );
                }
            });

            await renderEverything();

        } catch (error) {
            console.error(error);
            toast(
                "Не удалось загрузить данные.",
                "error"
            );
        }

        setLoaderText("");
    }


    function setLoaderText(text) {
        const element = document.querySelector(".loader-text");

        if (element) {
            element.textContent =
                text || "Загрузка админ-панели...";
        }
    }


    /* =====================================================
       SETTINGS
       ===================================================== */

    async function loadSettings() {

        try {

            const rows = await select(
                "settings",
                "*"
            );

            state.settings =
                rows[0] || {
                    id: 1,
                    team_name: DEFAULTS.teamName,
                    logo_url: null,
                    primary_color: DEFAULTS.colors.primary,
                    accent_color: DEFAULTS.colors.accent,
                    background_color: DEFAULTS.colors.background,
                    text_color: DEFAULTS.colors.text,
                    font_main: "Stapel",
                    font_heading: "Stapel",
                    font_secondary: "Stengazeta",
                    icons: {},
                    homepage: {}
                };

        } catch (error) {

            console.error(
                "settings:",
                error
            );

            state.settings = {
                id: 1,
                team_name: DEFAULTS.teamName,
                logo_url: null,
                primary_color: DEFAULTS.colors.primary,
                accent_color: DEFAULTS.colors.accent,
                background_color: DEFAULTS.colors.background,
                text_color: DEFAULTS.colors.text,
                icons: {},
                homepage: {}
            };
        }
    }


    async function saveSettingsData(values) {

        const {
            error
        } = await db
            .from("settings")
            .upsert({
                id: 1,
                ...values,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;

        await loadSettings();
    }


    /* =====================================================
       LOAD DATA
       ===================================================== */

    async function loadTeams() {
        state.teams = await select(
            "teams",
            "*"
        );
    }


    async function loadMatches() {
        state.matches = await select(
            "matches",
            "*"
        );

        state.matches.sort(
            (a, b) => {

                const da =
                    `${a.match_date} ${a.match_time || ""}`;

                const db =
                    `${b.match_date} ${b.match_time || ""}`;

                return da.localeCompare(db);
            }
        );
    }


    async function loadPlayers() {
        state.players = await select(
            "players",
            "*"
        );

        state.players.sort(
            (a, b) =>
                Number(a.number || 999) -
                Number(b.number || 999)
        );
    }


    async function loadStats() {
        state.stats = await select(
            "player_season_stats",
            "*"
        );
    }


    async function loadNews() {
        state.news = await select(
            "news",
            "*"
        );

        state.news.sort(
            (a, b) =>
                new Date(b.published_at || b.created_at) -
                new Date(a.published_at || a.created_at)
        );
    }


    async function loadAlbums() {
        state.albums = await select(
            "albums",
            "*"
        );
    }


    async function loadProducts() {
        state.products = await select(
            "products",
            "*"
        );

        state.products.sort(
            (a, b) =>
                new Date(b.created_at) -
                new Date(a.created_at)
        );
    }


    async function loadStandings() {
        state.standings = await select(
            "standings",
            "*"
        );

        state.standings.sort(
            (a, b) =>
                Number(a.place || 999) -
                Number(b.place || 999)
        );
    }


    async function loadBirthdays() {
        state.birthdays = await select(
            "birthdays",
            "*"
        );
    }


    async function loadAchievements() {
        state.achievements = await select(
            "achievements",
            "*"
        );

        state.achievements.sort(
            (a, b) =>
                Number(a.sort_order || 0) -
                Number(b.sort_order || 0)
        );
    }


    /* =====================================================
       RENDER EVERYTHING
       ===================================================== */

    async function renderEverything() {

        renderDashboard();

        renderHomepage();

        renderMatches();

        renderPlayers();

        renderStats();

        renderNews();

        renderAlbums();

        renderProducts();

        renderStandings();

        renderBirthdays();

        renderAchievements();

        renderRegistry();

        renderDesign();

        renderHomepageSelects();
    }


    /* =====================================================
       DASHBOARD
       ===================================================== */

    function renderDashboard() {

        const statsElement =
            $("dashboardStats");

        if (statsElement) {

            statsElement.innerHTML = `

                <div class="dashboard-stat">
                    <strong>${state.matches.length}</strong>
                    <span>Матчей</span>
                </div>

                <div class="dashboard-stat">
                    <strong>${state.players.length}</strong>
                    <span>Игроков</span>
                </div>

                <div class="dashboard-stat">
                    <strong>${state.news.length}</strong>
                    <span>Новостей</span>
                </div>

                <div class="dashboard-stat">
                    <strong>${state.albums.length}</strong>
                    <span>Альбомов</span>
                </div>

            `;
        }


        const now = new Date();

        const future =
            state.matches
                .filter(match =>
                    new Date(
                        `${match.match_date}T${match.match_time || "00:00"}`
                    ) >= now
                )
                .sort(
                    (a, b) =>
                        new Date(`${a.match_date}T${a.match_time || "00:00"}`) -
                        new Date(`${b.match_date}T${b.match_time || "00:00"}`)
                )[0];


        if ($("dashboardNextMatch")) {

            if (!future) {

                $("dashboardNextMatch").textContent =
                    "Ближайших матчей нет.";

            } else {

                $("dashboardNextMatch").innerHTML = `
                    <strong>
                        ${escapeHTML(matchTeamsText(future))}
                    </strong>
                    <br>
                    ${formatDateTime(
                        future.match_date,
                        future.match_time
                    )}
                    ${future.tournament
                        ? `<br>${escapeHTML(future.tournament)}`
                        : ""}
                `;
            }
        }


        if ($("dashboardPlayers")) {
            $("dashboardPlayers").textContent =
                `${state.players.length} игроков`;
        }


        if ($("dashboardNews")) {
            $("dashboardNews").textContent =
                `${state.news.length} публикаций`;
        }


        if ($("dashboardAlbums")) {
            $("dashboardAlbums").textContent =
                `${state.albums.length} альбомов`;
        }
    }


    function matchTeamsText(match) {

        const home =
            getTeamName(match.home_team_id);

        const away =
            getTeamName(match.away_team_id);

        return `${home} — ${away}`;
    }


    /* =====================================================
       HOMEPAGE
       ===================================================== */

    function renderHomepage() {

        const homepage =
            state.settings?.homepage || {};

        if ($("homepageShowLastMatch")) {
            $("homepageShowLastMatch").checked =
                homepage.showLastMatch !== false;
        }

        if ($("homepageShowNews")) {
            $("homepageShowNews").checked =
                homepage.showNews !== false;
        }

        if ($("homepageShowLeaders")) {
            $("homepageShowLeaders").checked =
                homepage.showLeaders !== false;
        }

        if ($("homepageShowAchievements")) {
            $("homepageShowAchievements").checked =
                homepage.showAchievements !== false;
        }

        if ($("homepageShowBirthdays")) {
            $("homepageShowBirthdays").checked =
                homepage.showBirthdays !== false;
        }


        const blocks =
            $("homepageBlocks");

        if (blocks) {

            blocks.innerHTML = `

                <div class="admin-list-item">
                    <strong>Главный матч</strong>
                    <span>Верхняя карточка</span>
                </div>

                <div class="admin-list-item">
                    <strong>Последний матч</strong>
                    <span>Последняя сыгранная встреча</span>
                </div>

                <div class="admin-list-item">
                    <strong>ТОП-3</strong>
                    <span>Лидеры команды</span>
                </div>

                <div class="admin-list-item">
                    <strong>Новости</strong>
                    <span>Последние публикации</span>
                </div>

                <div class="admin-list-item">
                    <strong>Достижения</strong>
                    <span>Кубки и турниры</span>
                </div>

                <div class="admin-list-item">
                    <strong>Дни рождения</strong>
                    <span>Поздравления игроков</span>
                </div>

            `;
        }
    }


    function renderHomepageSelects() {

        const selectElement =
            $("homepageHeroMatch");

        if (!selectElement) return;

        const current =
            state.settings?.homepage?.featuredMatchId ||
            "";

        selectElement.innerHTML = `
            <option value="">Автоматически</option>
            ${state.matches.map(match => `
                <option
                    value="${match.id}"
                    ${String(current) === String(match.id) ? "selected" : ""}
                >
                    ${escapeHTML(matchTeamsText(match))}
                    · ${formatDateTime(
                        match.match_date,
                        match.match_time
                    )}
                </option>
            `).join("")}
        `;
    }


    async function saveHomepage() {

        try {

            const homepage = {
                ...(state.settings?.homepage || {}),

                featuredMatchId:
                    $("homepageHeroMatch")?.value || null,

                showLastMatch:
                    $("homepageShowLastMatch")?.checked !== false,

                showNews:
                    $("homepageShowNews")?.checked !== false,

                showLeaders:
                    $("homepageShowLeaders")?.checked !== false,

                showAchievements:
                    $("homepageShowAchievements")?.checked !== false,

                showBirthdays:
                    $("homepageShowBirthdays")?.checked !== false
            };

            await saveSettingsData({
                homepage
            });

            toast(
                "Настройки главной сохранены."
            );

        } catch (error) {

            console.error(error);

            toast(
                error.message,
                "error"
            );
        }
    }


    /* =====================================================
       MATCHES
       ===================================================== */

    function renderMatches() {

        const container =
            $("matchesAdminList");

        if (!container) return;


        if (!state.matches.length) {

            container.innerHTML = `
                <div class="admin-card">
                    Матчей пока нет.
                </div>
            `;

            return;
        }


        container.innerHTML =
            state.matches
                .slice()
                .reverse()
                .map(match => `

                    <div class="admin-card">

                        <div class="card-header">

                            <div>

                                <div class="card-title">
                                    ${escapeHTML(
                                        matchTeamsText(match)
                                    )}
                                </div>

                                <div class="card-description">

                                    ${formatDateTime(
                                        match.match_date,
                                        match.match_time
                                    )}

                                    ${match.tournament
                                        ? ` · ${escapeHTML(match.tournament)}`
                                        : ""}

                                    ${match.venue
                                        ? ` · ${escapeHTML(match.venue)}`
                                        : ""}

                                </div>

                            </div>

                            <span class="admin-status">
                                ${escapeHTML(
                                    statusName(match.status)
                                )}
                            </span>

                        </div>

                        <div class="admin-actions">

                            <button
                                class="small-button"
                                type="button"
                                data-action="edit-match"
                                data-id="${match.id}"
                            >
                                Изменить
                            </button>

                            <button
                                class="small-button"
                                type="button"
                                data-action="match-center"
                                data-id="${match.id}"
                            >
                                Матч-центр
                            </button>

                            <button
                                class="small-button danger"
                                type="button"
                                data-action="delete-match"
                                data-id="${match.id}"
                            >
                                Удалить
                            </button>

                        </div>

                    </div>

                `)
                .join("");
    }


    function openMatchForm(match = null) {

        const isEdit = !!match;

        const teamOptions =
            state.teams
                .map(team => `
                    <option
                        value="${team.id}"
                        ${String(match?.home_team_id) === String(team.id)
                            ? "selected"
                            : ""}
                    >
                        ${escapeHTML(team.name)}
                    </option>
                `)
                .join("");


        const awayOptions =
            state.teams
                .map(team => `
                    <option
                        value="${team.id}"
                        ${String(match?.away_team_id) === String(team.id)
                            ? "selected"
                            : ""}
                    >
                        ${escapeHTML(team.name)}
                    </option>
                `)
                .join("");


        openModal(
            isEdit
                ? "Редактирование матча"
                : "Добавить матч",

            `

            <form id="matchForm">

                <div class="form-group">

                    <label>Дата</label>

                    <input
                        id="matchDate"
                        type="date"
                        value="${match?.match_date || ""}"
                        required
                    >

                </div>


                <div class="form-group">

                    <label>Время</label>

                    <input
                        id="matchTime"
                        type="time"
                        value="${String(match?.match_time || "").slice(0,5)}"
                    >

                </div>


                <div class="form-group">

                    <label>Турнир</label>

                    <input
                        id="matchTournament"
                        type="text"
                        value="${escapeHTML(match?.tournament || "")}"
                        placeholder="Первенство ПФО"
                    >

                </div>


                <div class="form-group">

                    <label>Хозяева</label>

                    <select id="matchHomeTeam">
                        ${teamOptions}
                    </select>

                </div>


                <div class="form-group">

                    <label>Гости</label>

                    <select id="matchAwayTeam">
                        ${awayOptions}
                    </select>

                </div>


                <div class="form-group">

                    <label>Арена</label>

                    <input
                        id="matchVenue"
                        type="text"
                        value="${escapeHTML(match?.venue || "")}"
                        placeholder="ЛД «Челны»"
                    >

                </div>


                <div class="form-group">

                    <label>Статус</label>

                    <select id="matchStatus">

                        <option
                            value="scheduled"
                            ${match?.status === "scheduled" ? "selected" : ""}
                        >
                            Запланирован
                        </option>

                        <option
                            value="live"
                            ${match?.status === "live" ? "selected" : ""}
                        >
                            Идёт
                        </option>

                        <option
                            value="finished"
                            ${match?.status === "finished" ? "selected" : ""}
                        >
                            Завершён
                        </option>

                        <option
                            value="cancelled"
                            ${match?.status === "cancelled" ? "selected" : ""}
                        >
                            Отменён
                        </option>

                    </select>

                </div>


                <div class="form-group">

                    <label>Ссылка на трансляцию</label>

                    <input
                        id="matchStream"
                        type="url"
                        value="${escapeHTML(match?.stream_url || "")}"
                        placeholder="https://..."
                    >

                </div>


                <div class="form-group">

                    <label>Главный судья</label>

                    <input
                        id="matchChiefReferee"
                        type="text"
                        value="${escapeHTML(match?.chief_referee || "")}"
                    >

                </div>


                <div class="form-group">

                    <label>Линейный судья №1</label>

                    <input
                        id="matchLinesman1"
                        type="text"
                        value="${escapeHTML(match?.linesman1 || "")}"
                    >

                </div>


                <div class="form-group">

                    <label>Линейный судья №2</label>

                    <input
                        id="matchLinesman2"
                        type="text"
                        value="${escapeHTML(match?.linesman2 || "")}"
                    >

                </div>


                <div class="form-group">

                    <label>Состав на матч</label>

                    <textarea
                        id="matchLineup"
                        rows="7"
                        placeholder="12 - 13 - 14&#10;Фамилия - Фамилия - Фамилия&#10;&#10;15 - 16&#10;Фамилия - Фамилия"
                    >${escapeHTML(
                        Array.isArray(match?.lineup)
                            ? match.lineup.join("\n")
                            : ""
                    )}</textarea>

                </div>


                <button
                    class="primary-button"
                    type="submit"
                >
                    ${isEdit ? "Сохранить" : "Добавить матч"}
                </button>

            </form>

            `
        );


        $("matchForm")?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                try {

                    const values = {

                        match_date:
                            $("matchDate").value,

                        match_time:
                            $("matchTime").value || null,

                        tournament:
                            $("matchTournament").value.trim() || null,

                        home_team_id:
                            $("matchHomeTeam").value
                                ? Number($("matchHomeTeam").value)
                                : null,

                        away_team_id:
                            $("matchAwayTeam").value
                                ? Number($("matchAwayTeam").value)
                                : null,

                        venue:
                            $("matchVenue").value.trim() || null,

                        status:
                            $("matchStatus").value,

                        stream_url:
                            $("matchStream").value.trim() || null,

                        chief_referee:
                            $("matchChiefReferee").value.trim() || null,

                        linesman1:
                            $("matchLinesman1").value.trim() || null,

                        linesman2:
                            $("matchLinesman2").value.trim() || null,

                        lineup:
                            $("matchLineup").value
                                .split("\n")
                                .map(line => line.trim())
                                .filter(Boolean)
                    };


                    if (isEdit) {

                        await update(
                            "matches",
                            match.id,
                            values
                        );

                        toast(
                            "Матч сохранён."
                        );

                    } else {

                        await insert(
                            "matches",
                            values
                        );

                        toast(
                            "Матч добавлен."
                        );
                    }


                    closeModal();

                    await loadMatches();

                    renderMatches();

                    renderHomepageSelects();

                    renderDashboard();

                } catch (error) {

                    console.error(error);

                    toast(
                        error.message,
                        "error"
                    );
                }

            }
        );
    }


    async function deleteMatch(id) {

        if (!confirm(
            "Удалить этот матч?"
        )) return;

        try {

            await remove(
                "matches",
                id
            );

            toast(
                "Матч удалён."
            );

            await loadMatches();

            renderMatches();

            renderHomepageSelects();

            renderDashboard();

        } catch (error) {

            console.error(error);

            toast(
                error.message,
                "error"
            );
        }
    }


    /* =====================================================
       MATCH CENTER
       ===================================================== */

    async function openMatchCenter(id) {

        const match = getMatch(id);

        if (!match) return;


        let periods = [];

        let events = [];

        try {

            periods = await db
                .from("match_periods")
                .select("*")
                .eq("match_id", id)
                .order("period")
                .then(result => {
                    if (result.error) throw result.error;
                    return result.data || [];
                });


            events = await db
                .from("match_events")
                .select("*")
                .eq("match_id", id)
                .order("id")
                .then(result => {
                    if (result.error) throw result.error;
                    return result.data || [];
                });

        } catch (error) {

            console.error(error);
        }


        openModal(
            "Матч-центр",
            `

            <div class="admin-card">

                <div class="card-title">
                    ${escapeHTML(matchTeamsText(match))}
                </div>

                <div class="card-description">
                    ${formatDateTime(
                        match.match_date,
                        match.match_time
                    )}
                </div>

            </div>


            <form id="matchCenterForm">

                <div class="form-group">

                    <label>Статус</label>

                    <select id="centerStatus">

                        <option value="scheduled"
                            ${match.status === "scheduled" ? "selected" : ""}
                        >
                            Запланирован
                        </option>

                        <option value="live"
                            ${match.status === "live" ? "selected" : ""}
                        >
                            Матч идёт
                        </option>

                        <option value="finished"
                            ${match.status === "finished" ? "selected" : ""}
                        >
                            Завершён
                        </option>

                    </select>

                </div>


                <div class="form-group">

                    <label>Трансляция</label>

                    <input
                        id="centerStream"
                        type="url"
                        value="${escapeHTML(match.stream_url || "")}"
                        placeholder="https://..."
                    >

                </div>


                <div class="card-title">
                    Периоды
                </div>


                ${[1,2,3,4].map(period => {

                    const row =
                        periods.find(
                            item =>
                                Number(item.period) === period
                        );

                    return `

                        <div class="admin-grid-2">

                            <div class="form-group">

                                <label>
                                    ${period === 4
                                        ? "Овертайм / доп."
                                        : `${period}-й период`}
                                </label>

                                <input
                                    id="period${period}Home"
                                    type="number"
                                    min="0"
                                    value="${row?.home_score ?? 0}"
                                >

                            </div>


                            <div class="form-group">

                                <label>
                                    Шайбы соперника
                                </label>

                                <input
                                    id="period${period}Away"
                                    type="number"
                                    min="0"
                                    value="${row?.away_score ?? 0}"
                                >

                            </div>

                        </div>

                    `;

                }).join("")}


                <button
                    class="primary-button"
                    type="submit"
                >
                    Сохранить матч-центр
                </button>

            </form>


            <div class="admin-card">

                <div class="card-title">
                    События
                </div>

                <div class="admin-list">

                    ${
                        events.length
                        ? events.map(event => `
                            <div class="admin-list-item">

                                <strong>
                                    ${
                                        event.event_type === "goal"
                                            ? "ГОЛ"
                                            : "ШТРАФ"
                                    }
                                </strong>

                                <span>
                                    ${event.event_time || ""}
                                    · период ${event.period}
                                    ${
                                        event.penalty_minutes
                                            ? ` · ${event.penalty_minutes} мин.`
                                            : ""
                                    }
                                </span>

                            </div>
                        `).join("")
                        : "<div>Событий пока нет.</div>"
                    }

                </div>

            </div>


            <div class="stats-actions">

                <button
                    class="primary-button"
                    type="button"
                    id="centerGoalButton"
                >
                    + Гол
                </button>

                <button
                    class="secondary-button"
                    type="button"
                    id="centerPenaltyButton"
                >
                    + Штраф
                </button>

            </div>

            `
        );


        $("matchCenterForm")?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                try {

                    await update(
                        "matches",
                        id,
                        {
                            status:
                                $("centerStatus").value,

                            stream_url:
                                $("centerStream").value.trim() || null
                        }
                    );


                    for (let period = 1; period <= 4; period++) {

                        const home =
                            Number(
                                $(`period${period}Home`).value || 0
                            );

                        const away =
                            Number(
                                $(`period${period}Away`).value || 0
                            );


                        const existing =
                            periods.find(
                                row =>
                                    Number(row.period) === period
                            );


                        if (
                            existing ||
                            home !== 0 ||
                            away !== 0
                        ) {

                            if (existing) {

                                await db
                                    .from("match_periods")
                                    .update({
                                        home_score: home,
                                        away_score: away
                                    })
                                    .eq(
                                        "id",
                                        existing.id
                                    );

                            } else {

                                await insert(
                                    "match_periods",
                                    {
                                        match_id: id,
                                        period,
                                        home_score: home,
                                        away_score: away
                                    }
                                );
                            }
                        }
                    }


                    toast(
                        "Матч-центр сохранён."
                    );

                    closeModal();

                    await loadMatches();

                    renderMatches();

                    renderDashboard();

                } catch (error) {

                    console.error(error);

                    toast(
                        error.message,
                        "error"
                    );
                }
            }
        );


        $("centerGoalButton")?.addEventListener(
            "click",
            () => openGoalEventForm(id)
        );


        $("centerPenaltyButton")?.addEventListener(
            "click",
            () => openPenaltyEventForm(id)
        );
    }


    function openGoalEventForm(matchId) {

        const players =
            state.players
                .filter(player => player.active !== false);


        openModal(
            "Добавить гол",

            `

            <form id="goalEventForm">

                <div class="form-group">

                    <label>Автор гола</label>

                    <select id="goalPlayer" required>

                        <option value="">
                            Выберите игрока
                        </option>

                        ${players.map(player => `
                            <option value="${player.id}">
                                #${player.number ?? "—"}
                                ${escapeHTML(player.full_name)}
                            </option>
                        `).join("")}

                    </select>

                </div>


                <div class="form-group">

                    <label>Передача №1</label>

                    <select id="goalAssist1">

                        <option value="">
                            Без передачи
                        </option>

                        ${players.map(player => `
                            <option value="${player.id}">
                                #${player.number ?? "—"}
                                ${escapeHTML(player.full_name)}
                            </option>
                        `).join("")}

                    </select>

                </div>


                <div class="form-group">

                    <label>Передача №2</label>

                    <select id="goalAssist2">

                        <option value="">
                            Без передачи
                        </option>

                        ${players.map(player => `
                            <option value="${player.id}">
                                #${player.number ?? "—"}
                                ${escapeHTML(player.full_name)}
                            </option>
                        `).join("")}

                    </select>

                </div>


                <div class="admin-grid-2">

                    <div class="form-group">

                        <label>Период</label>

                        <select id="goalPeriod">

                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">ОТ</option>

                        </select>

                    </div>


                    <div class="form-group">

                        <label>Время</label>

                        <input
                            id="goalTime"
                            type="text"
                            placeholder="12:34"
                        >

                    </div>

                </div>


                <button
                    class="primary-button"
                    type="submit"
                >
                    Добавить гол
                </button>

            </form>

            `
        );


        $("goalEventForm")?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                try {

                    const playerId =
                        Number($("goalPlayer").value);

                    const assist1 =
                        $("goalAssist1").value
                            ? Number($("goalAssist1").value)
                            : null;

                    const assist2 =
                        $("goalAssist2").value
                            ? Number($("goalAssist2").value)
                            : null;


                    const chelny =
                        state.teams.find(
                            team =>
                                team.name
                                    ?.toLowerCase()
                                    .includes("челны")
                        );


                    await insert(
                        "match_events",
                        {
                            match_id: matchId,
                            event_type: "goal",
                            period:
                                Number($("goalPeriod").value),
                            event_time:
                                $("goalTime").value.trim() || null,
                            team_id:
                                chelny?.id || null,
                            player_id: playerId,
                            assist1_player_id: assist1,
                            assist2_player_id: assist2
                        }
                    );


                    await updatePlayerStats(
                        playerId,
                        {
                            goals: 1,
                            points: 1
                        }
                    );


                    if (assist1) {
                        await updatePlayerStats(
                            assist1,
                            {
                                assists: 1,
                                points: 1
                            }
                        );
                    }


                    if (
                        assist2 &&
                        assist2 !== assist1
                    ) {
                        await updatePlayerStats(
                            assist2,
                            {
                                assists: 1,
                                points: 1
                            }
                        );
                    }


                    toast(
                        "Гол добавлен."
                    );

                    closeModal();

                    await loadStats();

                    renderStats();

                } catch (error) {

                    console.error(error);

                    toast(
                        error.message,
                        "error"
                    );
                }
            }
        );
    }


    function openPenaltyEventForm(matchId) {

        openModal(
            "Добавить штраф",

            `

            <form id="penaltyEventForm">

                <div class="form-group">

                    <label>Игрок</label>

                    <select id="penaltyPlayer" required>

                        <option value="">
                            Выберите игрока
                        </option>

                        ${state.players.map(player => `
                            <option value="${player.id}">
                                #${player.number ?? "—"}
                                ${escapeHTML(player.full_name)}
                            </option>
                        `).join("")}

                    </select>

                </div>


                <div class="admin-grid-2">

                    <div class="form-group">

                        <label>Период</label>

                        <select id="penaltyPeriod">
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">ОТ</option>
                        </select>

                    </div>


                    <div class="form-group">

                        <label>Минуты</label>

                        <input
                            id="penaltyMinutes"
                            type="number"
                            min="1"
                            value="2"
                            required
                        >

                    </div>

                </div>


                <div class="form-group">

                    <label>Время</label>

                    <input
                        id="penaltyTime"
                        type="text"
                        placeholder="12:34"
                    >

                </div>


                <button
                    class="primary-button"
                    type="submit"
                >
                    Добавить штраф
                </button>

            </form>

            `
        );


        $("penaltyEventForm")?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                try {

                    const playerId =
                        Number($("penaltyPlayer").value);

                    const minutes =
                        Number($("penaltyMinutes").value || 2);


                    await insert(
                        "match_events",
                        {
                            match_id: matchId,
                            event_type: "penalty",
                            period:
                                Number($("penaltyPeriod").value),
                            event_time:
                                $("penaltyTime").value.trim() || null,
                            player_id: playerId,
                            penalty_minutes: minutes
                        }
                    );


                    await updatePlayerStats(
                        playerId,
                        {
                            pim: minutes
                        }
                    );


                    toast(
                        "Штраф добавлен."
                    );

                    closeModal();

                    await loadStats();

                    renderStats();

                } catch (error) {

                    console.error(error);

                    toast(
                        error.message,
                        "error"
                    );
                }
            }
        );
    }


    /* =====================================================
       PLAYERS
       ===================================================== */

    function renderPlayers() {

        const container =
            $("playersAdminList");

        if (!container) return;


        let players =
            state.players.filter(
                player => {

                    if (
                        currentPlayerFilter === "all"
                    ) return true;

                    return (
                        player.position ===
                        currentPlayerFilter
                    );
                }
            );


        if (!players.length) {

            container.innerHTML = `
                <div class="admin-card">
                    Игроков нет.
                </div>
            `;

            return;
        }


        container.innerHTML =
            players.map(player => `

                <div class="admin-card">

                    ${
                        player.photo_url
                            ? `
                                <img
                                    src="${escapeHTML(player.photo_url)}"
                                    alt=""
                                    style="
                                        width:100%;
                                        aspect-ratio:1;
                                        object-fit:cover;
                                        border-radius:16px;
                                        margin-bottom:14px;
                                    "
                                >
                              `
                            : ""
                    }


                    <div class="card-title">

                        ${
                            player.number !== null &&
                            player.number !== undefined
                                ? `#${player.number} `
                                : ""
                        }

                        ${escapeHTML(player.full_name)}

                        ${
                            player.role
                                ? ` · ${playerRoleName(player.role)}`
                                : ""
                        }

                    </div>


                    <div class="card-description">

                        ${positionName(player.position)}

                        ${
                            player.birth_date
                                ? ` · ${formatDate(player.birth_date)}`
                                : ""
                        }

                        ${
                            player.height_cm
                                ? ` · ${player.height_cm} см`
                                : ""
                        }

                        ${
                            player.weight_kg
                                ? ` · ${player.weight_kg} кг`
                                : ""
                        }

                    </div>


                    <div class="admin-actions">

                        <button
                            class="small-button"
                            type="button"
                            data-action="edit-player"
                            data-id="${player.id}"
                        >
                            Изменить
                        </button>

                        <button
                            class="small-button danger"
                            type="button"
                            data-action="delete-player"
                            data-id="${player.id}"
                        >
                            Удалить
                        </button>

                    </div>

                </div>

            `)
            .join("");
    }


    function openPlayerForm(player = null) {

        const isEdit =
            Boolean(player);


        openModal(
            isEdit
                ? "Редактирование игрока"
                : "Добавить игрока",

            `

            <form id="playerForm">

                <div class="form-group">

                    <label>Фамилия и имя</label>

                    <input
                        id="playerFullName"
                        type="text"
                        value="${escapeHTML(player?.full_name || "")}"
                        required
                    >

                </div>


                <div class="admin-grid-2">

                    <div class="form-group">

                        <label>Номер</label>

                        <input
                            id="playerNumber"
                            type="number"
                            min="0"
                            value="${player?.number ?? ""}"
                        >

                    </div>


                    <div class="form-group">

                        <label>Амплуа</label>

                        <select id="playerPosition">

                            <option
                                value="forward"
                                ${player?.position === "forward" ? "selected" : ""}
                            >
                                Нападающий
                            </option>

                            <option
                                value="defense"
                                ${player?.position === "defense" ? "selected" : ""}
                            >
                                Защитник
                            </option>

                            <option
                                value="goalie"
                                ${player?.position === "goalie" ? "selected" : ""}
                            >
                                Вратарь
                            </option>

                        </select>

                    </div>

                </div>


                <div class="form-group">

                    <label>Роль</label>

                    <select id="playerRole">

                        <option value="">
                            Нет
                        </option>

                        <option
                            value="K"
                            ${player?.role === "K" ? "selected" : ""}
                        >
                            Капитан (К)
                        </option>

                        <option
                            value="A"
                            ${player?.role === "A" ? "selected" : ""}
                        >
                            Ассистент капитана (А)
                        </option>

                    </select>

                </div>


                <div class="form-group">

                    <label>Дата рождения</label>

                    <input
                        id="playerBirthDate"
                        type="date"
                        value="${player?.birth_date || ""}"
                    >

                </div>


                <div class="admin-grid-2">

                    <div class="form-group">

                        <label>Рост, см</label>

                        <input
                            id="playerHeight"
                            type="number"
                            value="${player?.height_cm ?? ""}"
                        >

                    </div>


                    <div class="form-group">

                        <label>Вес, кг</label>

                        <input
                            id="playerWeight"
                            type="number"
                            step="0.1"
                            value="${player?.weight_kg ?? ""}"
                        >

                    </div>

                </div>


                <div class="form-group">

                    <label>Фото</label>

                    <input
                        id="playerPhoto"
                        type="file"
                        accept="image/*"
                    >

                </div>


                <div class="form-group">

                    <label class="switch-row">

                        <input
                            id="playerActive"
                            type="checkbox"
                            ${player?.active !== false ? "checked" : ""}
                        >

                        <span>
                            Игрок активен
                        </span>

                    </label>

                </div>


                <button
                    class="primary-button"
                    type="submit"
                >
                    ${isEdit ? "Сохранить" : "Добавить"}
                </button>

            </form>

            `
        );


        $("playerForm")?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                try {

                    let photoUrl =
                        player?.photo_url ||
                        null;


                    const file =
                        $("playerPhoto")
                            ?.files?.[0];


                    if (file) {
                        photoUrl =
                            await uploadFile(
                                file,
                                "players"
                            );
                    }


                    const values = {

                        full_name:
                            $("playerFullName")
                                .value.trim(),

                        number:
                            $("playerNumber").value
                                ? Number($("playerNumber").value)
                                : null,

                        position:
                            $("playerPosition").value,

                        role:
                            $("playerRole").value || null,

                        birth_date:
                            $("playerBirthDate").value || null,

                        height_cm:
                            $("playerHeight").value
                                ? Number($("playerHeight").value)
                                : null,

                        weight_kg:
                            $("playerWeight").value
                                ? Number($("playerWeight").value)
                                : null,

                        photo_url:
                            photoUrl,

                        active:
                            $("playerActive").checked
                    };


                    if (isEdit) {

                        await update(
                            "players",
                            player.id,
                            values
                        );

                        toast(
                            "Игрок сохранён."
                        );

                    } else {

                        await insert(
                            "players",
                            values
                        );

                        toast(
                            "Игрок добавлен."
                        );
                    }


                    closeModal();

                    await loadPlayers();

                    renderPlayers();

                    renderBirthdays();

                } catch (error) {

                    console.error(error);

                    toast(
                        error.message,
                        "error"
                    );
                }
            }
        );
    }


    async function deletePlayer(id) {

        if (!confirm(
            "Удалить игрока?"
        )) return;

        try {

            await remove(
                "players",
                id
            );

            toast(
                "Игрок удалён."
            );

            await loadPlayers();

            await loadStats();

            renderPlayers();

            renderStats();

        } catch (error) {

            console.error(error);

            toast(
                error.message,
                "error"
            );
        }
    }


    /* =====================================================
       PLAYER STATS
       ===================================================== */

    async function updatePlayerStats(
        playerId,
        changes
    ) {

        const season =
            "2026/27";


        const existing =
            state.stats.find(
                row =>
                    String(row.player_id) ===
                    String(playerId) &&
                    row.season === season
            );


        if (!existing) {

            const values = {

                player_id:
                    Number(playerId),

                season,

                games: 0,

                goals:
                    Number(changes.goals || 0),

                assists:
                    Number(changes.assists || 0),

                points:
                    Number(changes.points || 0),

                plus_minus:
                    Number(changes.plus_minus || 0),

                pim:
                    Number(changes.pim || 0),

                goalie_games: 0,

                goals_against: 0,

                gaa: 0
            };


            await insert(
                "player_season_stats",
                values
            );

            return;
        }


        const values = {

            goals:
                Number(existing.goals || 0) +
                Number(changes.goals || 0),

            assists:
                Number(existing.assists || 0) +
                Number(changes.assists || 0),

            points:
                Number(existing.points || 0) +
                Number(changes.points || 0),

            plus_minus:
                Number(existing.plus_minus || 0) +
                Number(changes.plus_minus || 0),

            pim:
                Number(existing.pim || 0) +
                Number(changes.pim || 0),

            games:
                Number(existing.games || 0) +
                Number(changes.games || 0),

            goalie_games:
                Number(existing.goalie_games || 0) +
                Number(changes.goalie_games || 0),

            goals_against:
                Number(existing.goals_against || 0) +
                Number(changes.goals_against || 0)
        };


        await update(
            "player_season_stats",
            existing.id,
            values
        );
    }


    function renderStats() {

        const container =
            $("statsAdminList");

        if (!container) return;


        const rows =
            state.players
                .map(player => {

                    const stat =
                        state.stats.find(
                            row =>
                                String(row.player_id) ===
                                String(player.id)
                        ) || {};


                    return {
                        player,
                        stat
                    };
                })
                .sort(
                    (a, b) =>
                        Number(b.stat.points || 0) -
                        Number(a.stat.points || 0)
                );


        container.innerHTML = `

            <div class="card-header">

                <div>

                    <div class="card-title">
                        Статистика игроков
                    </div>

                    <div class="card-description">
                        Сезон 2026/27
                    </div>

                </div>

            </div>


            <div class="admin-list">

                ${
                    rows.length
                    ? rows.map(row => `

                        <div class="admin-list-item">

                            <strong>
                                #${row.player.number ?? "—"}
                                ${escapeHTML(row.player.full_name)}
                            </strong>

                            <span>
                                И: ${row.stat.games || 0}
                                · Г: ${row.stat.goals || 0}
                                · П: ${row.stat.assists || 0}
                                · О: ${row.stat.points || 0}
                                · +/-: ${row.stat.plus_minus || 0}
                                · Ш: ${row.stat.pim || 0}
                            </span>

                        </div>

                    `).join("")
                    : "Статистики пока нет."
                }

            </div>
        `;
    }


    async function openQuickStatForm(type) {

        const labels = {
            goal: "Добавить гол",
            assist: "Добавить передачу",
            penalty: "Добавить штраф"
        };


        openModal(
            labels[type],

            `

            <form id="quickStatForm">

                <div class="form-group">

                    <label>Игрок</label>

                    <select id="quickStatPlayer" required>

                        <option value="">
                            Выберите игрока
                        </option>

                        ${state.players.map(player => `
                            <option value="${player.id}">
                                #${player.number ?? "—"}
                                ${escapeHTML(player.full_name)}
                            </option>
                        `).join("")}

                    </select>

                </div>


                ${
                    type === "penalty"
                    ? `
                        <div class="form-group">

                            <label>Штраф, минут</label>

                            <input
                                id="quickStatValue"
                                type="number"
                                min="1"
                                value="2"
                                required
                            >

                        </div>
                    `
                    : ""
                }


                <button
                    class="primary-button"
                    type="submit"
                >
                    Добавить
                </button>

            </form>

            `
        );


        $("quickStatForm")?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                try {

                    const playerId =
                        Number(
                            $("quickStatPlayer").value
                        );


                    if (type === "goal") {

                        await updatePlayerStats(
                            playerId,
                            {
                                goals: 1,
                                points: 1
                            }
                        );

                    }


                    if (type === "assist") {

                        await updatePlayerStats(
                            playerId,
                            {
                                assists: 1,
                                points: 1
                            }
                        );

                    }


                    if (type === "penalty") {

                        await updatePlayerStats(
                            playerId,
                            {
                                pim:
                                    Number(
                                        $("quickStatValue").value
                                    )
                            }
                        );
                    }


                    toast(
                        "Статистика обновлена."
                    );

                    closeModal();

                    await loadStats();

                    renderStats();

                } catch (error) {

                    console.error(error);

                    toast(
                        error.message,
                        "error"
                    );
                }
            }
        );
    }


    /* =====================================================
       NEWS
       ===================================================== */

    function renderNews() {

        const container =
            $("newsAdminList");

        if (!container) return;


        if (!state.news.length) {

            container.innerHTML = `
                <div class="admin-card">
                    Новостей пока нет.
                </div>
            `;

            return;
        }


        container.innerHTML =
            state.news.map(news => `

                <div class="admin-card">

                    ${
                        news.image_url
                            ? `
                                <img
                                    src="${escapeHTML(news.image_url)}"
                                    alt=""
                                    style="
                                        width:100%;
                                        max-height:240px;
                                        object-fit:cover;
                                        border-radius:16px;
                                        margin-bottom:14px;
                                    "
                                >
                              `
                            : ""
                    }


                    <div class="card-title">
                        ${escapeHTML(news.title)}
                    </div>


                    <div class="card-description">

                        ${formatDate(news.published_at)}

                        ${
                            Array.isArray(news.tags) &&
                            news.tags.length
                                ? ` · ${news.tags.map(
                                    tag =>
                                        `#${escapeHTML(tag)}`
                                ).join(" ")}`
                                : ""
                        }

                    </div>


                    <div class="admin-actions">

                        <button
                            class="small-button"
                            type="button"
                            data-action="edit-news"
                            data-id="${news.id}"
                        >
                            Изменить
                        </button>

                        <button
                            class="small-button danger"
                            type="button"
                            data-action="delete-news"
                            data-id="${news.id}"
                        >
                            Удалить
                        </button>

                    </div>

                </div>

            `).join("");
    }


    function openNewsForm(news = null) {

        const isEdit =
            Boolean(news);


        openModal(
            isEdit
                ? "Редактирование новости"
                : "Добавить новость",

            `

            <form id="newsForm">

                <div class="form-group">

                    <label>Заголовок</label>

                    <input
                        id="newsTitle"
                        type="text"
                        value="${escapeHTML(news?.title || "")}"
                        required
                    >

                </div>


                <div class="form-group">

                    <label>Текст</label>

                    <textarea
                        id="newsBody"
                        rows="9"
                    >${escapeHTML(news?.body || "")}</textarea>

                </div>


                <div class="form-group">

                    <label>Теги</label>

                    <input
                        id="newsTags"
                        type="text"
                        value="${
                            Array.isArray(news?.tags)
                                ? news.tags.join(", ")
                                : ""
                        }"
                        placeholder="матч, команда, победа"
                    >

                </div>


                <div class="form-group">

                    <label>Фото</label>

                    <input
                        id="newsImage"
                        type="file"
                        accept="image/*"
                    >

                </div>


                <button
                    class="primary-button"
                    type="submit"
                >
                    ${isEdit ? "Сохранить" : "Опубликовать"}
                </button>

            </form>

            `
        );


        $("newsForm")?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                try {

                    let imageUrl =
                        news?.image_url ||
                        null;


                    const file =
                        $("newsImage")
                            ?.files?.[0];


                    if (file) {

                        imageUrl =
                            await uploadFile(
                                file,
                                "news"
                            );
                    }


                    const tags =
                        $("newsTags")
                            .value
                            .split(",")
                            .map(tag => tag.trim())
                            .filter(Boolean);


                    const values = {

                        title:
                            $("newsTitle")
                                .value.trim(),

                        body:
                            $("newsBody")
                                .value.trim() || null,

                        image_url:
                            imageUrl,

                        tags,

                        published_at:
                            news?.published_at ||
                            new Date().toISOString()
                    };


                    if (isEdit) {

                        await update(
                            "news",
                            news.id,
                            values
                        );

                        toast(
                            "Новость сохранена."
                        );

                    } else {

                        await insert(
                            "news",
                            values
                        );

                        toast(
                            "Новость опубликована."
                        );
                    }


                    closeModal();

                    await loadNews();

                    renderNews();

                } catch (error) {

                    console.error(error);

                    toast(
                        error.message,
                        "error"
                    );
                }
            }
        );
    }


    async function deleteNews(id) {

        if (!confirm(
            "Удалить новость?"
        )) return;

        try {

            await remove(
                "news",
                id
            );

            toast(
                "Новость удалена."
            );

            await loadNews();

            renderNews();

        } catch (error) {

            toast(
                error.message,
                "error"
            );
        }
    }


    /* =====================================================
       MEDIA
       ===================================================== */

    function renderAlbums() {

        const container =
            $("albumsAdminList");

        if (!container) return;


        if (!state.albums.length) {

            container.innerHTML = `
                <div class="admin-card">
                    Альбомов пока нет.
                </div>
            `;

            return;
        }


        container.innerHTML =
            state.albums.map(album => {

                const photos =
                    Array.isArray(album.photos)
                        ? album.photos
                        : [];


                return `

                    <div class="admin-card">

                        ${
                            photos[0]
                                ? `
                                    <img
                                        src="${escapeHTML(photos[0])}"
                                        alt=""
                                        style="
                                            width:100%;
                                            aspect-ratio:16/10;
                                            object-fit:cover;
                                            border-radius:16px;
                                            margin-bottom:14px;
                                        "
                                    >
                                  `
                                : ""
                        }


                        <div class="card-title">
                            ${escapeHTML(album.title)}
                        </div>


                        <div class="card-description">
                            ${photos.length} фото
                        </div>


                        <div class="admin-actions">

                            <button
                                class="small-button"
                                type="button"
                                data-action="edit-album"
                                data-id="${album.id}"
                            >
                                Изменить
                            </button>

                            <button
                                class="small-button danger"
                                type="button"
                                data-action="delete-album"
                                data-id="${album.id}"
                            >
                                Удалить
                            </button>

                        </div>

                    </div>

                `;
            }).join("");
    }


    function openAlbumForm(album = null) {

        const isEdit =
            Boolean(album);


        openModal(
            isEdit
                ? "Редактирование альбома"
                : "Создать альбом",

            `

            <form id="albumForm">

                <div class="form-group">

                    <label>Название</label>

                    <input
                        id="albumTitle"
                        type="text"
                        value="${escapeHTML(album?.title || "")}"
                        required
                    >

                </div>


                <div class="form-group">

                    <label>Матч</label>

                    <select id="albumMatch">

                        <option value="">
                            Без привязки
                        </option>

                        ${state.matches.map(match => `
                            <option
                                value="${match.id}"
                                ${String(album?.match_id) === String(match.id)
                                    ? "selected"
                                    : ""}
                            >
                                ${escapeHTML(matchTeamsText(match))}
                                · ${formatDate(match.match_date)}
                            </option>
                        `).join("")}

                    </select>

                </div>


                <div class="form-group">

                    <label>
                        Фотографии
                    </label>

                    <input
                        id="albumPhotos"
                        type="file"
                        accept="image/*"
                        multiple
                    >

                </div>


                ${
                    Array.isArray(album?.photos) &&
                    album.photos.length
                        ? `
                            <div class="card-description">
                                В альбоме сейчас:
                                ${album.photos.length} фото.
                                Новые фотографии будут добавлены
                                к существующим.
                            </div>
                          `
                        : ""
                }


                <button
                    class="primary-button"
                    type="submit"
                >
                    ${isEdit ? "Сохранить" : "Создать альбом"}
                </button>

            </form>

            `
        );


        $("albumForm")?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                try {

                    let photos =
                        Array.isArray(album?.photos)
                            ? [...album.photos]
                            : [];


                    const files =
                        Array.from(
                            $("albumPhotos")
                                ?.files || []
                        );


                    for (const file of files) {

                        const url =
                            await uploadFile(
                                file,
                                "albums"
                            );

                        photos.push(url);
                    }


                    const values = {

                        title:
                            $("albumTitle")
                                .value.trim(),

                        match_id:
                            $("albumMatch").value
                                ? Number($("albumMatch").value)
                                : null,

                        photos
                    };


                    if (isEdit) {

                        await update(
                            "albums",
                            album.id,
                            values
                        );

                        toast(
                            "Альбом сохранён."
                        );

                    } else {

                        await insert(
                            "albums",
                            values
                        );

                        toast(
                            "Альбом создан."
                        );
                    }


                    closeModal();

                    await loadAlbums();

                    renderAlbums();

                } catch (error) {

                    console.error(error);

                    toast(
                        error.message,
                        "error"
                    );
                }
            }
        );
    }


    async function deleteAlbum(id) {

        if (!confirm(
            "Удалить альбом?"
        )) return;

        try {

            await remove(
                "albums",
                id
            );

            toast(
                "Альбом удалён."
            );

            await loadAlbums();

            renderAlbums();

        } catch (error) {

            toast(
                error.message,
                "error"
            );
        }
    }


    /* =====================================================
       PRODUCTS
       ===================================================== */

    function renderProducts() {

        const container =
            $("productsAdminList");

        if (!container) return;


        if (!state.products.length) {

            container.innerHTML = `
                <div class="admin-card">
                    Товаров пока нет.
                </div>
            `;

            return;
        }


        container.innerHTML =
            state.products.map(product => {

                const images =
                    Array.isArray(product.images)
                        ? product.images
                        : [];


                return `

                    <div class="admin-card">

                        ${
                            images[0]
                                ? `
                                    <img
                                        src="${escapeHTML(images[0])}"
                                        alt=""
                                        style="
                                            width:100%;
                                            aspect-ratio:1;
                                            object-fit:cover;
                                            border-radius:16px;
                                            margin-bottom:14px;
                                        "
                                    >
                                  `
                                : ""
                        }


                        <div class="card-title">
                            ${escapeHTML(product.name)}
                        </div>


                        <div class="card-description">
                            ${formatMoney(product.price)}
                        </div>


                        <div class="card-description">

                            ${
                                product.active
                                    ? "Активен"
                                    : "Скрыт"
                            }

                        </div>


                        <div class="admin-actions">

                            <button
                                class="small-button"
                                type="button"
                                data-action="edit-product"
                                data-id="${product.id}"
                            >
                                Изменить
                            </button>

                            <button
                                class="small-button danger"
                                type="button"
                                data-action="delete-product"
                                data-id="${product.id}"
                            >
                                Удалить
                            </button>

                        </div>

                    </div>

                `;
            }).join("");
    }


    function openProductForm(product = null) {

        const isEdit =
            Boolean(product);


        openModal(
            isEdit
                ? "Редактирование товара"
                : "Добавить товар",

            `

            <form id="productForm">

                <div class="form-group">

                    <label>Название</label>

                    <input
                        id="productName"
                        type="text"
                        value="${escapeHTML(product?.name || "")}"
                        required
                    >

                </div>


                <div class="form-group">

                    <label>Цена</label>

                    <input
                        id="productPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value="${product?.price ?? 0}"
                        required
                    >

                </div>


                <div class="form-group">

                    <label>Описание</label>

                    <textarea
                        id="productDescription"
                        rows="7"
                    >${escapeHTML(product?.description || "")}</textarea>

                </div>


                <div class="form-group">

                    <label>Контакт продавца</label>

                    <input
                        id="productContact"
                        type="text"
                        value="${escapeHTML(product?.seller_contact || "")}"
                        placeholder="@username / телефон"
                    >

                </div>


                <div class="form-group">

                    <label>Фото</label>

                    <input
                        id="productImages"
                        type="file"
                        accept="image/*"
                        multiple
                    >

                </div>


                <label class="switch-row">

                    <input
                        id="productActive"
                        type="checkbox"
                        ${product?.active !== false ? "checked" : ""}
                    >

                    <span>
                        Показывать товар на сайте
                    </span>

                </label>


                <br>


                <button
                    class="primary-button"
                    type="submit"
                >
                    ${isEdit ? "Сохранить" : "Добавить"}
                </button>

            </form>

            `
        );


        $("productForm")?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                try {

                    let images =
                        Array.isArray(product?.images)
                            ? [...product.images]
                            : [];


                    const files =
                        Array.from(
                            $("productImages")
                                ?.files || []
                        );


                    for (const file of files) {

                        const url =
                            await uploadFile(
                                file,
                                "products"
                            );

                        images.push(url);
                    }


                    const values = {

                        name:
                            $("productName")
                                .value.trim(),

                        price:
                            Number(
                                $("productPrice").value || 0
                            ),

                        description:
                            $("productDescription")
                                .value.trim() || null,

                        seller_contact:
                            $("productContact")
                                .value.trim() || null,

                        images,

                        active:
                            $("productActive").checked
                    };


                    if (isEdit) {

                        await update(
                            "products",
                            product.id,
                            values
                        );

                        toast(
                            "Товар сохранён."
                        );

                    } else {

                        await insert(
                            "products",
                            values
                        );

                        toast(
                            "Товар добавлен."
                        );
                    }


                    closeModal();

                    await loadProducts();

                    renderProducts();

                } catch (error) {

                    console.error(error);

                    toast(
                        error.message,
                        "error"
                    );
                }
            }
        );
    }


    async function deleteProduct(id) {

        if (!confirm(
            "Удалить товар?"
        )) return;

        try {

            await remove(
                "products",
                id
            );

            toast(
                "Товар удалён."
            );

            await loadProducts();

            renderProducts();

        } catch (error) {

            toast(
                error.message,
                "error"
            );
        }
    }


    /* =====================================================
       STANDINGS
       ===================================================== */

    function renderStandings() {

        const container =
            $("standingsAdminList");

        if (!container) return;


        container.innerHTML = `

            <div class="admin-list">

                ${
                    state.standings.length
                    ? state.standings.map(row => `

                        <div class="admin-list-item">

                            <strong>
                                ${row.place || "—"}.
                                ${escapeHTML(
                                    getTeamName(row.team_id)
                                )}
                            </strong>

                            <span>
                                И ${row.games || 0}
                                · В ${row.wins || 0}
                                · ВО ${row.overtime_wins || 0}
                                · ВБ ${row.shootout_wins || 0}
                                · П ${row.losses || 0}
                                · ПБ ${row.overtime_losses || 0}
                                · О ${row.points || 0}
                            </span>

                            <div class="admin-actions">

                                <button
                                    class="small-button"
                                    type="button"
                                    data-action="edit-standing"
                                    data-id="${row.id}"
                                >
                                    Изменить
                                </button>

                                <button
                                    class="small-button danger"
                                    type="button"
                                    data-action="delete-standing"
                                    data-id="${row.id}"
                                >
                                    Удалить
                                </button>

                            </div>

                        </div>

                    `).join("")
                    : "Таблица пока пуста."
                }

            </div>

        `;
    }


    function openStandingForm(standing = null) {

        const isEdit =
            Boolean(standing);


        openModal(
            isEdit
                ? "Редактирование команды"
                : "Добавить команду",

            `

            <form id="standingForm">

                <div class="form-group">

                    <label>Команда</label>

                    <select id="standingTeam" required>

                        <option value="">
                            Выберите команду
                        </option>

                        ${state.teams.map(team => `
                            <option
                                value="${team.id}"
                                ${String(standing?.team_id) === String(team.id)
                                    ? "selected"
                                    : ""}
                            >
                                ${escapeHTML(team.name)}
                            </option>
                        `).join("")}

                    </select>

                </div>


                <div class="admin-grid-2">

                    <div class="form-group">
                        <label>Место</label>
                        <input
                            id="standingPlace"
                            type="number"
                            value="${standing?.place ?? ""}"
                        >
                    </div>

                    <div class="form-group">
                        <label>Игр</label>
                        <input
                            id="standingGames"
                            type="number"
                            value="${standing?.games ?? 0}"
                        >
                    </div>

                    <div class="form-group">
                        <label>Победы</label>
                        <input
                            id="standingWins"
                            type="number"
                            value="${standing?.wins ?? 0}"
                        >
                    </div>

                    <div class="form-group">
                        <label>ВО</label>
                        <input
                            id="standingOvertimeWins"
                            type="number"
                            value="${standing?.overtime_wins ?? 0}"
                        >
                    </div>

                    <div class="form-group">
                        <label>ВБ</label>
                        <input
                            id="standingShootoutWins"
                            type="number"
                            value="${standing?.shootout_wins ?? 0}"
                        >
                    </div>

                    <div class="form-group">
                        <label>П</label>
                        <input
                            id="standingLosses"
                            type="number"
                            value="${standing?.losses ?? 0}"
                        >
                    </div>

                    <div class="form-group">
                        <label>ПБ</label>
                        <input
                            id="standingShootoutLosses"
                            type="number"
                            value="${standing?.shootout_losses ?? 0}"
                        >
                    </div>

                    <div class="form-group">
                        <label>Очки</label>
                        <input
                            id="standingPoints"
                            type="number"
                            value="${standing?.points ?? 0}"
                        >
                    </div>

                </div>


                <button
                    class="primary-button"
                    type="submit"
                >
                    ${isEdit ? "Сохранить" : "Добавить"}
                </button>

            </form>

            `
        );


        $("standingForm")?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                try {

                    const values = {

                        team_id:
                            Number(
                                $("standingTeam").value
                            ),

                        place:
                            Number(
                                $("standingPlace").value || 0
                            ),

                        games:
                            Number(
                                $("standingGames").value || 0
                            ),

                        wins:
                            Number(
                                $("standingWins").value || 0
                            ),

                        overtime_wins:
                            Number(
                                $("standingOvertimeWins").value || 0
                            ),

                        shootout_wins:
                            Number(
                                $("standingShootoutWins").value || 0
                            ),

                        losses:
                            Number(
                                $("standingLosses").value || 0
                            ),

                        shootout_losses:
                            Number(
                                $("standingShootoutLosses").value || 0
                            ),

                        points:
                            Number(
                                $("standingPoints").value || 0
                            )
                    };


                    if (isEdit) {

                        await update(
                            "standings",
                            standing.id,
                            values
                        );

                    } else {

                        await insert(
                            "standings",
                            values
                        );
                    }


                    toast(
                        "Таблица обновлена."
                    );

                    closeModal();

                    await loadStandings();

                    renderStandings();

                } catch (error) {

                    console.error(error);

                    toast(
                        error.message,
                        "error"
                    );
                }
            }
        );
    }


    async function deleteStanding(id) {

        if (!confirm(
            "Удалить строку таблицы?"
        )) return;

        try {

            await remove(
                "standings",
                id
            );

            await loadStandings();

            renderStandings();

            toast(
                "Команда удалена из таблицы."
            );

        } catch (error) {

            toast(
                error.message,
                "error"
            );
        }
    }


    /* =====================================================
       BIRTHDAYS
       ===================================================== */

    function renderBirthdays() {

        const container =
            $("birthdaysAdminList");

        if (!container) return;


        container.innerHTML =
            state.birthdays.length
            ? state.birthdays.map(birthday => {

                const player =
                    getPlayer(
                        birthday.player_id
                    );


                return `

                    <div class="admin-card">

                        <div class="card-title">

                            ${
                                player
                                    ? `#${player.number ?? "—"}
                                       ${escapeHTML(player.full_name)}`
                                    : "Игрок не найден"
                            }

                        </div>

                        <div class="card-description">

                            ${formatDate(
                                birthday.birthday
                            )}

                            ${
                                birthday.note
                                    ? ` · ${escapeHTML(birthday.note)}`
                                    : ""
                            }

                        </div>


                        <div class="admin-actions">

                            <button
                                class="small-button"
                                type="button"
                                data-action="edit-birthday"
                                data-id="${birthday.id}"
                            >
                                Изменить
                            </button>

                            <button
                                class="small-button danger"
                                type="button"
                                data-action="delete-birthday"
                                data-id="${birthday.id}"
                            >
                                Удалить
                            </button>

                        </div>

                    </div>

                `;

            }).join("")
            : `
                <div class="admin-card">
                    Дней рождения пока нет.
                </div>
            `;
    }


    function openBirthdayForm(birthday = null) {

        const isEdit =
            Boolean(birthday);


        openModal(
            isEdit
                ? "Редактирование дня рождения"
                : "Добавить день рождения",

            `

            <form id="birthdayForm">

                <div class="form-group">

                    <label>Игрок</label>

                    <select id="birthdayPlayer" required>

                        <option value="">
                            Выберите игрока
                        </option>

                        ${state.players.map(player => `
                            <option
                                value="${player.id}"
                                ${String(birthday?.player_id) === String(player.id)
                                    ? "selected"
                                    : ""}
                            >
                                #${player.number ?? "—"}
                                ${escapeHTML(player.full_name)}
                            </option>
                        `).join("")}

                    </select>

                </div>


                <div class="form-group">

                    <label>Дата рождения</label>

                    <input
                        id="birthdayDate"
                        type="date"
                        value="${birthday?.birthday || ""}"
                        required
                    >

                </div>


                <div class="form-group">

                    <label>Комментарий</label>

                    <input
                        id="birthdayNote"
                        type="text"
                        value="${escapeHTML(birthday?.note || "")}"
                        placeholder="Например: поздравляем!"
                    >

                </div>


                <button
                    class="primary-button"
                    type="submit"
                >
                    ${isEdit ? "Сохранить" : "Добавить"}
                </button>

            </form>

            `
        );


        $("birthdayForm")?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                try {

                    const values = {

                        player_id:
                            Number(
                                $("birthdayPlayer").value
                            ),

                        birthday:
                            $("birthdayDate").value,

                        note:
                            $("birthdayNote")
                                .value.trim() || null
                    };


                    if (isEdit) {

                        await update(
                            "birthdays",
                            birthday.id,
                            values
                        );

                    } else {

                        await insert(
                            "birthdays",
                            values
                        );
                    }


                    toast(
                        "День рождения сохранён."
                    );

                    closeModal();

                    await loadBirthdays();

                    renderBirthdays();

                } catch (error) {

                    toast(
                        error.message,
                        "error"
                    );
                }
            }
        );
    }


    async function deleteBirthday(id) {

        if (!confirm(
            "Удалить запись?"
        )) return;

        try {

            await remove(
                "birthdays",
                id
            );

            await loadBirthdays();

            renderBirthdays();

            toast(
                "Запись удалена."
            );

        } catch (error) {

            toast(
                error.message,
                "error"
            );
        }
    }


    /* =====================================================
       ACHIEVEMENTS
       ===================================================== */

    function renderAchievements() {

        const container =
            $("achievementsAdminList");

        if (!container) return;


        container.innerHTML =
            state.achievements.length
            ? state.achievements.map(item => `

                <div class="admin-card">

                    ${
                        item.image_url
                            ? `
                                <img
                                    src="${escapeHTML(item.image_url)}"
                                    alt=""
                                    style="
                                        width:100%;
                                        max-height:220px;
                                        object-fit:cover;
                                        border-radius:16px;
                                        margin-bottom:14px;
                                    "
                                >
                              `
                            : ""
                    }


                    <div class="card-title">
                        ${escapeHTML(item.title)}
                    </div>


                    <div class="card-description">
                        ${escapeHTML(item.description || "")}
                    </div>


                    <div class="admin-actions">

                        <button
                            class="small-button"
                            type="button"
                            data-action="edit-achievement"
                            data-id="${item.id}"
                        >
                            Изменить
                        </button>

                        <button
                            class="small-button danger"
                            type="button"
                            data-action="delete-achievement"
                            data-id="${item.id}"
                        >
                            Удалить
                        </button>

                    </div>

                </div>

            `).join("")
            : `
                <div class="admin-card">
                    Достижений пока нет.
                </div>
            `;
    }


    function openAchievementForm(item = null) {

        const isEdit =
            Boolean(item);


        openModal(
            isEdit
                ? "Редактирование достижения"
                : "Добавить достижение",

            `

            <form id="achievementForm">

                <div class="form-group">

                    <label>Название</label>

                    <input
                        id="achievementTitle"
                        type="text"
                        value="${escapeHTML(item?.title || "")}"
                        required
                    >

                </div>


                <div class="form-group">

                    <label>Описание</label>

                    <textarea
                        id="achievementDescription"
                        rows="6"
                    >${escapeHTML(item?.description || "")}</textarea>

                </div>


                <div class="form-group">

                    <label>Порядок</label>

                    <input
                        id="achievementOrder"
                        type="number"
                        value="${item?.sort_order ?? 0}"
                    >

                </div>


                <div class="form-group">

                    <label>Изображение</label>

                    <input
                        id="achievementImage"
                        type="file"
                        accept="image/*"
                    >

                </div>


                <button
                    class="primary-button"
                    type="submit"
                >
                    ${isEdit ? "Сохранить" : "Добавить"}
                </button>

            </form>

            `
        );


        $("achievementForm")?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                try {

                    let imageUrl =
                        item?.image_url ||
                        null;


                    const file =
                        $("achievementImage")
                            ?.files?.[0];


                    if (file) {

                        imageUrl =
                            await uploadFile(
                                file,
                                "achievements"
                            );
                    }


                    const values = {

                        title:
                            $("achievementTitle")
                                .value.trim(),

                        description:
                            $("achievementDescription")
                                .value.trim() || null,

                        sort_order:
                            Number(
                                $("achievementOrder").value || 0
                            ),

                        image_url:
                            imageUrl
                    };


                    if (isEdit) {

                        await update(
                            "achievements",
                            item.id,
                            values
                        );

                    } else {

                        await insert(
                            "achievements",
                            values
                        );
                    }


                    toast(
                        "Достижение сохранено."
                    );

                    closeModal();

                    await loadAchievements();

                    renderAchievements();

                } catch (error) {

                    toast(
                        error.message,
                        "error"
                    );
                }
            }
        );
    }


    async function deleteAchievement(id) {

        if (!confirm(
            "Удалить достижение?"
        )) return;

        try {

            await remove(
                "achievements",
                id
            );

            await loadAchievements();

            renderAchievements();

            toast(
                "Достижение удалено."
            );

        } catch (error) {

            toast(
                error.message,
                "error"
            );
        }
    }


    /* =====================================================
       REGISTRY
       ===================================================== */

    function renderRegistry() {

        const teams =
            $("registryTeamsList");

        if (teams) {

            teams.innerHTML =
                state.teams.map(team => `

                    <div class="admin-list-item">

                        <div>

                            <strong>
                                ${escapeHTML(team.name)}
                            </strong>

                            <span>
                                ${
                                    team.city
                                        ? escapeHTML(team.city)
                                        : ""
                                }
                            </span>

                        </div>


                        <div class="admin-actions">

                            <button
                                class="small-button"
                                type="button"
                                data-action="edit-team"
                                data-id="${team.id}"
                            >
                                Изменить
                            </button>

                            <button
                                class="small-button danger"
                                type="button"
                                data-action="delete-team"
                                data-id="${team.id}"
                            >
                                Удалить
                            </button>

                        </div>

                    </div>

                `).join("");
        }


        const venues =
            $("registryVenuesList");

        if (venues) {

            const uniqueVenues =
                [
                    ...new Set(
                        state.matches
                            .map(match => match.venue)
                            .filter(Boolean)
                    )
                ];


            venues.innerHTML =
                uniqueVenues.length
                ? uniqueVenues.map(venue => `

                    <div class="admin-list-item">

                        <strong>
                            ${escapeHTML(venue)}
                        </strong>

                    </div>

                `).join("")
                : `
                    <div class="card-description">
                        Арены появятся после добавления матчей.
                    </div>
                `;
        }
    }


    function openTeamForm(team = null) {

        const isEdit =
            Boolean(team);


        openModal(
            isEdit
                ? "Редактирование команды"
                : "Добавить команду",

            `

            <form id="teamForm">

                <div class="form-group">

                    <label>Название</label>

                    <input
                        id="teamNameInput"
                        type="text"
                        value="${escapeHTML(team?.name || "")}"
                        required
                    >

                </div>


                <div class="form-group">

                    <label>Короткое название</label>

                    <input
                        id="teamShortName"
                        type="text"
                        value="${escapeHTML(team?.short_name || "")}"
                    >

                </div>


                <div class="form-group">

                    <label>Город</label>

                    <input
                        id="teamCity"
                        type="text"
                        value="${escapeHTML(team?.city || "")}"
                    >

                </div>


                <div class="form-group">

                    <label>Логотип</label>

                    <input
                        id="teamLogo"
                        type="file"
                        accept="image/*"
                    >

                </div>


                <button
                    class="primary-button"
                    type="submit"
                >
                    ${isEdit ? "Сохранить" : "Добавить"}
                </button>

            </form>

            `
        );


        $("teamForm")?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                try {

                    let logoUrl =
                        team?.logo_url ||
                        null;


                    const file =
                        $("teamLogo")
                            ?.files?.[0];


                    if (file) {

                        logoUrl =
                            await uploadFile(
                                file,
                                "teams"
                            );
                    }


                    const values = {

                        name:
                            $("teamNameInput")
                                .value.trim(),

                        short_name:
                            $("teamShortName")
                                .value.trim() || null,

                        city:
                            $("teamCity")
                                .value.trim() || null,

                        logo_url:
                            logoUrl
                    };


                    if (isEdit) {

                        await update(
                            "teams",
                            team.id,
                            values
                        );

                    } else {

                        await insert(
                            "teams",
                            values
                        );
                    }


                    toast(
                        "Команда сохранена."
                    );

                    closeModal();

                    await loadTeams();

                    renderRegistry();

                    renderMatches();

                } catch (error) {

                    toast(
                        error.message,
                        "error"
                    );
                }
            }
        );
    }


    async function deleteTeam(id) {

        if (!confirm(
            "Удалить команду?"
        )) return;

        try {

            await remove(
                "teams",
                id
            );

            toast(
                "Команда удалена."
            );

            await loadTeams();

            await loadStandings();

            renderRegistry();

            renderStandings();

        } catch (error) {

            toast(
                error.message,
                "error"
            );
        }
    }


    /* =====================================================
       DESIGN
       ===================================================== */

    function renderDesign() {

        const settings =
            state.settings || {};


        const colors = {

            primary:
                settings.primary_color ||
                DEFAULTS.colors.primary,

            accent:
                settings.gold_color ||
                settings.accent_color ||
                DEFAULTS.colors.accent,

            background:
                settings.background_color ||
                DEFAULTS.colors.background,

            surface:
                DEFAULTS.colors.surface,

            text:
                settings.text_color ||
                DEFAULTS.colors.text,

            muted:
                DEFAULTS.colors.muted,

            border:
                DEFAULTS.colors.border
        };


        setColor(
            "colorPrimary",
            "colorPrimaryHex",
            colors.primary
        );

        setColor(
            "colorAccent",
            "colorAccentHex",
            colors.accent
        );

        setColor(
            "colorBackground",
            "colorBackgroundHex",
            colors.background
        );

        setColor(
            "colorSurface",
            "colorSurfaceHex",
            colors.surface
        );

        setColor(
            "colorText",
            "colorTextHex",
            colors.text
        );

        setColor(
            "colorMuted",
            "colorMutedHex",
            colors.muted
        );

        setColor(
            "colorBorder",
            "colorBorderHex",
            colors.border
        );


        if ($("designTeamName")) {
            $("designTeamName").value =
                settings.team_name ||
                DEFAULTS.teamName;
        }


        if ($("designSubtitle")) {
            $("designSubtitle").value =
                settings.subtitle ||
                "НАБЕРЕЖНЫЕ ЧЕЛНЫ";
        }


        if ($("designTitleSize")) {
            $("designTitleSize").value =
                settings.title_size ||
                24;
        }


        if ($("logoPreview")) {

            $("logoPreview").innerHTML =
                settings.logo_url
                    ? `
                        <img
                            src="${escapeHTML(settings.logo_url)}"
                            alt="Логотип"
                        >
                      `
                    : `
                        <span>
                            Логотип не загружен
                        </span>
                      `;
        }


        renderIcons();
    }


    function setColor(
        colorId,
        hexId,
        value
    ) {

        const color =
            $(colorId);

        const hex =
            $(hexId);

        if (color) {
            color.value =
                normalizeHex(value);
        }

        if (hex) {
            hex.value =
                normalizeHex(value);
        }
    }


    function normalizeHex(value) {

        const text =
            String(value || "")
                .trim();


        if (/^#[0-9a-fA-F]{6}$/.test(text)) {
            return text;
        }


        if (/^[0-9a-fA-F]{6}$/.test(text)) {
            return `#${text}`;
        }


        return "#000000";
    }


    function bindColorPair(
        colorId,
        hexId
    ) {

        const color =
            $(colorId);

        const hex =
            $(hexId);


        color?.addEventListener(
            "input",
            () => {

                hex.value =
                    color.value
                        .toLowerCase();

            }
        );


        hex?.addEventListener(
            "input",
            () => {

                const normalized =
                    normalizeHex(
                        hex.value
                    );


                if (
                    /^#[0-9a-fA-F]{6}$/.test(
                        normalized
                    )
                ) {

                    color.value =
                        normalized;
                }
            }
        );
    }


    async function saveDesign() {

        try {

            let logoUrl =
                state.settings?.logo_url ||
                null;


            const file =
                $("logoUpload")
                    ?.files?.[0];


            if (file) {

                logoUrl =
                    await uploadFile(
                        file,
                        "logo"
                    );
            }


            const values = {

                team_name:
                    $("designTeamName")
                        ?.value.trim() ||
                    DEFAULTS.teamName,

                subtitle:
                    $("designSubtitle")
                        ?.value.trim() ||
                    "НАБЕРЕЖНЫЕ ЧЕЛНЫ",

                title_size:
                    Number(
                        $("designTitleSize")
                            ?.value || 24
                    ),

                logo_url:
                    logoUrl,

                primary_color:
                    $("colorPrimaryHex")
                        ?.value || DEFAULTS.colors.primary,

                gold_color:
                    $("colorAccentHex")
                        ?.value || DEFAULTS.colors.accent,

                accent_color:
                    $("colorAccentHex")
                        ?.value || DEFAULTS.colors.accent,

                background_color:
                    $("colorBackgroundHex")
                        ?.value || DEFAULTS.colors.background,

                text_color:
                    $("colorTextHex")
                        ?.value || DEFAULTS.colors.text
            };


            await saveSettingsData(
                values
            );


            toast(
                "Дизайн сохранён."
            );

            renderDesign();

        } catch (error) {

            console.error(error);

            toast(
                error.message,
                "error"
            );
        }
    }


    /* =====================================================
       ICONS
       ===================================================== */

    function renderIcons() {

        const container =
            $("iconsAdminList");

        if (!container) return;


        const icons =
            state.settings?.icons || {};


        const entries =
            Object.entries(icons);


        container.innerHTML =
            entries.length
            ? entries.map(([name, url]) => `

                <div class="admin-list-item">

                    <div>

                        <strong>
                            ${escapeHTML(name)}
                        </strong>

                        <span>
                            ${escapeHTML(url)}
                        </span>

                    </div>


                    <button
                        class="small-button danger"
                        type="button"
                        data-action="delete-icon"
                        data-icon="${escapeHTML(name)}"
                    >
                        Удалить
                    </button>

                </div>

            `).join("")
            : `
                <div class="card-description">
                    Пользовательских иконок пока нет.
                </div>
            `;
    }


    function openIconForm() {

        openModal(
            "Добавить иконку",

            `

            <form id="iconForm">

                <div class="form-group">

                    <label>Название</label>

                    <input
                        id="iconName"
                        type="text"
                        placeholder="telegram"
                        required
                    >

                </div>


                <div class="form-group">

                    <label>Файл</label>

                    <input
                        id="iconFile"
                        type="file"
                        accept="image/*,.svg"
                        required
                    >

                </div>


                <button
                    class="primary-button"
                    type="submit"
                >
                    Добавить
                </button>

            </form>

            `
        );


        $("iconForm")?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                try {

                    const name =
                        $("iconName")
                            .value.trim();


                    const file =
                        $("iconFile")
                            .files?.[0];


                    if (!name || !file) {
                        toast(
                            "Заполни все поля.",
                            "warning"
                        );
                        return;
                    }


                    const url =
                        await uploadFile(
                            file,
                            "icons"
                        );


                    const icons =
                        {
                            ...(state.settings?.icons || {}),
                            [name]: url
                        };


                    await saveSettingsData({
                        icons
                    });


                    toast(
                        "Иконка добавлена."
                    );

                    closeModal();

                    renderDesign();

                } catch (error) {

                    console.error(error);

                    toast(
                        error.message,
                        "error"
                    );
                }
            }
        );
    }


    async function deleteIcon(name) {

        const icons =
            {
                ...(state.settings?.icons || {})
            };


        delete icons[name];


        try {

            await saveSettingsData({
                icons
            });

            renderDesign();

            toast(
                "Иконка удалена."
            );

        } catch (error) {

            toast(
                error.message,
                "error"
            );
        }
    }


    /* =====================================================
       STORAGE
       ===================================================== */

    async function uploadFile(
        file,
        folder = "uploads"
    ) {

        if (!file) {
            throw new Error(
                "Файл не выбран."
            );
        }


        const safeName =
            file.name
                .replace(
                    /[^a-zA-Z0-9а-яА-Я._-]/g,
                    "_"
                );


        const path =
            `${folder}/${Date.now()}_${safeName}`;


        const {
            error
        } = await db
            .storage
            .from(STORAGE_BUCKET)
            .upload(
                path,
                file,
                {
                    upsert: false,
                    contentType:
                        file.type || undefined
                }
            );


        if (error) throw error;


        const {
            data
        } = db
            .storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(path);


        return data.publicUrl;
    }


    /* =====================================================
       SETTINGS SECTION
       ===================================================== */

    function loadSettingsForm() {

        const settings =
            state.settings || {};


        if ($("settingsTeamName")) {
            $("settingsTeamName").value =
                settings.team_name ||
                DEFAULTS.teamName;
        }


        if ($("settingsSubtitle")) {
            $("settingsSubtitle").value =
                settings.subtitle ||
                "НАБЕРЕЖНЫЕ ЧЕЛНЫ";
        }


        if ($("settingsTimezone")) {
            $("settingsTimezone").value =
                settings.timezone ||
                "Europe/Moscow";
        }


        if ($("settingsAdminEmail")) {
            $("settingsAdminEmail").value =
                currentUser?.email ||
                "";
        }
    }


    async function saveGeneralSettings() {

        try {

            await saveSettingsData({

                team_name:
                    $("settingsTeamName")
                        ?.value.trim() ||
                    DEFAULTS.teamName,

                subtitle:
                    $("settingsSubtitle")
                        ?.value.trim() ||
                    "НАБЕРЕЖНЫЕ ЧЕЛНЫ",

                timezone:
                    $("settingsTimezone")
                        ?.value.trim() ||
                    "Europe/Moscow"
            });


            toast(
                "Настройки сохранены."
            );

        } catch (error) {

            toast(
                error.message,
                "error"
            );
        }
    }


    /* =====================================================
       NAVIGATION
       ===================================================== */

    const sectionNames = {

        dashboard: [
            "Главная",
            "Управление сайтом"
        ],

        homepage: [
            "Главная сайта",
            "Управление содержимым главной"
        ],

        matches: [
            "Матчи",
            "Расписание и матч-центр"
        ],

        players: [
            "Состав",
            "Игроки команды"
        ],

        stats: [
            "Статистика",
            "Статистика игроков"
        ],

        news: [
            "Новости",
            "Публикации команды"
        ],

        media: [
            "Медиа",
            "Фотоальбомы"
        ],

        products: [
            "Товары",
            "Атрибутика команды"
        ],

        standings: [
            "Таблица",
            "Турнирная таблица"
        ],

        birthdays: [
            "Дни рождения",
            "Поздравления игроков"
        ],

        achievements: [
            "Достижения",
            "Кубки и турниры"
        ],

        registry: [
            "Реестры",
            "Команды и арены"
        ],

        design: [
            "Дизайн",
            "Визуальная система"
        ],

        settings: [
            "Настройки",
            "Общие параметры"
        ]
    };


    function openSection(section) {

        if (!section) return;


        $$(".sidebar-item[data-section]").forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.section === section
                );
            }
        );


        $$(".admin-section").forEach(
            element => {

                element.classList.toggle(
                    "active",
                    element.id ===
                    `section-${section}`
                );
            }
        );


        const info =
            sectionNames[section] ||
            [
                section,
                ""
            ];


        if ($("currentSectionTitle")) {
            $("currentSectionTitle").textContent =
                info[0];
        }


        if ($("currentSectionSubtitle")) {
            $("currentSectionSubtitle").textContent =
                info[1];
        }


        if (section === "settings") {
            loadSettingsForm();
        }


        closeMobileSidebar();
    }


    /* =====================================================
       MOBILE SIDEBAR
       ===================================================== */

    function openMobileSidebar() {

        const sidebar =
            $("adminSidebar");

        if (!sidebar) return;


        sidebar.classList.add(
            "open"
        );


        let overlay =
            document.querySelector(
                ".admin-sidebar-overlay"
            );


        if (!overlay) {

            overlay =
                document.createElement(
                    "div"
                );

            overlay.className =
                "admin-sidebar-overlay";

            document.body.appendChild(
                overlay
            );


            overlay.addEventListener(
                "click",
                closeMobileSidebar
            );
        }


        overlay.classList.add(
            "show"
        );
    }


    function closeMobileSidebar() {

        const sidebar =
            $("adminSidebar");


        sidebar?.classList.remove(
            "open"
        );


        document
            .querySelector(
                ".admin-sidebar-overlay"
            )
            ?.classList.remove(
                "show"
            );
    }


    /* =====================================================
       GLOBAL CLICK HANDLER
       ===================================================== */

    function handleActionClick(event) {

        const button =
            event.target.closest(
                "[data-action]"
            );


        if (!button) return;


        const action =
            button.dataset.action;

        const id =
            button.dataset.id;


        switch (action) {

            case "edit-match":
                openMatchForm(
                    getMatch(id)
                );
                break;


            case "delete-match":
                deleteMatch(id);
                break;


            case "match-center":
                openMatchCenter(id);
                break;


            case "edit-player":
                openPlayerForm(
                    getPlayer(id)
                );
                break;


            case "delete-player":
                deletePlayer(id);
                break;


            case "edit-news":
                openNewsForm(
                    state.news.find(
                        item =>
                            String(item.id) ===
                            String(id)
                    )
                );
                break;


            case "delete-news":
                deleteNews(id);
                break;


            case "edit-album":
                openAlbumForm(
                    state.albums.find(
                        item =>
                            String(item.id) ===
                            String(id)
                    )
                );
                break;


            case "delete-album":
                deleteAlbum(id);
                break;


            case "edit-product":
                openProductForm(
                    state.products.find(
                        item =>
                            String(item.id) ===
                            String(id)
                    )
                );
                break;


            case "delete-product":
                deleteProduct(id);
                break;


            case "edit-standing":
                openStandingForm(
                    state.standings.find(
                        item =>
                            String(item.id) ===
                            String(id)
                    )
                );
                break;


            case "delete-standing":
                deleteStanding(id);
                break;


            case "edit-birthday":
                openBirthdayForm(
                    state.birthdays.find(
                        item =>
                            String(item.id) ===
                            String(id)
                    )
                );
                break;


            case "delete-birthday":
                deleteBirthday(id);
                break;


            case "edit-achievement":
                openAchievementForm(
                    state.achievements.find(
                        item =>
                            String(item.id) ===
                            String(id)
                    )
                );
                break;


            case "delete-achievement":
                deleteAchievement(id);
                break;


            case "edit-team":
                openTeamForm(
                    getTeam(id)
                );
                break;


            case "delete-team":
                deleteTeam(id);
                break;


            case "delete-icon":
                deleteIcon(
                    button.dataset.icon
                );
                break;
        }
    }


    /* =====================================================
       EVENT BINDINGS
       ===================================================== */

    function bindEvents() {

        /* Navigation */

        document.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "[data-section]"
                    );


                if (
                    button &&
                    (
                        button.classList.contains(
                            "sidebar-item"
                        ) ||
                        button.classList.contains(
                            "quick-action"
                        )
                    )
                ) {

                    event.preventDefault();

                    openSection(
                        button.dataset.section
                    );

                    return;
                }
            }
        );


        /* CRUD actions */

        document.addEventListener(
            "click",
            handleActionClick
        );


        /* Login */

        $("loginForm")?.addEventListener(
            "submit",
            login
        );


        /* Logout */

        $("logoutButton")?.addEventListener(
            "click",
            logout
        );


        /* Refresh */

        $("refreshButton")?.addEventListener(
            "click",
            async () => {

                const button =
                    $("refreshButton");

                if (button) {
                    button.classList.add(
                        "rotating"
                    );
                }


                await loadEverything();


                if (button) {
                    button.classList.remove(
                        "rotating"
                    );
                }


                toast(
                    "Данные обновлены."
                );
            }
        );


        /* Mobile menu */

        $("mobileMenuButton")?.addEventListener(
            "click",
            openMobileSidebar
        );


        /* Modal */

        $("adminModalClose")?.addEventListener(
            "click",
            closeModal
        );


        $("adminModalBackdrop")?.addEventListener(
            "click",
            closeModal
        );


        /* Add buttons */

        $("addMatchButton")?.addEventListener(
            "click",
            () => openMatchForm()
        );


        $("addPlayerButton")?.addEventListener(
            "click",
            () => openPlayerForm()
        );


        $("addNewsButton")?.addEventListener(
            "click",
            () => openNewsForm()
        );


        $("addAlbumButton")?.addEventListener(
            "click",
            () => openAlbumForm()
        );


        $("addProductButton")?.addEventListener(
            "click",
            () => openProductForm()
        );


        $("addStandingButton")?.addEventListener(
            "click",
            () => openStandingForm()
        );


        $("addBirthdayButton")?.addEventListener(
            "click",
            () => openBirthdayForm()
        );


        $("addAchievementButton")?.addEventListener(
            "click",
            () => openAchievementForm()
        );


        $("addRegistryTeamButton")?.addEventListener(
            "click",
            () => openTeamForm()
        );


        $("addRegistryVenueButton")?.addEventListener(
            "click",
            () => openVenueForm()
        );


        $("addIconButton")?.addEventListener(
            "click",
            openIconForm
        );


        /* Stats */

        $("addGoalButton")?.addEventListener(
            "click",
            () => openQuickStatForm("goal")
        );


        $("addAssistButton")?.addEventListener(
            "click",
            () => openQuickStatForm("assist")
        );


        $("addPenaltyButton")?.addEventListener(
            "click",
            () => openQuickStatForm("penalty")
        );


        /* Homepage */

        $("saveHomepageButton")?.addEventListener(
            "click",
            saveHomepage
        );


        /* Design */

        $("saveDesignButton")?.addEventListener(
            "click",
            saveDesign
        );


        /* Settings */

        $("saveSettingsButton")?.addEventListener(
            "click",
            saveGeneralSettings
        );


        /* Player filters */

        $$(".admin-filter[data-player-filter]")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        $$(".admin-filter[data-player-filter]")
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );


                        button.classList.add(
                            "active"
                        );


                        currentPlayerFilter =
                            button.dataset.playerFilter;


                        renderPlayers();
                    }
                );
            });


        /* Color inputs */

        bindColorPair(
            "colorPrimary",
            "colorPrimaryHex"
        );

        bindColorPair(
            "colorAccent",
            "colorAccentHex"
        );

        bindColorPair(
            "colorBackground",
            "colorBackgroundHex"
        );

        bindColorPair(
            "colorSurface",
            "colorSurfaceHex"
        );

        bindColorPair(
            "colorText",
            "colorTextHex"
        );

        bindColorPair(
            "colorMuted",
            "colorMutedHex"
        );

        bindColorPair(
            "colorBorder",
            "colorBorderHex"
        );


        /* ESC */

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape"
                ) {

                    closeModal();

                    closeMobileSidebar();
                }
            }
        );
    }


    /* =====================================================
       VENUES
       ===================================================== */

    /*
       Отдельной таблицы venues в текущей schema.sql нет.
       Поэтому арены хранятся в matches.venue.
    */

    function openVenueForm() {

        openModal(
            "Добавить арену",

            `

            <form id="venueForm">

                <div class="form-group">

                    <label>
                        Название арены
                    </label>

                    <input
                        id="venueName"
                        type="text"
                        placeholder="ЛД «Челны»"
                        required
                    >

                </div>


                <div class="card-description">

                    В текущей базе отдельного реестра арен нет.
                    Арена будет сохранена при создании
                    или редактировании матча.

                </div>


                <button
                    class="primary-button"
                    type="submit"
                >
                    Создать тестовый матч с ареной
                </button>

            </form>

            `
        );


        $("venueForm")?.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                const venue =
                    $("venueName")
                        .value.trim();


                if (!venue) return;


                closeModal();


                openMatchForm({
                    match_date: "",
                    match_time: "",
                    tournament: "",
                    home_team_id: null,
                    away_team_id: null,
                    venue,
                    status: "scheduled"
                });
            }
        );
    }


    /* =====================================================
       INIT
       ===================================================== */

    async function init() {

        try {

            initSupabase();

            bindEvents();

            setLoaderText(
                "Подключение к Supabase..."
            );

            await checkAuth();

        } catch (error) {

            console.error(
                "ADMIN INIT ERROR:",
                error
            );


            $("adminLoader")?.classList.add(
                "hidden"
            );


            if ($("loginError")) {

                $("loginError").textContent =
                    error.message ||
                    "Ошибка запуска админ-панели.";
            }


            $("loginScreen")?.classList.remove(
                "hidden"
            );
        }
    }


    /* =====================================================
       START
       ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();
    }

})();
