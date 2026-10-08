/* ======================================================
   ХК ЧЕЛНЫ 2011 — ADMIN.JS
   ====================================================== */

const ADMIN = {

    user: null,
    currentSection: "dashboard",

    teams: [],
    matches: [],
    players: [],
    news: [],
    standings: [],
    albums: [],
    achievements: [],
    birthdays: [],
    products: [],
    referees: [],

    editingId: null,
    uploadQueue: []
};


// ======================================================
// DOM
// ======================================================

const $ = (selector, parent = document) =>
    parent.querySelector(selector);

const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];


// ======================================================
// AUTH
// ======================================================

async function checkAdminAuth() {

    const client = initSupabase();

    if (!client) {
        showAdminLogin();
        return;
    }

    const {
        data,
        error
    } = await client.auth.getSession();


    if (error) {

        console.error(
            "Ошибка получения сессии:",
            error
        );

        showAdminLogin();

        return;
    }


    if (data.session) {

        ADMIN.user =
            data.session.user;

        showAdminPanel();

        await loadAdminData();

    } else {

        showAdminLogin();
    }
}


// ======================================================
// LOGIN
// ======================================================

function showAdminLogin() {

    const login =
        document.getElementById(
            "adminLogin"
        );

    const panel =
        document.getElementById(
            "adminPanel"
        );


    if (login) {
        login.classList.remove(
            "hidden"
        );
    }

    if (panel) {
        panel.classList.add(
            "hidden"
        );
    }
}


function showAdminPanel() {

    const login =
        document.getElementById(
            "adminLogin"
        );

    const panel =
        document.getElementById(
            "adminPanel"
        );


    if (login) {
        login.classList.add(
            "hidden"
        );
    }

    if (panel) {
        panel.classList.remove(
            "hidden"
        );
    }
}


// ======================================================
// ВХОД
// ======================================================

async function adminLogin(
    email,
    password
) {

    const client =
        initSupabase();


    if (!client) {
        return;
    }


    try {

        const {
            data,
            error
        } = await client.auth.signInWithPassword({
            email,
            password
        });


        if (error) {
            throw error;
        }


        ADMIN.user =
            data.user;


        showAdminPanel();

        await loadAdminData();

        showToast(
            "Вы успешно вошли",
            "success"
        );


    } catch (error) {

        console.error(
            error
        );

        showToast(
            error.message ||
            "Не удалось войти",
            "error"
        );
    }
}


// ======================================================
// ВЫХОД
// ======================================================

async function adminLogout() {

    const client =
        initSupabase();


    if (!client) {
        return;
    }


    const {
        error
    } = await client.auth.signOut();


    if (error) {

        showToast(
            "Не удалось выйти",
            "error"
        );

        return;
    }


    ADMIN.user = null;

    showAdminLogin();
}


// ======================================================
// ЗАГРУЗКА ВСЕХ ДАННЫХ
// ======================================================

async function loadAdminData() {

    await Promise.all([

        loadAdminTeams(),

        loadAdminMatches(),

        loadAdminPlayers(),

        loadAdminNews(),

        loadAdminStandings(),

        loadAdminAlbums(),

        loadAdminAchievements(),

        loadAdminBirthdays(),

        loadAdminProducts(),

        loadAdminReferees()

    ]);


    renderAdmin();
}


// ======================================================
// GENERIC LOAD
// ======================================================

async function loadTable(
    table,
    orderColumn = "created_at"
) {

    try {

        return await apiRequest(
            table,
            {
                order: {
                    column: orderColumn,
                    ascending: false
                }
            }
        ) || [];

    } catch (error) {

        console.error(
            `Ошибка ${table}:`,
            error
        );

        return [];
    }
}


// ======================================================
// TEAMS
// ======================================================

async function loadAdminTeams() {

    ADMIN.teams =
        await loadTable(
            "teams",
            "name"
        );
}


