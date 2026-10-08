/* =========================================================
   ХК ЧЕЛНЫ 2011
   app.js
   Основной JS публичной части сайта
   ========================================================= */

"use strict";


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let db = null;

let siteSettings = {};
let teams = [];
let matches = [];
let players = [];
let playerStats = [];
let news = [];
let standings = [];
let achievements = [];
let birthdays = [];
let albums = [];
let products = [];

let nextMatch = null;
let lastMatch = null;

let homeInitialized = false;


/* =========================================================
   INIT
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    try {

        db = await initSupabase();

        await loadPublicSite();

    } catch (error) {

        console.error(
            "Ошибка запуска сайта:",
            error
        );

        showPublicError(
            "Не удалось загрузить данные сайта."
        );

    }

});


/* =========================================================
   MAIN LOADER
   ========================================================= */

async function loadPublicSite() {

    showGlobalLoading(true);

    try {

        await loadSettingsData();

        applySiteDesign();

        await Promise.all([
            loadTeams(),
            loadMatches(),
            loadPlayers(),
            loadNews(),
            loadStandings(),
            loadAchievements(),
            loadBirthdays(),
            loadAlbums(),
            loadProducts()
        ]);

        determineMatches();

        renderHeader();

        renderNextMatch();

        renderLastMatch();

        renderRosterPreview();

        renderTopStats();

        renderAchievements();

        renderBirthdays();

        renderNews();

        renderAlbums();

        renderProducts();

        applyHomepageVisibility();

        homeInitialized = true;

    } catch (error) {

        console.error(
            "Ошибка загрузки данных:",
            error
        );

        showPublicError(
            "Не удалось загрузить данные."
        );

    } finally {

        showGlobalLoading(false);

    }

}


/* =========================================================
   SETTINGS
   ========================================================= */

async function loadSettingsData() {

    try {

        siteSettings =
            await loadSettings();

    } catch (error) {

        console.warn(
            "Настройки не загрузились:",
            error
        );

        siteSettings = {};

    }

}


/* =========================================================
   DESIGN
   ========================================================= */

function applySiteDesign() {

    try {

        applySiteColors(
            siteSettings
        );

    } catch (error) {

        console.warn(
            "Не удалось применить цвета:",
            error
        );

    }


    try {

        applySiteFonts(
            siteSettings
        );

    } catch (error) {

        console.warn(
            "Не удалось применить шрифты:",
            error
        );

    }

}


/* =========================================================
   TEAMS
   ========================================================= */

async function loadTeams() {

    try {

        teams =
            await apiRequest(
                "teams",
                {
                    select: "*",
                    order: "name.asc"
                }
            );

        if (!Array.isArray(teams)) {
            teams = [];
        }

    } catch (error) {

        console.warn(
            "Команды не загрузились:",
            error
        );

        teams = [];

    }

}


/* =========================================================
   MATCHES
   ========================================================= */

async function loadMatches() {

    try {

        matches =
            await apiRequest(
                "matches",
                {
                    select: "*",
                    order: "match_date.asc"
                }
            );

        if (!Array.isArray(matches)) {
            matches = [];
        }

    } catch (error) {

        console.warn(
            "Матчи не загрузились:",
            error
        );

        matches = [];

    }

}


/* =========================================================
   PLAYERS
   ========================================================= */

async function loadPlayers() {

    try {

        players =
            await apiRequest(
                "players",
                {
                    select: "*",
                    order: "number.asc"
                }
            );

        if (!Array.isArray(players)) {
            players = [];
        }

    } catch (error) {

        console.warn(
            "Игроки не загрузились:",
            error
        );

        players = [];

    }


    try {

        playerStats =
            await apiRequest(
                "player_season_stats",
                {
                    select: "*"
                }
            );

        if (!Array.isArray(playerStats)) {
            playerStats = [];
        }

    } catch (error) {

        console.warn(
            "Статистика игроков не загрузилась:",
            error
        );

        playerStats = [];

    }

}


/* =========================================================
   NEWS
   ========================================================= */

async function loadNews() {

    try {

        news =
            await apiRequest(
                "news",
                {
                    select: "*",
                    order: "created_at.desc"
                }
            );

        if (!Array.isArray(news)) {
            news = [];
        }

    } catch (error) {

        console.warn(
            "Новости не загрузились:",
            error
        );

        news = [];

    }

}


/* =========================================================
   STANDINGS
   ========================================================= */

async function loadStandings() {

    try {

        standings =
            await apiRequest(
                "standings",
                {
                    select: "*",
                    order: "place.asc"
                }
            );

        if (!Array.isArray(standings)) {
            standings = [];
        }

    } catch (error) {

        console.warn(
            "Таблица не загрузилась:",
            error
        );

        standings = [];

    }

}


/* =========================================================
   ACHIEVEMENTS
   ========================================================= */

async function loadAchievements() {

    try {

        achievements =
            await apiRequest(
                "achievements",
                {
                    select: "*",
                    order: "year.desc"
                }
            );

        if (!Array.isArray(achievements)) {
            achievements = [];
        }

    } catch (error) {

        console.warn(
            "Достижения не загрузились:",
            error
        );

        achievements = [];

    }

}


