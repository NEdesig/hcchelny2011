// ============================================================
// ХК ЧЕЛНЫ 2011 — CONFIG
// ============================================================

const SUPABASE_URL = "https://jxlbojosxaaqnyuzohnw.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_wNNvPktjjKpz3csoDMo3JA_4duyLAzL";

const STORAGE_BUCKET = "site-media";

// Создаём клиент Supabase.
// Используется ТОЛЬКО publishable key.
// service_role сюда НИКОГДА не добавлять.

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

// Делаем клиент доступным для app.js/admin.js
window.supabaseClient = supabaseClient;


// ============================================================
// НАСТРОЙКИ ПО УМОЛЧАНИЮ
// ============================================================

const DEFAULT_SETTINGS = {
    team_name: "Челны 2011",
    subtitle: "хоккейный клуб",
    city: "Набережные Челны",

    primary_color: "#000056",
    accent_color: "#0875dc",
    gold_color: "#ffcd00",
    white_color: "#ffffff",

    logo_path: null
};


// ============================================================
// ПОЛУЧЕНИЕ НАСТРОЕК
// ============================================================

async function getSettings() {
    const { data, error } = await supabaseClient
        .from("site_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("Ошибка загрузки настроек:", error);
        return { ...DEFAULT_SETTINGS };
    }

    return {
        ...DEFAULT_SETTINGS,
        ...(data || {})
    };
}


// ============================================================
// ПУБЛИЧНАЯ ССЫЛКА НА ФАЙЛ STORAGE
// ============================================================

function publicFile(path) {
    if (!path) return "";

    const { data } = supabaseClient
        .storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);

    return data?.publicUrl || "";
}


// ============================================================
// ЗАГРУЗКА ФАЙЛА
// ============================================================

async function uploadFile(file, folder = "uploads") {
    if (!file) return null;

    const extension =
        file.name.includes(".")
            ? file.name.split(".").pop().toLowerCase()
            : "jpg";

    const randomName =
        `${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const path = `${folder}/${randomName}`;

    const { error } = await supabaseClient
        .storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
            cacheControl: "3600",
            upsert: false
        });

    if (error) {
        console.error("Ошибка загрузки файла:", error);
        throw error;
    }

    return path;
}


// ============================================================
// ПРИМЕНЕНИЕ ЦВЕТОВ
// ============================================================

function applySettings(settings) {
    const root = document.documentElement;

    root.style.setProperty(
        "--primary",
        settings.primary_color || DEFAULT_SETTINGS.primary_color
    );

    root.style.setProperty(
        "--accent",
        settings.accent_color || DEFAULT_SETTINGS.accent_color
    );

    root.style.setProperty(
        "--gold",
        settings.gold_color || DEFAULT_SETTINGS.gold_color
    );

    root.style.setProperty(
        "--white",
        settings.white_color || DEFAULT_SETTINGS.white_color
    );
}