async function saveTeam(
    data,
    id = null
) {

    const client =
        initSupabase();


    const payload = {
        name:
            data.name || "",

        short_name:
            data.short_name || "",

        logo_url:
            data.logo_url || null
    };


    let result;


    if (id) {

        result =
            await client
                .from("teams")
                .update(payload)
                .eq("id", id);

    } else {

        result =
            await client
                .from("teams")
                .insert(payload);
    }


    if (result.error) {
        throw result.error;
    }


    await loadAdminTeams();

    renderAdmin();

    showToast(
        "Команда сохранена"
    );
}


async function deleteTeam(
    id
) {

    if (
        !confirm(
            "Удалить команду?"
        )
    ) {
        return;
    }


    const client =
        initSupabase();


    const {
        error
    } = await client
        .from("teams")
        .delete()
        .eq("id", id);


    if (error) {

        showToast(
            error.message,
            "error"
        );

        return;
    }


    await loadAdminTeams();

    renderAdmin();

    showToast(
        "Команда удалена"
    );
}


// ======================================================
// MATCHES
// ======================================================

async function loadAdminMatches() {

    ADMIN.matches =
        await loadTable(
            "matches",
            "match_date"
        );
}


async function saveMatch(
    data,
    id = null
) {

    const client =
        initSupabase();


    const payload = {

        match_date:
            data.match_date || null,

        match_time:
            data.match_time || null,

        tournament:
            data.tournament || null,

        venue:
            data.venue || null,

        home_team_id:
            data.home_team_id || null,

        away_team_id:
            data.away_team_id || null,

        home_score:
            data.home_score === "" ||
            data.home_score === undefined
                ? null
                : Number(data.home_score),

        away_score:
            data.away_score === "" ||
            data.away_score === undefined
                ? null
                : Number(data.away_score),

        status:
            data.status || "upcoming",

        stream_url:
            data.stream_url || null
    };


    let result;


    if (id) {

        result =
            await client
                .from("matches")
                .update(payload)
                .eq("id", id);

    } else {

        result =
            await client
                .from("matches")
                .insert(payload);
    }


    if (result.error) {
        throw result.error;
    }


    await loadAdminMatches();

    renderAdmin();

    showToast(
        "Матч сохранён"
    );
}


async function deleteMatch(
    id
) {

    if (
        !confirm(
            "Удалить матч?"
        )
    ) {
        return;
    }


    const client =
        initSupabase();


    const {
        error
    } = await client
        .from("matches")
        .delete()
        .eq("id", id);


    if (error) {

        showToast(
            error.message,
            "error"
        );

        return;
    }


    await loadAdminMatches();

    renderAdmin();

    showToast(
        "Матч удалён"
    );
}


// ======================================================
// PLAYERS
// ======================================================

async function loadAdminPlayers() {

    ADMIN.players =
        await loadTable(
            "players",
            "number"
        );
}


async function savePlayer(
    data,
    id = null
) {

    const client =
        initSupabase();


    const payload = {

        full_name:
            data.full_name ||
            data.name ||
            "",

        number:
            data.number === ""
                ? null
                : Number(data.number),

        position:
            data.position || null,

        birth_date:
            data.birth_date || null,

        height_cm:
            data.height_cm === ""
                ? null
                : Number(data.height_cm),

        weight_kg:
            data.weight_kg === ""
                ? null
                : Number(data.weight_kg),

        photo_url:
            data.photo_url || null,

        captain:
            Boolean(data.captain),

        assistant:
            Boolean(data.assistant)
    };


    let result;


    if (id) {

        result =
            await client
                .from("players")
                .update(payload)
                .eq("id", id);

    } else {

        result =
            await client
                .from("players")
                .insert(payload);
    }


    if (result.error) {
        throw result.error;
    }


    await loadAdminPlayers();

    renderAdmin();

    showToast(
        "Игрок сохранён"
    );
}


async function deletePlayer(
    id
) {

    if (
        !confirm(
            "Удалить игрока?"
        )
    ) {
        return;
    }


    const client =
        initSupabase();


    const {
        error
    } = await client
        .from("players")
        .delete()
        .eq("id", id);


    if (error) {

        showToast(
            error.message,
            "error"
        );

        return;
    }


    await loadAdminPlayers();

    renderAdmin();

    showToast(
        "Игрок удалён"
    );
}


// ======================================================
// NEWS
// ======================================================

