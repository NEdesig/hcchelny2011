/* =========================================================
   ХК ЧЕЛНЫ 2011 — ADMIN.JS
========================================================= */

"use strict";

/* =========================================================
   GLOBAL STATE
========================================================= */

let currentUser = null;
let currentSection = "dashboard";

let editingId = null;
let currentModalType = null;

let newsCache = [];
let storiesCache = [];
let clubsCache = [];
let matchesCache = [];
let standingsCache = [];
let statsCache = [];
let leadersCache = [];
let albumsCache = [];

let currentStatType = "scorers";

/* =========================================================
   HELPERS
========================================================= */

const $ = (selector, parent = document) =>
    parent.querySelector(selector);

const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

function escapeHtml(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(date, withTime = false) {
    if (!date) return "—";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) return "—";

    const result = d.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });

    if (!withTime) return result;

    return `${result} ${d.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit"
    })}`;
}

function formatDateInput(date) {
    if (!date) return "";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) return "";

    const local = new Date(
        d.getTime() - d.getTimezoneOffset() * 60000
    );

    return local.toISOString().slice(0, 16);
}

function uuid() {
    return crypto.randomUUID();
}

function showToast(message, type = "success") {
    let container = $(".toast-container");

    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(8px)";

        setTimeout(() => toast.remove(), 250);
    }, 3000);
}