/* =========================================================
   BIRTHDAYS
   ========================================================= */

async function loadBirthdays() {

    try {

        birthdays =
            await apiRequest(
                "birthdays",
                {
                    select: "*"
                }
            );

        if (!Array.isArray(birthdays)) {
            birthdays = [];
        }

    } catch (error) {

        console.warn(
            "Дни рождения не загрузились:",
            error
        );

        birthdays = [];

    }

}


/* =========================================================
   ALBUMS
   ========================================================= */

async function loadAlbums() {

    try {

        albums =
            await apiRequest(
                "albums",
                {
                    select: "*",
                    order: "created_at.desc"
                }
            );

        if (!Array.isArray(albums)) {
            albums = [];
        }

    } catch (error) {

        console.warn(
            "Альбомы не загрузились:",
            error
        );

        albums = [];

    }

}


/* =========================================================
   PRODUCTS
   ========================================================= */

async function loadProducts() {

    try {

        products =
            await apiRequest(
                "products",
                {
                    select: "*",
                    order: "created_at.desc"
                }
            );

        if (!Array.isArray(products)) {
            products = [];
        }

    } catch (error) {

        console.warn(
            "Товары не загрузились:",
            error
        );

        products = [];

    }

}


/* =========================================================
   MATCH DETECTION
   ========================================================= */

function determineMatches() {

    const now =
        new Date();

    const normalized =
        matches
            .map(match => {

                const date =
                    getMatchDateTime(match);

                return {
                    ...match,
                    _date: date
                };

            })
            .filter(match =>
                match._date &&
                !Number.isNaN(
                    match._date.getTime()
                )
            )
            .sort(
                (a, b) =>
                    a._date.getTime() -
                    b._date.getTime()
            );


    /*
     * Ближайший матч:
     * только будущий или текущий.
     */

    nextMatch =
        normalized.find(
            match =>
                match._date.getTime() >=
                now.getTime()
        ) || null;


    /*
     * Последний сыгранный матч:
     * именно последний по дате,
     * а не последний добавленный админом.
     */

    const played =
        normalized
            .filter(
                match =>
                    match._date.getTime() <
                    now.getTime()
            );


    lastMatch =
        played.length
            ? played[played.length - 1]
            : null;


    window.nextMatchId =
        nextMatch
            ? nextMatch.id
            : null;


    window.lastMatchId =
        lastMatch
            ? lastMatch.id
            : null;


    window.nextMatchStream =
        nextMatch
            ? (
                nextMatch.stream_url ||
                nextMatch.broadcast_url ||
                nextMatch.broadcast ||
                ""
            )
            : "";

}


/* =========================================================
   MATCH DATE
   ========================================================= */

function getMatchDateTime(match) {

    if (!match) {
        return null;
    }


    /*
     * Вариант 1:
     * timestamp / datetime
     */

    const direct =
        match.match_datetime ||
        match.datetime ||
        match.start_at ||
        match.start_time;


    if (direct) {

        const date =
            new Date(direct);

        if (!Number.isNaN(date.getTime())) {
            return date;
        }

    }


    /*
     * Вариант 2:
     * отдельные дата + время
     */

    const dateValue =
        match.match_date ||
        match.date;


    if (!dateValue) {
        return null;
    }


    const timeValue =
        match.match_time ||
        match.time ||
        "00:00";


    const date =
        new Date(
            `${dateValue}T${timeValue}`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }


    return date;

}


/* =========================================================
   TEAM HELPERS
   ========================================================= */

function findTeam(teamId) {

    if (
        teamId === null ||
        teamId === undefined
    ) {
        return null;
    }


    return teams.find(
        team =>
            String(team.id) ===
            String(teamId)
    ) || null;

}


function getTeamName(teamId) {

    const team =
        findTeam(teamId);

    if (!team) {
        return "—";
    }


    return (
        team.name ||
        team.title ||
        team.short_name ||
        "—"
    );

}


function getTeamLogo(teamId) {

    const team =
        findTeam(teamId);

    if (!team) {
        return "";
    }


    return (
        team.logo_url ||
        team.image_url ||
        team.logo ||
        team.icon_url ||
        ""
    );

}


/* =========================================================
   MATCH HELPERS
   ========================================================= */

function getHomeTeamId(match) {

    return (
        match.home_team_id ??
        match.home_id ??
        match.team_home_id
    );

}


function getAwayTeamId(match) {

    return (
        match.away_team_id ??
        match.away_id ??
        match.team_away_id
    );

}


function getHomeTeamName(match) {

    if (
        match.home_team_name ||
        match.home_name
    ) {

        return (
            match.home_team_name ||
            match.home_name
        );

    }


    return getTeamName(
        getHomeTeamId(match)
    );

}


function getAwayTeamName(match) {

    if (
        match.away_team_name ||
        match.away_name
    ) {

        return (
            match.away_team_name ||
            match.away_name
        );

    }


    return getTeamName(
        getAwayTeamId(match)
    );

}


