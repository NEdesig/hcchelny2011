/* =========================================================
   ХК ЧЕЛНЫ 2011
   PUBLIC APP
   ========================================================= */

let supabaseClient = null;

const state = {
    page: "home",

    settings: {},
    players: [],
    matches: [],
    news: [],
    albums: [],
    products: [],
    achievements: [],
    birthdays: [],
    standings: [],
    leaders: [],

    currentPlayer: null,
    currentMatch: null,
    currentAlbum: null,

    timer: null
};


/* =========================================================
   START
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    applyConfigColors();

    setupNavigation();
    setupModal();

    await initSupabase();

    await loadAllData();

    renderPage();

    hideLoader();

    startLiveTimer();
});


/* =========================================================
   SUPABASE
   ========================================================= */

async function initSupabase() {

    if (
        typeof window.supabase === "undefined" ||
        !window.SITE_CONFIG
    ) {
        console.error("Supabase или config.js не загружены.");
        return;
    }

    supabaseClient = window.supabase.createClient(
        window.SITE_CONFIG.SUPABASE_URL,
        window.SITE_CONFIG.SUPABASE_KEY
    );
}


/* =========================================================
   CONFIG COLORS
   ========================================================= */

function applyConfigColors() {

    const colors =
        window.SITE_CONFIG?.DEFAULT_COLORS || {};

    const root =
        document.documentElement;

    Object.entries(colors).forEach(
        ([key, value]) => {

            const cssName = {
                primary: "--primary",
                accent: "--accent",
                background: "--background",
                surface: "--surface",
                text: "--text",
                muted: "--muted",
                border: "--border"
            }[key];

            if (cssName) {
                root.style.setProperty(
                    cssName,
                    value
                );
            }
        }
    );
}


/* =========================================================
   DATA
   ========================================================= */

async function loadAllData() {

    if (!supabaseClient) {
        useDemoData();
        return;
    }

    try {

        const [
            settings,
            players,
            matches,
            news,
            albums,
            products,
            achievements,
            birthdays,
            standings,
            leaders
        ] = await Promise.all([
            getTable("site_settings"),
            getTable("players"),
            getTable("matches"),
            getTable("news"),
            getTable("albums"),
            getTable("products"),
            getTable("achievements"),
            getTable("birthdays"),
            getTable("standings"),
            getTable("leaders")
        ]);

        state.settings = settings[0] || {};

        state.players = players || [];
        state.matches = matches || [];
        state.news = news || [];
        state.albums = albums || [];
        state.products = products || [];
        state.achievements = achievements || [];
        state.birthdays = birthdays || [];
        state.standings = standings || [];
        state.leaders = leaders || [];

        updateHeader();

    } catch (error) {

        console.error(
            "Ошибка загрузки данных:",
            error
        );

        useDemoData();
    }
}


async function getTable(table) {

    const { data, error } =
        await supabaseClient
            .from(table)
            .select("*");

    if (error) {
        console.warn(
            `Ошибка таблицы ${table}:`,
            error.message
        );

        return [];
    }

    return data || [];
}


/* =========================================================
   DEMO DATA
   ========================================================= */

function useDemoData() {

    state.settings = {
        team_name:
            "ХК Челны 2011",

        subtitle:
            "НАБЕРЕЖНЫЕ ЧЕЛНЫ"
    };

    state.players = [];
    state.matches = [];
    state.news = [];
    state.albums = [];
    state.products = [];
    state.achievements = [];
    state.birthdays = [];
    state.standings = [];
    state.leaders = [];

    updateHeader();
}


/* =========================================================
   HEADER
   ========================================================= */

function updateHeader() {

    const settings =
        state.settings || {};

    const title =
        settings.team_name ||
        window.SITE_CONFIG?.DEFAULT_TEAM_NAME ||
        "ХК Челны 2011";

    const subtitle =
        settings.subtitle ||
        "НАБЕРЕЖНЫЕ ЧЕЛНЫ";

    const titleElement =
        document.getElementById("headerTitle");

    const subtitleElement =
        document.getElementById("headerSubtitle");

    const logoElement =
        document.getElementById("headerLogo");

    if (titleElement) {
        titleElement.textContent =
            title;
    }

    if (subtitleElement) {
        subtitleElement.textContent =
            subtitle;
    }

    if (
        logoElement &&
        settings.logo_url
    ) {
        logoElement.src =
            settings.logo_url;
    }

    if (
        settings.title_color &&
        titleElement
    ) {
        titleElement.style.color =
            settings.title_color;
    }

    if (
        settings.title_size &&
        titleElement
    ) {
        titleElement.style.fontSize =
            `${settings.title_size}px`;
    }
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

    document
        .querySelectorAll(".bottom-nav-item")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const page =
                        button.dataset.page;

                    navigate(page);
                }
            );
        });


    const settingsButton =
        document.getElementById(
            "headerSettingsButton"
        );

    if (settingsButton) {

        settingsButton.addEventListener(
            "click",
            () => {

                window.location.href =
                    "admin.html";
            }
        );
    }
}


function navigate(page) {

    state.page = page;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    document
        .querySelectorAll(".bottom-nav-item")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page === page
            );
        });

    renderPage();
}


/* =========================================================
   PAGE RENDER
   ========================================================= */

function renderPage() {

    const container =
        document.getElementById(
            "mainContent"
        );

    if (!container) return;

    switch (state.page) {

        case "home":
            container.innerHTML =
                renderHome();
            break;

        case "matches":
            container.innerHTML =
                renderMatches();
            break;

        case "roster":
            container.innerHTML =
                renderRoster();
            break;

        case "media":
            container.innerHTML =
                renderMedia();
            break;

        case "shop":
            container.innerHTML =
                renderShop();
            break;

        default:
            container.innerHTML =
                renderHome();
    }

    bindDynamicEvents();
}


/* =========================================================
   HOME
   ========================================================= */

