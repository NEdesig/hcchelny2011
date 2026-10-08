/* ============================================================
   ХК ЧЕЛНЫ 2011
   ADMIN.JS
   ============================================================ */

let db = null;

let adminData = {
    settings: {},
    teams: [],
    matches: [],
    players: [],
    stats: [],
    news: [],
    standings: [],
    achievements: [],
    birthdays: [],
    products: [],
    albums: []
};

let currentAdminSection = "matches";
let currentEditingId = null;


/* ============================================================
   INIT
   ============================================================ */

async function initializeAdmin() {

    try {

        db = initSupabase();

        if (!db) {
            console.error("Supabase не инициализирован");
            return;
        }

        setupAdminEvents();

        const session = await getSession();

        if (session) {
            showAdminApp();
            await loadAdminData();
        } else {
            showAuthScreen();
        }

    } catch (error) {

        console.error("Ошибка запуска админки:", error);

        showAuthScreen();

    }

}


/* ============================================================
   AUTH
   ============================================================ */

function showAuthScreen() {

    const auth = document.getElementById("authScreen");
    const app = document.getElementById("adminApp");

    if (auth) {
        auth.classList.remove("hidden");
    }

    if (app) {
        app.classList.add("hidden");
    }

}


function showAdminApp() {

    const auth = document.getElementById("authScreen");
    const app = document.getElementById("adminApp");

    if (auth) {
        auth.classList.add("hidden");
    }

    if (app) {
        app.classList.remove("hidden");
    }

}


async function handleLogin(event) {

    event.preventDefault();

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const errorBox = document.getElementById("loginError");

    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
        setLoginError("Заполните email и пароль.");
        return;
    }

    setLoginError("");

    try {

        await signIn(email, password);

        showAdminApp();

        await loadAdminData();

        showToast("Вы вошли в админ-панель.");

    } catch (error) {

        console.error(error);

        setLoginError(
            error?.message ||
            "Не удалось войти. Проверьте email и пароль."
        );

    }

}


function setLoginError(message) {

    const box = document.getElementById("loginError");

    if (!box) {
        return;
    }

    if (!message) {

        box.textContent = "";
        box.classList.add("hidden");

        return;
    }

    box.textContent = message;
    box.classList.remove("hidden");

}


async function handleLogout() {

    try {

        await signOut();

        showAuthScreen();

        showToast("Вы вышли из аккаунта.");

    } catch (error) {

        console.error(error);

        showToast("Ошибка выхода из аккаунта.");

    }

}


/* ============================================================
   EVENTS
   ============================================================ */

function setupAdminEvents() {

    const loginForm =
        document.getElementById("loginForm");

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );

    }


    const logoutButton =
        document.getElementById("logoutButton");

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            handleLogout
        );

    }


    document
        .querySelectorAll("[data-admin-section]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const section =
                        button.dataset.adminSection;

                    openAdminSection(section);

                }
            );

        });


    bindButton(
        "addMatchButton",
        openMatchForm
    );

    bindButton(
        "addPlayerButton",
        openPlayerForm
    );

    bindButton(
        "addNewsButton",
        openNewsForm
    );

    bindButton(
        "addStandingButton",
        openStandingForm
    );

    bindButton(
        "addAchievementButton",
        openAchievementForm
    );

    bindButton(
        "addBirthdayButton",
        openBirthdayForm
    );

    bindButton(
        "addProductButton",
        openProductForm
    );


    bindButton(
        "saveColorsButton",
        saveDesignColors
    );

    bindButton(
        "saveFontsButton",
        saveDesignFonts
    );

    bindButton(
        "saveHomepageButton",
        saveHomepageBlocks
    );


    const logoFile =
        document.getElementById("logoFile");

    if (logoFile) {

        logoFile.addEventListener(
            "change",
            previewLogo
        );

    }


    const fontFile =
        document.getElementById("fontFile");

    if (fontFile) {

        fontFile.addEventListener(
            "change",
            previewFontFile
        );

    }


    document
        .querySelectorAll("[data-close-admin-modal]")
        .forEach(element => {

            element.addEventListener(
                "click",
                closeAdminModal
            );

        });

}


/* ============================================================
   ADMIN SECTIONS
   ============================================================ */

function openAdminSection(section) {

    currentAdminSection = section;

    document
        .querySelectorAll(".admin-section")
        .forEach(element => {

            element.classList.add("hidden");

        });


    const sectionElement =
        document.getElementById(
            `adminSection${capitalize(section)}`
        );

    if (sectionElement) {

        sectionElement.classList.remove("hidden");

    }


    document
        .querySelectorAll("[data-admin-section]")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.adminSection === section
            );

        });


    renderCurrentSection();

}


function renderCurrentSection() {

    switch (currentAdminSection) {

        case "matches":
            renderMatches();
            break;

        case "archive":
            renderArchive();
            break;

        case "players":
            renderPlayers();
            break;

        case "news":
            renderNews();
            break;

        case "table":
            renderStandings();
            break;

        case "content":
            renderContent();
            break;

        case "design":
            renderDesign();
            break;

    }

}


/* ============================================================
   LOAD ALL DATA
   ============================================================ */

async function loadAdminData() {

    showAdminApp();

    try {

        await Promise.all([
            loadSettingsAdmin(),
            loadTeamsAdmin(),
            loadMatchesAdmin(),
            loadPlayersAdmin(),
            loadStatsAdmin(),
            loadNewsAdmin(),
            loadStandingsAdmin(),
            loadAchievementsAdmin(),
            loadBirthdaysAdmin(),
            loadProductsAdmin(),
            loadAlbumsAdmin()
        ]);

        fillDesignFields();

        renderCurrentSection();

    } catch (error) {

        console.error(
            "Ошибка загрузки данных:",
            error
        );

        showToast(
            "Не удалось полностью загрузить данные."
        );

    }

}


/* ============================================================
   SETTINGS
   ============================================================ */

async function loadSettingsAdmin() {

    try {

        adminData.settings =
            await loadSettings();

    } catch (error) {

        console.error(
            "Ошибка settings:",
            error
        );

        adminData.settings = {};

    }

}


async function saveSettingSafe(
    key,
    value
) {

    try {

        await saveSetting(
            key,
            value
        );

    } catch (error) {

        console.error(
            `Ошибка сохранения ${key}:`,
            error
        );

        throw error;

    }

}


/* ============================================================
   TEAMS
   ============================================================ */

async function loadTeamsAdmin() {

    try {

        adminData.teams =
            await apiRequest(
                "teams",
                {
                    method: "GET",
                    select: "*",
                    order: "name.asc"
                }
            );

    } catch (error) {

        console.error(
            "Ошибка teams:",
            error
        );

        adminData.teams = [];

    }

}


/* ============================================================
   MATCHES
   ============================================================ */

async function loadMatchesAdmin() {

    try {

        adminData.matches =
            await apiRequest(
                "matches",
                {
                    method: "GET",
                    select: "*",
                    order: "match_date.asc"
                }
            );

    } catch (error) {

        console.error(
            "Ошибка matches:",
            error
        );

        adminData.matches = [];

    }

}


async function saveMatch(data, id = null) {

    const payload = {
        match_date: data.match_date || null,
        match_time: data.match_time || null,
        tournament: data.tournament || "",
        venue: data.venue || "",
        home_team_id: data.home_team_id || null,
        away_team_id: data.away_team_id || null,
        home_score: numberOrZero(data.home_score),
        away_score: numberOrZero(data.away_score),
        status: data.status || "scheduled",
        stream_url: data.stream_url || null
    };


    try {

        if (id) {

            await apiRequest(
                `matches?id=eq.${id}`,
                {
                    method: "PATCH",
                    body: payload
                }
            );

        } else {

            await apiRequest(
                "matches",
                {
                    method: "POST",
                    body: payload
                }
            );

        }

        await loadMatchesAdmin();

        renderMatches();

        closeAdminModal();

        showToast(
            id
                ? "Матч обновлён."
                : "Матч добавлен."
        );

    } catch (error) {

        console.error(
            "Ошибка сохранения матча:",
            error
        );

        showToast(
            "Не удалось сохранить матч."
        );

    }

}