function getHomeLogo(match) {

    return (
        match.home_logo_url ||
        getTeamLogo(
            getHomeTeamId(match)
        )
    );

}


function getAwayLogo(match) {

    return (
        match.away_logo_url ||
        getTeamLogo(
            getAwayTeamId(match)
        )
    );

}


/* =========================================================
   HEADER
   ========================================================= */

function renderHeader() {

    const logo =
        siteSettings.logo_url ||
        siteSettings.logo ||
        siteSettings.team_logo ||
        "";


    const teamName =
        siteSettings.team_name ||
        siteSettings.site_title ||
        DEFAULT_TEAM_NAME;


    const logoElement =
        document.getElementById(
            "headerLogo"
        );


    if (logoElement) {

        if (logo) {

            logoElement.src =
                getStorageUrl(logo);

            logoElement.style.display =
                "block";

        } else {

            logoElement.style.display =
                "none";

        }

    }


    const nameElement =
        document.getElementById(
            "headerTeamName"
        );


    if (nameElement) {

        nameElement.textContent =
            teamName;

    }


    document.title =
        teamName;

}


/* =========================================================
   NEXT MATCH
   ========================================================= */

function renderNextMatch() {

    const section =
        document.getElementById(
            "nextMatchSection"
        );


    if (!section) {
        return;
    }


    if (!nextMatch) {

        section.classList.add(
            "hidden"
        );

        return;

    }


    section.classList.remove(
        "hidden"
    );


    const date =
        getMatchDateTime(
            nextMatch
        );


    const tournament =
        nextMatch.tournament ||
        nextMatch.competition ||
        nextMatch.championship ||
        "";


    const venue =
        nextMatch.venue ||
        nextMatch.arena ||
        nextMatch.location ||
        "";


    setText(
        "nextMatchTournament",
        tournament || "Матч"
    );


    setText(
        "nextMatchDate",
        formatMatchDate(date)
    );


    setText(
        "nextMatchTime",
        formatTime(date)
    );


    setText(
        "nextHomeName",
        getHomeTeamName(nextMatch)
    );


    setText(
        "nextAwayName",
        getAwayTeamName(nextMatch)
    );


    setText(
        "nextMatchVenue",
        venue || "Место проведения уточняется"
    );


    setTeamLogo(
        "nextHomeLogo",
        getHomeLogo(nextMatch),
        getHomeTeamName(nextMatch)
    );


    setTeamLogo(
        "nextAwayLogo",
        getAwayLogo(nextMatch),
        getAwayTeamName(nextMatch)
    );


    const stream =
        nextMatch.stream_url ||
        nextMatch.broadcast_url ||
        nextMatch.broadcast ||
        "";


    window.nextMatchStream =
        stream;


    const streamButton =
        document.getElementById(
            "nextStreamButton"
        );


    if (streamButton) {

        streamButton.classList.toggle(
            "hidden",
            !stream
        );

    }


    /*
     * Матч Дэй:
     * только в день матча.
     */

    const matchday =
        isSameDay(
            new Date(),
            date
        );


    const badge =
        document.getElementById(
            "matchdayBadge"
        );


    if (badge) {

        badge.classList.toggle(
            "hidden",
            !matchday
        );

    }


    /*
     * Состав появляется
     * за час до матча.
     */

    const lineupButton =
        document.getElementById(
            "lineupButton"
        );


    if (lineupButton) {

        const oneHour =
            60 * 60 * 1000;

        const difference =
            date.getTime() -
            Date.now();


        lineupButton.classList.toggle(
            "hidden",
            !(
                difference <= oneHour &&
                difference >= -oneHour
            )
        );

    }


    /*
     * Запускаем обратный отсчёт.
     */

    if (
        typeof startHomeCountdown ===
        "function"
    ) {

        startHomeCountdown(
            date.toISOString()
        );

    }

}


/* =========================================================
   LAST MATCH
   ========================================================= */

function renderLastMatch() {

    const section =
        document.getElementById(
            "lastMatchSection"
        );


    if (!section) {
        return;
    }


    if (!lastMatch) {

        section.classList.add(
            "hidden"
        );

        return;

    }


    section.classList.remove(
        "hidden"
    );


    const home =
        getHomeTeamName(
            lastMatch
        );


    const away =
        getAwayTeamName(
            lastMatch
        );


    const homeScore =
        getScore(
            lastMatch,
            "home"
        );


    const awayScore =
        getScore(
            lastMatch,
            "away"
        );


    setText(
        "lastHomeName",
        home
    );


    setText(
        "lastAwayName",
        away
    );


    setText(
        "lastScore",
        `${homeScore} : ${awayScore}`
    );


    setText(
        "lastMatchTournament",
        lastMatch.tournament ||
        lastMatch.competition ||
        "Матч"
    );


    const date =
        getMatchDateTime(
            lastMatch
        );


    setText(
        "lastMatchDate",
        formatMatchDate(date)
    );


    const image =
        lastMatch.image_url ||
        lastMatch.photo_url ||
        lastMatch.cover_url ||
        "";


    const imageElement =
        document.getElementById(
            "lastMatchImage"
        );


    const fallback =
        document.getElementById(
            "lastMatchImageFallback"
        );


    if (imageElement) {

        if (image) {

            imageElement.src =
                getStorageUrl(image);

            imageElement.classList.remove(
                "hidden"
            );

            if (fallback) {
                fallback.classList.add(
                    "hidden"
                );
            }

        } else {

            imageElement.classList.add(
                "hidden"
            );

            if (fallback) {
                fallback.classList.remove(
                    "hidden"
                );
            }

        }

    }

}


