// ======================================================
// ХК ЧЕЛНЫ 2011 — APP.JS
// Общая логика публичного сайта
// ======================================================


// ======================================================
// СОСТОЯНИЕ
// ======================================================

const APP = {
    settings: {},
    teams: [],
    matches: [],
    players: [],
    news: [],
    standings: [],
    albums: [],
    achievements: [],
    birthdays: [],
    products: []
};


// ======================================================
// DOM
// ======================================================

const $ = (selector, parent = document) =>
    parent.querySelector(selector);

const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];


// ======================================================
// НАСТРОЙКИ
// ======================================================

async function loadSettings() {

    try {

        const data = await apiRequest(
            "settings"
        );

        if (!Array.isArray(data)) {
            return;
        }

        const result = {};

        data.forEach(row => {

            if (
                row.key !== undefined &&
                row.value !== undefined
            ) {
                result[row.key] = row.value;
            }

            // Поддержка старой структуры
            if (
                row.name !== undefined &&
                row.value !== undefined
            ) {
                result[row.name] = row.value;
            }

        });

        APP.settings = result;

        applySettings();

    } catch (error) {

        console.error(
            "Не удалось загрузить настройки:",
            error
        );
    }
}


// ======================================================
// ПРИМЕНЕНИЕ НАСТРОЕК
// ======================================================

function applySettings() {

    const root =
        document.documentElement;


    const settings =
        APP.settings;


    // Цвета
    const colors = {

        primary:
            settings.color_primary ||
            settings.primary_color ||
            SITE_CONFIG.colors.primary,

        secondary:
            settings.color_secondary ||
            settings.secondary_color ||
            SITE_CONFIG.colors.secondary,

        accent:
            settings.color_accent ||
            settings.accent_color ||
            SITE_CONFIG.colors.accent,

        background:
            settings.color_background ||
            settings.background_color ||
            SITE_CONFIG.colors.background,

        surface:
            settings.color_surface ||
            settings.surface_color ||
            SITE_CONFIG.colors.surface,

        text:
            settings.color_text ||
            settings.text_color ||
            SITE_CONFIG.colors.text,

        muted:
            settings.color_muted ||
            settings.muted_color ||
            SITE_CONFIG.colors.muted
    };


    Object.entries(colors)
        .forEach(([key, value]) => {

            root.style.setProperty(
                `--${key}`,
                value
            );

        });


    // Шрифты
    const mainFont =
        settings.font_main ||
        SITE_CONFIG.fonts.main;

    const headingFont =
        settings.font_heading ||
        SITE_CONFIG.fonts.heading;

    const secondaryFont =
        settings.font_secondary ||
        SITE_CONFIG.fonts.secondary;


    root.style.setProperty(
        "--font-main",
        `"${mainFont}", Stapel, Arial, sans-serif`
    );

    root.style.setProperty(
        "--font-heading",
        `"${headingFont}", Stapel, Arial, sans-serif`
    );

    root.style.setProperty(
        "--font-secondary",
        `"${secondaryFont}", Stengazeta, Arial, sans-serif`
    );


    document.body.style.fontFamily =
        `"${mainFont}", Stapel, Arial, sans-serif`;


    $$("h1,h2,h3,h4,h5,h6")
        .forEach(element => {

            element.style.fontFamily =
                `"${headingFont}", Stapel, Arial, sans-serif`;

        });


    // Название команды
    $$("[data-team-name]")
        .forEach(element => {

            element.textContent =
                settings.team_name ||
                SITE_CONFIG.teamName;

        });


    // Логотип
    const logo =
        settings.logo_url ||
        settings.logo ||
        SITE_CONFIG.defaults.logo;


    if (logo) {

        $$("[data-team-logo]")
            .forEach(element => {

                element.src =
                    getStorageUrl(logo);

                element.style.display =
                    "block";

            });
    }


    // Заголовок
    $$("[data-team-title]")
        .forEach(element => {

            element.textContent =
                settings.site_title ||
                SITE_CONFIG.defaults.title;

        });


    // Подзаголовок
    $$("[data-team-subtitle]")
        .forEach(element => {

            element.textContent =
                settings.site_subtitle ||
                SITE_CONFIG.defaults.subtitle;

        });
}


// ======================================================
// ЗАГРУЗКА КОМАНД
// ======================================================

async function loadTeams() {

    try {

        APP.teams =
            await apiRequest(
                "teams",
                {
                    order: {
                        column: "name",
                        ascending: true
                    }
                }
            ) || [];

        return APP.teams;

    } catch (error) {

        APP.teams = [];

        console.error(
            "Ошибка загрузки команд:",
            error
        );

        return [];
    }
}