function renderHome() {

    const nextMatch =
        getNextMatch();

    const lastMatch =
        getLastPlayedMatch();

    const html = [];

    html.push(`
        <div class="page home-page">
    `);


    /* NEXT MATCH */

    if (nextMatch) {

        html.push(
            renderMatchDay(nextMatch)
        );

    } else {

        html.push(`
            <div class="empty-state">

                <div class="empty-state-icon">
                    🏒
                </div>

                <div class="empty-state-title">
                    Ближайших матчей нет
                </div>

                <div class="empty-state-text">
                    Следующий матч появится здесь
                    после добавления его в админке.
                </div>

            </div>
        `);
    }


    /* LAST MATCH */

    if (lastMatch) {

        html.push(`
            <section class="section">

                <div class="section-header">

                    <h2 class="section-title">
                        Последний матч
                    </h2>

                    <button
                        class="section-link"
                        data-open-match="${lastMatch.id}"
                    >
                        Подробнее
                    </button>

                </div>

                ${renderLastMatch(lastMatch)}

            </section>
        `);
    }


    /* NEWS */

    const homeNews =
        state.news
            .filter(item =>
                item.published !== false
            )
            .sort(
                sortByDateDesc
            )
            .slice(0, 3);

    if (homeNews.length) {

        html.push(`
            <section class="section">

                <div class="section-header">

                    <h2 class="section-title">
                        Новости
                    </h2>

                </div>

                <div class="news-grid">

                    ${homeNews
                        .map(renderNewsCard)
                        .join("")}

                </div>

            </section>
        `);
    }


    /* LEADERS */

    if (state.leaders.length) {

        html.push(
            renderLeaders()
        );
    }


    /* ACHIEVEMENTS */

    if (state.achievements.length) {

        html.push(`
            <section class="section">

                <div class="section-header">

                    <h2 class="section-title">
                        Достижения
                    </h2>

                </div>

                <div class="achievements-grid">

                    ${state.achievements
                        .map(renderAchievement)
                        .join("")}

                </div>

            </section>
        `);
    }


    /* BIRTHDAYS */

    if (state.birthdays.length) {

        html.push(`
            <section class="section">

                <div class="section-header">

                    <h2 class="section-title">
                        Дни рождения
                    </h2>

                </div>

                <div class="birthdays-list">

                    ${state.birthdays
                        .map(renderBirthday)
                        .join("")}

                </div>

            </section>
        `);
    }


    html.push(`
        </div>
    `);

    return html.join("");
}


/* =========================================================
   NEXT MATCH
   ========================================================= */

function getNextMatch() {

    const now =
        Date.now();

    const future =
        state.matches
            .filter(match => {

                const time =
                    getMatchTimestamp(match);

                return time > now;
            })
            .sort(
                (a, b) =>
                    getMatchTimestamp(a) -
                    getMatchTimestamp(b)
            );

    return future[0] || null;
}


/* =========================================================
   LAST PLAYED MATCH
   ========================================================= */

function getLastPlayedMatch() {

    const now =
        Date.now();

    const played =
        state.matches
            .filter(match => {

                const time =
                    getMatchTimestamp(match);

                return time <= now;
            })
            .sort(
                (a, b) =>
                    getMatchTimestamp(b) -
                    getMatchTimestamp(a)
            );

    return played[0] || null;
}


/* =========================================================
   MATCH TIMESTAMP
   ========================================================= */

function getMatchTimestamp(match) {

    if (!match) {
        return 0;
    }

    const value =
        match.start_at ||
        match.datetime ||
        match.date_time;

    if (value) {

        const timestamp =
            new Date(value).getTime();

        if (!Number.isNaN(timestamp)) {
            return timestamp;
        }
    }

    if (
        match.date &&
        match.time
    ) {

        const timestamp =
            new Date(
                `${match.date}T${match.time}`
            ).getTime();

        if (!Number.isNaN(timestamp)) {
            return timestamp;
        }
    }

    return 0;
}


/* =========================================================
   MATCH DAY
   ========================================================= */

function renderMatchDay(match) {

    const timestamp =
        getMatchTimestamp(match);

    const now =
        Date.now();

    const started =
        timestamp <= now;

    const home =
        match.home_team ||
        match.home ||
        "ХК Челны 2011";

    const away =
        match.away_team ||
        match.away ||
        "Соперник";

    const homeLogo =
        match.home_logo ||
        getTeamLogo(match.home_team_id);

    const awayLogo =
        match.away_logo ||
        getTeamLogo(match.away_team_id);

    const tournament =
        match.tournament ||
        "Матч";

    const venue =
        match.venue_name ||
        match.venue ||
        "Место проведения уточняется";

    const dateText =
        formatMatchDate(timestamp);

    const camera =
        match.broadcast_url;

    return `
        <section
            class="match-day clickable"
            data-open-match="${escapeAttr(match.id)}"
        >

            <div class="match-day-top">

                <div class="match-day-label">
                    ${started
                        ? "МАТЧ"
                        : "БЛИЖАЙШИЙ МАТЧ"}
                </div>

                <div class="match-day-tournament">
                    ${escapeHTML(tournament)}
                </div>

            </div>


            <div class="match-day-content">

                <div class="match-teams">

                    <div class="match-team">

                        ${renderTeamLogo(
                            homeLogo,
                            home
                        )}

                        <div class="match-team-name">
                            ${escapeHTML(home)}
                        </div>

                    </div>


                    <div class="match-vs">
                        VS
                    </div>


                    <div class="match-team">

                        ${renderTeamLogo(
                            awayLogo,
                            away
                        )}

                        <div class="match-team-name">
                            ${escapeHTML(away)}
                        </div>

                    </div>

                </div>


                <div class="match-date">
                    ${dateText}
                </div>

                <div class="match-venue">
                    ${escapeHTML(venue)}
                </div>


                ${
                    started
                        ? `
                            <div
                                class="match-started match-live"
                            >
                                МАТЧ НАЧАЛСЯ
                            </div>
                        `
                        : `
                            <div
                                class="match-countdown"
                                data-countdown="${timestamp}"
                            >
                                ${renderCountdown(
                                    timestamp
                                )}
                            </div>
                        `
                }

            </div>


            ${
                camera
                    ? `
                        <button
                            class="match-camera"
                            type="button"
                            data-broadcast="${escapeAttr(camera)}"
                            aria-label="Смотреть трансляцию"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.8"
                            >
                                <rect
                                    x="3"
                                    y="7"
                                    width="13"
                                    height="10"
                                    rx="2"
                                ></rect>

                                <path
                                    d="m16 10 5-3v10l-5-3"
                                ></path>
                            </svg>
                        </button>
                    `
                    : ""
            }

        </section>
    `;
}


/* =========================================================
   COUNTDOWN
   ========================================================= */

function renderCountdown(timestamp) {

    const diff =
        Math.max(
            0,
            timestamp - Date.now()
        );

    const totalSeconds =
        Math.floor(diff / 1000);

    const days =
        Math.floor(
            totalSeconds / 86400
        );

    const hours =
        Math.floor(
            (totalSeconds % 86400) /
            3600
        );

    const minutes =
        Math.floor(
            (totalSeconds % 3600) /
            60
        );

    const seconds =
        totalSeconds % 60;

    return `
        <div class="countdown-item">

            <span class="countdown-number">
                ${pad(days)}
            </span>

            <span class="countdown-label">
                дн
            </span>

        </div>

        <div class="countdown-item">

            <span class="countdown-number">
                ${pad(hours)}
            </span>

            <span class="countdown-label">
                час
            </span>

        </div>

        <div class="countdown-item">

            <span class="countdown-number">
                ${pad(minutes)}
            </span>

            <span class="countdown-label">
                мин
            </span>

        </div>

        <div class="countdown-item">

            <span class="countdown-number">
                ${pad(seconds)}
            </span>

            <span class="countdown-label">
                сек
            </span>

        </div>
    `;
}


/* =========================================================
   LAST MATCH
   ========================================================= */