/* =========================================================
   SCORE
   ========================================================= */

function getScore(match, side) {

    const variants =
        side === "home"
            ? [
                "home_score",
                "score_home",
                "home_goals"
            ]
            : [
                "away_score",
                "score_away",
                "away_goals"
            ];


    for (const key of variants) {

        if (
            match[key] !== undefined &&
            match[key] !== null
        ) {

            return Number(
                match[key]
            ) || 0;

        }

    }


    return 0;

}


/* =========================================================
   ROSTER PREVIEW
   ========================================================= */

function renderRosterPreview() {

    const container =
        document.getElementById(
            "rosterPreview"
        );


    if (!container) {
        return;
    }


    if (!players.length) {

        container.innerHTML =
            emptyState(
                "Состав пока не заполнен."
            );

        return;

    }


    const preview =
        players
            .slice()
            .sort(
                sortPlayers
            )
            .slice(0, 6);


    container.innerHTML =
        preview
            .map(
                player =>
                    renderPlayerCard(
                        player
                    )
            )
            .join("");


    container
        .querySelectorAll(
            "[data-player-id]"
        )
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    const id =
                        card.dataset.playerId;

                    const player =
                        players.find(
                            item =>
                                String(item.id) ===
                                String(id)
                        );

                    if (
                        typeof openPlayerModal ===
                        "function"
                    ) {

                        openPlayerModal(
                            player
                        );

                    }

                }
            );

        });

}


/* =========================================================
   PLAYER SORT
   ========================================================= */

function sortPlayers(a, b) {

    const positionOrder = {
        "Вратарь": 1,
        "Вратари": 1,
        "Защитник": 2,
        "Защитники": 2,
        "Нападающий": 3,
        "Нападающие": 3
    };


    const aPosition =
        positionOrder[
            a.position
        ] || 9;


    const bPosition =
        positionOrder[
            b.position
        ] || 9;


    if (
        aPosition !==
        bPosition
    ) {

        return (
            aPosition -
            bPosition
        );

    }


    return (
        Number(a.number || 999) -
        Number(b.number || 999)
    );

}


/* =========================================================
   PLAYER CARD
   ========================================================= */

function renderPlayerCard(player) {

    const id =
        player.id;


    const number =
        player.number ??
        "";


    const name =
        player.full_name ||
        player.name ||
        "Игрок";


    const position =
        player.position ||
        player.role ||
        "";


    const photo =
        player.photo_url ||
        player.image_url ||
        player.avatar_url ||
        "";


    const image =
        photo
            ? `
                <img
                    src="${escapeHTML(
                        getStorageUrl(photo)
                    )}"
                    alt="${escapeHTML(name)}"
                    class="player-card-image"
                    loading="lazy"
                >
            `
            : `
                <div class="player-card-placeholder">
                    ${escapeHTML(
                        String(number)
                    )}
                </div>
            `;


    const captain =
        player.captain
            ? `<span class="player-card-badge">C</span>`
            : "";


    const assistant =
        player.assistant
            ? `<span class="player-card-badge">A</span>`
            : "";


    return `

        <article
            class="player-card"
            data-player-id="${escapeHTML(
                String(id)
            )}"
        >

            <div class="player-card-photo">

                ${image}

                <div class="player-card-number">
                    #${escapeHTML(
                        String(number)
                    )}
                </div>

                <div class="player-card-badges">
                    ${captain}
                    ${assistant}
                </div>

            </div>


            <div class="player-card-info">

                <div class="player-card-name">
                    ${escapeHTML(name)}
                </div>

                ${
                    position
                    ? `
                        <div class="player-card-position">
                            ${escapeHTML(position)}
                        </div>
                    `
                    : ""
                }

            </div>

        </article>

    `;

}


/* =========================================================
   TOP STATS
   ========================================================= */