async function deleteMatch(id) {

    if (!confirm("Удалить этот матч?")) {
        return;
    }

    try {

        await apiRequest(
            `matches?id=eq.${id}`,
            {
                method: "DELETE"
            }
        );

        await loadMatchesAdmin();

        renderMatches();

        showToast("Матч удалён.");

    } catch (error) {

        console.error(error);

        showToast(
            "Не удалось удалить матч."
        );

    }

}


/* ============================================================
   PLAYERS
   ============================================================ */

async function loadPlayersAdmin() {

    try {

        adminData.players =
            await apiRequest(
                "players",
                {
                    method: "GET",
                    select: "*",
                    order: "number.asc"
                }
            );

    } catch (error) {

        console.error(
            "Ошибка players:",
            error
        );

        adminData.players = [];

    }

}


async function loadStatsAdmin() {

    try {

        adminData.stats =
            await apiRequest(
                "player_season_stats",
                {
                    method: "GET",
                    select: "*"
                }
            );

    } catch (error) {

        console.error(
            "Ошибка player_season_stats:",
            error
        );

        adminData.stats = [];

    }

}


async function savePlayer(data, id = null) {

    const payload = {
        full_name: data.full_name || "",
        number: numberOrZero(data.number),
        birth_date: data.birth_date || null,
        height_cm: numberOrNull(data.height_cm),
        weight_kg: numberOrNull(data.weight_kg),
        position: data.position || "forward",
        captain: Boolean(data.captain),
        assistant: Boolean(data.assistant),
        photo_url: data.photo_url || null
    };


    try {

        if (id) {

            await apiRequest(
                `players?id=eq.${id}`,
                {
                    method: "PATCH",
                    body: payload
                }
            );

        } else {

            await apiRequest(
                "players",
                {
                    method: "POST",
                    body: payload
                }
            );

        }

        await loadPlayersAdmin();

        renderPlayers();

        closeAdminModal();

        showToast(
            id
                ? "Игрок обновлён."
                : "Игрок добавлен."
        );

    } catch (error) {

        console.error(
            "Ошибка игрока:",
            error
        );

        showToast(
            "Не удалось сохранить игрока."
        );

    }

}


async function deletePlayer(id) {

    if (!confirm("Удалить игрока?")) {
        return;
    }

    try {

        await apiRequest(
            `players?id=eq.${id}`,
            {
                method: "DELETE"
            }
        );

        await loadPlayersAdmin();

        renderPlayers();

        showToast("Игрок удалён.");

    } catch (error) {

        console.error(error);

        showToast(
            "Не удалось удалить игрока."
        );

    }

}


/* ============================================================
   NEWS
   ============================================================ */

async function loadNewsAdmin() {

    try {

        adminData.news =
            await apiRequest(
                "news",
                {
                    method: "GET",
                    select: "*",
                    order: "created_at.desc"
                }
            );

    } catch (error) {

        console.error(
            "Ошибка news:",
            error
        );

        adminData.news = [];

    }

}


async function saveNews(data, id = null) {

    const payload = {
        title: data.title || "",
        category: data.category || "Другое",
        description: data.description || "",
        content: data.content || "",
        image_url: data.image_url || null,
        published: data.published !== false
    };


    try {

        if (id) {

            await apiRequest(
                `news?id=eq.${id}`,
                {
                    method: "PATCH",
                    body: payload
                }
            );

        } else {

            await apiRequest(
                "news",
                {
                    method: "POST",
                    body: payload
                }
            );

        }

        await loadNewsAdmin();

        renderNews();

        closeAdminModal();

        showToast(
            id
                ? "Новость обновлена."
                : "Новость опубликована."
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Не удалось сохранить новость."
        );

    }

}


async function deleteNews(id) {

    if (!confirm("Удалить новость?")) {
        return;
    }

    try {

        await apiRequest(
            `news?id=eq.${id}`,
            {
                method: "DELETE"
            }
        );

        await loadNewsAdmin();

        renderNews();

        showToast("Новость удалена.");

    } catch (error) {

        console.error(error);

        showToast(
            "Не удалось удалить новость."
        );

    }

}


/* ============================================================
   STANDINGS
   ============================================================ */

async function loadStandingsAdmin() {

    try {

        adminData.standings =
            await apiRequest(
                "standings",
                {
                    method: "GET",
                    select: "*",
                    order: "place.asc"
                }
            );

    } catch (error) {

        console.error(
            "Ошибка standings:",
            error
        );

        adminData.standings = [];

    }

}


async function saveStanding(data, id = null) {

    const payload = {
        place: numberOrZero(data.place),
        team_name: data.team_name || "",
        games: numberOrZero(data.games),
        wins: numberOrZero(data.wins),
        wins_ot: numberOrZero(data.wins_ot),
        wins_so: numberOrZero(data.wins_so),
        losses_ot: numberOrZero(data.losses_ot),
        losses_so: numberOrZero(data.losses_so),
        losses: numberOrZero(data.losses),
        points: numberOrZero(data.points)
    };


    try {

        if (id) {

            await apiRequest(
                `standings?id=eq.${id}`,
                {
                    method: "PATCH",
                    body: payload
                }
            );

        } else {

            await apiRequest(
                "standings",
                {
                    method: "POST",
                    body: payload
                }
            );

        }

        await loadStandingsAdmin();

        renderStandings();

        closeAdminModal();

        showToast(
            id
                ? "Команда обновлена."
                : "Команда добавлена."
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Не удалось сохранить таблицу."
        );

    }

}


async function deleteStanding(id) {

    if (!confirm("Удалить команду из таблицы?")) {
        return;
    }

    try {

        await apiRequest(
            `standings?id=eq.${id}`,
            {
                method: "DELETE"
            }
        );

        await loadStandingsAdmin();

        renderStandings();

        showToast("Команда удалена.");

    } catch (error) {

        console.error(error);

        showToast(
            "Не удалось удалить команду."
        );

    }

}


/* ============================================================
   ACHIEVEMENTS
   ============================================================ */

async function loadAchievementsAdmin() {

    try {

        adminData.achievements =
            await apiRequest(
                "achievements",
                {
                    method: "GET",
                    select: "*",
                    order: "year.desc"
                }
            );

    } catch (error) {

        console.error(
            "Ошибка achievements:",
            error
        );

        adminData.achievements = [];

    }

}


async function saveAchievement(data, id = null) {

    const payload = {
        title: data.title || "",
        description: data.description || "",
        year: data.year || "",
        image_url: data.image_url || null
    };


    try {

        if (id) {

            await apiRequest(
                `achievements?id=eq.${id}`,
                {
                    method: "PATCH",
                    body: payload
                }
            );

        } else {

            await apiRequest(
                "achievements",
                {
                    method: "POST",
                    body: payload
                }
            );

        }

        await loadAchievementsAdmin();

        renderContent();

        closeAdminModal();

        showToast("Достижение сохранено.");

    } catch (error) {

        console.error(error);

        showToast(
            "Не удалось сохранить достижение."
        );

    }

}


async function deleteAchievement(id) {

    if (!confirm("Удалить достижение?")) {
        return;
    }

    try {

        await apiRequest(
            `achievements?id=eq.${id}`,
            {
                method: "DELETE"
            }
        );

        await loadAchievementsAdmin();

        renderContent();

    } catch (error) {

        console.error(error);

        showToast(
            "Не удалось удалить достижение."
        );

    }

}


/* ============================================================
   BIRTHDAYS
   ============================================================ */

async function loadBirthdaysAdmin() {

    try {

        adminData.birthdays =
            await apiRequest(
                "birthdays",
                {
                    method: "GET",
                    select: "*"
                }
            );

    } catch (error) {

        console.error(
            "Ошибка birthdays:",
            error
        );

        adminData.birthdays = [];

    }

}


async function saveBirthday(data, id = null) {

    const payload = {
        player_name: data.player_name || "",
        birth_date: data.birth_date || null,
        photo_url: data.photo_url || null
    };


    try {

        if (id) {

            await apiRequest(
                `birthdays?id=eq.${id}`,
                {
                    method: "PATCH",
                    body: payload
                }
            );

        } else {

            await apiRequest(
                "birthdays",
                {
                    method: "POST",
                    body: payload
                }
            );

        }

        await loadBirthdaysAdmin();

        renderContent();

        closeAdminModal();

        showToast("День рождения сохранён.");

    } catch (error) {

        console.error(error);

        showToast(
            "Не удалось сохранить день рождения."
        );

    }

}


