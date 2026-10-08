// ============================================================
// ХК ЧЕЛНЫ 2011
// CONFIG
// ============================================================

const SUPABASE_URL =
    "https://jxlbojosxaaqnyuzohnw.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_wNNvPktjjKpz3csoDMo3JA_4duyLAzL";

const STORAGE_BUCKET = "site-media";


// ============================================================
// ОСНОВНЫЕ НАСТРОЙКИ САЙТА
// ============================================================

const SITE_CONFIG = {

    teamName: "ХК Челны 2011",

    season: "2026/27",

    city: "Набережные Челны",

    colors: {
        primary: "#000056",
        secondary: "#0875dc",
        accent: "#ffcd00",
        white: "#ffffff"
    },

    fonts: {
        main: "Stapel",
        heading: "Stapel",
        secondary: "Stengazeta",
        third: "Christopher"
    },

    storage: {
        bucket: STORAGE_BUCKET,

        folders: {
            logo: "logo",
            players: "players",
            news: "news",
            matches: "matches",
            media: "media",
            products: "products",
            icons: "icons",
            fonts: "fonts"
        }
    },

    navigation: {
        home: "index.html",
        matches: "matches.html",
        roster: "roster.html",
        standings: "standings.html",
        news: "news.html",
        admin: "admin.html"
    }

};


// ============================================================
// SUPABASE CLIENT
// ============================================================

let db = null;

function initSupabase() {

    if (db) {
        return db;
    }

    if (
        !window.supabase ||
        !window.supabase.createClient
    ) {
        console.error(
            "Supabase JS не подключён."
        );

        return null;
    }

    db = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

    return db;
}


// ============================================================
// API
// ============================================================

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
        filters = [],
        order,
        limit,
        single = false,
        insert,
        update,
        upsert,
        delete: deleteRows = false
    } = options;

    let query = client
        .from(table);

    // SELECT

    if (insert !== undefined) {

        query = query.insert(insert);

    } else if (upsert !== undefined) {

        query = query.upsert(upsert);

    } else if (update !== undefined) {

        query = query.update(update);

    } else if (deleteRows) {

        query = query.delete();

    }

    // SELECT

    query = query.select(select);

    // FILTERS

    if (Array.isArray(filters)) {

        filters.forEach(filter => {

            if (!filter || !filter.column) {
                return;
            }

            const operator =
                filter.operator || "eq";

            const value =
                filter.value;

            if (
                operator === "eq"
            ) {
                query = query.eq(
                    filter.column,
                    value
                );
            }

            else if (
                operator === "neq"
            ) {
                query = query.neq(
                    filter.column,
                    value
                );
            }

            else if (
                operator === "gt"
            ) {
                query = query.gt(
                    filter.column,
                    value
                );
            }

            else if (
                operator === "gte"
            ) {
                query = query.gte(
                    filter.column,
                    value
                );
            }

            else if (
                operator === "lt"
            ) {
                query = query.lt(
                    filter.column,
                    value
                );
            }

            else if (
                operator === "lte"
            ) {
                query = query.lte(
                    filter.column,
                    value
                );
            }

            else if (
                operator === "ilike"
            ) {
                query = query.ilike(
                    filter.column,
                    value
                );
            }

            else if (
                operator === "in"
            ) {
                query = query.in(
                    filter.column,
                    value
                );
            }

        });

    }

    // ORDER

    if (order) {

        query = query.order(
            order.column,
            {
                ascending:
                    order.ascending !== false,
                nullsFirst:
                    order.nullsFirst ?? false
            }
        );

    }

    // LIMIT

    if (
        Number.isInteger(limit) &&
        limit > 0
    ) {

        query = query.limit(limit);

    }

    // SINGLE

    if (single) {
        query = query.maybeSingle();
    }

    const result =
        await query;

    if (result.error) {
        console.error(
            `Supabase error [${table}]:`,
            result.error
        );

        throw result.error;
    }

    return result.data;
}


// ============================================================
// STORAGE
// ============================================================