// ======================================================
// ЗАГРУЗКА МАТЧЕЙ
// ======================================================

async function loadMatches() {

    try {

        APP.matches =
            await apiRequest(
                "matches",
                {
                    order: {
                        column: "match_date",
                        ascending: true
                    }
                }
            ) || [];

        return APP.matches;

    } catch (error) {

        APP.matches = [];

        console.error(
            "Ошибка загрузки матчей:",
            error
        );

        return [];
    }
}


// ======================================================
// ЗАГРУЗКА ИГРОКОВ
// ======================================================

async function loadPlayers() {

    try {

        APP.players =
            await apiRequest(
                "players",
                {
                    order: {
                        column: "number",
                        ascending: true
                    }
                }
            ) || [];

        return APP.players;

    } catch (error) {

        APP.players = [];

        console.error(
            "Ошибка загрузки игроков:",
            error
        );

        return [];
    }
}


// ======================================================
// ЗАГРУЗКА НОВОСТЕЙ
// ======================================================

async function loadNews() {

    try {

        APP.news =
            await apiRequest(
                "news",
                {
                    order: {
                        column: "created_at",
                        ascending: false
                    }
                }
            ) || [];

        return APP.news;

    } catch (error) {

        APP.news = [];

        console.error(
            "Ошибка загрузки новостей:",
            error
        );

        return [];
    }
}


// ======================================================
// ЗАГРУЗКА ТАБЛИЦЫ
// ======================================================

async function loadStandings() {

    try {

        APP.standings =
            await apiRequest(
                "standings",
                {
                    order: {
                        column: "place",
                        ascending: true
                    }
                }
            ) || [];

        return APP.standings;

    } catch (error) {

        APP.standings = [];

        console.error(
            "Ошибка загрузки таблицы:",
            error
        );

        return [];
    }
}


// ======================================================
// ЗАГРУЗКА АЛЬБОМОВ
// ======================================================

async function loadAlbums() {

    try {

        APP.albums =
            await apiRequest(
                "albums",
                {
                    order: {
                        column: "created_at",
                        ascending: false
                    }
                }
            ) || [];

        return APP.albums;

    } catch (error) {

        APP.albums = [];

        console.error(
            "Ошибка загрузки альбомов:",
            error
        );

        return [];
    }
}


// ======================================================
// ДОСТИЖЕНИЯ
// ======================================================

async function loadAchievements() {

    try {

        APP.achievements =
            await apiRequest(
                "achievements",
                {
                    order: {
                        column: "year",
                        ascending: false
                    }
                }
            ) || [];

        return APP.achievements;

    } catch (error) {

        APP.achievements = [];

        console.error(
            "Ошибка загрузки достижений:",
            error
        );

        return [];
    }
}


// ======================================================
// ДНИ РОЖДЕНИЯ
// ======================================================

async function loadBirthdays() {

    try {

        APP.birthdays =
            await apiRequest(
                "birthdays",
                {
                    order: {
                        column: "birthday",
                        ascending: true
                    }
                }
            ) || [];

        return APP.birthdays;

    } catch (error) {

        APP.birthdays = [];

        console.error(
            "Ошибка загрузки дней рождения:",
            error
        );

        return [];
    }
}


// ======================================================
// ТОВАРЫ
// ======================================================

async function loadProducts() {

    try {

        APP.products =
            await apiRequest(
                "products",
                {
                    order: {
                        column: "created_at",
                        ascending: false
                    }
                }
            ) || [];

        return APP.products;

    } catch (error) {

        APP.products = [];

        console.error(
            "Ошибка загрузки товаров:",
            error
        );

        return [];
    }
}


// ======================================================
// ПОЛУЧЕНИЕ КОМАНДЫ
// ======================================================

function findTeam(id) {

    if (
        id === undefined ||
        id === null
    ) {
        return null;
    }

    return APP.teams.find(
        team =>
            String(team.id) ===
            String(id)
    ) || null;
}


// ======================================================
// НАЗВАНИЕ КОМАНДЫ
// ======================================================

function getTeamName(
    teamId,
    fallback = "Команда"
) {

    const team =
        findTeam(teamId);

    if (team) {

        return (
            team.name ||
            team.title ||
            team.short_name ||
            fallback
        );
    }

    return fallback;
}


// ======================================================
// ЛОГОТИП КОМАНДЫ
// ======================================================

