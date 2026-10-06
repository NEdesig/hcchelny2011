/* =========================================================
   ХК ЧЕЛНЫ 2011
   ADMIN.JS
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

const adminState = {
    user: null,
    clubs: [],
    matches: [],
    news: [],
    stories: [],
    standings: [],
    playerStats: [],
    leaders: [],
    albums: []
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
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showMessage(message, type = "success") {

    const box = $("#admin-message");

    if (!box) {
        alert(message);
        return;
    }

    box.textContent = message;

    box.className =
        `admin-message ${type}`;

    box.classList.add("active");

    setTimeout(() => {
        box.classList.remove("active");
    }, 3000);
}


/* =========================================================
   АВТОРИЗАЦИЯ
   ========================================================= */

async function checkAuth() {

    const {
        data: {
            session
        }
    } = await supabaseClient.auth.getSession();

    if (!session) {

        showLogin();

        return false;
    }

    adminState.user =
        session.user;

    showAdmin();

    return true;
}


function showLogin() {

    const login =
        $("#admin-login");

    const panel =
        $("#admin-panel");

    if (login) {
        login.style.display = "flex";
    }

    if (panel) {
        panel.style.display = "none";
    }
}


function showAdmin() {

    const login =
        $("#admin-login");

    const panel =
        $("#admin-panel");

    if (login) {
        login.style.display = "none";
    }

    if (panel) {
        panel.style.display = "block";
    }
}


async function login() {

    const email =
        $("#login-email")?.value.trim();

    const password =
        $("#login-password")?.value;

    if (!email || !password) {

        showMessage(
            "Введите email и пароль",
            "error"
        );

        return;
    }

    const {
        error
    } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {

        showMessage(
            error.message,
            "error"
        );

        return;
    }

    location.reload();
}


async function logout() {

    await supabaseClient.auth.signOut();

    location.reload();
}


window.login = login;
window.logout = logout;


/* =========================================================
   STORAGE
   ========================================================= */