function renderLastMatch(match) {

    const home =
        match.home_team ||
        match.home ||
        "ХК Челны 2011";

    const away =
        match.away_team ||
        match.away ||
        "Соперник";

    const homeScore =
        match.home_score ??
        match.score_home ??
        "-";

    const awayScore =
        match.away_score ??
        match.score_away ??
        "-";

    return `
        <article
            class="card clickable last-match-card"
            data-open-match="${escapeAttr(match.id)}"
        >

            ${
                match.image_url
                    ? `
                        <img
                            class="last-match-image"
                            src="${escapeAttr(match.image_url)}"
                            alt=""
                        >
                    `
                    : `
                        <div
                            class="last-match-image"
                        ></div>
                    `
            }

            <div class="last-match-content">

                <div class="last-match-label">
                    ПОСЛЕДНИЙ МАТЧ
                </div>

                <div class="last-match-teams">

                    <div class="last-match-team">
                        ${escapeHTML(home)}
                    </div>

                    <div class="last-match-score">
                        ${homeScore}:${awayScore}
                    </div>

                    <div
                        class="last-match-team"
                        style="text-align:right"
                    >
                        ${escapeHTML(away)}
                    </div>

                </div>

                <div class="last-match-meta">
                    ${formatMatchDate(
                        getMatchTimestamp(match)
                    )}
                </div>

            </div>

        </article>
    `;
}


/* =========================================================
   MATCHES
   ========================================================= */

function renderMatches() {

    const matches =
        [...state.matches]
            .sort(
                (a, b) =>
                    getMatchTimestamp(a) -
                    getMatchTimestamp(b)
            );

    if (!matches.length) {

        return `
            <div class="page">

                <div class="page-header">

                    <h1 class="page-title">
                        Матчи
                    </h1>

                </div>

                ${emptyState(
                    "🏒",
                    "Матчей пока нет",
                    "Расписание появится после добавления матчей в админке."
                )}

            </div>
        `;
    }

    return `
        <div class="page">

            <div class="page-header">

                <h1 class="page-title">
                    Матчи
                </h1>

                <p class="page-subtitle">
                    Расписание и результаты команды
                </p>

            </div>


            <div class="matches-list">

                ${matches
                    .map(renderMatchListCard)
                    .join("")}

            </div>

        </div>
    `;
}


function renderMatchListCard(match) {

    const timestamp =
        getMatchTimestamp(match);

    const now =
        Date.now();

    const isFuture =
        timestamp > now;

    const isLive =
        !isFuture &&
        (
            match.status === "live" ||
            match.status === "started"
        );

    const home =
        match.home_team ||
        match.home ||
        "ХК Челны 2011";

    const away =
        match.away_team ||
        match.away ||
        "Соперник";

    const homeScore =
        match.home_score ??
        match.score_home;

    const awayScore =
        match.away_score ??
        match.score_away;

    let status =
        isFuture
            ? "Предстоящий"
            : "Завершён";

    if (isLive) {
        status = "Идёт сейчас";
    }

    return `
        <article
            class="match-list-card"
            data-open-match="${escapeAttr(match.id)}"
        >

            <div class="match-list-top">

                <div class="match-list-date">
                    ${formatMatchDate(timestamp)}
                </div>

                <div class="match-list-status">
                    ${status}
                </div>

            </div>


            <div class="match-list-teams">

                <div class="match-list-team">
                    ${escapeHTML(home)}
                </div>

                <div class="match-list-score">
                    ${
                        isFuture
                            ? "VS"
                            : `${homeScore ?? "-"}:${awayScore ?? "-"}`
                    }
                </div>

                <div class="match-list-team">
                    ${escapeHTML(away)}
                </div>

            </div>


            <div class="match-list-bottom">

                <span>
                    ${
                        escapeHTML(
                            match.tournament ||
                            "Хоккей"
                        )
                    }
                </span>

                <span>
                    ${
                        escapeHTML(
                            match.venue_name ||
                            match.venue ||
                            ""
                        )
                    }
                </span>

            </div>

        </article>
    `;
}


/* =========================================================
   ROSTER
   ========================================================= */

function renderRoster() {

    const goalies =
        state.players.filter(
            player =>
                normalizePosition(
                    player.position
                ) === "goalie"
        );

    const defensemen =
        state.players.filter(
            player =>
                normalizePosition(
                    player.position
                ) === "defense"
        );

    const forwards =
        state.players.filter(
            player =>
                normalizePosition(
                    player.position
                ) === "forward"
        );

    const unknown =
        state.players.filter(player => {

            const position =
                normalizePosition(
                    player.position
                );

            return ![
                "goalie",
                "defense",
                "forward"
            ].includes(position);
        });

    return `
        <div class="page">

            <div class="page-header">

                <h1 class="page-title">
                    Состав
                </h1>

                <p class="page-subtitle">
                    Игроки команды
                </p>

            </div>


            <div class="player-groups">

                ${renderPlayerGroup(
                    "Вратари",
                    goalies
                )}

                ${renderPlayerGroup(
                    "Защитники",
                    defensemen
                )}

                ${renderPlayerGroup(
                    "Нападающие",
                    forwards
                )}

                ${
                    unknown.length
                        ? renderPlayerGroup(
                            "Игроки",
                            unknown
                        )
                        : ""
                }

            </div>

        </div>
    `;
}


function renderPlayerGroup(
    title,
    players
) {

    if (!players.length) {
        return "";
    }

    return `
        <section>

            <div class="player-group-title">
                ${title}
            </div>

            <div class="players-grid">

                ${players
                    .map(renderPlayerCard)
                    .join("")}

            </div>

        </section>
    `;
}


function renderPlayerCard(player) {

    const name =
        player.full_name ||
        player.name ||
        "Игрок";

    const number =
        player.number ??
        "";

    const position =
        player.position ||
        "";

    const photo =
        player.photo_url ||
        player.image_url ||
        "";

    return `
        <article
            class="player-card"
            data-open-player="${escapeAttr(player.id)}"
        >

            ${
                photo
                    ? `
                        <img
                            class="player-photo"
                            src="${escapeAttr(photo)}"
                            alt="${escapeAttr(name)}"
                            loading="lazy"
                        >
                    `
                    : `
                        <div class="player-photo"></div>
                    `
            }


            ${
                number !== ""
                    ? `
                        <div class="player-number">
                            ${escapeHTML(number)}
                        </div>
                    `
                    : ""
            }


            ${
                player.captain
                    ? `
                        <div class="player-captain">
                            К
                        </div>
                    `
                    : ""
            }


            <div class="player-info">

                <div class="player-name">
                    ${escapeHTML(name)}
                </div>

                <div class="player-position">
                    ${escapeHTML(position)}
                </div>

            </div>

        </article>
    `;
}


/* =========================================================
   PLAYER DETAIL
   ========================================================= */

