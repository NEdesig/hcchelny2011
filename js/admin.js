/* =========================================================
   ХК ЧЕЛНЫ 2011 — ADMIN.JS
   ========================================================= */

const db = window.supabaseClient;

let currentUser = null;
let currentSection = "dashboard";
let currentModalAction = null;
let currentStatType = "scorers";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

/* =========================================================
   INIT
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    if (!db) {
        console.error("Supabase client не найден.");
        showLoginError("Ошибка подключения к Supabase.");
        return;
    }

    initUI();
    initAuth();
});

/* =========================================================
   AUTH
   ========================================================= */

function initAuth() {
    db.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
            currentUser = data.session.user;
            showAdmin();
        } else {
            showLogin();
        }
    });

    db.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
            currentUser = session.user;
            showAdmin();
        } else {
            currentUser = null;
            showLogin();
        }
    });

    const form = $("#loginForm");

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = $("#loginEmail")?.value.trim();
            const password = $("#loginPassword")?.value;

            if (!email || !password) {
                showLoginError("Введите email и пароль.");
                return;
            }

            const button = $("#loginButton");

            if (button) {
                button.disabled = true;
                button.textContent = "Вход...";
            }

            const { data, error } = await db.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                showLoginError(error.message);
            } else {
                currentUser = data.user;
                showAdmin();
            }

            if (button) {
                button.disabled = false;
                button.textContent = "Войти";
            }
        });
    }

    $("#logoutButton")?.addEventListener("click", async () => {
        await db.auth.signOut();
    });
}

function showLogin() {
    $("#authScreen")?.classList.remove("hidden");
    $("#adminApp")?.classList.add("hidden");
}

async function showAdmin() {
    $("#authScreen")?.classList.add("hidden");
    $("#adminApp")?.classList.remove("hidden");

    if ($("#adminUserEmail")) {
        $("#adminUserEmail").textContent =
            currentUser?.email || "";
    }

    await loadAllDashboard();
    await loadSettings();
    await loadNews();
    await loadStories();
    await loadClubs();
    await loadMatches();
    await loadCompetition();
    await loadStats(currentStatType);
    await loadLeaders();
    await loadAlbums();
}

/* =========================================================
   UI
   ========================================================= */

function initUI() {
    /* Навигация */

    $$("[data-section]").forEach((button) => {
        button.addEventListener("click", () => {
            const section = button.dataset.section;
            switchSection(section);
        });
    });

    $$("[data-go-section]").forEach((button) => {
        button.addEventListener("click", () => {
            switchSection(button.dataset.goSection);
        });
    });

    /* Добавление */

    $$("[data-action='add-news']").forEach((button) => {
        button.addEventListener("click", () => openNewsModal());
    });

    $$("[data-action='add-story']").forEach((button) => {
        button.addEventListener("click", () => openStoryModal());
    });

    $$("[data-action='add-club']").forEach((button) => {
        button.addEventListener("click", () => openClubModal());
    });

    $$("[data-action='add-match']").forEach((button) => {
        button.addEventListener("click", () => openMatchModal());
    });

    $$("[data-action='add-stat']").forEach((button) => {
        button.addEventListener("click", () => openStatModal());
    });

    $$("[data-action='add-album']").forEach((button) => {
        button.addEventListener("click", () => openAlbumModal());
    });

    /* Фильтры матчей */

    $$("[data-match-filter]").forEach((button) => {
        button.addEventListener("click", async () => {
            $$("[data-match-filter]").forEach((b) =>
                b.classList.remove("active")
            );

            button.classList.add("active");

            await loadMatches(button.dataset.matchFilter);
        });
    });

    /* Статистика */

    $$("[data-stat-type]").forEach((button) => {
        button.addEventListener("click", async () => {
            $$("[data-stat-type]").forEach((b) =>
                b.classList.remove("active")
            );

            button.classList.add("active");

            currentStatType = button.dataset.statType;

            await loadStats(currentStatType);
        });
    });

    /* Таблица */

    $("#addStandingsRow")?.addEventListener("click", () => {
        addStandingsRow();
    });

    $("#saveCompetition")?.addEventListener("click", saveCompetition);

    /* Настройки */

    $("#settingsForm")?.addEventListener("submit", saveSettings);

    ["settingsPrimary", "settingsAccent", "settingsGold", "settingsWhite"]
        .forEach((id) => {
            const input = $("#" + id);
            const value = $("#" + id + "Value");

            if (!input) return;

            input.addEventListener("input", () => {
                if (value) value.textContent = input.value;
            });
        });

    /* Модальное окно */

    $("#modalClose")?.addEventListener("click", closeModal);

    $("#modalOverlay")?.addEventListener("click", (e) => {
        if (e.target === $("#modalOverlay")) {
            closeModal();
        }
    });

    /* Мобильное меню */

    $("#openSidebar")?.addEventListener("click", () => {
        document.body.classList.add("sidebar-open");
    });

    $("#closeSidebar")?.addEventListener("click", () => {
        document.body.classList.remove("sidebar-open");
    });

    $("#sidebarOverlay")?.addEventListener("click", () => {
        document.body.classList.remove("sidebar-open");
    });
}

