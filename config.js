const SUPABASE_URL = "https://jxlbojosxaaqnyuzohnw.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_wNNvPktjjKpz3csoDMo3JA_4duyLAzL";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const STORAGE_BUCKET = "site-media";

const DEFAULT_SETTINGS = {
    team_name: "Челны 2011",
    team_subtitle: "хоккейный клуб",

    primary_color: "#000056",
    secondary_color: "#0875dc",
    accent_color: "#ffcd00",
    background_color: "#ffffff",
    text_color: "#000056",

    logo_url: "",
    menu_icon_url: ""
};

async function getSettings() {
    const { data, error } = await supabaseClient
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

    if (error) {
        console.error("Ошибка настроек:", error);
        return DEFAULT_SETTINGS;
    }

    return {
        ...DEFAULT_SETTINGS,
        ...(data || {})
    };
}

function publicFile(path) {
    if (!path) return "";

    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    return supabaseClient
        .storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path)
        .data.publicUrl;
}

async function uploadFile(file, folder = "general") {
    if (!file) return null;

    const extension =
        file.name.split(".").pop().toLowerCase();

    const fileName =
        `${folder}/${crypto.randomUUID()}.${extension}`;

    const { data, error } = await supabaseClient
        .storage
        .from(STORAGE_BUCKET)
        .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type
        });

    if (error) {
        console.error(error);
        throw error;
    }

    return data.path;
}

function applySettings(settings) {
    document.documentElement.style.setProperty(
        "--primary",
        settings.primary_color
    );

    document.documentElement.style.setProperty(
        "--secondary",
        settings.secondary_color
    );

    document.documentElement.style.setProperty(
        "--accent",
        settings.accent_color
    );

    document.documentElement.style.setProperty(
        "--background",
        settings.background_color
    );

    document.documentElement.style.setProperty(
        "--text",
        settings.text_color
    );

    document.querySelectorAll("[data-team-name]")
        .forEach(el => {
            el.textContent = settings.team_name;
        });

    document.querySelectorAll("[data-team-subtitle]")
        .forEach(el => {
            el.textContent = settings.team_subtitle;
        });

    document.querySelectorAll("[data-team-logo]")
        .forEach(el => {
            if (settings.logo_url) {
                el.src = publicFile(settings.logo_url);
            }
        });
}