function renderPlayerDetail(player) {

    const name =
        player.full_name ||
        player.name ||
        "Игрок";

    const photo =
        player.photo_url ||
        player.image_url ||
        "";

    const position =
        player.position ||
        "";

    const stats =
        getPlayerStats(player);

    return `
        <div class="page">

            <button
                class="secondary-button"
                data-back
                type="button"
            >
                ← Назад
            </button>


            <section
                class="player-detail"
                style="margin-top:12px"
            >

                ${
                    photo
                        ? `
                            <img
                                class="player-detail-photo"
                                src="${escapeAttr(photo)}"
                                alt="${escapeAttr(name)}"
                            >
                        `
                        : `
                            <div
                                class="player-detail-photo"
                            ></div>
                        `
                }


                <div class="player-detail-info">

                    ${
                        player.number !== null &&
                        player.number !== undefined
                            ? `
                                <div
                                    class="player-detail-number"
                                >
                                    #${escapeHTML(
                                        player.number
                                    )}
                                </div>
                            `
                            : ""
                    }


                    <div class="player-detail-name">
                        ${escapeHTML(name)}
                    </div>

                    <div class="player-detail-position">
                        ${escapeHTML(position)}
                    </div>


                    <div class="player-detail-meta">

                        <div class="player-meta-item">

                            <span class="player-meta-value">
                                ${formatDateOnly(
                                    player.birth_date
                                )}
                            </span>

                            <span class="player-meta-label">
                                Дата рождения
                            </span>

                        </div>


                        <div class="player-meta-item">

                            <span class="player-meta-value">
                                ${
                                    player.height
                                        ? `${player.height} см`
                                        : "—"
                                }
                            </span>

                            <span class="player-meta-label">
                                Рост
                            </span>

                        </div>


                        <div class="player-meta-item">

                            <span class="player-meta-value">
                                ${
                                    player.weight
                                        ? `${player.weight} кг`
                                        : "—"
                                }
                            </span>

                            <span class="player-meta-label">
                                Вес
                            </span>

                        </div>

                    </div>

                </div>

            </section>


            <section class="section">

                <div class="section-header">

                    <h2 class="section-title">
                        Статистика
                    </h2>

                </div>

                <div class="stats-grid">

                    ${renderPlayerStat(
                        stats.games,
                        "Игр"
                    )}

                    ${
                        normalizePosition(
                            player.position
                        ) === "goalie"
                            ? `
                                ${renderPlayerStat(
                                    stats.goalsAgainst,
                                    "Пропущено"
                                )}

                                ${renderPlayerStat(
                                    stats.gaa,
                                    "КН"
                                )}

                                ${renderPlayerStat(
                                    stats.penaltyMinutes,
                                    "Штраф, мин"
                                )}
                            `
                            : `
                                ${renderPlayerStat(
                                    stats.goals,
                                    "Голы"
                                )}

                                ${renderPlayerStat(
                                    stats.assists,
                                    "Передачи"
                                )}

                                ${renderPlayerStat(
                                    stats.points,
                                    "Очки"
                                )}

                                ${renderPlayerStat(
                                    stats.penaltyMinutes,
                                    "Штраф, мин"
                                )}
                            `
                    }

                </div>

            </section>

        </div>
    `;
}


function renderPlayerStat(
    value,
    label
) {

    return `
        <div class="stat-card">

            <div class="stat-value">
                ${value ?? 0}
            </div>

            <div class="stat-label">
                ${label}
            </div>

        </div>
    `;
}


function getPlayerStats(player) {

    const goals =
        Number(
            player.goals || 0
        );

    const assists =
        Number(
            player.assists || 0
        );

    const points =
        Number(
            player.points ??
            goals + assists
        );

    const games =
        Number(
            player.games || 0
        );

    const goalsAgainst =
        Number(
            player.goals_against || 0
        );

    const penaltyMinutes =
        Number(
            player.penalty_minutes || 0
        );

    let gaa =
        player.gaa;

    if (
        gaa === null ||
        gaa === undefined ||
        gaa === ""
    ) {
        gaa =
            games > 0
                ? (
                    goalsAgainst /
                    games
                ).toFixed(2)
                : "0.00";
    }

    return {
        goals,
        assists,
        points,
        games,
        goalsAgainst,
        penaltyMinutes,
        gaa
    };
}


/* =========================================================
   MEDIA
   ========================================================= */

function renderMedia() {

    if (!state.albums.length) {

        return `
            <div class="page">

                <div class="page-header">

                    <h1 class="page-title">
                        Медиа
                    </h1>

                    <p class="page-subtitle">
                        Фотографии и альбомы команды
                    </p>

                </div>

                ${emptyState(
                    "📷",
                    "Альбомов пока нет",
                    "Фотографии появятся здесь после добавления альбома в админке."
                )}

            </div>
        `;
    }

    return `
        <div class="page">

            <div class="page-header">

                <h1 class="page-title">
                    Медиа
                </h1>

                <p class="page-subtitle">
                    Фотографии и альбомы команды
                </p>

            </div>


            <div class="album-grid">

                ${state.albums
                    .map(renderAlbumCard)
                    .join("")}

            </div>

        </div>
    `;
}


function renderAlbumCard(album) {

    const cover =
        album.cover_url ||
        album.image_url ||
        "";

    return `
        <article
            class="album-card"
            data-open-album="${escapeAttr(album.id)}"
        >

            ${
                cover
                    ? `
                        <img
                            class="album-cover"
                            src="${escapeAttr(cover)}"
                            alt=""
                            loading="lazy"
                        >
                    `
                    : `
                        <div
                            class="album-cover"
                        ></div>
                    `
            }


            <div class="album-overlay">

                <div class="album-title">
                    ${escapeHTML(
                        album.title ||
                        "Альбом"
                    )}
                </div>

                <div class="album-description">
                    ${escapeHTML(
                        album.description ||
                        ""
                    )}
                </div>

            </div>

        </article>
    `;
}


/* =========================================================
   ALBUM DETAIL
   ========================================================= */

function renderAlbumDetail(album) {

    let photos =
        album.photos ||
        [];

    if (
        typeof photos === "string"
    ) {

        try {
            photos =
                JSON.parse(photos);
        } catch {
            photos = [];
        }
    }

    return `
        <div class="page">

            <button
                class="secondary-button"
                data-back
                type="button"
            >
                ← Назад
            </button>


            <div
                class="page-header"
                style="margin-top:16px"
            >

                <h1 class="page-title">
                    ${escapeHTML(
                        album.title ||
                        "Альбом"
                    )}
                </h1>

                ${
                    album.description
                        ? `
                            <p class="page-subtitle">
                                ${escapeHTML(
                                    album.description
                                )}
                            </p>
                        `
                        : ""
                }

            </div>


            ${
                photos.length
                    ? `
                        <div class="album-grid">

                            ${photos
                                .map(
                                    (photo, index) => `
                                        <article
                                            class="album-card"
                                            data-open-photo="${index}"
                                        >
                                            <img
                                                class="album-cover"
                                                src="${escapeAttr(
                                                    typeof photo === "string"
                                                        ? photo
                                                        : photo.url
                                                )}"
                                                alt=""
                                                loading="lazy"
                                            >
                                        </article>
                                    `
                                )
                                .join("")}

                        </div>
                    `
                    : emptyState(
                        "📷",
                        "Фотографий пока нет",
                        "В этом альбоме ещё нет фотографий."
                    )
            }

        </div>
    `;
}


