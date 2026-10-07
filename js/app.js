// ============================================================
// ХК ЧЕЛНЫ 2011 — PUBLIC APP
// ============================================================

const db = window.supabaseClient;


// ============================================================
// HELPERS
// ============================================================

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => [...document.querySelectorAll(selector)];


function escapeHtml(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatDate(date, options = {}) {
    if (!date) return "";

    return new Intl.DateTimeFormat(
        "ru-RU",
        {
            day: "2-digit",
            month: "long",
            year: "numeric",
            ...options
        }
    ).format(new Date(date));
}


function formatShortDate(date) {
    if (!date) return "";

    return new Intl.DateTimeFormat(
        "ru-RU",
        {
            day: "2-digit",
            month: "2-digit"
        }
    ).format(new Date(date));
}


function formatTime(date) {
    if (!date) return "";

    return new Intl.DateTimeFormat(
        "ru-RU",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(new Date(date));
}


function isToday(date) {
    const a = new Date(date);
    const b = new Date();

    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}


function isTomorrow(date) {
    const target = new Date(date);

    const tomorrow = new Date();

    tomorrow.setDate(
        tomorrow.getDate() + 1
    );

    return (
        target.getFullYear() === tomorrow.getFullYear() &&
        target.getMonth() === tomorrow.getMonth() &&
        target.getDate() === tomorrow.getDate()
    );
}


function getDayLabel(date) {
    if (!date) return "";

    if (isToday(date)) {
        return "сегодня";
    }

    if (isTomorrow(date)) {
        return "завтра";
    }

    return new Intl.DateTimeFormat(
        "ru-RU",
        {
            weekday: "long"
        }
    ).format(new Date(date));
}


function getFile(path) {
    return path
        ? publicFile(path)
        : "";
}


function emptyState(text = "Пока ничего нет") {
    return `
        <div class="empty-state">
            ${escapeHtml(text)}
        </div>
    `;
}


// ============================================================
// INIT
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    init
);


async function init() {

    if (!db) {
        console.error(
            "Supabase client не найден."
        );

        return;
    }

    setupMenu();
    setupStatsTabs();
    setupStoryViewer();

    try {

        const settings =
            await getSettings();

        applySettings(settings);

        renderSettings(settings);

        await Promise.all([
            loadNews(),
            loadStories(),
            loadNextMatch(),
            loadMatches(),
            loadCompetition(),
            loadStats("scorers"),
            loadLeaders(),
            loadAlbums()
        ]);

    } catch (error) {

        console.error(
            "Ошибка запуска сайта:",
            error
        );

    }
}


// ============================================================
// SETTINGS
// ============================================================

function renderSettings(settings) {

    const logo = $("#siteLogo");

    if (logo) {

        if (settings.logo_path) {

            logo.src =
                getFile(settings.logo_path);

            logo.style.display = "block";

        } else {

            logo.style.display = "none";
        }
    }


    const teamName =
        $("#teamName");

    if (teamName) {
        teamName.textContent =
            settings.team_name ||
            "Челны 2011";
    }


    const subtitle =
        $("#teamSubtitle");

    if (subtitle) {
        subtitle.textContent =
            settings.subtitle ||
            "хоккейный клуб";
    }


    const footerName =
        $("#footerTeamName");

    if (footerName) {
        footerName.textContent =
            settings.team_name ||
            "Челны 2011";
    }


    const footerCity =
        $("#footerCity");

    if (footerCity) {
        footerCity.textContent =
            settings.city ||
            "Набережные Челны";
    }


    document.title =
        settings.team_name ||
        "Челны 2011";
}


// ============================================================
// MENU
// ============================================================

function setupMenu() {

    const button =
        $("#menuButton");

    const menu =
        $("#mobileMenu");

    const close =
        $("#menuClose");

    if (!button || !menu) {
        return;
    }


    function openMenu() {

        menu.classList.add("open");

        document.body.classList.add(
            "menu-open"
        );
    }


    function closeMenu() {

        menu.classList.remove("open");

        document.body.classList.remove(
            "menu-open"
        );
    }


    button.addEventListener(
        "click",
        openMenu
    );


    close?.addEventListener(
        "click",
        closeMenu
    );


    menu.addEventListener(
        "click",
        (event) => {

            if (
                event.target === menu
            ) {
                closeMenu();
            }

        }
    );


    $$("#mobileMenu nav a")
        .forEach(link => {

            link.addEventListener(
                "click",
                closeMenu
            );

        });
}


// ============================================================
// NEWS
// ============================================================

async function loadNews() {

    const container =
        $("#newsList");

    if (!container) return;

    container.innerHTML =
        `<div class="loading">Загрузка...</div>`;


    const {
        data,
        error
    } = await db
        .from("news")
        .select("*")
        .order(
            "published_at",
            {
                ascending: false
            }
        )
        .limit(10);


    if (error) {

        console.error(
            "Ошибка новостей:",
            error
        );

        container.innerHTML =
            emptyState(
                "Не удалось загрузить новости"
            );

        return;
    }


    if (!data?.length) {

        container.innerHTML =
            emptyState(
                "Новостей пока нет"
            );

        return;
    }


    container.innerHTML =
        data.map(news => {

            const image =
                getFile(
                    news.image_path
                );

            return `
                <article
                    class="news-card"
                    data-news-id="${news.id}"
                >

                    ${
                        image
                            ? `
                                <img
                                    src="${escapeHtml(image)}"
                                    alt="${escapeHtml(news.title)}"
                                    loading="lazy"
                                >
                            `
                            : ""
                    }

                    <div class="news-card-content">

                        <span class="news-card-tag">
                            ${escapeHtml(news.tag || "Новости")}
                        </span>

                        <h3>
                            ${escapeHtml(news.title)}
                        </h3>

                    </div>

                </article>
            `;

        }).join("");


    $$(".news-card")
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    const id =
                        card.dataset.newsId;

                    openNews(id);

                }
            );

        });
}