function getStorageUrl(path) {

    if (!path) {
        return "";
    }

    if (
        path.startsWith("http://") ||
        path.startsWith("https://") ||
        path.startsWith("data:")
    ) {
        return path;
    }

    return (
        `${SUPABASE_URL}` +
        `/storage/v1/object/public/` +
        `${STORAGE_BUCKET}/${path}`
    );
}


async function uploadFile(
    file,
    folder = "media"
) {

    const client = initSupabase();

    if (!client) {
        throw new Error(
            "Supabase не инициализирован."
        );
    }

    if (!file) {
        throw new Error(
            "Файл не выбран."
        );
    }

    const extension =
        file.name.includes(".")
            ? file.name
                .split(".")
                .pop()
                .toLowerCase()
            : "bin";

    const randomPart =
        Math.random()
            .toString(36)
            .substring(2, 10);

    const timestamp =
        Date.now();

    const safeFolder =
        String(folder)
            .replace(/[^a-zA-Z0-9/_-]/g, "");

    const path =
        `${safeFolder}/` +
        `${timestamp}_${randomPart}.${extension}`;

    const {
        error
    } = await client.storage
        .from(STORAGE_BUCKET)
        .upload(
            path,
            file,
            {
                cacheControl: "3600",
                upsert: false
            }
        );

    if (error) {
        console.error(
            "Ошибка загрузки файла:",
            error
        );

        throw error;
    }

    return {
        path,
        url: getStorageUrl(path)
    };
}


async function deleteFile(path) {

    if (!path) {
        return;
    }

    // Если это полный URL —
    // пытаемся достать путь после bucket.

    let storagePath = path;

    const marker =
        `/object/public/${STORAGE_BUCKET}/`;

    if (path.includes(marker)) {

        storagePath =
            path.split(marker)[1];

    }

    const client =
        initSupabase();

    if (!client) {
        throw new Error(
            "Supabase не инициализирован."
        );
    }

    const {
        error
    } = await client.storage
        .from(STORAGE_BUCKET)
        .remove([
            storagePath
        ]);

    if (error) {
        console.error(
            "Ошибка удаления файла:",
            error
        );

        throw error;
    }
}


// ============================================================
// SETTINGS
// ============================================================

let siteSettings = {};


async function loadSettings() {

    try {

        const data =
            await apiRequest(
                "settings",
                {
                    select: "*"
                }
            );

        siteSettings = {};

        (data || []).forEach(item => {

            const key =
                item.key ||
                item.name;

            if (!key) {
                return;
            }

            siteSettings[key] =
                item.value;
        });

        return siteSettings;

    } catch (error) {

        console.error(
            "Не удалось загрузить settings:",
            error
        );

        return {};
    }
}


function getSetting(
    key,
    fallback = ""
) {

    if (
        siteSettings &&
        siteSettings[key] !== undefined &&
        siteSettings[key] !== null
    ) {
        return siteSettings[key];
    }

    return fallback;
}


async function saveSetting(
    key,
    value
) {

    const client =
        initSupabase();

    if (!client) {
        throw new Error(
            "Supabase не инициализирован."
        );
    }

    const existing =
        await client
            .from("settings")
            .select("id")
            .or(
                `key.eq.${key},name.eq.${key}`
            )
            .limit(1)
            .maybeSingle();

    if (existing.error) {
        throw existing.error;
    }

    let result;

    if (existing.data) {

        result =
            await client
                .from("settings")
                .update({
                    value: String(value)
                })
                .eq(
                    "id",
                    existing.data.id
                );

    } else {

        result =
            await client
                .from("settings")
                .insert({
                    key,
                    value: String(value)
                });
    }

    if (result.error) {
        throw result.error;
    }

    siteSettings[key] =
        String(value);

    return true;
}


// ============================================================
// AUTH
// ============================================================

async function getSession() {

    const client =
        initSupabase();

    if (!client) {
        return null;
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

        return null;
    }

    return data.session;
}


async function signIn(
    email,
    password
) {

    const client =
        initSupabase();

    if (!client) {
        throw new Error(
            "Supabase не инициализирован."
        );
    }

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

    return data;
}


async function signOut() {

    const client =
        initSupabase();

    if (!client) {
        return;
    }

    const {
        error
    } = await client.auth.signOut();

    if (error) {
        throw error;
    }
}