/* =========================================================
   SHOP
   ========================================================= */

function renderShop() {

    if (!state.products.length) {

        return `
            <div class="page">

                <div class="page-header">

                    <h1 class="page-title">
                        Товары
                    </h1>

                    <p class="page-subtitle">
                        Атрибутика и товары команды
                    </p>

                </div>

                ${emptyState(
                    "🛍",
                    "Товаров пока нет",
                    "Товары появятся после добавления через админку."
                )}

            </div>
        `;
    }

    return `
        <div class="page">

            <div class="page-header">

                <h1 class="page-title">
                    Товары
                </h1>

                <p class="page-subtitle">
                    Атрибутика и товары команды
                </p>

            </div>


            <div class="products-grid">

                ${state.products
                    .map(renderProductCard)
                    .join("")}

            </div>

        </div>
    `;
}


function renderProductCard(product) {

    const image =
        product.image_url ||
        product.photo_url ||
        "";

    return `
        <article
            class="product-card"
            data-open-product="${escapeAttr(product.id)}"
        >

            ${
                image
                    ? `
                        <img
                            class="product-image"
                            src="${escapeAttr(image)}"
                            alt="${escapeAttr(
                                product.name ||
                                "Товар"
                            )}"
                            loading="lazy"
                        >
                    `
                    : `
                        <div class="product-image"></div>
                    `
            }


            <div class="product-content">

                <div class="product-name">
                    ${escapeHTML(
                        product.name ||
                        "Товар"
                    )}
                </div>

                ${
                    product.price !== null &&
                    product.price !== undefined
                        ? `
                            <div class="product-price">
                                ${formatPrice(
                                    product.price
                                )}
                            </div>
                        `
                        : ""
                }

                ${
                    product.description
                        ? `
                            <div class="product-description">
                                ${escapeHTML(
                                    product.description
                                )}
                            </div>
                        `
                        : ""
                }

            </div>

        </article>
    `;
}


/* =========================================================
   NEWS CARD
   ========================================================= */

function renderNewsCard(news) {

    return `
        <article
            class="news-card"
            data-open-news="${escapeAttr(news.id)}"
        >

            ${
                news.image_url
                    ? `
                        <img
                            class="news-image"
                            src="${escapeAttr(
                                news.image_url
                            )}"
                            alt=""
                            loading="lazy"
                        >
                    `
                    : `
                        <div
                            class="news-image"
                        ></div>
                    `
            }


            <div class="news-content">

                ${
                    news.tag
                        ? `
                            <div class="news-tag">
                                ${escapeHTML(
                                    news.tag
                                )}
                            </div>
                        `
                        : ""
                }


                <div class="news-title">
                    ${escapeHTML(
                        news.title ||
                        "Новость"
                    )}
                </div>


                ${
                    news.description
                        ? `
                            <div class="news-description">
                                ${escapeHTML(
                                    news.description
                                )}
                            </div>
                        `
                        : ""
                }


                ${
                    news.created_at ||
                    news.published_at
                        ? `
                            <div class="news-date">
                                ${formatDateTime(
                                    news.published_at ||
                                    news.created_at
                                )}
                            </div>
                        `
                        : ""
                }

            </div>

        </article>
    `;
}


/* =========================================================
   LEADERS
   ========================================================= */

function renderLeaders() {

    const groups = [
        {
            title: "Бомбардиры",
            key: "scorers",
            icon: "О"
        },
        {
            title: "Снайперы",
            key: "goals",
            icon: "Г"
        },
        {
            title: "Плюс / минус",
            key: "plus_minus",
            icon: "+/-"
        },
        {
            title: "Бомбардиры-защитники",
            key: "defense",
            icon: "З"
        }
    ];

    return `
        <section class="section">

            <div class="section-header">

                <h2 class="section-title">
                    Лидеры команды
                </h2>

            </div>


            <div class="leaders-list">

                ${groups
                    .map(group =>
                        renderLeaderGroup(
                            group
                        )
                    )
                    .join("")}

            </div>

        </section>
    `;
}


function renderLeaderGroup(group) {

    let players =
        state.leaders.filter(
            item =>
                item.category === group.key
        );

    if (!players.length) {

        if (group.key === "goals") {

            players =
                [...state.players]
                    .sort(
                        (a, b) =>
                            Number(b.goals || 0) -
                            Number(a.goals || 0)
                    )
                    .slice(0, 3);

        } else if (
            group.key === "scorers"
        ) {

            players =
                [...state.players]
                    .sort(
                        (a, b) =>
                            (
                                Number(
                                    b.points ??
                                    (
                                        Number(b.goals || 0) +
                                        Number(b.assists || 0)
                                    )
                                )
                            ) -
                            (
                                Number(
                                    a.points ??
                                    (
                                        Number(a.goals || 0) +
                                        Number(a.assists || 0)
                                    )
                                )
                            )
                    )
                    .slice(0, 3);

        } else if (
            group.key === "plus_minus"
        ) {

            players =
                [...state.players]
                    .sort(
                        (a, b) =>
                            Number(
                                b.plus_minus || 0
                            ) -
                            Number(
                                a.plus_minus || 0
                            )
                    )
                    .slice(0, 3);

        } else if (
            group.key === "defense"
        ) {

            players =
                [...state.players]
                    .filter(
                        p =>
                            normalizePosition(
                                p.position
                            ) === "defense"
                    )
                    .sort(
                        (a, b) =>
                            Number(b.points || 0) -
                            Number(a.points || 0)
                    )
                    .slice(0, 3);
        }
    }

    players =
        players.slice(0, 3);

    if (!players.length) {
        return "";
    }

    return `
        <div
            class="leader-block"
        >

            <button
                class="leader-header"
                type="button"
                data-toggle-leader
            >

                <span class="leader-header-left">

                    <span class="leader-icon">
                        ${group.icon}
                    </span>

                    <span class="leader-title">
                        ${group.title}
                    </span>

                </span>

                <span class="leader-arrow">
                    ↓
                </span>

            </button>


            <div class="leader-body">

                ${players
                    .map(
                        (player, index) =>
                            renderLeaderRow(
                                player,
                                index,
                                group.key
                            )
                    )
                    .join("")}

            </div>

        </div>
    `;
}


function renderLeaderRow(
    player,
    index,
    category
) {

    let value = 0;

    if (category === "goals") {
        value =
            player.goals || 0;
    } else if (
        category === "plus_minus"
    ) {
        value =
            player.plus_minus || 0;
    } else {
        value =
            player.points ??
            (
                Number(player.goals || 0) +
                Number(player.assists || 0)
            );
    }

    const photo =
        player.photo_url ||
        player.image_url ||
        "";

    return `
        <div class="leader-row">

            <div class="leader-position">
                ${index + 1}
            </div>

            <div class="leader-player">

                ${
                    photo
                        ? `
                            <img
                                class="leader-player-photo"
                                src="${escapeAttr(photo)}"
                                alt=""
                            >
                        `
                        : `
                            <div
                                class="leader-player-photo"
                            ></div>
                        `
                }

                <div class="leader-player-name">
                    ${escapeHTML(
                        player.full_name ||
                        player.name ||
                        "Игрок"
                    )}
                </div>

            </div>

            <div class="leader-value">
                ${value}
            </div>

        </div>
    `;
}