// ============================================================
// OPEN NEWS
// ============================================================

async function openNews(id) {

    const {
        data,
        error
    } = await db
        .from("news")
        .select("*")
        .eq("id", id)
        .single();


    if (error || !data) {

        console.error(
            "Ошибка новости:",
            error
        );

        return;
    }


    const image =
        getFile(data.image_path);


    const overlay =
        document.createElement("div");

    overlay.className =
        "content-viewer";


    overlay.innerHTML = `
        <div class="content-viewer-inner">

            <button
                class="content-viewer-close"
                type="button"
            >
                ×
            </button>

            ${
                image
                    ? `
                        <img
                            class="content-viewer-image"
                            src="${escapeHtml(image)}"
                            alt=""
                        >
                    `
                    : ""
            }

            <div class="content-viewer-content">

                <div class="content-viewer-tag">
                    ${escapeHtml(data.tag || "Новости")}
                </div>

                <div class="content-viewer-date">

                    ${formatDate(data.published_at)}
                    ${data.published_at
                        ? ` · ${formatTime(data.published_at)}`
                        : ""
                    }

                </div>

                <h1>
                    ${escapeHtml(data.title)}
                </h1>

                <div class="content-viewer-text">
                    ${escapeHtml(data.text)
                        .replace(/\n/g, "<br>")}
                </div>

            </div>

        </div>
    `;


    document.body.appendChild(
        overlay
    );


    requestAnimationFrame(() => {

        overlay.classList.add(
            "open"
        );

    });


    const close =
        overlay.querySelector(
            ".content-viewer-close"
        );


    close.addEventListener(
        "click",
        () => closeViewer(overlay)
    );


    overlay.addEventListener(
        "click",
        event => {

            if (
                event.target === overlay
            ) {
                closeViewer(overlay);
            }

        }
    );


    document.body.classList.add(
        "menu-open"
    );
}


