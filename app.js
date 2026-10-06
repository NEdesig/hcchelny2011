document.addEventListener("DOMContentLoaded", async () => {

    const settings = await getSettings();

    applySettings(settings);

    setupMenu();

    await loadNews();

    await loadStories();

    await loadNextMatch();

    await loadLastMatches();

    await loadStandings();

    await loadStats("scorers");

    setupStatsTabs();

    await loadLeaders();

    await loadAlbums();

});


/* =========================================
   MENU
========================================= */

function setupMenu() {

    const button =
        document.getElementById("menuButton");

    const menu =
        document.getElementById("mobileMenu");

    if (!button || !menu) return;

    button.addEventListener("click", () => {

        menu.classList.toggle("open");

    });

}


/* =========================================
   NEWS
========================================= */

async function loadNews() {

    const container =
        document.getElementById("newsSlider");

    if (!container) return;

    const { data, error } =
        await supabaseClient
            .from("news")
            .select("*")
            .order("published_at", {
                ascending: false
            })
            .limit(10);

    if (error) {

        console.error(error);

        return;
    }

    container.innerHTML = "";

    data.forEach(item => {

        const card =
            document.createElement("article");

        card.className = "news-card";

        card.innerHTML = `

            <img
                src="${publicFile(item.image_url)}"
                alt=""
            >

            <div class="news-content">

                <div class="news-tag">
                    ${escapeHtml(item.tag || "Новости")}
                </div>

                <h3>
                    ${escapeHtml(item.title)}
                </h3>

            </div>

        `;

        card.addEventListener("click", () => {

            location.href =
                `news.html?id=${item.id}`;

        });

        container.appendChild(card);

    });

}


/* =========================================
   STORIES
========================================= */

async function loadStories() {

    const container =
        document.getElementById("storiesSlider");

    if (!container) return;

    const { data, error } =
        await supabaseClient
            .from("stories")
            .select("*")
            .gt("expires_at", new Date().toISOString())
            .order("published_at", {
                ascending: false
            });

    if (error) {

        console.error(error);

        return;
    }

    container.innerHTML = "";

    data.forEach(item => {

        const story =
            document.createElement("div");

        story.className = "story";

        story.innerHTML = `
            <img
                src="${publicFile(item.image_url)}"
                alt=""
            >
        `;

        story.addEventListener("click", () => {

            openStory(item.image_url);

        });

        container.appendChild(story);

    });

}


function openStory(image) {

    const viewer =
        document.getElementById("storyViewer");

    const viewerImage =
        document.getElementById("storyViewerImage");

    viewerImage.src = publicFile(image);

    viewer.classList.add("active");

    let timer =
        setTimeout(() => {

            viewer.classList.remove("active");

        }, 15000);

    viewer.onclick = () => {

        clearTimeout(timer);

        viewer.classList.remove("active");

    };

}


/* =========================================
   NEXT MATCH
========================================= */

async function loadNextMatch() {

    const container =
        document.getElementById("nextMatch");

    if (!container) return;

    const today =
        new Date().toISOString().slice(0, 10);

    const { data, error } =
        await supabaseClient
            .from("matches")
            .select(`
                *,
                home:clubs!matches_home_club_id_fkey(*),
                away:clubs!matches_away_club_id_fkey(*)
            `)
            .gte("match_date", today)
            .order("match_date", {
                ascending: true
            })
            .order("match_time", {
                ascending: true
            })
            .limit(1)
            .maybeSingle();

    if (error) {

        console.error(error);

        return;
    }

    if (!data) {

        container.innerHTML =
            "<div style='padding:30px'>Матчей нет</div>";

        return;
    }

    const dateTitle =
        document.getElementById("matchDateTitle");

    if (dateTitle) {

        const matchDate =
            new Date(data.match_date);

        const todayDate =
            new Date();

        const tomorrow =
            new Date();

        tomorrow.setDate(
            todayDate.getDate() + 1
        );

        if (
            matchDate.toDateString() ===
            todayDate.toDateString()
        ) {

            dateTitle.textContent = "сегодня";

        } else if (
            matchDate.toDateString() ===
            tomorrow.toDateString()
        ) {

            dateTitle.textContent = "завтра";

        } else {

            dateTitle.textContent =
                matchDate.toLocaleDateString(
                    "ru-RU",
                    {
                        weekday: "long"
                    }
                );

        }

    }

    renderMatchCard(container, data);

}


function renderMatchCard(container, match) {

    const home =
        match.home || {};

    const away =
        match.away || {};

    container.innerHTML = `

        <div class="match-card-top">

            <span>
                ${escapeHtml(match.competition || "")}
            </span>

            <span>
                ${escapeHtml(match.venue || "")}
            </span>

        </div>

        <div class="match-teams">

            <div class="match-team">

                <img
                    src="${publicFile(home.logo_url)}"
                    alt=""
                >

                <div class="match-team-name">
                    ${escapeHtml(home.name || "Команда")}
                </div>

            </div>

            <div class="match-score">

                ${
                    match.status === "scheduled"
                    ? "VS"
                    : `${match.home_score}:${match.away_score}`
                }

            </div>

            <div class="match-team">

                <img
                    src="${publicFile(away.logo_url)}"
                    alt=""
                >

                <div class="match-team-name">
                    ${escapeHtml(away.name || "Команда")}
                </div>

            </div>

        </div>

        <div style="padding:0 20px 20px;text-align:center">

            <a
                class="outline-button"
                style="border-color:white"
                href="match.html?id=${match.id}"
            >
                Обзор матча
            </a>

        </div>

    `;

}