function renderTopStats() {

    const statsSection =
        document.getElementById(
            "topStatsSection"
        );


    if (!statsSection) {
        return;
    }


    const stats =
        players.map(player => {

            const stat =
                getPlayerStat(
                    player.id
                );


            return {
                player,
                games: Number(
                    stat?.games || 0
                ),
                goals: Number(
                    stat?.goals || 0
                ),
                assists: Number(
                    stat?.assists || 0
                ),
                points: Number(
                    stat?.points ??
                    (
                        Number(
                            stat?.goals || 0
                        ) +
                        Number(
                            stat?.assists || 0
                        )
                    )
                ),
                plusMinus: Number(
                    stat?.plus_minus || 0
                )
            };

        });


    const scorers =
        stats
            .slice()
            .sort(
                (a, b) =>
                    b.points -
                    a.points
            )
            .slice(0, 3);


    const snipers =
        stats
            .slice()
            .sort(
                (a, b) =>
                    b.goals -
                    a.goals
            )
            .slice(0, 3);


    const plusMinus =
        stats
            .slice()
            .sort(
                (a, b) =>
                    b.plusMinus -
                    a.plusMinus
            )
            .slice(0, 3);


    const defenders =
        stats
            .filter(
                item =>
                    isDefender(
                        item.player
                    )
            )
            .sort(
                (a, b) =>
                    b.points -
                    a.points
            )
            .slice(0, 3);


    renderTopPlayerList(
        "scorersList",
        scorers,
        "points"
    );


    renderTopPlayerList(
        "snipersList",
        snipers,
        "goals"
    );


    renderTopPlayerList(
        "plusMinusList",
        plusMinus,
        "plusMinus"
    );


    renderTopPlayerList(
        "defendersList",
        defenders,
        "points"
    );


    if (!stats.length) {

        statsSection.classList.add(
            "hidden"
        );

    } else {

        statsSection.classList.remove(
            "hidden"
        );

    }

}


/* =========================================================
   PLAYER STAT
   ========================================================= */

function getPlayerStat(playerId) {

    return playerStats.find(
        stat =>
            String(stat.player_id) ===
            String(playerId)
    ) || null;

}


/* =========================================================
   DEFENDER
   ========================================================= */

function isDefender(player) {

    const position =
        String(
            player.position ||
            player.role ||
            ""
        ).toLowerCase();


    return (
        position.includes("защит") ||
        position.includes("def")
    );

}


/* =========================================================
   TOP PLAYER LIST
   ========================================================= */

function renderTopPlayerList(
    containerId,
    list,
    valueType
) {

    const container =
        document.getElementById(
            containerId
        );


    if (!container) {
        return;
    }


    if (!list.length) {

        container.innerHTML =
            emptyState(
                "Статистика пока не заполнена."
            );

        return;

    }


    container.innerHTML =
        list
            .map(
                (item, index) =>
                    renderTopPlayer(
                        item,
                        index,
                        valueType
                    )
            )
            .join("");

}


/* =========================================================
   TOP PLAYER
   ========================================================= */

function renderTopPlayer(
    item,
    index,
    valueType
) {

    const player =
        item.player;


    const number =
        player.number ??
        "";


    const name =
        player.full_name ||
        player.name ||
        "Игрок";


    const photo =
        player.photo_url ||
        player.image_url ||
        player.avatar_url ||
        "";


    const value =
        valueType === "goals"
            ? item.goals
            : valueType === "plusMinus"
                ? (
                    item.plusMinus > 0
                        ? `+${item.plusMinus}`
                        : item.plusMinus
                )
                : item.points;


    const image =
        photo
            ? `
                <img
                    src="${escapeHTML(
                        getStorageUrl(photo)
                    )}"
                    alt=""
                >
            `
            : `
                <span class="top-player-placeholder">
                    ${escapeHTML(
                        String(number)
                    )}
                </span>
            `;


    return `

        <div class="top-player">

            <div class="top-player-rank">
                ${index + 1}
            </div>

            <div class="top-player-image">
                ${image}
            </div>

            <div class="top-player-info">

                <strong>
                    ${escapeHTML(name)}
                </strong>

                <span>
                    #${escapeHTML(
                        String(number)
                    )}
                </span>

            </div>

            <div class="top-player-value">
                ${escapeHTML(
                    String(value)
                )}
            </div>

        </div>

    `;

}


/* =========================================================
   ACHIEVEMENTS
   ========================================================= */

function renderAchievements() {

    const container =
        document.getElementById(
            "achievementsList"
        );


    const section =
        document.getElementById(
            "achievementsSection"
        );


    if (!container) {
        return;
    }


    if (!achievements.length) {

        if (section) {
            section.classList.add(
                "hidden"
            );
        }

        return;

    }


    if (section) {
        section.classList.remove(
            "hidden"
        );
    }


    container.innerHTML =
        achievements
            .map(
                achievement =>
                    renderAchievement(
                        achievement
                    )
            )
            .join("");

}


/* =========================================================
   ACHIEVEMENT CARD
   ========================================================= */

function renderAchievement(
    achievement
) {

    const title =
        achievement.title ||
        achievement.name ||
        "Достижение";


    const year =
        achievement.year ||
        achievement.date ||
        "";


    const description =
        achievement.description ||
        achievement.text ||
        "";


    return `

        <article class="achievement-card">

            <div class="achievement-year">
                ${escapeHTML(
                    String(year)
                )}
            </div>

            <div class="achievement-content">

                <h3>
                    ${escapeHTML(title)}
                </h3>

                ${
                    description
                    ? `
                        <p>
                            ${escapeHTML(
                                description
                            )}
                        </p>
                    `
                    : ""
                }

            </div>

        </article>

    `;

}