/* =========================================================
   ACHIEVEMENT
   ========================================================= */

function renderAchievement(item) {

    return `
        <article class="achievement-card">

            <div class="achievement-icon">
                ${item.icon || "🏆"}
            </div>

            <div>

                <div class="achievement-title">
                    ${escapeHTML(
                        item.title ||
                        "Достижение"
                    )}
                </div>

                ${
                    item.description
                        ? `
                            <div class="achievement-description">
                                ${escapeHTML(
                                    item.description
                                )}
                            </div>
                        `
                        : ""
                }

            </div>

        </article>
    `;
}


/* =========================================================
   BIRTHDAY
   ========================================================= */

function renderBirthday(item) {

    return `
        <article class="birthday-card">

            ${
                item.photo_url
                    ? `
                        <img
                            class="birthday-photo"
                            src="${escapeAttr(
                                item.photo_url
                            )}"
                            alt=""
                        >
                    `
                    : `
                        <div
                            class="birthday-photo"
                        ></div>
                    `
            }


            <div>

                <div class="birthday-name">
                    ${escapeHTML(
                        item.name ||
                        "Игрок"
                    )}
                </div>

                <div class="birthday-date">
                    ${formatDateOnly(
                        item.birth_date
                    )}
                </div>

            </div>

        </article>
    `;
}


/* =========================================================
   DYNAMIC EVENTS
   ========================================================= */

function bindDynamicEvents() {

    document
        .querySelectorAll("[data-open-match]")
        .forEach(element => {

            element.addEventListener(
                "click",
                event => {

                    if (
                        event.target.closest(
                            "[data-broadcast]"
                        )
                    ) {
                        return;
                    }

                    openMatch(
                        element.dataset.openMatch
                    );
                }
            );
        });


    document
        .querySelectorAll("[data-broadcast]")
        .forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    const url =
                        button.dataset.broadcast;

                    if (url) {
                        window.open(
                            url,
                            "_blank"
                        );
                    }
                }
            );
        });


    document
        .querySelectorAll("[data-open-player]")
        .forEach(element => {

            element.addEventListener(
                "click",
                () => {

                    openPlayer(
                        element.dataset.openPlayer
                    );
                }
            );
        });


    document
        .querySelectorAll("[data-open-album]")
        .forEach(element => {

            element.addEventListener(
                "click",
                () => {

                    openAlbum(
                        element.dataset.openAlbum
                    );
                }
            );
        });


    document
        .querySelectorAll("[data-open-product]")
        .forEach(element => {

            element.addEventListener(
                "click",
                () => {

                    openProduct(
                        element.dataset.openProduct
                    );
                }
            );
        });


    document
        .querySelectorAll("[data-open-news]")
        .forEach(element => {

            element.addEventListener(
                "click",
                () => {

                    openNews(
                        element.dataset.openNews
                    );
                }
            );
        });


    document
        .querySelectorAll("[data-toggle-leader]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    button
                        .closest(".leader-block")
                        ?.classList.toggle("open");
                }
            );
        });


    document
        .querySelectorAll("[data-back]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    state.currentPlayer = null;
                    state.currentMatch = null;
                    state.currentAlbum = null;

                    renderPage();
                }
            );
        });
}


/* =========================================================
   OPEN PLAYER
   ========================================================= */

function openPlayer(id) {

    const player =
        state.players.find(
            item =>
                String(item.id) === String(id)
        );

    if (!player) return;

    state.currentPlayer =
        player;

    openModal(
        renderPlayerDetail(player)
    );
}


/* =========================================================
   OPEN MATCH
   ========================================================= */

async function openMatch(id) {

    const match =
        state.matches.find(
            item =>
                String(item.id) === String(id)
        );

    if (!match) return;

    state.currentMatch =
        match;

    let events = [];

    let lineup = [];

    let periods = [];

    let officials = [];

    if (supabaseClient) {

        try {

            const result =
                await Promise.all([
                    getRows(
                        "match_events",
                        id
                    ),
                    getRows(
                        "match_lineups",
                        id
                    ),
                    getRows(
                        "match_periods",
                        id
                    ),
                    getRows(
                        "match_officials",
                        id
                    )
                ]);

            events = result[0];
            lineup = result[1];
            periods = result[2];
            officials = result[3];

        } catch (error) {

            console.error(error);
        }
    }

    openModal(
        renderMatchDetail(
            match,
            events,
            lineup,
            periods,
            officials
        )
    );
}


async function getRows(
    table,
    matchId
) {

    const { data, error } =
        await supabaseClient
            .from(table)
            .select("*")
            .eq(
                "match_id",
                matchId
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );

    if (error) {
        console.warn(
            table,
            error.message
        );

        return [];
    }

    return data || [];
}


/* =========================================================
   MATCH DETAIL
   ========================================================= */

function renderMatchDetail(
    match,
    events,
    lineup,
    periods,
    officials
) {

    const home =
        match.home_team ||
        match.home ||
        "ХК Челны 2011";

    const away =
        match.away_team ||
        match.away ||
        "Соперник";

    const homeScore =
        match.home_score ??
        match.score_home;

    const awayScore =
        match.away_score ??
        match.score_away;

    return `
        <div class="page">

            <div class="match-detail-header">

                <div class="match-detail-tournament">
                    ${escapeHTML(
                        match.tournament ||
                        "Хоккей"
                    )}
                </div>

                <div class="match-detail-date">
                    ${formatMatchDate(
                        getMatchTimestamp(match)
                    )}
                </div>


                <div class="match-detail-teams">

                    <div class="match-detail-team-name">
                        ${escapeHTML(home)}
                    </div>

                    <div class="match-detail-score">

                        ${
                            homeScore !== null &&
                            homeScore !== undefined
                                ? `${homeScore}:${awayScore ?? 0}`
                                : "VS"
                        }

                    </div>

                    <div
                        class="match-detail-team-name"
                        style="text-align:right"
                    >
                        ${escapeHTML(away)}
                    </div>

                </div>


                <div class="match-detail-venue">
                    ${escapeHTML(
                        match.venue_name ||
                        match.venue ||
                        ""
                    )}
                </div>

            </div>


            ${
                periods.length
                    ? `
                        <section class="section">

                            <div class="section-header">

                                <h2 class="section-title">
                                    Периоды
                                </h2>

                            </div>

                            ${renderPeriods(
                                periods
                            )}

                        </section>
                    `
                    : ""
            }


            ${
                lineup.length
                    ? `
                        <section class="section">

                            <div class="section-header">

                                <h2 class="section-title">
                                    Состав на матч
                                </h2>

                            </div>

                            <div class="lineup-list">

                                ${lineup
                                    .map(
                                        renderLineupLine
                                    )
                                    .join("")}

                            </div>

                        </section>
                    `
                    : ""
            }


            ${
                events.length
                    ? `
                        <section class="section">

                            <div class="section-header">

                                <h2 class="section-title">
                                    События
                                </h2>

                            </div>

                            <div class="events-list">

                                ${events
                                    .map(
                                        renderMatchEvent
                                    )
                                    .join("")}

                            </div>

                        </section>
                    `
                    : ""
            }


            ${
                officials.length
                    ? `
                        <section class="section">

                            <div class="section-header">

                                <h2 class="section-title">
                                    Судейская бригада
                                </h2>

                            </div>

                            <div class="lineup-list">

                                ${officials
                                    .map(
                                        official => `
                                            <div
                                                class="lineup-line"
                                            >

                                                <div
                                                    class="lineup-numbers"
                                                >
                                                    ${escapeHTML(
                                                        official.role ||
                                                        "Судья"
                                                    )}
                                                </div>

                                                <div
                                                    class="lineup-names"
                                                >
                                                    ${escapeHTML(
                                                        official.person_name ||
                                                        official.name ||
                                                        ""
                                                    )}
                                                </div>

                                            </div>
                                        `
                                    )
                                    .join("")}

                            </div>

                        </section>
                    `
                    : ""
            }

        </div>
    `;
}