/* =========================================
   LAST MATCHES
========================================= */

async function loadLastMatches() {

    const container =
        document.getElementById("lastMatches");

    if (!container) return;

    const { data, error } =
        await supabaseClient
            .from("matches")
            .select(`
                *,
                home:clubs!matches_home_club_id_fkey(*),
                away:clubs!matches_away_club_id_fkey(*)
            `)
            .eq("status", "finished")
            .order("match_date", {
                ascending: false
            })
            .limit(3);

    if (error) {

        console.error(error);

        return;
    }

    container.innerHTML = "";

    data.reverse().forEach(match => {

        const item =
            document.createElement("div");

        item.className = "mini-match";

        item.innerHTML = `

            <strong>
                ${escapeHtml(match.home?.name || "")}
            </strong>

            <br>

            ${match.home_score} : ${match.away_score}

            <br>

            <strong>
                ${escapeHtml(match.away?.name || "")}
            </strong>

        `;

        container.appendChild(item);

    });

}


/* =========================================
   STANDINGS
========================================= */

async function loadStandings() {

    const tbody =
        document.getElementById("standingsBody");

    if (!tbody) return;

    const { data, error } =
        await supabaseClient
            .from("standings")
            .select("*")
            .order("place", {
                ascending: true
            });

    if (error) {

        console.error(error);

        return;
    }

    tbody.innerHTML = "";

    data.forEach(row => {

        tbody.innerHTML += `

            <tr>

                <td>${row.place ?? ""}</td>

                <td>
                    ${escapeHtml(row.team_name || "")}
                </td>

                <td>${row.games ?? 0}</td>

                <td>${row.wins ?? 0}</td>

                <td>${row.overtime_wins ?? 0}</td>

                <td>${row.shootout_wins ?? 0}</td>

                <td>${row.losses ?? 0}</td>

                <td>${row.overtime_losses ?? 0}</td>

                <td>${row.shootout_losses ?? 0}</td>

                <td>
                    <strong>${row.points ?? 0}</strong>
                </td>

            </tr>

        `;

    });

}


/* =========================================
   STATS
========================================= */

function setupStatsTabs() {

    document
        .querySelectorAll(".stats-tab")
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    document
                        .querySelectorAll(".stats-tab")
                        .forEach(btn =>
                            btn.classList.remove("active")
                        );

                    button.classList.add("active");

                    await loadStats(
                        button.dataset.type
                    );

                }
            );

        });

}


async function loadStats(type) {

    const container =
        document.getElementById("statsList");

    if (!container) return;

    const { data, error } =
        await supabaseClient
            .from("player_stats")
            .select("*")
            .eq("stat_type", type)
            .order("position", {
                ascending: true
            });

    if (error) {

        console.error(error);

        return;
    }

    container.innerHTML = "";

    data.forEach((player, index) => {

        container.innerHTML += `

            <div class="stat-row">

                <div class="stat-place">
                    ${index + 1}
                </div>

                <div>
                    ${escapeHtml(player.player_name)}
                </div>

                <div class="stat-value">
                    ${player.value}
                </div>

            </div>

        `;

    });

}


/* =========================================
   LEADERS
========================================= */

async function loadLeaders() {

    const container =
        document.getElementById("leadersSlider");

    if (!container) return;

    const { data, error } =
        await supabaseClient
            .from("team_leaders")
            .select("*")
            .order("leader_type");

    if (error) {

        console.error(error);

        return;
    }

    container.innerHTML = "";

    data.forEach(leader => {

        container.innerHTML += `

            <div class="leader-card">

                <div class="leader-number">
                    ${leader.player_number || ""}
                </div>

                <img
                    class="leader-player"
                    src="${publicFile(leader.image_url)}"
                    alt=""
                >

                <div class="leader-info">

                    <div class="leader-type">
                        ${escapeHtml(leader.leader_type)}
                    </div>

                    <div class="leader-name">
                        ${escapeHtml(leader.player_name || "")}
                    </div>

                    <div class="leader-stat">
                        ${leader.statistic_value || 0}
                    </div>

                    <div>
                        ${escapeHtml(leader.player_position || "")}
                    </div>

                </div>

            </div>

        `;

    });

}


/* =========================================
   ALBUMS
========================================= */

async function loadAlbums() {

    const container =
        document.getElementById("albumsSlider");

    if (!container) return;

    const { data, error } =
        await supabaseClient
            .from("albums")
            .select("*")
            .order("album_date", {
                ascending: false
            })
            .limit(10);

    if (error) {

        console.error(error);

        return;
    }

    container.innerHTML = "";

    data.forEach(album => {

        const card =
            document.createElement("article");

        card.className = "album-card";

        card.innerHTML = `

            <img
                class="album-cover"
                src="${publicFile(album.cover_url)}"
                alt=""
            >

            <div class="album-title">
                ${escapeHtml(album.title)}
            </div>

            <div class="album-date">
                ${formatDate(album.album_date)}
            </div>

        `;

        card.onclick = () => {

            location.href =
                `album.html?id=${album.id}`;

        };

        container.appendChild(card);

    });

}


/* =========================================
   HELPERS
========================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function formatDate(value) {

    if (!value) return "";

    return new Date(value)
        .toLocaleDateString(
            "ru-RU"
        );

}
