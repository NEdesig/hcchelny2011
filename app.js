const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


const state = {
    settings: {},
    teams: [],
    matches: [],
    news: [],
    players: [],
    stats: [],
    albums: [],
    achievements: [],
    birthdays: []
};


/* ================= HELPERS ================= */

function $(id) {
    return document.getElementById(id);
}


function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatDate(date) {

    if (!date) return "—";

    return new Intl.DateTimeFormat(
        "ru-RU",
        {
            day: "numeric",
            month: "long"
        }
    ).format(new Date(date));

}


function formatDateFull(date) {

    if (!date) return "—";

    return new Intl.DateTimeFormat(
        "ru-RU",
        {
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    ).format(new Date(date));

}


function storageUrl(path) {

    if (!path) return "";

    if (
        path.startsWith("http://") ||
        path.startsWith("https://") ||
        path.startsWith("data:")
    ) {
        return path;
    }

    return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}


function showLoader() {
    $("page-loader")?.classList.remove("hidden");
}


function hideLoader() {
    $("page-loader")?.classList.add("hidden");
}


/* ================= SETTINGS ================= */

async function loadSettings() {

    const { data, error } = await supabaseClient
        .from("settings")
        .select("*");

    if (error) {
        console.error("settings:", error);
        return;
    }

    state.settings = {};

    for (const item of data || []) {
        state.settings[item.key] = item.value;
    }

    applySettings();
}


function applySettings() {

    const homepage = state.settings.homepage || {};
    const design = state.settings.design || {};

    const colors = {
        ...DEFAULT_COLORS,
        ...(design.colors || {})
    };

    document.documentElement.style.setProperty(
        "--primary",
        colors.primary
    );

    document.documentElement.style.setProperty(
        "--secondary",
        colors.secondary
    );

    document.documentElement.style.setProperty(
        "--dark",
        colors.dark
    );

    document.documentElement.style.setProperty(
        "--dark2",
        colors.dark2
    );


    if (homepage.hero_title) {
        $("hero-title").innerHTML =
            escapeHTML(homepage.hero_title)
                .replace(/\n/g, "<br>");
    }


    if (homepage.hero_description) {
        $("hero-description").textContent =
            homepage.hero_description;
    }


    if (homepage.shop_url) {
        $("shop-link").href = homepage.shop_url;
    }


    const logo = storageUrl(
        homepage.logo || ""
    );

    if (logo) {
        $("header-logo").src = logo;
        $("footer-logo").src = logo;
    }


    const partners =
        homepage.partners || [];

    $("header-partners").innerHTML =
        partners
            .filter(Boolean)
            .map(item => {

                const src = storageUrl(item.image || item);

                return `
                    <img
                        class="header-partner"
                        src="${src}"
                        alt=""
                    >
                `;

            })
            .join("");

}


/* ================= MATCHES ================= */

async function loadMatches() {

    const { data, error } = await supabaseClient
        .from("matches")
        .select(`
            *,
            home_team:teams!matches_home_team_id_fkey(*),
            away_team:teams!matches_away_team_id_fkey(*)
        `)
        .order("match_date", {
            ascending: true
        });

    if (error) {
        console.error("matches:", error);
        return;
    }

    state.matches = data || [];

    renderNextMatch();
}


function renderNextMatch() {

    const now = new Date();

    const future = state.matches
        .filter(match => {
            return new Date(match.match_date) >= now;
        })
        .sort(
            (a, b) =>
                new Date(a.match_date) -
                new Date(b.match_date)
        );

    const match = future[0];

    if (!match) {
        $("next-match").innerHTML = `
            <div class="empty-state">
                Ближайших матчей пока нет.
            </div>
        `;

        return;
    }


    const home = match.home_team || {};
    const away = match.away_team || {};


    $("next-match-league").textContent =
        match.league || "Матч";

    $("next-match-date").textContent =
        formatDate(match.match_date);


    $("home-team-logo").src =
        storageUrl(home.logo);

    $("away-team-logo").src =
        storageUrl(away.logo);


    $("home-team-name").textContent =
        home.name || "—";

    $("away-team-name").textContent =
        away.name || "—";


    $("home-team-city").textContent =
        home.city || "";

    $("away-team-city").textContent =
        away.city || "";


    $("next-match-time").textContent =
        match.match_time || "—";


    $("next-match-venue").textContent =
        match.venue || "";


    $("match-description").textContent =
        match.description || "";


    if (match.ticket_url) {

        $("match-ticket").hidden = false;
        $("match-ticket").href =
            match.ticket_url;

    } else {

        $("match-ticket").hidden = true;

    }


    renderFixedMatch(match);

}


function renderFixedMatch(match) {

    if (!match) return;

    const home = match.home_team || {};
    const away = match.away_team || {};


    $("fixed-home-logo").src =
        storageUrl(home.logo);

    $("fixed-away-logo").src =
        storageUrl(away.logo);


    $("fixed-home").textContent =
        home.short_name ||
        home.name ||
        "—";


    $("fixed-away").textContent =
        away.short_name ||
        away.name ||
        "—";


    $("fixed-date").textContent =
        formatDate(match.match_date);


    $("fixed-time").textContent =
        match.match_time || "—";


    if (match.ticket_url) {

        $("fixed-ticket").hidden = false;
        $("fixed-ticket").href =
            match.ticket_url;

    } else {

        $("fixed-ticket").hidden = true;

    }

}


/* ================= NEWS ================= */

async function loadNews() {

    const { data, error } = await supabaseClient
        .from("news")
        .select("*")
        .eq("published", true)
        .order("published_at", {
            ascending: false
        })
        .limit(6);

    if (error) {
        console.error("news:", error);
        return;
    }

    state.news = data || [];

    renderNews();
}


function renderNews() {

    const container = $("news-grid");

    if (!state.news.length) {

        container.innerHTML = `
            <div class="empty-state">
                Новостей пока нет.
            </div>
        `;

        return;
    }


    container.innerHTML =
        state.news
            .map(item => {

                return `
                    <article class="news-card">

                        <img
                            class="news-image"
                            src="${storageUrl(item.image)}"
                            alt=""
                            loading="lazy"
                        >

                        <div class="news-body">

                            <div class="news-meta">
                                ${formatDateFull(item.published_at)}
                                ${item.category
                                    ? ` · <span class="news-category">${escapeHTML(item.category)}</span>`
                                    : ""
                                }
                            </div>

                            <h3>
                                ${escapeHTML(item.title)}
                            </h3>

                        </div>

                    </article>
                `;

            })
            .join("");

}


/* ================= PLAYERS ================= */

async function loadPlayers() {

    const { data, error } = await supabaseClient
        .from("players")
        .select("*")
        .eq("active", true)
        .order("number", {
            ascending: true
        });

    if (error) {
        console.error("players:", error);
        return;
    }

    state.players = data || [];

    renderPlayers();
}


function renderPlayers() {

    const container = $("players-grid");

    if (!state.players.length) {

        container.innerHTML = `
            <div class="empty-state">
                Состав пока не опубликован.
            </div>
        `;

        return;
    }


    container.innerHTML =
        state.players
            .map(player => {

                return `
                    <article class="player-card">

                        ${
                            player.photo
                            ? `
                                <img
                                    class="player-photo"
                                    src="${storageUrl(player.photo)}"
                                    alt="${escapeHTML(player.name)}"
                                    loading="lazy"
                                >
                            `
                            : `
                                <div
                                    class="player-photo"
                                    style="background:#26345f"
                                ></div>
                            `
                        }

                        <div class="player-info">

                            <div class="player-number">
                                #${player.number ?? ""}
                            </div>

                            <div class="player-name">
                                ${escapeHTML(player.name)}
                            </div>

                            <div class="player-position">
                                ${escapeHTML(player.position || "")}
                            </div>

                        </div>

                    </article>
                `;

            })
            .join("");

}


/* ================= STATISTICS ================= */

async function loadStatistics() {

    const { data, error } = await supabaseClient
        .from("player_season_stats")
        .select(`
            *,
            player:players(*)
        `)
        .order("points", {
            ascending: false
        })
        .limit(15);

    if (error) {
        console.error("statistics:", error);
        return;
    }

    state.stats = data || [];

    renderStatistics();
}


function renderStatistics() {

    const container = $("statistics-grid");

    const scorers =
        [...state.stats]
            .sort(
                (a, b) =>
                    (b.points || 0) -
                    (a.points || 0)
            )
            .slice(0, 5);


    const goals =
        [...state.stats]
            .sort(
                (a, b) =>
                    (b.goals || 0) -
                    (a.goals || 0)
            )
            .slice(0, 5);


    const assists =
        [...state.stats]
            .sort(
                (a, b) =>
                    (b.assists || 0) -
                    (a.assists || 0)
            )
            .slice(0, 5);


    container.innerHTML = `
        ${renderStatCard(
            "Бомбардиры",
            scorers,
            "points"
        )}

        ${renderStatCard(
            "Снайперы",
            goals,
            "goals"
        )}

        ${renderStatCard(
            "Ассистенты",
            assists,
            "assists"
        )}
    `;

}


function renderStatCard(title, players, field) {

    return `
        <div class="statistics-card">

            <h3>
                ${title}
            </h3>

            ${
                players.length
                ? players.map(item => {

                    const player =
                        item.player || {};

                    return `
                        <div class="stat-player">

                            <div>

                                <div class="stat-player-name">
                                    ${escapeHTML(player.name || "Игрок")}
                                </div>

                                <span class="stat-player-position">
                                    #${player.number ?? ""}
                                    ${player.position || ""}
                                </span>

                            </div>

                            <div class="stat-value">
                                ${item[field] ?? 0}
                            </div>

                        </div>
                    `;

                }).join("")
                : `
                    <div class="empty-state">
                        Нет данных
                    </div>
                `
            }

        </div>
    `;

}


/* ================= ALBUMS ================= */

async function loadAlbums() {

    const { data, error } = await supabaseClient
        .from("albums")
        .select("*")
        .eq("published", true)
        .order("created_at", {
            ascending: false
        })
        .limit(8);

    if (error) {
        console.error("albums:", error);
        return;
    }

    state.albums = data || [];

    renderAlbums();
}


function renderAlbums() {

    const container = $("albums-grid");

    if (!state.albums.length) {

        container.innerHTML = `
            <div class="empty-state">
                Фотоальбомов пока нет.
            </div>
        `;

        return;
    }


    container.innerHTML =
        state.albums
            .map(album => {

                return `
                    <article class="album-card">

                        <img
                            class="album-image"
                            src="${storageUrl(album.cover)}"
                            alt=""
                            loading="lazy"
                        >

                        <div class="album-body">

                            <div class="album-date">
                                ${formatDateFull(album.created_at)}
                            </div>

                            <div class="album-title">
                                ${escapeHTML(album.title)}
                            </div>

                        </div>

                    </article>
                `;

            })
            .join("");

}


/* ================= ACHIEVEMENTS ================= */

async function loadAchievements() {

    const { data, error } = await supabaseClient
        .from("achievements")
        .select("*")
        .order("year", {
            ascending: false
        });

    if (error) {
        console.error("achievements:", error);
        return;
    }

    state.achievements = data || [];

    renderAchievements();
}


function renderAchievements() {

    const container =
        $("achievements-grid");


    if (!state.achievements.length) {

        container.innerHTML = `
            <div class="empty-state">
                Достижения пока не добавлены.
            </div>
        `;

        return;
    }


    container.innerHTML =
        state.achievements
            .map(item => {

                return `
                    <article class="achievement-card">

                        <div class="achievement-year">
                            ${escapeHTML(item.year || "")}
                        </div>

                        <div class="achievement-title">
                            ${escapeHTML(item.title)}
                        </div>

                        <div class="achievement-description">
                            ${escapeHTML(item.description || "")}
                        </div>

                    </article>
                `;

            })
            .join("");

}


/* ================= BIRTHDAYS ================= */

async function loadBirthdays() {

    const { data, error } = await supabaseClient
        .from("birthdays")
        .select("*")
        .eq("published", true)
        .order("birth_date", {
            ascending: true
        });

    if (error) {
        console.error("birthdays:", error);
        return;
    }

    state.birthdays = data || [];

    renderBirthdays();
}


function renderBirthdays() {

    const container =
        $("birthdays-grid");


    const month = new Date().getMonth();


    const current =
        state.birthdays.filter(item => {

            if (!item.birth_date) return false;

            return new Date(item.birth_date)
                .getMonth() === month;

        });


    if (!current.length) {

        container.innerHTML = `
            <div class="empty-state">
                В этом месяце именинников нет.
            </div>
        `;

        return;
    }


    container.innerHTML =
        current
            .slice(0, 8)
            .map(item => {

                return `
                    <article class="birthday-card">

                        <div class="birthday-date">
                            ${formatDate(item.birth_date)}
                        </div>

                        <div class="birthday-name">
                            ${escapeHTML(item.name)}
                        </div>

                    </article>
                `;

            })
            .join("");

}


/* ================= MENU ================= */

function initMenu() {

    const menu =
        $("mobile-menu");

    $("menu-button").addEventListener(
        "click",
        () => {

            menu.classList.add("active");
            document.body.classList.add("menu-open");

        }
    );


    $("menu-close").addEventListener(
        "click",
        closeMenu
    );


    menu.addEventListener(
        "click",
        event => {

            if (
                event.target.tagName === "A"
            ) {
                closeMenu();
            }

        }
    );

}


function closeMenu() {

    $("mobile-menu")
        .classList.remove("active");

    document.body
        .classList.remove("menu-open");

}


/* ================= START ================= */

async function init() {

    try {

        await loadSettings();

        await Promise.all([
            loadMatches(),
            loadNews(),
            loadPlayers(),
            loadStatistics(),
            loadAlbums(),
            loadAchievements(),
            loadBirthdays()
        ]);

        initMenu();

    } catch (error) {

        console.error(error);

    } finally {

        hideLoader();

    }

}


document.addEventListener(
    "DOMContentLoaded",
    init
);