function closeViewer(element) {

    element.classList.remove(
        "open"
    );

    setTimeout(
        () => element.remove(),
        200
    );

    document.body.classList.remove(
        "menu-open"
    );
}


// ============================================================
// STORIES
// ============================================================

let storiesData = [];

let storyTimer = null;


async function loadStories() {

    const container =
        $("#storiesList");

    if (!container) return;


    const {
        data,
        error
    } = await db
        .from("stories")
        .select("*")
        .gt(
            "expires_at",
            new Date().toISOString()
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "Ошибка stories:",
            error
        );

        return;
    }


    storiesData =
        data || [];


    if (!storiesData.length) {

        container.innerHTML = "";

        return;
    }


    container.innerHTML =
        storiesData.map(
            story => {

                const image =
                    getFile(
                        story.image_path
                    );

                return `
                    <div
                        class="story-card"
                        data-story-id="${story.id}"
                    >

                        <div class="story-card-inner">

                            <img
                                src="${escapeHtml(image)}"
                                alt="История"
                                loading="lazy"
                            >

                        </div>

                    </div>
                `;

            }
        ).join("");


    $$(".story-card")
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    openStory(
                        card.dataset.storyId
                    );

                }
            );

        });
}


// ============================================================
// STORY VIEWER
// ============================================================

function setupStoryViewer() {

    const viewer =
        $("#storyViewer");

    const close =
        $("#storyViewerClose");

    if (!viewer) return;


    close?.addEventListener(
        "click",
        closeStory
    );


    viewer.addEventListener(
        "click",
        event => {

            if (
                event.target === viewer ||
                event.target.id ===
                    "storyViewerImage"
            ) {

                closeStory();

            }

        }
    );
}


function openStory(id) {

    const story =
        storiesData.find(
            item => item.id === id
        );


    if (!story) return;


    const viewer =
        $("#storyViewer");

    const image =
        $("#storyViewerImage");


    image.src =
        getFile(
            story.image_path
        );


    viewer.classList.add(
        "open"
    );


    clearTimeout(
        storyTimer
    );


    storyTimer =
        setTimeout(
            closeStory,
            15000
        );
}


function closeStory() {

    const viewer =
        $("#storyViewer");

    if (!viewer) return;


    viewer.classList.remove(
        "open"
    );


    clearTimeout(
        storyTimer
    );
}


// ============================================================
// NEXT MATCH
// ============================================================

async function loadNextMatch() {

    const container =
        $("#nextMatch");

    const dateElement =
        $("#matchdayDate");

    if (!container) return;


    const {
        data,
        error
    } = await db
        .from("matches")
        .select(`
            *,
            home:clubs!matches_home_club_id_fkey(*),
            away:clubs!matches_away_club_id_fkey(*)
        `)
        .gte(
            "match_date",
            new Date().toISOString()
        )
        .order(
            "match_date",
            {
                ascending: true
            }
        )
        .limit(1)
        .maybeSingle();


    if (error) {

        console.error(
            "Ошибка ближайшего матча:",
            error
        );

        container.innerHTML =
            emptyState(
                "Не удалось загрузить матч"
            );

        return;
    }


    if (!data) {

        container.innerHTML =
            emptyState(
                "Ближайших матчей нет"
            );

        if (dateElement) {
            dateElement.textContent =
                "—";
        }

        return;
    }


    if (dateElement) {

        dateElement.textContent =
            getDayLabel(
                data.match_date
            );
    }


    container.innerHTML =
        renderMatchCard(
            data
        );
}


// ============================================================
// MATCH CARD
// ============================================================

