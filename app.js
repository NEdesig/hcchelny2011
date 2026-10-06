/* =========================================================
   ХК ЧЕЛНЫ 2011
   ОСНОВНОЙ JAVASCRIPT САЙТА
   ========================================================= */

const SUPABASE_URL = "https://jxlbojosxaaqnyuzohnw.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_wNNvPktjjKpz3csoDMo3JA_4duyLAzL";

const STORAGE_BUCKET = "site-media";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


/* =========================================================
   СОСТОЯНИЕ
   ========================================================= */

const state = {
    settings: {},
    news: [],
    stories: [],
    matches: [],
    clubs: [],
    standings: [],
    playerStats: [],
    leaders: [],
    albums: [],
    currentNewsIndex: 0,
    currentStoryIndex: 0,
    currentLeaderIndex: 0,
    currentStatsIndex: 0
};


/* =========================================================
   УТИЛИТЫ
   ========================================================= */

function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function escapeHTML(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(date) {
    if (!date) return "";

    return new Date(date).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function formatDateLong(date) {
    if (!date) return "";

    return new Date(date).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function formatTime(date) {
    if (!date) return "";

    return new Date(date).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getImage(url, fallback = "") {
    return url || fallback;
}


/* =========================================================
   ЗАГРУЗКА НАСТРОЕК
   ========================================================= */

async function loadSettings() {
    const { data, error } = await supabaseClient
        .from("site_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("Ошибка настроек:", error);
        return;
    }

    state.settings = data || {};

    applySettings();
}


function applySettings() {
    const root = document.documentElement;

    if (state.settings.primary_color) {
        root.style.setProperty(
            "--primary",
            state.settings.primary_color
        );
    }

    if (state.settings.primary_dark) {
        root.style.setProperty(
            "--primary-dark",
            state.settings.primary_dark
        );
    }

    if (state.settings.primary_light) {
        root.style.setProperty(
            "--primary-light",
            state.settings.primary_light
        );
    }

    if (state.settings.accent_color) {
        root.style.setProperty(
            "--accent",
            state.settings.accent_color
        );
    }

    if (state.settings.background_color) {
        root.style.setProperty(
            "--background",
            state.settings.background_color
        );
    }

    if (state.settings.surface_color) {
        root.style.setProperty(
            "--surface",
            state.settings.surface_color
        );
    }

    if (state.settings.text_color) {
        root.style.setProperty(
            "--text",
            state.settings.text_color
        );
    }

    if (state.settings.logo_url) {
        const logos = $$(".header-logo img");

        logos.forEach(img => {
            img.src = state.settings.logo_url;
        });
    }

    const teamName = $(".header-brand-title");

    if (teamName && state.settings.team_name) {
        teamName.textContent = state.settings.team_name;
    }

    const subtitle = $(".header-brand-subtitle");

    if (subtitle && state.settings.team_subtitle) {
        subtitle.textContent = state.settings.team_subtitle;
    }
}


/* =========================================================
   НОВОСТИ
   ========================================================= */

async function loadNews() {
    const { data, error } = await supabaseClient
        .from("news")
        .select("*")
        .eq("published", true)
        .order("published_at", {
            ascending: false
        });

    if (error) {
        console.error("Новости:", error);
        return;
    }

    state.news = data || [];

    renderNews();
}


function renderNews() {
    const slider = $(".news-slider");

    if (!slider) return;

    if (!state.news.length) {
        slider.innerHTML = `
            <div class="empty-state">
                Новостей пока нет
            </div>
        `;
        return;
    }

    slider.innerHTML = state.news.map((item, index) => `
        <article
            class="news-card ${index === 0 ? "active" : ""}"
            data-index="${index}"
            onclick="openNews(${index})"
        >
            <img
                src="${escapeHTML(item.image_url || "")}"
                alt=""
            >

            <div class="news-card-overlay"></div>

            <div class="news-card-content">

                <span class="news-tag">
                    ${escapeHTML(item.tag || "Новости")}
                </span>

                <h2>
                    ${escapeHTML(item.title)}
                </h2>

            </div>
        </article>
    `).join("");

    updateNewsSlider();
}


function updateNewsSlider() {
    const cards = $$(".news-card");

    cards.forEach((card, index) => {
        card.classList.toggle(
            "active",
            index === state.currentNewsIndex
        );
    });
}


function nextNews() {
    if (!state.news.length) return;

    state.currentNewsIndex =
        (state.currentNewsIndex + 1) %
        state.news.length;

    updateNewsSlider();
}


function prevNews() {
    if (!state.news.length) return;

    state.currentNewsIndex =
        (state.currentNewsIndex - 1 + state.news.length) %
        state.news.length;

    updateNewsSlider();
}


window.nextNews = nextNews;
window.prevNews = prevNews;


function openNews(index) {
    const item = state.news[index];

    if (!item) return;

    const modal = $("#news-modal");

    if (!modal) return;

    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeModal()"></div>

        <div class="news-modal-content">

            <button
                class="modal-close"
                onclick="closeModal()"
            >
                ×
            </button>

            <img
                src="${escapeHTML(item.image_url || "")}"
                alt=""
                class="news-modal-image"
            >

            <div class="news-modal-body">

                <span class="news-tag">
                    ${escapeHTML(item.tag || "Новости")}
                </span>

                <div class="news-modal-date">
                    ${formatDateLong(item.published_at)}
                    ${formatTime(item.published_at)}
                </div>

                <h1>
                    ${escapeHTML(item.title)}
                </h1>

                <div class="news-modal-text">
                    ${formatText(item.content)}
                </div>

            </div>
        </div>
    `;

    modal.classList.add("active");
    document.body.classList.add("no-scroll");
}


window.openNews = openNews;


function formatText(text) {
    if (!text) return "";

    return escapeHTML(text)
        .split("\n")
        .map(line => `<p>${line}</p>`)
        .join("");
}


/* =========================================================
   ИСТОРИИ
   ========================================================= */

async function loadStories() {
    const { data, error } = await supabaseClient
        .from("stories")
        .select("*")
        .eq("published", true)
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error("Истории:", error);
        return;
    }

    state.stories = data || [];

    renderStories();
}


function renderStories() {
    const container = $(".stories-slider");

    if (!container) return;

    container.innerHTML = state.stories.map((story, index) => `
        <article
            class="story-card"
            onclick="openStory(${index})"
        >
            <img
                src="${escapeHTML(story.image_url || "")}"
                alt=""
            >

            <div class="story-card-overlay"></div>

            <span class="story-tag">
                ${escapeHTML(story.title || "История")}
            </span>
        </article>
    `).join("");
}


function openStory(index) {
    const story = state.stories[index];

    if (!story) return;

    const viewer = $("#story-viewer");

    if (!viewer) return;

    viewer.innerHTML = `
        <div
            class="story-viewer-background"
            onclick="closeStory()"
        ></div>

        <div class="story-viewer-content">

            <img
                src="${escapeHTML(story.image_url || "")}"
                alt=""
            >

            <div class="story-progress">
                <div class="story-progress-bar"></div>
            </div>

        </div>
    `;

    viewer.classList.add("active");
    document.body.classList.add("no-scroll");

    const progress = viewer.querySelector(
        ".story-progress-bar"
    );

    progress.style.animation =
        "storyProgress 15s linear forwards";

    window.storyTimeout = setTimeout(() => {
        closeStory();
    }, 15000);
}


window.openStory = openStory;


function closeStory() {
    const viewer = $("#story-viewer");

    if (!viewer) return;

    viewer.classList.remove("active");

    document.body.classList.remove("no-scroll");

    if (window.storyTimeout) {
        clearTimeout(window.storyTimeout);
    }
}


window.closeStory = closeStory;


/* =========================================================
   МАТЧИ
   ========================================================= */

async function loadMatches() {
    const { data, error } = await supabaseClient
        .from("matches")
        .select(`
            *,
            home_club:clubs!matches_home_club_id_fkey(*),
            away_club:clubs!matches_away_club_id_fkey(*)
        `)
        .order("date", {
            ascending: true
        });

    if (error) {
        console.error("Матчи:", error);
        return;
    }

    state.matches = data || [];

    renderNearestMatch();
    renderAllMatches();
}


function renderNearestMatch() {
    const container = $(".nearest-match");

    if (!container) return;

    const now = new Date();

    const upcoming = state.matches
        .filter(match => {
            return new Date(match.date) >= now &&
                match.status !== "finished";
        })
        .sort(
            (a, b) =>
                new Date(a.date) - new Date(b.date)
        )[0];

    if (!upcoming) {
        container.innerHTML = `
            <div class="empty-state">
                Ближайших матчей нет
            </div>
        `;

        return;
    }

    renderMatchCard(container, upcoming);
}


function renderMatchCard(container, match) {
    const home = match.home_club;
    const away = match.away_club;

    const isFinished =
        match.status === "finished";

    const isLive =
        match.status === "live";

    container.innerHTML = `
        <div class="match-card">

            <div class="match-competition">
                ${escapeHTML(
                    match.competition || ""
                )}
            </div>

            <div class="match-date">
                ${formatDateLong(match.date)}
                ·
                ${formatTime(match.date)}
            </div>

            <div class="match-teams">

                <div class="match-team">

                    <img
                        src="${escapeHTML(
                            home?.logo_url || ""
                        )}"
                        alt=""
                    >

                    <strong>
                        ${escapeHTML(
                            home?.name || ""
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            home?.city || ""
                        )}
                    </span>

                </div>


                <div class="match-score">

                    ${
                        isFinished || isLive
                        ?
                        `<strong>
                            ${match.home_score ?? 0}
                            :
                            ${match.away_score ?? 0}
                        </strong>`
                        :
                        `<strong>VS</strong>`
                    }

                    ${
                        isLive
                        ?
                        `<span class="live-status">
                            ИДЁТ
                        </span>`
                        :
                        ""
                    }

                </div>


                <div class="match-team">

                    <img
                        src="${escapeHTML(
                            away?.logo_url || ""
                        )}"
                        alt=""
                    >

                    <strong>
                        ${escapeHTML(
                            away?.name || ""
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            away?.city || ""
                        )}
                    </span>

                </div>

            </div>

            <button
                class="match-button"
                onclick="openMatch(${match.id})"
            >
                ${
                    isFinished
                    ? "Обзор матча"
                    : "Подробнее"
                }
            </button>

        </div>
    `;
}


function renderAllMatches() {
    const container = $(".matches-list");

    if (!container) return;

    container.innerHTML = state.matches.map(match => {

        const home = match.home_club;
        const away = match.away_club;

        return `
            <article class="match-list-item">

                <div>
                    ${formatDateLong(match.date)}
                    <small>
                        ${formatTime(match.date)}
                    </small>
                </div>

                <div class="match-list-team">
                    <img src="${escapeHTML(
                        home?.logo_url || ""
                    )}">
                    ${escapeHTML(
                        home?.name || ""
                    )}
                </div>

                <strong>
                    ${
                        match.status === "finished"
                        ?
                        `${match.home_score}:${match.away_score}`
                        :
                        "—"
                    }
                </strong>

                <div class="match-list-team">
                    ${escapeHTML(
                        away?.name || ""
                    )}
                    <img src="${escapeHTML(
                        away?.logo_url || ""
                    )}">
                </div>

            </article>
        `;
    }).join("");
}


async function openMatch(matchId) {
    const { data, error } = await supabaseClient
        .from("matches")
        .select(`
            *,
            home_club:clubs!matches_home_club_id_fkey(*),
            away_club:clubs!matches_away_club_id_fkey(*)
        `)
        .eq("id", matchId)
        .single();

    if (error) {
        console.error(error);
        return;
    }

    const modal = $("#match-modal");

    if (!modal) return;

    modal.innerHTML = `
        <div
            class="modal-overlay"
            onclick="closeModal()"
        ></div>

        <div class="match-modal-content">

            <button
                class="modal-close"
                onclick="closeModal()"
            >
                ×
            </button>

            <div class="match-modal-competition">
                ${escapeHTML(
                    data.competition || ""
                )}
            </div>

            <div class="match-modal-date">
                ${formatDateLong(data.date)}
                ·
                ${formatTime(data.date)}
            </div>

            <div class="match-modal-teams">

                <div>
                    <img src="${escapeHTML(
                        data.home_club?.logo_url || ""
                    )}">

                    <h2>
                        ${escapeHTML(
                            data.home_club?.name || ""
                        )}
                    </h2>
                </div>

                <strong>
                    ${data.home_score ?? 0}
                    :
                    ${data.away_score ?? 0}
                </strong>

                <div>
                    <img src="${escapeHTML(
                        data.away_club?.logo_url || ""
                    )}">

                    <h2>
                        ${escapeHTML(
                            data.away_club?.name || ""
                        )}
                    </h2>
                </div>

            </div>

            ${
                data.venue
                ?
                `<div class="match-venue">
                    ${escapeHTML(data.venue)}
                </div>`
                :
                ""
            }

        </div>
    `;

    modal.classList.add("active");
    document.body.classList.add("no-scroll");
}


window.openMatch = openMatch;


/* =========================================================
   ТАБЛИЦА
   ========================================================= */

async function loadStandings() {
    const { data, error } = await supabaseClient
        .from("standings")
        .select("*")
        .order("place", {
            ascending: true
        });

    if (error) {
        console.error("Таблица:", error);
        return;
    }

    state.standings = data || [];

    renderStandings();
}


function renderStandings() {
    const table = $(".standings-table");

    if (!table) return;

    table.innerHTML = `
        <div class="standings-head">
            <span>Место</span>
            <span>Команда</span>
            <span>И</span>
            <span>В</span>
            <span>ВО</span>
            <span>ВБ</span>
            <span>ПО</span>
            <span>ПБ</span>
            <span>П</span>
            <span>О</span>
        </div>

        ${state.standings.map(row => `
            <div class="standings-row">

                <span>${row.place}</span>

                <span>
                    <img
                        src="${escapeHTML(
                            row.logo_url || ""
                        )}"
                    >

                    ${escapeHTML(
                        row.team_name || ""
                    )}
                </span>

                <span>${row.games ?? 0}</span>
                <span>${row.wins ?? 0}</span>
                <span>${row.wins_ot ?? 0}</span>
                <span>${row.wins_so ?? 0}</span>
                <span>${row.losses_ot ?? 0}</span>
                <span>${row.losses_so ?? 0}</span>
                <span>${row.losses ?? 0}</span>
                <strong>${row.points ?? 0}</strong>

            </div>
        `).join("")}
    `;
}


/* =========================================================
   СТАТИСТИКА ИГРОКОВ
   ========================================================= */

async function loadPlayerStats() {
    const { data, error } = await supabaseClient
        .from("player_stats")
        .select("*")
        .order("value", {
            ascending: false
        });

    if (error) {
        console.error("Статистика:", error);
        return;
    }

    state.playerStats = data || [];

    renderPlayerStats();
}


function renderPlayerStats() {
    const container = $(".player-stats");

    if (!container) return;

    const categories = [
        {
            key: "scorers",
            title: "Бомбардиры"
        },
        {
            key: "snipers",
            title: "Снайперы"
        },
        {
            key: "defenders",
            title: "Бомбардиры-защитники"
        },
        {
            key: "plusminus",
            title: "Плюс/минус"
        }
    ];

    container.innerHTML = categories.map(category => {

        const players = state.playerStats
            .filter(
                player =>
                    player.category === category.key
            )
            .slice(0, 5);

        return `
            <div class="stats-category">

                <h3>
                    ${category.title}
                </h3>

                <div class="stats-head">
                    <span>Игрок</span>
                    <span>Показатель</span>
                </div>

                ${players.map(player => `
                    <div class="stats-player">

                        <div class="stats-player-info">

                            ${
                                player.photo_url
                                ?
                                `<img
                                    src="${escapeHTML(
                                        player.photo_url
                                    )}"
                                >`
                                :
                                ""
                            }

                            <div>
                                <strong>
                                    ${escapeHTML(
                                        player.player_name
                                    )}
                                </strong>

                                <small>
                                    ${escapeHTML(
                                        player.number || ""
                                    )}
                                    |
                                    ${escapeHTML(
                                        player.position || ""
                                    )}
                                </small>
                            </div>

                        </div>

                        <strong>
                            ${player.value ?? 0}
                        </strong>

                    </div>
                `).join("")}

            </div>
        `;
    }).join("");
}


/* =========================================================
   ЛИДЕРЫ КОМАНДЫ
   ========================================================= */

async function loadLeaders() {
    const { data, error } = await supabaseClient
        .from("team_leaders")
        .select("*")
        .order("sort_order", {
            ascending: true
        });

    if (error) {
        console.error("Лидеры:", error);
        return;
    }

    state.leaders = data || [];

    renderLeaders();
}


function renderLeaders() {
    const container = $(".leaders-slider");

    if (!container) return;

    container.innerHTML = state.leaders.map((leader, index) => `
        <article
            class="leader-card"
            data-index="${index}"
        >

            <div
                class="leader-number"
            >
                ${escapeHTML(
                    leader.number || ""
                )}
            </div>

            <img
                class="leader-player"
                src="${escapeHTML(
                    leader.image_url || ""
                )}"
                alt=""
            >

            <div class="leader-content">

                <div class="leader-category">
                    ${escapeHTML(
                        leader.category || ""
                    )}
                </div>

                <h2>
                    ${escapeHTML(
                        leader.player_name || ""
                    )}
                </h2>

                <span>
                    #${escapeHTML(
                        leader.number || ""
                    )}
                    |
                    ${escapeHTML(
                        leader.position || ""
                    )}
                </span>

                <div class="leader-statistics">

                    <div>
                        <strong>
                            ${leader.games ?? 0}
                        </strong>
                        <small>матчи</small>
                    </div>

                    <div>
                        <strong>
                            ${leader.value ?? 0}
                        </strong>
                        <small>
                            ${escapeHTML(
                                leader.stat_label || "очки"
                            )}
                        </small>
                    </div>

                    <div>
                        <strong>
                            ${leader.secondary_value ?? 0}
                        </strong>
                        <small>
                            ${escapeHTML(
                                leader.secondary_label || ""
                            )}
                        </small>
                    </div>

                </div>

            </div>

        </article>
    `).join("");
}


/* =========================================================
   АЛЬБОМЫ
   ========================================================= */

async function loadAlbums() {
    const { data, error } = await supabaseClient
        .from("albums")
        .select("*")
        .order("date", {
            ascending: false
        });

    if (error) {
        console.error("Альбомы:", error);
        return;
    }

    state.albums = data || [];

    renderAlbums();
}


function renderAlbums() {
    const container = $(".albums-slider");

    if (!container) return;

    container.innerHTML = state.albums.map((album, index) => `
        <article
            class="album-card"
            onclick="openAlbum(${album.id})"
        >

            <img
                src="${escapeHTML(
                    album.cover_url || ""
                )}"
                alt=""
            >

            <div class="album-content">

                <span>
                    ${formatDate(album.date)}
                </span>

                <h3>
                    ${escapeHTML(
                        album.title || ""
                    )}
                </h3>

            </div>

        </article>
    `).join("");
}


async function openAlbum(albumId) {
    const { data, error } = await supabaseClient
        .from("album_photos")
        .select("*")
        .eq("album_id", albumId)
        .order("sort_order", {
            ascending: true
        });

    if (error) {
        console.error("Фото альбома:", error);
        return;
    }

    const album = state.albums.find(
        item => item.id === albumId
    );

    const modal = $("#album-modal");

    if (!modal) return;

    modal.innerHTML = `
        <div
            class="modal-overlay"
            onclick="closeModal()"
        ></div>

        <div class="album-modal-content">

            <button
                class="modal-close"
                onclick="closeModal()"
            >
                ×
            </button>

            <h2>
                ${escapeHTML(
                    album?.title || ""
                )}
            </h2>

            <div class="album-gallery">

                ${data.map(photo => `
                    <img
                        src="${escapeHTML(
                            photo.image_url
                        )}"
                        alt=""
                    >
                `).join("")}

            </div>

        </div>
    `;

    modal.classList.add("active");
    document.body.classList.add("no-scroll");
}


window.openAlbum = openAlbum;


/* =========================================================
   MODAL
   ========================================================= */

function closeModal() {
    $$(".modal").forEach(modal => {
        modal.classList.remove("active");
    });

    document.body.classList.remove("no-scroll");
}

window.closeModal = closeModal;


/* =========================================================
   МОБИЛЬНОЕ МЕНЮ
   ========================================================= */

function initMobileMenu() {
    const button = $(".menu-button");
    const menu = $(".mobile-menu");

    if (!button || !menu) return;

    button.addEventListener("click", () => {
        menu.classList.toggle("active");
    });
}


/* =========================================================
   СЛАЙДЕРЫ
   ========================================================= */

function initSliders() {

    const nextButtons =
        $$(".slider-next");

    const prevButtons =
        $$(".slider-prev");

    nextButtons.forEach(button => {
        button.addEventListener("click", () => {

            const target =
                button.dataset.target;

            if (target === "news") {
                nextNews();
            }

        });
    });

    prevButtons.forEach(button => {
        button.addEventListener("click", () => {

            const target =
                button.dataset.target;

            if (target === "news") {
                prevNews();
            }

        });
    });
}


/* =========================================================
   АВТООБНОВЛЕНИЕ
   ========================================================= */

async function refreshLiveMatch() {

    const liveMatch =
        state.matches.find(
            match =>
                match.status === "live"
        );

    if (!liveMatch) return;

    await loadMatches();
}


/* =========================================================
   ЗАПУСК
   ========================================================= */

async function initApp() {

    try {

        await loadSettings();

        await Promise.all([
            loadNews(),
            loadStories(),
            loadMatches(),
            loadStandings(),
            loadPlayerStats(),
            loadLeaders(),
            loadAlbums()
        ]);

        initMobileMenu();
        initSliders();

    } catch (error) {

        console.error(
            "Ошибка запуска сайта:",
            error
        );

    }
}


document.addEventListener(
    "DOMContentLoaded",
    initApp
);


/* Обновляем текущий матч каждые 30 секунд */

setInterval(
    refreshLiveMatch,
    30000
);
