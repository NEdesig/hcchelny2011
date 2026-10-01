<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">

<title>ХК Челны 2011</title>

<style>
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: Arial, Helvetica, sans-serif;
    background: #050b18;
    color: white;
    padding-bottom: 85px;
}

/* HEADER */

.header {
    background: #07152d;
    padding: 22px 18px 18px;
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 1px solid #18345f;
}

.header-top {
    display: flex;
    align-items: center;
    gap: 14px;
}

.logo {
    width: 55px;
    height: 55px;
    border-radius: 50%;
    background: white;
    object-fit: contain;
}

.club-name {
    font-size: 22px;
    font-weight: 800;
}

.club-city {
    color: #9caac0;
    font-size: 14px;
    margin-top: 3px;
}

/* CONTENT */

main {
    padding: 18px;
    max-width: 700px;
    margin: auto;
}

.page {
    display: none;
}

.page.active {
    display: block;
}

/* HERO */

.hero {
    background: linear-gradient(145deg, #0b2450, #07152d);
    border: 1px solid #173b70;
    border-radius: 24px;
    padding: 25px 20px;
    margin-bottom: 18px;
    overflow: hidden;
}

.hero-label {
    color: #58a6ff;
    font-size: 13px;
    font-weight: bold;
    text-transform: uppercase;
    margin-bottom: 8px;
}

.hero h1 {
    font-size: 34px;
    line-height: 1.05;
    margin-bottom: 12px;
}

.hero p {
    color: #aebbd0;
    line-height: 1.5;
}

/* BUTTONS */

.btn {
    display: inline-block;
    margin-top: 18px;
    padding: 13px 18px;
    border-radius: 12px;
    background: #0875dc;
    color: white;
    text-decoration: none;
    font-weight: bold;
    border: none;
}

/* CARDS */

.section-title {
    font-size: 22px;
    margin: 25px 0 13px;
}

.card {
    background: #0b1424;
    border: 1px solid #1b3153;
    border-radius: 18px;
    padding: 17px;
    margin-bottom: 12px;
}

.card-title {
    font-size: 18px;
    font-weight: bold;
}

.muted {
    color: #91a0b5;
    font-size: 14px;
    margin-top: 6px;
}

/* NEXT GAME */

.match-card {
    background: linear-gradient(135deg, #0d2b59, #091529);
    border: 1px solid #205294;
    border-radius: 20px;
    padding: 20px;
    text-align: center;
}

.match-label {
    color: #58a6ff;
    font-weight: bold;
    font-size: 13px;
    text-transform: uppercase;
}

.teams {
    display: flex;
    align-items: center;
    justify-content: space-around;
    margin: 20px 0;
}

.team {
    width: 40%;
}

.team img {
    width: 65px;
    height: 65px;
    object-fit: contain;
    margin-bottom: 8px;
}

.team-name {
    font-weight: bold;
    font-size: 15px;
}

.vs {
    color: #75849a;
    font-weight: bold;
}

/* NEWS */

.news-card {
    background: #0b1424;
    border: 1px solid #1b3153;
    border-radius: 18px;
    overflow: hidden;
    margin-bottom: 14px;
}

.news-image {
    width: 100%;
    height: 150px;
    background: linear-gradient(135deg, #12366d, #07152d);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #7f9bc0;
}

.news-content {
    padding: 16px;
}

.news-date {
    color: #5ca8ff;
    font-size: 12px;
    font-weight: bold;
    margin-bottom: 7px;
}

/* ROSTER */

.player {
    display: flex;
    align-items: center;
    gap: 14px;
}

.player-number {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: #0875dc;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 20px;
    font-weight: 900;
}

.player-info {
    flex: 1;
}

.player-position {
    color: #7f91aa;
    font-size: 13px;
    margin-top: 3px;
}

/* TABLE */

.table-wrap {
    overflow-x: auto;
    background: #0b1424;
    border: 1px solid #1b3153;
    border-radius: 18px;
}

table {
    width: 100%;
    border-collapse: collapse;
    min-width: 500px;
}

th, td {
    padding: 13px 10px;
    text-align: center;
    border-bottom: 1px solid #1b3153;
}

th {
    color: #8ea0ba;
    font-size: 12px;
}

td:first-child,
th:first-child {
    text-align: left;
}

/* BOTTOM NAV */

.bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 76px;
    background: rgba(5, 11, 24, 0.97);
    backdrop-filter: blur(12px);
    border-top: 1px solid #1b3153;
    display: flex;
    justify-content: space-around;
    align-items: center;
    z-index: 100;
}

.nav-btn {
    background: none;
    border: none;
    color: #718198;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: bold;
    cursor: pointer;
    min-width: 60px;
}

.nav-icon {
    font-size: 22px;
}

.nav-btn.active {
    color: #4ca3ff;
}

/* FOOTER */

.footer {
    text-align: center;
    color: #64748b;
    padding: 30px 0;
    font-size: 13px;
}

/* DESKTOP */

@media (min-width: 700px) {
    main {
        padding-top: 30px;
    }

    .bottom-nav {
        left: 50%;
        transform: translateX(-50%);
        max-width: 700px;
        border-radius: 20px 20px 0 0;
    }
}
</style>
</head>

<body>

<header class="header">
    <div class="header-top">

        <!-- ЗАМЕНИ URL НА ССЫЛКУ НА ЛОГОТИП -->
        <img
            class="logo"
            src="https://via.placeholder.com/100"
            alt="ХК Челны 2011"
        >

        <div>
            <div class="club-name">ХК Челны 2011</div>
            <div class="club-city">Набережные Челны • Хоккей</div>
        </div>

    </div>
</header>


<main>

<!-- ================= ГЛАВНАЯ ================= -->

<section id="home" class="page active">

    <div class="hero">
        <div class="hero-label">ХК Челны 2011</div>

        <h1>Играем.<br>Боремся.<br>Побеждаем.</h1>

        <p>
            Официальный сайт команды.
            Здесь вы найдёте новости, результаты матчей,
            состав и расписание.
        </p>

        <button class="btn" onclick="openPage('matches')">
            Ближайшие матчи
        </button>
    </div>


    <h2 class="section-title">Следующий матч</h2>

    <div class="match-card">

        <div class="match-label">
            Следующая игра
        </div>

        <div class="teams">

            <div class="team">
                <img src="https://via.placeholder.com/100" alt="">
                <div class="team-name">Челны 2011</div>
            </div>

            <div class="vs">VS</div>

            <div class="team">
                <img src="https://via.placeholder.com/100" alt="">
                <div class="team-name">Соперник</div>
            </div>

        </div>

        <div class="muted">
            Дата и время будут добавлены
        </div>

    </div>


    <h2 class="section-title">Последняя новость</h2>

    <div class="news-card">

        <div class="news-image">
            🏒 НОВОСТИ КОМАНДЫ
        </div>

        <div class="news-content">

            <div class="news-date">
                01 ОКТЯБРЯ 2026
            </div>

            <div class="card-title">
                Добро пожаловать на сайт ХК Челны 2011
            </div>

            <div class="muted">
                Следите за матчами, новостями и результатами
                нашей команды.
            </div>

        </div>

    </div>

</section>


<!-- ================= МАТЧИ ================= -->

<section id="matches" class="page">

    <h1>Матчи</h1>

    <p class="muted">
        Расписание и результаты команды
    </p>


    <h2 class="section-title">Предстоящие</h2>

    <div class="card">

        <div class="match-label">
            Ближайший матч
        </div>

        <div class="teams">

            <div class="team">
                <div class="team-name">Челны 2011</div>
            </div>

            <div class="vs">VS</div>

            <div class="team">
                <div class="team-name">Соперник</div>
            </div>

        </div>

        <div class="muted">
            Дата • Время • Арена
        </div>

    </div>


    <h2 class="section-title">Последние результаты</h2>

    <div class="card">
        <div class="card-title">
            Челны 2011 — Соперник
        </div>

        <div class="muted">
            Результат будет добавлен
        </div>
    </div>

</section>


<!-- ================= СОСТАВ ================= -->

<section id="roster" class="page">

    <h1>Состав</h1>

    <p class="muted">
        Игроки команды
    </p>


    <h2 class="section-title">Игроки</h2>


    <div class="card player">

        <div class="player-number">1</div>

        <div class="player-info">
            <div class="card-title">
                Игрок
            </div>

            <div class="player-position">
                Вратарь
            </div>
        </div>

    </div>


    <div class="card player">

        <div class="player-number">22</div>

        <div class="player-info">
            <div class="card-title">
                Игрок
            </div>

            <div class="player-position">
                Вратарь
            </div>
        </div>

    </div>


    <div class="card player">

        <div class="player-number">18</div>

        <div class="player-info">
            <div class="card-title">
                Игрок
            </div>

            <div class="player-position">
                Нападающий
            </div>
        </div>

    </div>


    <div class="card player">

        <div class="player-number">5</div>

        <div class="player-info">
            <div class="card-title">
                Игрок
            </div>

            <div class="player-position">
                Защитник
            </div>
        </div>

    </div>


    <div class="card player">

        <div class="player-number">26</div>

        <div class="player-info">
            <div class="card-title">
                Игрок
            </div>

            <div class="player-position">
                Нападающий
            </div>
        </div>

    </div>

</section>


<!-- ================= ТАБЛИЦА ================= -->

<section id="table" class="page">

    <h1>Таблица</h1>

    <p class="muted">
        Турнирное положение
    </p>

    <h2 class="section-title">
        Чемпионат
    </h2>

    <div class="table-wrap">

        <table>

            <thead>
                <tr>
                    <th>Команда</th>
                    <th>И</th>
                    <th>В</th>
                    <th>О</th>
                    <th>РШ</th>
                </tr>
            </thead>

            <tbody>

                <tr>
                    <td>Челны 2011</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0</td>
                </tr>

                <tr>
                    <td>Команда 2</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0</td>
                </tr>

                <tr>
                    <td>Команда 3</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0</td>
                </tr>

            </tbody>

        </table>

    </div>

</section>


<!-- ================= НОВОСТИ ================= -->

<section id="news" class="page">

    <h1>Новости</h1>

    <p class="muted">
        Последние события команды
    </p>


    <div class="news-card">

        <div class="news-image">
            🏒
        </div>

        <div class="news-content">

            <div class="news-date">
                01.10.2026
            </div>

            <div class="card-title">
                Новый сезон стартовал
            </div>

            <div class="muted">
                Здесь будут появляться новости,
                результаты и события команды.
            </div>

        </div>

    </div>


    <div class="news-card">

        <div class="news-image">
            🏆
        </div>

        <div class="news-content">

            <div class="news-date">
                НОВОСТИ
            </div>

            <div class="card-title">
                Следите за обновлениями
            </div>

            <div class="muted">
                Скоро здесь появится больше материалов.
            </div>

        </div>

    </div>

</section>


<div class="footer">
    ХК Челны 2011<br>
    Официальный сайт команды
</div>

</main>


<!-- ================= НИЖНЕЕ МЕНЮ ================= -->

<nav class="bottom-nav">

    <button class="nav-btn active" onclick="openPage('home', this)">
        <span class="nav-icon">⌂</span>
        Главная
    </button>

    <button class="nav-btn" onclick="openPage('matches', this)">
        <span class="nav-icon">🏒</span>
        Матчи
    </button>

    <button class="nav-btn" onclick="openPage('roster', this)">
        <span class="nav-icon">👥</span>
        Состав
    </button>

    <button class="nav-btn" onclick="openPage('table', this)">
        <span class="nav-icon">📊</span>
        Таблица
    </button>

    <button class="nav-btn" onclick="openPage('news', this)">
        <span class="nav-icon">📰</span>
        Новости
    </button>

</nav>


<script>

function openPage(pageId, button) {

    // Скрываем все страницы
    document.querySelectorAll('.page').forEach(function(page) {
        page.classList.remove('active');
    });

    // Показываем нужную
    document.getElementById(pageId).classList.add('active');

    // Убираем активность у кнопок
    document.querySelectorAll('.nav-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });

    // Активируем выбранную кнопку
    if (button) {
        button.classList.add('active');
    } else {

        document.querySelectorAll('.nav-btn').forEach(function(btn) {

            if (btn.getAttribute('onclick').includes("'" + pageId + "'")) {
                btn.classList.add('active');
            }

        });

    }

    // Прокрутка наверх
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

</script>

</body>
</html>