function renderMatchCard(match) {

    const home =
        match.home || {};

    const away =
        match.away || {};


    const homeLogo =
        getFile(
            home.logo_path
        );

    const awayLogo =
        getFile(
            away.logo_path
        );


    return `
        <div class="match-card-inner">

            <div class="match-card-meta">

                <span>
                    ${escapeHtml(
                        match.competition || ""
                    )}
                </span>

                <span>
                    ${formatDate(
                        match.match_date
                    )}
                    ·
                    ${formatTime(
                        match.match_date
                    )}
                </span>

            </div>


            <div class="match-card-teams">

                <div class="match-team">

                    <div class="match-team-logo">

                        ${
                            homeLogo
                                ? `
                                    <img
                                        src="${escapeHtml(homeLogo)}"
                                        alt=""
                                    >
                                `
                                : ""
                        }

                    </div>

                    <div class="match-team-name">
                        ${escapeHtml(
                            home.name || "—"
                        )}
                    </div>

                </div>


                <div class="match-vs">
                    VS
                </div>


                <div class="match-team">

                    <div class="match-team-logo">

                        ${
                            awayLogo
                                ? `
                                    <img
                                        src="${escapeHtml(awayLogo)}"
                                        alt=""
                                    >
                                `
                                : ""
                        }

                    </div>

                    <div class="match-team-name">
                        ${escapeHtml(
                            away.name || "—"
                        )}
                    </div>

                </div>

            </div>


            <div class="match-card-bottom">

                ${
                    match.venue
                        ? `
                            ${escapeHtml(match.venue)}
                        `
                        : "Место проведения уточняется"
                }

            </div>

        </div>
    `;
}


// ============================================================
// ALL MATCHES
// ============================================================

async function loadMatches() {

    const container =
        $("#matchesList");

    if (!container) return;


    const {
        data,
        error
    } = await db
        .from("matches")
        .select(`
            *,
            home:clubs!matches_home_club_id_fkey(*),
            away:clubs!matches_away_club_id_fkey(*)
        `)
        .order(
            "match_date",
            {
                ascending: false
            }
        )
        .limit(30);


    if (error) {

        console.error(
            "Ошибка матчей:",
            error
        );

        container.innerHTML =
            emptyState(
                "Не удалось загрузить матчи"
            );

        return;
    }


    if (!data?.length) {

        container.innerHTML =
            emptyState(
                "Матчей пока нет"
            );

        return;
    }


    container.innerHTML =
        data.map(
            match => {

                const home =
                    match.home || {};

                const away =
                    match.away || {};


                const finished =
                    match.status === "finished";


                const live =
                    match.status === "live";


                let score =
                    "—";


                if (
                    finished ||
                    live
                ) {

                    score =
                        `${match.home_score ?? 0} : ${match.away_score ?? 0}`;

                }


                let status =
                    "Запланирован";


                if (live) {
                    status = "Идёт";
                }

                if (finished) {
                    status = "Завершён";
                }


                return `
                    <article class="match-row">

                        <div class="match-row-date">

                            ${formatShortDate(
                                match.match_date
                            )}

                            <br>

                            ${formatTime(
                                match.match_date
                            )}

                        </div>


                        <div class="match-row-team">

                            ${escapeHtml(
                                home.name || "—"
                            )}

                        </div>


                        <div class="match-row-score">
                            ${score}
                        </div>


                        <div class="match-row-team match-row-away">

                            ${escapeHtml(
                                away.name || "—"
                            )}

                        </div>


                        <div class="match-row-status">

                            ${status}

                            ${
                                match.venue
                                    ? ` · ${escapeHtml(match.venue)}`
                                    : ""
                            }

                        </div>

                    </article>
                `;

            }
        ).join("");
}


// ============================================================
// COMPETITION
// ============================================================

async function loadCompetition() {

    await loadStandings();

    await loadLastThreeMatches();
}


// ============================================================
// STANDINGS
// ============================================================

