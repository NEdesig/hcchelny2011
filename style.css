// ======================================================
// ХК ЧЕЛНЫ 2011 — CONFIG
// ======================================================

const SITE_CONFIG = {

    // --------------------------------------------------
    // SUPABASE
    // --------------------------------------------------

    supabaseUrl:
        "https://jxlbojosxaaqnyuzohnw.supabase.co",

    supabaseKey:
        "sb_publishable_wNNvPktjjKpz3csoDMo3JA_4duyLAzL",

    storageBucket:
        "site-media",


    // --------------------------------------------------
    // КОМАНДА
    // --------------------------------------------------

    teamName:
        "ХК Челны 2011",

    shortTeamName:
        "Челны",

    season:
        "2026/27",

    birthYear:
        "2011",


    // --------------------------------------------------
    // ЦВЕТА
    // --------------------------------------------------

    colors: {

        primary:
            "#000056",

        secondary:
            "#0875dc",

        accent:
            "#ffcd00",

        white:
            "#ffffff",

        background:
            "#050b22",

        surface:
            "#0d1738",

        text:
            "#ffffff",

        muted:
            "#aab5d5"
    },


    // --------------------------------------------------
    // ШРИФТЫ
    // --------------------------------------------------

    fonts: {

        main:
            "Stapel",

        heading:
            "Stapel",

        secondary:
            "Stengazeta",

        third:
            "Christopher"
    },


    // --------------------------------------------------
    // СТАНДАРТНЫЕ НАСТРОЙКИ
    // --------------------------------------------------

    defaults: {

        logo:
            "",

        title:
            "ХК ЧЕЛНЫ",

        subtitle:
            "СЕЗОН 2026/27 · 2011 ГОД",

        city:
            "НАБЕРЕЖНЫЕ ЧЕЛНЫ"
    },


    // --------------------------------------------------
    // СТРАНИЦЫ
    // --------------------------------------------------

    pages: {

        home:
            "index.html",

        matches:
            "matches.html",

        match:
            "match.html",

        news:
            "news.html",

        roster:
            "roster.html",

        player:
            "player.html",

        standings:
            "standings.html",

        media:
            "media.html",

        products:
            "products.html",

        team:
            "team.html",

        referees:
            "referees.html",

        teams:
            "teams.html",

        admin:
            "admin.html"
    }
};


// ======================================================
// SUPABASE CLIENT
// ======================================================

let db = null;

function initSupabase() {

    if (typeof supabase === "undefined") {
        console.error(
            "Supabase JS не подключён."
        );

        return null;
    }

    if (!db) {

        db = supabase.createClient(
            SITE_CONFIG.supabaseUrl,
            SITE_CONFIG.supabaseKey
        );
    }

    return db;
}


// ======================================================
// STORAGE
// ======================================================

function getStorageUrl(path) {

    if (!path) {
        return "";
    }

    // Если уже полноценная ссылка
    if (
        path.startsWith("http://") ||
        path.startsWith("https://") ||
        path.startsWith("data:")
    ) {
        return path;
    }

    return (
        SITE_CONFIG.supabaseUrl +
        "/storage/v1/object/public/" +
        SITE_CONFIG.storageBucket +
        "/" +
        path
    );
}


// ======================================================
// API
// ======================================================

async function apiRequest(
    table,
    options = {}
) {

    const client = initSupabase();

    if (!client) {
        throw new Error(
            "Supabase не инициализирован."
        );
    }

    const {

        select = "*",

        filters = {},

        order,

        limit,

        single = false

    } = options;


    let query = client
        .from(table)
        .select(select);


    // Фильтры
    Object.entries(filters).forEach(
        ([key, value]) => {

            if (
                value !== undefined &&
                value !== null &&
                value !== ""
            ) {

                query = query.eq(
                    key,
                    value
                );
            }
        }
    );


    // Сортировка
    if (order) {

        query = query.order(
            order.column,
            {
                ascending:
                    order.ascending !== false
            }
        );
    }


    // Лимит
    if (limit) {
        query = query.limit(limit);
    }


    // Одна запись
    if (single) {
        query = query.single();
    }


    const {
        data,
        error
    } = await query;


    if (error) {
        console.error(
            `Ошибка таблицы ${table}:`,
            error
        );

        throw error;
    }


    return data;
}


// ======================================================
// УВЕДОМЛЕНИЯ
// ======================================================

function showToast(
    message,
    type = "success"
) {

    let toast =
        document.querySelector(
            ".site-toast"
        );


    if (!toast) {

        toast =
            document.createElement(
                "div"
            );

        toast.className =
            "site-toast";

        document.body.appendChild(
            toast
        );
    }


    toast.textContent =
        message;


    toast.dataset.type =
        type;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        window.__toastTimer
    );


    window.__toastTimer =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 3000);
}


// ======================================================
// ФОРМАТ ДАТЫ
// ======================================================

function formatDate(
    value
) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
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


// ======================================================
// ФОРМАТ ВРЕМЕНИ
// ======================================================

function formatTime(
    value
) {

    if (!value) {
        return "—";
    }


    if (
        typeof value === "string" &&
        /^\d{2}:\d{2}/.test(value)
    ) {

        return value.slice(
            0,
            5
        );
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
    }


    return date.toLocaleTimeString(
        "ru-RU",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


// ======================================================
// ДЕНЬ НЕДЕЛИ
// ======================================================

function getWeekday(
    value
) {

    if (!value) {
        return "";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }


    return date.toLocaleDateString(
        "ru-RU",
        {
            weekday: "long"
        }
    );
}


// ======================================================
// ЭКРАНИРОВАНИЕ HTML
// ======================================================

function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


// ======================================================
// URL ПАРАМЕТР
// ======================================================

function getQueryParam(
    name
) {

    const params =
        new URLSearchParams(
            window.location.search
        );


    return params.get(
        name
    );
}


// ======================================================
// НАВИГАЦИЯ
// ======================================================

function goTo(
    page,
    params = {}
) {

    const url =
        new URL(
            SITE_CONFIG.pages[page] || page,
            window.location.href
        );


    Object.entries(params)
        .forEach(
            ([key, value]) => {

                if (
                    value !== undefined &&
                    value !== null
                ) {

                    url.searchParams.set(
                        key,
                        value
                    );
                }
            }
        );


    window.location.href =
        url.href;
}


// ======================================================
// CSS-ПЕРЕМЕННЫЕ
// ======================================================

function applyDefaultColors() {

    const root =
        document.documentElement;


    root.style.setProperty(
        "--primary",
        SITE_CONFIG.colors.primary
    );

    root.style.setProperty(
        "--secondary",
        SITE_CONFIG.colors.secondary
    );

    root.style.setProperty(
        "--accent",
        SITE_CONFIG.colors.accent
    );

    root.style.setProperty(
        "--white",
        SITE_CONFIG.colors.white
    );

    root.style.setProperty(
        "--background",
        SITE_CONFIG.colors.background
    );

    root.style.setProperty(
        "--surface",
        SITE_CONFIG.colors.surface
    );

    root.style.setProperty(
        "--text",
        SITE_CONFIG.colors.text
    );

    root.style.setProperty(
        "--muted",
        SITE_CONFIG.colors.muted
    );
}


// ======================================================
// INIT
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        applyDefaultColors();

        initSupabase();

    }
);