async function deleteBirthday(id) {

    if (!confirm("Удалить запись?")) {
        return;
    }

    try {

        await apiRequest(
            `birthdays?id=eq.${id}`,
            {
                method: "DELETE"
            }
        );

        await loadBirthdaysAdmin();

        renderContent();

    } catch (error) {

        console.error(error);

        showToast(
            "Не удалось удалить запись."
        );

    }

}


/* ============================================================
   PRODUCTS
   ============================================================ */

async function loadProductsAdmin() {

    try {

        adminData.products =
            await apiRequest(
                "products",
                {
                    method: "GET",
                    select: "*",
                    order: "created_at.desc"
                }
            );

    } catch (error) {

        console.error(
            "Ошибка products:",
            error
        );

        adminData.products = [];

    }

}


async function saveProduct(data, id = null) {

    const payload = {
        name: data.name || "",
        description: data.description || "",
        price: numberOrZero(data.price),
        image_url: data.image_url || null,
        available: data.available !== false
    };


    try {

        if (id) {

            await apiRequest(
                `products?id=eq.${id}`,
                {
                    method: "PATCH",
                    body: payload
                }
            );

        } else {

            await apiRequest(
                "products",
                {
                    method: "POST",
                    body: payload
                }
            );

        }

        await loadProductsAdmin();

        renderContent();

        closeAdminModal();

        showToast("Товар сохранён.");

    } catch (error) {

        console.error(error);

        showToast(
            "Не удалось сохранить товар."
        );

    }

}


async function deleteProduct(id) {

    if (!confirm("Удалить товар?")) {
        return;
    }

    try {

        await apiRequest(
            `products?id=eq.${id}`,
            {
                method: "DELETE"
            }
        );

        await loadProductsAdmin();

        renderContent();

    } catch (error) {

        console.error(error);

        showToast(
            "Не удалось удалить товар."
        );

    }

}


/* ============================================================
   ALBUMS
   ============================================================ */

async function loadAlbumsAdmin() {

    try {

        adminData.albums =
            await apiRequest(
                "albums",
                {
                    method: "GET",
                    select: "*",
                    order: "created_at.desc"
                }
            );

    } catch (error) {

        console.error(
            "Ошибка albums:",
            error
        );

        adminData.albums = [];

    }

}


/* ============================================================
   MATCH RENDER
   ============================================================ */

function renderMatches() {

    const container =
        document.getElementById(
            "adminMatchesList"
        );

    if (!container) {
        return;
    }


    if (!adminData.matches.length) {

        container.innerHTML =
            emptyAdmin(
                "Матчей пока нет."
            );

        return;

    }


    const sorted =
        [...adminData.matches]
            .sort(compareMatches);


    container.innerHTML =
        sorted
            .map(match => {

                const home =
                    getTeamName(
                        match.home_team_id
                    );

                const away =
                    getTeamName(
                        match.away_team_id
                    );

                const date =
                    formatMatchDate(
                        match
                    );

                const status =
                    getMatchStatus(
                        match
                    );


                return `
                    <article class="admin-list-item">

                        <div class="admin-list-main">

                            <div class="admin-list-title">
                                ${escapeHTML(home)}
                                —
                                ${escapeHTML(away)}
                            </div>

                            <div class="admin-list-meta">
                                ${escapeHTML(date)}
                                ·
                                ${escapeHTML(
                                    match.tournament || ""
                                )}
                            </div>

                            <div class="admin-list-meta">
                                ${escapeHTML(status)}
                            </div>

                        </div>


                        <div class="admin-list-actions">

                            <button
                                type="button"
                                class="button button-small"
                                onclick="openMatchForm(${match.id})"
                            >
                                Изменить
                            </button>

                            <button
                                type="button"
                                class="button button-small danger"
                                onclick="deleteMatch(${match.id})"
                            >
                                Удалить
                            </button>

                        </div>

                    </article>
                `;

            })
            .join("");

}


/* ============================================================
   ARCHIVE
   ============================================================ */

function renderArchive() {

    const container =
        document.getElementById(
            "adminArchiveList"
        );

    if (!container) {
        return;
    }


    const archived =
        adminData.matches
            .filter(isPlayedMatch)
            .sort(
                (a, b) =>
                    getMatchTimestamp(b) -
                    getMatchTimestamp(a)
            );


    if (!archived.length) {

        container.innerHTML =
            emptyAdmin(
                "Завершённых матчей пока нет."
            );

        return;

    }


    container.innerHTML =
        archived
            .map(match => {

                const home =
                    getTeamName(
                        match.home_team_id
                    );

                const away =
                    getTeamName(
                        match.away_team_id
                    );


                return `
                    <article class="admin-list-item">

                        <div class="admin-list-main">

                            <div class="admin-list-title">
                                ${escapeHTML(home)}
                                ${numberOrZero(match.home_score)}
                                :
                                ${numberOrZero(match.away_score)}
                                ${escapeHTML(away)}
                            </div>

                            <div class="admin-list-meta">
                                ${escapeHTML(
                                    formatMatchDate(match)
                                )}
                            </div>

                        </div>

                        <div class="admin-list-actions">

                            <button
                                type="button"
                                class="button button-small"
                                onclick="openMatchForm(${match.id})"
                            >
                                Редактировать
                            </button>

                        </div>

                    </article>
                `;

            })
            .join("");

}


/* ============================================================
   PLAYERS RENDER
   ============================================================ */

function renderPlayers() {

    const container =
        document.getElementById(
            "adminPlayersList"
        );

    if (!container) {
        return;
    }


    if (!adminData.players.length) {

        container.innerHTML =
            emptyAdmin(
                "Игроков пока нет."
            );

        return;

    }


    container.innerHTML =
        adminData.players
            .map(player => {

                const role =
                    getPositionName(
                        player.position
                    );


                return `
                    <article class="admin-list-item">

                        <div class="admin-player-preview">

                            ${
                                player.photo_url
                                    ? `
                                        <img
                                            src="${escapeAttribute(
                                                getStorageUrl(
                                                    player.photo_url
                                                )
                                            )}"
                                            alt=""
                                        >
                                      `
                                    : `
                                        <div class="admin-player-number">
                                            ${numberOrZero(
                                                player.number
                                            )}
                                        </div>
                                      `
                            }

                        </div>


                        <div class="admin-list-main">

                            <div class="admin-list-title">

                                #${numberOrZero(
                                    player.number
                                )}

                                ${escapeHTML(
                                    player.full_name || ""
                                )}

                            </div>

                            <div class="admin-list-meta">
                                ${escapeHTML(role)}
                            </div>

                            <div class="admin-list-meta">

                                ${
                                    player.captain
                                        ? "Капитан"
                                        : player.assistant
                                            ? "Ассистент"
                                            : ""
                                }

                            </div>

                        </div>


                        <div class="admin-list-actions">

                            <button
                                type="button"
                                class="button button-small"
                                onclick="openPlayerForm(${player.id})"
                            >
                                Изменить
                            </button>

                            <button
                                type="button"
                                class="button button-small danger"
                                onclick="deletePlayer(${player.id})"
                            >
                                Удалить
                            </button>

                        </div>

                    </article>
                `;

            })
            .join("");

}


/* ============================================================
   NEWS RENDER
   ============================================================ */

function renderNews() {

    const container =
        document.getElementById(
            "adminNewsList"
        );

    if (!container) {
        return;
    }


    if (!adminData.news.length) {

        container.innerHTML =
            emptyAdmin(
                "Новостей пока нет."
            );

        return;

    }


    container.innerHTML =
        adminData.news
            .map(item => {

                return `
                    <article class="admin-list-item">

                        ${
                            item.image_url
                                ? `
                                    <img
                                        class="admin-news-thumb"
                                        src="${escapeAttribute(
                                            getStorageUrl(
                                                item.image_url
                                            )
                                        )}"
                                        alt=""
                                    >
                                  `
                                : ""
                        }


                        <div class="admin-list-main">

                            <div class="admin-list-title">
                                ${escapeHTML(
                                    item.title || ""
                                )}
                            </div>

                            <div class="admin-list-meta">
                                ${escapeHTML(
                                    item.category || "Другое"
                                )}
                            </div>

                            <div class="admin-list-meta">

                                ${
                                    item.published === false
                                        ? "Черновик"
                                        : "Опубликовано"
                                }

                            </div>

                        </div>


                        <div class="admin-list-actions">

                            <button
                                type="button"
                                class="button button-small"
                                onclick="openNewsForm(${item.id})"
                            >
                                Изменить
                            </button>

                            <button
                                type="button"
                                class="button button-small danger"
                                onclick="deleteNews(${item.id})"
                            >
                                Удалить
                            </button>

                        </div>

                    </article>
                `;

            })
            .join("");

}


