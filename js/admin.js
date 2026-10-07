// ================================
// AUTH
// ================================

async function checkAuth() {
    const { data, error } = await db.auth.getSession();

    if (error) {
        console.error("Ошибка получения сессии:", error);
        showAuth();
        return;
    }

    if (data.session) {
        await showAdmin();
    } else {
        showAuth();
    }
}


function showAuth() {
    $("#authScreen").classList.remove("hidden");
    $("#adminApp").classList.add("hidden");
}


async function showAdmin() {
    $("#authScreen").classList.add("hidden");
    $("#adminApp").classList.remove("hidden");

    try {
        await initAdmin();
    } catch (error) {
        console.error("Ошибка загрузки админки:", error);

        // Даже если какая-то секция не загрузилась,
        // сама админка всё равно должна открыться.
        $("#authScreen").classList.add("hidden");
        $("#adminApp").classList.remove("hidden");

        showToast(
            "Вход выполнен, но часть данных не загрузилась",
            "error"
        );
    }
}


// ================================
// LOGIN
// ================================

$("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;

    if (!email || !password) {
        $("#loginError").textContent = "Введите почту и пароль";
        return;
    }

    const button = $("#loginForm button[type='submit']");

    button.disabled = true;
    button.textContent = "Вход...";

    $("#loginError").textContent = "";

    const { data, error } = await db.auth.signInWithPassword({
        email,
        password
    });

    button.disabled = false;
    button.textContent = "Войти";

    if (error) {
        console.error("Ошибка входа:", error);

        $("#loginError").textContent =
            error.message || "Не удалось войти";

        return;
    }

    if (data.session) {
        showToast("Вход выполнен");

        await showAdmin();
    }
});


// ================================
// LOGOUT
// ================================

$("#logoutButton").addEventListener("click", async () => {
    await db.auth.signOut();

    showAuth();
});


// ================================
// SESSION
// ================================

db.auth.onAuthStateChange(async (event, session) => {
    console.log("Auth event:", event);

    if (event === "SIGNED_IN" && session) {
        await showAdmin();
    }

    if (event === "SIGNED_OUT") {
        showAuth();
    }
});
