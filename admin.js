/* =========================================================
   ХК ЧЕЛНЫ 2011
   ADMIN PANEL
   ========================================================= */

"use strict";


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
    "https://jxlbojosxaaqnyuzohnw.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_wNNvPktjjKpz3csoDMo3JA_4duyLAzL";

const STORAGE_BUCKET =
    "site-media";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =========================================================
   DEFAULTS
========================================================= */

const DEFAULT_COLORS = {

    primary: "#000056",

    accent: "#ffcd00",

    dark: "#050b22",

    secondary: "#0d1738"

};


const TABLES = {

    teams: "teams",

    matches: "matches",

    news: "news",

    players: "players",

    stats: "player_season_stats",

    albums: "albums",

    achievements: "achievements",

    birthdays: "birthdays",

    settings: "settings",

    events: "match_events",

    periods: "match_periods",

    products: "products"

};


/* =========================================================
   STATE
========================================================= */

const state = {

    currentTab: "dashboard",

    editing: null,

    data: {

        teams: [],

        matches: [],

        news: [],

        players: [],

        stats: [],

        albums: [],

        achievements: [],

        birthdays: [],

        settings: [],

        events: [],

        periods: [],

        products: []

    }

};


/* =========================================================
   DOM
========================================================= */

const $ = (selector, parent = document) =>
    parent.querySelector(selector);


const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];


/* =========================================================
   HELPERS
========================================================= */

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


function safeURL(url) {

    if (!url) {
        return "";
    }

    try {

        const parsed =
            new URL(url, window.location.href);

        if (
            parsed.protocol === "http:" ||
            parsed.protocol === "https:"
        ) {
            return parsed.href;
        }

    } catch (_) {}

    return "";
}


function formatDate(date) {

    if (!date) {
        return "—";
    }

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
        return String(date);
    }

    return d.toLocaleDateString(
        "ru-RU",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}


function formatDateTime(date) {

    if (!date) {
        return "—";
    }

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
        return String(date);
    }

    return d.toLocaleString(
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


function todayISO() {

    return new Date()
        .toISOString()
        .slice(0, 10);
}


function getId(item) {

    return (
        item?.id ??
        item?.uuid ??
        item?.match_id ??
        item?.player_id ??
        null
    );
}


function getImage(item) {

    return (
        item?.image_url ||
        item?.image ||
        item?.photo_url ||
        item?.photo ||
        item?.cover_url ||
        item?.avatar_url ||
        ""
    );
}


function getName(item) {

    return (
        item?.name ||
        item?.title ||
        item?.full_name ||
        item?.team_name ||
        "Без названия"
    );
}


function boolValue(value) {

    return (
        value === true ||
        value === "true" ||
        value === 1 ||
        value === "1"
    );
}


/* =========================================================
   TOAST
========================================================= */

function toast(message, type = "success") {

    const container =
        $("#toastContainer");

    if (!container) {
        return;
    }

    const item =
        document.createElement("div");

    item.className =
        `toast ${type}`;

    item.textContent =
        message;

    container.appendChild(item);

    setTimeout(() => {

        item.style.opacity = "0";

        item.style.transform =
            "translateY(5px)";

        setTimeout(() => {

            item.remove();

        }, 200);

    }, 3200);
}


/* =========================================================
   CONNECTION
========================================================= */

function setConnection(
    status,
    text
) {

    const dot =
        $("#connectionDot");

    const label =
        $("#connectionText");

    if (!dot || !label) {
        return;
    }

    dot.className =
        "connection-dot";

    if (status === "online") {
        dot.classList.add("online");
    }

    if (status === "offline") {
        dot.classList.add("offline");
    }

    label.textContent =
        text;
}


function setSystem(
    id,
    success,
    text
) {

    const el = $(`#${id}`);

    if (!el) {
        return;
    }

    el.className =
        `status-badge ${
            success
                ? "success"
                : "error"
        }`;

    el.textContent =
        text;
}


/* =========================================================
   NAVIGATION
========================================================= */

const TAB_TITLES = {

    dashboard: "Главная",

    matches: "Матчи",

    players: "Игроки",

    news: "Новости",

    media: "Медиа",

    standings: "Турнирная таблица",

    products: "Магазин",

    extras: "Дополнительно",

    design: "Дизайн",

    settings: "Настройки"

};


function openTab(tab) {

    if (!TAB_TITLES[tab]) {
        tab = "dashboard";
    }

    state.currentTab =
        tab;

    $$(".tab-panel")
        .forEach(panel => {

            panel.classList.toggle(
                "active",
                panel.id === `tab-${tab}`
            );

        });


    $$(".nav-item")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.tab === tab
            );

        });


    $$(".mobile-nav-item")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.tab === tab
            );

        });


    const title =
        $("#pageTitle");

    if (title) {
        title.textContent =
            TAB_TITLES[tab];
    }


    const sidebar =
        $(".sidebar");

    if (sidebar) {
        sidebar.classList.remove("open");
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    if (tab === "matches") {
        renderMatches();
    }

    if (tab === "players") {
        renderPlayers();
    }

    if (tab === "news") {
        renderNews();
    }

    if (tab === "media") {
        renderAlbums();
    }

    if (tab === "standings") {
        renderStandings();
    }

    if (tab === "products") {
        renderProducts();
    }

    if (tab === "extras") {
        renderExtras();
    }

    if (tab === "design") {
        loadDesignIntoForm();
    }

    if (tab === "settings") {
        loadSettingsIntoForm();
    }
}


/* =========================================================
   DATABASE
========================================================= */

async function getTable(table) {

    try {

        const result =
            await supabaseClient
                .from(table)
                .select("*")
                .limit(1000);

        if (result.error) {

            console.warn(
                `Ошибка ${table}:`,
                result.error
            );

            return [];
        }

        return result.data || [];

    } catch (error) {

        console.error(error);

        return [];
    }
}


async function loadAllData() {

    setConnection(
        "pending",
        "Загрузка данных..."
    );


    const tableNames =
        Object.keys(TABLES);


    const results =
        await Promise.all(
            tableNames.map(
                table =>
                    getTable(TABLES[table])
            )
        );


    tableNames.forEach(
        (name, index) => {

            state.data[name] =
                results[index] || [];

        }
    );


    const connected =
        results.some(
            array =>
                Array.isArray(array)
        );


    if (connected) {

        setConnection(
            "online",
            "Supabase подключён"
        );

        setSystem(
            "systemSupabase",
            true,
            "Работает"
        );

        setSystem(
            "systemData",
            true,
            "Доступны"
        );

    } else {

        setConnection(
            "offline",
            "Ошибка подключения"
        );

        setSystem(
            "systemSupabase",
            false,
            "Ошибка"
        );

        setSystem(
            "systemData",
            false,
            "Нет данных"
        );

    }


    await checkStorage();


    renderEverything();
}


async function checkStorage() {

    try {

        const result =
            await supabaseClient
                .storage
                .from(STORAGE_BUCKET)
                .list(
                    "",
                    {
                        limit: 1
                    }
                );


        if (result.error) {

            setSystem(
                "systemStorage",
                false,
                "Ошибка"
            );

            return false;
        }


        setSystem(
            "systemStorage",
            true,
            "Работает"
        );

        return true;

    } catch (_) {

        setSystem(
            "systemStorage",
            false,
            "Ошибка"
        );

        return false;
    }
}


/* =========================================================
   GENERIC CRUD
========================================================= */

async function insertRow(
    table,
    payload
) {

    try {

        const result =
            await supabaseClient
                .from(table)
                .insert(payload)
                .select()
                .single();


        if (result.error) {

            throw result.error;
        }


        return result.data;

    } catch (error) {

        console.error(
            `Insert ${table}`,
            error
        );

        throw error;
    }
}


async function updateRow(
    table,
    id,
    payload
) {

    try {

        const result =
            await supabaseClient
                .from(table)
                .update(payload)
                .eq("id", id)
                .select()
                .single();


        if (result.error) {

            throw result.error;
        }


        return result.data;

    } catch (error) {

        console.error(
            `Update ${table}`,
            error
        );

        throw error;
    }
}


async function deleteRow(
    table,
    id
) {

    try {

        const result =
            await supabaseClient
                .from(table)
                .delete()
                .eq("id", id);


        if (result.error) {

            throw result.error;
        }


        return true;

    } catch (error) {

        console.error(
            `Delete ${table}`,
            error
        );

        throw error;
    }
}