function setLoading(element, text = "Загрузка...") {
    if (!element) return;

    element.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            ${escapeHtml(text)}
        </div>
    `;
}

function emptyState(title = "Пока ничего нет", text = "") {
    return `
        <div class="empty-state">
            <div class="empty-icon">+</div>
            <div class="empty-title">${escapeHtml(title)}</div>
            ${
                text
                    ? `<div class="empty-text">${escapeHtml(text)}</div>`
                    : ""
            }
        </div>
    `;
}

function getImageUrl(path) {
    if (!path) return "";

    if (
        path.startsWith("http://") ||
        path.startsWith("https://")
    ) {
        return path;
    }

    if (typeof publicFile === "function") {
        return publicFile(path);
    }

    return path;
}

/* =========================================================
   SUPABASE ERROR HANDLER
========================================================= */

function handleError(error, fallback = "Произошла ошибка") {
    console.error(error);

    const message =
        error?.message ||
        error?.error_description ||
        fallback;

    showToast(message, "error");

    return message;
}

/* =========================================================
   AUTH
========================================================= */

async function checkAuth() {
    try {
        const {
            data,
            error
        } = await supabase.auth.getSession();

        if (error) throw error;

        if (data?.session?.user) {
            currentUser = data.session.user;
            showAdmin();
            await loadDashboard();
            return;
        }

        showAuth();
    } catch (error) {
        handleError(error, "Не удалось проверить авторизацию");
        showAuth();
    }
}

function showAuth() {
    const authScreen = $("#authScreen");
    const adminLayout = $("#adminLayout");

    if (authScreen) authScreen.style.display = "flex";
    if (adminLayout) adminLayout.style.display = "none";
}

function showAdmin() {
    const authScreen = $("#authScreen");
    const adminLayout = $("#adminLayout");

    if (authScreen) authScreen.style.display = "none";
    if (adminLayout) adminLayout.style.display = "block";
}

async function login(event) {
    event.preventDefault();

    const form = event.currentTarget;

    const email = $("#loginEmail")?.value.trim();
    const password = $("#loginPassword")?.value;

    const errorElement = $("#authError");

    if (errorElement) {
        errorElement.style.display = "none";
        errorElement.textContent = "";
    }

    if (!email || !password) {
        if (errorElement) {
            errorElement.textContent =
                "Введите email и пароль";
            errorElement.style.display = "block";
        }

        return;
    }

    const button =
        form.querySelector("button[type='submit']");

    const oldText = button?.textContent;

    if (button) {
        button.disabled = true;
        button.textContent = "Вход...";
    }

    try {
        const {
            data,
            error
        } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        currentUser = data.user;

        showAdmin();

        await loadDashboard();

        showToast("Вы успешно вошли");
    } catch (error) {
        console.error(error);

        if (errorElement) {
            errorElement.textContent =
                "Неверный email или пароль";
            errorElement.style.display = "block";
        }
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = oldText || "Войти";
        }
    }
}

async function logout() {
    try {
        await supabase.auth.signOut();

        currentUser = null;

        showAuth();

        showToast("Вы вышли из аккаунта");
    } catch (error) {
        handleError(error, "Не удалось выйти");
    }
}

/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {
    $$(".sidebar-link").forEach(link => {
        link.addEventListener("click", () => {
            const section = link.dataset.section;

            if (!section) return;

            openSection(section);
        });
    });

    $("#mobileMenuButton")?.addEventListener(
        "click",
        toggleSidebar
    );

    $("#sidebarOverlay")?.addEventListener(
        "click",
        closeSidebar
    );
}

function openSection(section) {
    currentSection = section;

    $$(".sidebar-link").forEach(link => {
        link.classList.toggle(
            "active",
            link.dataset.section === section
        );
    });

    $$(".admin-section").forEach(item => {
        item.classList.toggle(
            "active",
            item.id === `section-${section}`
        );
    });

    const title = $(`[data-section-title="${section}"]`);

    if (title) {
        const topbarTitle = $("#topbarTitle");

        if (topbarTitle) {
            topbarTitle.textContent =
                title.textContent;
        }
    }

    closeSidebar();

    switch (section) {
        case "dashboard":
            loadDashboard();
            break;

        case "settings":
            loadSettings();
            break;

        case "news":
            loadNews();
            break;

        case "stories":
            loadStories();
            break;

        case "clubs":
            loadClubs();
            break;

        case "matches":
            loadMatches();
            break;

        case "competition":
            loadCompetition();
            break;

        case "stats":
            loadStats(currentStatType);
            break;

        case "leaders":
            loadLeaders();
            break;

        case "albums":
            loadAlbums();
            break;
    }
}

function toggleSidebar() {
    $(".sidebar")?.classList.toggle("open");
    $("#sidebarOverlay")?.classList.toggle("active");
}

function closeSidebar() {
    $(".sidebar")?.classList.remove("open");
    $("#sidebarOverlay")?.classList.remove("active");
}

/* =========================================================
   MODAL
========================================================= */

function openModal({
    title,
    body,
    footer = "",
    large = false
}) {
    const modal = $("#adminModal");

    if (!modal) return;

    const dialog = modal.querySelector(".modal-dialog");

    if (dialog) {
        dialog.classList.toggle("large", large);
    }

    const titleElement =
        modal.querySelector(".modal-title");

    const bodyElement =
        modal.querySelector(".modal-body");

    const footerElement =
        modal.querySelector(".modal-footer");

    if (titleElement) {
        titleElement.textContent = title || "";
    }

    if (bodyElement) {
        bodyElement.innerHTML = body || "";
    }

    if (footerElement) {
        footerElement.innerHTML = footer || "";
    }

    modal.classList.add("active");

    currentModalType = title || null;
}

function closeModal() {
    const modal = $("#adminModal");

    if (!modal) return;

    modal.classList.remove("active");

    currentModalType = null;
    editingId = null;
}

function setupModal() {
    $("#modalClose")?.addEventListener(
        "click",
        closeModal
    );

    $("#adminModal")?.addEventListener("click", event => {
        if (event.target.id === "adminModal") {
            closeModal();
        }
    });
}

/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {
    try {
        const [
            news,
            stories,
            clubs,
            matches
        ] = await Promise.all([
            getCount("news"),
            getCount("stories"),
            getCount("clubs"),
            getCount("matches")
        ]);

        setText("#dashboardNewsCount", news);
        setText("#dashboardStoriesCount", stories);
        setText("#dashboardClubsCount", clubs);
        setText("#dashboardMatchesCount", matches);

        await loadDashboardNextMatch();
    } catch (error) {
        handleError(
            error,
            "Не удалось загрузить панель управления"
        );
    }
}

async function getCount(table) {
    const {
        count,
        error
    } = await supabase
        .from(table)
        .select("*", {
            count: "exact",
            head: true
        });

    if (error) throw error;

    return count || 0;
}

async function loadDashboardNextMatch() {
    const container = $("#dashboardNextMatch");

    if (!container) return;

    const now = new Date().toISOString();

    const {
        data,
        error
    } = await supabase
        .from("matches")
        .select(`
            *,
            home:clubs!matches_home_club_id_fkey(*),
            away:clubs!matches_away_club_id_fkey(*)
        `)
        .eq("status", "planned")
        .gte("match_date", now)
        .order("match_date", {
            ascending: true
        })
        .limit(1);

    if (error) {
        container.innerHTML = emptyState(
            "Ошибка",
            error.message
        );
        return;
    }

    const match = data?.[0];

    if (!match) {
        container.innerHTML = emptyState(
            "Ближайшего матча нет",
            "Добавьте матч в разделе «Матчи»."
        );
        return;
    }

    container.innerHTML = `
        <div class="match-teams">
            <div class="match-team">
                ${
                    match.home?.logo
                        ? `
                            <img
                                class="match-team-logo"
                                src="${escapeHtml(
                                    getImageUrl(match.home.logo)
                                )}"
                                alt=""
                            >
                        `
                        : ""
                }

                <div class="match-team-name">
                    ${escapeHtml(match.home?.name || "Хозяева")}
                </div>
            </div>

            <div class="match-vs">
                VS
            </div>

            <div class="match-team">
                ${
                    match.away?.logo
                        ? `
                            <img
                                class="match-team-logo"
                                src="${escapeHtml(
                                    getImageUrl(match.away.logo)
                                )}"
                                alt=""
                            >
                        `
                        : ""
                }

                <div class="match-team-name">
                    ${escapeHtml(match.away?.name || "Гости")}
                </div>
            </div>
        </div>

        <div class="text-center mt-15">
            <strong>
                ${formatDate(match.match_date, true)}
            </strong>

            ${
                match.venue
                    ? `
                        <div class="text-muted mt-10">
                            ${escapeHtml(match.venue)}
                        </div>
                    `
                    : ""
            }
        </div>
    `;
}

/* =========================================================
   SETTINGS
========================================================= */

async function loadSettings() {
    try {
        const settings =
            typeof getSettings === "function"
                ? await getSettings()
                : null;

        if (!settings) return;

        setInput(
            "#settingTeamName",
            settings.team_name
        );

        setInput(
            "#settingSubtitle",
            settings.subtitle
        );

        setInput(
            "#settingCity",
            settings.city
        );

        setInput(
            "#settingPrimary",
            settings.primary_color || "#000056"
        );

        setInput(
            "#settingBlue",
            settings.blue_color || "#0875dc"
        );

        setInput(
            "#settingYellow",
            settings.yellow_color || "#ffcd00"
        );

        setInput(
            "#settingWhite",
            settings.white_color || "#ffffff"
        );

        const logoPreview = $("#settingsLogoPreview");

        if (
            logoPreview &&
            settings.logo
        ) {
            logoPreview.innerHTML = `
                <img
                    src="${escapeHtml(
                        getImageUrl(settings.logo)
                    )}"
                    alt=""
                >
            `;
        }
    } catch (error) {
        handleError(
            error,
            "Не удалось загрузить настройки"
        );
    }
}

async function saveSettings(event) {
    event?.preventDefault();

    const data = {
        id: "00000000-0000-0000-0000-000000000001",

        team_name:
            $("#settingTeamName")?.value.trim() ||
            "ХК Челны 2011",

        subtitle:
            $("#settingSubtitle")?.value.trim() ||
            "хоккейный клуб",

        city:
            $("#settingCity")?.value.trim() ||
            "Набережные Челны",

        primary_color:
            $("#settingPrimary")?.value ||
            "#000056",

        blue_color:
            $("#settingBlue")?.value ||
            "#0875dc",

        yellow_color:
            $("#settingYellow")?.value ||
            "#ffcd00",

        white_color:
            $("#settingWhite")?.value ||
            "#ffffff"
    };

    const logoFile =
        $("#settingLogo")?.files?.[0];

    try {
        if (logoFile) {
            data.logo =
                await uploadFile(
                    logoFile,
                    "settings"
                );
        }

        const {
            error
        } = await supabase
            .from("site_settings")
            .upsert(data);

        if (error) throw error;

        showToast("Настройки сохранены");

        await loadSettings();
    } catch (error) {
        handleError(
            error,
            "Не удалось сохранить настройки"
        );
    }
}

/* =========================================================
   NEWS
========================================================= */

async function loadNews() {
    const container = $("#newsList");

    if (!container) return;

    setLoading(container);

    const {
        data,
        error
    } = await supabase
        .from("news")
        .select("*")
        .order("published_at", {
            ascending: false
        });

    if (error) {
        container.innerHTML =
            emptyState("Ошибка", error.message);
        return;
    }

    newsCache = data || [];

    if (!newsCache.length) {
        container.innerHTML = emptyState(
            "Новостей пока нет",
            "Создайте первую новость."
        );
        return;
    }

    container.innerHTML = newsCache.map(item => `
        <div class="admin-list-item">

            ${
                item.image
                    ? `
                        <img
                            class="admin-list-image"
                            src="${escapeHtml(
                                getImageUrl(item.image)
                            )}"
                            alt=""
                        >
                    `
                    : `
                        <div class="admin-list-image"></div>
                    `
            }

            <div class="admin-list-content">

                <div class="admin-list-title">
                    ${escapeHtml(item.title)}
                </div>

                <div class="admin-list-meta">
                    ${
                        item.tag
                            ? escapeHtml(item.tag) + " · "
                            : ""
                    }

                    ${formatDate(
                        item.published_at,
                        true
                    )}
                </div>

            </div>

            <div class="admin-list-actions">
                <button
                    class="btn btn-secondary btn-small"
                    onclick="editNews('${item.id}')"
                >
                    Изменить
                </button>

                <button
                    class="btn btn-danger btn-small"
                    onclick="deleteNews('${item.id}')"
                >
                    Удалить
                </button>
            </div>

        </div>
    `).join("");
}

function openNewsModal(id = null) {
    editingId = id;

    const item =
        id
            ? newsCache.find(x => x.id === id)
            : null;

    openModal({
        title: id
            ? "Редактирование новости"
            : "Новая новость",

        large: true,

        body: `
            <form id="newsForm">

                <div class="field-row">

                    <div class="field">
                        <label>Заголовок</label>
                        <input
                            class="input"
                            id="newsTitle"
                            required
                            value="${escapeHtml(
                                item?.title || ""
                            )}"
                        >
                    </div>

                    <div class="field">
                        <label>Тег</label>
                        <input
                            class="input"
                            id="newsTag"
                            placeholder="Новости"
                            value="${escapeHtml(
                                item?.tag || ""
                            )}"
                        >
                    </div>

                </div>

                <div class="field">
                    <label>Дата и время</label>

                    <input
                        class="input"
                        type="datetime-local"
                        id="newsDate"
                        value="${formatDateInput(
                            item?.published_at ||
                            new Date()
                        )}"
                    >
                </div>

                <div class="field">
                    <label>Текст новости</label>

                    <textarea
                        class="textarea"
                        id="newsText"
                        required
                    >${escapeHtml(
                        item?.content ||
                        item?.text ||
                        ""
                    )}</textarea>
                </div>

                <div class="field">

                    <label>Изображение</label>

                    <label class="file-input">

                        <input
                            type="file"
                            id="newsImage"
                            accept="image/*"
                        >

                        <div class="file-input-content">

                            <div class="file-input-icon">
                                +
                            </div>

                            <div class="file-input-title">
                                Выбрать изображение
                            </div>

                            <div class="file-input-subtitle">
                                JPG, PNG, WEBP
                            </div>

                        </div>

                    </label>

                </div>

                ${
                    item?.image
                        ? `
                            <div class="image-preview">
                                <img
                                    src="${escapeHtml(
                                        getImageUrl(item.image)
                                    )}"
                                    alt=""
                                >
                            </div>
                        `
                        : ""
                }

            </form>
        `,

        footer: `
            <button
                class="btn btn-secondary"
                onclick="closeModal()"
            >
                Отмена
            </button>

            <button
                class="btn btn-primary"
                onclick="saveNews()"
            >
                Сохранить
            </button>
        `
    });
}

function editNews(id) {
    openNewsModal(id);
}

async function saveNews() {
    const title =
        $("#newsTitle")?.value.trim();

    const tag =
        $("#newsTag")?.value.trim();

    const content =
        $("#newsText")?.value.trim();

    const publishedAt =
        $("#newsDate")?.value;

    if (!title || !content) {
        showToast(
            "Заполните заголовок и текст",
            "error"
        );
        return;
    }

    try {
        let image =
            newsCache.find(x => x.id === editingId)
                ?.image || null;

        const file =
            $("#newsImage")?.files?.[0];

        if (file) {
            image = await uploadFile(
                file,
                "news"
            );
        }

        const payload = {
            title,
            tag: tag || null,
            content,
            image,
            published_at:
                publishedAt
                    ? new Date(
                        publishedAt
                    ).toISOString()
                    : new Date().toISOString()
        };

        let result;

        if (editingId) {
            result = await supabase
                .from("news")
                .update(payload)
                .eq("id", editingId);
        } else {
            result = await supabase
                .from("news")
                .insert(payload);
        }

        if (result.error) {
            throw result.error;
        }

        closeModal();

        showToast(
            editingId
                ? "Новость изменена"
                : "Новость опубликована"
        );

        await loadNews();
        await loadDashboard();
    } catch (error) {
        handleError(
            error,
            "Не удалось сохранить новость"
        );
    }
}

async function deleteNews(id) {
    if (!confirm("Удалить эту новость?")) return;

    try {
        const {
            error
        } = await supabase
            .from("news")
            .delete()
            .eq("id", id);

        if (error) throw error;

        showToast("Новость удалена");

        await loadNews();
        await loadDashboard();
    } catch (error) {
        handleError(
            error,
            "Не удалось удалить новость"
        );
    }
}

/* =========================================================
   STORIES
========================================================= */

async function loadStories() {
    const container = $("#storiesList");

    if (!container) return;

    setLoading(container);

    const {
        data,
        error
    } = await supabase
        .from("stories")
        .select("*")
        .order("created_at", {
            ascending: false
        });

    if (error) {
        container.innerHTML =
            emptyState("Ошибка", error.message);
        return;
    }

    storiesCache = data || [];

    if (!storiesCache.length) {
        container.innerHTML = emptyState(
            "Историй пока нет",
            "Добавьте первую историю."
        );
        return;
    }

    container.innerHTML =
        storiesCache.map(item => `
            <div class="admin-list-item">

                ${
                    item.image
                        ? `
                            <img
                                class="admin-list-image"
                                src="${escapeHtml(
                                    getImageUrl(item.image)
                                )}"
                                alt=""
                            >
                        `
                        : ""
                }

                <div class="admin-list-content">

                    <div class="admin-list-title">
                        ${formatDate(
                            item.created_at,
                            true
                        )}
                    </div>

                    <div class="admin-list-meta">
                        Удаление:
                        ${
                            item.expires_at
                                ? formatDate(
                                    item.expires_at,
                                    true
                                )
                                : "не задано"
                        }
                    </div>

                </div>

                <div class="admin-list-actions">

                    <button
                        class="btn btn-secondary btn-small"
                        onclick="editStory('${item.id}')"
                    >
                        Изменить
                    </button>

                    <button
                        class="btn btn-danger btn-small"
                        onclick="deleteStory('${item.id}')"
                    >
                        Удалить
                    </button>

                </div>

            </div>
        `).join("");
}

function openStoryModal(id = null) {
    editingId = id;

    const item =
        id
            ? storiesCache.find(x => x.id === id)
            : null;

    openModal({
        title: id
            ? "Редактирование истории"
            : "Новая история",

        body: `
            <form id="storyForm">

                <div class="field">

                    <label>
                        Изображение
                    </label>

                    <label class="file-input">

                        <input
                            type="file"
                            id="storyImage"
                            accept="image/*"
                        >

                        <div class="file-input-content">

                            <div class="file-input-icon">
                                +
                            </div>

                            <div class="file-input-title">
                                Выбрать изображение
                            </div>

                            <div class="file-input-subtitle">
                                JPG, PNG, WEBP
                            </div>

                        </div>

                    </label>

                </div>

                <div class="field">

                    <label>
                        История действует до
                    </label>

                    <input
                        class="input"
                        type="datetime-local"
                        id="storyExpires"
                        value="${formatDateInput(
                            item?.expires_at
                        )}"
                    >

                </div>

                ${
                    item?.image
                        ? `
                            <div class="image-preview">
                                <img
                                    src="${escapeHtml(
                                        getImageUrl(item.image)
                                    )}"
                                    alt=""
                                >
                            </div>
                        `
                        : ""
                }

            </form>
        `,

        footer: `
            <button
                class="btn btn-secondary"
                onclick="closeModal()"
            >
                Отмена
            </button>

            <button
                class="btn btn-primary"
                onclick="saveStory()"
            >
                Сохранить
            </button>
        `
    });
}

function editStory(id) {
    openStoryModal(id);
}

async function saveStory() {
    try {
        const existing =
            storiesCache.find(
                x => x.id === editingId
            );

        let image =
            existing?.image || null;

        const file =
            $("#storyImage")?.files?.[0];

        if (file) {
            image = await uploadFile(
                file,
                "stories"
            );
        }

        if (!image) {
            showToast(
                "Выберите изображение",
                "error"
            );
            return;
        }

        const expires =
            $("#storyExpires")?.value;

        const payload = {
            image,
            expires_at:
                expires
                    ? new Date(
                        expires
                    ).toISOString()
                    : null
        };

        let result;

        if (editingId) {
            result = await supabase
                .from("stories")
                .update(payload)
                .eq("id", editingId);
        } else {
            result = await supabase
                .from("stories")
                .insert(payload);
        }

        if (result.error) {
            throw result.error;
        }

        closeModal();

        showToast("История сохранена");

        await loadStories();
    } catch (error) {
        handleError(
            error,
            "Не удалось сохранить историю"
        );
    }
}

async function deleteStory(id) {
    if (!confirm("Удалить историю?")) return;

    try {
        const {
            error
        } = await supabase
            .from("stories")
            .delete()
            .eq("id", id);

        if (error) throw error;

        showToast("История удалена");

        await loadStories();
        await loadDashboard();
    } catch (error) {
        handleError(
            error,
            "Не удалось удалить историю"
        );
    }
}

/* =========================================================
   CLUBS
========================================================= */

async function loadClubs() {
    const container = $("#clubsList");

    if (!container) return;

    setLoading(container);

    const {
        data,
        error
    } = await supabase
        .from("clubs")
        .select("*")
        .order("name");

    if (error) {
        container.innerHTML =
            emptyState("Ошибка", error.message);
        return;
    }

    clubsCache = data || [];

    if (!clubsCache.length) {
        container.innerHTML = emptyState(
            "Клубов пока нет",
            "Добавьте команды, которые участвуют в матчах."
        );
        return;
    }

    container.innerHTML = clubsCache.map(club => `
        <div class="club-card">

            <div class="club-logo">

                ${
                    club.logo
                        ? `
                            <img
                                src="${escapeHtml(
                                    getImageUrl(club.logo)
                                )}"
                                alt=""
                            >
                        `
                        : ""
                }

            </div>

            <div class="club-info">

                <div class="club-name">
                    ${escapeHtml(club.name)}
                </div>

                <div class="club-city">
                    ${escapeHtml(club.city || "Город не указан")}
                </div>

            </div>

            <div class="admin-list-actions">

                <button
                    class="btn btn-secondary btn-small"
                    onclick="editClub('${club.id}')"
                >
                    Изменить
                </button>

                <button
                    class="btn btn-danger btn-small"
                    onclick="deleteClub('${club.id}')"
                >
                    Удалить
                </button>

            </div>

        </div>
    `).join("");
}

function openClubModal(id = null) {
    editingId = id;

    const item =
        id
            ? clubsCache.find(x => x.id === id)
            : null;

    openModal({
        title: id
            ? "Редактирование клуба"
            : "Новый клуб",

        body: `
            <div class="field">

                <label>Название клуба</label>

                <input
                    class="input"
                    id="clubName"
                    value="${escapeHtml(
                        item?.name || ""
                    )}"
                    placeholder="ХК Челны 2011"
                >

            </div>

            <div class="field">

                <label>Город</label>

                <input
                    class="input"
                    id="clubCity"
                    value="${escapeHtml(
                        item?.city || ""
                    )}"
                    placeholder="Набережные Челны"
                >

            </div>

            <div class="field">

                <label>Логотип</label>

                <label class="file-input">

                    <input
                        type="file"
                        id="clubLogo"
                        accept="image/*"
                    >

                    <div class="file-input-content">

                        <div class="file-input-icon">
                            +
                        </div>

                        <div class="file-input-title">
                            Выбрать логотип
                        </div>

                        <div class="file-input-subtitle">
                            PNG с прозрачным фоном предпочтительно
                        </div>

                    </div>

                </label>

            </div>

            ${
                item?.logo
                    ? `
                        <div class="logo-preview">
                            <img
                                src="${escapeHtml(
                                    getImageUrl(item.logo)
                                )}"
                                alt=""
                            >
                        </div>
                    `
                    : ""
            }
        `,

        footer: `
            <button
                class="btn btn-secondary"
                onclick="closeModal()"
            >
                Отмена
            </button>

            <button
                class="btn btn-primary"
                onclick="saveClub()"
            >
                Сохранить
            </button>
        `
    });
}

function editClub(id) {
    openClubModal(id);
}

async function saveClub() {
    const name =
        $("#clubName")?.value.trim();

    const city =
        $("#clubCity")?.value.trim();

    if (!name) {
        showToast(
            "Введите название клуба",
            "error"
        );
        return;
    }

    try {
        const existing =
            clubsCache.find(
                x => x.id === editingId
            );

        let logo =
            existing?.logo || null;

        const file =
            $("#clubLogo")?.files?.[0];

        if (file) {
            logo = await uploadFile(
                file,
                "clubs"
            );
        }

        const payload = {
            name,
            city: city || null,
            logo
        };

        let result;

        if (editingId) {
            result = await supabase
                .from("clubs")
                .update(payload)
                .eq("id", editingId);
        } else {
            result = await supabase
                .from("clubs")
                .insert(payload);
        }

        if (result.error) {
            throw result.error;
        }

        closeModal();

        showToast("Клуб сохранён");

        await loadClubs();
    } catch (error) {
        handleError(
            error,
            "Не удалось сохранить клуб"
        );
    }
}

async function deleteClub(id) {
    if (
        !confirm(
            "Удалить клуб? Если он используется в матчах, удалить его не получится."
        )
    ) {
        return;
    }

    try {
        const {
            error
        } = await supabase
            .from("clubs")
            .delete()
            .eq("id", id);

        if (error) throw error;

        showToast("Клуб удалён");

        await loadClubs();
    } catch (error) {
        handleError(
            error,
            "Не удалось удалить клуб"
        );
    }
}

/* =========================================================
   MATCHES
========================================================= */

async function loadMatches(status = null) {
    const container = $("#matchesList");

    if (!container) return;

    setLoading(container);

    let query = supabase
        .from("matches")
        .select(`
            *,
            home:clubs!matches_home_club_id_fkey(*),
            away:clubs!matches_away_club_id_fkey(*)
        `)
        .order("match_date", {
            ascending: false
        });

    if (status) {
        query = query.eq("status", status);
    }

    const {
        data,
        error
    } = await query;

    if (error) {
        container.innerHTML =
            emptyState("Ошибка", error.message);
        return;
    }

    matchesCache = data || [];

    if (!matchesCache.length) {
        container.innerHTML = emptyState(
            "Матчей пока нет",
            "Создайте первый матч."
        );
        return;
    }

    container.innerHTML =
        matchesCache.map(match => `
            <div class="admin-list-item">

                <div class="admin-list-content">

                    <div class="admin-list-title">
                        ${
                            escapeHtml(
                                match.home?.name ||
                                "Хозяева"
                            )
                        }

                        —

                        ${
                            escapeHtml(
                                match.away?.name ||
                                "Гости"
                            )
                        }
                    </div>

                    <div class="admin-list-meta">

                        ${formatDate(
                            match.match_date,
                            true
                        )}

                        ${
                            match.venue
                                ? " · " +
                                  escapeHtml(
                                      match.venue
                                  )
                                : ""
                        }

                    </div>

                </div>

                <span class="status status-${escapeHtml(
                    match.status || "planned"
                )}">
                    ${getMatchStatusName(
                        match.status
                    )}
                </span>

                <div class="admin-list-actions">

                    <button
                        class="btn btn-secondary btn-small"
                        onclick="editMatch('${match.id}')"
                    >
                        Изменить
                    </button>

                    <button
                        class="btn btn-danger btn-small"
                        onclick="deleteMatch('${match.id}')"
                    >
                        Удалить
                    </button>

                </div>

            </div>
        `).join("");
}

function getMatchStatusName(status) {
    switch (status) {
        case "live":
            return "LIVE";

        case "finished":
            return "Завершён";

        case "planned":
        default:
            return "Запланирован";
    }
}

function clubOptions(selectedId) {
    return clubsCache.map(club => `
        <option
            value="${escapeHtml(club.id)}"
            ${club.id === selectedId ? "selected" : ""}
        >
            ${escapeHtml(club.name)}
        </option>
    `).join("");
}

async function openMatchModal(id = null) {
    editingId = id;

    if (!clubsCache.length) {
        await loadClubs();
    }

    const item =
        id
            ? matchesCache.find(x => x.id === id)
            : null;

    openModal({
        title: id
            ? "Редактирование матча"
            : "Новый матч",

        large: true,

        body: `
            <div class="field-row">

                <div class="field">

                    <label>Хозяева</label>

                    <select
                        class="select"
                        id="matchHome"
                    >
                        <option value="">
                            Выберите клуб
                        </option>

                        ${clubOptions(
                            item?.home_club_id
                        )}

                    </select>

                </div>

                <div class="field">

                    <label>Гости</label>

                    <select
                        class="select"
                        id="matchAway"
                    >
                        <option value="">
                            Выберите клуб
                        </option>

                        ${clubOptions(
                            item?.away_club_id
                        )}

                    </select>

                </div>

            </div>

            <div class="field-row">

                <div class="field">

                    <label>Дата и время</label>

                    <input
                        class="input"
                        type="datetime-local"
                        id="matchDate"
                        value="${formatDateInput(
                            item?.match_date
                        )}"
                    >

                </div>

                <div class="field">

                    <label>Площадка</label>

                    <input
                        class="input"
                        id="matchVenue"
                        value="${escapeHtml(
                            item?.venue || ""
                        )}"
                        placeholder="ЛД «Основной»"
                    >

                </div>

            </div>

            <div class="field-row">

                <div class="field">

                    <label>Соревнование</label>

                    <input
                        class="input"
                        id="matchCompetition"
                        value="${escapeHtml(
                            item?.competition || ""
                        )}"
                        placeholder="Первенство ПФО"
                    >

                </div>

                <div class="field">

                    <label>Статус</label>

                    <select
                        class="select"
                        id="matchStatus"
                    >

                        <option
                            value="planned"
                            ${
                                !item ||
                                item.status === "planned"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Запланирован
                        </option>

                        <option
                            value="live"
                            ${
                                item?.status === "live"
                                    ? "selected"
                                    : ""
                            }
                        >
                            LIVE
                        </option>

                        <option
                            value="finished"
                            ${
                                item?.status === "finished"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Завершён
                        </option>

                    </select>

                </div>

            </div>

            <div class="field-row">

                <div class="field">

                    <label>Счёт хозяев</label>

                    <input
                        class="input"
                        type="number"
                        min="0"
                        id="matchHomeScore"
                        value="${
                            item?.home_score ??
                            ""
                        }"
                    >

                </div>

                <div class="field">

                    <label>Счёт гостей</label>

                    <input
                        class="input"
                        type="number"
                        min="0"
                        id="matchAwayScore"
                        value="${
                            item?.away_score ??
                            ""
                        }"
                    >

                </div>

            </div>
        `,

        footer: `
            <button
                class="btn btn-secondary"
                onclick="closeModal()"
            >
                Отмена
            </button>

            <button
                class="btn btn-primary"
                onclick="saveMatch()"
            >
                Сохранить
            </button>
        `
    });
}

function editMatch(id) {
    openMatchModal(id);
}

async function saveMatch() {
    const homeClub =
        $("#matchHome")?.value;

    const awayClub =
        $("#matchAway")?.value;

    const matchDate =
        $("#matchDate")?.value;

    if (
        !homeClub ||
        !awayClub ||
        !matchDate
    ) {
        showToast(
            "Заполните команды и дату",
            "error"
        );
        return;
    }

    if (homeClub === awayClub) {
        showToast(
            "Команды не могут быть одинаковыми",
            "error"
        );
        return;
    }

    try {
        const payload = {
            home_club_id: homeClub,
            away_club_id: awayClub,

            match_date:
                new Date(
                    matchDate
                ).toISOString(),

            venue:
                $("#matchVenue")
                    ?.value.trim() || null,

            competition:
                $("#matchCompetition")
                    ?.value.trim() || null,

            status:
                $("#matchStatus")?.value ||
                "planned",

            home_score:
                $("#matchHomeScore")?.value === ""
                    ? null
                    : Number(
                        $("#matchHomeScore").value
                    ),

            away_score:
                $("#matchAwayScore")?.value === ""
                    ? null
                    : Number(
                        $("#matchAwayScore").value
                    )
        };

        let result;

        if (editingId) {
            result = await supabase
                .from("matches")
                .update(payload)
                .eq("id", editingId);
        } else {
            result = await supabase
                .from("matches")
                .insert(payload);
        }

        if (result.error) {
            throw result.error;
        }

        closeModal();

        showToast("Матч сохранён");

        await loadMatches();
        await loadDashboard();
    } catch (error) {
        handleError(
            error,
            "Не удалось сохранить матч"
        );
    }
}

async function deleteMatch(id) {
    if (!confirm("Удалить матч?")) return;

    try {
        const {
            error
        } = await supabase
            .from("matches")
            .delete()
            .eq("id", id);

        if (error) throw error;

        showToast("Матч удалён");

        await loadMatches();
        await loadDashboard();
    } catch (error) {
        handleError(
            error,
            "Не удалось удалить матч"
        );
    }
}

/* =========================================================
   MATCH LIVE EVENTS
========================================================= */

async function loadMatchEvents(matchId) {
    const [
        goals,
        penalties
    ] = await Promise.all([
        supabase
            .from("match_goals")
            .select("*")
            .eq("match_id", matchId)
            .order("event_time"),

        supabase
            .from("match_penalties")
            .select("*")
            .eq("match_id", matchId)
            .order("event_time")
    ]);

    return {
        goals: goals.data || [],
        penalties: penalties.data || []
    };
}

async function addGoal(matchId) {
    openModal({
        title: "Добавить гол",

        body: `
            <div class="field">

                <label>Команда</label>

                <select
                    class="select"
                    id="goalTeam"
                >

                    <option value="home">
                        Хозяева
                    </option>

                    <option value="away">
                        Гости
                    </option>

                </select>

            </div>

            <div class="field-row">

                <div class="field">

                    <label>Время</label>

                    <input
                        class="input"
                        id="goalTime"
                        placeholder="12:34"
                    >

                </div>

                <div class="field">

                    <label>Номер</label>

                    <input
                        class="input"
                        type="number"
                        id="goalNumber"
                        placeholder="18"
                    >

                </div>

            </div>

            <div class="field">

                <label>Игрок</label>

                <input
                    class="input"
                    id="goalPlayer"
                    placeholder="Амир Норов"
                >

            </div>

            <div class="field">

                <label>Ситуация</label>

                <select
                    class="select"
                    id="goalStrength"
                >

                    <option value="even">
                        Равные составы
                    </option>

                    <option value="power_play">
                        Большинство
                    </option>

                    <option value="short_handed">
                        Меньшинство
                    </option>

                </select>

            </div>
        `,

        footer: `
            <button
                class="btn btn-secondary"
                onclick="closeModal()"
            >
                Отмена
            </button>

            <button
                class="btn btn-primary"
                onclick="saveGoal('${matchId}')"
            >
                Добавить
            </button>
        `
    });
}

async function saveGoal(matchId) {
    try {
        const payload = {
            match_id: matchId,

            team:
                $("#goalTeam")?.value,

            event_time:
                $("#goalTime")?.value.trim(),

            player_number:
                $("#goalNumber")?.value
                    ? Number(
                        $("#goalNumber").value
                    )
                    : null,

            player_name:
                $("#goalPlayer")
                    ?.value.trim(),

            strength:
                $("#goalStrength")?.value
        };

        if (
            !payload.event_time ||
            !payload.player_name
        ) {
            showToast(
                "Заполните время и игрока",
                "error"
            );
            return;
        }

        const {
            error
        } = await supabase
            .from("match_goals")
            .insert(payload);

        if (error) throw error;

        closeModal();

        showToast("Гол добавлен");
    } catch (error) {
        handleError(
            error,
            "Не удалось добавить гол"
        );
    }
}

async function addPenalty(matchId) {
    openModal({
        title: "Добавить штраф",

        body: `
            <div class="field">

                <label>Команда</label>

                <select
                    class="select"
                    id="penaltyTeam"
                >

                    <option value="home">
                        Хозяева
                    </option>

                    <option value="away">
                        Гости
                    </option>

                </select>

            </div>

            <div class="field-row">

                <div class="field">

                    <label>Время</label>

                    <input
                        class="input"
                        id="penaltyTime"
                        placeholder="08:21"
                    >

                </div>

                <div class="field">

                    <label>Номер</label>

                    <input
                        class="input"
                        type="number"
                        id="penaltyNumber"
                        placeholder="55"
                    >

                </div>

            </div>

            <div class="field">

                <label>Игрок</label>

                <input
                    class="input"
                    id="penaltyPlayer"
                    placeholder="Фамилия Имя"
                >

            </div>

            <div class="field">

                <label>Причина</label>

                <input
                    class="input"
                    id="penaltyReason"
                    placeholder="Задержка соперника"
                >

            </div>

            <div class="field">

                <label>Минуты</label>

                <select
                    class="select"
                    id="penaltyMinutes"
                >

                    <option value="2">2</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>

                </select>

            </div>
        `,

        footer: `
            <button
                class="btn btn-secondary"
                onclick="closeModal()"
            >
                Отмена
            </button>

            <button
                class="btn btn-primary"
                onclick="savePenalty('${matchId}')"
            >
                Добавить
            </button>
        `
    });
}

async function savePenalty(matchId) {
    try {
        const payload = {
            match_id: matchId,

            team:
                $("#penaltyTeam")?.value,

            event_time:
                $("#penaltyTime")
                    ?.value.trim(),

            player_number:
                $("#penaltyNumber")?.value
                    ? Number(
                        $("#penaltyNumber").value
                    )
                    : null,

            player_name:
                $("#penaltyPlayer")
                    ?.value.trim(),

            reason:
                $("#penaltyReason")
                    ?.value.trim(),

            minutes:
                Number(
                    $("#penaltyMinutes")?.value ||
                    2
                )
        };

        if (
            !payload.event_time ||
            !payload.player_name ||
            !payload.reason
        ) {
            showToast(
                "Заполните все поля",
                "error"
            );
            return;
        }

        const {
            error
        } = await supabase
            .from("match_penalties")
            .insert(payload);

        if (error) throw error;

        closeModal();

        showToast("Штраф добавлен");
    } catch (error) {
        handleError(
            error,
            "Не удалось добавить штраф"
        );
    }
}

/* =========================================================
   COMPETITION
========================================================= */

async function loadCompetition() {
    await loadStandings();
}

async function loadStandings() {
    const container = $("#standingsEditor");

    if (!container) return;

    setLoading(container);

    const {
        data,
        error
    } = await supabase
        .from("standings")
        .select("*")
        .order("place", {
            ascending: true
        });

    if (error) {
        container.innerHTML =
            emptyState("Ошибка", error.message);
        return;
    }

    standingsCache = data || [];

    renderStandingsEditor();
}

function renderStandingsEditor() {
    const container = $("#standingsEditor");

    if (!container) return;

    container.innerHTML = `
        <div class="standings-editor">

            <table>

                <thead>
                    <tr>
                        <th>№</th>
                        <th>Команда</th>
                        <th>И</th>
                        <th>В</th>
                        <th>ВО</th>
                        <th>ВБ</th>
                        <th>ПО</th>
                        <th>ПБ</th>
                        <th>П</th>
                        <th>О</th>
                        <th></th>
                    </tr>
                </thead>

                <tbody>

                    ${
                        standingsCache.length
                            ? standingsCache.map(
                                row =>
                                    standingsRow(row)
                              ).join("")
                            : ""
                    }

                </tbody>

            </table>

        </div>

        <button
            class="btn btn-secondary mt-15"
            onclick="addStandingRow()"
        >
            + Добавить команду
        </button>

        <button
            class="btn btn-primary mt-15"
            onclick="saveStandings()"
        >
            Сохранить таблицу
        </button>
    `;
}

function standingsRow(row = {}) {
    return `
        <tr data-id="${escapeHtml(
            row.id || ""
        )}">

            <td>
                <input
                    class="standing-place"
                    type="number"
                    value="${row.place ?? ""}"
                >
            </td>

            <td>
                <input
                    class="team-input standing-team"
                    value="${escapeHtml(
                        row.team_name || ""
                    )}"
                    placeholder="Название команды"
                >
            </td>

            <td>
                <input
                    class="standing-games"
                    type="number"
                    value="${row.games ?? 0}"
                >
            </td>

            <td>
                <input
                    class="standing-wins"
                    type="number"
                    value="${row.wins ?? 0}"
                >
            </td>

            <td>
                <input
                    class="standing-ot-wins"
                    type="number"
                    value="${row.overtime_wins ?? 0}"
                >
            </td>

            <td>
                <input
                    class="standing-so-wins"
                    type="number"
                    value="${row.shootout_wins ?? 0}"
                >
            </td>

            <td>
                <input
                    class="standing-losses"
                    type="number"
                    value="${row.losses ?? 0}"
                >
            </td>

            <td>
                <input
                    class="standing-ot-losses"
                    type="number"
                    value="${row.overtime_losses ?? 0}"
                >
            </td>

            <td>
                <input
                    class="standing-so-losses"
                    type="number"
                    value="${row.shootout_losses ?? 0}"
                >
            </td>

            <td>
                <input
                    class="standing-points"
                    type="number"
                    value="${row.points ?? 0}"
                >
            </td>

            <td>
                ${
                    row.id
                        ? `
                            <button
                                class="btn btn-danger btn-small"
                                onclick="deleteStanding('${row.id}')"
                            >
                                ×
                            </button>
                        `
                        : ""
                }
            </td>

        </tr>
    `;
}

function addStandingRow() {
    standingsCache.push({
        id: null,
        place: standingsCache.length + 1,
        team_name: "",
        games: 0,
        wins: 0,
        overtime_wins: 0,
        shootout_wins: 0,
        losses: 0,
        overtime_losses: 0,
        shootout_losses: 0,
        points: 0
    });

    renderStandingsEditor();
}

async function saveStandings() {
    const rows =
        $$("#standingsEditor tbody tr");

    try {
        for (const row of rows) {
            const id =
                row.dataset.id || null;

            const payload = {
                place:
                    Number(
                        $(".standing-place", row)?.value ||
                        0
                    ),

                team_name:
                    $(".standing-team", row)
                        ?.value.trim(),

                games:
                    Number(
                        $(".standing-games", row)?.value ||
                        0
                    ),

                wins:
                    Number(
                        $(".standing-wins", row)?.value ||
                        0
                    ),

                overtime_wins:
                    Number(
                        $(".standing-ot-wins", row)?.value ||
                        0
                    ),

                shootout_wins:
                    Number(
                        $(".standing-so-wins", row)?.value ||
                        0
                    ),

                losses:
                    Number(
                        $(".standing-losses", row)?.value ||
                        0
                    ),

                overtime_losses:
                    Number(
                        $(".standing-ot-losses", row)?.value ||
                        0
                    ),

                shootout_losses:
                    Number(
                        $(".standing-so-losses", row)?.value ||
                        0
                    ),

                points:
                    Number(
                        $(".standing-points", row)?.value ||
                        0
                    )
            };

            if (!payload.team_name) continue;

            let result;

            if (id) {
                result = await supabase
                    .from("standings")
                    .update(payload)
                    .eq("id", id);
            } else {
                result = await supabase
                    .from("standings")
                    .insert(payload);
            }

            if (result.error) {
                throw result.error;
            }
        }

        showToast("Таблица сохранена");

        await loadStandings();
    } catch (error) {
        handleError(
            error,
            "Не удалось сохранить таблицу"
        );
    }
}

async function deleteStanding(id) {
    if (!confirm("Удалить команду из таблицы?")) {
        return;
    }

    try {
        const {
            error
        } = await supabase
            .from("standings")
            .delete()
            .eq("id", id);

        if (error) throw error;

        showToast("Команда удалена");

        await loadStandings();
    } catch (error) {
        handleError(
            error,
            "Не удалось удалить строку"
        );
    }
}

/* =========================================================
   PLAYER STATS
========================================================= */

async function loadStats(type = currentStatType) {
    currentStatType = type;

    const container = $("#statsList");

    if (!container) return;

    setLoading(container);

    const {
        data,
        error
    } = await supabase
        .from("player_stats")
        .select("*")
        .eq("stat_type", type)
        .order("value", {
            ascending: false
        });

    if (error) {
        container.innerHTML =
            emptyState("Ошибка", error.message);
        return;
    }

    statsCache = data || [];

    if (!statsCache.length) {
        container.innerHTML = emptyState(
            "Статистика пуста",
            "Добавьте игрока и показатель."
        );
        return;
    }

    container.innerHTML = statsCache.map(item => `
        <div class="admin-list-item">

            <div class="admin-list-content">

                <div class="admin-list-title">
                    #${escapeHtml(
                        item.player_number ??
                        ""
                    )}
                    ${escapeHtml(
                        item.player_name
                    )}
                </div>

                <div class="admin-list-meta">
                    ${escapeHtml(
                        statTypeName(item.stat_type)
                    )}
                </div>

            </div>

            <strong>
                ${escapeHtml(item.value)}
            </strong>

            <div class="admin-list-actions">

                <button
                    class="btn btn-secondary btn-small"
                    onclick="editStat('${item.id}')"
                >
                    Изменить
                </button>

                <button
                    class="btn btn-danger btn-small"
                    onclick="deleteStat('${item.id}')"
                >
                    Удалить
                </button>

            </div>

        </div>
    `).join("");
}

function statTypeName(type) {
    switch (type) {
        case "scorers":
            return "Бомбардиры";

        case "snipers":
            return "Снайперы";

        case "defenders":
            return "Бомбардиры-защитники";

        case "plus_minus":
            return "Плюс/минус";

        default:
            return type;
    }
}

function openStatModal(id = null) {
    editingId = id;

    const item =
        id
            ? statsCache.find(x => x.id === id)
            : null;

    openModal({
        title: id
            ? "Редактирование статистики"
            : "Новая статистика",

        body: `
            <div class="field">

                <label>Тип статистики</label>

                <select
                    class="select"
                    id="statType"
                >

                    <option
                        value="scorers"
                        ${
                            (
                                item?.stat_type ||
                                currentStatType
                            ) === "scorers"
                                ? "selected"
                                : ""
                        }
                    >
                        Бомбардиры
                    </option>

                    <option
                        value="snipers"
                        ${
                            (
                                item?.stat_type ||
                                currentStatType
                            ) === "snipers"
                                ? "selected"
                                : ""
                        }
                    >
                        Снайперы
                    </option>

                    <option
                        value="defenders"
                        ${
                            (
                                item?.stat_type ||
                                currentStatType
                            ) === "defenders"
                                ? "selected"
                                : ""
                        }
                    >
                        Бомбардиры-защитники
                    </option>

                    <option
                        value="plus_minus"
                        ${
                            (
                                item?.stat_type ||
                                currentStatType
                            ) === "plus_minus"
                                ? "selected"
                                : ""
                        }
                    >
                        Плюс/минус
                    </option>

                </select>

            </div>

            <div class="field-row">

                <div class="field">

                    <label>Номер</label>

                    <input
                        class="input"
                        type="number"
                        id="statNumber"
                        value="${
                            item?.player_number ??
                            ""
                        }"
                    >

                </div>

                <div class="field">

                    <label>Игрок</label>

                    <input
                        class="input"
                        id="statPlayer"
                        value="${escapeHtml(
                            item?.player_name ||
                            ""
                        )}"
                    >

                </div>

            </div>

            <div class="field">

                <label>Показатель</label>

                <input
                    class="input"
                    type="number"
                    step="1"
                    id="statValue"
                    value="${
                        item?.value ??
                        ""
                    }"
                >

            </div>
        `,

        footer: `
            <button
                class="btn btn-secondary"
                onclick="closeModal()"
            >
                Отмена
            </button>

            <button
                class="btn btn-primary"
                onclick="saveStat()"
            >
                Сохранить
            </button>
        `
    });
}

function editStat(id) {
    openStatModal(id);
}

async function saveStat() {
    const player =
        $("#statPlayer")
            ?.value.trim();

    if (!player) {
        showToast(
            "Введите имя игрока",
            "error"
        );
        return;
    }

    try {
        const payload = {
            stat_type:
                $("#statType")?.value,

            player_number:
                $("#statNumber")?.value
                    ? Number(
                        $("#statNumber").value
                    )
                    : null,

            player_name:
                player,

            value:
                Number(
                    $("#statValue")?.value ||
                    0
                )
        };

        let result;

        if (editingId) {
            result = await supabase
                .from("player_stats")
                .update(payload)
                .eq("id", editingId);
        } else {
            result = await supabase
                .from("player_stats")
                .insert(payload);
        }

        if (result.error) {
            throw result.error;
        }

        closeModal();

        showToast("Статистика сохранена");

        await loadStats(
            payload.stat_type
        );
    } catch (error) {
        handleError(
            error,
            "Не удалось сохранить статистику"
        );
    }
}

async function deleteStat(id) {
    if (!confirm("Удалить показатель?")) {
        return;
    }

    try {
        const {
            error
        } = await supabase
            .from("player_stats")
            .delete()
            .eq("id", id);

        if (error) throw error;

        showToast("Показатель удалён");

        await loadStats();
    } catch (error) {
        handleError(
            error,
            "Не удалось удалить показатель"
        );
    }
}

/* =========================================================
   TEAM LEADERS
========================================================= */

async function loadLeaders() {
    const container = $("#leadersList");

    if (!container) return;

    setLoading(container);

    const {
        data,
        error
    } = await supabase
        .from("team_leaders")
        .select("*")
        .order("leader_type");

    if (error) {
        container.innerHTML =
            emptyState("Ошибка", error.message);
        return;
    }

    leadersCache = data || [];

    renderLeaders();
}

function renderLeaders() {
    const container = $("#leadersList");

    if (!container) return;

    container.innerHTML = `
        <div class="leaders-grid">

            ${leadersCache.length
                ? leadersCache.map(
                    leader =>
                        leaderEditor(leader)
                  ).join("")
                : emptyState(
                    "Лидеры не настроены",
                    "Добавьте карточки лидеров."
                )
            }

        </div>

        <button
            class="btn btn-primary mt-15"
            onclick="openLeaderModal()"
        >
            + Добавить лидера
        </button>
    `;
}

function leaderEditor(item) {
    return `
        <div class="leader-editor">

            <div class="leader-photo">

                ${
                    item.player_image
                        ? `
                            <img
                                src="${escapeHtml(
                                    getImageUrl(
                                        item.player_image
                                    )
                                )}"
                                alt=""
                            >
                        `
                        : ""
                }

            </div>

            <div class="leader-editor-info">

                <div class="admin-list-title">
                    ${escapeHtml(
                        leaderTypeName(
                            item.leader_type
                        )
                    )}
                </div>

                <div class="admin-list-meta">
                    #${escapeHtml(
                        item.player_number ??
                        ""
                    )}
                    ${escapeHtml(
                        item.player_name ||
                        ""
                    )}
                    ·
                    ${escapeHtml(
                        item.stat_value ??
                        ""
                    )}
                </div>

                <div class="admin-list-actions mt-10">

                    <button
                        class="btn btn-secondary btn-small"
                        onclick="editLeader('${item.id}')"
                    >
                        Изменить
                    </button>

                    <button
                        class="btn btn-danger btn-small"
                        onclick="deleteLeader('${item.id}')"
                    >
                        Удалить
                    </button>

                </div>

            </div>

        </div>
    `;
}

function leaderTypeName(type) {
    switch (type) {
        case "top_scorer":
            return "Лучший бомбардир";

        case "sniper":
            return "Лучший снайпер";

        case "defense_scorer":
            return "Лучший защитник-бомбардир";

        case "plus_minus":
            return "Лучший плюс/минус";

        default:
            return type;
    }
}

function openLeaderModal(id = null) {
    editingId = id;

    const item =
        id
            ? leadersCache.find(x => x.id === id)
            : null;

    openModal({
        title: id
            ? "Редактирование лидера"
            : "Новый лидер",

        body: `
            <div class="field">

                <label>Тип лидера</label>

                <select
                    class="select"
                    id="leaderType"
                >

                    <option
                        value="top_scorer"
                        ${
                            item?.leader_type ===
                            "top_scorer"
                                ? "selected"
                                : ""
                        }
                    >
                        Лучший бомбардир
                    </option>

                    <option
                        value="sniper"
                        ${
                            item?.leader_type ===
                            "sniper"
                                ? "selected"
                                : ""
                        }
                    >
                        Лучший снайпер
                    </option>

                    <option
                        value="defense_scorer"
                        ${
                            item?.leader_type ===
                            "defense_scorer"
                                ? "selected"
                                : ""
                        }
                    >
                        Защитник-бомбардир
                    </option>

                    <option
                        value="plus_minus"
                        ${
                            item?.leader_type ===
                            "plus_minus"
                                ? "selected"
                                : ""
                        }
                    >
                        Плюс/минус
                    </option>

                </select>

            </div>

            <div class="field-row">

                <div class="field">

                    <label>Номер</label>

                    <input
                        class="input"
                        type="number"
                        id="leaderNumber"
                        value="${
                            item?.player_number ??
                            ""
                        }"
                    >

                </div>

                <div class="field">

                    <label>Игрок</label>

                    <input
                        class="input"
                        id="leaderPlayer"
                        value="${escapeHtml(
                            item?.player_name ||
                            ""
                        )}"
                    >

                </div>

            </div>

            <div class="field-row">

                <div class="field">

                    <label>Позиция</label>

                    <input
                        class="input"
                        id="leaderPosition"
                        value="${escapeHtml(
                            item?.position ||
                            ""
                        )}"
                        placeholder="Нападающий"
                    >

                </div>

                <div class="field">

                    <label>Статистика</label>

                    <input
                        class="input"
                        id="leaderValue"
                        value="${escapeHtml(
                            item?.stat_value ??
                            ""
                        )}"
                        placeholder="35 очков"
                    >

                </div>

            </div>

            <div class="field">

                <label>
                    PNG игрока без фона
                </label>

                <label class="file-input">

                    <input
                        type="file"
                        id="leaderImage"
                        accept="image/png,image/webp"
                    >

                    <div class="file-input-content">

                        <div class="file-input-icon">
                            +
                        </div>

                        <div class="file-input-title">
                            Выбрать PNG
                        </div>

                        <div class="file-input-subtitle">
                            Лучше использовать изображение без фона
                        </div>

                    </div>

                </label>

            </div>
        `,

        footer: `
            <button
                class="btn btn-secondary"
                onclick="closeModal()"
            >
                Отмена
            </button>

            <button
                class="btn btn-primary"
                onclick="saveLeader()"
            >
                Сохранить
            </button>
        `
    });
}

function editLeader(id) {
    openLeaderModal(id);
}

async function saveLeader() {
    const player =
        $("#leaderPlayer")
            ?.value.trim();

    if (!player) {
        showToast(
            "Введите игрока",
            "error"
        );
        return;
    }

    try {
        const existing =
            leadersCache.find(
                x => x.id === editingId
            );

        let playerImage =
            existing?.player_image ||
            null;

        const file =
            $("#leaderImage")?.files?.[0];

        if (file) {
            playerImage = await uploadFile(
                file,
                "leaders"
            );
        }

        const payload = {
            leader_type:
                $("#leaderType")?.value,

            player_number:
                $("#leaderNumber")?.value
                    ? Number(
                        $("#leaderNumber").value
                    )
                    : null,

            player_name:
                player,

            position:
                $("#leaderPosition")
                    ?.value.trim() ||
                null,

            stat_value:
                $("#leaderValue")
                    ?.value.trim() ||
                null,

            player_image:
                playerImage
        };

        let result;

        if (editingId) {
            result = await supabase
                .from("team_leaders")
                .update(payload)
                .eq("id", editingId);
        } else {
            result = await supabase
                .from("team_leaders")
                .insert(payload);
        }

        if (result.error) {
            throw result.error;
        }

        closeModal();

        showToast("Лидер сохранён");

        await loadLeaders();
    } catch (error) {
        handleError(
            error,
            "Не удалось сохранить лидера"
        );
    }
}

async function deleteLeader(id) {
    if (!confirm("Удалить лидера?")) return;

    try {
        const {
            error
        } = await supabase
            .from("team_leaders")
            .delete()
            .eq("id", id);

        if (error) throw error;

        showToast("Лидер удалён");

        await loadLeaders();
    } catch (error) {
        handleError(
            error,
            "Не удалось удалить лидера"
        );
    }
}

/* =========================================================
   ALBUMS
========================================================= */

async function loadAlbums() {
    const container = $("#albumsList");

    if (!container) return;

    setLoading(container);

    const {
        data,
        error
    } = await supabase
        .from("albums")
        .select(`
            *,
            album_photos(*)
        `)
        .order("album_date", {
            ascending: false
        });

    if (error) {
        container.innerHTML =
            emptyState("Ошибка", error.message);
        return;
    }

    albumsCache = data || [];

    if (!albumsCache.length) {
        container.innerHTML = emptyState(
            "Альбомов пока нет",
            "Создайте первый фотоальбом."
        );
        return;
    }

    container.innerHTML = `
        <div class="album-grid">

            ${albumsCache.map(album => `
                <div class="album-card">

                    ${
                        album.cover
                            ? `
                                <img
                                    class="album-cover"
                                    src="${escapeHtml(
                                        getImageUrl(
                                            album.cover
                                        )
                                    )}"
                                    alt=""
                                >
                            `
                            : `
                                <div class="album-cover"></div>
                            `
                    }

                    <div class="album-body">

                        <div class="album-title">
                            ${escapeHtml(
                                album.title
                            )}
                        </div>

                        <div class="album-date">
                            ${formatDate(
                                album.album_date
                            )}
                            ·
                            ${
                                album.album_photos
                                    ?.length || 0
                            }
                            фото
                        </div>

                        <div class="album-actions">

                            <button
                                class="btn btn-secondary btn-small"
                                onclick="editAlbum('${album.id}')"
                            >
                                Изменить
                            </button>

                            <button
                                class="btn btn-danger btn-small"
                                onclick="deleteAlbum('${album.id}')"
                            >
                                Удалить
                            </button>

                        </div>

                    </div>

                </div>
            `).join("")}

        </div>
    `;
}

function openAlbumModal(id = null) {
    editingId = id;

    const item =
        id
            ? albumsCache.find(x => x.id === id)
            : null;

    openModal({
        title: id
            ? "Редактирование альбома"
            : "Новый альбом",

        large: true,

        body: `
            <div class="field">

                <label>Название альбома</label>

                <input
                    class="input"
                    id="albumTitle"
                    value="${escapeHtml(
                        item?.title || ""
                    )}"
                    placeholder="Матч против..."
                >

            </div>

            <div class="field">

                <label>Дата</label>

                <input
                    class="input"
                    type="date"
                    id="albumDate"
                    value="${
                        item?.album_date
                            ? item.album_date
                                .slice(0, 10)
                            : ""
                    }"
                >

            </div>

            <div class="field">

                <label>Обложка</label>

                <label class="file-input">

                    <input
                        type="file"
                        id="albumCover"
                        accept="image/*"
                    >

                    <div class="file-input-content">

                        <div class="file-input-icon">
                            +
                        </div>

                        <div class="file-input-title">
                            Выбрать обложку
                        </div>

                        <div class="file-input-subtitle">
                            JPG, PNG, WEBP
                        </div>

                    </div>

                </label>

            </div>

            <div class="field">

                <label>
                    Фотографии альбома
                </label>

                <label class="file-input">

                    <input
                        type="file"
                        id="albumPhotos"
                        accept="image/*"
                        multiple
                    >

                    <div class="file-input-content">

                        <div class="file-input-icon">
                            +
                        </div>

                        <div class="file-input-title">
                            Выбрать фотографии
                        </div>

                        <div class="file-input-subtitle">
                            Можно выбрать сразу много фотографий
                        </div>

                    </div>

                </label>

            </div>

            ${
                item?.album_photos?.length
                    ? `
                        <div class="admin-list mt-15">

                            ${item.album_photos.map(
                                photo => `
                                    <div class="admin-list-item">

                                        <img
                                            class="admin-list-image"
                                            src="${escapeHtml(
                                                getImageUrl(
                                                    photo.image
                                                )
                                            )}"
                                            alt=""
                                        >

                                        <div class="admin-list-content">
                                            Фото
                                        </div>

                                        <button
                                            class="btn btn-danger btn-small"
                                            onclick="deleteAlbumPhoto('${photo.id}')"
                                        >
                                            Удалить
                                        </button>

                                    </div>
                                `
                            ).join("")}

                        </div>
                    `
                    : ""
            }
        `,

        footer: `
            <button
                class="btn btn-secondary"
                onclick="closeModal()"
            >
                Отмена
            </button>

            <button
                class="btn btn-primary"
                onclick="saveAlbum()"
            >
                Сохранить
            </button>
        `
    });
}

function editAlbum(id) {
    openAlbumModal(id);
}

async function saveAlbum() {
    const title =
        $("#albumTitle")
            ?.value.trim();

    if (!title) {
        showToast(
            "Введите название альбома",
            "error"
        );
        return;
    }

    try {
        const existing =
            albumsCache.find(
                x => x.id === editingId
            );

        let cover =
            existing?.cover ||
            null;

        const coverFile =
            $("#albumCover")?.files?.[0];

        if (coverFile) {
            cover = await uploadFile(
                coverFile,
                "albums"
            );
        }

        const payload = {
            title,

            album_date:
                $("#albumDate")?.value ||
                new Date()
                    .toISOString()
                    .slice(0, 10),

            cover
        };

        let albumId = editingId;

        if (editingId) {
            const {
                error
            } = await supabase
                .from("albums")
                .update(payload)
                .eq("id", editingId);

            if (error) throw error;
        } else {
            const {
                data,
                error
            } = await supabase
                .from("albums")
                .insert(payload)
                .select()
                .single();

            if (error) throw error;

            albumId = data.id;
        }

        const files =
            [...(
                $("#albumPhotos")?.files ||
                []
            )];

        for (const file of files) {
            const path =
                await uploadFile(
                    file,
                    "albums"
                );

            const {
                error
            } = await supabase
                .from("album_photos")
                .insert({
                    album_id: albumId,
                    image: path
                });

            if (error) throw error;
        }

        closeModal();

        showToast("Альбом сохранён");

        await loadAlbums();
    } catch (error) {
        handleError(
            error,
            "Не удалось сохранить альбом"
        );
    }
}

async function deleteAlbumPhoto(id) {
    if (!confirm("Удалить фотографию?")) {
        return;
    }

    try {
        const {
            error
        } = await supabase
            .from("album_photos")
            .delete()
            .eq("id", id);

        if (error) throw error;

        showToast("Фотография удалена");

        await loadAlbums();
    } catch (error) {
        handleError(
            error,
            "Не удалось удалить фотографию"
        );
    }
}

async function deleteAlbum(id) {
    if (!confirm("Удалить альбом?")) return;

    try {
        const {
            error
        } = await supabase
            .from("albums")
            .delete()
            .eq("id", id);

        if (error) throw error;

        showToast("Альбом удалён");

        await loadAlbums();
    } catch (error) {
        handleError(
            error,
            "Не удалось удалить альбом"
        );
    }
}

/* =========================================================
   STORAGE
========================================================= */

async function uploadFile(file, folder = "uploads") {
    if (!file) return null;

    const extension =
        file.name.includes(".")
            ? file.name
                .split(".")
                .pop()
                .toLowerCase()
            : "bin";

    const fileName =
        `${Date.now()}-${uuid()}.${extension}`;

    const path =
        `${folder}/${fileName}`;

    const {
        data,
        error
    } = await supabase
        .storage
        .from(STORAGE_BUCKET)
        .upload(
            path,
            file,
            {
                cacheControl: "3600",
                upsert: false,
                contentType:
                    file.type ||
                    "application/octet-stream"
            }
        );

    if (error) throw error;

    return data.path;
}

/* =========================================================
   GENERIC HELPERS
========================================================= */

function setText(selector, value) {
    const element = $(selector);

    if (element) {
        element.textContent =
            value ?? "";
    }
}

function setInput(selector, value) {
    const element = $(selector);

    if (element) {
        element.value =
            value ?? "";
    }
}

/* =========================================================
   EVENT BINDINGS
========================================================= */

function setupButtons() {

    /* AUTH */

    $("#loginForm")?.addEventListener(
        "submit",
        login
    );

    $("#logoutButton")?.addEventListener(
        "click",
        logout
    );

    /* NAVIGATION */

    setupNavigation();

    setupModal();

    /* SETTINGS */

    $("#settingsForm")?.addEventListener(
        "submit",
        saveSettings
    );

    /* NEWS */

    $("#addNewsButton")?.addEventListener(
        "click",
        () => openNewsModal()
    );

    /* STORIES */

    $("#addStoryButton")?.addEventListener(
        "click",
        () => openStoryModal()
    );

    /* CLUBS */

    $("#addClubButton")?.addEventListener(
        "click",
        () => openClubModal()
    );

    /* MATCHES */

    $("#addMatchButton")?.addEventListener(
        "click",
        () => openMatchModal()
    );

    /* ALBUMS */

    $("#addAlbumButton")?.addEventListener(
        "click",
        () => openAlbumModal()
    );

    /* STATS */

    $("#addStatButton")?.addEventListener(
        "click",
        () => openStatModal()
    );

    $$(".admin-tab[data-stat-type]").forEach(tab => {
        tab.addEventListener("click", () => {

            $$(".admin-tab[data-stat-type]")
                .forEach(item => {
                    item.classList.remove("active");
                });

            tab.classList.add("active");

            currentStatType =
                tab.dataset.statType;

            loadStats(currentStatType);
        });
    });

    /* MATCH FILTERS */

    $$(".match-filter").forEach(button => {
        button.addEventListener("click", () => {

            $$(".match-filter")
                .forEach(item => {
                    item.classList.remove("active");
                });

            button.classList.add("active");

            loadMatches(
                button.dataset.status ||
                null
            );
        });
    });
}

/* =========================================================
   COLOR PICKERS
========================================================= */

function setupColorInputs() {
    const pairs = [
        ["#settingPrimary", "#settingPrimaryCode"],
        ["#settingBlue", "#settingBlueCode"],
        ["#settingYellow", "#settingYellowCode"],
        ["#settingWhite", "#settingWhiteCode"]
    ];

    pairs.forEach(([colorSelector, codeSelector]) => {

        const color = $(colorSelector);
        const code = $(codeSelector);

        if (!color || !code) return;

        color.addEventListener("input", () => {
            code.value =
                color.value;
        });

        code.addEventListener("input", () => {

            const value =
                code.value.trim();

            if (
                /^#[0-9A-Fa-f]{6}$/.test(
                    value
                )
            ) {
                color.value =
                    value;
            }
        });
    });
}

/* =========================================================
   FILE PREVIEW
========================================================= */

function setupFilePreviews() {
    document.addEventListener(
        "change",
        event => {

            const input =
                event.target;

            if (
                !input.matches(
                    "input[type='file']"
                )
            ) {
                return;
            }

            const files =
                [...input.files];

            if (!files.length) return;

            const wrapper =
                input.closest(".file-input");

            if (!wrapper) return;

            const title =
                $(".file-input-title", wrapper);

            if (title) {

                if (files.length === 1) {
                    title.textContent =
                        files[0].name;
                } else {
                    title.textContent =
                        `Выбрано файлов: ${files.length}`;
                }
            }
        }
    );
}

/* =========================================================
   AUTH STATE
========================================================= */

function setupAuthStateListener() {
    supabase.auth.onAuthStateChange(
        (event, session) => {

            if (event === "SIGNED_IN") {
                currentUser =
                    session?.user || null;

                showAdmin();
            }

            if (event === "SIGNED_OUT") {
                currentUser = null;

                showAuth();
            }
        }
    );
}

/* =========================================================
   INITIALIZATION
========================================================= */

async function initAdmin() {
    setupButtons();

    setupColorInputs();

    setupFilePreviews();

    setupAuthStateListener();

    await checkAuth();
}

/* =========================================================
   GLOBAL FUNCTIONS
========================================================= */

window.openSection = openSection;

window.openNewsModal = openNewsModal;
window.editNews = editNews;
window.saveNews = saveNews;
window.deleteNews = deleteNews;

window.openStoryModal = openStoryModal;
window.editStory = editStory;
window.saveStory = saveStory;
window.deleteStory = deleteStory;

window.openClubModal = openClubModal;
window.editClub = editClub;
window.saveClub = saveClub;
window.deleteClub = deleteClub;

window.openMatchModal = openMatchModal;
window.editMatch = editMatch;
window.saveMatch = saveMatch;
window.deleteMatch = deleteMatch;

window.addGoal = addGoal;
window.saveGoal = saveGoal;
window.addPenalty = addPenalty;
window.savePenalty = savePenalty;

window.addStandingRow = addStandingRow;
window.saveStandings = saveStandings;
window.deleteStanding = deleteStanding;

window.openStatModal = openStatModal;
window.editStat = editStat;
window.saveStat = saveStat;
window.deleteStat = deleteStat;

window.openLeaderModal = openLeaderModal;
window.editLeader = editLeader;
window.saveLeader = saveLeader;
window.deleteLeader = deleteLeader;

window.openAlbumModal = openAlbumModal;
window.editAlbum = editAlbum;
window.saveAlbum = saveAlbum;
window.deleteAlbum = deleteAlbum;
window.deleteAlbumPhoto = deleteAlbumPhoto;

window.closeModal = closeModal;

document.addEventListener(
    "DOMContentLoaded",
    initAdmin
);