async function loadAdminNews() {

    ADMIN.news =
        await loadTable(
            "news",
            "created_at"
        );
}


async function saveNews(
    data,
    id = null
) {

    const client =
        initSupabase();


    const payload = {

        title:
            data.title || "",

        description:
            data.description ||
            data.excerpt ||
            null,

        content:
            data.content || null,

        tag:
            data.tag || null,

        image_url:
            data.image_url || null,

        published:
            data.published !== false
    };


    let result;


    if (id) {

        result =
            await client
                .from("news")
                .update(payload)
                .eq("id", id);

    } else {

        result =
            await client
                .from("news")
                .insert(payload);
    }


    if (result.error) {
        throw result.error;
    }


    await loadAdminNews();

    renderAdmin();

    showToast(
        "Новость сохранена"
    );
}


async function deleteNews(
    id
) {

    if (
        !confirm(
            "Удалить новость?"
        )
    ) {
        return;
    }


    const client =
        initSupabase();


    const {
        error
    } = await client
        .from("news")
        .delete()
        .eq("id", id);


    if (error) {

        showToast(
            error.message,
            "error"
        );

        return;
    }


    await loadAdminNews();

    renderAdmin();

    showToast(
        "Новость удалена"
    );
}


// ======================================================
// STANDINGS
// ======================================================

async function loadAdminStandings() {

    ADMIN.standings =
        await loadTable(
            "standings",
            "place"
        );
}


async function saveStanding(
    data,
    id = null
) {

    const client =
        initSupabase();


    const payload = {

        place:
            Number(data.place || 0),

        team_id:
            data.team_id || null,

        team_name:
            data.team_name || null,

        games:
            Number(data.games || 0),

        wins:
            Number(data.wins || 0),

        wins_ot:
            Number(data.wins_ot || 0),

        wins_so:
            Number(data.wins_so || 0),

        losses_ot:
            Number(data.losses_ot || 0),

        losses_so:
            Number(data.losses_so || 0),

        losses:
            Number(data.losses || 0),

        points:
            Number(data.points || 0)
    };


    let result;


    if (id) {

        result =
            await client
                .from("standings")
                .update(payload)
                .eq("id", id);

    } else {

        result =
            await client
                .from("standings")
                .insert(payload);
    }


    if (result.error) {
        throw result.error;
    }


    await loadAdminStandings();

    renderAdmin();

    showToast(
        "Таблица сохранена"
    );
}


async function deleteStanding(
    id
) {

    if (
        !confirm(
            "Удалить команду из таблицы?"
        )
    ) {
        return;
    }


    const client =
        initSupabase();


    const {
        error
    } = await client
        .from("standings")
        .delete()
        .eq("id", id);


    if (error) {

        showToast(
            error.message,
            "error"
        );

        return;
    }


    await loadAdminStandings();

    renderAdmin();

    showToast(
        "Запись удалена"
    );
}


// ======================================================
// ACHIEVEMENTS
// ======================================================

async function loadAdminAchievements() {

    ADMIN.achievements =
        await loadTable(
            "achievements",
            "year"
        );
}


async function saveAchievement(
    data,
    id = null
) {

    const client =
        initSupabase();


    const payload = {

        title:
            data.title || "",

        description:
            data.description || null,

        year:
            data.year || null,

        image_url:
            data.image_url || null
    };


    let result;


    if (id) {

        result =
            await client
                .from("achievements")
                .update(payload)
                .eq("id", id);

    } else {

        result =
            await client
                .from("achievements")
                .insert(payload);
    }


    if (result.error) {
        throw result.error;
    }


    await loadAdminAchievements();

    renderAdmin();

    showToast(
        "Достижение сохранено"
    );
}


async function deleteAchievement(
    id
) {

    if (
        !confirm(
            "Удалить достижение?"
        )
    ) {
        return;
    }


    const client =
        initSupabase();


    const {
        error
    } = await client
        .from("achievements")
        .delete()
        .eq("id", id);


    if (error) {

        showToast(
            error.message,
            "error"
        );

        return;
    }


    await loadAdminAchievements();

    renderAdmin();

    showToast(
        "Достижение удалено"
    );
}