function getTeamLogo(
    teamId
) {

    const team =
        findTeam(teamId);

    if (!team) {
        return "";
    }

    return getStorageUrl(
        team.logo_url ||
        team.logo ||
        team.image_url ||
        ""
    );
}


// ======================================================
// ДАТА МАТЧА
// ======================================================

function getMatchDate(
    match
) {

    return (
        match.match_date ||
        match.date ||
        match.game_date ||
        ""
    );
}


// ======================================================
// ВРЕМЯ МАТЧА
// ======================================================

function getMatchTime(
    match
) {

    return (
        match.match_time ||
        match.time ||
        ""
    );
}


// ======================================================
// DATETIME МАТЧА
// ======================================================

function getMatchDateTime(
    match
) {

    const date =
        getMatchDate(match);

    const time =
        getMatchTime(match) ||
        "00:00";


    if (!date) {
        return null;
    }


    const result =
        new Date(
            `${date}T${time}`
        );


    if (
        Number.isNaN(
            result.getTime()
        )
    ) {
        return null;
    }


    return result;
}


// ======================================================
// СТАТУС МАТЧА
// ======================================================

function getMatchStatus(
    match
) {

    const explicit =
        String(
            match.status || ""
        ).toLowerCase();


    if (
        explicit === "finished" ||
        explicit === "завершён" ||
        explicit === "завершен"
    ) {
        return "finished";
    }


    if (
        explicit === "live" ||
        explicit === "ongoing" ||
        explicit === "идёт" ||
        explicit === "идет"
    ) {
        return "live";
    }


    const date =
        getMatchDateTime(match);


    if (!date) {
        return "upcoming";
    }


    const now =
        new Date();


    const homeScore =
        match.home_score;

    const awayScore =
        match.away_score;


    if (
        homeScore !== null &&
        homeScore !== undefined &&
        awayScore !== null &&
        awayScore !== undefined
    ) {

        return "finished";
    }


    if (
        now >= date &&
        now - date <= 3 * 60 * 60 * 1000
    ) {
        return "live";
    }


    return "upcoming";
}


// ======================================================
// ПОСЛЕДНИЙ СЫГРАННЫЙ МАТЧ
// ======================================================

function getLastMatch() {

    const finished =
        APP.matches
            .filter(
                match =>
                    getMatchStatus(match) ===
                    "finished"
            )
            .filter(
                match =>
                    getMatchDateTime(match)
            )
            .sort(
                (a, b) =>
                    getMatchDateTime(b) -
                    getMatchDateTime(a)
            );


    return finished[0] || null;
}


// ======================================================
// БЛИЖАЙШИЙ МАТЧ
// ======================================================

function getNextMatch() {

    const upcoming =
        APP.matches
            .filter(
                match =>
                    getMatchStatus(match) ===
                    "upcoming"
            )
            .filter(
                match =>
                    getMatchDateTime(match)
            )
            .sort(
                (a, b) =>
                    getMatchDateTime(a) -
                    getMatchDateTime(b)
            );


    return upcoming[0] || null;
}


// ======================================================
// ФОРМАТ СЧЁТА
// ======================================================

function getMatchScore(
    match
) {

    const home =
        match.home_score;

    const away =
        match.away_score;


    if (
        home === null ||
        home === undefined ||
        away === null ||
        away === undefined
    ) {
        return "—";
    }


    return `${home} : ${away}`;
}


// ======================================================
// КЛИК ПО КАРТОЧКЕ МАТЧА
// ======================================================

function openMatch(
    matchId
) {

    if (!matchId) {
        return;
    }

    goTo(
        "match",
        {
            id: matchId
        }
    );
}


// ======================================================
// КЛИК ПО ИГРОКУ
// ======================================================

function openPlayer(
    playerId
) {

    if (!playerId) {
        return;
    }

    goTo(
        "player",
        {
            id: playerId
        }
    );
}


// ======================================================
// КЛИК ПО НОВОСТИ
// ======================================================

function openNews(
    newsId
) {

    if (!newsId) {
        return;
    }

    goTo(
        "news",
        {
            id: newsId
        }
    );
}


// ======================================================
// COUNTDOWN
// ======================================================