async function uploadFile(file, folder = "general") {

    if (!file) {
        return null;
    }

    const extension =
        file.name.split(".").pop();

    const fileName =
        `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const {
        error
    } = await supabaseClient.storage
        .from(STORAGE_BUCKET)
        .upload(
            fileName,
            file,
            {
                cacheControl: "3600",
                upsert: false
            }
        );

    if (error) {

        console.error(
            "Ошибка загрузки:",
            error
        );

        showMessage(
            "Не удалось загрузить файл",
            "error"
        );

        return null;
    }

    const {
        data
    } = supabaseClient.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(fileName);

    return data.publicUrl;
}


async function uploadMultipleFiles(
    files,
    folder
) {

    const urls = [];

    for (const file of files) {

        const url =
            await uploadFile(
                file,
                folder
            );

        if (url) {
            urls.push(url);
        }
    }

    return urls;
}


/* =========================================================
   НОВОСТИ
   ========================================================= */

async function loadAdminNews() {

    const {
        data,
        error
    } = await supabaseClient
        .from("news")
        .select("*")
        .order("published_at", {
            ascending: false
        });

    if (error) {

        console.error(error);

        return;
    }

    adminState.news =
        data || [];

    renderAdminNews();
}


function renderAdminNews() {

    const container =
        $("#admin-news-list");

    if (!container) return;

    container.innerHTML =
        adminState.news.map(news => `

        <div
            class="admin-item"
            data-id="${news.id}"
        >

            <img
                src="${escapeHTML(
                    news.image_url || ""
                )}"
            >

            <div class="admin-item-info">

                <small>
                    ${escapeHTML(
                        news.tag || "Новости"
                    )}
                </small>

                <strong>
                    ${escapeHTML(
                        news.title
                    )}
                </strong>

                <span>
                    ${news.published
                        ? "Опубликовано"
                        : "Скрыто"}
                </span>

            </div>

            <div class="admin-item-actions">

                <button
                    onclick="editNews(${news.id})"
                >
                    Изменить
                </button>

                <button
                    class="danger"
                    onclick="deleteNews(${news.id})"
                >
                    Удалить
                </button>

            </div>

        </div>

    `).join("");
}


async function saveNews() {

    const id =
        $("#news-id")?.value;

    const title =
        $("#news-title")?.value.trim();

    const tag =
        $("#news-tag")?.value.trim();

    const content =
        $("#news-content")?.value.trim();

    const published =
        $("#news-published")?.checked ?? true;

    const date =
        $("#news-date")?.value;

    const image =
        $("#news-image")?.files?.[0];

    if (!title || !content) {

        showMessage(
            "Заполните заголовок и текст",
            "error"
        );

        return;
    }

    let imageUrl =
        $("#news-current-image")?.value || "";

    if (image) {

        imageUrl =
            await uploadFile(
                image,
                "news"
            );
    }

    const payload = {

        title,

        tag,

        content,

        image_url:
            imageUrl,

        published,

        published_at:
            date ||
            new Date().toISOString()

    };


    let error;

    if (id) {

        ({
            error
        } = await supabaseClient
            .from("news")
            .update(payload)
            .eq("id", id));

    } else {

        ({
            error
        } = await supabaseClient
            .from("news")
            .insert(payload));
    }


    if (error) {

        showMessage(
            error.message,
            "error"
        );

        return;
    }


    showMessage(
        "Новость сохранена"
    );

    clearNewsForm();

    await loadAdminNews();
}


async function editNews(id) {

    const news =
        adminState.news.find(
            item => item.id === id
        );

    if (!news) return;

    $("#news-id").value =
        news.id;

    $("#news-title").value =
        news.title || "";

    $("#news-tag").value =
        news.tag || "";

    $("#news-content").value =
        news.content || "";

    $("#news-current-image").value =
        news.image_url || "";

    $("#news-published").checked =
        news.published !== false;

    if ($("#news-date")) {

        $("#news-date").value =
            news.published_at
            ?
            new Date(
                news.published_at
            )
            .toISOString()
            .slice(0, 16)
            :
            "";
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


async function deleteNews(id) {

    if (!confirm(
        "Удалить эту новость?"
    )) {
        return;
    }

    const {
        error
    } = await supabaseClient
        .from("news")
        .delete()
        .eq("id", id);

    if (error) {

        showMessage(
            error.message,
            "error"
        );

        return;
    }

    showMessage(
        "Новость удалена"
    );

    await loadAdminNews();
}


function clearNewsForm() {

    [
        "news-id",
        "news-title",
        "news-tag",
        "news-content",
        "news-current-image"
    ].forEach(id => {

        const element =
            document.getElementById(id);

        if (element) {
            element.value = "";
        }

    });

    if ($("#news-image")) {
        $("#news-image").value = "";
    }

    if ($("#news-published")) {
        $("#news-published").checked =
            true;
    }
}


window.saveNews = saveNews;
window.editNews = editNews;
window.deleteNews = deleteNews;


/* =========================================================
   ИСТОРИИ
   ========================================================= */

async function loadAdminStories() {

    const {
        data,
        error
    } = await supabaseClient
        .from("stories")
        .select("*")
        .order("created_at", {
            ascending: false
        });

    if (error) {

        console.error(error);

        return;
    }

    adminState.stories =
        data || [];

    renderAdminStories();
}


function renderAdminStories() {

    const container =
        $("#admin-stories-list");

    if (!container) return;

    container.innerHTML =
        adminState.stories.map(story => {

            const expired =
                story.expires_at &&
                new Date(
                    story.expires_at
                ) < new Date();

            return `

            <div class="admin-item">

                <img
                    src="${escapeHTML(
                        story.image_url || ""
                    )}"
                >

                <div class="admin-item-info">

                    <strong>
                        ${escapeHTML(
                            story.title || "История"
                        )}
                    </strong>

                    <span>
                        Удаление:
                        ${
                            story.expires_at
                            ?
                            new Date(
                                story.expires_at
                            ).toLocaleString("ru-RU")
                            :
                            "не указано"
                        }
                    </span>

                    ${
                        expired
                        ?
                        `<small>
                            История истекла
                        </small>`
                        :
                        ""
                    }

                </div>

                <div class="admin-item-actions">

                    <button
                        class="danger"
                        onclick="deleteStory(${story.id})"
                    >
                        Удалить
                    </button>

                </div>

            </div>

        `}).join("");
}


async function saveStory() {

    const title =
        $("#story-title")?.value.trim();

    const expires =
        $("#story-expires")?.value;

    const file =
        $("#story-image")?.files?.[0];

    if (!file) {

        showMessage(
            "Выберите изображение",
            "error"
        );

        return;
    }

    const imageUrl =
        await uploadFile(
            file,
            "stories"
        );

    if (!imageUrl) return;

    const {
        error
    } = await supabaseClient
        .from("stories")
        .insert({

            title,

            image_url:
                imageUrl,

            expires_at:
                expires || null,

            published: true

        });

    if (error) {

        showMessage(
            error.message,
            "error"
        );

        return;
    }

    showMessage(
        "История опубликована"
    );

    if ($("#story-title")) {
        $("#story-title").value = "";
    }

    if ($("#story-expires")) {
        $("#story-expires").value = "";
    }

    if ($("#story-image")) {
        $("#story-image").value = "";
    }

    await loadAdminStories();
}


async function deleteStory(id) {

    if (!confirm(
        "Удалить историю?"
    )) {
        return;
    }

    const {
        error
    } = await supabaseClient
        .from("stories")
        .delete()
        .eq("id", id);

    if (error) {

        showMessage(
            error.message,
            "error"
        );

        return;
    }

    showMessage(
        "История удалена"
    );

    await loadAdminStories();
}


window.saveStory = saveStory;
window.deleteStory = deleteStory;


/* =========================================================
   КЛУБЫ
   ========================================================= */

async function loadClubs() {

    const {
        data,
        error
    } = await supabaseClient
        .from("clubs")
        .select("*")
        .order("name");

    if (error) {

        console.error(error);

        return;
    }

    adminState.clubs =
        data || [];

    renderClubs();
    fillClubSelects();
}


function renderClubs() {

    const container =
        $("#admin-clubs-list");

    if (!container) return;

    container.innerHTML =
        adminState.clubs.map(club => `

        <div class="admin-item">

            <img
                src="${escapeHTML(
                    club.logo_url || ""
                )}"
            >

            <div class="admin-item-info">

                <strong>
                    ${escapeHTML(
                        club.name
                    )}
                </strong>

                <span>
                    ${escapeHTML(
                        club.city || ""
                    )}
                </span>

            </div>

            <div class="admin-item-actions">

                <button
                    onclick="editClub(${club.id})"
                >
                    Изменить
                </button>

                <button
                    class="danger"
                    onclick="deleteClub(${club.id})"
                >
                    Удалить
                </button>

            </div>

        </div>

    `).join("");
}


function fillClubSelects() {

    const selects =
        $$(
            ".club-select"
        );

    selects.forEach(select => {

        const selected =
            select.value;

        select.innerHTML = `
            <option value="">
                Выберите клуб
            </option>

            ${adminState.clubs.map(club => `
                <option
                    value="${club.id}"
                >
                    ${escapeHTML(
                        club.name
                    )}
                </option>
            `).join("")}
        `;

        select.value =
            selected;
    });
}


async function saveClub() {

    const id =
        $("#club-id")?.value;

    const name =
        $("#club-name")?.value.trim();

    const city =
        $("#club-city")?.value.trim();

    const file =
        $("#club-logo")?.files?.[0];

    if (!name || !city) {

        showMessage(
            "Введите название и город",
            "error"
        );

        return;
    }

    let logoUrl =
        $("#club-current-logo")?.value || "";

    if (file) {

        logoUrl =
            await uploadFile(
                file,
                "clubs"
            );
    }

    const payload = {

        name,

        city,

        logo_url:
            logoUrl

    };

    let error;

    if (id) {

        ({
            error
        } = await supabaseClient
            .from("clubs")
            .update(payload)
            .eq("id", id));

    } else {

        ({
            error
        } = await supabaseClient
            .from("clubs")
            .insert(payload));

    }

    if (error) {

        showMessage(
            error.message,
            "error"
        );

        return;
    }

    showMessage(
        "Клуб сохранён"
    );

    clearClubForm();

    await loadClubs();
}


function editClub(id) {

    const club =
        adminState.clubs.find(
            item => item.id === id
        );

    if (!club) return;

    $("#club-id").value =
        club.id;

    $("#club-name").value =
        club.name || "";

    $("#club-city").value =
        club.city || "";

    $("#club-current-logo").value =
        club.logo_url || "";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


async function deleteClub(id) {

    if (!confirm(
        "Удалить клуб?"
    )) {
        return;
    }

    const {
        error
    } = await supabaseClient
        .from("clubs")
        .delete()
        .eq("id", id);

    if (error) {

        showMessage(
            error.message,
            "error"
        );

        return;
    }

    showMessage(
        "Клуб удалён"
    );

    await loadClubs();
}


function clearClubForm() {

    [
        "club-id",
        "club-name",
        "club-city",
        "club-current-logo"
    ].forEach(id => {

        const el =
            document.getElementById(id);

        if (el) {
            el.value = "";
        }

    });

    if ($("#club-logo")) {
        $("#club-logo").value = "";
    }
}


window.saveClub = saveClub;
window.editClub = editClub;
window.deleteClub = deleteClub;


/* =========================================================
   МАТЧИ
   ========================================================= */

async function loadAdminMatches() {

    const {
        data,
        error
    } = await supabaseClient
        .from("matches")
        .select(`
            *,
            home_club:clubs!matches_home_club_id_fkey(*),
            away_club:clubs!matches_away_club_id_fkey(*)
        `)
        .order("date", {
            ascending: false
        });

    if (error) {

        console.error(error);

        return;
    }

    adminState.matches =
        data || [];

    renderAdminMatches();
}


function renderAdminMatches() {

    const container =
        $("#admin-matches-list");

    if (!container) return;

    container.innerHTML =
        adminState.matches.map(match => `

        <div class="admin-item">

            <div class="admin-item-info">

                <strong>
                    ${escapeHTML(
                        match.home_club?.name || ""
                    )}
                    —
                    ${escapeHTML(
                        match.away_club?.name || ""
                    )}
                </strong>

                <span>
                    ${new Date(
                        match.date
                    ).toLocaleString("ru-RU")}
                </span>

                <span>
                    ${escapeHTML(
                        match.competition || ""
                    )}
                </span>

                <span>
                    Статус:
                    ${escapeHTML(
                        match.status || ""
                    )}
                </span>

            </div>

            <div class="admin-item-actions">

                <button
                    onclick="editMatch(${match.id})"
                >
                    Изменить
                </button>

                <button
                    class="danger"
                    onclick="deleteMatch(${match.id})"
                >
                    Удалить
                </button>

            </div>

        </div>

    `).join("");
}


async function saveMatch() {

    const id =
        $("#match-id")?.value;

    const homeClub =
        $("#match-home-club")?.value;

    const awayClub =
        $("#match-away-club")?.value;

    const date =
        $("#match-date")?.value;

    const venue =
        $("#match-venue")?.value.trim();

    const competition =
        $("#match-competition")?.value.trim();

    const status =
        $("#match-status")?.value;

    const homeScore =
        Number(
            $("#match-home-score")?.value || 0
        );

    const awayScore =
        Number(
            $("#match-away-score")?.value || 0
        );

    if (
        !homeClub ||
        !awayClub ||
        !date
    ) {

        showMessage(
            "Заполните команды и дату",
            "error"
        );

        return;
    }

    const payload = {

        home_club_id:
            Number(homeClub),

        away_club_id:
            Number(awayClub),

        date,

        venue,

        competition,

        status,

        home_score:
            homeScore,

        away_score:
            awayScore

    };


    let error;

    if (id) {

        ({
            error
        } = await supabaseClient
            .from("matches")
            .update(payload)
            .eq("id", id));

    } else {

        ({
            error
        } = await supabaseClient
            .from("matches")
            .insert(payload));

    }


    if (error) {

        showMessage(
            error.message,
            "error"
        );

        return;
    }

    showMessage(
        "Матч сохранён"
    );

    await loadAdminMatches();

    clearMatchForm();
}


function editMatch(id) {

    const match =
        adminState.matches.find(
            item => item.id === id
        );

    if (!match) return;

    $("#match-id").value =
        match.id;

    $("#match-home-club").value =
        match.home_club_id;

    $("#match-away-club").value =
        match.away_club_id;

    $("#match-date").value =
        match.date
        ?
        new Date(match.date)
            .toISOString()
            .slice(0, 16)
        :
        "";

    $("#match-venue").value =
        match.venue || "";

    $("#match-competition").value =
        match.competition || "";

    $("#match-status").value =
        match.status || "scheduled";

    $("#match-home-score").value =
        match.home_score || 0;

    $("#match-away-score").value =
        match.away_score || 0;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


async function deleteMatch(id) {

    if (!confirm(
        "Удалить матч?"
    )) {
        return;
    }

    const {
        error
    } = await supabaseClient
        .from("matches")
        .delete()
        .eq("id", id);

    if (error) {

        showMessage(
            error.message,
            "error"
        );

        return;
    }

    showMessage(
        "Матч удалён"
    );

    await loadAdminMatches();
}


function clearMatchForm() {

    [
        "match-id",
        "match-date",
        "match-venue",
        "match-competition"
    ].forEach(id => {

        const element =
            document.getElementById(id);

        if (element) {
            element.value = "";
        }

    });

    if ($("#match-home-score")) {
        $("#match-home-score").value = 0;
    }

    if ($("#match-away-score")) {
        $("#match-away-score").value = 0;
    }
}


window.saveMatch = saveMatch;
window.editMatch = editMatch;
window.deleteMatch = deleteMatch;


/* =========================================================
   ТАБЛИЦА
   ========================================================= */

async function loadAdminStandings() {

    const {
        data,
        error
    } = await supabaseClient
        .from("standings")
        .select("*")
        .order("place");

    if (error) {

        console.error(error);

        return;
    }

    adminState.standings =
        data || [];

    renderAdminStandings();
}


function renderAdminStandings() {

    const container =
        $("#admin-standings-list");

    if (!container) return;

    container.innerHTML =
        adminState.standings.map(row => `

        <div class="admin-table-row">

            <input
                type="number"
                value="${row.place || 0}"
                onchange="updateStanding(
                    ${row.id},
                    'place',
                    this.value
                )"
            >

            <input
                value="${escapeHTML(
                    row.team_name || ""
                )}"
                onchange="updateStanding(
                    ${row.id},
                    'team_name',
                    this.value
                )"
            >

            <input
                type="number"
                value="${row.games || 0}"
                onchange="updateStanding(
                    ${row.id},
                    'games',
                    this.value
                )"
            >

            <input
                type="number"
                value="${row.wins || 0}"
                onchange="updateStanding(
                    ${row.id},
                    'wins',
                    this.value
                )"
            >

            <input
                type="number"
                value="${row.wins_ot || 0}"
                onchange="updateStanding(
                    ${row.id},
                    'wins_ot',
                    this.value
                )"
            >

            <input
                type="number"
                value="${row.wins_so || 0}"
                onchange="updateStanding(
                    ${row.id},
                    'wins_so',
                    this.value
                )"
            >

            <input
                type="number"
                value="${row.losses_ot || 0}"
                onchange="updateStanding(
                    ${row.id},
                    'losses_ot',
                    this.value
                )"
            >

            <input
                type="number"
                value="${row.losses_so || 0}"
                onchange="updateStanding(
                    ${row.id},
                    'losses_so',
                    this.value
                )"
            >

            <input
                type="number"
                value="${row.losses || 0}"
                onchange="updateStanding(
                    ${row.id},
                    'losses',
                    this.value
                )"
            >

            <input
                type="number"
                value="${row.points || 0}"
                onchange="updateStanding(
                    ${row.id},
                    'points',
                    this.value
                )"
            >

        </div>

    `).join("");
}


async function updateStanding(
    id,
    field,
    value
) {

    const numericFields = [
        "place",
        "games",
        "wins",
        "wins_ot",
        "wins_so",
        "losses_ot",
        "losses_so",
        "losses",
        "points"
    ];

    const finalValue =
        numericFields.includes(field)
        ?
        Number(value)
        :
        value;

    const {
        error
    } = await supabaseClient
        .from("standings")
        .update({
            [field]: finalValue
        })
        .eq("id", id);

    if (error) {

        showMessage(
            error.message,
            "error"
        );

        return;
    }

    showMessage(
        "Таблица сохранена"
    );
}


window.updateStanding =
    updateStanding;


/* =========================================================
   СТАТИСТИКА
   ========================================================= */

async function savePlayerStat() {

    const id =
        $("#stat-id")?.value;

    const category =
        $("#stat-category")?.value;

    const playerName =
        $("#stat-player")?.value.trim();

    const number =
        $("#stat-number")?.value.trim();

    const position =
        $("#stat-position")?.value.trim();

    const value =
        Number(
            $("#stat-value")?.value || 0
        );

    if (!playerName) {

        showMessage(
            "Введите игрока",
            "error"
        );

        return;
    }

    const payload = {

        category,

        player_name:
            playerName,

        number,

        position,

        value

    };

    let error;

    if (id) {

        ({
            error
        } = await supabaseClient
            .from("player_stats")
            .update(payload)
            .eq("id", id));

    } else {

        ({
            error
        } = await supabaseClient
            .from("player_stats")
            .insert(payload));

    }

    if (error) {

        showMessage(
            error.message,
            "error"
        );

        return;
    }

    showMessage(
        "Статистика сохранена"
    );

    await loadPlayerStatsAdmin();
}


async function loadPlayerStatsAdmin() {

    const {
        data,
        error
    } = await supabaseClient
        .from("player_stats")
        .select("*")
        .order("category");

    if (error) {

        console.error(error);

        return;
    }

    adminState.playerStats =
        data || [];

    const container =
        $("#admin-player-stats-list");

    if (!container) return;

    container.innerHTML =
        adminState.playerStats.map(player => `

        <div class="admin-item">

            <div class="admin-item-info">

                <strong>
                    ${escapeHTML(
                        player.player_name
                    )}
                </strong>

                <span>
                    ${escapeHTML(
                        player.category
                    )}
                </span>

                <span>
                    ${player.value}
                </span>

            </div>

            <div class="admin-item-actions">

                <button
                    class="danger"
                    onclick="deletePlayerStat(
                        ${player.id}
                    )"
                >
                    Удалить
                </button>

            </div>

        </div>

    `).join("");
}


async function deletePlayerStat(id) {

    if (!confirm(
        "Удалить статистику?"
    )) {
        return;
    }

    await supabaseClient
        .from("player_stats")
        .delete()
        .eq("id", id);

    await loadPlayerStatsAdmin();
}


window.savePlayerStat =
    savePlayerStat;

window.deletePlayerStat =
    deletePlayerStat;


/* =========================================================
   ЛИДЕРЫ
   ========================================================= */

async function loadAdminLeaders() {

    const {
        data,
        error
    } = await supabaseClient
        .from("team_leaders")
        .select("*")
        .order("sort_order");

    if (error) {

        console.error(error);

        return;
    }

    adminState.leaders =
        data || [];

    renderAdminLeaders();
}


function renderAdminLeaders() {

    const container =
        $("#admin-leaders-list");

    if (!container) return;

    container.innerHTML =
        adminState.leaders.map(leader => `

        <div class="admin-item">

            <img
                src="${escapeHTML(
                    leader.image_url || ""
                )}"
            >

            <div class="admin-item-info">

                <strong>
                    ${escapeHTML(
                        leader.player_name
                    )}
                </strong>

                <span>
                    ${escapeHTML(
                        leader.category
                    )}
                </span>

            </div>

            <div class="admin-item-actions">

                <button
                    onclick="editLeader(
                        ${leader.id}
                    )"
                >
                    Изменить
                </button>

                <button
                    class="danger"
                    onclick="deleteLeader(
                        ${leader.id}
                    )"
                >
                    Удалить
                </button>

            </div>

        </div>

    `).join("");
}


async function saveLeader() {

    const id =
        $("#leader-id")?.value;

    const category =
        $("#leader-category")?.value;

    const playerName =
        $("#leader-player")?.value.trim();

    const number =
        $("#leader-number")?.value.trim();

    const position =
        $("#leader-position")?.value.trim();

    const games =
        Number(
            $("#leader-games")?.value || 0
        );

    const value =
        Number(
            $("#leader-value")?.value || 0
        );

    const statLabel =
        $("#leader-stat-label")?.value.trim();

    const secondaryValue =
        Number(
            $("#leader-secondary-value")
                ?.value || 0
        );

    const secondaryLabel =
        $("#leader-secondary-label")
            ?.value.trim();

    const file =
        $("#leader-image")?.files?.[0];

    let imageUrl =
        $("#leader-current-image")
            ?.value || "";

    if (file) {

        imageUrl =
            await uploadFile(
                file,
                "leaders"
            );
    }

    const payload = {

        category,

        player_name:
            playerName,

        number,

        position,

        games,

        value,

        stat_label:
            statLabel,

        secondary_value:
            secondaryValue,

        secondary_label:
            secondaryLabel,

        image_url:
            imageUrl

    };

    let error;

    if (id) {

        ({
            error
        } = await supabaseClient
            .from("team_leaders")
            .update(payload)
            .eq("id", id));

    } else {

        ({
            error
        } = await supabaseClient
            .from("team_leaders")
            .insert(payload));

    }

    if (error) {

        showMessage(
            error.message,
            "error"
        );

        return;
    }

    showMessage(
        "Лидер сохранён"
    );

    await loadAdminLeaders();
}


function editLeader(id) {

    const leader =
        adminState.leaders.find(
            item => item.id === id
        );

    if (!leader) return;

    $("#leader-id").value =
        leader.id;

    $("#leader-category").value =
        leader.category || "";

    $("#leader-player").value =
        leader.player_name || "";

    $("#leader-number").value =
        leader.number || "";

    $("#leader-position").value =
        leader.position || "";

    $("#leader-games").value =
        leader.games || 0;

    $("#leader-value").value =
        leader.value || 0;

    $("#leader-stat-label").value =
        leader.stat_label || "";

    $("#leader-secondary-value").value =
        leader.secondary_value || 0;

    $("#leader-secondary-label").value =
        leader.secondary_label || "";

    $("#leader-current-image").value =
        leader.image_url || "";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


async function deleteLeader(id) {

    if (!confirm(
        "Удалить лидера?"
    )) {
        return;
    }

    await supabaseClient
        .from("team_leaders")
        .delete()
        .eq("id", id);

    await loadAdminLeaders();
}


window.saveLeader =
    saveLeader;

window.editLeader =
    editLeader;

window.deleteLeader =
    deleteLeader;


/* =========================================================
   АЛЬБОМЫ
   ========================================================= */

async function loadAdminAlbums() {

    const {
        data,
        error
    } = await supabaseClient
        .from("albums")
        .select("*")
        .order("date", {
            ascending: false
        });

    if (error) {

        console.error(error);

        return;
    }

    adminState.albums =
        data || [];

    renderAdminAlbums();
}


function renderAdminAlbums() {

    const container =
        $("#admin-albums-list");

    if (!container) return;

    container.innerHTML =
        adminState.albums.map(album => `

        <div class="admin-item">

            <img
                src="${escapeHTML(
                    album.cover_url || ""
                )}"
            >

            <div class="admin-item-info">

                <strong>
                    ${escapeHTML(
                        album.title
                    )}
                </strong>

                <span>
                    ${album.date || ""}
                </span>

            </div>

            <div class="admin-item-actions">

                <button
                    class="danger"
                    onclick="deleteAlbum(
                        ${album.id}
                    )"
                >
                    Удалить
                </button>

            </div>

        </div>

    `).join("");
}


async function saveAlbum() {

    const title =
        $("#album-title")?.value.trim();

    const date =
        $("#album-date")?.value;

    const cover =
        $("#album-cover")?.files?.[0];

    const photos =
        $("#album-photos")?.files;

    if (!title || !date || !cover) {

        showMessage(
            "Заполните название, дату и обложку",
            "error"
        );

        return;
    }

    const coverUrl =
        await uploadFile(
            cover,
            "albums"
        );

    if (!coverUrl) return;

    const {
        data: album,
        error: albumError
    } = await supabaseClient
        .from("albums")
        .insert({

            title,

            date,

            cover_url:
                coverUrl

        })
        .select()
        .single();

    if (albumError) {

        showMessage(
            albumError.message,
            "error"
        );

        return;
    }


    if (photos && photos.length) {

        const urls =
            await uploadMultipleFiles(
                photos,
                `albums/${album.id}`
            );

        const rows =
            urls.map(
                (url, index) => ({
                    album_id:
                        album.id,

                    image_url:
                        url,

                    sort_order:
                        index
                })
            );

        const {
            error
        } = await supabaseClient
            .from("album_photos")
            .insert(rows);

        if (error) {

            showMessage(
                error.message,
                "error"
            );

            return;
        }
    }


    showMessage(
        "Альбом создан"
    );

    clearAlbumForm();

    await loadAdminAlbums();
}


async function deleteAlbum(id) {

    if (!confirm(
        "Удалить альбом и все его фотографии?"
    )) {
        return;
    }

    await supabaseClient
        .from("album_photos")
        .delete()
        .eq("album_id", id);

    const {
        error
    } = await supabaseClient
        .from("albums")
        .delete()
        .eq("id", id);

    if (error) {

        showMessage(
            error.message,
            "error"
        );

        return;
    }

    showMessage(
        "Альбом удалён"
    );

    await loadAdminAlbums();
}


function clearAlbumForm() {

    [
        "album-title",
        "album-date"
    ].forEach(id => {

        const el =
            document.getElementById(id);

        if (el) {
            el.value = "";
        }

    });

    if ($("#album-cover")) {
        $("#album-cover").value = "";
    }

    if ($("#album-photos")) {
        $("#album-photos").value = "";
    }
}


window.saveAlbum =
    saveAlbum;

window.deleteAlbum =
    deleteAlbum;


/* =========================================================
   НАСТРОЙКИ САЙТА
   ========================================================= */

async function loadAdminSettings() {

    const {
        data,
        error
    } = await supabaseClient
        .from("site_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

    if (error) {

        console.error(error);

        return;
    }

    if (!data) return;

    const fields = {

        "setting-team-name":
            data.team_name,

        "setting-team-subtitle":
            data.team_subtitle,

        "setting-primary":
            data.primary_color,

        "setting-primary-dark":
            data.primary_dark,

        "setting-primary-light":
            data.primary_light,

        "setting-accent":
            data.accent_color,

        "setting-background":
            data.background_color,

        "setting-surface":
            data.surface_color,

        "setting-text":
            data.text_color

    };


    Object.entries(fields)
        .forEach(([id, value]) => {

            const element =
                document.getElementById(id);

            if (element && value) {
                element.value = value;
            }

        });
}


async function saveSettings() {

    const payload = {

        team_name:
            $("#setting-team-name")
                ?.value.trim(),

        team_subtitle:
            $("#setting-team-subtitle")
                ?.value.trim(),

        primary_color:
            $("#setting-primary")
                ?.value,

        primary_dark:
            $("#setting-primary-dark")
                ?.value,

        primary_light:
            $("#setting-primary-light")
                ?.value,

        accent_color:
            $("#setting-accent")
                ?.value,

        background_color:
            $("#setting-background")
                ?.value,

        surface_color:
            $("#setting-surface")
                ?.value,

        text_color:
            $("#setting-text")
                ?.value

    };


    const {
        data: existing
    } = await supabaseClient
        .from("site_settings")
        .select("id")
        .limit(1)
        .maybeSingle();


    let error;


    if (existing) {

        ({
            error
        } = await supabaseClient
            .from("site_settings")
            .update(payload)
            .eq("id", existing.id));

    } else {

        ({
            error
        } = await supabaseClient
            .from("site_settings")
            .insert(payload));

    }


    if (error) {

        showMessage(
            error.message,
            "error"
        );

        return;
    }

    showMessage(
        "Настройки сохранены"
    );
}


window.saveSettings =
    saveSettings;


/* =========================================================
   АВТОМАТИЧЕСКОЕ УДАЛЕНИЕ ИСТОРИЙ
   ========================================================= */

async function removeExpiredStories() {

    const {
        data,
        error
    } = await supabaseClient
        .from("stories")
        .select("id, expires_at")
        .not("expires_at", "is", null)
        .lt(
            "expires_at",
            new Date().toISOString()
        );

    if (error) return;

    if (!data?.length) return;

    const ids =
        data.map(
            story => story.id
        );

    await supabaseClient
        .from("stories")
        .delete()
        .in("id", ids);
}


/* =========================================================
   ПЕРЕКЛЮЧЕНИЕ РАЗДЕЛОВ АДМИНКИ
   ========================================================= */

function initAdminNavigation() {

    const buttons =
        $$(".admin-nav-button");

    const sections =
        $$(".admin-section");

    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const target =
                    button.dataset.section;

                buttons.forEach(btn =>
                    btn.classList.remove(
                        "active"
                    )
                );

                sections.forEach(section =>
                    section.classList.remove(
                        "active"
                    )
                );

                button.classList.add(
                    "active"
                );

                const section =
                    document.getElementById(
                        target
                    );

                if (section) {
                    section.classList.add(
                        "active"
                    );
                }

            }
        );

    });
}


/* =========================================================
   ЗАПУСК АДМИНКИ
   ========================================================= */

async function initAdmin() {

    const authenticated =
        await checkAuth();

    if (!authenticated) {
        return;
    }


    await removeExpiredStories();


    await Promise.all([

        loadAdminNews(),

        loadAdminStories(),

        loadClubs(),

        loadAdminMatches(),

        loadAdminStandings(),

        loadPlayerStatsAdmin(),

        loadAdminLeaders(),

        loadAdminAlbums(),

        loadAdminSettings()

    ]);


    initAdminNavigation();
}


document.addEventListener(
    "DOMContentLoaded",
    initAdmin
);


/* =========================================================
   АВТОПРОВЕРКА СЕССИИ
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
    (event, session) => {

        if (
            event === "SIGNED_OUT" ||
            !session
        ) {

            showLogin();

        }

    }
);