async function loadStandings() {

    const container =
        $("#standingsBody");

    if (!container) return;


    const {
        data,
        error
    } = await db
        .from("standings")
        .select("*")
        .order(
            "place",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Ошибка таблицы:",
            error
        );

        return;
    }


    if (!data?.length) {

        container.innerHTML =
            `
                <tr>
                    <td colspan="10">
                        Таблица пока не заполнена
                    </td>
                </tr>
            `;

        return;
    }


    container.innerHTML =
        data.map(
            row => {

                return `
                    <tr>

                        <td>
                            ${row.place ?? "—"}
                        </td>

                        <td>
                            ${escapeHtml(
                                row.team_name
                            )}
                        </td>

                        <td>
                            ${row.games ?? 0}
                        </td>

                        <td>
                            ${row.wins ?? 0}
                        </td>

                        <td>
                            ${row.overtime_wins ?? 0}
                        </td>

                        <td>
                            ${row.shootout_wins ?? 0}
                        </td>

                        <td>
                            ${row.losses ?? 0}
                        </td>

                        <td>
                            ${row.overtime_losses ?? 0}
                        </td>

                        <td>
                            ${row.shootout_losses ?? 0}
                        </td>

                        <td>
                            ${row.points ?? 0}
                        </td>

                    </tr>
                `;

            }
        ).join("");
}


// ============================================================
// LAST 3 MATCHES
// ============================================================

async function loadLastThreeMatches() {

    const container =
        $("#lastMatches");

    if (!container) return;


    const {
        data,
        error
    } = await db
        .from("matches")
        .select(`
            *,
            home:clubs!matches_home_club_id_fkey(*),
            away:clubs!matches_away_club_id_fkey(*)
        `)
        .eq(
            "status",
            "finished"
        )
        .order(
            "match_date",
            {
                ascending: false
            }
        )
        .limit(3);


    if (error) {

        console.error(
            "Ошибка последних матчей:",
            error
        );

        return;
    }


    if (!data?.length) {

        container.innerHTML = "";

        return;
    }


    container.innerHTML =
        data.map(
            match => {

                const home =
                    match.home || {};

                const away =
                    match.away || {};


                return `
                    <div class="last-match">

                        <div class="last-match-date">
                            ${formatShortDate(
                                match.match_date
                            )}
                        </div>

                        <div class="last-match-score">
                            ${match.home_score ?? 0}
                            :
                            ${match.away_score ?? 0}
                        </div>

                        <div class="last-match-teams">

                            ${escapeHtml(
                                home.name || "—"
                            )}

                            <br>

                            ${escapeHtml(
                                away.name || "—"
                            )}

                        </div>

                    </div>
                `;

            }
        ).join("");
}


// ============================================================
// STATS TABS
// ============================================================

function setupStatsTabs() {

    const tabs =
        $$("#statsTabs button");


    tabs.forEach(
        tab => {

            tab.addEventListener(
                "click",
                async () => {

                    tabs.forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );

                    tab.classList.add(
                        "active"
                    );


                    await loadStats(
                        tab.dataset.statType
                    );

                }
            );

        }
    );
}


// ============================================================
// PLAYER STATS
// ============================================================

async function loadStats(type) {

    const container =
        $("#statsList");

    if (!container) return;


    container.innerHTML =
        `<div class="loading">Загрузка...</div>`;


    const {
        data,
        error
    } = await db
        .from("player_stats")
        .select("*")
        .eq(
            "stat_type",
            type
        )
        .order(
            "value",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "Ошибка статистики:",
            error
        );

        container.innerHTML =
            emptyState(
                "Не удалось загрузить статистику"
            );

        return;
    }


    if (!data?.length) {

        container.innerHTML =
            emptyState(
                "Статистика пока не заполнена"
            );

        return;
    }


    container.innerHTML =
        data.map(
            (player, index) => {

                return `
                    <div class="stat-row">

                        <div class="stat-number">
                            ${index + 1}
                        </div>


                        <div>

                            <div class="stat-player">
                                ${escapeHtml(
                                    player.player_name
                                )}
                            </div>

                            ${
                                player.position
                                    ? `
                                        <div class="stat-position">
                                            ${escapeHtml(
                                                player.position
                                            )}
                                        </div>
                                    `
                                    : ""
                            }

                        </div>


                        <div class="stat-value">

                            ${
                                type === "plus_minus" &&
                                Number(player.value) > 0
                                    ? "+"
                                    : ""
                            }

                            ${player.value ?? 0}

                        </div>

                    </div>
                `;

            }
        ).join("");
}