function startCountdown(
    targetDate,
    container
) {

    if (!container) {
        return;
    }


    const update =
        () => {

            const now =
                new Date();

            const difference =
                targetDate.getTime() -
                now.getTime();


            if (difference <= 0) {

                container.innerHTML = `
                    <div class="match-status live">
                        МАТЧ НАЧАЛСЯ
                    </div>
                `;

                return;
            }


            const days =
                Math.floor(
                    difference /
                    (1000 * 60 * 60 * 24)
                );

            const hours =
                Math.floor(
                    (difference /
                        (1000 * 60 * 60)) %
                    24
                );

            const minutes =
                Math.floor(
                    (difference /
                        (1000 * 60)) %
                    60
                );

            const seconds =
                Math.floor(
                    (difference /
                        1000) %
                    60
                );


            container.innerHTML = `

                <div class="countdown-item">
                    <span class="countdown-value">
                        ${String(days).padStart(2, "0")}
                    </span>
                    <span class="countdown-label">
                        дней
                    </span>
                </div>

                <div class="countdown-item">
                    <span class="countdown-value">
                        ${String(hours).padStart(2, "0")}
                    </span>
                    <span class="countdown-label">
                        часов
                    </span>
                </div>

                <div class="countdown-item">
                    <span class="countdown-value">
                        ${String(minutes).padStart(2, "0")}
                    </span>
                    <span class="countdown-label">
                        минут
                    </span>
                </div>

                <div class="countdown-item">
                    <span class="countdown-value">
                        ${String(seconds).padStart(2, "0")}
                    </span>
                    <span class="countdown-label">
                        секунд
                    </span>
                </div>
            `;
        };


    update();


    if (
        container.__countdownTimer
    ) {

        clearInterval(
            container.__countdownTimer
        );
    }


    container.__countdownTimer =
        setInterval(
            update,
            1000
        );
}


// ======================================================
// АККОРДЕОНЫ
// ======================================================

function initAccordions() {

    $$(".accordion-button")
        .forEach(button => {

            if (
                button.dataset.accordionReady
            ) {
                return;
            }


            button.dataset.accordionReady =
                "true";


            button.addEventListener(
                "click",
                () => {

                    const accordion =
                        button.closest(
                            ".accordion"
                        );


                    if (!accordion) {
                        return;
                    }


                    accordion.classList.toggle(
                        "open"
                    );

                }
            );
        });
}


// ======================================================
// МОДАЛЬНЫЕ ОКНА
// ======================================================

function openModal(
    id
) {

    const modal =
        document.getElementById(id);

    if (!modal) {
        return;
    }

    modal.classList.add(
        "show"
    );

    document.body.style.overflow =
        "hidden";
}


function closeModal(
    id
) {

    const modal =
        document.getElementById(id);

    if (!modal) {
        return;
    }

    modal.classList.remove(
        "show"
    );

    document.body.style.overflow =
        "";
}


function initModals() {

    $$(".modal")
        .forEach(modal => {

            modal.addEventListener(
                "click",
                event => {

                    if (
                        event.target === modal
                    ) {

                        modal.classList.remove(
                            "show"
                        );

                        document.body.style.overflow =
                            "";
                    }
                }
            );

        });


    $$("[data-close-modal]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const modal =
                        button.closest(
                            ".modal"
                        );

                    if (!modal) {
                        return;
                    }

                    modal.classList.remove(
                        "show"
                    );

                    document.body.style.overflow =
                        "";
                }
            );

        });
}


// ======================================================
// BOTTOM NAVIGATION
// ======================================================

function initNavigation() {

    $$("[data-nav]")
        .forEach(item => {

            if (
                item.dataset.navReady
            ) {
                return;
            }


            item.dataset.navReady =
                "true";


            item.addEventListener(
                "click",
                () => {

                    const page =
                        item.dataset.nav;


                    if (!page) {
                        return;
                    }


                    goTo(page);
                }
            );
        });
}


// ======================================================
// ТЕКУЩАЯ СТРАНИЦА
// ======================================================

function setActiveNavigation() {

    const current =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();


    $$("[data-nav]")
        .forEach(item => {

            const page =
                SITE_CONFIG.pages[
                    item.dataset.nav
                ];


            item.classList.toggle(
                "active",
                page === current ||
                (
                    current === "" &&
                    item.dataset.nav === "home"
                )
            );

        });
}


// ======================================================
// LAZY IMAGES
// ======================================================

function initLazyImages() {

    $$("img[data-src]")
        .forEach(image => {

            image.src =
                image.dataset.src;

            image.removeAttribute(
                "data-src"
            );

        });
}


// ======================================================
// ОБЩИЙ INIT
// ======================================================

async function initApp() {

    try {

        await loadSettings();

    } catch (error) {

        console.error(error);
    }


    initNavigation();

    setActiveNavigation();

    initAccordions();

    initModals();

    initLazyImages();

}


// ======================================================
// ЗАПУСК
// ======================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initApp
    );

} else {

    initApp();
}