/* =========================================================
   PERIODS
   ========================================================= */

function renderPeriods(periods) {

    return `
        <div class="table-wrapper">

            <table class="standings-table periods-table">

                <thead>

                    <tr>
                        <th>
                            Период
                        </th>

                        <th>
                            Хозяева
                        </th>

                        <th>
                            Гости
                        </th>
                    </tr>

                </thead>

                <tbody>

                    ${periods
                        .map(period => `
                            <tr>

                                <td>
                                    ${escapeHTML(
                                        period.period ||
                                        ""
                                    )}
                                </td>

                                <td>
                                    ${period.home_score ?? 0}
                                </td>

                                <td>
                                    ${period.away_score ?? 0}
                                </td>

                            </tr>
                        `)
                        .join("")}

                </tbody>

            </table>

        </div>
    `;
}


/* =========================================================
   LINEUP LINE
   ========================================================= */

function renderLineupLine(line) {

    return `
        <div class="lineup-line">

            <div class="lineup-numbers">
                ${escapeHTML(
                    line.numbers ||
                    line.player_numbers ||
                    ""
                )}
            </div>

            <div class="lineup-names">
                ${escapeHTML(
                    line.names ||
                    line.player_names ||
                    ""
                )}
            </div>

        </div>
    `;
}


/* =========================================================
   MATCH EVENT
   ========================================================= */

function renderMatchEvent(event) {

    let text =
        event.description ||
        "";

    if (
        !text &&
        event.event_type
    ) {

        if (
            event.event_type === "goal"
        ) {
            text = "Гол";
        } else if (
            event.event_type === "penalty"
        ) {
            text = "Удаление";
        } else {
            text =
                event.event_type;
        }
    }

    if (event.player_name) {

        text +=
            ` — ${event.player_name}`;
    }

    if (event.assist1_name) {

        text +=
            `, пас: ${event.assist1_name}`;
    }

    return `
        <div class="event-row">

            <div class="event-time">
                ${escapeHTML(
                    event.minute ||
                    event.time ||
                    ""
                )}
            </div>

            <div class="event-text">
                ${escapeHTML(text)}
            </div>

        </div>
    `;
}


/* =========================================================
   OPEN ALBUM
   ========================================================= */

async function openAlbum(id) {

    let album =
        state.albums.find(
            item =>
                String(item.id) === String(id)
        );

    if (!album) return;

    if (
        supabaseClient &&
        !album.photos
    ) {

        const { data, error } =
            await supabaseClient
                .from("album_photos")
                .select("*")
                .eq(
                    "album_id",
                    id
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );

        if (!error) {

            album = {
                ...album,
                photos: data || []
            };
        }
    }

    state.currentAlbum =
        album;

    openModal(
        renderAlbumDetail(album)
    );
}


/* =========================================================
   OPEN PRODUCT
   ========================================================= */

function openProduct(id) {

    const product =
        state.products.find(
            item =>
                String(item.id) === String(id)
        );

    if (!product) return;

    openModal(`
        <div class="page">

            <div class="page-header">

                <h1 class="page-title">
                    ${escapeHTML(
                        product.name ||
                        "Товар"
                    )}
                </h1>

            </div>


            ${
                product.image_url
                    ? `
                        <img
                            src="${escapeAttr(
                                product.image_url
                            )}"
                            alt=""
                            style="
                                width:100%;
                                border-radius:18px;
                                max-height:420px;
                                object-fit:cover;
                            "
                        >
                    `
                    : ""
            }


            ${
                product.price !== null &&
                product.price !== undefined
                    ? `
                        <div
                            style="
                                margin-top:15px;
                                color:var(--accent);
                                font-size:24px;
                                font-weight:900;
                            "
                        >
                            ${formatPrice(
                                product.price
                            )}
                        </div>
                    `
                    : ""
            }


            ${
                product.description
                    ? `
                        <div
                            style="
                                margin-top:13px;
                                color:var(--muted);
                                font-size:11px;
                                line-height:1.5;
                            "
                        >
                            ${escapeHTML(
                                product.description
                            )}
                        </div>
                    `
                    : ""
            }


            ${
                product.seller_contact
                    ? `
                        <div class="section">

                            <div class="section-title">
                                Связаться
                            </div>

                            <div
                                style="
                                    margin-top:9px;
                                    padding:13px;
                                    border-radius:12px;
                                    background:var(--surface);
                                    border:1px solid var(--border);
                                    font-size:10px;
                                "
                            >
                                ${escapeHTML(
                                    product.seller_contact
                                )}
                            </div>

                        </div>
                    `
                    : ""
            }

        </div>
    `);
}


/* =========================================================
   OPEN NEWS
   ========================================================= */

function openNews(id) {

    const news =
        state.news.find(
            item =>
                String(item.id) === String(id)
        );

    if (!news) return;

    openModal(`
        <div class="page">

            ${
                news.image_url
                    ? `
                        <img
                            src="${escapeAttr(
                                news.image_url
                            )}"
                            alt=""
                            style="
                                width:100%;
                                max-height:380px;
                                object-fit:cover;
                                border-radius:18px;
                            "
                        >
                    `
                    : ""
            }


            <div
                class="page-header"
                style="margin-top:16px"
            >

                ${
                    news.tag
                        ? `
                            <div class="news-tag">
                                ${escapeHTML(
                                    news.tag
                                )}
                            </div>
                        `
                        : ""
                }

                <h1
                    class="page-title"
                    style="margin-top:7px"
                >
                    ${escapeHTML(
                        news.title ||
                        "Новость"
                    )}
                </h1>

                ${
                    news.published_at ||
                    news.created_at
                        ? `
                            <p class="page-subtitle">
                                ${formatDateTime(
                                    news.published_at ||
                                    news.created_at
                                )}
                            </p>
                        `
                        : ""
                }

            </div>


            ${
                news.description
                    ? `
                        <div
                            style="
                                color:var(--muted);
                                font-size:11px;
                                line-height:1.6;
                                white-space:pre-line;
                            "
                        >
                            ${escapeHTML(
                                news.description
                            )}
                        </div>
                    `
                    : ""
            }

        </div>
    `);
}


