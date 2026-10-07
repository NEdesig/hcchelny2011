/* =========================================================
   ХК ЧЕЛНЫ 2011 — ADMIN.JS
   Supabase Admin Panel
   ========================================================= */

(() => {
    "use strict";

    /* =========================================================
       CONFIG
       ========================================================= */

    const db = window.supabaseClient;

    if (!db) {
        console.error("Supabase client не найден.");
        return;
    }

    const STORAGE_BUCKET =
        window.STORAGE_BUCKET ||
        window.SUPABASE_CONFIG?.storageBucket ||
        "site-media";

    /* =========================================================
       STATE
       ========================================================= */

    let currentUser = null;
    let currentSection = "dashboard";
    let currentStatsFilter = "scorers";

    let clubsCache = [];
    let settingsCache = null;

    /* =========================================================
       DOM
       ========================================================= */

    const $ = (selector, parent = document) =>
        parent.querySelector(selector);

    const $$ = (selector, parent = document) =>
        [...parent.querySelectorAll(selector)];

    /* =========================================================
       ELEMENTS
       ========================================================= */

    const authScreen = $("#authScreen");
    const adminApp = $("#adminApp");

    const loginForm = $("#loginForm");
    const loginEmail = $("#loginEmail");
    const loginPassword = $("#loginPassword");
    const loginError = $("#loginError");

    const adminSidebar = $("#adminSidebar");
    const sidebarClose = $("#sidebarClose");
    const sidebarOpen = $("#sidebarOpen");

    const logoutButton = $("#logoutButton");
    const currentSectionLabel = $("#currentSectionLabel");

    const adminModal = $("#adminModal");
    const modalKicker = $("#modalKicker");
    const modalTitle = $("#modalTitle");
    const modalBody = $("#modalBody");
    const modalFooter = $("#modalFooter");
    const modalClose = $("#modalClose");

    const adminToast = $("#adminToast");
    const toastMessage = $("#toastMessage");

    /* =========================================================
       HELPERS
       ========================================================= */

    function escapeHTML(value = "") {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function showToast(message, type = "success") {
        if (!adminToast || !toastMessage) return;

        toastMessage.textContent = message;

        adminToast.classList.remove(
            "show",
            "success",
            "error"
        );

        adminToast.classList.add(type);

        requestAnimationFrame(() => {
            adminToast.classList.add("show");
        });

        clearTimeout(showToast.timer);

        showToast.timer = setTimeout(() => {
            adminToast.classList.remove("show");
        }, 3000);
    }

    function showError(message) {
        showToast(message, "error");
        console.error(message);
    }

    function setLoginError(message = "") {
        if (!loginError) return;

        loginError.textContent = message;
        loginError.classList.toggle("show", Boolean(message));
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }

    function formatDateTime(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function toDateTimeLocal(value) {
        if (!value) return "";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "";

        const offset = date.getTimezoneOffset();

        const local = new Date(
            date.getTime() - offset * 60000
        );

        return local.toISOString().slice(0, 16);
    }

    function localDateTimeToISO(value) {
        if (!value) return null;

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return null;

        return date.toISOString();
    }

    function safeFileName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-zа-яё0-9._-]/gi, "-")
            .replace(/-+/g, "-");
    }

    function uniqueId() {
        if (crypto?.randomUUID) {
            return crypto.randomUUID();
        }

        return `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;
    }

    /* =========================================================
       STORAGE
       ========================================================= */

    async function uploadFile(file, folder = "uploads") {
        if (!file) return null;

        const extension =
            file.name.includes(".")
                ? "." + file.name.split(".").pop()
                : "";

        const fileName =
            `${uniqueId()}-${safeFileName(
                file.name.replace(/\.[^/.]+$/, "")
            )}${extension}`;

        const path = `${folder}/${fileName}`;

        const { error } = await db.storage
            .from(STORAGE_BUCKET)
            .upload(path, file, {
                cacheControl: "3600",
                upsert: false
            });

        if (error) {
            throw error;
        }

        return path;
    }

    function publicFile(path) {
        if (!path) return "";

        if (
            path.startsWith("http://") ||
            path.startsWith("https://") ||
            path.startsWith("data:")
        ) {
            return path;
        }

        const { data } = db.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(path);

        return data?.publicUrl || "";
    }

    async function deleteStorageFile(path) {
        if (!path) return;

        try {
            await db.storage
                .from(STORAGE_BUCKET)
                .remove([path]);
        } catch (error) {
            console.warn(
                "Не удалось удалить файл:",
                error
            );
        }
    }

    /* =========================================================
       MODAL
       ========================================================= */

    function openModal({
        kicker = "Управление",
        title = "",
        body = "",
        footer = ""
    }) {
        if (!adminModal) return;

        if (modalKicker) {
            modalKicker.textContent = kicker;
        }

        if (modalTitle) {
            modalTitle.textContent = title;
        }

        if (modalBody) {
            modalBody.innerHTML = body;
        }

        if (modalFooter) {
            modalFooter.innerHTML = footer;
        }

        adminModal.classList.add("show");
        document.body.classList.add("modal-open");
    }

    function closeModal() {
        if (!adminModal) return;

        adminModal.classList.remove("show");
        document.body.classList.remove("modal-open");

        if (modalBody) modalBody.innerHTML = "";
        if (modalFooter) modalFooter.innerHTML = "";
    }

    modalClose?.addEventListener("click", closeModal);

    $$("[data-modal-close]").forEach(button => {
        button.addEventListener("click", closeModal);
    });

    adminModal?.addEventListener("click", event => {
        if (event.target === adminModal) {
            closeModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            adminModal?.classList.contains("show")
        ) {
            closeModal();
        }
    });

    /* =========================================================
       AUTH
       ========================================================= */

    async function checkAuth() {
        const {
            data,
            error
        } = await db.auth.getSession();

        if (error) {
            console.error(error);
            showAuth();
            return;
        }

        if (data?.session?.user) {
            currentUser = data.session.user;
            showAdmin();
        } else {
            showAuth();
        }
    }

    function showAuth() {
        if (authScreen) {
            authScreen.classList.remove("hidden");
        }

        if (adminApp) {
            adminApp.classList.add("hidden");
        }
    }

    async function showAdmin() {
        if (authScreen) {
            authScreen.classList.add("hidden");
        }

        if (adminApp) {
            adminApp.classList.remove("hidden");
        }

        await initializeAdmin();
    }

    loginForm?.addEventListener("submit", async event => {
        event.preventDefault();

        setLoginError("");

        const email = loginEmail?.value.trim();
        const password = loginPassword?.value;

        if (!email || !password) {
            setLoginError(
                "Введите email и пароль."
            );
            return;
        }

        const submitButton =
            loginForm.querySelector(
                'button[type="submit"]'
            );

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Вход...";
        }

        try {
            const {
                data,
                error
            } = await db.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                throw error;
            }

            currentUser = data.user;

            showToast("Вход выполнен.");

            await showAdmin();

        } catch (error) {
            console.error(error);

            setLoginError(
                error?.message ||
                "Не удалось выполнить вход."
            );

        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Войти";
            }
        }
    });

    logoutButton?.addEventListener("click", async () => {
        await db.auth.signOut();
    });

    db.auth.onAuthStateChange(
        async (_event, session) => {
            currentUser =
                session?.user || null;

            if (currentUser) {
                await showAdmin();
            } else {
                showAuth();
            }
        }
    );

    /* =========================================================
       NAVIGATION
       ========================================================= */

    function openSidebar() {
        adminSidebar?.classList.add("open");
    }

    function closeSidebar() {
        adminSidebar?.classList.remove("open");
    }

    sidebarOpen?.addEventListener(
        "click",
        openSidebar
    );

    sidebarClose?.addEventListener(
        "click",
        closeSidebar
    );

    $$(".admin-nav button").forEach(button => {
        button.addEventListener("click", () => {
            const section =
                button.dataset.section;

            if (!section) return;

            switchSection(section);
            closeSidebar();
        });
    });

    $$("[data-go-section]").forEach(button => {
        button.addEventListener("click", () => {
            switchSection(
                button.dataset.goSection
            );
        });
    });

    function switchSection(section) {
        currentSection = section;

        $$(".admin-section").forEach(
            element => {
                element.classList.toggle(
                    "active",
                    element.id ===
                    `section-${section}`
                );
            }
        );

        $$(".admin-nav button").forEach(
            button => {
                button.classList.toggle(
                    "active",
                    button.dataset.section ===
                    section
                );
            }
        );

        const activeButton =
            $(`.admin-nav button[data-section="${section}"]`);

        if (currentSectionLabel) {
            currentSectionLabel.textContent =
                activeButton?.textContent.trim() ||
                "Панель управления";
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        if (section === "dashboard") {
            loadDashboard();
        }

        if (section === "settings") {
            loadSettings();
        }

        if (section === "news") {
            loadNewsAdmin();
        }

        if (section === "stories") {
            loadStoriesAdmin();
        }

        if (section === "matches") {
            loadMatchesAdmin();
        }

        if (section === "clubs") {
            loadClubsAdmin();
        }

        if (section === "competition") {
            loadCompetition();
        }

        if (section === "stats") {
            loadStatsAdmin();
        }

        if (section === "leaders") {
            loadLeaders();
        }

        if (section === "albums") {
            loadAlbumsAdmin();
        }
    }

    /* =========================================================
       INITIALIZATION
       ========================================================= */

    async function initializeAdmin() {
        try {
            await loadSettings();
            await loadClubsCache();
            await loadDashboard();

            switchSection("dashboard");

        } catch (error) {
            console.error(error);
            showError(
                "Не удалось загрузить панель управления."
            );
        }
    }

    /* =========================================================
       SETTINGS
       ========================================================= */

    async function getSettings() {
        const {
            data,
            error
        } = await db
            .from("site_settings")
            .select("*")
            .order("created_at", {
                ascending: true
            })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        return data;
    }

    async function loadSettings() {
        try {
            const settings =
                await getSettings();

            settingsCache = settings;

            if (!settings) return;

            const map = {
                settingsTeamName:
                    settings.team_name || "",
                settingsSubtitle:
                    settings.subtitle || "",
                settingsCity:
                    settings.city || ""
            };

            Object.entries(map).forEach(
                ([id, value]) => {
                    const input = document.getElementById(id);

                    if (input) {
                        input.value = value;
                    }
                }
            );

            setColorInput(
                "settingsPrimaryColor",
                "settingsPrimaryColorText",
                settings.primary_color
            );

            setColorInput(
                "settingsAccentColor",
                "settingsAccentColorText",
                settings.accent_color
            );

            setColorInput(
                "settingsGoldColor",
                "settingsGoldColorText",
                settings.gold_color
            );

            setColorInput(
                "settingsWhiteColor",
                "settingsWhiteColorText",
                settings.white_color
            );

            const preview =
                $("#settingsLogoPreview");

            if (preview) {
                preview.src =
                    publicFile(settings.logo_path) ||
                    "";
            }

        } catch (error) {
            console.error(error);
            showError(
                "Ошибка загрузки настроек."
            );
        }
    }

    function setColorInput(
        colorId,
        textId,
        value
    ) {
        if (!value) return;

        const color =
            document.getElementById(colorId);

        const text =
            document.getElementById(textId);

        if (color) color.value = value;
        if (text) text.value = value;
    }

    function bindColorInputs() {
        const pairs = [
            [
                "settingsPrimaryColor",
                "settingsPrimaryColorText"
            ],
            [
                "settingsAccentColor",
                "settingsAccentColorText"
            ],
            [
                "settingsGoldColor",
                "settingsGoldColorText"
            ],
            [
                "settingsWhiteColor",
                "settingsWhiteColorText"
            ]
        ];

        pairs.forEach(([colorId, textId]) => {
            const color =
                document.getElementById(colorId);

            const text =
                document.getElementById(textId);

            color?.addEventListener(
                "input",
                () => {
                    if (text) {
                        text.value = color.value;
                    }
                }
            );

            text?.addEventListener(
                "input",
                () => {
                    const value =
                        text.value.trim();

                    if (
                        /^#[0-9a-f]{6}$/i.test(value) &&
                        color
                    ) {
                        color.value = value;
                    }
                }
            );
        });
    }

    bindColorInputs();

    const settingsForm =
        $("#settingsForm");

    settingsForm?.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            try {
                const file =
                    $("#settingsLogo")?.files?.[0];

                let logoPath =
                    settingsCache?.logo_path ||
                    null;

                if (file) {
                    logoPath =
                        await uploadFile(
                            file,
                            "logo"
                        );
                }

                const payload = {
                    team_name:
                        $("#settingsTeamName")
                            ?.value.trim() ||
                        "ХК Челны 2011",

                    subtitle:
                        $("#settingsSubtitle")
                            ?.value.trim() ||
                        "хоккейный клуб",

                    city:
                        $("#settingsCity")
                            ?.value.trim() ||
                        "Набережные Челны",

                    logo_path:
                        logoPath,

                    primary_color:
                        $("#settingsPrimaryColorText")
                            ?.value.trim() ||
                        "#000056",

                    accent_color:
                        $("#settingsAccentColorText")
                            ?.value.trim() ||
                        "#0875dc",

                    gold_color:
                        $("#settingsGoldColorText")
                            ?.value.trim() ||
                        "#ffcd00",

                    white_color:
                        $("#settingsWhiteColorText")
                            ?.value.trim() ||
                        "#ffffff",

                    updated_at:
                        new Date().toISOString()
                };

                if (settingsCache?.id) {
                    const {
                        error
                    } = await db
                        .from("site_settings")
                        .update(payload)
                        .eq(
                            "id",
                            settingsCache.id
                        );

                    if (error) throw error;

                } else {
                    const {
                        data,
                        error
                    } = await db
                        .from("site_settings")
                        .insert(payload)
                        .select()
                        .single();

                    if (error) throw error;

                    settingsCache = data;
                }

                settingsCache = {
                    ...settingsCache,
                    ...payload
                };

                showToast(
                    "Настройки сохранены."
                );

            } catch (error) {
                console.error(error);
                showError(
                    error.message ||
                    "Не удалось сохранить настройки."
                );
            }
        }
    );

    /* =========================================================
       DASHBOARD
       ========================================================= */

    async function countTable(table) {
        const {
            count,
            error
        } = await db
            .from(table)
            .select("*", {
                count: "exact",
                head: true
            });

        if (error) throw error;

        return count || 0;
    }

    async function loadDashboard() {
        try {
            const [
                news,
                matches,
                albums,
                clubs
            ] = await Promise.all([
                countTable("news"),
                countTable("matches"),
                countTable("albums"),
                countTable("clubs")
            ]);

            const values = {
                dashboardNewsCount: news,
                dashboardMatchesCount: matches,
                dashboardAlbumsCount: albums,
                dashboardClubsCount: clubs
            };

            Object.entries(values).forEach(
                ([id, value]) => {
                    const element =
                        document.getElementById(id);

                    if (element) {
                        element.textContent =
                            value;
                    }
                }
            );

        } catch (error) {
            console.error(error);
        }
    }

    /* =========================================================
       NEWS
       ========================================================= */

    $("#addNewsButton")?.addEventListener(
        "click",
        () => openNewsModal()
    );

    async function loadNewsAdmin() {
        const container =
            $("#newsListAdmin");

        if (!container) return;

        container.innerHTML =
            `<div class="admin-loading">Загрузка...</div>`;

        const {
            data,
            error
        } = await db
            .from("news")
            .select("*")
            .order("published_at", {
                ascending: false
            });

        if (error) {
            console.error(error);
            container.innerHTML =
                `<div class="admin-empty">
                    Не удалось загрузить новости.
                </div>`;
            return;
        }

        if (!data?.length) {
            container.innerHTML =
                `<div class="admin-empty">
                    Новостей пока нет.
                </div>`;
            return;
        }

        container.innerHTML =
            data.map(news => `
                <article class="admin-content-card">
                    <div class="admin-content-card-media">
                        ${
                            news.image_path
                                ? `<img src="${escapeHTML(
                                      publicFile(news.image_path)
                                  )}" alt="">`
                                : ""
                        }
                    </div>

                    <div class="admin-content-card-body">
                        <span class="admin-badge">
                            ${escapeHTML(
                                news.tag || "Новость"
                            )}
                        </span>

                        <h3>
                            ${escapeHTML(
                                news.title
                            )}
                        </h3>

                        <p>
                            ${formatDateTime(
                                news.published_at
                            )}
                        </p>
                    </div>

                    <div class="admin-content-card-actions">
                        <button
                            class="button secondary"
                            data-edit-news="${news.id}"
                        >
                            Изменить
                        </button>

                        <button
                            class="button danger"
                            data-delete-news="${news.id}"
                        >
                            Удалить
                        </button>
                    </div>
                </article>
            `).join("");

        $$("[data-edit-news]", container)
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        const item =
                            data.find(
                                n =>
                                    n.id ===
                                    button.dataset.editNews
                            );

                        if (item) {
                            openNewsModal(item);
                        }
                    }
                );
            });

        $$("[data-delete-news]", container)
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () =>
                        deleteNews(
                            button.dataset.deleteNews
                        )
                );
            });
    }

    function openNewsModal(item = null) {
        const isEdit = Boolean(item);

        openModal({
            kicker: "Новости",
            title: isEdit
                ? "Изменить новость"
                : "Новая новость",

            body: `
                <div class="form-grid">

                    <label class="form-field">
                        <span>Заголовок</span>
                        <input
                            id="modalNewsTitle"
                            type="text"
                            value="${escapeHTML(
                                item?.title || ""
                            )}"
                            placeholder="Заголовок новости"
                        >
                    </label>

                    <label class="form-field">
                        <span>Тег</span>
                        <input
                            id="modalNewsTag"
                            type="text"
                            value="${escapeHTML(
                                item?.tag || "новость"
                            )}"
                            placeholder="новость"
                        >
                    </label>

                    <label class="form-field full">
                        <span>Текст</span>
                        <textarea
                            id="modalNewsText"
                            rows="7"
                            placeholder="Текст новости"
                        >${escapeHTML(
                            item?.text || ""
                        )}</textarea>
                    </label>

                    <label class="form-field">
                        <span>Дата и время публикации</span>
                        <input
                            id="modalNewsDate"
                            type="datetime-local"
                            value="${toDateTimeLocal(
                                item?.published_at ||
                                new Date().toISOString()
                            )}"
                        >
                    </label>

                    <label class="form-field">
                        <span>Изображение</span>
                        <input
                            id="modalNewsImage"
                            type="file"
                            accept="image/*"
                        >
                    </label>

                </div>
            `,

            footer: `
                <button
                    class="button secondary"
                    data-modal-close
                >
                    Отмена
                </button>

                <button
                    class="button primary"
                    id="saveNewsButton"
                >
                    Сохранить
                </button>
            `
        });

        $("#saveNewsButton")
            ?.addEventListener(
                "click",
                async () => {
                    try {
                        const title =
                            $("#modalNewsTitle")
                                ?.value.trim();

                        if (!title) {
                            showError(
                                "Введите заголовок."
                            );
                            return;
                        }

                        let imagePath =
                            item?.image_path ||
                            null;

                        const file =
                            $("#modalNewsImage")
                                ?.files?.[0];

                        if (file) {
                            imagePath =
                                await uploadFile(
                                    file,
                                    "news"
                                );
                        }

                        const payload = {
                            title,
                            tag:
                                $("#modalNewsTag")
                                    ?.value.trim() ||
                                "новость",

                            text:
                                $("#modalNewsText")
                                    ?.value.trim() ||
                                "",

                            image_path:
                                imagePath,

                            published_at:
                                localDateTimeToISO(
                                    $("#modalNewsDate")
                                        ?.value
                                ),

                            updated_at:
                                new Date().toISOString()
                        };

                        if (item) {
                            const {
                                error
                            } = await db
                                .from("news")
                                .update(payload)
                                .eq(
                                    "id",
                                    item.id
                                );

                            if (error) throw error;

                        } else {
                            const {
                                error
                            } = await db
                                .from("news")
                                .insert(payload);

                            if (error) throw error;
                        }

                        closeModal();
                        showToast(
                            isEdit
                                ? "Новость обновлена."
                                : "Новость опубликована."
                        );

                        await loadNewsAdmin();
                        await loadDashboard();

                    } catch (error) {
                        console.error(error);
                        showError(
                            error.message ||
                            "Ошибка сохранения новости."
                        );
                    }
                }
            );
    }

    async function deleteNews(id) {
        if (
            !confirm(
                "Удалить эту новость?"
            )
        ) return;

        try {
            const {
                data,
                error: readError
            } = await db
                .from("news")
                .select("image_path")
                .eq("id", id)
                .maybeSingle();

            if (readError) throw readError;

            const {
                error
            } = await db
                .from("news")
                .delete()
                .eq("id", id);

            if (error) throw error;

            if (data?.image_path) {
                await deleteStorageFile(
                    data.image_path
                );
            }

            showToast(
                "Новость удалена."
            );

            await loadNewsAdmin();
            await loadDashboard();

        } catch (error) {
            console.error(error);
            showError(
                "Не удалось удалить новость."
            );
        }
    }

    /* =========================================================
       STORIES
       ========================================================= */

    $("#addStoryButton")?.addEventListener(
        "click",
        () => openStoryModal()
    );

    async function loadStoriesAdmin() {
        const container =
            $("#storiesListAdmin");

        if (!container) return;

        const {
            data,
            error
        } = await db
            .from("stories")
            .select("*")
            .order("created_at", {
                ascending: false
            });

        if (error) {
            console.error(error);
            return;
        }

        if (!data?.length) {
            container.innerHTML =
                `<div class="admin-empty">
                    Сторис пока нет.
                </div>`;
            return;
        }

        container.innerHTML =
            data.map(story => `
                <article class="admin-content-card">

                    <div class="admin-content-card-media portrait">
                        <img
                            src="${escapeHTML(
                                publicFile(
                                    story.image_path
                                )
                            )}"
                            alt=""
                        >
                    </div>

                    <div class="admin-content-card-body">
                        <span class="admin-badge">
                            Сторис
                        </span>

                        <h3>
                            ${
                                story.expires_at
                                    ? `До ${formatDateTime(
                                          story.expires_at
                                      )}`
                                    : "Без срока"
                            }
                        </h3>
                    </div>

                    <div class="admin-content-card-actions">
                        <button
                            class="button secondary"
                            data-edit-story="${story.id}"
                        >
                            Изменить
                        </button>

                        <button
                            class="button danger"
                            data-delete-story="${story.id}"
                        >
                            Удалить
                        </button>
                    </div>

                </article>
            `).join("");

        $$("[data-edit-story]", container)
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        const story =
                            data.find(
                                x =>
                                    x.id ===
                                    button.dataset.editStory
                            );

                        if (story) {
                            openStoryModal(story);
                        }
                    }
                );
            });

        $$("[data-delete-story]", container)
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () =>
                        deleteStory(
                            button.dataset.deleteStory
                        )
                );
            });
    }

    function openStoryModal(item = null) {
        const isEdit = Boolean(item);

        openModal({
            kicker: "Stories",
            title: isEdit
                ? "Изменить сторис"
                : "Новая сторис",

            body: `
                <div class="form-grid">

                    <label class="form-field">
                        <span>Изображение</span>
                        <input
                            id="modalStoryImage"
                            type="file"
                            accept="image/*"
                        >
                    </label>

                    <label class="form-field">
                        <span>Удалить после</span>
                        <input
                            id="modalStoryExpires"
                            type="datetime-local"
                            value="${toDateTimeLocal(
                                item?.expires_at ||
                                new Date(
                                    Date.now() +
                                    24 * 60 * 60 * 1000
                                ).toISOString()
                            )}"
                        >
                    </label>

                </div>
            `,

            footer: `
                <button
                    class="button secondary"
                    data-modal-close
                >
                    Отмена
                </button>

                <button
                    class="button primary"
                    id="saveStoryButton"
                >
                    Сохранить
                </button>
            `
        });

        $("#saveStoryButton")
            ?.addEventListener(
                "click",
                async () => {
                    try {
                        let imagePath =
                            item?.image_path ||
                            null;

                        const file =
                            $("#modalStoryImage")
                                ?.files?.[0];

                        if (file) {
                            imagePath =
                                await uploadFile(
                                    file,
                                    "stories"
                                );
                        }

                        if (!imagePath) {
                            showError(
                                "Загрузите изображение."
                            );
                            return;
                        }

                        const payload = {
                            image_path:
                                imagePath,

                            expires_at:
                                localDateTimeToISO(
                                    $("#modalStoryExpires")
                                        ?.value
                                )
                        };

                        if (item) {
                            const {
                                error
                            } = await db
                                .from("stories")
                                .update(payload)
                                .eq(
                                    "id",
                                    item.id
                                );

                            if (error) throw error;

                        } else {
                            const {
                                error
                            } = await db
                                .from("stories")
                                .insert(payload);

                            if (error) throw error;
                        }

                        closeModal();
                        showToast(
                            isEdit
                                ? "Сторис обновлена."
                                : "Сторис добавлена."
                        );

                        await loadStoriesAdmin();

                    } catch (error) {
                        console.error(error);
                        showError(
                            error.message ||
                            "Ошибка сохранения сторис."
                        );
                    }
                }
            );
    }

    async function deleteStory(id) {
        if (
            !confirm(
                "Удалить эту сторис?"
            )
        ) return;

        try {
            const {
                data,
                error: readError
            } = await db
                .from("stories")
                .select("image_path")
                .eq("id", id)
                .maybeSingle();

            if (readError) throw readError;

            const {
                error
            } = await db
                .from("stories")
                .delete()
                .eq("id", id);

            if (error) throw error;

            if (data?.image_path) {
                await deleteStorageFile(
                    data.image_path
                );
            }

            showToast(
                "Сторис удалена."
            );

            await loadStoriesAdmin();

        } catch (error) {
            console.error(error);
            showError(
                "Не удалось удалить сторис."
            );
        }
    }

    /* =========================================================
       CLUBS
       ========================================================= */

    $("#addClubButton")?.addEventListener(
        "click",
        () => openClubModal()
    );

    async function loadClubsCache() {
        const {
            data,
            error
        } = await db
            .from("clubs")
            .select("*")
            .order("name");

        if (error) throw error;

        clubsCache = data || [];

        return clubsCache;
    }

    async function loadClubsAdmin() {
        const container =
            $("#clubsListAdmin");

        if (!container) return;

        try {
            await loadClubsCache();

            if (!clubsCache.length) {
                container.innerHTML =
                    `<div class="admin-empty">
                        Клубов пока нет.
                    </div>`;
                return;
            }

            container.innerHTML =
                clubsCache.map(club => `
                    <article class="admin-content-card">

                        <div class="admin-content-card-media logo">
                            ${
                                club.logo_path
                                    ? `<img
                                        src="${escapeHTML(
                                            publicFile(
                                                club.logo_path
                                            )
                                        )}"
                                        alt=""
                                    >`
                                    : ""
                            }
                        </div>

                        <div class="admin-content-card-body">
                            <span class="admin-badge">
                                Клуб
                            </span>

                            <h3>
                                ${escapeHTML(
                                    club.name
                                )}
                            </h3>

                            <p>
                                ${escapeHTML(
                                    club.city || ""
                                )}
                            </p>
                        </div>

                        <div class="admin-content-card-actions">
                            <button
                                class="button secondary"
                                data-edit-club="${club.id}"
                            >
                                Изменить
                            </button>

                            <button
                                class="button danger"
                                data-delete-club="${club.id}"
                            >
                                Удалить
                            </button>
                        </div>

                    </article>
                `).join("");

            $$("[data-edit-club]", container)
                .forEach(button => {
                    button.addEventListener(
                        "click",
                        () => {
                            const club =
                                clubsCache.find(
                                    x =>
                                        x.id ===
                                        button.dataset.editClub
                                );

                            if (club) {
                                openClubModal(club);
                            }
                        }
                    );
                });

            $$("[data-delete-club]", container)
                .forEach(button => {
                    button.addEventListener(
                        "click",
                        () =>
                            deleteClub(
                                button.dataset.deleteClub
                            )
                    );
                });

        } catch (error) {
            console.error(error);
            showError(
                "Ошибка загрузки клубов."
            );
        }
    }

    function openClubModal(item = null) {
        const isEdit = Boolean(item);

        openModal({
            kicker: "Клубы",
            title: isEdit
                ? "Изменить клуб"
                : "Новый клуб",

            body: `
                <div class="form-grid">

                    <label class="form-field">
                        <span>Название клуба</span>
                        <input
                            id="modalClubName"
                            type="text"
                            value="${escapeHTML(
                                item?.name || ""
                            )}"
                            placeholder="ХК Челны 2011"
                        >
                    </label>

                    <label class="form-field">
                        <span>Город</span>
                        <input
                            id="modalClubCity"
                            type="text"
                            value="${escapeHTML(
                                item?.city || ""
                            )}"
                            placeholder="Набережные Челны"
                        >
                    </label>

                    <label class="form-field">
                        <span>Логотип</span>
                        <input
                            id="modalClubLogo"
                            type="file"
                            accept="image/*"
                        >
                    </label>

                </div>
            `,

            footer: `
                <button
                    class="button secondary"
                    data-modal-close
                >
                    Отмена
                </button>

                <button
                    class="button primary"
                    id="saveClubButton"
                >
                    Сохранить
                </button>
            `
        });

        $("#saveClubButton")
            ?.addEventListener(
                "click",
                async () => {
                    try {
                        const name =
                            $("#modalClubName")
                                ?.value.trim();

                        if (!name) {
                            showError(
                                "Введите название клуба."
                            );
                            return;
                        }

                        let logoPath =
                            item?.logo_path ||
                            null;

                        const file =
                            $("#modalClubLogo")
                                ?.files?.[0];

                        if (file) {
                            logoPath =
                                await uploadFile(
                                    file,
                                    "clubs"
                                );
                        }

                        const payload = {
                            name,
                            city:
                                $("#modalClubCity")
                                    ?.value.trim() ||
                                "",

                            logo_path:
                                logoPath,

                            updated_at:
                                new Date().toISOString()
                        };

                        if (item) {
                            const {
                                error
                            } = await db
                                .from("clubs")
                                .update(payload)
                                .eq(
                                    "id",
                                    item.id
                                );

                            if (error) throw error;

                        } else {
                            const {
                                error
                            } = await db
                                .from("clubs")
                                .insert(payload);

                            if (error) throw error;
                        }

                        closeModal();

                        showToast(
                            isEdit
                                ? "Клуб обновлён."
                                : "Клуб добавлен."
                        );

                        await loadClubsAdmin();
                        await loadClubsCache();
                        await loadDashboard();

                    } catch (error) {
                        console.error(error);
                        showError(
                            error.message ||
                            "Ошибка сохранения клуба."
                        );
                    }
                }
            );
    }

    async function deleteClub(id) {
        if (
            !confirm(
                "Удалить этот клуб?"
            )
        ) return;

        try {
            const {
                data,
                error: readError
            } = await db
                .from("clubs")
                .select("logo_path")
                .eq("id", id)
                .maybeSingle();

            if (readError) throw readError;

            const {
                error
            } = await db
                .from("clubs")
                .delete()
                .eq("id", id);

            if (error) throw error;

            if (data?.logo_path) {
                await deleteStorageFile(
                    data.logo_path
                );
            }

            showToast(
                "Клуб удалён."
            );

            await loadClubsAdmin();
            await loadClubsCache();
            await loadDashboard();

        } catch (error) {
            console.error(error);

            showError(
                error.message ||
                "Не удалось удалить клуб."
            );
        }
    }

    /* =========================================================
       MATCHES
       ========================================================= */

    $("#addMatchButton")?.addEventListener(
        "click",
        () => openMatchModal()
    );

    const statusLabels = {
        scheduled: "Запланирован",
        live: "Идёт",
        finished: "Завершён",
        cancelled: "Отменён"
    };

    async function loadMatchesAdmin() {
        const container =
            $("#matchesListAdmin");

        if (!container) return;

        container.innerHTML =
            `<div class="admin-loading">Загрузка...</div>`;

        const {
            data,
            error
        } = await db
            .from("matches")
            .select(`
                *,
                home:clubs!matches_home_club_id_fkey(*),
                away:clubs!matches_away_club_id_fkey(*)
            `)
            .order("match_date", {
                ascending: false
            });

        if (error) {
            console.error(error);
            container.innerHTML =
                `<div class="admin-empty">
                    Ошибка загрузки матчей.
                </div>`;
            return;
        }

        if (!data?.length) {
            container.innerHTML =
                `<div class="admin-empty">
                    Матчей пока нет.
                </div>`;
            return;
        }

        container.innerHTML =
            data.map(match => `
                <article class="admin-content-card">

                    <div class="admin-content-card-body wide">

                        <span class="admin-badge">
                            ${escapeHTML(
                                statusLabels[
                                    match.status
                                ] ||
                                match.status ||
                                "Матч"
                            )}
                        </span>

                        <h3>
                            ${escapeHTML(
                                match.home?.name ||
                                "—"
                            )}
                            —
                            ${escapeHTML(
                                match.away?.name ||
                                "—"
                            )}
                        </h3>

                        <p>
                            ${formatDateTime(
                                match.match_date
                            )}
                            ·
                            ${escapeHTML(
                                match.venue || ""
                            )}
                        </p>

                        <strong>
                            ${match.home_score ?? 0}
                            :
                            ${match.away_score ?? 0}
                        </strong>

                    </div>

                    <div class="admin-content-card-actions">

                        <button
                            class="button secondary"
                            data-edit-match="${match.id}"
                        >
                            Изменить
                        </button>

                        <button
                            class="button secondary"
                            data-live-match="${match.id}"
                        >
                            События
                        </button>

                        <button
                            class="button danger"
                            data-delete-match="${match.id}"
                        >
                            Удалить
                        </button>

                    </div>

                </article>
            `).join("");

        $$("[data-edit-match]", container)
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        const match =
                            data.find(
                                x =>
                                    x.id ===
                                    button.dataset.editMatch
                            );

                        if (match) {
                            openMatchModal(match);
                        }
                    }
                );
            });

        $$("[data-live-match]", container)
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        const match =
                            data.find(
                                x =>
                                    x.id ===
                                    button.dataset.liveMatch
                            );

                        if (match) {
                            openMatchEventsModal(
                                match
                            );
                        }
                    }
                );
            });

        $$("[data-delete-match]", container)
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () =>
                        deleteMatch(
                            button.dataset.deleteMatch
                        )
                );
            });
    }

    function clubOptions(selected) {
        return clubsCache
            .map(club => `
                <option
                    value="${club.id}"
                    ${
                        selected === club.id
                            ? "selected"
                            : ""
                    }
                >
                    ${escapeHTML(
                        club.name
                    )}
                </option>
            `)
            .join("");
    }

    function openMatchModal(item = null) {
        const isEdit = Boolean(item);

        openModal({
            kicker: "Матчи",
            title: isEdit
                ? "Изменить матч"
                : "Новый матч",

            body: `
                <div class="form-grid">

                    <label class="form-field">
                        <span>Хозяева</span>
                        <select id="modalMatchHome">
                            <option value="">
                                Выберите клуб
                            </option>
                            ${clubOptions(
                                item?.home_club_id
                            )}
                        </select>
                    </label>

                    <label class="form-field">
                        <span>Гости</span>
                        <select id="modalMatchAway">
                            <option value="">
                                Выберите клуб
                            </option>
                            ${clubOptions(
                                item?.away_club_id
                            )}
                        </select>
                    </label>

                    <label class="form-field">
                        <span>Дата и время</span>
                        <input
                            id="modalMatchDate"
                            type="datetime-local"
                            value="${toDateTimeLocal(
                                item?.match_date
                            )}"
                        >
                    </label>

                    <label class="form-field">
                        <span>Арена</span>
                        <input
                            id="modalMatchVenue"
                            type="text"
                            value="${escapeHTML(
                                item?.venue || ""
                            )}"
                            placeholder="ЛД «Челны»"
                        >
                    </label>

                    <label class="form-field">
                        <span>Соревнование</span>
                        <input
                            id="modalMatchCompetition"
                            type="text"
                            value="${escapeHTML(
                                item?.competition ||
                                "Первенство ПФО. Группа Б2"
                            )}"
                        >
                    </label>

                    <label class="form-field">
                        <span>Статус</span>
                        <select id="modalMatchStatus">
                            ${Object.entries(
                                statusLabels
                            )
                            .map(
                                ([value, label]) => `
                                    <option
                                        value="${value}"
                                        ${
                                            (
                                                item?.status ||
                                                "scheduled"
                                            ) === value
                                                ? "selected"
                                                : ""
                                        }
                                    >
                                        ${label}
                                    </option>
                                `
                            )
                            .join("")}
                        </select>
                    </label>

                    <label class="form-field">
                        <span>Счёт хозяев</span>
                        <input
                            id="modalMatchHomeScore"
                            type="number"
                            min="0"
                            value="${
                                item?.home_score ??
                                0
                            }"
                        >
                    </label>

                    <label class="form-field">
                        <span>Счёт гостей</span>
                        <input
                            id="modalMatchAwayScore"
                            type="number"
                            min="0"
                            value="${
                                item?.away_score ??
                                0
                            }"
                        >
                    </label>

                </div>

                ${
                    isEdit
                        ? `
                            <div class="modal-section">
                                <h3>Состав на матч</h3>

                                <div id="matchRosterEditor">
                                    Загрузка...
                                </div>

                                <button
                                    type="button"
                                    class="button secondary"
                                    id="addRosterPlayer"
                                >
                                    + Добавить игрока
                                </button>
                            </div>
                        `
                        : ""
                }
            `,

            footer: `
                <button
                    class="button secondary"
                    data-modal-close
                >
                    Отмена
                </button>

                <button
                    class="button primary"
                    id="saveMatchButton"
                >
                    Сохранить
                </button>
            `
        });

        if (isEdit) {
            loadRosterEditor(item.id);

            $("#addRosterPlayer")
                ?.addEventListener(
                    "click",
                    () => {
                        addRosterRow();
                    }
                );
        }

        $("#saveMatchButton")
            ?.addEventListener(
                "click",
                async () => {
                    try {
                        const home =
                            $("#modalMatchHome")
                                ?.value;

                        const away =
                            $("#modalMatchAway")
                                ?.value;

                        if (!home || !away) {
                            showError(
                                "Выберите оба клуба."
                            );
                            return;
                        }

                        if (home === away) {
                            showError(
                                "Хозяева и гости должны быть разными клубами."
                            );
                            return;
                        }

                        const payload = {
                            home_club_id:
                                home,

                            away_club_id:
                                away,

                            match_date:
                                localDateTimeToISO(
                                    $("#modalMatchDate")
                                        ?.value
                                ),

                            venue:
                                $("#modalMatchVenue")
                                    ?.value.trim() ||
                                "",

                            competition:
                                $("#modalMatchCompetition")
                                    ?.value.trim() ||
                                "",

                            status:
                                $("#modalMatchStatus")
                                    ?.value ||
                                "scheduled",

                            home_score:
                                Number(
                                    $("#modalMatchHomeScore")
                                        ?.value || 0
                                ),

                            away_score:
                                Number(
                                    $("#modalMatchAwayScore")
                                        ?.value || 0
                                ),

                            updated_at:
                                new Date().toISOString()
                        };

                        let matchId =
                            item?.id;

                        if (item) {
                            const {
                                error
                            } = await db
                                .from("matches")
                                .update(payload)
                                .eq(
                                    "id",
                                    item.id
                                );

                            if (error) throw error;

                        } else {
                            const {
                                data,
                                error
                            } = await db
                                .from("matches")
                                .insert(payload)
                                .select()
                                .single();

                            if (error) throw error;

                            matchId = data.id;
                        }

                        if (isEdit) {
                            await saveRoster(
                                matchId
                            );
                        }

                        closeModal();

                        showToast(
                            isEdit
                                ? "Матч обновлён."
                                : "Матч создан."
                        );

                        await loadMatchesAdmin();
                        await loadDashboard();

                    } catch (error) {
                        console.error(error);

                        showError(
                            error.message ||
                            "Ошибка сохранения матча."
                        );
                    }
                }
            );
    }

    /* =========================================================
       ROSTER
       ========================================================= */

    async function loadRosterEditor(matchId) {
        const container =
            $("#matchRosterEditor");

        if (!container) return;

        const {
            data,
            error
        } = await db
            .from("match_roster")
            .select("*")
            .eq("match_id", matchId)
            .order("player_number");

        if (error) {
            console.error(error);

            container.innerHTML =
                `<div class="admin-empty">
                    Не удалось загрузить состав.
                </div>`;

            return;
        }

        container.innerHTML = "";

        (data || []).forEach(player => {
            addRosterRow(player);
        });

        if (!data?.length) {
            addRosterRow();
        }
    }

    function addRosterRow(player = {}) {
        const container =
            $("#matchRosterEditor");

        if (!container) return;

        const row =
            document.createElement("div");

        row.className =
            "form-grid roster-row";

        row.innerHTML = `
            <label class="form-field">
                <span>№</span>
                <input
                    data-roster-number
                    type="number"
                    min="0"
                    value="${
                        player.player_number ??
                        ""
                    }"
                >
            </label>

            <label class="form-field">
                <span>Игрок</span>
                <input
                    data-roster-name
                    type="text"
                    value="${escapeHTML(
                        player.player_name ||
                        ""
                    )}"
                >
            </label>

            <label class="form-field">
                <span>Позиция</span>
                <input
                    data-roster-position
                    type="text"
                    value="${escapeHTML(
                        player.position ||
                        ""
                    )}"
                    placeholder="нападающий"
                >
            </label>

            <button
                type="button"
                class="button danger"
                data-remove-roster
            >
                Удалить
            </button>
        `;

        row.querySelector(
            "[data-remove-roster]"
        )?.addEventListener(
            "click",
            () => row.remove()
        );

        container.appendChild(row);
    }

    async function saveRoster(matchId) {
        const {
            error: deleteError
        } = await db
            .from("match_roster")
            .delete()
            .eq("match_id", matchId);

        if (deleteError) {
            throw deleteError;
        }

        const rows =
            $$(".roster-row");

        const players = rows
            .map(row => ({
                match_id: matchId,

                player_number:
                    Number(
                        row.querySelector(
                            "[data-roster-number]"
                        )?.value || 0
                    ),

                player_name:
                    row.querySelector(
                        "[data-roster-name]"
                    )?.value.trim() || "",

                position:
                    row.querySelector(
                        "[data-roster-position]"
                    )?.value.trim() || ""
            }))
            .filter(
                player =>
                    player.player_name
            );

        if (!players.length) return;

        const {
            error
        } = await db
            .from("match_roster")
            .insert(players);

        if (error) throw error;
    }

    /* =========================================================
       MATCH EVENTS
       ========================================================= */

    async function openMatchEventsModal(match) {
        openModal({
            kicker: "Матч",
            title:
                `${match.home?.name || "Хозяева"} — ${
                    match.away?.name || "Гости"
                }`,

            body: `
                <div id="matchEventsContainer">
                    Загрузка...
                </div>
            `,

            footer: `
                <button
                    class="button secondary"
                    data-modal-close
                >
                    Закрыть
                </button>

                <button
                    class="button primary"
                    id="saveMatchEvents"
                >
                    Сохранить события
                </button>
            `
        });

        await loadMatchEvents(
            match
        );

        $("#saveMatchEvents")
            ?.addEventListener(
                "click",
                () =>
                    saveMatchEvents(
                        match.id
                    )
            );
    }

    async function loadMatchEvents(match) {
        const container =
            $("#matchEventsContainer");

        if (!container) return;

        const [
            goalsResult,
            penaltiesResult
        ] = await Promise.all([
            db
                .from("match_goals")
                .select("*")
                .eq("match_id", match.id)
                .order("minute"),

            db
                .from("match_penalties")
                .select("*")
                .eq("match_id", match.id)
                .order("penalty_time")
        ]);

        if (goalsResult.error) {
            console.error(
                goalsResult.error
            );
        }

        if (penaltiesResult.error) {
            console.error(
                penaltiesResult.error
            );
        }

        container.innerHTML = `
            <div class="modal-section">

                <h3>Голы</h3>

                <div
                    id="goalsEditor"
                    class="modal-list"
                ></div>

                <button
                    type="button"
                    class="button secondary"
                    id="addGoalButton"
                >
                    + Добавить гол
                </button>

            </div>

            <div class="modal-section">

                <h3>Удаления</h3>

                <div
                    id="penaltiesEditor"
                    class="modal-list"
                ></div>

                <button
                    type="button"
                    class="button secondary"
                    id="addPenaltyButton"
                >
                    + Добавить удаление
                </button>

            </div>
        `;

        (goalsResult.data || [])
            .forEach(goal =>
                addGoalRow(goal)
            );

        (penaltiesResult.data || [])
            .forEach(penalty =>
                addPenaltyRow(penalty)
            );

        $("#addGoalButton")
            ?.addEventListener(
                "click",
                () => addGoalRow()
            );

        $("#addPenaltyButton")
            ?.addEventListener(
                "click",
                () => addPenaltyRow()
            );
    }

    function teamSelect(selected) {
        return `
            <select data-event-team>
                <option
                    value="home"
                    ${
                        selected === "home"
                            ? "selected"
                            : ""
                    }
                >
                    Хозяева
                </option>

                <option
                    value="away"
                    ${
                        selected === "away"
                            ? "selected"
                            : ""
                    }
                >
                    Гости
                </option>
            </select>
        `;
    }

    function addGoalRow(goal = {}) {
        const container =
            $("#goalsEditor");

        if (!container) return;

        const row =
            document.createElement("div");

        row.className =
            "event-row";

        row.innerHTML = `
            ${teamSelect(
                goal.team || "home"
            )}

            <input
                data-goal-minute
                type="text"
                placeholder="Минута"
                value="${escapeHTML(
                    goal.minute || ""
                )}"
            >

            <input
                data-goal-number
                type="number"
                placeholder="№"
                value="${
                    goal.player_number ??
                    ""
                }"
            >

            <input
                data-goal-player
                type="text"
                placeholder="Игрок"
                value="${escapeHTML(
                    goal.player_name ||
                    ""
                )}"
            >

            <input
                data-goal-strength
                type="text"
                placeholder="5x4"
                value="${escapeHTML(
                    goal.strength ||
                    ""
                )}"
            >

            <button
                type="button"
                class="button danger"
                data-remove-event
            >
                ×
            </button>
        `;

        row.querySelector(
            "[data-remove-event]"
        )?.addEventListener(
            "click",
            () => row.remove()
        );

        container.appendChild(row);
    }

    function addPenaltyRow(penalty = {}) {
        const container =
            $("#penaltiesEditor");

        if (!container) return;

        const row =
            document.createElement("div");

        row.className =
            "event-row";

        row.innerHTML = `
            ${teamSelect(
                penalty.team || "home"
            )}

            <input
                data-penalty-time
                type="text"
                placeholder="Минута"
                value="${escapeHTML(
                    penalty.penalty_time ||
                    ""
                )}"
            >

            <input
                data-penalty-number
                type="number"
                placeholder="№"
                value="${
                    penalty.player_number ??
                    ""
                }"
            >

            <input
                data-penalty-player
                type="text"
                placeholder="Игрок"
                value="${escapeHTML(
                    penalty.player_name ||
                    ""
                )}"
            >

            <input
                data-penalty-reason
                type="text"
                placeholder="Причина"
                value="${escapeHTML(
                    penalty.reason ||
                    ""
                )}"
            >

            <input
                data-penalty-minutes
                type="number"
                min="0"
                placeholder="Мин"
                value="${
                    penalty.minutes ??
                    2
                }"
            >

            <button
                type="button"
                class="button danger"
                data-remove-event
            >
                ×
            </button>
        `;

        row.querySelector(
            "[data-remove-event]"
        )?.addEventListener(
            "click",
            () => row.remove()
        );

        container.appendChild(row);
    }

    async function saveMatchEvents(matchId) {
        try {
            const {
                error: goalDeleteError
            } = await db
                .from("match_goals")
                .delete()
                .eq("match_id", matchId);

            if (goalDeleteError) {
                throw goalDeleteError;
            }

            const {
                error: penaltyDeleteError
            } = await db
                .from("match_penalties")
                .delete()
                .eq("match_id", matchId);

            if (penaltyDeleteError) {
                throw penaltyDeleteError;
            }

            const goals =
                $$("#goalsEditor .event-row")
                    .map(row => ({
                        match_id: matchId,

                        team:
                            row.querySelector(
                                "[data-event-team]"
                            )?.value,

                        minute:
                            row.querySelector(
                                "[data-goal-minute]"
                            )?.value.trim(),

                        player_number:
                            Number(
                                row.querySelector(
                                    "[data-goal-number]"
                                )?.value || 0
                            ),

                        player_name:
                            row.querySelector(
                                "[data-goal-player]"
                            )?.value.trim(),

                        strength:
                            row.querySelector(
                                "[data-goal-strength]"
                            )?.value.trim()
                    }))
                    .filter(
                        goal =>
                            goal.player_name ||
                            goal.minute
                    );

            if (goals.length) {
                const {
                    error
                } = await db
                    .from("match_goals")
                    .insert(goals);

                if (error) throw error;
            }

            const penalties =
                $$("#penaltiesEditor .event-row")
                    .map(row => ({
                        match_id: matchId,

                        team:
                            row.querySelector(
                                "[data-event-team]"
                            )?.value,

                        penalty_time:
                            row.querySelector(
                                "[data-penalty-time]"
                            )?.value.trim(),

                        player_number:
                            Number(
                                row.querySelector(
                                    "[data-penalty-number]"
                                )?.value || 0
                            ),

                        player_name:
                            row.querySelector(
                                "[data-penalty-player]"
                            )?.value.trim(),

                        reason:
                            row.querySelector(
                                "[data-penalty-reason]"
                            )?.value.trim(),

                        minutes:
                            Number(
                                row.querySelector(
                                    "[data-penalty-minutes]"
                                )?.value || 0
                            )
                    }))
                    .filter(
                        penalty =>
                            penalty.player_name ||
                            penalty.penalty_time
                    );

            if (penalties.length) {
                const {
                    error
                } = await db
                    .from("match_penalties")
                    .insert(penalties);

                if (error) throw error;
            }

            closeModal();

            showToast(
                "События матча сохранены."
            );

        } catch (error) {
            console.error(error);
            showError(
                error.message ||
                "Не удалось сохранить события."
            );
        }
    }

    async function deleteMatch(id) {
        if (
            !confirm(
                "Удалить матч и все его события?"
            )
        ) return;

        try {
            const {
                error
            } = await db
                .from("matches")
                .delete()
                .eq("id", id);

            if (error) throw error;

            showToast(
                "Матч удалён."
            );

            await loadMatchesAdmin();
            await loadDashboard();

        } catch (error) {
            console.error(error);

            showError(
                error.message ||
                "Не удалось удалить матч."
            );
        }
    }

    /* =========================================================
       COMPETITION
       ========================================================= */

    $("#addStandingRow")?.addEventListener(
        "click",
        () => addStandingRow()
    );

    $("#saveCompetitionButton")
        ?.addEventListener(
            "click",
            saveCompetition
        );

    async function loadCompetition() {
        const tbody =
            $("#standingsEditorBody");

        if (!tbody) return;

        const {
            data,
            error
        } = await db
            .from("standings")
            .select("*")
            .order("place", {
                ascending: true
            });

        if (error) {
            console.error(error);
            showError(
                "Ошибка загрузки таблицы."
            );
            return;
        }

        tbody.innerHTML = "";

        if (!data?.length) {
            addStandingRow();
            return;
        }

        data.forEach(row =>
            addStandingRow(row)
        );
    }

    function addStandingRow(row = {}) {
        const tbody =
            $("#standingsEditorBody");

        if (!tbody) return;

        const tr =
            document.createElement("tr");

        tr.innerHTML = `
            <td>
                <input
                    data-standing-place
                    type="number"
                    min="1"
                    value="${
                        row.place ??
                        tbody.children.length + 1
                    }"
                >
            </td>

            <td>
                <input
                    data-standing-team
                    type="text"
                    value="${escapeHTML(
                        row.team_name ||
                        ""
                    )}"
                    placeholder="Команда"
                >
            </td>

            <td>
                <input
                    data-standing-games
                    type="number"
                    min="0"
                    value="${
                        row.games ??
                        0
                    }"
                >
            </td>

            <td>
                <input
                    data-standing-wins
                    type="number"
                    min="0"
                    value="${
                        row.wins ??
                        0
                    }"
                >
            </td>

            <td>
                <input
                    data-standing-ow
                    type="number"
                    min="0"
                    value="${
                        row.overtime_wins ??
                        0
                    }"
                >
            </td>

            <td>
                <input
                    data-standing-sw
                    type="number"
                    min="0"
                    value="${
                        row.shootout_wins ??
                        0
                    }"
                >
            </td>

            <td>
                <input
                    data-standing-losses
                    type="number"
                    min="0"
                    value="${
                        row.losses ??
                        0
                    }"
                >
            </td>

            <td>
                <input
                    data-standing-ol
                    type="number"
                    min="0"
                    value="${
                        row.overtime_losses ??
                        0
                    }"
                >
            </td>

            <td>
                <input
                    data-standing-sl
                    type="number"
                    min="0"
                    value="${
                        row.shootout_losses ??
                        0
                    }"
                >
            </td>

            <td>
                <input
                    data-standing-points
                    type="number"
                    min="0"
                    value="${
                        row.points ??
                        0
                    }"
                >
            </td>

            <td>
                <button
                    type="button"
                    class="button danger small"
                    data-remove-standing
                >
                    ×
                </button>
            </td>
        `;

        tr.querySelector(
            "[data-remove-standing]"
        )?.addEventListener(
            "click",
            () => tr.remove()
        );

        tbody.appendChild(tr);
    }

    async function saveCompetition() {
        try {
            const rows =
                $$("#standingsEditorBody tr");

            const standings =
                rows
                    .map(row => ({
                        place:
                            Number(
                                row.querySelector(
                                    "[data-standing-place]"
                                )?.value || 0
                            ),

                        team_name:
                            row.querySelector(
                                "[data-standing-team]"
                            )?.value.trim(),

                        games:
                            Number(
                                row.querySelector(
                                    "[data-standing-games]"
                                )?.value || 0
                            ),

                        wins:
                            Number(
                                row.querySelector(
                                    "[data-standing-wins]"
                                )?.value || 0
                            ),

                        overtime_wins:
                            Number(
                                row.querySelector(
                                    "[data-standing-ow]"
                                )?.value || 0
                            ),

                        shootout_wins:
                            Number(
                                row.querySelector(
                                    "[data-standing-sw]"
                                )?.value || 0
                            ),

                        losses:
                            Number(
                                row.querySelector(
                                    "[data-standing-losses]"
                                )?.value || 0
                            ),

                        overtime_losses:
                            Number(
                                row.querySelector(
                                    "[data-standing-ol]"
                                )?.value || 0
                            ),

                        shootout_losses:
                            Number(
                                row.querySelector(
                                    "[data-standing-sl]"
                                )?.value || 0
                            ),

                        points:
                            Number(
                                row.querySelector(
                                    "[data-standing-points]"
                                )?.value || 0
                            ),

                        updated_at:
                            new Date().toISOString()
                    }))
                    .filter(
                        row =>
                            row.team_name
                    );

            const {
                error: deleteError
            } = await db
                .from("standings")
                .delete()
                .not("id", "is", null);

            if (deleteError) {
                throw deleteError;
            }

            if (standings.length) {
                const {
                    error
                } = await db
                    .from("standings")
                    .insert(standings);

                if (error) throw error;
            }

            showToast(
                "Таблица сохранена."
            );

        } catch (error) {
            console.error(error);
            showError(
                error.message ||
                "Не удалось сохранить таблицу."
            );
        }
    }

    /* =========================================================
       PLAYER STATS
       ========================================================= */

    $$(".stats-filter button").forEach(button => {
        button.addEventListener(
            "click",
            () => {
                currentStatsFilter =
                    button.dataset.statFilter ||
                    "scorers";

                $$(".stats-filter button")
                    .forEach(
                        b =>
                            b.classList.toggle(
                                "active",
                                b === button
                            )
                    );

                loadStatsAdmin();
            }
        );
    });

    $("#addStatButton")?.addEventListener(
        "click",
        () => openStatModal()
    );

    async function loadStatsAdmin() {
        const container =
            $("#statsListAdmin");

        if (!container) return;

        const {
            data,
            error
        } = await db
            .from("player_stats")
            .select("*")
            .eq(
                "stat_type",
                currentStatsFilter
            )
            .order("value", {
                ascending: false
            });

        if (error) {
            console.error(error);
            return;
        }

        if (!data?.length) {
            container.innerHTML =
                `<div class="admin-empty">
                    Игроков пока нет.
                </div>`;
            return;
        }

        container.innerHTML =
            data.map(player => `
                <article class="admin-content-card">

                    <div class="admin-content-card-body">

                        <span class="admin-badge">
                            №${escapeHTML(
                                player.player_number ??
                                ""
                            )}
                        </span>

                        <h3>
                            ${escapeHTML(
                                player.player_name
                            )}
                        </h3>

                        <p>
                            ${escapeHTML(
                                player.position ||
                                ""
                            )}
                        </p>

                        <strong>
                            ${player.value ?? 0}
                        </strong>

                    </div>

                    <div class="admin-content-card-actions">

                        <button
                            class="button secondary"
                            data-edit-stat="${player.id}"
                        >
                            Изменить
                        </button>

                        <button
                            class="button danger"
                            data-delete-stat="${player.id}"
                        >
                            Удалить
                        </button>

                    </div>

                </article>
            `).join("");

        $$("[data-edit-stat]", container)
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        const player =
                            data.find(
                                x =>
                                    x.id ===
                                    button.dataset.editStat
                            );

                        if (player) {
                            openStatModal(player);
                        }
                    }
                );
            });

        $$("[data-delete-stat]", container)
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () =>
                        deleteStat(
                            button.dataset.deleteStat
                        )
                );
            });
    }

    function openStatModal(item = null) {
        const isEdit = Boolean(item);

        openModal({
            kicker: "Статистика",
            title: isEdit
                ? "Изменить статистику"
                : "Добавить игрока",

            body: `
                <div class="form-grid">

                    <label class="form-field">
                        <span>Категория</span>
                        <select id="modalStatType">
                            <option
                                value="scorers"
                                ${
                                    (
                                        item?.stat_type ||
                                        currentStatsFilter
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
                                        currentStatsFilter
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
                                        currentStatsFilter
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
                                        currentStatsFilter
                                    ) === "plus_minus"
                                        ? "selected"
                                        : ""
                                }
                            >
                                Плюс/минус
                            </option>
                        </select>
                    </label>

                    <label class="form-field">
                        <span>Игрок</span>
                        <input
                            id="modalStatName"
                            type="text"
                            value="${escapeHTML(
                                item?.player_name ||
                                ""
                            )}"
                        >
                    </label>

                    <label class="form-field">
                        <span>Номер</span>
                        <input
                            id="modalStatNumber"
                            type="number"
                            min="0"
                            value="${
                                item?.player_number ??
                                ""
                            }"
                        >
                    </label>

                    <label class="form-field">
                        <span>Позиция</span>
                        <input
                            id="modalStatPosition"
                            type="text"
                            value="${escapeHTML(
                                item?.position ||
                                ""
                            )}"
                        >
                    </label>

                    <label class="form-field">
                        <span>Значение</span>
                        <input
                            id="modalStatValue"
                            type="number"
                            value="${
                                item?.value ??
                                0
                            }"
                        >
                    </label>

                </div>
            `,

            footer: `
                <button
                    class="button secondary"
                    data-modal-close
                >
                    Отмена
                </button>

                <button
                    class="button primary"
                    id="saveStatButton"
                >
                    Сохранить
                </button>
            `
        });

        $("#saveStatButton")
            ?.addEventListener(
                "click",
                async () => {
                    try {
                        const payload = {
                            stat_type:
                                $("#modalStatType")
                                    ?.value,

                            player_name:
                                $("#modalStatName")
                                    ?.value.trim(),

                            player_number:
                                Number(
                                    $("#modalStatNumber")
                                        ?.value || 0
                                ),

                            position:
                                $("#modalStatPosition")
                                    ?.value.trim() ||
                                "",

                            value:
                                Number(
                                    $("#modalStatValue")
                                        ?.value || 0
                                ),

                            updated_at:
                                new Date().toISOString()
                        };

                        if (!payload.player_name) {
                            showError(
                                "Введите имя игрока."
                            );
                            return;
                        }

                        if (item) {
                            const {
                                error
                            } = await db
                                .from("player_stats")
                                .update(payload)
                                .eq(
                                    "id",
                                    item.id
                                );

                            if (error) throw error;

                        } else {
                            const {
                                error
                            } = await db
                                .from("player_stats")
                                .insert(payload);

                            if (error) throw error;
                        }

                        closeModal();

                        showToast(
                            isEdit
                                ? "Статистика обновлена."
                                : "Игрок добавлен."
                        );

                        await loadStatsAdmin();

                    } catch (error) {
                        console.error(error);
                        showError(
                            error.message ||
                            "Ошибка сохранения статистики."
                        );
                    }
                }
            );
    }

    async function deleteStat(id) {
        if (
            !confirm(
                "Удалить эту запись?"
            )
        ) return;

        const {
            error
        } = await db
            .from("player_stats")
            .delete()
            .eq("id", id);

        if (error) {
            showError(
                "Не удалось удалить запись."
            );
            return;
        }

        showToast(
            "Запись удалена."
        );

        await loadStatsAdmin();
    }

    /* =========================================================
       LEADERS
       ========================================================= */

    $("#saveLeadersButton")
        ?.addEventListener(
            "click",
            saveLeaders
        );

    async function loadLeaders() {
        const {
            data,
            error
        } = await db
            .from("team_leaders")
            .select("*");

        if (error) {
            console.error(error);
            showError(
                "Не удалось загрузить лидеров."
            );
            return;
        }

        const leaders =
            data || [];

        $$(".leader-editor-card")
            .forEach(card => {
                const type =
                    card.dataset.leaderType;

                const item =
                    leaders.find(
                        x =>
                            x.leader_type ===
                            type
                    );

                const fields =
                    $$("[data-field]", card);

                fields.forEach(input => {
                    const field =
                        input.dataset.field;

                    if (item) {
                        input.value =
                            item[field] ??
                            "";
                    } else {
                        input.value = "";
                    }
                });

                const preview =
                    $("[data-preview]", card);

                if (preview) {
                    preview.src =
                        publicFile(
                            item?.image_path
                        ) || "";
                }

                card.dataset.id =
                    item?.id || "";
            });
    }

    $$(".leader-editor-card")
        .forEach(card => {
            const input =
                $("[data-image]", card);

            input?.addEventListener(
                "change",
                async () => {
                    const file =
                        input.files?.[0];

                    if (!file) return;

                    const preview =
                        $("[data-preview]", card);

                    if (preview) {
                        preview.src =
                            URL.createObjectURL(
                                file
                            );
                    }
                }
            );
        });

    async function saveLeaders() {
        try {
            const cards =
                $$(".leader-editor-card");

            for (const card of cards) {
                const type =
                    card.dataset.leaderType;

                const existingId =
                    card.dataset.id ||
                    null;

                const name =
                    $(
                        '[data-field="player_name"]',
                        card
                    )?.value.trim();

                if (!name) {
                    continue;
                }

                let imagePath =
                    null;

                const oldImage =
                    card.dataset.oldImage ||
                    null;

                const {
                    data: existing
                } = await db
                    .from("team_leaders")
                    .select("*")
                    .eq(
                        "leader_type",
                        type
                    )
                    .maybeSingle();

                imagePath =
                    existing?.image_path ||
                    oldImage ||
                    null;

                const file =
                    $("[data-image]", card)
                        ?.files?.[0];

                if (file) {
                    imagePath =
                        await uploadFile(
                            file,
                            "leaders"
                        );
                }

                const payload = {
                    leader_type:
                        type,

                    player_name:
                        name,

                    player_number:
                        Number(
                            $(
                                '[data-field="player_number"]',
                                card
                            )?.value || 0
                        ),

                    position:
                        $(
                            '[data-field="position"]',
                            card
                        )?.value.trim() ||
                        "",

                    statistic:
                        $(
                            '[data-field="statistic"]',
                            card
                        )?.value.trim() ||
                        "",

                    image_path:
                        imagePath,

                    updated_at:
                        new Date().toISOString()
                };

                if (existing?.id || existingId) {
                    const id =
                        existing?.id ||
                        existingId;

                    const {
                        error
                    } = await db
                        .from("team_leaders")
                        .update(payload)
                        .eq(
                            "id",
                            id
                        );

                    if (error) throw error;

                } else {
                    const {
                        error
                    } = await db
                        .from("team_leaders")
                        .insert(payload);

                    if (error) throw error;
                }
            }

            showToast(
                "Лидеры сохранены."
            );

            await loadLeaders();

        } catch (error) {
            console.error(error);
            showError(
                error.message ||
                "Не удалось сохранить лидеров."
            );
        }
    }

    /* =========================================================
       ALBUMS
       ========================================================= */

    $("#addAlbumButton")?.addEventListener(
        "click",
        () => openAlbumModal()
    );

    async function loadAlbumsAdmin() {
        const container =
            $("#albumsListAdmin");

        if (!container) return;

        const {
            data,
            error
        } = await db
            .from("albums")
            .select("*")
            .order("album_date", {
                ascending: false
            });

        if (error) {
            console.error(error);
            return;
        }

        if (!data?.length) {
            container.innerHTML =
                `<div class="admin-empty">
                    Альбомов пока нет.
                </div>`;
            return;
        }

        container.innerHTML =
            data.map(album => `
                <article class="admin-content-card">

                    <div class="admin-content-card-media">
                        ${
                            album.cover_path
                                ? `<img
                                    src="${escapeHTML(
                                        publicFile(
                                            album.cover_path
                                        )
                                    )}"
                                    alt=""
                                >`
                                : ""
                        }
                    </div>

                    <div class="admin-content-card-body">
                        <span class="admin-badge">
                            ${formatDate(
                                album.album_date
                            )}
                        </span>

                        <h3>
                            ${escapeHTML(
                                album.title
                            )}
                        </h3>
                    </div>

                    <div class="admin-content-card-actions">

                        <button
                            class="button secondary"
                            data-edit-album="${album.id}"
                        >
                            Изменить
                        </button>

                        <button
                            class="button danger"
                            data-delete-album="${album.id}"
                        >
                            Удалить
                        </button>

                    </div>

                </article>
            `).join("");

        $$("[data-edit-album]", container)
            .forEach(button => {
                button.addEventListener(
                    "click",
                    async () => {
                        const album =
                            data.find(
                                x =>
                                    x.id ===
                                    button.dataset.editAlbum
                            );

                        if (album) {
                            await openAlbumModal(
                                album
                            );
                        }
                    }
                );
            });

        $$("[data-delete-album]", container)
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () =>
                        deleteAlbum(
                            button.dataset.deleteAlbum
                        )
                );
            });
    }

    async function openAlbumModal(item = null) {
        const isEdit =
            Boolean(item);

        let photos = [];

        if (item) {
            const {
                data
            } = await db
                .from("album_photos")
                .select("*")
                .eq(
                    "album_id",
                    item.id
                )
                .order("sort_order");

            photos = data || [];
        }

        openModal({
            kicker: "Медиа",
            title: isEdit
                ? "Изменить альбом"
                : "Новый альбом",

            body: `
                <div class="form-grid">

                    <label class="form-field">
                        <span>Название</span>
                        <input
                            id="modalAlbumTitle"
                            type="text"
                            value="${escapeHTML(
                                item?.title || ""
                            )}"
                        >
                    </label>

                    <label class="form-field">
                        <span>Дата</span>
                        <input
                            id="modalAlbumDate"
                            type="date"
                            value="${
                                item?.album_date
                                    ? String(
                                          item.album_date
                                      ).slice(0, 10)
                                    : new Date()
                                          .toISOString()
                                          .slice(0, 10)
                            }"
                        >
                    </label>

                    <label class="form-field">
                        <span>Обложка</span>
                        <input
                            id="modalAlbumCover"
                            type="file"
                            accept="image/*"
                        >
                    </label>

                    <label class="form-field full">
                        <span>Фотографии</span>
                        <input
                            id="modalAlbumPhotos"
                            type="file"
                            accept="image/*"
                            multiple
                        >
                    </label>

                </div>

                ${
                    photos.length
                        ? `
                            <div class="modal-section">

                                <h3>
                                    Фотографии альбома
                                </h3>

                                <div
                                    class="album-photo-admin-grid"
                                >
                                    ${photos
                                        .map(
                                            photo => `
                                                <div
                                                    class="album-photo-admin"
                                                    data-photo-id="${photo.id}"
                                                >
                                                    <img
                                                        src="${escapeHTML(
                                                            publicFile(
                                                                photo.image_path
                                                            )
                                                        )}"
                                                        alt=""
                                                    >

                                                    <button
                                                        type="button"
                                                        class="button danger small"
                                                        data-delete-album-photo="${photo.id}"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            `
                                        )
                                        .join("")}
                                </div>

                            </div>
                        `
                        : ""
                }
            `,

            footer: `
                <button
                    class="button secondary"
                    data-modal-close
                >
                    Отмена
                </button>

                <button
                    class="button primary"
                    id="saveAlbumButton"
                >
                    Сохранить
                </button>
            `
        });

        $$("[data-delete-album-photo]")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    async () => {
                        await deleteAlbumPhoto(
                            button.dataset
                                .deleteAlbumPhoto
                        );

                        button
                            .closest(
                                "[data-photo-id]"
                            )
                            ?.remove();
                    }
                );
            });

        $("#saveAlbumButton")
            ?.addEventListener(
                "click",
                async () => {
                    try {
                        const title =
                            $("#modalAlbumTitle")
                                ?.value.trim();

                        if (!title) {
                            showError(
                                "Введите название альбома."
                            );
                            return;
                        }

                        let coverPath =
                            item?.cover_path ||
                            null;

                        const cover =
                            $("#modalAlbumCover")
                                ?.files?.[0];

                        if (cover) {
                            coverPath =
                                await uploadFile(
                                    cover,
                                    "albums/covers"
                                );
                        }

                        const payload = {
                            title,

                            album_date:
                                $("#modalAlbumDate")
                                    ?.value ||
                                new Date()
                                    .toISOString()
                                    .slice(
                                        0,
                                        10
                                    ),

                            cover_path:
                                coverPath,

                            updated_at:
                                new Date().toISOString()
                        };

                        let albumId =
                            item?.id;

                        if (item) {
                            const {
                                error
                            } = await db
                                .from("albums")
                                .update(payload)
                                .eq(
                                    "id",
                                    item.id
                                );

                            if (error) throw error;

                        } else {
                            const {
                                data,
                                error
                            } = await db
                                .from("albums")
                                .insert(payload)
                                .select()
                                .single();

                            if (error) throw error;

                            albumId =
                                data.id;
                        }

                        const files =
                            [
                                ...(
                                    $("#modalAlbumPhotos")
                                        ?.files ||
                                    []
                                )
                            ];

                        if (files.length) {
                            const currentCount =
                                await getAlbumPhotoCount(
                                    albumId
                                );

                            const photoRows = [];

                            for (
                                let i = 0;
                                i < files.length;
                                i++
                            ) {
                                const path =
                                    await uploadFile(
                                        files[i],
                                        `albums/${albumId}`
                                    );

                                photoRows.push({
                                    album_id:
                                        albumId,

                                    image_path:
                                        path,

                                    sort_order:
                                        currentCount +
                                        i
                                });
                            }

                            if (
                                photoRows.length
                            ) {
                                const {
                                    error
                                } = await db
                                    .from("album_photos")
                                    .insert(
                                        photoRows
                                    );

                                if (error) {
                                    throw error;
                                }
                            }
                        }

                        closeModal();

                        showToast(
                            isEdit
                                ? "Альбом обновлён."
                                : "Альбом создан."
                        );

                        await loadAlbumsAdmin();
                        await loadDashboard();

                    } catch (error) {
                        console.error(error);
                        showError(
                            error.message ||
                            "Ошибка сохранения альбома."
                        );
                    }
                }
            );
    }

    async function getAlbumPhotoCount(
        albumId
    ) {
        const {
            count,
            error
        } = await db
            .from("album_photos")
            .select("*", {
                count: "exact",
                head: true
            })
            .eq(
                "album_id",
                albumId
            );

        if (error) throw error;

        return count || 0;
    }

    async function deleteAlbumPhoto(id) {
        try {
            const {
                data,
                error: readError
            } = await db
                .from("album_photos")
                .select("image_path")
                .eq("id", id)
                .maybeSingle();

            if (readError) throw readError;

            const {
                error
            } = await db
                .from("album_photos")
                .delete()
                .eq("id", id);

            if (error) throw error;

            if (data?.image_path) {
                await deleteStorageFile(
                    data.image_path
                );
            }

            showToast(
                "Фотография удалена."
            );

        } catch (error) {
            console.error(error);
            showError(
                "Не удалось удалить фотографию."
            );
        }
    }

    async function deleteAlbum(id) {
        if (
            !confirm(
                "Удалить альбом и все его фотографии?"
            )
        ) return;

        try {
            const {
                data: photos,
                error: photoError
            } = await db
                .from("album_photos")
                .select("image_path")
                .eq("album_id", id);

            if (photoError) {
                throw photoError;
            }

            const {
                data: album,
                error: albumReadError
            } = await db
                .from("albums")
                .select("cover_path")
                .eq("id", id)
                .maybeSingle();

            if (albumReadError) {
                throw albumReadError;
            }

            const {
                error
            } = await db
                .from("albums")
                .delete()
                .eq("id", id);

            if (error) throw error;

            const files = [
                ...(photos || [])
                    .map(
                        photo =>
                            photo.image_path
                    )
                    .filter(Boolean),

                album?.cover_path
            ].filter(Boolean);

            if (files.length) {
                await db.storage
                    .from(STORAGE_BUCKET)
                    .remove(files);
            }

            showToast(
                "Альбом удалён."
            );

            await loadAlbumsAdmin();
            await loadDashboard();

        } catch (error) {
            console.error(error);

            showError(
                error.message ||
                "Не удалось удалить альбом."
            );
        }
    }

    /* =========================================================
       INIT
       ========================================================= */

    checkAuth();

})();