/* =========================================================
   MODAL
========================================================= */

function openModal({
    title,
    label = "РЕДАКТИРОВАНИЕ",
    body,
    save,
    saveText = "Сохранить"
}) {

    const overlay =
        $("#modalOverlay");

    const titleElement =
        $("#modalTitle");

    const labelElement =
        $("#modalLabel");

    const bodyElement =
        $("#modalBody");

    const saveButton =
        $("#modalSave");


    titleElement.textContent =
        title;

    labelElement.textContent =
        label;

    bodyElement.innerHTML =
        body;

    saveButton.textContent =
        saveText;


    state.editing = {
        save
    };


    overlay.classList.add(
        "open"
    );

    overlay.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";


    setTimeout(() => {

        const firstInput =
            bodyElement.querySelector(
                "input, textarea, select"
            );

        if (firstInput) {
            firstInput.focus();
        }

    }, 30);
}


function closeModal() {

    const overlay =
        $("#modalOverlay");

    overlay.classList.remove(
        "open"
    );

    overlay.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.style.overflow =
        "";


    state.editing =
        null;
}


async function saveModal() {

    if (
        !state.editing ||
        typeof state.editing.save !== "function"
    ) {
        return;
    }


    const button =
        $("#modalSave");


    button.disabled =
        true;

    button.textContent =
        "Сохранение...";


    try {

        await state.editing.save();

        closeModal();

    } catch (error) {

        console.error(error);

        toast(
            error.message ||
            "Не удалось сохранить",
            "error"
        );

    } finally {

        button.disabled =
            false;

        button.textContent =
            "Сохранить";
    }
}


/* =========================================================
   FORM HELPERS
========================================================= */

function field(
    label,
    id,
    value = "",
    type = "text",
    options = {}
) {

    const required =
        options.required
            ? "required"
            : "";

    const placeholder =
        options.placeholder || "";


    if (type === "textarea") {

        return `
            <label class="field field-full">
                <span>${escapeHTML(label)}</span>

                <textarea
                    id="${id}"
                    rows="${options.rows || 4}"
                    placeholder="${escapeHTML(placeholder)}"
                    ${required}
                >${escapeHTML(value)}</textarea>
            </label>
        `;
    }


    if (type === "select") {

        const optionsHTML =
            (options.items || [])
                .map(item => {

                    const selected =
                        String(item.value) ===
                        String(value)
                            ? "selected"
                            : "";

                    return `
                        <option
                            value="${escapeHTML(item.value)}"
                            ${selected}
                        >
                            ${escapeHTML(item.label)}
                        </option>
                    `;

                })
                .join("");


        return `
            <label class="field">
                <span>${escapeHTML(label)}</span>

                <select
                    id="${id}"
                    ${required}
                >
                    ${optionsHTML}
                </select>
            </label>
        `;
    }


    return `
        <label class="field">
            <span>${escapeHTML(label)}</span>

            <input
                id="${id}"
                type="${type}"
                value="${escapeHTML(value)}"
                placeholder="${escapeHTML(placeholder)}"
                ${required}
            >
        </label>
    `;
}


function getValue(id) {

    const el =
        document.getElementById(id);

    return el
        ? el.value.trim()
        : "";
}


function getChecked(id) {

    const el =
        document.getElementById(id);

    return !!el?.checked;
}


/* =========================================================
   MATCHES
========================================================= */

function isMatchPlayed(match) {

    if (
        match.status === "played" ||
        match.status === "finished" ||
        match.status === "completed"
    ) {
        return true;
    }


    const date =
        match.date ||
        match.match_date ||
        match.datetime ||
        match.start_time;


    if (!date) {
        return false;
    }


    return new Date(date) < new Date();
}


function matchDate(match) {

    return (
        match.date ||
        match.match_date ||
        match.datetime ||
        match.start_time ||
        ""
    );
}


function homeTeam(match) {

    return (
        match.home_team ||
        match.home_team_name ||
        match.home ||
        match.team_home ||
        "Хозяева"
    );
}


function awayTeam(match) {

    return (
        match.away_team ||
        match.away_team_name ||
        match.away ||
        match.team_away ||
        "Гости"
    );
}


function scoreText(match) {

    if (
        match.score !== undefined &&
        match.score !== null &&
        match.score !== ""
    ) {
        return match.score;
    }


    if (
        match.home_score !== undefined &&
        match.away_score !== undefined
    ) {

        return `${match.home_score}:${match.away_score}`;
    }


    return "—";
}