/* =========================================================
   BIRTHDAYS
   ========================================================= */

function renderBirthdays() {

    const container =
        document.getElementById(
            "birthdaysList"
        );


    const section =
        document.getElementById(
            "birthdaysSection"
        );


    if (!container) {
        return;
    }


    const today =
        new Date();


    const todayBirthdays =
        birthdays.filter(
            birthday =>
                isBirthdayToday(
                    birthday,
                    today
                )
        );


    if (!todayBirthdays.length) {

        if (section) {
            section.classList.add(
                "hidden"
            );
        }

        return;

    }


    if (section) {
        section.classList.remove(
            "hidden"
        );
    }


    container.innerHTML =
        todayBirthdays
            .map(
                birthday =>
                    renderBirthday(
                        birthday
                    )
            )
            .join("");

}


/* =========================================================
   BIRTHDAY CHECK
   ========================================================= */

function isBirthdayToday(
    birthday,
    today
) {

    const value =
        birthday.birth_date ||
        birthday.date ||
        birthday.birthday;


    if (!value) {
        return false;
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return false;
    }


    return (
        date.getDate() ===
        today.getDate() &&
        date.getMonth() ===
        today.getMonth()
    );

}


/* =========================================================
   BIRTHDAY CARD
   ========================================================= */

function renderBirthday(
    birthday
) {

    const name =
        birthday.full_name ||
        birthday.name ||
        "Игрок";


    const number =
        birthday.number ??
        "";


    const photo =
        birthday.photo_url ||
        birthday.image_url ||
        "";


    return `

        <article class="birthday-card">

            <div class="birthday-photo">

                ${
                    photo
                    ? `
                        <img
                            src="${escapeHTML(
                                getStorageUrl(photo)
                            )}"
                            alt=""
                        >
                    `
                    : `
                        <span>
                            ${escapeHTML(
                                String(number)
                            )}
                        </span>
                    `
                }

            </div>

            <div class="birthday-content">

                <span>
                    Сегодня день рождения
                </span>

                <strong>
                    ${escapeHTML(name)}
                </strong>

            </div>

        </article>

    `;

}


/* =========================================================
   NEWS
   ========================================================= */

function renderNews() {

    const container =
        document.getElementById(
            "homeNewsList"
        );


    const section =
        document.getElementById(
            "newsSection"
        );


    if (!container) {
        return;
    }


    if (!news.length) {

        if (section) {
            section.classList.add(
                "hidden"
            );
        }

        return;

    }


    if (section) {
        section.classList.remove(
            "hidden"
        );
    }


    const latest =
        news
            .slice()
            .sort(
                sortNews
            )
            .slice(0, 3);


    container.innerHTML =
        latest
            .map(
                article =>
                    renderNewsCard(
                        article
                    )
            )
            .join("");

}


/* =========================================================
   NEWS SORT
   ========================================================= */

function sortNews(a, b) {

    const aDate =
        new Date(
            a.published_at ||
            a.created_at ||
            a.date ||
            0
        );


    const bDate =
        new Date(
            b.published_at ||
            b.created_at ||
            b.date ||
            0
        );


    return (
        bDate.getTime() -
        aDate.getTime()
    );

}


/* =========================================================
   NEWS CARD
   ========================================================= */

function renderNewsCard(
    article
) {

    const id =
        article.id;


    const title =
        article.title ||
        article.name ||
        "Новость";


    const description =
        article.description ||
        article.excerpt ||
        article.preview ||
        "";


    const image =
        article.image_url ||
        article.photo_url ||
        article.cover_url ||
        "";


    const tag =
        article.tag ||
        article.category ||
        "НОВОСТИ";


    const date =
        article.published_at ||
        article.created_at ||
        article.date;


    return `

        <article
            class="news-card"
            onclick="openNews(${escapeHTML(
                JSON.stringify(id)
            )})"
        >

            <div class="news-card-image-wrap">

                ${
                    image
                    ? `
                        <img
                            src="${escapeHTML(
                                getStorageUrl(image)
                            )}"
                            class="news-card-image"
                            alt=""
                            loading="lazy"
                        >
                    `
                    : `
                        <div class="news-card-placeholder">
                            ХК ЧЕЛНЫ 2011
                        </div>
                    `
                }


                <span class="news-card-tag">
                    ${escapeHTML(
                        String(tag)
                    )}
                </span>

            </div>


            <div class="news-card-content">

                <div class="news-card-date">
                    ${escapeHTML(
                        formatDate(
                            date
                        )
                    )}
                </div>

                <h3>
                    ${escapeHTML(title)}
                </h3>

                ${
                    description
                    ? `
                        <p>
                            ${escapeHTML(
                                truncate(
                                    description,
                                    120
                                )
                            )}
                        </p>
                    `
                    : ""
                }

            </div>

        </article>

    `;

}


/* =========================================================
   OPEN NEWS
   ========================================================= */

function openNews(id) {

    if (!id) {
        return;
    }


    window.location.href =
        "news.html?id=" +
        encodeURIComponent(id);

}


