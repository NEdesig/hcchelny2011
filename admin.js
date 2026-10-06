/* =========================================================
   ХК ЧЕЛНЫ 2011 — ADMIN.JS
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     CONFIG
     ======================================================= */

  const CONFIG = window.SITE_CONFIG || {};

  const SUPABASE_URL = CONFIG.SUPABASE_URL;
  const SUPABASE_KEY = CONFIG.SUPABASE_KEY;

  let supabaseClient = null;
  let currentUser = null;

  /* =======================================================
     DOM HELPERS
     ======================================================= */

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

  function byId(id) {
    return document.getElementById(id);
  }

  /* =======================================================
     ELEMENTS
     ======================================================= */

  const loader = byId("adminLoader");
  const loginScreen = byId("loginScreen");
  const adminApp = byId("adminApp");

  const loginForm = byId("loginForm");
  const loginEmail = byId("loginEmail");
  const loginPassword = byId("loginPassword");
  const loginError = byId("loginError");

  const adminModal = byId("adminModal");
  const adminModalBackdrop = byId("adminModalBackdrop");
  const adminModalWindow = byId("adminModalWindow");
  const adminModalTitle = byId("adminModalTitle");
  const adminModalContent = byId("adminModalContent");
  const modalClose = byId("modalClose");

  const adminToast = byId("adminToast");

  /* =======================================================
     LOADER
     ======================================================= */

  function hideLoader() {
    if (!loader) return;

    loader.classList.add("hidden");
  }

  function showLoader() {
    if (!loader) return;

    loader.classList.remove("hidden");
  }

  /* =======================================================
     LOGIN / APP VISIBILITY
     ======================================================= */

  function showLogin() {
    hideLoader();

    if (loginScreen) {
      loginScreen.classList.remove("hidden");
    }

    if (adminApp) {
      adminApp.classList.add("hidden");
    }
  }

  function showApp() {
    hideLoader();

    if (loginScreen) {
      loginScreen.classList.add("hidden");
    }

    if (adminApp) {
      adminApp.classList.remove("hidden");
    }
  }

  /* =======================================================
     TOAST
     ======================================================= */

  let toastTimer = null;

  function toast(message, type = "default") {
    if (!adminToast) {
      console.log(message);
      return;
    }

    clearTimeout(toastTimer);

    adminToast.textContent = message;

    adminToast.className = "admin-toast";

    if (type) {
      adminToast.classList.add(type);
    }

    adminToast.classList.remove("hidden");

    toastTimer = setTimeout(() => {
      adminToast.classList.add("hidden");
    }, 3200);
  }

  window.adminToast = toast;

  /* =======================================================
     ERROR
     ======================================================= */

  function showLoginError(message) {
    if (!loginError) return;

    loginError.textContent = message;
    loginError.classList.remove("hidden");
  }

  function clearLoginError() {
    if (!loginError) return;

    loginError.textContent = "";
    loginError.classList.add("hidden");
  }

  /* =======================================================
     SUPABASE
     ======================================================= */

  function initSupabase() {
    try {
      if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error("Supabase config is missing.");

        showLoginError(
          "Не указаны данные Supabase. Проверьте config.js."
        );

        showLogin();
        return false;
      }

      if (!window.supabase) {
        console.error("Supabase library was not loaded.");

        showLoginError(
          "Не удалось загрузить Supabase. Проверьте подключение к интернету."
        );

        showLogin();
        return false;
      }

      supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );

      window.supabaseClient = supabaseClient;

      return true;
    } catch (error) {
      console.error("Supabase initialization error:", error);

      showLoginError(
        "Ошибка подключения к Supabase."
      );

      showLogin();

      return false;
    }
  }

  /* =======================================================
     AUTH
     ======================================================= */

  async function checkSession() {
    if (!supabaseClient) {
      showLogin();
      return;
    }

    try {
      const result = await supabaseClient.auth.getSession();

      if (result.error) {
        console.error(result.error);

        showLogin();
        return;
      }

      const session = result.data?.session;

      if (session?.user) {
        currentUser = session.user;

        showApp();

        updateUserInfo();

        await initializeAdmin();
      } else {
        showLogin();
      }
    } catch (error) {
      console.error("Session check error:", error);

      showLogin();
    }
  }

  async function login(email, password) {
    if (!supabaseClient) {
      showLoginError("Supabase не подключён.");
      return;
    }

    clearLoginError();

    const button = loginForm
      ? $("button[type='submit']", loginForm)
      : null;

    const oldText = button?.textContent;

    if (button) {
      button.disabled = true;
      button.textContent = "Вход...";
    }

    try {
      const result =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (result.error) {
        console.error(result.error);

        showLoginError(
          getAuthErrorMessage(result.error)
        );

        return;
      }

      currentUser = result.data?.user || null;

      if (!currentUser) {
        showLoginError("Не удалось получить пользователя.");
        return;
      }

      showApp();

      updateUserInfo();

      await initializeAdmin();

      toast("Вы вошли в админ-панель", "success");
    } catch (error) {
      console.error("Login error:", error);

      showLoginError(
        "Не удалось выполнить вход. Проверьте данные."
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = oldText || "Войти";
      }
    }
  }

  async function logout() {
    try {
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
      }
    } catch (error) {
      console.error("Logout error:", error);
    }

    currentUser = null;

    closeModal();
    closeMobileSidebar();

    showLogin();

    if (loginEmail) {
      loginEmail.value = "";
    }

    if (loginPassword) {
      loginPassword.value = "";
    }

    clearLoginError();
  }

  function getAuthErrorMessage(error) {
    const message = String(error?.message || "").toLowerCase();

    if (
      message.includes("invalid login credentials") ||
      message.includes("invalid credentials")
    ) {
      return "Неверная почта или пароль.";
    }

    if (message.includes("email not confirmed")) {
      return "Подтвердите почту в аккаунте Supabase.";
    }

    if (message.includes("too many requests")) {
      return "Слишком много попыток. Попробуйте позже.";
    }

    return error?.message || "Ошибка авторизации.";
  }

  /* =======================================================
     USER INFO
     ======================================================= */

  function updateUserInfo() {
    if (!currentUser) return;

    const emailElements = $$(".admin-user-email");

    emailElements.forEach((element) => {
      element.textContent =
        currentUser.email || "Администратор";
    });
  }

  /* =======================================================
     AUTH STATE LISTENER
     ======================================================= */

  function setupAuthListener() {
    if (!supabaseClient) return;

    supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth event:", event);

        if (session?.user) {
          currentUser = session.user;

          updateUserInfo();

          if (event === "SIGNED_IN") {
            showApp();
          }
        }

        if (event === "SIGNED_OUT") {
          currentUser = null;

          showLogin();
        }
      }
    );
  }

  /* =======================================================
     NAVIGATION
     ======================================================= */

  function setupNavigation() {
    const navItems = $$(".sidebar-item[data-section]");

    navItems.forEach((item) => {
      item.addEventListener("click", () => {
        const sectionName =
          item.dataset.section;

        if (!sectionName) return;

        openSection(sectionName);

        closeMobileSidebar();
      });
    });
  }

  function openSection(sectionName) {
    const sections = $$(".admin-section");

    let targetFound = false;

    sections.forEach((section) => {
      const sectionId = section.id;

      const matches =
        sectionId === sectionName ||
        sectionId === `section-${sectionName}`;

      if (matches) {
        section.classList.add("active");
        targetFound = true;
      } else {
        section.classList.remove("active");
      }
    });

    const navItems = $$(".sidebar-item[data-section]");

    navItems.forEach((item) => {
      if (item.dataset.section === sectionName) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    updateTopbarTitle(sectionName);

    if (!targetFound) {
      console.warn(
        `Section "${sectionName}" was not found.`
      );
    }
  }

  function updateTopbarTitle(sectionName) {
    const title = $(".topbar-title");

    if (!title) return;

    const names = {
      dashboard: "Обзор",
      homepage: "Главная",
      matches: "Матчи",
      players: "Команда",
      stats: "Статистика",
      news: "Новости",
      media: "Медиа",
      products: "Магазин",
      standings: "Таблица",
      birthdays: "Дни рождения",
      achievements: "Достижения",
      registry: "Реестр"
    };

    title.textContent =
      names[sectionName] || "Админ-панель";
  }

  /* =======================================================
     MOBILE SIDEBAR
     ======================================================= */

  function setupMobileMenu() {
    const menuButton =
      $(".mobile-menu-button");

    const sidebar =
      $(".admin-sidebar");

    if (!menuButton || !sidebar) return;

    menuButton.addEventListener("click", () => {
      sidebar.classList.toggle("mobile-open");

      updateSidebarOverlay();
    });

    document.addEventListener("click", (event) => {
      if (!sidebar.classList.contains("mobile-open")) {
        return;
      }

      const clickedInside =
        sidebar.contains(event.target) ||
        menuButton.contains(event.target);

      if (!clickedInside) {
        closeMobileSidebar();
      }
    });
  }

  function updateSidebarOverlay() {
    const sidebar = $(".admin-sidebar");

    if (!sidebar) return;

    let overlay =
      $(".admin-sidebar-overlay");

    if (!overlay) {
      overlay = document.createElement("div");

      overlay.className =
        "admin-sidebar-overlay";

      document.body.appendChild(overlay);

      overlay.addEventListener("click", () => {
        closeMobileSidebar();
      });
    }

    if (sidebar.classList.contains("mobile-open")) {
      overlay.classList.add("active");
    } else {
      overlay.classList.remove("active");
    }
  }

  function closeMobileSidebar() {
    const sidebar = $(".admin-sidebar");

    if (!sidebar) return;

    sidebar.classList.remove("mobile-open");

    const overlay =
      $(".admin-sidebar-overlay");

    if (overlay) {
      overlay.classList.remove("active");
    }
  }

  /* =======================================================
     REMOVE SETTINGS FROM NAVIGATION
     ======================================================= */

  function removeSettingsButton() {
    const settingsItems =
      $$(
        ".sidebar-item[data-section='settings'], " +
        ".sidebar-item[data-section='settings']"
      );

    settingsItems.forEach((item) => {
      item.remove();
    });

    const settingsSections =
      $$("#settings, #section-settings");

    settingsSections.forEach((section) => {
      section.remove();
    });
  }

  /* =======================================================
     MODAL
     ======================================================= */

  function openModal(title, content) {
    if (!adminModal) return;

    if (adminModalTitle) {
      adminModalTitle.textContent =
        title || "Окно";
    }

    if (adminModalContent) {
      if (typeof content === "string") {
        adminModalContent.innerHTML = content;
      } else if (content instanceof Node) {
        adminModalContent.innerHTML = "";
        adminModalContent.appendChild(content);
      }
    }

    adminModal.classList.remove("hidden");

    if (adminModalBackdrop) {
      adminModalBackdrop.classList.remove("hidden");
    }

    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (adminModal) {
      adminModal.classList.add("hidden");
    }

    if (adminModalBackdrop) {
      adminModalBackdrop.classList.add("hidden");
    }

    document.body.style.overflow = "";
  }

  window.openAdminModal = openModal;
  window.closeAdminModal = closeModal;

  function setupModal() {
    if (modalClose) {
      modalClose.addEventListener(
        "click",
        closeModal
      );
    }

    if (adminModalBackdrop) {
      adminModalBackdrop.addEventListener(
        "click",
        closeModal
      );
    }

    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          closeModal();
        }
      }
    );
  }

  /* =======================================================
     LOGIN FORM
     ======================================================= */

  function setupLoginForm() {
    if (!loginForm) return;

    loginForm.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const email =
          loginEmail?.value.trim() || "";

        const password =
          loginPassword?.value || "";

        if (!email) {
          showLoginError(
            "Введите электронную почту."
          );
          return;
        }

        if (!password) {
          showLoginError(
            "Введите пароль."
          );
          return;
        }

        await login(email, password);
      }
    );

    [loginEmail, loginPassword]
      .filter(Boolean)
      .forEach((input) => {
        input.addEventListener(
          "input",
          clearLoginError
        );
      });
  }

  /* =======================================================
     LOGOUT
     ======================================================= */

  function setupLogout() {
    const logoutButtons = $$(
      ".logout-item"
    );

    logoutButtons.forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          const confirmed =
            window.confirm(
              "Выйти из админ-панели?"
            );

          if (!confirmed) return;

          await logout();
        }
      );
    });
  }

  /* =======================================================
     DATABASE HELPERS
     ======================================================= */

  async function getTable(
    table,
    options = {}
  ) {
    if (!supabaseClient) {
      throw new Error(
        "Supabase не подключён."
      );
    }

    let query =
      supabaseClient
        .from(table)
        .select(
          options.select || "*"
        );

    if (options.order) {
      query = query.order(
        options.order.column,
        {
          ascending:
            options.order.ascending !== false
        }
      );
    }

    if (options.limit) {
      query = query.limit(
        options.limit
      );
    }

    if (options.eq) {
      Object.entries(options.eq)
        .forEach(([column, value]) => {
          query = query.eq(
            column,
            value
          );
        });
    }

    const result = await query;

    if (result.error) {
      throw result.error;
    }

    return result.data || [];
  }

  async function insertRow(
    table,
    data
  ) {
    if (!supabaseClient) {
      throw new Error(
        "Supabase не подключён."
      );
    }

    const result =
      await supabaseClient
        .from(table)
        .insert(data)
        .select()
        .single();

    if (result.error) {
      throw result.error;
    }

    return result.data;
  }

  async function updateRow(
    table,
    id,
    data
  ) {
    if (!supabaseClient) {
      throw new Error(
        "Supabase не подключён."
      );
    }

    const result =
      await supabaseClient
        .from(table)
        .update(data)
        .eq("id", id)
        .select()
        .single();

    if (result.error) {
      throw result.error;
    }

    return result.data;
  }

  async function deleteRow(
    table,
    id
  ) {
    if (!supabaseClient) {
      throw new Error(
        "Supabase не подключён."
      );
    }

    const result =
      await supabaseClient
        .from(table)
        .delete()
        .eq("id", id);

    if (result.error) {
      throw result.error;
    }

    return true;
  }

  window.adminDB = {
    get: getTable,
    insert: insertRow,
    update: updateRow,
    delete: deleteRow
  };

  /* =======================================================
     STORAGE
     ======================================================= */

  async function uploadFile(
    file,
    folder = "uploads"
  ) {
    if (!supabaseClient) {
      throw new Error(
        "Supabase не подключён."
      );
    }

    if (!file) {
      throw new Error(
        "Файл не выбран."
      );
    }

    const bucket =
      CONFIG.STORAGE_BUCKET ||
      "site-media";

    const safeName =
      file.name
        .replace(
          /[^a-zA-Z0-9а-яА-ЯёЁ._-]/g,
          "_"
        )
        .replace(
          /\s+/g,
          "_"
        );

    const timestamp =
      Date.now();

    const random =
      Math.random()
        .toString(36)
        .slice(2, 8);

    const path =
      `${folder}/${timestamp}_${random}_${safeName}`;

    const result =
      await supabaseClient
        .storage
        .from(bucket)
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

    const publicUrl =
      supabaseClient
        .storage
        .from(bucket)
        .getPublicUrl(path)
        .data
        ?.publicUrl;

    return {
      path,
      url: publicUrl
    };
  }

  window.adminUploadFile =
    uploadFile;

  /* =======================================================
     INITIALIZE ADMIN
     ======================================================= */

  async function initializeAdmin() {
    try {
      removeSettingsButton();

      setupNavigation();
      setupMobileMenu();
      setupModal();
      setupLogout();

      initializeSectionDefaults();

      await loadDashboard();

    } catch (error) {
      console.error(
        "Admin initialization error:",
        error
      );

      /*
       * ВАЖНО:
       * Здесь специально НЕ показываем loader.
       * Даже если таблицы Supabase пока отсутствуют,
       * админка всё равно должна открыться.
       */

      hideLoader();

      toast(
        "Панель открыта. Некоторые данные пока недоступны.",
        "warning"
      );
    }
  }

  /* =======================================================
     DEFAULT SECTION
     ======================================================= */

  function initializeSectionDefaults() {
    const activeSection =
      $(".admin-section.active");

    const activeNav =
      $(".sidebar-item.active");

    if (activeSection && activeNav) {
      return;
    }

    const dashboard =
      $(
        "#dashboard, #section-dashboard"
      );

    if (dashboard) {
      dashboard.classList.add("active");
    }

    const dashboardNav =
      $(
        ".sidebar-item[data-section='dashboard']"
      );

    if (dashboardNav) {
      dashboardNav.classList.add("active");
    }

    updateTopbarTitle(
      "dashboard"
    );
  }

  /* =======================================================
     DASHBOARD
     ======================================================= */

  async function loadDashboard() {
    /*
     * Сейчас dashboard не блокирует запуск админки.
     * Каждая таблица проверяется отдельно.
     */

    const counters = {
      matches: [
        "matches",
        [
          "#dashboardMatches",
          "#matchesCount",
          "[data-count='matches']"
        ]
      ],

      players: [
        "players",
        [
          "#dashboardPlayers",
          "#playersCount",
          "[data-count='players']"
        ]
      ],

      news: [
        "news",
        [
          "#dashboardNews",
          "#newsCount",
          "[data-count='news']"
        ]
      ],

      media: [
        "albums",
        [
          "#dashboardMedia",
          "#mediaCount",
          "[data-count='media']"
        ]
      ]
    };

    for (const key of Object.keys(counters)) {
      const [table, selectors] =
        counters[key];

      try {
        const data =
          await getTable(table);

        updateCounter(
          selectors,
          data.length
        );
      } catch (error) {
        /*
         * Таблицы могут ещё не существовать.
         * Это НЕ должно ломать админку.
         */

        console.warn(
          `Dashboard: table "${table}" unavailable.`,
          error
        );
      }
    }
  }

  function updateCounter(
    selectors,
    value
  ) {
    for (const selector of selectors) {
      const elements =
        $$(selector);

      if (!elements.length) continue;

      elements.forEach(
        (element) => {
          element.textContent =
            String(value);
        }
      );
    }
  }

  /* =======================================================
     FILE PREVIEWS
     ======================================================= */

  function setupImagePreviews() {
    document.addEventListener(
      "change",
      (event) => {
        const input =
          event.target;

        if (
          !(input instanceof
            HTMLInputElement)
        ) {
          return;
        }

        if (
          input.type !== "file"
        ) {
          return;
        }

        const file =
          input.files?.[0];

        if (!file) return;

        if (
          !file.type.startsWith(
            "image/"
          )
        ) {
          return;
        }

        const container =
          input.closest(
            ".form-group, .upload-group, .image-upload"
          );

        if (!container) return;

        const preview =
          $(".image-preview", container);

        if (!preview) return;

        const reader =
          new FileReader();

        reader.onload = () => {
          preview.innerHTML =
            `<img src="${reader.result}" alt="Предпросмотр">`;
        };

        reader.readAsDataURL(file);
      }
    );
  }

  /* =======================================================
     GENERIC DELETE CONFIRMATION
     ======================================================= */

  function setupDeleteButtons() {
    document.addEventListener(
      "click",
      async (event) => {
        const button =
          event.target.closest(
            "[data-delete-table][data-delete-id]"
          );

        if (!button) return;

        const table =
          button.dataset.deleteTable;

        const id =
          button.dataset.deleteId;

        if (!table || !id) return;

        const confirmed =
          window.confirm(
            "Удалить этот объект?"
          );

        if (!confirmed) return;

        try {
          button.disabled = true;

          await deleteRow(
            table,
            id
          );

          toast(
            "Удалено",
            "success"
          );

          /*
           * Перезагрузка страницы здесь
           * безопаснее, чем пытаться
           * угадать структуру конкретного раздела.
           */
          setTimeout(() => {
            window.location.reload();
          }, 400);

        } catch (error) {
          console.error(
            "Delete error:",
            error
          );

          button.disabled = false;

          toast(
            "Не удалось удалить объект.",
            "error"
          );
        }
      }
    );
  }

  /* =======================================================
     ESCAPE HTML
     ======================================================= */

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }

  window.escapeAdminHtml =
    escapeHtml;

  /* =======================================================
     FORM HELPERS
     ======================================================= */

  function formToObject(form) {
    if (!form) return {};

    const formData =
      new FormData(form);

    const result = {};

    formData.forEach(
      (value, key) => {
        if (
          value instanceof File
        ) {
          return;
        }

        result[key] = value;
      }
    );

    return result;
  }

  window.formToAdminObject =
    formToObject;

  /* =======================================================
     DATE HELPERS
     ======================================================= */

  function formatDate(
    value
  ) {
    if (!value) return "—";

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return new Intl.DateTimeFormat(
      "ru-RU",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }
    ).format(date);
  }

  function formatDateTime(
    value
  ) {
    if (!value) return "—";

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return new Intl.DateTimeFormat(
      "ru-RU",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }
    ).format(date);
  }

  window.formatAdminDate =
    formatDate;

  window.formatAdminDateTime =
    formatDateTime;

  /* =======================================================
     GLOBAL EVENTS
     ======================================================= */

  function setupGlobalEvents() {
    setupImagePreviews();
    setupDeleteButtons();

    /*
     * Любая кнопка с data-modal-title
     * может открыть модальное окно.
     */
    document.addEventListener(
      "click",
      (event) => {
        const button =
          event.target.closest(
            "[data-modal-title]"
          );

        if (!button) return;

        const title =
          button.dataset.modalTitle;

        const target =
          button.dataset.modalTarget;

        if (!target) return;

        const source =
          byId(target);

        if (!source) return;

        openModal(
          title,
          source.innerHTML
        );
      }
    );
  }

  /* =======================================================
     START
     ======================================================= */

  async function startAdmin() {
    /*
     * Loader никогда не должен висеть
     * бесконечно.
     */

    showLoader();

    /*
     * Если что-то полностью сломалось,
     * через 8 секунд всё равно покажем
     * экран входа.
     */

    const emergencyTimeout =
      setTimeout(() => {
        console.warn(
          "Admin startup timeout."
        );

        hideLoader();

        if (
          !currentUser &&
          loginScreen
        ) {
          showLogin();
        }
      }, 8000);

    try {
      const initialized =
        initSupabase();

      if (!initialized) {
        clearTimeout(
          emergencyTimeout
        );

        return;
      }

      setupLoginForm();
      setupGlobalEvents();
      setupAuthListener();

      await checkSession();

    } catch (error) {
      console.error(
        "Fatal admin startup error:",
        error
      );

      showLogin();

    } finally {
      clearTimeout(
        emergencyTimeout
      );

      /*
       * Самое важное:
       * loader всегда убирается.
       */
      hideLoader();
    }
  }

  /* =======================================================
     DOM READY
     ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      startAdmin
    );
  } else {
    startAdmin();
  }

})();