/* ============================================================
   STANDINGS RENDER
   ============================================================ */

function renderStandings() {

    const container =
        document.getElementById(
            "adminStandingsList"
        );

    if (!container) {
        return;
    }


    if (!adminData.standings.length) {

        container.innerHTML =
            emptyAdmin(
                "Таблица пока пуста."
            );

        return;

    }


    container.innerHTML =
        adminData.standings
            .sort(
                (a, b) =>
                    numberOrZero(a.place) -
                    numberOrZero(b.place)
            )
            .map(item => {

                return `
                    <article class="admin-list-item">

                        <div class="admin-list-main">

                            <div class="admin-list-title">

                                #${numberOrZero(
                                    item.place
                                )}

                                ${escapeHTML(
                                    item.team_name || ""
                                )}

                            </div>

                            <div class="admin-list-meta">

                                И:
                                ${numberOrZero(item.games)}
                                ·
                                В:
                                ${numberOrZero(item.wins)}
                                ·
                                О:
                                ${numberOrZero(item.points)}

                            </div>

                        </div>


                        <div class="admin-list-actions">

                            <button
                                type="button"
                                class="button button-small"
                                onclick="openStandingForm(${item.id})"
                            >
                                Изменить
                            </button>

                            <button
                                type="button"
                                class="button button-small danger"
                                onclick="deleteStanding(${item.id})"
                            >
                                Удалить
                            </button>

                        </div>

                    </article>
                `;

            })
            .join("");

}


/* ============================================================
   CONTENT RENDER
   ============================================================ */

function renderContent() {

    renderAchievements();
    renderBirthdays();
    renderProducts();

}


function renderAchievements() {

    const container =
        document.getElementById(
            "adminAchievementsList"
        );

    if (!container) {
        return;
    }


    container.innerHTML =
        adminData.achievements.length

            ? adminData.achievements
                .map(item => `

                    <article class="admin-list-item">

                        <div class="admin-list-main">

                            <div class="admin-list-title">
                                ${escapeHTML(
                                    item.title || ""
                                )}
                            </div>

                            <div class="admin-list-meta">
                                ${escapeHTML(
                                    item.year || ""
                                )}
                            </div>

                        </div>

                        <div class="admin-list-actions">

                            <button
                                type="button"
                                class="button button-small"
                                onclick="openAchievementForm(${item.id})"
                            >
                                Изменить
                            </button>

                            <button
                                type="button"
                                class="button button-small danger"
                                onclick="deleteAchievement(${item.id})"
                            >
                                Удалить
                            </button>

                        </div>

                    </article>

                `)
                .join("")

            : emptyAdmin(
                "Достижений пока нет."
            );

}


function renderBirthdays() {

    const container =
        document.getElementById(
            "adminBirthdaysList"
        );

    if (!container) {
        return;
    }


    container.innerHTML =
        adminData.birthdays.length

            ? adminData.birthdays
                .map(item => `

                    <article class="admin-list-item">

                        <div class="admin-list-main">

                            <div class="admin-list-title">
                                ${escapeHTML(
                                    item.player_name || ""
                                )}
                            </div>

                            <div class="admin-list-meta">
                                ${escapeHTML(
                                    formatDateValue(
                                        item.birth_date
                                    )
                                )}
                            </div>

                        </div>

                        <div class="admin-list-actions">

                            <button
                                type="button"
                                class="button button-small"
                                onclick="openBirthdayForm(${item.id})"
                            >
                                Изменить
                            </button>

                            <button
                                type="button"
                                class="button button-small danger"
                                onclick="deleteBirthday(${item.id})"
                            >
                                Удалить
                            </button>

                        </div>

                    </article>

                `)
                .join("")

            : emptyAdmin(
                "Дней рождения пока нет."
            );

}


function renderProducts() {

    const container =
        document.getElementById(
            "adminProductsList"
        );

    if (!container) {
        return;
    }


    container.innerHTML =
        adminData.products.length

            ? adminData.products
                .map(item => `

                    <article class="admin-list-item">

                        ${
                            item.image_url
                                ? `
                                    <img
                                        class="admin-news-thumb"
                                        src="${escapeAttribute(
                                            getStorageUrl(
                                                item.image_url
                                            )
                                        )}"
                                        alt=""
                                    >
                                  `
                                : ""
                        }

                        <div class="admin-list-main">

                            <div class="admin-list-title">
                                ${escapeHTML(
                                    item.name || ""
                                )}
                            </div>

                            <div class="admin-list-meta">

                                ${formatMoney(
                                    item.price
                                )}

                            </div>

                        </div>

                        <div class="admin-list-actions">

                            <button
                                type="button"
                                class="button button-small"
                                onclick="openProductForm(${item.id})"
                            >
                                Изменить
                            </button>

                            <button
                                type="button"
                                class="button button-small danger"
                                onclick="deleteProduct(${item.id})"
                            >
                                Удалить
                            </button>

                        </div>

                    </article>

                `)
                .join("")

            : emptyAdmin(
                "Товаров пока нет."
            );

}


/* ============================================================
   DESIGN
   ============================================================ */

function fillDesignFields() {

    const settings =
        adminData.settings || {};


    const primary =
        getSettingValue(
            settings,
            "color_primary",
            "#000056"
        );

    const secondary =
        getSettingValue(
            settings,
            "color_secondary",
            "#0875dc"
        );

    const accent =
        getSettingValue(
            settings,
            "color_accent",
            "#ffcd00"
        );

    const white =
        getSettingValue(
            settings,
            "color_white",
            "#ffffff"
        );


    setValue(
        "colorPrimary",
        primary
    );

    setValue(
        "colorSecondary",
        secondary
    );

    setValue(
        "colorAccent",
        accent
    );

    setValue(
        "colorWhite",
        white
    );


    setValue(
        "fontMain",
        getSettingValue(
            settings,
            "font_main",
            "Stapel"
        )
    );

    setValue(
        "fontHeading",
        getSettingValue(
            settings,
            "font_heading",
            "Stapel"
        )
    );

    setValue(
        "fontSecondary",
        getSettingValue(
            settings,
            "font_secondary",
            "Stengazeta"
        )
    );

    setValue(
        "fontThird",
        getSettingValue(
            settings,
            "font_third",
            "Christopher"
        )
    );


    setChecked(
        "showMatchday",
        getBooleanSetting(
            settings,
            "show_matchday",
            true
        )
    );

    setChecked(
        "showLastMatch",
        getBooleanSetting(
            settings,
            "show_last_match",
            true
        )
    );

    setChecked(
        "showStats",
        getBooleanSetting(
            settings,
            "show_stats",
            true
        )
    );

    setChecked(
        "showNews",
        getBooleanSetting(
            settings,
            "show_news",
            true
        )
    );

    setChecked(
        "showRoster",
        getBooleanSetting(
            settings,
            "show_roster",
            true
        )
    );

    setChecked(
        "showAchievements",
        getBooleanSetting(
            settings,
            "show_achievements",
            true
        )
    );

    setChecked(
        "showBirthdays",
        getBooleanSetting(
            settings,
            "show_birthdays",
            true
        )
    );


    const logo =
        getSettingValue(
            settings,
            "logo_url",
            ""
        );


    if (logo) {

        const preview =
            document.getElementById(
                "adminLogoPreview"
            );

        if (preview) {

            preview.src =
                getStorageUrl(logo);

        }

    }

}