// ======================================================
// BIRTHDAYS
// ======================================================

async function loadAdminBirthdays() {

    ADMIN.birthdays =
        await loadTable(
            "birthdays",
            "birthday"
        );
}


async function saveBirthday(
    data,
    id = null
) {

    const client =
        initSupabase();


    const payload = {

        name:
            data.name || "",

        birthday:
            data.birthday || null,

        image_url:
            data.image_url || null
    };


    let result;


    if (id) {

        result =
            await client
                .from("birthdays")
                .update(payload)
                .eq("id", id);

    } else {

        result =
            await client
                .from("birthdays")
                .insert(payload);
    }


    if (result.error) {
        throw result.error;
    }


    await loadAdminBirthdays();

    renderAdmin();

    showToast(
        "День рождения сохранён"
    );
}


async function deleteBirthday(
    id
) {

    if (
        !confirm(
            "Удалить запись?"
        )
    ) {
        return;
    }


    const client =
        initSupabase();


    const {
        error
    } = await client
        .from("birthdays")
        .delete()
        .eq("id", id);


    if (error) {

        showToast(
            error.message,
            "error"
        );

        return;
    }


    await loadAdminBirthdays();

    renderAdmin();

    showToast(
        "Запись удалена"
    );
}


// ======================================================
// PRODUCTS
// ======================================================

async function loadAdminProducts() {

    ADMIN.products =
        await loadTable(
            "products",
            "created_at"
        );
}


async function saveProduct(
    data,
    id = null
) {

    const client =
        initSupabase();


    const payload = {

        name:
            data.name || "",

        description:
            data.description || null,

        price:
            data.price === ""
                ? null
                : Number(data.price),

        image_url:
            data.image_url || null,

        contact:
            data.contact || null,

        available:
            data.available !== false
    };


    let result;


    if (id) {

        result =
            await client
                .from("products")
                .update(payload)
                .eq("id", id);

    } else {

        result =
            await client
                .from("products")
                .insert(payload);
    }


    if (result.error) {
        throw result.error;
    }


    await loadAdminProducts();

    renderAdmin();

    showToast(
        "Товар сохранён"
    );
}


async function deleteProduct(
    id
) {

    if (
        !confirm(
            "Удалить товар?"
        )
    ) {
        return;
    }


    const client =
        initSupabase();


    const {
        error
    } = await client
        .from("products")
        .delete()
        .eq("id", id);


    if (error) {

        showToast(
            error.message,
            "error"
        );

        return;
    }


    await loadAdminProducts();

    renderAdmin();

    showToast(
        "Товар удалён"
    );
}


// ======================================================
// REFEREES
// ======================================================

async function loadAdminReferees() {

    try {

        ADMIN.referees =
            await loadTable(
                "referees",
                "name"
            );

    } catch {

        // Таблица может быть создана позже
        ADMIN.referees = [];
    }
}


async function saveReferee(
    data,
    id = null
) {

    const client =
        initSupabase();


    const payload = {

        name:
            data.name || "",

        role:
            data.role || null,

        photo_url:
            data.photo_url || null
    };


    let result;


    if (id) {

        result =
            await client
                .from("referees")
                .update(payload)
                .eq("id", id);

    } else {

        result =
            await client
                .from("referees")
                .insert(payload);
    }


    if (result.error) {
        throw result.error;
    }


    await loadAdminReferees();

    renderAdmin();

    showToast(
        "Судья сохранён"
    );
}


// ======================================================
// STORAGE — ЗАГРУЗКА ФАЙЛА
// ======================================================

async function uploadFile(
    file,
    folder = "uploads"
) {

    if (!file) {
        throw new Error(
            "Файл не выбран"
        );
    }


    const client =
        initSupabase();


    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    const safeName =
        file.name
            .replace(
                /[^a-zA-Z0-9а-яА-Я._-]/g,
                "_"
            );


    const uniqueName =
        `${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 9)}_${safeName}`;


    const path =
        `${folder}/${uniqueName}`;


    const {
        error
    } = await client.storage
        .from(
            SITE_CONFIG.storageBucket
        )
        .upload(
            path,
            file,
            {
                cacheControl: "3600",
                upsert: false,
                contentType:
                    file.type ||
                    `image/${extension}`
            }
        );


    if (error) {
        throw error;
    }


    return path;
}