/* =========================================================
   ALBUMS
   ========================================================= */

function renderAlbums() {

    const container =
        document.getElementById(
            "mediaAlbums"
        );


    const section =
        document.getElementById(
            "mediaSection"
        );


    if (!container) {
        return;
    }


    if (!albums.length) {

        if (section) {
            section.classList.add(
                "hidden"
            );
        }

        return;

    }


    if (section) {
        section.classList.remove(
            "hidden"
        );
    }


    container.innerHTML =
        albums
            .slice(0, 4)
            .map(
                album =>
                    renderAlbum(
                        album
                    )
            )
            .join("");

}


/* =========================================================
   ALBUM
   ========================================================= */

function renderAlbum(album) {

    const title =
        album.title ||
        album.name ||
        "Альбом";


    const description =
        album.description ||
        "";


    const image =
        album.cover_url ||
        album.image_url ||
        album.photo_url ||
        "";


    return `

        <article class="media-card">

            <div class="media-card-image">

                ${
                    image
                    ? `
                        <img
                            src="${escapeHTML(
                                getStorageUrl(image)
                            )}"
                            alt=""
                            loading="lazy"
                        >
                    `
                    : `
                        <div class="media-card-placeholder">
                            ФОТО
                        </div>
                    `
                }

            </div>


            <div class="media-card-content">

                <h3>
                    ${escapeHTML(title)}
                </h3>

                ${
                    description
                    ? `
                        <p>
                            ${escapeHTML(
                                truncate(
                                    description,
                                    80
                                )
                            )}
                        </p>
                    `
                    : ""
                }

            </div>

        </article>

    `;

}


/* =========================================================
   PRODUCTS
   ========================================================= */

function renderProducts() {

    const container =
        document.getElementById(
            "productsList"
        );


    const section =
        document.getElementById(
            "productsSection"
        );


    if (!container) {
        return;
    }


    if (!products.length) {

        if (section) {
            section.classList.add(
                "hidden"
            );
        }

        return;

    }


    if (section) {
        section.classList.remove(
            "hidden"
        );
    }


    container.innerHTML =
        products
            .slice(0, 6)
            .map(
                product =>
                    renderProduct(
                        product
                    )
            )
            .join("");

}


/* =========================================================
   PRODUCT
   ========================================================= */

function renderProduct(product) {

    const name =
        product.name ||
        product.title ||
        "Товар";


    const description =
        product.description ||
        "";


    const image =
        product.image_url ||
        product.photo_url ||
        product.cover_url ||
        "";


    const price =
        product.price;


    return `

        <article class="product-card">

            <div class="product-card-image">

                ${
                    image
                    ? `
                        <img
                            src="${escapeHTML(
                                getStorageUrl(image)
                            )}"
                            alt=""
                            loading="lazy"
                        >
                    `
                    : `
                        <div class="product-card-placeholder">
                            ЧЕЛНЫ 2011
                        </div>
                    `
                }

            </div>


            <div class="product-card-content">

                <h3>
                    ${escapeHTML(name)}
                </h3>

                ${
                    description
                    ? `
                        <p>
                            ${escapeHTML(
                                truncate(
                                    description,
                                    70
                                )
                            )}
                        </p>
                    `
                    : ""
                }


                ${
                    price !== undefined &&
                    price !== null
                    ? `
                        <strong class="product-price">
                            ${escapeHTML(
                                formatPrice(price)
                            )}
                        </strong>
                    `
                    : ""
                }

            </div>

        </article>

    `;

}


/* =========================================================
   HOMEPAGE VISIBILITY
   ========================================================= */

function applyHomepageVisibility() {

    /*
     * Админ сможет задавать:
     *
     * show_match
     * show_last_match
     * show_roster
     * show_stats
     * show_achievements
     * show_birthdays
     * show_news
     * show_media
     * show_products
     */

    const visibilityMap = {

        nextMatchSection:
            getBooleanSetting(
                "show_match",
                true
            ),

        lastMatchSection:
            getBooleanSetting(
                "show_last_match",
                true
            ),

        rosterPreviewSection:
            getBooleanSetting(
                "show_roster",
                true
            ),

        topStatsSection:
            getBooleanSetting(
                "show_stats",
                true
            ),

        achievementsSection:
            getBooleanSetting(
                "show_achievements",
                true
            ),

        birthdaysSection:
            getBooleanSetting(
                "show_birthdays",
                true
            ),

        newsSection:
            getBooleanSetting(
                "show_news",
                true
            ),

        mediaSection:
            getBooleanSetting(
                "show_media",
                true
            ),

        productsSection:
            getBooleanSetting(
                "show_products",
                true
            )

    };


    Object.entries(
        visibilityMap
    ).forEach(
        ([id, visible]) => {

            const element =
                document.getElementById(
                    id
                );

            if (!element) {
                return;
            }

            element.classList.toggle(
                "hidden",
                !visible
            );

        }
    );

}


/* =========================================================
   BOOLEAN SETTING
   ========================================================= */