function renderMatches() {

    const container =
        $("#matchesList");

    if (!container) {
        return;
    }


    let matches =
        [...state.data.matches];


    const search =
        (
            $("#matchSearch")?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const filter =
        $("#matchFilter")?.value ||
        "all";


    if (search) {

        matches =
            matches.filter(match => {

                const text =
                    `${homeTeam(match)}
                    ${awayTeam(match)}
                    ${match.arena || ""}
                    ${match.city || ""}`
                        .toLowerCase();

                return text.includes(search);
            });
    }


    if (filter === "played") {

        matches =
            matches.filter(
                isMatchPlayed
            );
    }


    if (filter === "upcoming") {

        matches =
            matches.filter(
                match =>
                    !isMatchPlayed(match)
            );
    }


    matches.sort(
        (a, b) =>
            new Date(matchDate(b) || 0) -
            new Date(matchDate(a) || 0)
    );


    if (!matches.length) {

        container.innerHTML =
            emptyHTML(
                "Матчей пока нет"
            );

        return;
    }


    container.innerHTML =
        matches.map(match => {

            const id =
                getId(match);


            const played =
                isMatchPlayed(match);


            return `
                <article class="data-card">

                    <div class="data-card-main">

                        <div class="data-card-title">

                            ${escapeHTML(
                                homeTeam(match)
                            )}

                            <span style="color:#9aa1b3">
                                —
                            </span>

                            ${escapeHTML(
                                awayTeam(match)
                            )}

                        </div>

                        <div class="data-card-meta">

                            <span>
                                ${formatDateTime(
                                    matchDate(match)
                                )}
                            </span>

                            <span>·</span>

                            <span>
                                ${escapeHTML(
                                    match.arena ||
                                    match.location ||
                                    "Арена не указана"
                                )}
                            </span>

                            <span>·</span>

                            <strong>
                                ${escapeHTML(
                                    scoreText(match)
                                )}
                            </strong>

                            <span>
                                ${played
                                    ? "Сыгран"
                                    : "Предстоящий"}
                            </span>

                        </div>

                    </div>

                    <div class="data-card-actions">

                        <button
                            class="card-action"
                            type="button"
                            data-edit-match="${escapeHTML(id)}"
                        >
                            ✎
                        </button>

                        <button
                            class="card-action delete"
                            type="button"
                            data-delete-match="${escapeHTML(id)}"
                        >
                            ×
                        </button>

                    </div>

                </article>
            `;

        }).join("");
}


function matchForm(match = {}) {

    const isEdit =
        !!getId(match);


    return `
        <div class="form-grid">

            ${field(
                "Домашняя команда",
                "formHomeTeam",
                homeTeam(match),
                "text",
                {
                    required: true
                }
            )}

            ${field(
                "Гостевая команда",
                "formAwayTeam",
                awayTeam(match),
                "text",
                {
                    required: true
                }
            )}

            ${field(
                "Дата и время",
                "formMatchDate",
                matchDate(match)
                    ? new Date(
                        matchDate(match)
                    )
                        .toISOString()
                        .slice(0,16)
                    : "",
                "datetime-local",
                {
                    required: true
                }
            )}

            ${field(
                "Арена",
                "formArena",
                match.arena ||
                match.location ||
                ""
            )}

            ${field(
                "Счёт",
                "formScore",
                scoreText(match) === "—"
                    ? ""
                    : scoreText(match),
                "text",
                {
                    placeholder: "4:1"
                }
            )}

            ${field(
                "Статус",
                "formMatchStatus",
                match.status ||
                (
                    isMatchPlayed(match)
                        ? "played"
                        : "upcoming"
                ),
                "select",
                {
                    items: [
                        {
                            value: "upcoming",
                            label: "Предстоящий"
                        },
                        {
                            value: "played",
                            label: "Сыгран"
                        }
                    ]
                }
            )}

            ${field(
                "Ссылка на билеты",
                "formTickets",
                match.tickets_url ||
                match.ticket_url ||
                ""
            )}

            ${field(
                "Описание",
                "formMatchDescription",
                match.description ||
                "",
                "textarea"
            )}

        </div>
    `;
}


function openMatchModal(match = null) {

    const editing =
        !!match;


    openModal({

        title:
            editing
                ? "Редактировать матч"
                : "Добавить матч",

        label:
            "МАТЧ",

        body:
            matchForm(match || {}),

        save:
            async () => {

                const payload = {

                    home_team:
                        getValue("formHomeTeam"),

                    away_team:
                        getValue("formAwayTeam"),

                    match_date:
                        getValue("formMatchDate"),

                    arena:
                        getValue("formArena"),

                    score:
                        getValue("formScore"),

                    status:
                        getValue("formMatchStatus"),

                    tickets_url:
                        getValue("formTickets"),

                    description:
                        getValue(
                            "formMatchDescription"
                        )

                };


                if (
                    !payload.home_team ||
                    !payload.away_team ||
                    !payload.match_date
                ) {

                    throw new Error(
                        "Заполни команды и дату матча"
                    );
                }


                if (editing) {

                    await updateRow(
                        TABLES.matches,
                        getId(match),
                        payload
                    );

                    toast(
                        "Матч обновлён"
                    );

                } else {

                    await insertRow(
                        TABLES.matches,
                        payload
                    );

                    toast(
                        "Матч добавлен"
                    );
                }


                await loadAllData();
            }

    });
}


/* =========================================================
   PLAYERS
========================================================= */

function playerName(player) {

    return (
        player.full_name ||
        player.name ||
        (
            `${player.first_name || ""}
            ${player.last_name || ""}`
        ).trim() ||
        "Игрок"
    );
}


function playerPosition(player) {

    return (
        player.position ||
        player.role ||
        "Позиция не указана"
    );
}


function renderPlayers() {

    const container =
        $("#playersList");

    if (!container) {
        return;
    }


    let players =
        [...state.data.players];


    const search =
        (
            $("#playerSearch")?.value ||
            ""
        )
            .toLowerCase()
            .trim();


    const position =
        $("#playerPositionFilter")?.value ||
        "all";


    if (search) {

        players =
            players.filter(player =>
                playerName(player)
                    .toLowerCase()
                    .includes(search)
            );
    }


    if (position !== "all") {

        players =
            players.filter(player =>
                playerPosition(player)
                    .toLowerCase()
                    .includes(
                        position.toLowerCase()
                    )
            );
    }


    if (!players.length) {

        container.innerHTML =
            emptyHTML(
                "Игроков пока нет"
            );

        return;
    }


    container.innerHTML =
        players.map(player => {

            const image =
                safeURL(
                    getImage(player)
                );


            const id =
                getId(player);


            return `
                <article class="player-card">

                    <div class="player-image">

                        ${
                            image
                                ? `
                                    <img
                                        src="${escapeHTML(image)}"
                                        alt=""
                                    >
                                `
                                : ""
                        }

                        <div class="player-number">

                            #${escapeHTML(
                                player.number ||
                                player.jersey_number ||
                                ""
                            )}

                        </div>

                    </div>


                    <div class="player-body">

                        <h3>
                            ${escapeHTML(
                                playerName(player)
                            )}
                        </h3>

                        <p>
                            ${escapeHTML(
                                playerPosition(player)
                            )}
                        </p>


                        <div class="player-actions">

                            <button
                                class="secondary-button"
                                type="button"
                                data-edit-player="${escapeHTML(id)}"
                            >
                                Изменить
                            </button>

                            <button
                                class="card-action delete"
                                type="button"
                                data-delete-player="${escapeHTML(id)}"
                            >
                                ×
                            </button>

                        </div>

                    </div>

                </article>
            `;

        }).join("");
}


function playerForm(player = {}) {

    return `
        <div class="form-grid">

            ${field(
                "ФИО",
                "formPlayerName",
                playerName(player),
                "text",
                {
                    required: true
                }
            )}

            ${field(
                "Номер",
                "formPlayerNumber",
                player.number ||
                player.jersey_number ||
                "",
                "number"
            )}

            ${field(
                "Позиция",
                "formPlayerPosition",
                playerPosition(player),
                "select",
                {
                    items: [
                        {
                            value: "Вратарь",
                            label: "Вратарь"
                        },
                        {
                            value: "Защитник",
                            label: "Защитник"
                        },
                        {
                            value: "Нападающий",
                            label: "Нападающий"
                        }
                    ]
                }
            )}

            ${field(
                "Дата рождения",
                "formPlayerBirth",
                player.birth_date ||
                "",
                "date"
            )}

            ${field(
                "Фото",
                "formPlayerImage",
                getImage(player)
            )}

            ${field(
                "Описание",
                "formPlayerDescription",
                player.description ||
                "",
                "textarea"
            )}

        </div>
    `;
}


function openPlayerModal(player = null) {

    const editing =
        !!player;


    openModal({

        title:
            editing
                ? "Редактировать игрока"
                : "Добавить игрока",

        label:
            "ИГРОК",

        body:
            playerForm(player || {}),

        save:
            async () => {

                const payload = {

                    full_name:
                        getValue(
                            "formPlayerName"
                        ),

                    number:
                        getValue(
                            "formPlayerNumber"
                        ) || null,

                    position:
                        getValue(
                            "formPlayerPosition"
                        ),

                    birth_date:
                        getValue(
                            "formPlayerBirth"
                        ) || null,

                    image_url:
                        getValue(
                            "formPlayerImage"
                        ),

                    description:
                        getValue(
                            "formPlayerDescription"
                        )

                };


                if (!payload.full_name) {

                    throw new Error(
                        "Укажи ФИО игрока"
                    );
                }


                if (editing) {

                    await updateRow(
                        TABLES.players,
                        getId(player),
                        payload
                    );

                    toast(
                        "Игрок обновлён"
                    );

                } else {

                    await insertRow(
                        TABLES.players,
                        payload
                    );

                    toast(
                        "Игрок добавлен"
                    );
                }


                await loadAllData();
            }

    });
}


/* =========================================================
   NEWS
========================================================= */

function newsTitle(news) {

    return (
        news.title ||
        news.name ||
        "Новость"
    );
}


function newsDate(news) {

    return (
        news.published_at ||
        news.date ||
        news.created_at ||
        ""
    );
}


function renderNews() {

    const container =
        $("#newsList");

    if (!container) {
        return;
    }


    let news =
        [...state.data.news];


    const search =
        (
            $("#newsSearch")?.value ||
            ""
        )
            .toLowerCase()
            .trim();


    const filter =
        $("#newsStatusFilter")?.value ||
        "all";


    if (search) {

        news =
            news.filter(item => {

                const text =
                    `${newsTitle(item)}
                    ${item.description || ""}
                    ${item.content || ""}`
                        .toLowerCase();

                return text.includes(search);
            });
    }


    if (filter === "published") {

        news =
            news.filter(
                item =>
                    item.published !== false &&
                    item.is_published !== false
            );
    }


    if (filter === "hidden") {

        news =
            news.filter(
                item =>
                    item.published === false ||
                    item.is_published === false
            );
    }


    news.sort(
        (a, b) =>
            new Date(newsDate(b) || 0) -
            new Date(newsDate(a) || 0)
    );


    if (!news.length) {

        container.innerHTML =
            emptyHTML(
                "Новостей пока нет"
            );

        return;
    }


    container.innerHTML =
        news.map(item => {

            const id =
                getId(item);


            return `
                <article class="data-card">

                    <div class="data-card-main">

                        <div class="data-card-title">

                            ${escapeHTML(
                                newsTitle(item)
                            )}

                        </div>

                        <div class="data-card-meta">

                            <span>
                                ${formatDate(
                                    newsDate(item)
                                )}
                            </span>

                            ${
                                item.category
                                    ? `
                                        <span>·</span>
                                        <span>
                                            ${escapeHTML(
                                                item.category
                                            )}
                                        </span>
                                    `
                                    : ""
                            }

                            <span>·</span>

                            <span>
                                ${
                                    (
                                        item.published === false ||
                                        item.is_published === false
                                    )
                                        ? "Скрыта"
                                        : "Опубликована"
                                }
                            </span>

                        </div>

                    </div>


                    <div class="data-card-actions">

                        <button
                            class="card-action"
                            type="button"
                            data-edit-news="${escapeHTML(id)}"
                        >
                            ✎
                        </button>

                        <button
                            class="card-action delete"
                            type="button"
                            data-delete-news="${escapeHTML(id)}"
                        >
                            ×
                        </button>

                    </div>

                </article>
            `;

        }).join("");
}


function newsForm(news = {}) {

    return `
        <div class="form-grid">

            ${field(
                "Заголовок",
                "formNewsTitle",
                newsTitle(news),
                "text",
                {
                    required: true
                }
            )}

            ${field(
                "Категория",
                "formNewsCategory",
                news.category ||
                "Новости"
            )}

            ${field(
                "Дата публикации",
                "formNewsDate",
                newsDate(news)
                    ? new Date(
                        newsDate(news)
                    )
                        .toISOString()
                        .slice(0, 16)
                    : "",
                "datetime-local"
            )}

            ${field(
                "Изображение",
                "formNewsImage",
                getImage(news)
            )}

            ${field(
                "Короткое описание",
                "formNewsDescription",
                news.description ||
                news.excerpt ||
                "",
                "textarea"
            )}

            ${field(
                "Текст",
                "formNewsContent",
                news.content ||
                news.text ||
                "",
                "textarea",
                {
                    rows: 8
                }
            )}

            <label class="toggle-row field-full">

                <div>
                    <strong>
                        Опубликовано
                    </strong>

                    <span>
                        Новость будет видна на сайте
                    </span>
                </div>

                <input
                    type="checkbox"
                    id="formNewsPublished"
                    ${
                        (
                            news.published !== false &&
                            news.is_published !== false
                        )
                            ? "checked"
                            : ""
                    }
                >

                <i></i>

            </label>

        </div>
    `;
}


function openNewsModal(news = null) {

    const editing =
        !!news;


    openModal({

        title:
            editing
                ? "Редактировать новость"
                : "Добавить новость",

        label:
            "НОВОСТЬ",

        body:
            newsForm(news || {}),

        save:
            async () => {

                const published =
                    getChecked(
                        "formNewsPublished"
                    );


                const payload = {

                    title:
                        getValue(
                            "formNewsTitle"
                        ),

                    category:
                        getValue(
                            "formNewsCategory"
                        ),

                    published_at:
                        getValue(
                            "formNewsDate"
                        ) ||
                        new Date().toISOString(),

                    image_url:
                        getValue(
                            "formNewsImage"
                        ),

                    description:
                        getValue(
                            "formNewsDescription"
                        ),

                    content:
                        getValue(
                            "formNewsContent"
                        ),

                    published

                };


                if (!payload.title) {

                    throw new Error(
                        "Укажи заголовок"
                    );
                }


                if (editing) {

                    await updateRow(
                        TABLES.news,
                        getId(news),
                        payload
                    );

                    toast(
                        "Новость обновлена"
                    );

                } else {

                    await insertRow(
                        TABLES.news,
                        payload
                    );

                    toast(
                        "Новость создана"
                    );
                }


                await loadAllData();
            }

    });
}


/* =========================================================
   ALBUMS
========================================================= */

function renderAlbums() {

    const container =
        $("#albumsList");

    if (!container) {
        return;
    }


    const albums =
        [...state.data.albums]
            .sort(
                (a, b) =>
                    new Date(
                        b.created_at ||
                        b.date ||
                        0
                    ) -
                    new Date(
                        a.created_at ||
                        a.date ||
                        0
                    )
            );


    if (!albums.length) {

        container.innerHTML =
            emptyHTML(
                "Альбомов пока нет"
            );

        return;
    }


    container.innerHTML =
        albums.map(album => {

            const image =
                safeURL(
                    getImage(album)
                );


            const id =
                getId(album);


            return `
                <article class="album-card">

                    <div class="album-image">

                        ${
                            image
                                ? `
                                    <img
                                        src="${escapeHTML(image)}"
                                        alt=""
                                    >
                                `
                                : ""
                        }

                    </div>


                    <div class="album-body">

                        <h3>
                            ${escapeHTML(
                                album.title ||
                                album.name ||
                                "Альбом"
                            )}
                        </h3>

                        <p>
                            ${escapeHTML(
                                album.description ||
                                ""
                            )}
                        </p>

                        <div class="album-actions">

                            <button
                                class="secondary-button"
                                type="button"
                                data-edit-album="${escapeHTML(id)}"
                            >
                                Изменить
                            </button>

                            <button
                                class="card-action delete"
                                type="button"
                                data-delete-album="${escapeHTML(id)}"
                            >
                                ×
                            </button>

                        </div>

                    </div>

                </article>
            `;

        }).join("");
}


function albumForm(album = {}) {

    return `
        <div class="form-grid">

            ${field(
                "Название",
                "formAlbumTitle",
                album.title ||
                album.name ||
                "",
                "text",
                {
                    required: true
                }
            )}

            ${field(
                "Дата",
                "formAlbumDate",
                album.date ||
                "",
                "date"
            )}

            ${field(
                "Обложка",
                "formAlbumCover",
                getImage(album)
            )}

            ${field(
                "Описание",
                "formAlbumDescription",
                album.description ||
                "",
                "textarea"
            )}

        </div>
    `;
}


function openAlbumModal(album = null) {

    const editing =
        !!album;


    openModal({

        title:
            editing
                ? "Редактировать альбом"
                : "Создать альбом",

        label:
            "МЕДИА",

        body:
            albumForm(album || {}),

        save:
            async () => {

                const payload = {

                    title:
                        getValue(
                            "formAlbumTitle"
                        ),

                    date:
                        getValue(
                            "formAlbumDate"
                        ) || null,

                    cover_url:
                        getValue(
                            "formAlbumCover"
                        ),

                    description:
                        getValue(
                            "formAlbumDescription"
                        )

                };


                if (!payload.title) {

                    throw new Error(
                        "Укажи название альбома"
                    );
                }


                if (editing) {

                    await updateRow(
                        TABLES.albums,
                        getId(album),
                        payload
                    );

                    toast(
                        "Альбом обновлён"
                    );

                } else {

                    await insertRow(
                        TABLES.albums,
                        payload
                    );

                    toast(
                        "Альбом создан"
                    );
                }


                await loadAllData();
            }

    });
}


/* =========================================================
   STANDINGS
========================================================= */

function renderStandings() {

    const container =
        $("#standingsList");

    if (!container) {
        return;
    }


    const rows =
        [...state.data.teams]
            .sort(
                (a, b) =>
                    Number(
                        b.points ||
                        b.pts ||
                        0
                    ) -
                    Number(
                        a.points ||
                        a.pts ||
                        0
                    )
            );


    if (!rows.length) {

        container.innerHTML =
            emptyHTML(
                "Команд в таблице пока нет"
            );

        return;
    }


    container.innerHTML =
        rows.map((team, index) => {

            const id =
                getId(team);


            return `
                <div class="standing-row">

                    <div class="standing-place">
                        ${index + 1}
                    </div>

                    <div class="standing-team">
                        ${escapeHTML(
                            team.name ||
                            team.team_name ||
                            "Команда"
                        )}
                    </div>

                    <div class="standing-points">
                        ${escapeHTML(
                            team.points ||
                            team.pts ||
                            0
                        )}
                    </div>

                    <div class="standing-actions">

                        <button
                            class="card-action"
                            type="button"
                            data-edit-team="${escapeHTML(id)}"
                        >
                            ✎
                        </button>

                        <button
                            class="card-action delete"
                            type="button"
                            data-delete-team="${escapeHTML(id)}"
                        >
                            ×
                        </button>

                    </div>

                </div>
            `;

        }).join("");
}


function teamForm(team = {}) {

    return `
        <div class="form-grid">

            ${field(
                "Название команды",
                "formTeamName",
                team.name ||
                team.team_name ||
                "",
                "text",
                {
                    required: true
                }
            )}

            ${field(
                "Очки",
                "formTeamPoints",
                team.points ||
                team.pts ||
                0,
                "number"
            )}

            ${field(
                "Победы",
                "formTeamWins",
                team.wins ||
                0,
                "number"
            )}

            ${field(
                "Поражения",
                "formTeamLosses",
                team.losses ||
                0,
                "number"
            )}

            ${field(
                "Логотип",
                "formTeamLogo",
                getImage(team)
            )}

        </div>
    `;
}


function openTeamModal(team = null) {

    const editing =
        !!team;


    openModal({

        title:
            editing
                ? "Редактировать команду"
                : "Добавить команду",

        label:
            "ТАБЛИЦА",

        body:
            teamForm(team || {}),

        save:
            async () => {

                const payload = {

                    name:
                        getValue(
                            "formTeamName"
                        ),

                    points:
                        Number(
                            getValue(
                                "formTeamPoints"
                            ) || 0
                        ),

                    wins:
                        Number(
                            getValue(
                                "formTeamWins"
                            ) || 0
                        ),

                    losses:
                        Number(
                            getValue(
                                "formTeamLosses"
                            ) || 0
                        ),

                    logo_url:
                        getValue(
                            "formTeamLogo"
                        )

                };


                if (!payload.name) {

                    throw new Error(
                        "Укажи название команды"
                    );
                }


                if (editing) {

                    await updateRow(
                        TABLES.teams,
                        getId(team),
                        payload
                    );

                    toast(
                        "Команда обновлена"
                    );

                } else {

                    await insertRow(
                        TABLES.teams,
                        payload
                    );

                    toast(
                        "Команда добавлена"
                    );
                }


                await loadAllData();
            }

    });
}


/* =========================================================
   PRODUCTS
========================================================= */

function renderProducts() {

    const container =
        $("#productsList");

    if (!container) {
        return;
    }


    const products =
        [...state.data.products];


    if (!products.length) {

        container.innerHTML =
            emptyHTML(
                "Товаров пока нет"
            );

        return;
    }


    container.innerHTML =
        products.map(product => {

            const image =
                safeURL(
                    getImage(product)
                );


            const id =
                getId(product);


            return `
                <article class="product-card">

                    <div class="product-image">

                        ${
                            image
                                ? `
                                    <img
                                        src="${escapeHTML(image)}"
                                        alt=""
                                    >
                                `
                                : ""
                        }

                    </div>


                    <div class="product-body">

                        <h3>
                            ${escapeHTML(
                                product.name ||
                                product.title ||
                                "Товар"
                            )}
                        </h3>

                        <p>
                            ${escapeHTML(
                                product.description ||
                                ""
                            )}
                        </p>

                        <strong>
                            ${
                                product.price !== null &&
                                product.price !== undefined
                                    ? `${escapeHTML(product.price)} ₽`
                                    : "Цена не указана"
                            }
                        </strong>


                        <div class="product-actions">

                            <button
                                class="secondary-button"
                                type="button"
                                data-edit-product="${escapeHTML(id)}"
                            >
                                Изменить
                            </button>

                            <button
                                class="card-action delete"
                                type="button"
                                data-delete-product="${escapeHTML(id)}"
                            >
                                ×
                            </button>

                        </div>

                    </div>

                </article>
            `;

        }).join("");
}


function productForm(product = {}) {

    return `
        <div class="form-grid">

            ${field(
                "Название",
                "formProductName",
                product.name ||
                product.title ||
                "",
                "text",
                {
                    required: true
                }
            )}

            ${field(
                "Цена",
                "formProductPrice",
                product.price ||
                "",
                "number"
            )}

            ${field(
                "Изображение",
                "formProductImage",
                getImage(product)
            )}

            ${field(
                "Ссылка магазина",
                "formProductUrl",
                product.url ||
                product.link ||
                ""
            )}

            ${field(
                "Описание",
                "formProductDescription",
                product.description ||
                "",
                "textarea"
            )}

            <label class="toggle-row field-full">

                <div>
                    <strong>
                        Показывать
                    </strong>

                    <span>
                        Товар будет отображаться на сайте
                    </span>
                </div>

                <input
                    type="checkbox"
                    id="formProductVisible"
                    ${
                        (
                            product.visible !== false &&
                            product.is_visible !== false
                        )
                            ? "checked"
                            : ""
                    }
                >

                <i></i>

            </label>

        </div>
    `;
}


function openProductModal(product = null) {

    const editing =
        !!product;


    openModal({

        title:
            editing
                ? "Редактировать товар"
                : "Добавить товар",

        label:
            "МАГАЗИН",

        body:
            productForm(product || {}),

        save:
            async () => {

                const payload = {

                    name:
                        getValue(
                            "formProductName"
                        ),

                    price:
                        Number(
                            getValue(
                                "formProductPrice"
                            ) || 0
                        ),

                    image_url:
                        getValue(
                            "formProductImage"
                        ),

                    url:
                        getValue(
                            "formProductUrl"
                        ),

                    description:
                        getValue(
                            "formProductDescription"
                        ),

                    visible:
                        getChecked(
                            "formProductVisible"
                        )

                };


                if (!payload.name) {

                    throw new Error(
                        "Укажи название товара"
                    );
                }


                if (editing) {

                    await updateRow(
                        TABLES.products,
                        getId(product),
                        payload
                    );

                    toast(
                        "Товар обновлён"
                    );

                } else {

                    await insertRow(
                        TABLES.products,
                        payload
                    );

                    toast(
                        "Товар добавлен"
                    );
                }


                await loadAllData();
            }

    });
}


/* =========================================================
   EXTRAS
========================================================= */

function renderExtras() {

    renderSimpleList(
        "#achievementsList",
        state.data.achievements,
        item =>
            item.title ||
            item.name ||
            "Достижение",
        item =>
            item.year ||
            item.date ||
            "",
        "achievement"
    );


    renderSimpleList(
        "#birthdaysList",
        state.data.birthdays,
        item =>
            item.name ||
            item.player_name ||
            "Игрок",
        item =>
            item.birth_date ||
            item.date ||
            "",
        "birthday"
    );


    renderSimpleList(
        "#eventsList",
        state.data.events,
        item =>
            item.description ||
            item.type ||
            "Событие",
        item =>
            item.period ||
            item.minute ||
            "",
        "event"
    );


    renderSimpleList(
        "#periodsList",
        state.data.periods,
        item =>
            item.period ||
            item.name ||
            "Период",
        item =>
            item.score ||
            "",
        "period"
    );
}


function renderSimpleList(
    selector,
    items,
    titleFn,
    metaFn,
    type
) {

    const container =
        $(selector);

    if (!container) {
        return;
    }


    if (!items.length) {

        container.innerHTML =
            emptyHTML(
                "Пока пусто"
            );

        return;
    }


    container.innerHTML =
        items.map(item => {

            const id =
                getId(item);


            return `
                <div class="mini-item">

                    <div>

                        <strong>
                            ${escapeHTML(
                                titleFn(item)
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                metaFn(item)
                            )}
                        </span>

                    </div>


                    <div class="data-card-actions">

                        <button
                            class="card-action"
                            type="button"
                            data-edit-${type}="${escapeHTML(id)}"
                        >
                            ✎
                        </button>

                        <button
                            class="card-action delete"
                            type="button"
                            data-delete-${type}="${escapeHTML(id)}"
                        >
                            ×
                        </button>

                    </div>

                </div>
            `;

        }).join("");
}


function simpleForm(
    type,
    item = {}
) {

    if (type === "achievement") {

        return `
            <div class="form-grid">

                ${field(
                    "Название",
                    "formExtraTitle",
                    item.title ||
                    item.name ||
                    "",
                    "text",
                    {
                        required: true
                    }
                )}

                ${field(
                    "Год",
                    "formExtraYear",
                    item.year ||
                    ""
                )}

                ${field(
                    "Описание",
                    "formExtraDescription",
                    item.description ||
                    "",
                    "textarea"
                )}

            </div>
        `;
    }


    if (type === "birthday") {

        return `
            <div class="form-grid">

                ${field(
                    "Имя",
                    "formExtraTitle",
                    item.name ||
                    item.player_name ||
                    "",
                    "text",
                    {
                        required: true
                    }
                )}

                ${field(
                    "Дата рождения",
                    "formExtraDate",
                    item.birth_date ||
                    item.date ||
                    "",
                    "date"
                )}

                ${field(
                    "Фото",
                    "formExtraImage",
                    getImage(item)
                )}

            </div>
        `;
    }


    if (type === "event") {

        return `
            <div class="form-grid">

                ${field(
                    "Событие",
                    "formExtraTitle",
                    item.description ||
                    item.type ||
                    "",
                    "text",
                    {
                        required: true
                    }
                )}

                ${field(
                    "Минута",
                    "formExtraMinute",
                    item.minute ||
                    ""
                )}

                ${field(
                    "Период",
                    "formExtraPeriod",
                    item.period ||
                    ""
                )}

            </div>
        `;
    }


    return `
        <div class="form-grid">

            ${field(
                "Период",
                "formExtraTitle",
                item.period ||
                item.name ||
                "",
                "text",
                {
                    required: true
                }
            )}

            ${field(
                "Счёт",
                "formExtraScore",
                item.score ||
                ""
            )}

        </div>
    `;
}


function openSimpleModal(
    type,
    item = null
) {

    const table =
        TABLES[
            type === "achievement"
                ? "achievements"
                : type === "birthday"
                    ? "birthdays"
                    : type === "event"
                        ? "events"
                        : "periods"
        ];


    const editing =
        !!item;


    openModal({

        title:
            editing
                ? "Редактировать"
                : "Добавить",

        label:
            "ДОПОЛНИТЕЛЬНО",

        body:
            simpleForm(
                type,
                item || {}
            ),

        save:
            async () => {

                let payload;


                if (type === "achievement") {

                    payload = {

                        title:
                            getValue(
                                "formExtraTitle"
                            ),

                        year:
                            getValue(
                                "formExtraYear"
                            ),

                        description:
                            getValue(
                                "formExtraDescription"
                            )

                    };

                } else if (type === "birthday") {

                    payload = {

                        name:
                            getValue(
                                "formExtraTitle"
                            ),

                        birth_date:
                            getValue(
                                "formExtraDate"
                            ),

                        image_url:
                            getValue(
                                "formExtraImage"
                            )

                    };

                } else if (type === "event") {

                    payload = {

                        description:
                            getValue(
                                "formExtraTitle"
                            ),

                        minute:
                            getValue(
                                "formExtraMinute"
                            ),

                        period:
                            getValue(
                                "formExtraPeriod"
                            )

                    };

                } else {

                    payload = {

                        period:
                            getValue(
                                "formExtraTitle"
                            ),

                        score:
                            getValue(
                                "formExtraScore"
                            )

                    };
                }


                if (editing) {

                    await updateRow(
                        table,
                        getId(item),
                        payload
                    );

                } else {

                    await insertRow(
                        table,
                        payload
                    );
                }


                toast(
                    editing
                        ? "Изменения сохранены"
                        : "Добавлено"
                );


                await loadAllData();
            }

    });
}


/* =========================================================
   DESIGN / SETTINGS
========================================================= */

const designSettings = {

    primary:
        DEFAULT_COLORS.primary,

    accent:
        DEFAULT_COLORS.accent,

    dark:
        DEFAULT_COLORS.dark,

    secondary:
        DEFAULT_COLORS.secondary,

    logo:
        "",

    favicon:
        "",

    menuIcon:
        "",

    siteIcon:
        "",

    fonts: {}

};


function settingValue(key) {

    const item =
        state.data.settings.find(
            row =>
                row.key === key ||
                row.name === key
        );


    if (!item) {
        return null;
    }


    return (
        item.value ??
        item.setting_value ??
        item.data ??
        null
    );
}


function parseSetting(value) {

    if (typeof value !== "string") {
        return value;
    }


    try {

        return JSON.parse(value);

    } catch (_) {

        return value;
    }
}


function loadDesignIntoForm() {

    const values = {

        primary:
            settingValue("color_primary") ||
            settingValue("primary_color") ||
            DEFAULT_COLORS.primary,

        accent:
            settingValue("color_accent") ||
            settingValue("accent_color") ||
            DEFAULT_COLORS.accent,

        dark:
            settingValue("color_dark") ||
            settingValue("dark_color") ||
            DEFAULT_COLORS.dark,

        secondary:
            settingValue("color_secondary") ||
            settingValue("secondary_color") ||
            DEFAULT_COLORS.secondary,

        logo:
            settingValue("logo_url") || "",

        favicon:
            settingValue("favicon_url") || "",

        menuIcon:
            settingValue("menu_icon_url") || "",

        siteIcon:
            settingValue("site_icon_url") || ""

    };


    Object.assign(
        designSettings,
        values
    );


    setColorInput(
        "colorPrimary",
        "colorPrimaryText",
        values.primary
    );


    setColorInput(
        "colorAccent",
        "colorAccentText",
        values.accent
    );


    setColorInput(
        "colorDark",
        "colorDarkText",
        values.dark
    );


    setColorInput(
        "colorSecondary",
        "colorSecondaryText",
        values.secondary
    );


    const preview =
        $("#logoPreview");


    if (preview) {

        const url =
            safeURL(values.logo);


        preview.innerHTML =
            url
                ? `<img src="${escapeHTML(url)}" alt="">`
                : "ЛОГО";
    }
}


function setColorInput(
    colorId,
    textId,
    value
) {

    const color =
        $(`#${colorId}`);

    const text =
        $(`#${textId}`);


    if (!color || !text) {
        return;
    }


    const valid =
        /^#[0-9a-f]{6}$/i
            .test(value || "");


    if (!valid) {
        value = "#000000";
    }


    color.value =
        value;

    text.value =
        value;
}


async function saveSetting(
    key,
    value
) {

    const existing =
        state.data.settings.find(
            item =>
                item.key === key ||
                item.name === key
        );


    const payload = {

        key,

        value:
            typeof value === "string"
                ? value
                : JSON.stringify(value)

    };


    if (existing && getId(existing)) {

        await updateRow(
            TABLES.settings,
            getId(existing),
            payload
        );

    } else {

        await insertRow(
            TABLES.settings,
            payload
        );
    }
}


async function saveDesign() {

    const values = {

        color_primary:
            getValue(
                "colorPrimaryText"
            ),

        color_accent:
            getValue(
                "colorAccentText"
            ),

        color_dark:
            getValue(
                "colorDarkText"
            ),

        color_secondary:
            getValue(
                "colorSecondaryText"
            )

    };


    for (
        const [key, value]
        of Object.entries(values)
    ) {

        await saveSetting(
            key,
            value
        );
    }


    toast(
        "Дизайн сохранён"
    );


    await loadAllData();
}


function loadSettingsIntoForm() {

    const get =
        (key, fallback = "") =>
            settingValue(key) ??
            fallback;


    $("#settingTeamName").value =
        get(
            "team_name",
            "ХК Челны 2011"
        );


    $("#settingCity").value =
        get(
            "city",
            "Набережные Челны"
        );


    $("#settingDescription").value =
        get(
            "description",
            ""
        );


    $("#settingTelegram").value =
        get(
            "telegram",
            ""
        );


    $("#settingVk").value =
        get(
            "vk",
            ""
        );


    $("#homeMatch").checked =
        parseSetting(
            get(
                "home_match",
                true
            )
        ) !== false;


    $("#homeNews").checked =
        parseSetting(
            get(
                "home_news",
                true
            )
        ) !== false;


    $("#homeMedia").checked =
        parseSetting(
            get(
                "home_media",
                true
            )
        ) !== false;


    $("#homeStandings").checked =
        parseSetting(
            get(
                "home_standings",
                true
            )
        ) !== false;


    $("#homeProducts").checked =
        parseSetting(
            get(
                "home_products",
                true
            )
        ) !== false;
}


async function saveSettings() {

    const values = {

        team_name:
            getValue(
                "settingTeamName"
            ),

        city:
            getValue(
                "settingCity"
            ),

        description:
            getValue(
                "settingDescription"
            ),

        telegram:
            getValue(
                "settingTelegram"
            ),

        vk:
            getValue(
                "settingVk"
            ),

        home_match:
            getChecked(
                "homeMatch"
            ),

        home_news:
            getChecked(
                "homeNews"
            ),

        home_media:
            getChecked(
                "homeMedia"
            ),

        home_standings:
            getChecked(
                "homeStandings"
            ),

        home_products:
            getChecked(
                "homeProducts"
            )

    };


    for (
        const [key, value]
        of Object.entries(values)
    ) {

        await saveSetting(
            key,
            value
        );
    }


    toast(
        "Настройки сохранены"
    );


    await loadAllData();
}


/* =========================================================
   STORAGE UPLOAD
========================================================= */

async function uploadFile(
    file,
    folder = "uploads"
) {

    if (!file) {
        throw new Error(
            "Файл не выбран"
        );
    }


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


    const filename =
        `${Date.now()}_${safeName}`;


    const path =
        `${folder}/${filename}`;


    const result =
        await supabaseClient
            .storage
            .from(STORAGE_BUCKET)
            .upload(
                path,
                file,
                {
                    cacheControl: "3600",
                    upsert: false
                }
            );


    if (result.error) {
        throw result.error;
    }


    const publicData =
        supabaseClient
            .storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(path);


    return publicData.data.publicUrl;
}


/* =========================================================
   LOGO
========================================================= */

async function handleLogoUpload(file) {

    try {

        toast(
            "Загрузка логотипа..."
        );


        const url =
            await uploadFile(
                file,
                "branding"
            );


        await saveSetting(
            "logo_url",
            url
        );


        $("#logoPreview").innerHTML =
            `<img
                src="${escapeHTML(url)}"
                alt=""
            >`;


        toast(
            "Логотип загружен"
        );


        await loadAllData();

    } catch (error) {

        console.error(error);

        toast(
            error.message ||
            "Не удалось загрузить файл",
            "error"
        );
    }
}


/* =========================================================
   FONT UPLOAD
========================================================= */

async function handleFontUpload(
    type,
    file
) {

    try {

        toast(
            `Загрузка ${type}...`
        );


        const url =
            await uploadFile(
                file,
                "fonts"
            );


        await saveSetting(
            `font_${type}`,
            url
        );


        toast(
            "Шрифт загружен"
        );


        await loadAllData();

    } catch (error) {

        console.error(error);

        toast(
            error.message ||
            "Ошибка загрузки",
            "error"
        );
    }
}


/* =========================================================
   ICON UPLOAD
========================================================= */

async function handleIconUpload(
    type,
    file
) {

    try {

        const url =
            await uploadFile(
                file,
                "icons"
            );


        await saveSetting(
            `${type}_icon_url`,
            url
        );


        toast(
            "Иконка загружена"
        );


        await loadAllData();

    } catch (error) {

        console.error(error);

        toast(
            error.message ||
            "Ошибка загрузки",
            "error"
        );
    }
}


/* =========================================================
   GENERIC EMPTY
========================================================= */

function emptyHTML(text) {

    return `
        <div class="empty-state">
            ${escapeHTML(text)}
        </div>
    `;
}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

    $("#statMatches").textContent =
        state.data.matches.length;


    $("#statPlayers").textContent =
        state.data.players.length;


    $("#statNews").textContent =
        state.data.news.length;


    $("#statAlbums").textContent =
        state.data.albums.length;


    const played =
        state.data.matches
            .filter(isMatchPlayed)
            .sort(
                (a, b) =>
                    new Date(
                        matchDate(b) || 0
                    ) -
                    new Date(
                        matchDate(a) || 0
                    )
            );


    const container =
        $("#latestMatchDashboard");


    if (!played.length) {

        container.innerHTML =
            emptyHTML(
                "Сыгранных матчей пока нет"
            );

        return;
    }


    const match =
        played[0];


    container.innerHTML = `

        <div class="data-card">

            <div class="data-card-main">

                <div class="data-card-title">

                    ${escapeHTML(
                        homeTeam(match)
                    )}

                    <span style="color:#9aa1b3">
                        —
                    </span>

                    ${escapeHTML(
                        awayTeam(match)
                    )}

                </div>

                <div class="data-card-meta">

                    <span>
                        ${formatDateTime(
                            matchDate(match)
                        )}
                    </span>

                    <span>·</span>

                    <strong>
                        ${escapeHTML(
                            scoreText(match)
                        )}
                    </strong>

                </div>

            </div>

        </div>
    `;
}