// ======================================================
// ЗАГРУЗКА ИЗ INPUT
// ======================================================

async function uploadFromInput(
    input,
    folder = "uploads"
) {

    if (
        !input ||
        !input.files ||
        !input.files.length
    ) {

        throw new Error(
            "Файл не выбран"
        );
    }


    const uploaded = [];


    for (
        const file of input.files
    ) {

        const path =
            await uploadFile(
                file,
                folder
            );


        uploaded.push(
            path
        );
    }


    showToast(
        `Загружено файлов: ${uploaded.length}`
    );


    return uploaded;
}


// ======================================================
// УДАЛЕНИЕ ФАЙЛА
// ======================================================

async function deleteFile(
    path
) {

    if (!path) {
        return;
    }


    const client =
        initSupabase();


    const {
        error
    } = await client.storage
        .from(
            SITE_CONFIG.storageBucket
        )
        .remove([
            path
        ]);


    if (error) {

        console.error(
            "Ошибка удаления файла:",
            error
        );

        throw error;
    }
}


// ======================================================
// НАСТРОЙКИ САЙТА
// ======================================================

async function saveSetting(
    key,
    value
) {

    const client =
        initSupabase();


    /*
       Поддерживаем две возможные структуры
       таблицы settings.
    */

    let result =
        await client
            .from("settings")
            .upsert(
                {
                    key,
                    value
                },
                {
                    onConflict:
                        "key"
                }
            );


    if (
        result.error &&
        (
            result.error.code ===
            "42703" ||
            result.error.code ===
            "PGRST204"
        )
    ) {

        result =
            await client
                .from("settings")
                .upsert(
                    {
                        name: key,
                        value
                    },
                    {
                        onConflict:
                            "name"
                    }
                );
    }


    if (result.error) {
        throw result.error;
    }
}


async function saveSettings(
    settings
) {

    for (
        const [
            key,
            value
        ]
        of Object.entries(settings)
    ) {

        await saveSetting(
            key,
            value
        );
    }


    await loadSettings();

    showToast(
        "Настройки сохранены"
    );
}


// ======================================================
// РЕНДЕР АДМИНКИ
// ======================================================

function renderAdmin() {

    renderAdminCounters();

    renderAdminLists();
}


// ======================================================
// СЧЁТЧИКИ
// ======================================================

function renderAdminCounters() {

    $$("[data-admin-count]")
        .forEach(element => {

            const type =
                element.dataset.adminCount;


            const values = {

                teams:
                    ADMIN.teams.length,

                matches:
                    ADMIN.matches.length,

                players:
                    ADMIN.players.length,

                news:
                    ADMIN.news.length,

                standings:
                    ADMIN.standings.length,

                products:
                    ADMIN.products.length,

                achievements:
                    ADMIN.achievements.length,

                birthdays:
                    ADMIN.birthdays.length,

                referees:
                    ADMIN.referees.length

            };


            element.textContent =
                values[type] ??
                0;

        });
}


// ======================================================
// СПИСКИ
// ======================================================

function renderAdminLists() {

    const containers =
        $$("[data-admin-list]");


    containers.forEach(
        container => {

            const type =
                container.dataset.adminList;


            let data = [];


            switch (type) {

                case "teams":
                    data =
                        ADMIN.teams;
                    break;

                case "matches":
                    data =
                        ADMIN.matches;
                    break;

                case "players":
                    data =
                        ADMIN.players;
                    break;

                case "news":
                    data =
                        ADMIN.news;
                    break;

                case "products":
                    data =
                        ADMIN.products;
                    break;

                case "referees":
                    data =
                        ADMIN.referees;
                    break;

                case "achievements":
                    data =
                        ADMIN.achievements;
                    break;

                case "birthdays":
                    data =
                        ADMIN.birthdays;
                    break;

                default:
                    data = [];
            }


            container.innerHTML =
                data.length
                    ? data.map(
                        item =>
                            createAdminListItem(
                                item,
                                type
                            )
                    ).join("")
                    : `
                        <div class="empty-state">
                            <div class="empty-title">
                                Пока ничего нет
                            </div>
                        </div>
                    `;
        }
    );
}


