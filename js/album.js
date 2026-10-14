
(() => {
  "use strict";

  const db = window.supabaseClient;
  const BUCKET = window.STORAGE_BUCKET || "site-media";

  const content = document.getElementById("albumContent");
  const lightbox = document.getElementById("albumLightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxCounter = document.getElementById("lightboxCounter");

  let photos = [];
  let currentIndex = 0;

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function imageURL(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;

    return db.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl || "";
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  async function loadSettings() {
    const { data, error } = await db
      .from("site_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error || !data?.length) return;

    const settings = data[0];
    const root = document.documentElement;

    if (settings.primary_color) {
      root.style.setProperty("--primary", settings.primary_color);
    }
    if (settings.accent_color) {
      root.style.setProperty("--accent", settings.accent_color);
    }
    if (settings.gold_color) {
      root.style.setProperty("--gold", settings.gold_color);
    }
    if (settings.white_color) {
      root.style.setProperty("--white", settings.white_color);
    }

    setText("teamName", settings.team_name || "Челны 2011");
    setText("teamSubtitle", settings.subtitle || "хоккейный клуб");
    setText("footerTeamName", settings.team_name || "Челны 2011");
    setText("footerCity", settings.city || "Набережные Челны");

    const logo = imageURL(settings.logo_path);

    ["teamLogo", "footerLogo"].forEach(id => {
      const element = document.getElementById(id);
      if (!element) return;

      if (logo) {
        element.src = logo;
        element.hidden = false;
      } else {
        element.hidden = true;
      }
    });
  }

  function showError(message) {
    content.innerHTML = `
      <div class="album-state">${escapeHTML(message)}</div>
    `;
  }

  async function loadAlbum() {
    const albumId = new URLSearchParams(window.location.search).get("id");

    if (!albumId) {
      showError("Не указан фотоальбом.");
      return;
    }

    const { data: album, error: albumError } = await db
      .from("albums")
      .select("*")
      .eq("id", albumId)
      .maybeSingle();

    if (albumError) {
      console.error("Ошибка загрузки альбома:", albumError);
      showError("Не удалось загрузить фотоальбом.");
      return;
    }

    if (!album) {
      showError("Фотоальбом не найден или был удалён.");
      return;
    }

    const { data: photoRows, error: photosError } = await db
      .from("album_photos")
      .select("*")
      .eq("album_id", albumId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (photosError) {
      console.error("Ошибка загрузки фотографий:", photosError);
      showError("Не удалось загрузить фотографии альбома.");
      return;
    }

    photos = (photoRows || [])
      .map(row => ({
        url: imageURL(row.image_path),
        alt: album.title || "Фото ХК Челны 2011"
      }))
      .filter(photo => photo.url);

    document.title = `${album.title || "Фотоальбом"} — ХК Челны 2011`;

    content.innerHTML = `
      <h1 class="album-page-title">${escapeHTML(album.title || "Фотоальбом")}</h1>
      ${album.album_date
        ? `<div class="album-page-date">${escapeHTML(formatDate(album.album_date))}</div>`
        : ""}
      ${album.cover_path && photos.length === 0
        ? `<p class="album-description">Фотографии пока не добавлены.</p>`
        : ""}
      ${photos.length
        ? `<div class="album-photo-grid">
            ${photos.map((photo, index) => `
              <button class="album-photo-button"
                type="button"
                data-photo-index="${index}"
                aria-label="Открыть фотографию ${index + 1}">
                <img src="${escapeHTML(photo.url)}"
                  alt="${escapeHTML(photo.alt)}"
                  loading="lazy">
              </button>
            `).join("")}
          </div>`
        : `<div class="album-state">В этом альбоме пока нет фотографий.</div>`
      }
    `;

    content.querySelectorAll("[data-photo-index]").forEach(button => {
      button.addEventListener("click", () => {
        openLightbox(Number(button.dataset.photoIndex));
      });
    });
  }

  function openLightbox(index) {
    if (!photos.length) return;

    currentIndex = (index + photos.length) % photos.length;
    updateLightbox();

    lightbox.classList.add("open");
    document.body.classList.add("lightbox-open");
  }

  function closeLightbox() {
    lightbox.classList.remove("open");
    document.body.classList.remove("lightbox-open");
  }

  function updateLightbox() {
    const photo = photos[currentIndex];
    if (!photo) return;

    lightboxImage.src = photo.url;
    lightboxImage.alt = photo.alt;
    lightboxCounter.textContent = `${currentIndex + 1} / ${photos.length}`;
  }

  function previousPhoto() {
    currentIndex = (currentIndex - 1 + photos.length) % photos.length;
    updateLightbox();
  }

  function nextPhoto() {
    currentIndex = (currentIndex + 1) % photos.length;
    updateLightbox();
  }

  document.getElementById("lightboxClose")
    ?.addEventListener("click", closeLightbox);

  document.getElementById("lightboxPrev")
    ?.addEventListener("click", previousPhoto);

  document.getElementById("lightboxNext")
    ?.addEventListener("click", nextPhoto);

  lightbox?.addEventListener("click", event => {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", event => {
    if (!lightbox.classList.contains("open")) return;

    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") previousPhoto();
    if (event.key === "ArrowRight") nextPhoto();
  });

  async function init() {
    if (!db) {
      showError("Нет подключения к базе данных. Проверь js/config.js.");
      return;
    }

    await Promise.allSettled([loadSettings(), loadAlbum()]);
  }

  init();
})();