/* =========================================================
   MODAL
   ========================================================= */

function setupModal() {

    const modal =
        document.getElementById("modal");

    const backdrop =
        document.getElementById(
            "modalBackdrop"
        );

    const close =
        document.getElementById(
            "modalClose"
        );

    if (backdrop) {

        backdrop.addEventListener(
            "click",
            closeModal
        );
    }

    if (close) {

        close.addEventListener(
            "click",
            closeModal
        );
    }
}


function openModal(content) {

    const modal =
        document.getElementById("modal");

    const modalContent =
        document.getElementById(
            "modalContent"
        );

    if (!modal || !modalContent) {
        return;
    }

    modalContent.innerHTML =
        content;

    modal.classList.remove("hidden");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow =
        "hidden";

    bindDynamicEvents();
}


function closeModal() {

    const modal =
        document.getElementById("modal");

    if (!modal) return;

    modal.classList.add("hidden");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow =
        "";
}


/* =========================================================
   PHOTO VIEWER
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        const element =
            event.target.closest(
                "[data-open-photo]"
            );

        if (!element) return;

        const index =
            Number(
                element.dataset.openPhoto
            );

        const album =
            state.currentAlbum;

        if (!album) return;

        let photos =
            album.photos || [];

        if (
            typeof photos === "string"
        ) {

            try {
                photos =
                    JSON.parse(photos);
            } catch {
                photos = [];
            }
        }

        const photo =
            photos[index];

        const url =
            typeof photo === "string"
                ? photo
                : photo?.url;

        if (!url) return;

        openModal(`
            <div class="photo-viewer">

                <img
                    class="photo-viewer-main"
                    src="${escapeAttr(url)}"
                    alt=""
                >

                <div class="photo-viewer-count">
                    ${index + 1} / ${photos.length}
                </div>

            </div>
        `);
    }
);


/* =========================================================
   LIVE COUNTDOWN
   ========================================================= */

function startLiveTimer() {

    if (state.timer) {
        clearInterval(
            state.timer
        );
    }

    state.timer =
        setInterval(
            updateCountdowns,
            1000
        );
}


function updateCountdowns() {

    const elements =
        document.querySelectorAll(
            "[data-countdown]"
        );

    if (!elements.length) {
        return;
    }

    elements.forEach(element => {

        const timestamp =
            Number(
                element.dataset.countdown
            );

        if (
            !timestamp ||
            timestamp <= Date.now()
        ) {

            renderPage();

            return;
        }

        element.innerHTML =
            renderCountdown(
                timestamp
            );
    });
}


/* =========================================================
   LOADER
   ========================================================= */

function hideLoader() {

    const loader =
        document.getElementById(
            "pageLoader"
        );

    if (!loader) return;

    setTimeout(() => {

        loader.classList.add(
            "hidden"
        );

    }, 250);
}


/* =========================================================
   EMPTY
   ========================================================= */

function emptyState(
    icon,
    title,
    text
) {

    return `
        <div class="empty-state">

            <div class="empty-state-icon">
                ${icon}
            </div>

            <div class="empty-state-title">
                ${escapeHTML(title)}
            </div>

            <div class="empty-state-text">
                ${escapeHTML(text)}
            </div>

        </div>
    `;
}


/* =========================================================
   TEAM LOGO
   ========================================================= */

function getTeamLogo(teamId) {

    const team =
        state.settings?.team_registry?.find?.(
            item =>
                String(item.id) ===
                String(teamId)
        );

    return team?.logo_url || "";
}


function renderTeamLogo(
    logo,
    name
) {

    if (logo) {

        return `
            <img
                class="match-team-logo"
                src="${escapeAttr(logo)}"
                alt="${escapeAttr(name)}"
            >
        `;
    }

    return `
        <div
            class="match-team-logo"
            style="
                display:flex;
                align-items:center;
                justify-content:center;
                border-radius:50%;
                background:rgba(255,255,255,.05);
                color:var(--accent);
                font-size:20px;
                font-weight:900;
            "
        >
            Х
        </div>
    `;
}


/* =========================================================
   POSITION
   ========================================================= */

function normalizePosition(position) {

    if (!position) {
        return "";
    }

    const value =
        String(position)
            .toLowerCase()
            .trim();

    if (
        value.includes("врат") ||
        value.includes("goal")
    ) {
        return "goalie";
    }

    if (
        value.includes("защит") ||
        value.includes("def")
    ) {
        return "defense";
    }

    if (
        value.includes("напад") ||
        value.includes("форвар") ||
        value.includes("forward")
    ) {
        return "forward";
    }

    return "";
}


/* =========================================================
   FORMATTING
   ========================================================= */

function formatMatchDate(
    timestamp
) {

    if (!timestamp) {
        return "Дата не указана";
    }

    const date =
        new Date(timestamp);

    if (Number.isNaN(
        date.getTime()
    )) {
        return "Дата не указана";
    }

    return date.toLocaleString(
        "ru-RU",
        {
            day: "2-digit",
            month: "long",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function formatDateTime(
    value
) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (Number.isNaN(
        date.getTime()
    )) {
        return "";
    }

    return date.toLocaleString(
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


function formatDateOnly(
    value
) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (Number.isNaN(
        date.getTime()
    )) {
        return "—";
    }

    return date.toLocaleDateString(
        "ru-RU",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}


function formatPrice(
    value
) {

    const number =
        Number(value);

    if (Number.isNaN(number)) {
        return escapeHTML(
            String(value)
        );
    }

    return (
        new Intl.NumberFormat(
            "ru-RU"
        ).format(number)
        + " ₽"
    );
}


function sortByDateDesc(
    a,
    b
) {

    const da =
        new Date(
            b.published_at ||
            b.created_at ||
            0
        ).getTime();

    const db =
        new Date(
            a.published_at ||
            a.created_at ||
            0
        ).getTime();

    return da - db;
}


function pad(number) {

    return String(number)
        .padStart(2, "0");
}


/* =========================================================
   ESCAPE
   ========================================================= */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function escapeAttr(value) {

    return escapeHTML(value);
}


/* =========================================================
   KEYBOARD
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeModal();
        }
    }
);


/* =========================================================
   GLOBAL ERROR HANDLING
   ========================================================= */

window.addEventListener(
    "error",
    event => {

        console.error(
            "Ошибка сайта:",
            event.error || event.message
        );
    }
);