// ======================================================
// ADMIN LIST ITEM
// ======================================================

function createAdminListItem(
    item,
    type
) {

    let title =
        item.name ||
        item.full_name ||
        item.title ||
        "Без названия";


    let subtitle = "";


    if (type === "matches") {

        subtitle =
            `${formatDate(
                item.match_date
            )} · ${
                item.match_time ||
                "—"
            }`;

    } else if (
        type === "players"
    ) {

        subtitle =
            `№${
                item.number ??
                "—"
            } · ${
                item.position ||
                "Игрок"
            }`;

    } else if (
        type === "products"
    ) {

        subtitle =
            item.price !== null &&
            item.price !== undefined
                ? `${item.price} ₽`
                : "Цена не указана";

    } else if (
        type === "referees"
    ) {

        subtitle =
            item.role ||
            "Судья";
    }


    const deleteFunction = {

        teams:
            "deleteTeam",

        matches:
            "deleteMatch",

        players:
            "deletePlayer",

        news:
            "deleteNews",

        products:
            "deleteProduct",

        achievements:
            "deleteAchievement",

        birthdays:
            "deleteBirthday"

    }[type];


    return `

        <div class="admin-list-item">

            <div class="admin-list-info">

                <div class="admin-list-title">
                    ${escapeHTML(title)}
                </div>

                <div class="admin-list-subtitle">
                    ${escapeHTML(subtitle)}
                </div>

            </div>

            <div class="admin-list-actions">

                <button
                    class="btn btn-small btn-secondary"
                    type="button"
                    onclick="editAdminItem('${type}', '${item.id}')"
                >
                    Изменить
                </button>

                ${
                    deleteFunction
                    ? `
                        <button
                            class="btn btn-small btn-danger"
                            type="button"
                            onclick="${deleteFunction}('${item.id}')"
                        >
                            Удалить
                        </button>
                    `
                    : ""
                }

            </div>

        </div>
    `;
}


// ======================================================
// РЕДАКТИРОВАНИЕ
// ======================================================

function editAdminItem(
    type,
    id
) {

    ADMIN.currentSection =
        type;

    ADMIN.editingId =
        id;


    document.dispatchEvent(
        new CustomEvent(
            "admin:edit",
            {
                detail: {
                    type,
                    id
                }
            }
        )
    );
}


// ======================================================
// ПЕРЕКЛЮЧЕНИЕ РАЗДЕЛОВ
// ======================================================