// ============================================================
// TEAM LEADERS
// ============================================================

async function loadLeaders() {

    const container =
        $("#leadersList");

    if (!container) return;


    const {
        data,
        error
    } = await db
        .from("team_leaders")
        .select("*")
        .order(
            "created_at",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Ошибка лидеров:",
            error
        );

        container.innerHTML =
            emptyState(
                "Не удалось загрузить лидеров"
            );

        return;
    }


    if (!data?.length) {

        container.innerHTML =
            emptyState(
                "Лидеры пока не заполнены"
            );

        return;
    }


    const typeNames = {

        scorer:
            "Бомбардир",

        sniper:
            "Снайпер",

        defender:
            "Бомбардир-защитник",

        plus_minus:
            "Плюс/минус"

    };


    container.innerHTML =
        data.map(
            leader => {

                const image =
                    getFile(
                        leader.image_path
                    );


                return `
                    <article
                        class="leader-card"
                    >

                        <div class="leader-type">

                            ${escapeHtml(
                                typeNames[
                                    leader.leader_type
                                ] ||
                                leader.leader_type
                            )}

                        </div>


                        <div class="leader-number">

                            ${leader.player_number ?? ""}

                        </div>


                        ${
                            image
                                ? `
                                    <div class="leader-player-image">

                                        <img
                                            src="${escapeHtml(image)}"
                                            alt="${escapeHtml(leader.player_name)}"
                                            loading="lazy"
                                        >

                                    </div>
                                `
                                : ""
                        }


                        <div class="leader-info">

                            <div class="leader-position">

                                ${escapeHtml(
                                    leader.position || ""
                                )}

                            </div>


                            <div class="leader-name">

                                ${escapeHtml(
                                    leader.player_name
                                )}

                            </div>


                            <div class="leader-stat">

                                <div class="leader-stat-value">

                                    ${escapeHtml(
                                        leader.statistic ?? ""
                                    )}

                                </div>

                                <div class="leader-stat-label">

                                    Статистика

                                </div>

                            </div>

                        </div>

                    </article>
                `;

            }
        ).join("");
}


// ============================================================
// ALBUMS
// ============================================================

async function loadAlbums() {

    const container =
        $("#albumsList");

    if (!container) return;


    const {
        data,
        error
    } = await db
        .from("albums")
        .select("*")
        .order(
            "album_date",
            {
                ascending: false
            }
        )
        .limit(20);


    if (error) {

        console.error(
            "Ошибка альбомов:",
            error
        );

        container.innerHTML =
            emptyState(
                "Не удалось загрузить альбомы"
            );

        return;
    }


    if (!data?.length) {

        container.innerHTML =
            emptyState(
                "Альбомов пока нет"
            );

        return;
    }


    container.innerHTML =
        data.map(
            album => {

                const image =
                    getFile(
                        album.cover_path
                    );


                return `
                    <article
                        class="album-card"
                        data-album-id="${album.id}"
                    >

                        ${
                            image
                                ? `
                                    <img
                                        src="${escapeHtml(image)}"
                                        alt="${escapeHtml(album.title)}"
                                        loading="lazy"
                                    >
                                `
                                : ""
                        }


                        <div class="album-info">

                            ${
                                album.album_date
                                    ? `
                                        <div class="album-date">
                                            ${formatDate(
                                                album.album_date
                                            )}
                                        </div>
                                    `
                                    : ""
                            }


                            <div class="album-title">

                                ${escapeHtml(
                                    album.title
                                )}

                            </div>

                        </div>

                    </article>
                `;

            }
        ).join("");


    $$(".album-card")
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    openAlbum(
                        card.dataset.albumId
                    );

                }
            );

        });
}


// ============================================================
// ALBUM VIEWER
// ============================================================