async function saveDesignColors() {

    const colors = {
        color_primary:
            normalizeHex(
                getValue("colorPrimary"),
                "#000056"
            ),

        color_secondary:
            normalizeHex(
                getValue("colorSecondary"),
                "#0875dc"
            ),

        color_accent:
            normalizeHex(
                getValue("colorAccent"),
                "#ffcd00"
            ),

        color_white:
            normalizeHex(
                getValue("colorWhite"),
                "#ffffff"
            )
    };


    try {

        for (const [
            key,
            value
        ] of Object.entries(colors)) {

            await saveSettingSafe(
                key,
                value
            );

        }


        applySiteColors(
            colors
        );


        showToast(
            "Цвета сохранены."
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Не удалось сохранить цвета."
        );

    }

}


async function saveDesignFonts() {

    const fonts = {
        font_main:
            getValue("fontMain") ||
            "Stapel",

        font_heading:
            getValue("fontHeading") ||
            "Stapel",

        font_secondary:
            getValue("fontSecondary") ||
            "Stengazeta",

        font_third:
            getValue("fontThird") ||
            "Christopher"
    };


    try {

        for (const [
            key,
            value
        ] of Object.entries(fonts)) {

            await saveSettingSafe(
                key,
                value
            );

        }


        applySiteFonts(
            fonts
        );


        const file =
            document.getElementById(
                "fontFile"
            )?.files?.[0];


        if (file) {

            const uploaded =
                await uploadFile(
                    file,
                    "fonts"
                );


            if (uploaded?.path) {

                await saveSettingSafe(
                    "font_file_url",
                    uploaded.path
                );

            }

        }


        showToast(
            "Шрифты сохранены."
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Не удалось сохранить шрифты."
        );

    }

}


async function saveHomepageBlocks() {

    const values = {
        show_matchday:
            getChecked("showMatchday"),

        show_last_match:
            getChecked("showLastMatch"),

        show_stats:
            getChecked("showStats"),

        show_news:
            getChecked("showNews"),

        show_roster:
            getChecked("showRoster"),

        show_achievements:
            getChecked("showAchievements"),

        show_birthdays:
            getChecked("showBirthdays")
    };


    try {

        for (const [
            key,
            value
        ] of Object.entries(values)) {

            await saveSettingSafe(
                key,
                value
            );

        }


        showToast(
            "Настройки главной сохранены."
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Не удалось сохранить настройки."
        );

    }

}


async function previewLogo(event) {

    const file =
        event.target.files?.[0];

    if (!file) {
        return;
    }


    const preview =
        document.getElementById(
            "adminLogoPreview"
        );

    if (!preview) {
        return;
    }


    preview.src =
        URL.createObjectURL(file);


    try {

        const uploaded =
            await uploadFile(
                file,
                "branding"
            );


        if (uploaded?.path) {

            await saveSettingSafe(
                "logo_url",
                uploaded.path
            );

            showToast(
                "Логотип загружен."
            );

        }

    } catch (error) {

        console.error(error);

        showToast(
            "Не удалось загрузить логотип."
        );

    }

}


function previewFontFile(event) {

    const file =
        event.target.files?.[0];

    const name =
        document.getElementById(
            "fontFileName"
        );

    if (!name) {
        return;
    }


    name.textContent =
        file
            ? file.name
            : "Файл не выбран";

}


/* ============================================================
   FORMS
   ============================================================ */

function openMatchForm(id = null) {

    const match =
        id
            ? adminData.matches.find(
                item =>
                    Number(item.id) === Number(id)
            )
            : null;


    const homeTeamOptions =
        adminData.teams
            .map(team => `
                <option
                    value="${team.id}"
                    ${
                        Number(match?.home_team_id) ===
                        Number(team.id)
                            ? "selected"
                            : ""
                    }
                >
                    ${escapeHTML(
                        team.name ||
                        team.short_name ||
                        ""
                    )}
                </option>
            `)
            .join("");


    const awayTeamOptions =
        adminData.teams
            .map(team => `
                <option
                    value="${team.id}"
                    ${
                        Number(match?.away_team_id) ===
                        Number(team.id)
                            ? "selected"
                            : ""
                    }
                >
                    ${escapeHTML(
                        team.name ||
                        team.short_name ||
                        ""
                    )}
                </option>
            `)
            .join("");


    openAdminModal(`
        <form
            id="matchForm"
            class="admin-form"
        >

            <h2>
                ${id ? "Редактирование матча" : "Новый матч"}
            </h2>


            <div class="form-grid">

                <label class="form-field">

                    <span>
                        Дата
                    </span>

                    <input
                        id="matchDate"
                        type="date"
                        value="${escapeAttribute(
                            match?.match_date || ""
                        )}"
                        required
                    >

                </label>


                <label class="form-field">

                    <span>
                        День недели
                    </span>

                    <input
                        id="matchWeekday"
                        type="text"
                        value="${escapeAttribute(
                            getWeekday(
                                match?.match_date
                            )
                        )}"
                        readonly
                    >

                </label>


                <label class="form-field">

                    <span>
                        Время
                    </span>

                    <input
                        id="matchTime"
                        type="time"
                        value="${escapeAttribute(
                            match?.match_time || ""
                        )}"
                        required
                    >

                </label>


                <label class="form-field">

                    <span>
                        Турнир
                    </span>

                    <input
                        id="matchTournament"
                        type="text"
                        value="${escapeAttribute(
                            match?.tournament || ""
                        )}"
                        placeholder="Название турнира"
                    >

                </label>


                <label class="form-field">

                    <span>
                        Хозяева
                    </span>

                    <select id="matchHomeTeam">

                        <option value="">
                            Выберите команду
                        </option>

                        ${homeTeamOptions}

                    </select>

                </label>


                <label class="form-field">

                    <span>
                        Гости
                    </span>

                    <select id="matchAwayTeam">

                        <option value="">
                            Выберите команду
                        </option>

                        ${awayTeamOptions}

                    </select>

                </label>


                <label class="form-field">

                    <span>
                        Место
                    </span>

                    <input
                        id="matchVenue"
                        type="text"
                        value="${escapeAttribute(
                            match?.venue || ""
                        )}"
                        placeholder="Арена"
                    >

                </label>


                <label class="form-field">

                    <span>
                        Статус
                    </span>

                    <select id="matchStatus">

                        <option
                            value="scheduled"
                            ${
                                !match?.status ||
                                match?.status === "scheduled"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Запланирован
                        </option>

                        <option
                            value="live"
                            ${
                                match?.status === "live"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Идёт
                        </option>

                        <option
                            value="finished"
                            ${
                                match?.status === "finished"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Завершён
                        </option>

                        <option
                            value="cancelled"
                            ${
                                match?.status === "cancelled"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Отменён
                        </option>

                    </select>

                </label>


                <label class="form-field">

                    <span>
                        Счёт хозяев
                    </span>

                    <input
                        id="matchHomeScore"
                        type="number"
                        min="0"
                        value="${numberOrZero(
                            match?.home_score
                        )}"
                    >

                </label>


                <label class="form-field">

                    <span>
                        Счёт гостей
                    </span>

                    <input
                        id="matchAwayScore"
                        type="number"
                        min="0"
                        value="${numberOrZero(
                            match?.away_score
                        )}"
                    >

                </label>

            </div>


            <label class="form-field">

                <span>
                    Ссылка на трансляцию
                </span>

                <input
                    id="matchStream"
                    type="url"
                    value="${escapeAttribute(
                        match?.stream_url || ""
                    )}"
                    placeholder="https://..."
                >

            </label>


            <div class="form-actions">

                <button
                    type="button"
                    class="button button-secondary"
                    data-close-admin-modal
                >
                    Отмена
                </button>

                <button
                    type="submit"
                    class="button button-primary"
                >
                    ${id ? "Сохранить" : "Создать матч"}
                </button>

            </div>

        </form>
    `);


    const dateInput =
        document.getElementById(
            "matchDate"
        );

    dateInput?.addEventListener(
        "change",
        () => {

            const weekday =
                document.getElementById(
                    "matchWeekday"
                );

            if (weekday) {

                weekday.value =
                    getWeekday(
                        dateInput.value
                    );

            }

        }
    );


    document
        .getElementById("matchForm")
        ?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                await saveMatch(
                    {
                        match_date:
                            getValue("matchDate"),

                        match_time:
                            getValue("matchTime"),

                        tournament:
                            getValue("matchTournament"),

                        home_team_id:
                            getValue("matchHomeTeam"),

                        away_team_id:
                            getValue("matchAwayTeam"),

                        venue:
                            getValue("matchVenue"),

                        status:
                            getValue("matchStatus"),

                        home_score:
                            getValue("matchHomeScore"),

                        away_score:
                            getValue("matchAwayScore"),

                        stream_url:
                            getValue("matchStream")
                    },
                    id
                );

            }
        );


    bindModalCloseButtons();

}