function showAdminSection(
    section
) {

    ADMIN.currentSection =
        section;


    $$("[data-admin-section]")
        .forEach(element => {

            element.classList.toggle(
                "active",
                element.dataset.adminSection ===
                section
            );

        });


    $$("[data-admin-page]")
        .forEach(element => {

            element.classList.toggle(
                "active",
                element.dataset.adminPage ===
                section
            );

        });


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ======================================================
// ФОРМЫ — СОБИРАЕМ ДАННЫЕ
// ======================================================

function getFormData(
    form
) {

    const result = {};


    if (!form) {
        return result;
    }


    new FormData(form)
        .forEach(
            (value, key) => {

                result[key] =
                    value;

            }
        );


    $$(
        'input[type="checkbox"]',
        form
    )
        .forEach(input => {

            result[input.name] =
                input.checked;

        });


    return result;
}


// ======================================================
// ОБЩИЙ SUBMIT
// ======================================================

async function handleAdminForm(
    form
) {

    const type =
        form.dataset.type;


    const id =
        form.dataset.id ||
        null;


    const data =
        getFormData(form);


    try {

        switch (type) {

            case "team":
                await saveTeam(
                    data,
                    id
                );
                break;

            case "match":
                await saveMatch(
                    data,
                    id
                );
                break;

            case "player":
                await savePlayer(
                    data,
                    id
                );
                break;

            case "news":
                await saveNews(
                    data,
                    id
                );
                break;

            case "standing":
                await saveStanding(
                    data,
                    id
                );
                break;

            case "achievement":
                await saveAchievement(
                    data,
                    id
                );
                break;

            case "birthday":
                await saveBirthday(
                    data,
                    id
                );
                break;

            case "product":
                await saveProduct(
                    data,
                    id
                );
                break;

            case "referee":
                await saveReferee(
                    data,
                    id
                );
                break;

            default:
                throw new Error(
                    "Неизвестный тип формы"
                );
        }


        form.reset();

        form.removeAttribute(
            "data-id"
        );


    } catch (error) {

        console.error(
            error
        );

        showToast(
            error.message ||
            "Не удалось сохранить",
            "error"
        );
    }
}


// ======================================================
// FILE INPUTS
// ======================================================

function initAdminUploads() {

    $$(
        'input[type="file"][data-upload]'
    )
        .forEach(input => {

            if (
                input.dataset.ready
            ) {
                return;
            }


            input.dataset.ready =
                "true";


            input.addEventListener(
                "change",
                async () => {

                    try {

                        const folder =
                            input.dataset.upload ||
                            "uploads";


                        const paths =
                            await uploadFromInput(
                                input,
                                folder
                            );


                        const target =
                            input.dataset.target;


                        if (target) {

                            const targetElement =
                                document.querySelector(
                                    target
                                );


                            if (targetElement) {

                                targetElement.value =
                                    paths.join(",");
                            }
                        }


                        const preview =
                            input.dataset.preview;


                        if (preview) {

                            renderUploadPreview(
                                paths,
                                preview
                            );
                        }


                    } catch (error) {

                        console.error(
                            error
                        );

                        showToast(
                            error.message ||
                            "Ошибка загрузки",
                            "error"
                        );
                    }
                }
            );
        });
}


// ======================================================
// PREVIEW
// ======================================================

function renderUploadPreview(
    paths,
    selector
) {

    const container =
        document.querySelector(
            selector
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        paths
            .map(
                path => `

                    <div class="image-preview-item">

                        <img
                            src="${getStorageUrl(path)}"
                            alt=""
                        >

                    </div>
                `
            )
            .join("");
}


// ======================================================
// ССЫЛКА НА МАТЧ
// ======================================================

function getMatchEditUrl(
    id
) {

    return `match.html?id=${encodeURIComponent(id)}`;
}


// ======================================================
// ОТКРЫТЬ МАТЧ
// ======================================================

function editMatchPage(
    id
) {

    window.location.href =
        getMatchEditUrl(id);
}


// ======================================================
// ESCAPE
// ======================================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            $$(".modal.show")
                .forEach(modal => {

                    modal.classList.remove(
                        "show"
                    );

                });

            document.body.style.overflow =
                "";
        }
    }
);


// ======================================================
// FORM SUBMIT
// ======================================================

document.addEventListener(
    "submit",
    async event => {

        const form =
            event.target;


        if (
            !form.matches(
                "[data-admin-form]"
            )
        ) {
            return;
        }


        event.preventDefault();


        await handleAdminForm(
            form
        );
    }
);


// ======================================================
// ADMIN INIT
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        checkAdminAuth();

        initAdminUploads();


        $$("[data-admin-section]")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        showAdminSection(
                            button.dataset.adminSection
                        );

                    }
                );

            });


        const loginForm =
            document.getElementById(
                "loginForm"
            );


        if (loginForm) {

            loginForm.addEventListener(
                "submit",
                async event => {

                    event.preventDefault();


                    const email =
                        loginForm
                            .querySelector(
                                '[name="email"]'
                            )
                            ?.value
                            .trim();


                    const password =
                        loginForm
                            .querySelector(
                                '[name="password"]'
                            )
                            ?.value;


                    if (
                        !email ||
                        !password
                    ) {

                        showToast(
                            "Введите email и пароль",
                            "error"
                        );

                        return;
                    }


                    await adminLogin(
                        email,
                        password
                    );

                }
            );
        }


        const logoutButton =
            document.querySelector(
                "[data-admin-logout]"
            );


        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                adminLogout
            );
        }
    }
);