async function openAlbum(id) {

    const {
        data: album,
        error: albumError
    } = await db
        .from("albums")
        .select("*")
        .eq(
            "id",
            id
        )
        .single();


    if (albumError || !album) {

        console.error(
            "Ошибка альбома:",
            albumError
        );

        return;
    }


    const {
        data: photos,
        error: photosError
    } = await db
        .from("album_photos")
        .select("*")
        .eq(
            "album_id",
            id
        )
        .order(
            "sort_order",
            {
                ascending: true
            }
        );


    if (photosError) {

        console.error(
            "Ошибка фотографий:",
            photosError
        );

        return;
    }


    const viewer =
        document.createElement("div");

    viewer.className =
        "album-viewer";


    viewer.innerHTML = `

        <button
            class="album-viewer-close"
            type="button"
        >
            ×
        </button>


        <div class="album-viewer-grid">

            ${
                (photos || [])
                    .map(
                        photo => `
                            <img
                                src="${escapeHtml(
                                    getFile(
                                        photo.image_path
                                    )
                                )}"
                                alt="${escapeHtml(
                                    album.title
                                )}"
                                loading="lazy"
                            >
                        `
                    )
                    .join("")
            }

        </div>

    `;


    document.body.appendChild(
        viewer
    );


    requestAnimationFrame(() => {

        viewer.classList.add(
            "open"
        );

    });


    viewer
        .querySelector(
            ".album-viewer-close"
        )
        .addEventListener(
            "click",
            () => {

                viewer.classList.remove(
                    "open"
                );

                setTimeout(
                    () => viewer.remove(),
                    200
                );

            }
        );
}


// ============================================================
// ДОПОЛНИТЕЛЬНЫЕ СТИЛИ ДЛЯ ОКНА НОВОСТИ
// ============================================================

const dynamicStyles =
    document.createElement("style");


dynamicStyles.textContent = `

.content-viewer {
    position: fixed;
    inset: 0;

    z-index: 5000;

    overflow-y: auto;

    padding: 20px;

    background: rgba(3,3,20,.96);

    visibility: hidden;
    opacity: 0;

    pointer-events: none;

    transition:
        opacity 200ms ease,
        visibility 200ms ease;
}

.content-viewer.open {
    visibility: visible;
    opacity: 1;

    pointer-events: auto;
}

.content-viewer-inner {
    position: relative;

    width: min(
        100%,
        900px
    );

    min-height: 100%;

    margin: 0 auto;

    padding-top: 35px;
    padding-bottom: 60px;
}

.content-viewer-image {
    width: 100%;

    max-height: 65vh;

    object-fit: cover;

    border-radius: 24px;

    margin-bottom: 25px;
}

.content-viewer-close {
    position: fixed;

    z-index: 10;

    top: 18px;
    right: 18px;

    width: 45px;
    height: 45px;

    border-radius: 50%;

    background: rgba(255,255,255,.14);

    color: white;

    font-size: 25px;
}

.content-viewer-content {
    padding: 0 5px;

    color: white;
}

.content-viewer-tag {
    display: inline-block;

    margin-bottom: 9px;

    padding: 6px 9px;

    border-radius: 7px;

    background: var(--gold);

    color: var(--primary);

    font-size: 8px;
    font-weight: 900;

    text-transform: uppercase;
}

.content-viewer-date {
    margin-bottom: 13px;

    color: rgba(255,255,255,.48);

    font-size: 9px;
}

.content-viewer-content h1 {
    margin-bottom: 22px;

    color: white;

    font-size: clamp(
        30px,
        7vw,
        56px
    );

    line-height: .98;

    letter-spacing: -.05em;
}

.content-viewer-text {
    color: rgba(255,255,255,.78);

    font-size: 14px;

    line-height: 1.65;
}

@media (min-width: 700px) {

    .content-viewer {
        padding: 40px;
    }

    .content-viewer-inner {
        padding-top: 20px;
    }

}

`;

document.head.appendChild(
    dynamicStyles
);