function openPlayerForm(id = null) {

    const player =
        id
            ? adminData.players.find(
                item =>
                    Number(item.id) === Number(id)
            )
            : null;


    openAdminModal(`
        <form
            id="playerForm"
            class="admin-form"
        >

            <h2>
                ${id ? "Редактирование игрока" : "Новый игрок"}
            </h2>


            <div class="form-grid">

                <label class="form-field">

                    <span>
                        ФИО
                    </span>

                    <input
                        id="playerName"
                        type="text"
                        value="${escapeAttribute(
                            player?.full_name || ""
                        )}"
                        required
                    >

                </label>


                <label class="form-field">

                    <span>
                        Номер
                    </span>

                    <input
                        id="playerNumber"
                        type="number"
                        min="0"
                        value="${numberOrZero(
                            player?.number
                        )}"
                    >

                </label>


                <label class="form-field">

                    <span>
                        Дата рождения
                    </span>

                    <input
                        id="playerBirth"
                        type="date"
                        value="${escapeAttribute(
                            player?.birth_date || ""
                        )}"
                    >

                </label>


                <label class="form-field">

                    <span>
                        Рост, см
                    </span>

                    <input
                        id="playerHeight"
                        type="number"
                        min="0"
                        value="${numberOrEmpty(
                            player?.height_cm
                        )}"
                    >

                </label>


                <label class="form-field">

                    <span>
                        Вес, кг
                    </span>

                    <input
                        id="playerWeight"
                        type="number"
                        min="0"
                        step="0.1"
                        value="${numberOrEmpty(
                            player?.weight_kg
                        )}"
                    >

                </label>


                <label class="form-field">

                    <span>
                        Амплуа
                    </span>

                    <select id="playerPosition">

                        <option
                            value="goalie"
                            ${
                                player?.position === "goalie"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Вратарь
                        </option>

                        <option
                            value="defense"
                            ${
                                player?.position === "defense"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Защитник
                        </option>

                        <option
                            value="forward"
                            ${
                                !player?.position ||
                                player?.position === "forward"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Нападающий
                        </option>

                    </select>

                </label>

            </div>


            <label class="form-field">

                <span>
                    Фото
                </span>

                <input
                    id="playerPhoto"
                    type="file"
                    accept="image/*"
                >

            </label>


            <div class="checkbox-list">

                <label class="checkbox-row">

                    <input
                        id="playerCaptain"
                        type="checkbox"
                        ${
                            player?.captain
                                ? "checked"
                                : ""
                        }
                    >

                    <span>
                        Капитан
                    </span>

                </label>


                <label class="checkbox-row">

                    <input
                        id="playerAssistant"
                        type="checkbox"
                        ${
                            player?.assistant
                                ? "checked"
                                : ""
                        }
                    >

                    <span>
                        Ассистент капитана
                    </span>

                </label>

            </div>


            <div class="form-actions">

                <button
                    type="button"
                    class="button button-secondary"
                    data-close-admin-modal
                >
                    Отмена
                </button>

                <button
                    type="submit"
                    class="button button-primary"
                >
                    ${id ? "Сохранить" : "Добавить игрока"}
                </button>

            </div>

        </form>
    `);


    document
        .getElementById("playerForm")
        ?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                let photoUrl =
                    player?.photo_url || null;


                const file =
                    document.getElementById(
                        "playerPhoto"
                    )?.files?.[0];


                try {

                    if (file) {

                        const uploaded =
                            await uploadFile(
                                file,
                                "players"
                            );

                        photoUrl =
                            uploaded?.path ||
                            photoUrl;

                    }


                    await savePlayer(
                        {
                            full_name:
                                getValue("playerName"),

                            number:
                                getValue("playerNumber"),

                            birth_date:
                                getValue("playerBirth"),

                            height_cm:
                                getValue("playerHeight"),

                            weight_kg:
                                getValue("playerWeight"),

                            position:
                                getValue("playerPosition"),

                            captain:
                                getChecked("playerCaptain"),

                            assistant:
                                getChecked("playerAssistant"),

                            photo_url:
                                photoUrl
                        },
                        id
                    );

                } catch (error) {

                    console.error(error);

                    showToast(
                        "Не удалось загрузить фото или сохранить игрока."
                    );

                }

            }
        );


    bindModalCloseButtons();

}


function openNewsForm(id = null) {

    const item =
        id
            ? adminData.news.find(
                news =>
                    Number(news.id) === Number(id)
            )
            : null;


    openAdminModal(`
        <form
            id="newsForm"
            class="admin-form"
        >

            <h2>
                ${id ? "Редактирование новости" : "Новая новость"}
            </h2>


            <label class="form-field">

                <span>
                    Заголовок
                </span>

                <input
                    id="newsTitle"
                    type="text"
                    value="${escapeAttribute(
                        item?.title || ""
                    )}"
                    required
                >

            </label>


            <div class="form-grid">

                <label class="form-field">

                    <span>
                        Категория
                    </span>

                    <select id="newsCategory">

                        <option
                            value="Матч"
                            ${
                                item?.category === "Матч"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Матч
                        </option>

                        <option
                            value="Команда"
                            ${
                                item?.category === "Команда"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Команда
                        </option>

                        <option
                            value="Другое"
                            ${
                                !item?.category ||
                                item?.category === "Другое"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Другое
                        </option>

                    </select>

                </label>


                <label class="form-field">

                    <span>
                        Дата публикации
                    </span>

                    <input
                        id="newsDate"
                        type="datetime-local"
                        value="${toDatetimeLocal(
                            item?.created_at
                        )}"
                    >

                </label>

            </div>


            <label class="form-field">

                <span>
                    Краткое описание
                </span>

                <textarea
                    id="newsDescription"
                    rows="3"
                >${escapeHTML(
                    item?.description || ""
                )}</textarea>

            </label>


            <label class="form-field">

                <span>
                    Полный текст
                </span>

                <textarea
                    id="newsContent"
                    rows="8"
                >${escapeHTML(
                    item?.content || ""
                )}</textarea>

            </label>


            <label class="form-field">

                <span>
                    Изображение
                </span>

                <input
                    id="newsImage"
                    type="file"
                    accept="image/*"
                >

            </label>


            <label class="checkbox-row">

                <input
                    id="newsPublished"
                    type="checkbox"
                    ${
                        item?.published !== false
                            ? "checked"
                            : ""
                    }
                >

                <span>
                    Опубликовано
                </span>

            </label>


            <div class="form-actions">

                <button
                    type="button"
                    class="button button-secondary"
                    data-close-admin-modal
                >
                    Отмена
                </button>

                <button
                    type="submit"
                    class="button button-primary"
                >
                    ${id ? "Сохранить" : "Опубликовать"}
                </button>

            </div>

        </form>
    `);


    document
        .getElementById("newsForm")
        ?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                let imageUrl =
                    item?.image_url || null;


                const file =
                    document.getElementById(
                        "newsImage"
                    )?.files?.[0];


                try {

                    if (file) {

                        const uploaded =
                            await uploadFile(
                                file,
                                "news"
                            );

                        imageUrl =
                            uploaded?.path ||
                            imageUrl;

                    }


                    await saveNews(
                        {
                            title:
                                getValue("newsTitle"),

                            category:
                                getValue("newsCategory"),

                            description:
                                getValue(
                                    "newsDescription"
                                ),

                            content:
                                getValue(
                                    "newsContent"
                                ),

                            image_url:
                                imageUrl,

                            published:
                                getChecked(
                                    "newsPublished"
                                )
                        },
                        id
                    );

                } catch (error) {

                    console.error(error);

                    showToast(
                        "Не удалось загрузить изображение."
                    );

                }

            }
        );


    bindModalCloseButtons();

}