// ============================================================
// COMMON HELPERS
// ============================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatDate(
    value,
    options = {}
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
        return String(value);
    }

    return date.toLocaleDateString(
        "ru-RU",
        {
            day: "numeric",
            month: "long",
            year: "numeric",
            ...options
        }
    );
}


function formatDateShort(
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
        return String(value);
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


function formatTime(value) {

    if (!value) {
        return "";
    }

    return String(value)
        .slice(0, 5);
}


function showToast(
    message,
    type = "success"
) {

    let toast =
        document.getElementById(
            "globalToast"
        );

    if (!toast) {

        toast =
            document.createElement(
                "div"
            );

        toast.id =
            "globalToast";

        toast.style.cssText = `
            position: fixed;
            left: 16px;
            right: 16px;
            bottom: calc(20px + env(safe-area-inset-bottom));
            z-index: 99999;
            padding: 14px 16px;
            border-radius: 15px;
            color: #fff;
            background: #000056;
            font: 700 13px Arial,sans-serif;
            box-shadow: 0 12px 30px rgba(0,0,0,.22);
            text-align: center;
            transform: translateY(20px);
            opacity: 0;
            transition: .2s ease;
        `;

        document.body.appendChild(
            toast
        );
    }

    toast.textContent =
        message;

    toast.style.background =
        type === "error"
            ? "#c62828"
            : type === "warning"
                ? "#8a6500"
                : "#000056";

    requestAnimationFrame(() => {

        toast.style.transform =
            "translateY(0)";

        toast.style.opacity =
            "1";
    });

    clearTimeout(
        toast._timer
    );

    toast._timer =
        setTimeout(() => {

            toast.style.transform =
                "translateY(20px)";

            toast.style.opacity =
                "0";

        }, 2600);
}


// ============================================================
// PAGE NAVIGATION
// ============================================================

function goTo(
    page,
    params = {}
) {

    const url =
        new URL(
            page,
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
        url.toString();
}


// ============================================================
// APPLY DESIGN
// ============================================================

function applySiteColors() {

    const root =
        document.documentElement;

    root.style.setProperty(
        "--primary",
        getSetting(
            "color_primary",
            SITE_CONFIG.colors.primary
        )
    );

    root.style.setProperty(
        "--secondary",
        getSetting(
            "color_secondary",
            SITE_CONFIG.colors.secondary
        )
    );

    root.style.setProperty(
        "--accent",
        getSetting(
            "color_accent",
            SITE_CONFIG.colors.accent
        )
    );

    root.style.setProperty(
        "--white",
        getSetting(
            "color_white",
            SITE_CONFIG.colors.white
        )
    );
}


function applySiteFonts() {

    const root =
        document.documentElement;

    root.style.setProperty(
        "--font-main",
        getSetting(
            "font_main",
            SITE_CONFIG.fonts.main
        )
    );

    root.style.setProperty(
        "--font-heading",
        getSetting(
            "font_heading",
            SITE_CONFIG.fonts.heading
        )
    );

    root.style.setProperty(
        "--font-secondary",
        getSetting(
            "font_secondary",
            SITE_CONFIG.fonts.secondary
        )
    );

    root.style.setProperty(
        "--font-third",
        getSetting(
            "font_third",
            SITE_CONFIG.fonts.third
        )
    );
}


async function initializeSite() {

    initSupabase();

    await loadSettings();

    applySiteColors();
    applySiteFonts();

    return {
        settings: siteSettings,
        config: SITE_CONFIG
    };
}


// ============================================================
// EXPORT-LIKE GLOBAL OBJECT
// ============================================================

window.SiteConfig = SITE_CONFIG;

window.HK = {
    db,
    initSupabase,
    apiRequest,

    getStorageUrl,
    uploadFile,
    deleteFile,

    loadSettings,
    getSetting,
    saveSetting,

    getSession,
    signIn,
    signOut,

    escapeHTML,
    formatDate,
    formatDateShort,
    formatTime,

    showToast,
    goTo,

    applySiteColors,
    applySiteFonts,
    initializeSite
};