function getBooleanSetting(
    key,
    defaultValue
) {

    const value =
        siteSettings[key];


    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return defaultValue;

    }


    if (
        typeof value ===
        "boolean"
    ) {

        return value;

    }


    return [
        "true",
        "1",
        "yes",
        "on"
    ].includes(
        String(
            value
        ).toLowerCase()
    );

}


/* =========================================================
   HELPERS
   ========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.textContent =
        value ??
        "";

}


/* =========================================================
   TEAM LOGO
   ========================================================= */

function setTeamLogo(
    id,
    image,
    fallbackText
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    if (image) {

        element.innerHTML = `

            <img
                src="${escapeHTML(
                    getStorageUrl(image)
                )}"
                alt="${escapeHTML(
                    fallbackText
                )}"
            >

        `;

    } else {

        element.innerHTML = `

            <span>
                ${escapeHTML(
                    getInitials(
                        fallbackText
                    )
                )}
            </span>

        `;

    }

}


/* =========================================================
   INITIALS
   ========================================================= */

function getInitials(
    value
) {

    if (!value) {
        return "Х";
    }


    return String(value)
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(
            word =>
                word
                    .charAt(0)
                    .toUpperCase()
        )
        .join("");

}


/* =========================================================
   DATE FORMAT
   ========================================================= */

function formatMatchDate(
    date
) {

    if (!date) {
        return "—";
    }


    const formatter =
        new Intl.DateTimeFormat(
            "ru-RU",
            {
                weekday: "long",
                day: "numeric",
                month: "long"
            }
        );


    const result =
        formatter.format(date);


    return capitalize(
        result
    );

}


/* =========================================================
   SAME DAY
   ========================================================= */

function isSameDay(
    first,
    second
) {

    if (!first || !second) {
        return false;
    }


    return (
        first.getFullYear() ===
        second.getFullYear() &&

        first.getMonth() ===
        second.getMonth() &&

        first.getDate() ===
        second.getDate()
    );

}


/* =========================================================
   FORMAT PRICE
   ========================================================= */

function formatPrice(
    value
) {

    const number =
        Number(value);


    if (
        Number.isNaN(
            number
        )
    ) {

        return String(value);

    }


    return (
        new Intl.NumberFormat(
            "ru-RU"
        ).format(number) +
        " ₽"
    );

}


/* =========================================================
   TRUNCATE
   ========================================================= */

function truncate(
    text,
    length
) {

    const value =
        String(
            text || ""
        );


    if (
        value.length <=
        length
    ) {

        return value;

    }


    return (
        value.slice(
            0,
            length
        ).trim() +
        "…"
    );

}


/* =========================================================
   CAPITALIZE
   ========================================================= */

function capitalize(
    text
) {

    if (!text) {
        return "";
    }


    return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
    );

}


/* =========================================================
   EMPTY STATE
   ========================================================= */

function emptyState(
    text
) {

    return `

        <div class="empty-state">

            <div class="empty-state-icon">
                —
            </div>

            <div class="empty-state-text">
                ${escapeHTML(text)}
            </div>

        </div>

    `;

}


/* =========================================================
   GLOBAL LOADING
   ========================================================= */

function showGlobalLoading(
    visible
) {

    const element =
        document.getElementById(
            "globalLoading"
        );


    if (!element) {
        return;
    }


    element.classList.toggle(
        "hidden",
        !visible
    );

}


/* =========================================================
   ERROR
   ========================================================= */

function showPublicError(
    message
) {

    console.error(
        message
    );


    const containers = [
        "homeNewsList",
        "rosterPreview",
        "achievementsList",
        "birthdaysList",
        "mediaAlbums",
        "productsList"
    ];


    containers.forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );

            if (!element) {
                return;
            }

            element.innerHTML =
                emptyState(
                    message
                );

        }
    );

}


/* =========================================================
   REFRESH
   ========================================================= */

async function refreshPublicSite() {

    await loadPublicSite();

}


/* =========================================================
   GLOBAL API
   ========================================================= */

window.HKApp = {

    refresh:
        refreshPublicSite,

    getMatches:
        () => matches,

    getPlayers:
        () => players,

    getNews:
        () => news,

    getTeams:
        () => teams,

    getStandings:
        () => standings,

    getNextMatch:
        () => nextMatch,

    getLastMatch:
        () => lastMatch,

    getSettings:
        () => siteSettings

};


/* =========================================================
   PERIODIC REFRESH
   ========================================================= */

setInterval(
    async () => {

        if (
            document.hidden
        ) {
            return;
        }


        try {

            await loadMatches();

            determineMatches();

            renderNextMatch();

            renderLastMatch();

        } catch (error) {

            console.warn(
                "Автообновление не удалось:",
                error
            );

        }

    },
    60 * 1000
);


/* =========================================================
   ESC KEY
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {
            return;
        }


        if (
            typeof closeMoreMenu ===
            "function"
        ) {

            closeMoreMenu();

        }


        if (
            typeof closePlayerModal ===
            "function"
        ) {

            closePlayerModal();

        }

    }
);