function openStandingForm(id = null) {

    const item =
        id
            ? adminData.standings.find(
                standing =>
                    Number(standing.id) === Number(id)
            )
            : null;


    openAdminModal(`
        <form
            id="standingForm"
            class="admin-form"
        >

            <h2>
                ${id ? "Редактирование команды" : "Команда в таблице"}
            </h2>


            <div class="form-grid">

                <label class="form-field">

                    <span>
                        Место
                    </span>

                    <input
                        id="standingPlace"
                        type="number"
                        min="1"
                        value="${numberOrZero(
                            item?.place
                        )}"
                    >

                </label>


                <label class="form-field">

                    <span>
                        Команда
                    </span>

                    <input
                        id="standingTeam"
                        type="text"
                        value="${escapeAttribute(
                            item?.team_name || ""
                        )}"
                        required
                    >

                </label>


                <label class="form-field">
                    <span>И</span>
                    <input
                        id="standingGames"
                        type="number"
                        min="0"
                        value="${numberOrZero(item?.games)}"
                    >
                </label>


                <label class="form-field">
                    <span>В</span>
                    <input
                        id="standingWins"
                        type="number"
                        min="0"
                        value="${numberOrZero(item?.wins)}"
                    >
                </label>


                <label class="form-field">
                    <span>ВО</span>
                    <input
                        id="standingWinsOT"
                        type="number"
                        min="0"
                        value="${numberOrZero(item?.wins_ot)}"
                    >
                </label>


                <label class="form-field">
                    <span>ВБ</span>
                    <input
                        id="standingWinsSO"
                        type="number"
                        min="0"
                        value="${numberOrZero(item?.wins_so)}"
                    >
                </label>


                <label class="form-field">
                    <span>ПО</span>
                    <input
                        id="standingLossesOT"
                        type="number"
                        min="0"
                        value="${numberOrZero(item?.losses_ot)}"
                    >
                </label>


                <label class="form-field">
                    <span>ПБ</span>
                    <input
                        id="standingLossesSO"
                        type="number"
                        min="0"
                        value="${numberOrZero(item?.losses_so)}"
                    >
                </label>


                <label class="form-field">
                    <span>П</span>
                    <input
                        id="standingLosses"
                        type="number"
                        min="0"
                        value="${numberOrZero(item?.losses)}"
                    >
                </label>


                <label class="form-field">
                    <span>О</span>
                    <input
                        id="standingPoints"
                        type="number"
                        min="0"
                        value="${numberOrZero(item?.points)}"
                    >
                </label>

            </div>


            <div class="form-actions">

                <button
                    type="button"
                    class="button button-secondary"
                    data-close-admin-modal
                >
                    Отмена
                </button>

                <button
                    type="submit"
                    class="button button-primary"
                >
                    Сохранить
                </button>

            </div>

        </form>
    `);


    document
        .getElementById("standingForm")
        ?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                await saveStanding(
                    {
                        place:
                            getValue(
                                "standingPlace"
                            ),

                        team_name:
                            getValue(
                                "standingTeam"
                            ),

                        games:
                            getValue(
                                "standingGames"
                            ),

                        wins:
                            getValue(
                                "standingWins"
                            ),

                        wins_ot:
                            getValue(
                                "standingWinsOT"
                            ),

                        wins_so:
                            getValue(
                                "standingWinsSO"
                            ),

                        losses_ot:
                            getValue(
                                "standingLossesOT"
                            ),

                        losses_so:
                            getValue(
                                "standingLossesSO"
                            ),

                        losses:
                            getValue(
                                "standingLosses"
                            ),

                        points:
                            getValue(
                                "standingPoints"
                            )
                    },
                    id
                );

            }
        );


    bindModalCloseButtons();

}


function openAchievementForm(id = null) {

    const item =
        id
            ? adminData.achievements.find(
                achievement =>
                    Number(achievement.id) ===
                    Number(id)
            )
            : null;


    openAdminModal(`
        <form
            id="achievementForm"
            class="admin-form"
        >

            <h2>
                ${id ? "Достижение" : "Новое достижение"}
            </h2>


            <label class="form-field">

                <span>
                    Название
                </span>

                <input
                    id="achievementTitle"
                    type="text"
                    value="${escapeAttribute(
                        item?.title || ""
                    )}"
                    required
                >

            </label>


            <label class="form-field">

                <span>
                    Год / сезон
                </span>

                <input
                    id="achievementYear"
                    type="text"
                    value="${escapeAttribute(
                        item?.year || ""
                    )}"
                >

            </label>


            <label class="form-field">

                <span>
                    Описание
                </span>

                <textarea
                    id="achievementDescription"
                    rows="5"
                >${escapeHTML(
                    item?.description || ""
                )}</textarea>

            </label>


            <div class="form-actions">

                <button
                    type="button"
                    class="button button-secondary"
                    data-close-admin-modal
                >
                    Отмена
                </button>

                <button
                    type="submit"
                    class="button button-primary"
                >
                    Сохранить
                </button>

            </div>

        </form>
    `);


    document
        .getElementById("achievementForm")
        ?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                await saveAchievement(
                    {
                        title:
                            getValue(
                                "achievementTitle"
                            ),

                        year:
                            getValue(
                                "achievementYear"
                            ),

                        description:
                            getValue(
                                "achievementDescription"
                            )
                    },
                    id
                );

            }
        );


    bindModalCloseButtons();

}


function openBirthdayForm(id = null) {

    const item =
        id
            ? adminData.birthdays.find(
                birthday =>
                    Number(birthday.id) ===
                    Number(id)
            )
            : null;


    openAdminModal(`
        <form
            id="birthdayForm"
            class="admin-form"
        >

            <h2>
                ${id ? "День рождения" : "Новый день рождения"}
            </h2>


            <label class="form-field">

                <span>
                    Игрок
                </span>

                <input
                    id="birthdayName"
                    type="text"
                    value="${escapeAttribute(
                        item?.player_name || ""
                    )}"
                    required
                >

            </label>


            <label class="form-field">

                <span>
                    Дата рождения
                </span>

                <input
                    id="birthdayDate"
                    type="date"
                    value="${escapeAttribute(
                        item?.birth_date || ""
                    )}"
                    required
                >

            </label>


            <div class="form-actions">

                <button
                    type="button"
                    class="button button-secondary"
                    data-close-admin-modal
                >
                    Отмена
                </button>

                <button
                    type="submit"
                    class="button button-primary"
                >
                    Сохранить
                </button>

            </div>

        </form>
    `);


    document
        .getElementById("birthdayForm")
        ?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                await saveBirthday(
                    {
                        player_name:
                            getValue(
                                "birthdayName"
                            ),

                        birth_date:
                            getValue(
                                "birthdayDate"
                            )
                    },
                    id
                );

            }
        );


    bindModalCloseButtons();

}


function openProductForm(id = null) {

    const item =
        id
            ? adminData.products.find(
                product =>
                    Number(product.id) ===
                    Number(id)
            )
            : null;


    openAdminModal(`
        <form
            id="productForm"
            class="admin-form"
        >

            <h2>
                ${id ? "Товар" : "Новый товар"}
            </h2>


            <label class="form-field">

                <span>
                    Название
                </span>

                <input
                    id="productName"
                    type="text"
                    value="${escapeAttribute(
                        item?.name || ""
                    )}"
                    required
                >

            </label>


            <div class="form-grid">

                <label class="form-field">

                    <span>
                        Цена
                    </span>

                    <input
                        id="productPrice"
                        type="number"
                        min="0"
                        step="1"
                        value="${numberOrZero(
                            item?.price
                        )}"
                    >

                </label>


                <label class="form-field">

                    <span>
                        Доступен
                    </span>

                    <select id="productAvailable">

                        <option
                            value="true"
                            ${
                                item?.available !== false
                                    ? "selected"
                                    : ""
                            }
                        >
                            Да
                        </option>

                        <option
                            value="false"
                            ${
                                item?.available === false
                                    ? "selected"
                                    : ""
                            }
                        >
                            Нет
                        </option>

                    </select>

                </label>

            </div>


            <label class="form-field">

                <span>
                    Описание
                </span>

                <textarea
                    id="productDescription"
                    rows="5"
                >${escapeHTML(
                    item?.description || ""
                )}</textarea>

            </label>


            <label class="form-field">

                <span>
                    Фото
                </span>

                <input
                    id="productImage"
                    type="file"
                    accept="image/*"
                >

            </label>


            <div class="form-actions">

                <button
                    type="button"
                    class="button button-secondary"
                    data-close-admin-modal
                >
                    Отмена
                </button>

                <button
                    type="submit"
                    class="button button-primary"
                >
                    Сохранить
                </button>

            </div>

        </form>
    `);


    document
        .getElementById("productForm")
        ?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                let imageUrl =
                    item?.image_url || null;


                const file =
                    document.getElementById(
                        "productImage"
                    )?.files?.[0];


                try {

                    if (file) {

                        const uploaded =
                            await uploadFile(
                                file,
                                "products"
                            );

                        imageUrl =
                            uploaded?.path ||
                            imageUrl;

                    }


                    await saveProduct(
                        {
                            name:
                                getValue(
                                    "productName"
                                ),

                            description:
                                getValue(
                                    "productDescription"
                                ),

                            price:
                                getValue(
                                    "productPrice"
                                ),

                            available:
                                getValue(
                                    "productAvailable"
                                ) !== "false",

                            image_url:
                                imageUrl
                        },
                        id
                    );

                } catch (error) {

                    console.error(error);

                    showToast(
                        "Не удалось сохранить товар."
                    );

                }

            }
        );


    bindModalCloseButtons();

}