function switchSection(section) {
    currentSection = section;

    $$(".admin-section").forEach((el) => {
        el.classList.remove("active");
    });

    const target = $("#section-" + section);

    if (target) {
        target.classList.add("active");
    }

    $$("[data-section]").forEach((button) => {
        button.classList.toggle(
            "active",
            button.dataset.section === section
        );
    });

    const titles = {
        dashboard: ["Главная", "Обзор сайта"],
        settings: ["Настройки", "Основные параметры"],
        news: ["Новости", "Управление новостями"],
        stories: ["Истории", "Временные публикации"],
        clubs: ["Клубы", "Реестр команд"],
        matches: ["Матчи", "Календарь и результаты"],
        competition: ["Первенство", "Таблица и последние матчи"],
        stats: ["Статистика", "Игроки и показатели"],
        leaders: ["Лидеры", "Карточки лучших игроков"],
        albums: ["Фотоальбомы", "Медиа команды"]
    };

    const title = titles[section];

    if (title) {
        if ($("#pageTitle")) $("#pageTitle").textContent = title[0];
        if ($("#pageSubtitle")) $("#pageSubtitle").textContent = title[1];
    }

    document.body.classList.remove("sidebar-open");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/* =========================================================
   DASHBOARD
   ========================================================= */

async function loadAllDashboard() {
    const tables = [
        ["news", "dashboardNewsCount"],
        ["stories", "dashboardStoriesCount"],
        ["matches", "dashboardMatchesCount"],
        ["albums", "dashboardAlbumsCount"]
    ];

    for (const [table, elementId] of tables) {
        const { count } = await db
            .from(table)
            .select("*", { count: "exact", head: true });

        const el = $("#" + elementId);

        if (el) {
            el.textContent = count ?? 0;
        }
    }

    const { data: nextMatch } = await db
        .from("matches")
        .select(`
            *,
            home:clubs!matches_home_club_id_fkey(*),
            away:clubs!matches_away_club_id_fkey(*)
        `)
        .eq("status", "planned")
        .gte("match_date", new Date().toISOString())
        .order("match_date", { ascending: true })
        .limit(1)
        .maybeSingle();

    if ($("#dashboardNextMatch")) {
        if (nextMatch) {
            $("#dashboardNextMatch").textContent =
                `${nextMatch.home?.name || "—"} — ${nextMatch.away?.name || "—"} · ${formatDate(nextMatch.match_date)}`;
        } else {
            $("#dashboardNextMatch").textContent =
                "Ближайших матчей нет";
        }
    }
}

/* =========================================================
   SETTINGS
   ========================================================= */

async function loadSettings() {
    const settings = await getSettings();

    if (!settings) return;

    setValue("settingsTeamName", settings.team_name);
    setValue("settingsSubtitle", settings.subtitle);
    setValue("settingsCity", settings.city);

    setValue("settingsPrimary", settings.primary_color || "#000056");
    setValue("settingsAccent", settings.accent_color || "#0875dc");
    setValue("settingsGold", settings.gold_color || "#ffcd00");
    setValue("settingsWhite", settings.white_color || "#ffffff");

    setText("settingsPrimaryValue", settings.primary_color || "#000056");
    setText("settingsAccentValue", settings.accent_color || "#0875dc");
    setText("settingsGoldValue", settings.gold_color || "#ffcd00");
    setText("settingsWhiteValue", settings.white_color || "#ffffff");

    const preview = $("#settingsLogoPreview");

    if (preview && settings.logo_path) {
        preview.src = publicFile(settings.logo_path);
        preview.classList.add("visible");
    }
}

async function saveSettings(e) {
    e.preventDefault();

    try {
        const current = await getSettings();

        let logoPath = current?.logo_path || null;

        const logoInput = $("#settingsLogo");

        if (logoInput?.files?.length) {
            logoPath = await uploadFile(
                logoInput.files[0],
                "settings"
            );
        }

        const payload = {
            team_name: $("#settingsTeamName")?.value.trim() || "Челны 2011",
            subtitle: $("#settingsSubtitle")?.value.trim() || "хоккейный клуб",
            city: $("#settingsCity")?.value.trim() || "Набережные Челны",
            logo_path: logoPath,
            primary_color: $("#settingsPrimary")?.value || "#000056",
            accent_color: $("#settingsAccent")?.value || "#0875dc",
            gold_color: $("#settingsGold")?.value || "#ffcd00",
            white_color: $("#settingsWhite")?.value || "#ffffff",
            updated_at: new Date().toISOString()
        };

        if (current?.id) {
            const { error } = await db
                .from("site_settings")
                .update(payload)
                .eq("id", current.id);

            if (error) throw error;
        } else {
            const { error } = await db
                .from("site_settings")
                .insert(payload);

            if (error) throw error;
        }

        toast("Настройки сохранены");

        await loadSettings();
    } catch (error) {
        console.error(error);
        toast(error.message || "Не удалось сохранить настройки", true);
    }
}

/* =========================================================
   NEWS
   ========================================================= */

async function loadNews() {
    const container = $("#newsList");

    if (!container) return;

    const { data, error } = await db
        .from("news")
        .select("*")
        .order("published_at", { ascending: false });

    if (error) {
        console.error(error);
        container.innerHTML = emptyState("Ошибка загрузки новостей");
        return;
    }

    if (!data?.length) {
        container.innerHTML = emptyState("Новостей пока нет");
        return;
    }

    container.innerHTML = data.map((item) => `
        <article class="content-item">
            ${item.image_path
                ? `<img class="content-item-image" src="${publicFile(item.image_path)}">`
                : `<div class="content-item-image placeholder"></div>`
            }

            <div class="content-item-main">
                <div class="item-meta">
                    ${escapeHtml(item.tag || "новость")}
                    · ${formatDate(item.published_at)}
                </div>

                <h3>${escapeHtml(item.title)}</h3>

                <p>${escapeHtml(shortText(item.text, 130))}</p>
            </div>

            <div class="content-item-actions">
                <button class="button secondary"
                    data-edit-news="${item.id}">
                    Изменить
                </button>

                <button class="button danger"
                    data-delete-news="${item.id}">
                    Удалить
                </button>
            </div>
        </article>
    `).join("");

    $$("[data-edit-news]").forEach((button) => {
        button.addEventListener("click", () => {
            const item = data.find(
                (x) => x.id === button.dataset.editNews
            );

            if (item) openNewsModal(item);
        });
    });

    $$("[data-delete-news]").forEach((button) => {
        button.addEventListener("click", async () => {
            if (!confirm("Удалить эту новость?")) return;

            await deleteRow("news", button.dataset.deleteNews);
            await loadNews();
            await loadAllDashboard();
        });
    });
}

function openNewsModal(item = null) {
    currentModalAction = async () => {
        const title = $("#modalNewsTitle")?.value.trim();
        const tag = $("#modalNewsTag")?.value.trim();
        const text = $("#modalNewsText")?.value.trim();
        const date = $("#modalNewsDate")?.value;
        const image = $("#modalNewsImage")?.files?.[0];

        if (!title || !text) {
            throw new Error("Заполните заголовок и текст.");
        }

        let imagePath = item?.image_path || null;

        if (image) {
            imagePath = await uploadFile(image, "news");
        }

        const payload = {
            title,
            tag,
            text,
            image_path: imagePath,
            published_at: date
                ? new Date(date).toISOString()
                : item?.published_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        let error;

        if (item) {
            ({ error } = await db
                .from("news")
                .update(payload)
                .eq("id", item.id));
        } else {
            ({ error } = await db
                .from("news")
                .insert(payload));
        }

        if (error) throw error;

        closeModal();
        toast(item ? "Новость изменена" : "Новость опубликована");

        await loadNews();
        await loadAllDashboard();
    };

    openModal(
        item ? "Изменить новость" : "Новая новость",
        `
        <div class="form-grid">
            <label class="field">
                <span>Заголовок</span>
                <input id="modalNewsTitle"
                    value="${escapeAttr(item?.title || "")}"
                    placeholder="Например: Челны начинают сезон">
            </label>

            <label class="field">
                <span>Тег</span>
                <input id="modalNewsTag"
                    value="${escapeAttr(item?.tag || "новость")}"
                    placeholder="новость">
            </label>

            <label class="field full">
                <span>Текст</span>
                <textarea id="modalNewsText"
                    rows="8"
                    placeholder="Текст новости">${escapeHtml(item?.text || "")}</textarea>
            </label>

            <label class="field">
                <span>Дата и время</span>
                <input id="modalNewsDate"
                    type="datetime-local"
                    value="${toDateTimeLocal(item?.published_at)}">
            </label>

            <label class="field">
                <span>Изображение</span>
                <input id="modalNewsImage" type="file" accept="image/*">
            </label>
        </div>
        `
    );
}

/* =========================================================
   STORIES
   ========================================================= */

async function loadStories() {
    const container = $("#storiesList");

    if (!container) return;

    const { data, error } = await db
        .from("stories")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        container.innerHTML = emptyState("Ошибка загрузки историй");
        return;
    }

    if (!data?.length) {
        container.innerHTML = emptyState("Историй пока нет");
        return;
    }

    container.innerHTML = data.map((item) => `
        <article class="content-item">
            <img class="content-item-image story-admin-image"
                 src="${publicFile(item.image_path)}">

            <div class="content-item-main">
                <div class="item-meta">История</div>
                <h3>${formatDate(item.created_at)}</h3>
                <p>
                    ${item.expires_at
                        ? `Удаление: ${formatDate(item.expires_at)}`
                        : "Без даты удаления"
                    }
                </p>
            </div>

            <div class="content-item-actions">
                <button class="button secondary"
                    data-edit-story="${item.id}">
                    Изменить
                </button>

                <button class="button danger"
                    data-delete-story="${item.id}">
                    Удалить
                </button>
            </div>
        </article>
    `).join("");

    $$("[data-edit-story]").forEach((button) => {
        button.addEventListener("click", () => {
            const item = data.find(
                (x) => x.id === button.dataset.editStory
            );

            if (item) openStoryModal(item);
        });
    });

    $$("[data-delete-story]").forEach((button) => {
        button.addEventListener("click", async () => {
            if (!confirm("Удалить историю?")) return;

            await deleteRow("stories", button.dataset.deleteStory);

            await loadStories();
            await loadAllDashboard();
        });
    });
}

function openStoryModal(item = null) {
    currentModalAction = async () => {
        const image = $("#modalStoryImage")?.files?.[0];
        const expires = $("#modalStoryExpires")?.value;

        let imagePath = item?.image_path;

        if (image) {
            imagePath = await uploadFile(image, "stories");
        }

        if (!imagePath) {
            throw new Error("Выберите изображение.");
        }

        const payload = {
            image_path: imagePath,
            expires_at: expires
                ? new Date(expires).toISOString()
                : null
        };

        let error;

        if (item) {
            ({ error } = await db
                .from("stories")
                .update(payload)
                .eq("id", item.id));
        } else {
            ({ error } = await db
                .from("stories")
                .insert(payload));
        }

        if (error) throw error;

        closeModal();
        toast(item ? "История изменена" : "История добавлена");

        await loadStories();
        await loadAllDashboard();
    };

    openModal(
        item ? "Изменить историю" : "Новая история",
        `
        <div class="form-grid">

            <label class="field">
                <span>Изображение</span>
                <input id="modalStoryImage"
                       type="file"
                       accept="image/*">
            </label>

            <label class="field">
                <span>Удалить автоматически</span>
                <input id="modalStoryExpires"
                       type="datetime-local"
                       value="${toDateTimeLocal(item?.expires_at)}">
            </label>

        </div>
        `
    );
}

/* =========================================================
   CLUBS
   ========================================================= */

async function loadClubs() {
    const container = $("#clubsList");

    if (!container) return;

    const { data, error } = await db
        .from("clubs")
        .select("*")
        .order("name");

    if (error) {
        container.innerHTML = emptyState("Ошибка загрузки клубов");
        return;
    }

    if (!data?.length) {
        container.innerHTML = emptyState("Клубов пока нет");
        return;
    }

    container.innerHTML = data.map((club) => `
        <article class="content-item">

            ${club.logo_path
                ? `<img class="content-item-image club-admin-logo"
                         src="${publicFile(club.logo_path)}">`
                : `<div class="content-item-image placeholder"></div>`
            }

            <div class="content-item-main">
                <div class="item-meta">Клуб</div>
                <h3>${escapeHtml(club.name)}</h3>
                <p>${escapeHtml(club.city || "")}</p>
            </div>

            <div class="content-item-actions">
                <button class="button secondary"
                    data-edit-club="${club.id}">
                    Изменить
                </button>

                <button class="button danger"
                    data-delete-club="${club.id}">
                    Удалить
                </button>
            </div>

        </article>
    `).join("");

    $$("[data-edit-club]").forEach((button) => {
        button.addEventListener("click", () => {
            const item = data.find(
                (x) => x.id === button.dataset.editClub
            );

            if (item) openClubModal(item);
        });
    });

    $$("[data-delete-club]").forEach((button) => {
        button.addEventListener("click", async () => {
            if (!confirm("Удалить клуб?")) return;

            await deleteRow("clubs", button.dataset.deleteClub);

            await loadClubs();
            await loadMatches();
        });
    });
}

function openClubModal(item = null) {
    currentModalAction = async () => {
        const name = $("#modalClubName")?.value.trim();
        const city = $("#modalClubCity")?.value.trim();
        const logo = $("#modalClubLogo")?.files?.[0];

        if (!name) {
            throw new Error("Введите название клуба.");
        }

        let logoPath = item?.logo_path || null;

        if (logo) {
            logoPath = await uploadFile(logo, "clubs");
        }

        const payload = {
            name,
            city,
            logo_path: logoPath,
            updated_at: new Date().toISOString()
        };

        let error;

        if (item) {
            ({ error } = await db
                .from("clubs")
                .update(payload)
                .eq("id", item.id));
        } else {
            ({ error } = await db
                .from("clubs")
                .insert(payload));
        }

        if (error) throw error;

        closeModal();
        toast(item ? "Клуб изменён" : "Клуб добавлен");

        await loadClubs();
    };

    openModal(
        item ? "Изменить клуб" : "Новый клуб",
        `
        <div class="form-grid">

            <label class="field">
                <span>Название клуба</span>
                <input id="modalClubName"
                    value="${escapeAttr(item?.name || "")}"
                    placeholder="ХК Челны 2011">
            </label>

            <label class="field">
                <span>Город</span>
                <input id="modalClubCity"
                    value="${escapeAttr(item?.city || "")}"
                    placeholder="Набережные Челны">
            </label>

            <label class="field full">
                <span>Логотип</span>
                <input id="modalClubLogo"
                    type="file"
                    accept="image/*">
            </label>

        </div>
        `
    );
}

/* =========================================================
   MATCHES
   ========================================================= */

async function loadMatches(filter = "all") {
    const container = $("#matchesList");

    if (!container) return;

    let query = db
        .from("matches")
        .select(`
            *,
            home:clubs!matches_home_club_id_fkey(*),
            away:clubs!matches_away_club_id_fkey(*)
        `)
        .order("match_date", { ascending: false });

    if (filter !== "all") {
        query = query.eq("status", filter);
    }

    const { data, error } = await query;

    if (error) {
        console.error(error);
        container.innerHTML = emptyState("Ошибка загрузки матчей");
        return;
    }

    if (!data?.length) {
        container.innerHTML = emptyState("Матчей пока нет");
        return;
    }

    container.innerHTML = data.map((match) => `
        <article class="content-item">

            <div class="content-item-main">
                <div class="item-meta">
                    ${statusLabel(match.status)}
                    · ${formatDate(match.match_date)}
                </div>

                <h3>
                    ${escapeHtml(match.home?.name || "—")}
                    —
                    ${escapeHtml(match.away?.name || "—")}
                </h3>

                <p>
                    ${escapeHtml(match.venue || "")}
                    ${match.competition
                        ? ` · ${escapeHtml(match.competition)}`
                        : ""
                    }
                </p>

                <div class="match-admin-score">
                    ${match.home_score ?? 0}
                    :
                    ${match.away_score ?? 0}
                </div>
            </div>

            <div class="content-item-actions">
                <button class="button secondary"
                    data-edit-match="${match.id}">
                    Изменить
                </button>

                <button class="button secondary"
                    data-live-match="${match.id}">
                    События
                </button>

                <button class="button danger"
                    data-delete-match="${match.id}">
                    Удалить
                </button>
            </div>

        </article>
    `).join("");

    $$("[data-edit-match]").forEach((button) => {
        button.addEventListener("click", () => {
            const item = data.find(
                (x) => x.id === button.dataset.editMatch
            );

            if (item) openMatchModal(item);
        });
    });

    $$("[data-live-match]").forEach((button) => {
        button.addEventListener("click", () => {
            const item = data.find(
                (x) => x.id === button.dataset.liveMatch
            );

            if (item) openMatchEventsModal(item);
        });
    });

    $$("[data-delete-match]").forEach((button) => {
        button.addEventListener("click", async () => {
            if (!confirm("Удалить матч?")) return;

            const id = button.dataset.deleteMatch;

            await db.from("match_goals")
                .delete()
                .eq("match_id", id);

            await db.from("match_penalties")
                .delete()
                .eq("match_id", id);

            await db.from("match_roster")
                .delete()
                .eq("match_id", id);

            await deleteRow("matches", id);

            await loadMatches(filter);
            await loadAllDashboard();
        });
    });
}

async function openMatchModal(item = null) {
    const { data: clubs, error } = await db
        .from("clubs")
        .select("*")
        .order("name");

    if (error) {
        toast(error.message, true);
        return;
    }

    if (!clubs?.length) {
        toast("Сначала добавьте хотя бы два клуба.", true);
        switchSection("clubs");
        return;
    }

    currentModalAction = async () => {
        const home = $("#modalMatchHome")?.value;
        const away = $("#modalMatchAway")?.value;
        const date = $("#modalMatchDate")?.value;
        const venue = $("#modalMatchVenue")?.value.trim();
        const competition = $("#modalMatchCompetition")?.value.trim();
        const status = $("#modalMatchStatus")?.value;
        const homeScore = Number($("#modalMatchHomeScore")?.value || 0);
        const awayScore = Number($("#modalMatchAwayScore")?.value || 0);

        if (!home || !away) {
            throw new Error("Выберите обе команды.");
        }

        if (home === away) {
            throw new Error("Хозяева и гости должны отличаться.");
        }

        if (!date) {
            throw new Error("Укажите дату и время.");
        }

        const payload = {
            home_club_id: home,
            away_club_id: away,
            match_date: new Date(date).toISOString(),
            venue,
            competition,
            status,
            home_score: homeScore,
            away_score: awayScore,
            updated_at: new Date().toISOString()
        };

        let error;

        if (item) {
            ({ error } = await db
                .from("matches")
                .update(payload)
                .eq("id", item.id));
        } else {
            ({ error } = await db
                .from("matches")
                .insert(payload));
        }

        if (error) throw error;

        closeModal();

        toast(item ? "Матч изменён" : "Матч создан");

        await loadMatches();
        await loadAllDashboard();
    };

    openModal(
        item ? "Изменить матч" : "Новый матч",
        `
        <div class="form-grid">

            <label class="field">
                <span>Хозяева</span>
                <select id="modalMatchHome">
                    ${clubs.map((club) => `
                        <option value="${club.id}"
                            ${club.id === item?.home_club_id ? "selected" : ""}>
                            ${escapeHtml(club.name)}
                        </option>
                    `).join("")}
                </select>
            </label>

            <label class="field">
                <span>Гости</span>
                <select id="modalMatchAway">
                    ${clubs.map((club) => `
                        <option value="${club.id}"
                            ${club.id === item?.away_club_id ? "selected" : ""}>
                            ${escapeHtml(club.name)}
                        </option>
                    `).join("")}
                </select>
            </label>

            <label class="field">
                <span>Дата и время</span>
                <input id="modalMatchDate"
                    type="datetime-local"
                    value="${toDateTimeLocal(item?.match_date)}">
            </label>

            <label class="field">
                <span>Место</span>
                <input id="modalMatchVenue"
                    value="${escapeAttr(item?.venue || "")}"
                    placeholder="ЛД «Челны»">
            </label>

            <label class="field">
                <span>Соревнование</span>
                <input id="modalMatchCompetition"
                    value="${escapeAttr(item?.competition || "Первенство ПФО. Группа Б2")}">
            </label>

            <label class="field">
                <span>Статус</span>
                <select id="modalMatchStatus">
                    <option value="planned"
                        ${item?.status === "planned" ? "selected" : ""}>
                        Запланирован
                    </option>

                    <option value="live"
                        ${item?.status === "live" ? "selected" : ""}>
                        Идёт
                    </option>

                    <option value="finished"
                        ${item?.status === "finished" ? "selected" : ""}>
                        Завершён
                    </option>
                </select>
            </label>

            <label class="field">
                <span>Голы хозяев</span>
                <input id="modalMatchHomeScore"
                    type="number"
                    min="0"
                    value="${item?.home_score ?? 0}">
            </label>

            <label class="field">
                <span>Голы гостей</span>
                <input id="modalMatchAwayScore"
                    type="number"
                    min="0"
                    value="${item?.away_score ?? 0}">
            </label>

        </div>
        `
    );
}

/* =========================================================
   MATCH EVENTS
   ========================================================= */

async function openMatchEventsModal(match) {
    const [goalsResult, penaltiesResult] = await Promise.all([
        db.from("match_goals")
            .select("*")
            .eq("match_id", match.id)
            .order("created_at"),

        db.from("match_penalties")
            .select("*")
            .eq("match_id", match.id)
            .order("created_at")
    ]);

    const goals = goalsResult.data || [];
    const penalties = penaltiesResult.data || [];

    currentModalAction = async () => {
        const type = $("#eventType")?.value;

        if (type === "goal") {
            await addMatchGoal(match.id);
        } else {
            await addMatchPenalty(match.id);
        }

        closeModal();
        await loadMatches();
    };

    openModal(
        `События · ${match.home?.name || ""} — ${match.away?.name || ""}`,
        `
        <div class="event-manager">

            <div class="event-section">
                <div class="event-section-head">
                    <strong>Голы</strong>
                </div>

                ${
                    goals.length
                        ? goals.map((goal) => `
                            <div class="event-row">
                                <b>${escapeHtml(goal.minute || "")}'</b>
                                <span>
                                    ${escapeHtml(goal.player_name || "")}
                                    #${escapeHtml(String(goal.player_number || ""))}
                                </span>
                                <small>${escapeHtml(goal.strength || "")}</small>
                            </div>
                        `).join("")
                        : `<div class="muted">Голов пока нет</div>`
                }
            </div>

            <div class="event-section">
                <div class="event-section-head">
                    <strong>Удаления</strong>
                </div>

                ${
                    penalties.length
                        ? penalties.map((penalty) => `
                            <div class="event-row">
                                <b>${escapeHtml(penalty.penalty_time || "")}</b>
                                <span>
                                    ${escapeHtml(penalty.player_name || "")}
                                    #${escapeHtml(String(penalty.player_number || ""))}
                                </span>
                                <small>
                                    ${escapeHtml(penalty.reason || "")}
                                    · ${penalty.minutes} мин.
                                </small>
                            </div>
                        `).join("")
                        : `<div class="muted">Удалений пока нет</div>`
                }
            </div>

            <hr>

            <label class="field">
                <span>Добавить событие</span>
                <select id="eventType">
                    <option value="goal">Гол</option>
                    <option value="penalty">Удаление</option>
                </select>
            </label>

            <div class="hint">
                После выбора типа нажмите «Добавить событие».
            </div>

        </div>
        `,
        "Добавить событие"
    );
}

async function addMatchGoal(matchId) {
    const minute = prompt("Время гола, например 12:34:");
    if (minute === null) return;

    const team = prompt("Команда: home или away", "home");
    if (!team) return;

    const number = prompt("Номер игрока:");
    if (number === null) return;

    const name = prompt("ФИО игрока:");
    if (name === null) return;

    const strength = prompt(
        "Ситуация: равные / большинство / меньшинство",
        "равные"
    );

    const { error } = await db
        .from("match_goals")
        .insert({
            match_id: matchId,
            team,
            minute,
            player_number: Number(number),
            player_name: name,
            strength
        });

    if (error) throw error;

    toast("Гол добавлен");
}

async function addMatchPenalty(matchId) {
    const penaltyTime = prompt("Время удаления:");
    if (penaltyTime === null) return;

    const team = prompt("Команда: home или away", "home");
    if (!team) return;

    const number = prompt("Номер игрока:");
    if (number === null) return;

    const name = prompt("ФИО игрока:");
    if (name === null) return;

    const reason = prompt("Причина удаления:");
    if (reason === null) return;

    const minutes = prompt("Количество минут:", "2");
    if (minutes === null) return;

    const { error } = await db
        .from("match_penalties")
        .insert({
            match_id: matchId,
            team,
            penalty_time: penaltyTime,
            player_number: Number(number),
            player_name: name,
            reason,
            minutes: Number(minutes)
        });

    if (error) throw error;

    toast("Удаление добавлено");
}

/* =========================================================
   COMPETITION / STANDINGS
   ========================================================= */

async function loadCompetition() {
    const container = $("#standingsEditorBody");

    if (!container) return;

    const { data, error } = await db
        .from("standings")
        .select("*")
        .order("place");

    if (error) {
        console.error(error);
        return;
    }

    container.innerHTML = "";

    if (!data?.length) {
        addStandingsRow();
        return;
    }

    data.forEach((row) => addStandingsRow(row));

    const lastMatches = $("#competitionLastMatches");

    if (lastMatches) {
        const { data: matches } = await db
            .from("matches")
            .select(`
                *,
                home:clubs!matches_home_club_id_fkey(*),
                away:clubs!matches_away_club_id_fkey(*)
            `)
            .eq("status", "finished")
            .order("match_date", { ascending: false })
            .limit(3);

        lastMatches.innerHTML = matches?.length
            ? matches.map((match) => `
                <div class="mini-match">
                    <span>
                        ${escapeHtml(match.home?.name || "")}
                        —
                        ${escapeHtml(match.away?.name || "")}
                    </span>

                    <b>
                        ${match.home_score ?? 0}:
                        ${match.away_score ?? 0}
                    </b>
                </div>
            `).join("")
            : `<div class="muted">Завершённых матчей пока нет</div>`;
    }
}

function addStandingsRow(row = null) {
    const body = $("#standingsEditorBody");

    if (!body) return;

    const tr = document.createElement("tr");

    tr.innerHTML = `
        <td>
            <input class="standing-place"
                type="number"
                value="${row?.place ?? body.children.length + 1}">
        </td>

        <td>
            <input class="standing-team"
                value="${escapeAttr(row?.team_name || "")}">
        </td>

        <td><input class="standing-games" type="number" value="${row?.games ?? 0}"></td>
        <td><input class="standing-wins" type="number" value="${row?.wins ?? 0}"></td>
        <td><input class="standing-owins" type="number" value="${row?.overtime_wins ?? 0}"></td>
        <td><input class="standing-swins" type="number" value="${row?.shootout_wins ?? 0}"></td>
        <td><input class="standing-losses" type="number" value="${row?.losses ?? 0}"></td>
        <td><input class="standing-olosses" type="number" value="${row?.overtime_losses ?? 0}"></td>
        <td><input class="standing-slosses" type="number" value="${row?.shootout_losses ?? 0}"></td>
        <td><input class="standing-points" type="number" value="${row?.points ?? 0}"></td>

        <td>
            <button class="icon-button danger"
                type="button">
                ×
            </button>
        </td>
    `;

    tr.querySelector("button")?.addEventListener("click", () => {
        tr.remove();
    });

    body.appendChild(tr);
}

async function saveCompetition() {
    const rows = $$("#standingsEditorBody tr");

    try {
        await db
            .from("standings")
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000");

        const payload = rows.map((row) => ({
            place: Number(row.querySelector(".standing-place")?.value || 0),
            team_name: row.querySelector(".standing-team")?.value.trim() || "",
            games: Number(row.querySelector(".standing-games")?.value || 0),
            wins: Number(row.querySelector(".standing-wins")?.value || 0),
            overtime_wins: Number(row.querySelector(".standing-owins")?.value || 0),
            shootout_wins: Number(row.querySelector(".standing-swins")?.value || 0),
            losses: Number(row.querySelector(".standing-losses")?.value || 0),
            overtime_losses: Number(row.querySelector(".standing-olosses")?.value || 0),
            shootout_losses: Number(row.querySelector(".standing-slosses")?.value || 0),
            points: Number(row.querySelector(".standing-points")?.value || 0)
        }));

        const clean = payload.filter((row) => row.team_name);

        if (clean.length) {
            const { error } = await db
                .from("standings")
                .insert(clean);

            if (error) throw error;
        }

        toast("Таблица сохранена");

        await loadCompetition();
    } catch (error) {
        console.error(error);
        toast(error.message || "Ошибка сохранения таблицы", true);
    }
}

/* =========================================================
   PLAYER STATS
   ========================================================= */

async function loadStats(type) {
    const container = $("#statsList");

    if (!container) return;

    const { data, error } = await db
        .from("player_stats")
        .select("*")
        .eq("stat_type", type)
        .order("value", { ascending: false });

    if (error) {
        console.error(error);
        container.innerHTML = emptyState("Ошибка загрузки статистики");
        return;
    }

    if (!data?.length) {
        container.innerHTML = emptyState("Игроков пока нет");
        return;
    }

    container.innerHTML = data.map((item) => `
        <article class="content-item">

            <div class="player-number-small">
                ${escapeHtml(String(item.player_number || ""))}
            </div>

            <div class="content-item-main">
                <div class="item-meta">
                    ${statLabel(type)}
                </div>

                <h3>${escapeHtml(item.player_name)}</h3>

                <p>
                    ${escapeHtml(item.position || "")}
                </p>
            </div>

            <div class="stat-value">
                ${item.value ?? 0}
            </div>

            <div class="content-item-actions">
                <button class="button secondary"
                    data-edit-stat="${item.id}">
                    Изменить
                </button>

                <button class="button danger"
                    data-delete-stat="${item.id}">
                    Удалить
                </button>
            </div>

        </article>
    `).join("");

    $$("[data-edit-stat]").forEach((button) => {
        button.addEventListener("click", () => {
            const item = data.find(
                (x) => x.id === button.dataset.editStat
            );

            if (item) openStatModal(item);
        });
    });

    $$("[data-delete-stat]").forEach((button) => {
        button.addEventListener("click", async () => {
            if (!confirm("Удалить статистику игрока?")) return;

            await deleteRow(
                "player_stats",
                button.dataset.deleteStat
            );

            await loadStats(type);
        });
    });
}

function openStatModal(item = null) {
    currentModalAction = async () => {
        const playerName = $("#modalStatName")?.value.trim();
        const number = $("#modalStatNumber")?.value;
        const position = $("#modalStatPosition")?.value.trim();
        const value = Number($("#modalStatValue")?.value || 0);

        if (!playerName) {
            throw new Error("Введите фамилию и имя игрока.");
        }

        const payload = {
            stat_type: currentStatType,
            player_name: playerName,
            player_number: Number(number || 0),
            position,
            value,
            updated_at: new Date().toISOString()
        };

        let error;

        if (item) {
            ({ error } = await db
                .from("player_stats")
                .update(payload)
                .eq("id", item.id));
        } else {
            ({ error } = await db
                .from("player_stats")
                .insert(payload));
        }

        if (error) throw error;

        closeModal();

        toast(item ? "Статистика изменена" : "Статистика добавлена");

        await loadStats(currentStatType);
    };

    openModal(
        item ? "Изменить статистику" : "Добавить игрока",
        `
        <div class="form-grid">

            <label class="field">
                <span>Игрок</span>
                <input id="modalStatName"
                    value="${escapeAttr(item?.player_name || "")}">
            </label>

            <label class="field">
                <span>Номер</span>
                <input id="modalStatNumber"
                    type="number"
                    value="${item?.player_number ?? ""}">
            </label>

            <label class="field">
                <span>Амплуа</span>
                <input id="modalStatPosition"
                    value="${escapeAttr(item?.position || "")}"
                    placeholder="Нападающий">
            </label>

            <label class="field">
                <span>${statLabel(currentStatType)}</span>
                <input id="modalStatValue"
                    type="number"
                    step="0.1"
                    value="${item?.value ?? 0}">
            </label>

        </div>
        `
    );
}

/* =========================================================
   LEADERS
   ========================================================= */

async function loadLeaders() {
    const container = $("#leadersList");

    if (!container) return;

    const { data, error } = await db
        .from("team_leaders")
        .select("*")
        .order("leader_type");

    if (error) {
        container.innerHTML = emptyState("Ошибка загрузки лидеров");
        return;
    }

    if (!data?.length) {
        container.innerHTML = emptyState("Лидеры пока не настроены");
        return;
    }

    container.innerHTML = data.map((item) => `
        <article class="content-item">

            ${
                item.image_path
                    ? `<img class="content-item-image player-cutout-preview"
                           src="${publicFile(item.image_path)}">`
                    : `<div class="content-item-image placeholder"></div>`
            }

            <div class="content-item-main">
                <div class="item-meta">
                    ${leaderLabel(item.leader_type)}
                </div>

                <h3>
                    #${escapeHtml(String(item.player_number || ""))}
                    ${escapeHtml(item.player_name)}
                </h3>

                <p>
                    ${escapeHtml(item.position || "")}
                    · ${escapeHtml(item.statistic || "")}
                </p>
            </div>

            <div class="content-item-actions">
                <button class="button secondary"
                    data-edit-leader="${item.id}">
                    Изменить
                </button>

                <button class="button danger"
                    data-delete-leader="${item.id}">
                    Удалить
                </button>
            </div>

        </article>
    `).join("");

    $$("[data-edit-leader]").forEach((button) => {
        button.addEventListener("click", () => {
            const item = data.find(
                (x) => x.id === button.dataset.editLeader
            );

            if (item) openLeaderModal(item);
        });
    });

    $$("[data-delete-leader]").forEach((button) => {
        button.addEventListener("click", async () => {
            if (!confirm("Удалить карточку лидера?")) return;

            await deleteRow(
                "team_leaders",
                button.dataset.deleteLeader
            );

            await loadLeaders();
        });
    });
}

function openLeaderModal(item = null) {
    currentModalAction = async () => {
        const type = $("#modalLeaderType")?.value;
        const name = $("#modalLeaderName")?.value.trim();
        const number = Number($("#modalLeaderNumber")?.value || 0);
        const position = $("#modalLeaderPosition")?.value.trim();
        const statistic = $("#modalLeaderStatistic")?.value.trim();
        const image = $("#modalLeaderImage")?.files?.[0];

        if (!name) {
            throw new Error("Введите имя игрока.");
        }

        let imagePath = item?.image_path || null;

        if (image) {
            imagePath = await uploadFile(image, "leaders");
        }

        const payload = {
            leader_type: type,
            player_name: name,
            player_number: number,
            position,
            statistic,
            image_path: imagePath
        };

        let error;

        if (item) {
            ({ error } = await db
                .from("team_leaders")
                .update(payload)
                .eq("id", item.id));
        } else {
            ({ error } = await db
                .from("team_leaders")
                .insert(payload));
        }

        if (error) throw error;

        closeModal();
        toast(item ? "Лидер изменён" : "Лидер добавлен");

        await loadLeaders();
    };

    openModal(
        item ? "Изменить лидера" : "Новый лидер",
        `
        <div class="form-grid">

            <label class="field">
                <span>Категория</span>
                <select id="modalLeaderType">

                    <option value="scorer"
                        ${item?.leader_type === "scorer" ? "selected" : ""}>
                        Бомбардир
                    </option>

                    <option value="sniper"
                        ${item?.leader_type === "sniper" ? "selected" : ""}>
                        Снайпер
                    </option>

                    <option value="defender"
                        ${item?.leader_type === "defender" ? "selected" : ""}>
                        Бомбардир-защитник
                    </option>

                    <option value="plus_minus"
                        ${item?.leader_type === "plus_minus" ? "selected" : ""}>
                        Плюс/минус
                    </option>

                </select>
            </label>

            <label class="field">
                <span>Игрок</span>
                <input id="modalLeaderName"
                    value="${escapeAttr(item?.player_name || "")}">
            </label>

            <label class="field">
                <span>Номер</span>
                <input id="modalLeaderNumber"
                    type="number"
                    value="${item?.player_number ?? ""}">
            </label>

            <label class="field">
                <span>Позиция</span>
                <input id="modalLeaderPosition"
                    value="${escapeAttr(item?.position || "")}">
            </label>

            <label class="field">
                <span>Статистика</span>
                <input id="modalLeaderStatistic"
                    value="${escapeAttr(item?.statistic || "")}"
                    placeholder="35 очков">
            </label>

            <label class="field full">
                <span>PNG игрока без фона</span>
                <input id="modalLeaderImage"
                    type="file"
                    accept="image/png,image/webp,image/jpeg">
            </label>

        </div>
        `
    );
}

/* =========================================================
   ALBUMS
   ========================================================= */

async function loadAlbums() {
    const container = $("#albumsList");

    if (!container) return;

    const { data, error } = await db
        .from("albums")
        .select("*")
        .order("album_date", { ascending: false });

    if (error) {
        container.innerHTML = emptyState("Ошибка загрузки альбомов");
        return;
    }

    if (!data?.length) {
        container.innerHTML = emptyState("Альбомов пока нет");
        return;
    }

    container.innerHTML = data.map((album) => `
        <article class="content-item">

            ${
                album.cover_path
                    ? `<img class="content-item-image"
                           src="${publicFile(album.cover_path)}">`
                    : `<div class="content-item-image placeholder"></div>`
            }

            <div class="content-item-main">
                <div class="item-meta">
                    ${formatDate(album.album_date)}
                </div>

                <h3>${escapeHtml(album.title)}</h3>
            </div>

            <div class="content-item-actions">
                <button class="button secondary"
                    data-edit-album="${album.id}">
                    Изменить
                </button>

                <button class="button danger"
                    data-delete-album="${album.id}">
                    Удалить
                </button>
            </div>

        </article>
    `).join("");

    $$("[data-edit-album]").forEach((button) => {
        button.addEventListener("click", () => {
            const item = data.find(
                (x) => x.id === button.dataset.editAlbum
            );

            if (item) openAlbumModal(item);
        });
    });

    $$("[data-delete-album]").forEach((button) => {
        button.addEventListener("click", async () => {
            if (!confirm("Удалить альбом и его фотографии?")) return;

            const id = button.dataset.deleteAlbum;

            await db
                .from("album_photos")
                .delete()
                .eq("album_id", id);

            await deleteRow("albums", id);

            await loadAlbums();
            await loadAllDashboard();
        });
    });
}

function openAlbumModal(item = null) {
    currentModalAction = async () => {
        const title = $("#modalAlbumTitle")?.value.trim();
        const date = $("#modalAlbumDate")?.value;
        const cover = $("#modalAlbumCover")?.files?.[0];
        const photos = $("#modalAlbumPhotos")?.files || [];

        if (!title) {
            throw new Error("Введите название альбома.");
        }

        let coverPath = item?.cover_path || null;

        if (cover) {
            coverPath = await uploadFile(cover, "albums");
        }

        const payload = {
            title,
            album_date: date
                ? new Date(date).toISOString()
                : item?.album_date || new Date().toISOString(),
            cover_path: coverPath,
            updated_at: new Date().toISOString()
        };

        let albumId = item?.id;
        let error;

        if (item) {
            ({ error } = await db
                .from("albums")
                .update(payload)
                .eq("id", item.id));
        } else {
            const result = await db
                .from("albums")
                .insert(payload)
                .select()
                .single();

            error = result.error;
            albumId = result.data?.id;
        }

        if (error) throw error;

        if (albumId && photos.length) {
            const photoRows = [];

            for (let i = 0; i < photos.length; i++) {
                const path = await uploadFile(
                    photos[i],
                    "albums/photos"
                );

                photoRows.push({
                    album_id: albumId,
                    image_path: path,
                    sort_order: i
                });
            }

            if (photoRows.length) {
                const { error: photoError } = await db
                    .from("album_photos")
                    .insert(photoRows);

                if (photoError) throw photoError;
            }
        }

        closeModal();

        toast(item ? "Альбом изменён" : "Альбом создан");

        await loadAlbums();
        await loadAllDashboard();
    };

    openModal(
        item ? "Изменить альбом" : "Новый альбом",
        `
        <div class="form-grid">

            <label class="field">
                <span>Название</span>
                <input id="modalAlbumTitle"
                    value="${escapeAttr(item?.title || "")}"
                    placeholder="Матч с ...">
            </label>

            <label class="field">
                <span>Дата</span>
                <input id="modalAlbumDate"
                    type="date"
                    value="${toDateLocal(item?.album_date)}">
            </label>

            <label class="field">
                <span>Обложка</span>
                <input id="modalAlbumCover"
                    type="file"
                    accept="image/*">
            </label>

            <label class="field full">
                <span>Фотографии</span>
                <input id="modalAlbumPhotos"
                    type="file"
                    accept="image/*"
                    multiple>
            </label>

        </div>
        `
    );
}

/* =========================================================
   MODAL
   ========================================================= */

function openModal(title, body, confirmText = "Сохранить") {
    const modal = $("#modal");

    if (!modal) return;

    $("#modalTitle").textContent = title;
    $("#modalEyebrow").textContent = "Управление";

    $("#modalBody").innerHTML = body;

    $("#modalFooter").innerHTML = `
        <button class="button secondary"
            id="modalCancel">
            Отмена
        </button>

        <button class="button primary"
            id="modalConfirm">
            ${confirmText}
        </button>
    `;

    $("#modalCancel").addEventListener("click", closeModal);

    $("#modalConfirm").addEventListener("click", async () => {
        const button = $("#modalConfirm");

        if (!currentModalAction) return;

        button.disabled = true;
        button.textContent = "Сохранение...";

        try {
            await currentModalAction();
        } catch (error) {
            console.error(error);
            toast(error.message || "Произошла ошибка", true);
        } finally {
            button.disabled = false;
            button.textContent = confirmText;
        }
    });

    modal.classList.add("open");
    document.body.classList.add("modal-open");
}

function closeModal() {
    const modal = $("#modal");

    if (modal) {
        modal.classList.remove("open");
    }

    document.body.classList.remove("modal-open");

    currentModalAction = null;
}

/* =========================================================
   HELPERS
   ========================================================= */

async function deleteRow(table, id) {
    const { error } = await db
        .from(table)
        .delete()
        .eq("id", id);

    if (error) {
        console.error(error);
        toast(error.message || "Ошибка удаления", true);
        throw error;
    }

    toast("Удалено");
}

function setValue(id, value) {
    const element = $("#" + id);

    if (element && value !== undefined && value !== null) {
        element.value = value;
    }
}

function setText(id, value) {
    const element = $("#" + id);

    if (element) {
        element.textContent = value ?? "";
    }
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function toDateTimeLocal(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);

    return local.toISOString().slice(0, 16);
}

function toDateLocal(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toISOString().slice(0, 10);
}

function shortText(text, length) {
    if (!text) return "";

    return text.length > length
        ? text.slice(0, length).trim() + "…"
        : text;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
    return escapeHtml(value);
}

function emptyState(text) {
    return `
        <div class="empty-state">
            <div class="empty-state-title">
                ${escapeHtml(text)}
            </div>
        </div>
    `;
}

function statusLabel(status) {
    const labels = {
        planned: "Запланирован",
        live: "LIVE",
        finished: "Завершён"
    };

    return labels[status] || status || "—";
}

function statLabel(type) {
    const labels = {
        scorers: "Бомбардиры",
        snipers: "Снайперы",
        defenders: "Бомбардиры-защитники",
        plus_minus: "Плюс/минус"
    };

    return labels[type] || type;
}

function leaderLabel(type) {
    const labels = {
        scorer: "Бомбардир",
        sniper: "Снайпер",
        defender: "Бомбардир-защитник",
        plus_minus: "Плюс/минус"
    };

    return labels[type] || type;
}

function toast(message, isError = false) {
    const element = $("#toast");
    const messageElement = $("#toastMessage");

    if (!element || !messageElement) return;

    messageElement.textContent = message;

    element.classList.toggle("error", isError);
    element.classList.add("show");

    clearTimeout(window.__toastTimer);

    window.__toastTimer = setTimeout(() => {
        element.classList.remove("show");
    }, 3000);
}

function showLoginError(message) {
    const element = $("#loginError");

    if (!element) return;

    element.textContent = message;
    element.classList.add("show");
}

/* =========================================================
   SETTINGS FALLBACK
   ========================================================= */

async function getSettings() {
    const { data, error } = await db
        .from("site_settings")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error(error);
        return null;
    }

    return data;
}

/* =========================================================
   GLOBAL FALLBACKS
   ========================================================= */

if (typeof window.getSettings !== "function") {
    window.getSettings = getSettings;
}

if (typeof window.publicFile !== "function") {
    window.publicFile = (path) => {
        if (!path) return "";

        return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
    };
}

if (typeof window.uploadFile !== "function") {
    window.uploadFile = async (file, folder = "uploads") => {
        if (!file) {
            throw new Error("Файл не выбран.");
        }

        const extension =
            file.name.split(".").pop()?.toLowerCase() || "bin";

        const filename =
            `${crypto.randomUUID()}.${extension}`;

        const path = `${folder}/${filename}`;

        const { error } = await db
            .storage
            .from(STORAGE_BUCKET)
            .upload(path, file, {
                cacheControl: "3600",
                upsert: false
            });

        if (error) throw error;

        return path;
    };
}