/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderEverything() {

    renderDashboard();

    renderMatches();

    renderPlayers();

    renderNews();

    renderAlbums();

    renderStandings();

    renderProducts();

    renderExtras();

    loadDesignIntoForm();

    loadSettingsIntoForm();
}


/* =========================================================
   DELETE CONFIRMATION
========================================================= */

async function confirmDelete(
    table,
    id,
    message
) {

    if (!id) {

        toast(
            "Не найден ID записи",
            "error"
        );

        return;
    }


    const confirmed =
        window.confirm(
            message ||
            "Удалить эту запись?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await deleteRow(
            table,
            id
        );


        toast(
            "Удалено"
        );


        await loadAllData();

    } catch (error) {

        toast(
            error.message ||
            "Не удалось удалить",
            "error"
        );
    }
}


/* =========================================================
   EVENTS
========================================================= */

function setupEvents() {


    /* NAV */

    $$(".nav-item").forEach(button => {

        button.addEventListener(
            "click",
            () =>
                openTab(
                    button.dataset.tab
                )
        );

    });


    $$(".mobile-nav-item").forEach(button => {

        button.addEventListener(
            "click",
            () => {

                if (
                    button.id ===
                    "mobileMore"
                ) {

                    const sidebar =
                        $(".sidebar");

                    sidebar.classList.toggle(
                        "open"
                    );

                    return;
                }


                openTab(
                    button.dataset.tab
                );

            }
        );

    });


    $$(".quick-action")
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    openTab(
                        button.dataset.openTab
                    )
            );

        });


    /* MOBILE SIDEBAR */

    $("#mobileMenu")
        ?.addEventListener(
            "click",
            () => {

                $(".sidebar")
                    .classList.add(
                        "open"
                    );

            }
        );


    $("#sidebarClose")
        ?.addEventListener(
            "click",
            () => {

                $(".sidebar")
                    .classList.remove(
                        "open"
                    );

            }
        );


    /* MODAL */

    $("#modalClose")
        ?.addEventListener(
            "click",
            closeModal
        );


    $("#modalCancel")
        ?.addEventListener(
            "click",
            closeModal
        );


    $("#modalSave")
        ?.addEventListener(
            "click",
            saveModal
        );


    $("#modalOverlay")
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    $("#modalOverlay")
                ) {
                    closeModal();
                }

            }
        );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {
                closeModal();
            }

        }
    );


    /* TOP */

    $("#refreshData")
        ?.addEventListener(
            "click",
            async () => {

                toast(
                    "Обновление..."
                );

                await loadAllData();

                toast(
                    "Данные обновлены"
                );
            }
        );


    $("#openSite")
        ?.addEventListener(
            "click",
            () => {

                window.open(
                    "index.html",
                    "_blank"
                );

            }
        );


    /* MATCH */

    $("#addMatchButton")
        ?.addEventListener(
            "click",
            () =>
                openMatchModal()
        );


    $("#matchSearch")
        ?.addEventListener(
            "input",
            renderMatches
        );


    $("#matchFilter")
        ?.addEventListener(
            "change",
            renderMatches
        );


    /* PLAYER */

    $("#addPlayerButton")
        ?.addEventListener(
            "click",
            () =>
                openPlayerModal()
        );


    $("#playerSearch")
        ?.addEventListener(
            "input",
            renderPlayers
        );


    $("#playerPositionFilter")
        ?.addEventListener(
            "change",
            renderPlayers
        );


    /* NEWS */

    $("#addNewsButton")
        ?.addEventListener(
            "click",
            () =>
                openNewsModal()
        );


    $("#newsSearch")
        ?.addEventListener(
            "input",
            renderNews
        );


    $("#newsStatusFilter")
        ?.addEventListener(
            "change",
            renderNews
        );


    /* MEDIA */

    $("#addAlbumButton")
        ?.addEventListener(
            "click",
            () =>
                openAlbumModal()
        );


    /* STANDINGS */

    $("#addStandingButton")
        ?.addEventListener(
            "click",
            () =>
                openTeamModal()
        );


    /* PRODUCTS */

    $("#addProductButton")
        ?.addEventListener(
            "click",
            () =>
                openProductModal()
        );


    /* EXTRAS */

    $("#addAchievementButton")
        ?.addEventListener(
            "click",
            () =>
                openSimpleModal(
                    "achievement"
                )
        );


    $("#addBirthdayButton")
        ?.addEventListener(
            "click",
            () =>
                openSimpleModal(
                    "birthday"
                )
        );


    $("#addEventButton")
        ?.addEventListener(
            "click",
            () =>
                openSimpleModal(
                    "event"
                )
        );


    $("#addPeriodButton")
        ?.addEventListener(
            "click",
            () =>
                openSimpleModal(
                    "period"
                )
        );


    /* DESIGN */

    $("#saveDesignButton")
        ?.addEventListener(
            "click",
            async () => {

                try {

                    await saveDesign();

                } catch (error) {

                    toast(
                        error.message ||
                        "Ошибка сохранения",
                        "error"
                    );

                }

            }
        );


    /* SETTINGS */

    $("#saveSettingsButton")
        ?.addEventListener(
            "click",
            async () => {

                try {

                    await saveSettings();

                } catch (error) {

                    toast(
                        error.message ||
                        "Ошибка сохранения",
                        "error"
                    );

                }

            }
        );


    /* COLORS */

    [
        [
            "colorPrimary",
            "colorPrimaryText"
        ],
        [
            "colorAccent",
            "colorAccentText"
        ],
        [
            "colorDark",
            "colorDarkText"
        ],
        [
            "colorSecondary",
            "colorSecondaryText"
        ]

    ].forEach(
        ([colorId, textId]) => {

            const color =
                $(`#${colorId}`);

            const text =
                $(`#${textId}`);


            color?.addEventListener(
                "input",
                () => {

                    text.value =
                        color.value;

                }
            );


            text?.addEventListener(
                "input",
                () => {

                    if (
                        /^#[0-9a-f]{6}$/i
                            .test(
                                text.value
                            )
                    ) {

                        color.value =
                            text.value;

                    }

                }
            );

        }
    );


    /* LOGO */

    $("#logoUploadButton")
        ?.addEventListener(
            "click",
            () =>
                $("#logoFile").click()
        );


    $("#logoFile")
        ?.addEventListener(
            "change",
            event => {

                const file =
                    event.target.files?.[0];

                if (file) {

                    handleLogoUpload(
                        file
                    );

                }

            }
        );


    /* FONTS */

    $$(".font-upload button")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const type =
                        button.dataset.font;

                    const input =
                        $(
                            `[data-font-input="${type}"]`
                        );

                    input?.click();

                }
            );

        });


    $$(".font-input")
        .forEach(input => {

            input.addEventListener(
                "change",
                event => {

                    const file =
                        event.target.files?.[0];

                    if (!file) {
                        return;
                    }


                    handleFontUpload(
                        input.dataset.fontInput,
                        file
                    );

                }
            );

        });


    /* ICONS */

    $$(".icon-upload button")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const type =
                        button.dataset.icon;

                    const input =
                        $(
                            `[data-icon-input="${type}"]`
                        );

                    input?.click();

                }
            );

        });


    $$(".icon-input")
        .forEach(input => {

            input.addEventListener(
                "change",
                event => {

                    const file =
                        event.target.files?.[0];

                    if (!file) {
                        return;
                    }


                    handleIconUpload(
                        input.dataset.iconInput,
                        file
                    );

                }
            );

        });


    /* DELEGATED ACTIONS */

    document.addEventListener(
        "click",
        async event => {

            const target =
                event.target.closest(
                    "button"
                );


            if (!target) {
                return;
            }


            /* MATCH EDIT */

            if (
                target.dataset.editMatch
            ) {

                const item =
                    state.data.matches.find(
                        row =>
                            String(
                                getId(row)
                            ) ===
                            String(
                                target.dataset.editMatch
                            )
                    );


                if (item) {
                    openMatchModal(item);
                }

                return;
            }


            /* MATCH DELETE */

            if (
                target.dataset.deleteMatch
            ) {

                await confirmDelete(
                    TABLES.matches,
                    target.dataset.deleteMatch,
                    "Удалить матч?"
                );

                return;
            }


            /* PLAYER EDIT */

            if (
                target.dataset.editPlayer
            ) {

                const item =
                    state.data.players.find(
                        row =>
                            String(
                                getId(row)
                            ) ===
                            String(
                                target.dataset.editPlayer
                            )
                    );


                if (item) {
                    openPlayerModal(item);
                }

                return;
            }


            /* PLAYER DELETE */

            if (
                target.dataset.deletePlayer
            ) {

                await confirmDelete(
                    TABLES.players,
                    target.dataset.deletePlayer,
                    "Удалить игрока?"
                );

                return;
            }


            /* NEWS EDIT */

            if (
                target.dataset.editNews
            ) {

                const item =
                    state.data.news.find(
                        row =>
                            String(
                                getId(row)
                            ) ===
                            String(
                                target.dataset.editNews
                            )
                    );


                if (item) {
                    openNewsModal(item);
                }

                return;
            }


            /* NEWS DELETE */

            if (
                target.dataset.deleteNews
            ) {

                await confirmDelete(
                    TABLES.news,
                    target.dataset.deleteNews,
                    "Удалить новость?"
                );

                return;
            }


            /* ALBUM EDIT */

            if (
                target.dataset.editAlbum
            ) {

                const item =
                    state.data.albums.find(
                        row =>
                            String(
                                getId(row)
                            ) ===
                            String(
                                target.dataset.editAlbum
                            )
                    );


                if (item) {
                    openAlbumModal(item);
                }

                return;
            }


            /* ALBUM DELETE */

            if (
                target.dataset.deleteAlbum
            ) {

                await confirmDelete(
                    TABLES.albums,
                    target.dataset.deleteAlbum,
                    "Удалить альбом?"
                );

                return;
            }


            /* TEAM EDIT */

            if (
                target.dataset.editTeam
            ) {

                const item =
                    state.data.teams.find(
                        row =>
                            String(
                                getId(row)
                            ) ===
                            String(
                                target.dataset.editTeam
                            )
                    );


                if (item) {
                    openTeamModal(item);
                }

                return;
            }


            /* TEAM DELETE */

            if (
                target.dataset.deleteTeam
            ) {

                await confirmDelete(
                    TABLES.teams,
                    target.dataset.deleteTeam,
                    "Удалить команду?"
                );

                return;
            }


            /* PRODUCT EDIT */

            if (
                target.dataset.editProduct
            ) {

                const item =
                    state.data.products.find(
                        row =>
                            String(
                                getId(row)
                            ) ===
                            String(
                                target.dataset.editProduct
                            )
                    );


                if (item) {
                    openProductModal(item);
                }

                return;
            }


            /* PRODUCT DELETE */

            if (
                target.dataset.deleteProduct
            ) {

                await confirmDelete(
                    TABLES.products,
                    target.dataset.deleteProduct,
                    "Удалить товар?"
                );

                return;
            }


            /* SIMPLE */

            const simpleTypes = [
                "achievement",
                "birthday",
                "event",
                "period"
            ];


            for (
                const type
                of simpleTypes
            ) {

                const editKey =
                    `edit${capitalize(type)}`;

                const deleteKey =
                    `delete${capitalize(type)}`;


                if (
                    target.dataset[
                        editKey
                    ]
                ) {

                    const dataKey =
                        type === "achievement"
                            ? "achievements"
                            : type === "birthday"
                                ? "birthdays"
                                : type === "event"
                                    ? "events"
                                    : "periods";


                    const item =
                        state.data[dataKey]
                            .find(
                                row =>
                                    String(
                                        getId(row)
                                    ) ===
                                    String(
                                        target.dataset[
                                            editKey
                                        ]
                                    )
                            );


                    if (item) {

                        openSimpleModal(
                            type,
                            item
                        );

                    }


                    return;
                }


                if (
                    target.dataset[
                        deleteKey
                    ]
                ) {

                    const table =
                        type === "achievement"
                            ? TABLES.achievements
                            : type === "birthday"
                                ? TABLES.birthdays
                                : type === "event"
                                    ? TABLES.events
                                    : TABLES.periods;


                    await confirmDelete(
                        table,
                        target.dataset[
                            deleteKey
                        ],
                        "Удалить запись?"
                    );


                    return;
                }

            }

        }
    );

}


/* =========================================================
   CAPITALIZE
========================================================= */

function capitalize(value) {

    return value.charAt(0)
        .toUpperCase() +
        value.slice(1);
}


/* =========================================================
   INIT
========================================================= */

async function init() {

    setupEvents();


    openTab(
        "dashboard"
    );


    try {

        await loadAllData();

    } catch (error) {

        console.error(
            "INIT ERROR",
            error
        );


        setConnection(
            "offline",
            "Ошибка"
        );


        toast(
            "Не удалось загрузить данные",
            "error"
        );
    }

}


document.addEventListener(
    "DOMContentLoaded",
    init
);