/* ============================================================
   MODAL
   ============================================================ */

function openAdminModal(html) {

    const modal =
        document.getElementById(
            "adminModal"
        );

    const content =
        document.getElementById(
            "adminModalContent"
        );

    if (!modal || !content) {
        return;
    }


    content.innerHTML = html;

    modal.classList.remove("hidden");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

}


function closeAdminModal() {

    const modal =
        document.getElementById(
            "adminModal"
        );

    if (!modal) {
        return;
    }


    modal.classList.add("hidden");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    const content =
        document.getElementById(
            "adminModalContent"
        );

    if (content) {
        content.innerHTML = "";
    }

}


function bindModalCloseButtons() {

    document
        .querySelectorAll(
            "#adminModal [data-close-admin-modal]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                closeAdminModal
            );

        });

}


/* ============================================================
   HELPERS
   ============================================================ */

function bindButton(
    id,
    callback
) {

    const element =
        document.getElementById(id);

    if (!element) {
        return;
    }

    element.addEventListener(
        "click",
        callback
    );

}


function setValue(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {
        element.value =
            value ?? "";
    }

}


function getValue(id) {

    return (
        document.getElementById(id)?.value ||
        ""
    ).trim();

}


function setChecked(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {
        element.checked =
            Boolean(value);
    }

}


function getChecked(id) {

    return Boolean(
        document.getElementById(id)?.checked
    );

}


function capitalize(value) {

    if (!value) {
        return "";
    }

    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );

}


function numberOrZero(value) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;

}


function numberOrNull(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : null;

}


function numberOrEmpty(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "";
    }

    return value;

}


function emptyAdmin(message) {

    return `
        <div class="empty-state">
            <div class="empty-state-title">
                ${escapeHTML(message)}
            </div>
        </div>
    `;

}


function getTeamName(id) {

    const team =
        adminData.teams.find(
            item =>
                Number(item.id) === Number(id)
        );

    if (!team) {
        return "Команда";
    }

    return (
        team.name ||
        team.short_name ||
        "Команда"
    );

}


function getPositionName(position) {

    switch (String(position).toLowerCase()) {

        case "goalie":
        case "вратарь":
            return "Вратарь";

        case "defense":
        case "defenceman":
        case "защитник":
            return "Защитник";

        default:
            return "Нападающий";

    }

}


function getWeekday(date) {

    if (!date) {
        return "";
    }

    const parsed =
        new Date(
            `${date}T12:00:00`
        );

    if (Number.isNaN(parsed.getTime())) {
        return "";
    }

    return parsed.toLocaleDateString(
        "ru-RU",
        {
            weekday: "long"
        }
    );

}


function formatDateValue(value) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString(
        "ru-RU"
    );

}


function formatMatchDate(match) {

    const date =
        match?.match_date;

    const time =
        match?.match_time;

    if (!date) {
        return "Дата не указана";
    }

    const parsed =
        new Date(
            `${date}T${
                time || "00:00"
            }`
        );

    if (Number.isNaN(parsed.getTime())) {
        return `${date} ${time || ""}`;
    }

    return parsed.toLocaleString(
        "ru-RU",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


function getMatchTimestamp(match) {

    const value =
        `${match?.match_date || ""}T${
            match?.match_time || "00:00"
        }`;

    const timestamp =
        new Date(value).getTime();

    return Number.isFinite(timestamp)
        ? timestamp
        : 0;

}


function compareMatches(a, b) {

    return (
        getMatchTimestamp(a) -
        getMatchTimestamp(b)
    );

}


function isPlayedMatch(match) {

    if (
        match?.status === "finished" ||
        match?.status === "played"
    ) {
        return true;
    }


    if (
        match?.status === "scheduled" ||
        match?.status === "live"
    ) {
        return false;
    }


    return (
        getMatchTimestamp(match) <
        Date.now()
    );

}


function getMatchStatus(match) {

    if (match?.status === "live") {
        return "МАТЧ ИДЁТ";
    }

    if (
        match?.status === "finished" ||
        match?.status === "played"
    ) {
        return "ЗАВЕРШЁН";
    }

    if (match?.status === "cancelled") {
        return "ОТМЕНЁН";
    }

    return "ПРЕДСТОИТ";

}


function formatMoney(value) {

    return (
        numberOrZero(value)
            .toLocaleString("ru-RU") +
        " ₽"
    );

}


function normalizeHex(
    value,
    fallback
) {

    const text =
        String(value || "")
            .trim();


    if (
        /^#[0-9A-Fa-f]{6}$/.test(text)
    ) {
        return text.toLowerCase();
    }


    return fallback;

}


function getSettingValue(
    settings,
    key,
    fallback
) {

    if (!settings) {
        return fallback;
    }


    if (
        Object.prototype.hasOwnProperty.call(
            settings,
            key
        )
    ) {
        return settings[key];
    }


    const row =
        Array.isArray(settings)
            ? settings.find(
                item =>
                    item.key === key ||
                    item.name === key
            )
            : null;


    if (row) {

        return (
            row.value ??
            row.setting_value ??
            fallback
        );

    }


    return fallback;

}


function getBooleanSetting(
    settings,
    key,
    fallback
) {

    const value =
        getSettingValue(
            settings,
            key,
            fallback
        );


    if (
        value === true ||
        value === false
    ) {
        return value;
    }


    if (
        String(value).toLowerCase() ===
        "true"
    ) {
        return true;
    }


    if (
        String(value).toLowerCase() ===
        "false"
    ) {
        return false;
    }


    return fallback;

}


function toDatetimeLocal(value) {

    if (!value) {
        return "";
    }


    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }


    const pad =
        number =>
            String(number)
                .padStart(2, "0");


    return (
        `${date.getFullYear()}-` +
        `${pad(date.getMonth() + 1)}-` +
        `${pad(date.getDate())}T` +
        `${pad(date.getHours())}:` +
        `${pad(date.getMinutes())}`
    );

}


function escapeAttribute(value) {

    return escapeHTML(
        value ?? ""
    );

}


/* ============================================================
   GLOBAL
   ============================================================ */

window.initializeAdmin =
    initializeAdmin;

window.openAdminSection =
    openAdminSection;

window.openMatchForm =
    openMatchForm;

window.deleteMatch =
    deleteMatch;

window.openPlayerForm =
    openPlayerForm;

window.deletePlayer =
    deletePlayer;

window.openNewsForm =
    openNewsForm;

window.deleteNews =
    deleteNews;

window.openStandingForm =
    openStandingForm;

window.deleteStanding =
    deleteStanding;

window.openAchievementForm =
    openAchievementForm;

window.deleteAchievement =
    deleteAchievement;

window.openBirthdayForm =
    openBirthdayForm;

window.deleteBirthday =
    deleteBirthday;

window.openProductForm =
    openProductForm;

window.deleteProduct =
    deleteProduct;

window.closeAdminModal =
    closeAdminModal;
