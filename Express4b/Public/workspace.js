const app = document.getElementById("app");
const USER_KEY = "daymark.user";
const SETTINGS_KEY = "daymark.settings";

const state = {
    user: readStorage(USER_KEY, null),
    settings: readStorage(SETTINGS_KEY, { updates: true }),
    page: "home",
    items: [],
    itemsLoading: false,
    itemsError: "",
    composerOpen: false
};

function readStorage(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;"
    })[character]);
}

function firstName() {
    return state.user?.name?.trim().split(/\s+/)[0] || "there";
}

function render() {
    if (!state.user) {
        renderWelcome();
        return;
    }
    renderWorkspace();
}

function renderWelcome() {
    app.innerHTML = `
        <section class="welcome-page">
            <div class="welcome-art" aria-hidden="true">
                <a class="brand brand-light" href="#"><span class="brand-mark">d</span>daymark</a>
                <div class="art-copy">
                    <span class="overline">A SPACE THAT'S YOURS</span>
                    <p>Make a little<br>room for <em>good work.</em></p>
                </div>
                <div class="art-sun"></div>
                <div class="art-caption"><span>01</span><span>START WHERE YOU ARE</span></div>
            </div>
            <div class="welcome-form-wrap">
                <form class="welcome-form" id="welcomeForm">
                    <span class="overline">LET'S GET SET UP</span>
                    <h1>Welcome to<br>your workspace.</h1>
                    <p class="muted-copy">First, what should we call you?</p>
                    <label class="field-label" for="welcomeName">Your name</label>
                    <input id="welcomeName" name="name" autocomplete="name" maxlength="48" placeholder="e.g. Alex Morgan" required>
                    <button class="button button-primary button-wide" type="submit">Continue <span aria-hidden="true">→</span></button>
                    <p class="form-footnote">Your workspace is ready when you are.</p>
                </form>
            </div>
        </section>`;

    document.getElementById("welcomeForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const name = new FormData(event.currentTarget).get("name").trim();
        if (!name) return;
        state.user = { name };
        localStorage.setItem(USER_KEY, JSON.stringify(state.user));
        state.page = "home";
        render();
        loadItems();
    });
}

function renderWorkspace() {
    const pages = [
        ["home", "Home", "⌂"],
        ["products", "Products", "▦"],
        ["profile", "Profile", "◉"],
        ["settings", "Settings", "⚙"]
    ];

    app.innerHTML = `
        <div class="workspace">
            <aside class="sidebar">
                <a class="brand" href="#home" data-page="home"><span class="brand-mark">d</span>daymark</a>
                <div class="workspace-label">YOUR WORKSPACE</div>
                <nav class="primary-nav" aria-label="Main navigation">
                    ${pages.map(([key, label, icon]) => `
                        <button class="nav-link${state.page === key ? " is-active" : ""}" type="button" data-page="${key}" ${state.page === key ? 'aria-current="page"' : ""}>
                            <span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span>
                            ${key === "products" && state.items.length ? `<span class="nav-count">${state.items.length}</span>` : ""}
                        </button>`).join("")}
                </nav>
                <div class="sidebar-bottom">
                    <div class="sidebar-note"><span class="note-spark" aria-hidden="true">✳</span><p>A calmer place<br>to get things done.</p></div>
                    <button class="account-button" type="button" data-page="profile">
                        <span class="avatar">${escapeHtml(initials(state.user.name))}</span>
                        <span class="account-copy"><strong>${escapeHtml(state.user.name)}</strong><small>Personal workspace</small></span>
                        <span class="account-more" aria-hidden="true">···</span>
                    </button>
                </div>
            </aside>
            <section class="main-column">
                <header class="topbar">
                    <span class="breadcrumb">Workspace <span>/</span> ${escapeHtml(pageTitle())}</span>
                    <div class="topbar-right"><span class="online-dot"></span><span>All changes saved</span><span class="topbar-date">${formattedDate()}</span></div>
                </header>
                <main class="page-content">${pageContent()}</main>
            </section>
            <nav class="mobile-nav" aria-label="Main navigation">
                ${pages.map(([key, label, icon]) => `<button class="mobile-nav-link${state.page === key ? " is-active" : ""}" type="button" data-page="${key}" aria-label="${label}" ${state.page === key ? 'aria-current="page"' : ""}><span aria-hidden="true">${icon}</span><small>${label}</small></button>`).join("")}
            </nav>
        </div>`;

    app.querySelectorAll("[data-page]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            state.page = button.dataset.page;
            state.composerOpen = false;
            render();
            if (state.page === "products" && !state.items.length && !state.itemsLoading && !state.itemsError) loadItems();
        });
    });

    app.querySelectorAll("[data-action]").forEach((button) => {
        button.addEventListener("click", () => handleAction(button.dataset.action));
    });
    bindPageForms();
}

function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function pageTitle() {
    return ({ home: "Home", products: "Products", profile: "Profile", settings: "Settings" })[state.page] || "Home";
}

function formattedDate() {
    return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date());
}

function pageContent() {
    if (state.page === "products") return productsPage();
    if (state.page === "profile") return profilePage();
    if (state.page === "settings") return settingsPage();
    return homePage();
}

function homePage() {
    const inStock = state.items.filter((item) => item.stockStatus?.toLowerCase() === "in stock").length;
    const outOfStock = state.items.filter((item) => item.stockStatus?.toLowerCase() !== "in stock").length;
    return `
        <div class="page-heading heading-row">
            <div><span class="overline">YOUR SPACE / OVERVIEW</span><h1>Good morning, ${escapeHtml(firstName())}.</h1><p class="muted-copy">A clear view of what you're working on today.</p></div>
            <button class="button button-primary" type="button" data-action="add-product"><span aria-hidden="true">＋</span> Add a product</button>
        </div>
        <section class="welcome-strip">
            <div class="welcome-strip-copy"><span class="strip-label">A FRESH START</span><h2>Small steps make<br>something <em>good.</em></h2><p>Your workspace is set up. Add a product or take a look around.</p></div>
            <div class="strip-art" aria-hidden="true"><span class="strip-ring ring-one"></span><span class="strip-ring ring-two"></span><span class="strip-stem"></span><span class="strip-leaf leaf-one"></span><span class="strip-leaf leaf-two"></span><span class="strip-orbit">✳</span></div>
        </section>
        <section class="stats-grid" aria-label="Product summary">
            <article class="stat-card stat-ink"><span class="stat-label">TOTAL PRODUCTS</span><strong>${state.items.length}</strong><span class="stat-foot">In your collection</span><span class="stat-mark" aria-hidden="true">▦</span></article>
            <article class="stat-card stat-mint"><span class="stat-label">IN STOCK</span><strong>${inStock}</strong><span class="stat-foot">Ready to go</span><span class="stat-mark" aria-hidden="true">↗</span></article>
            <article class="stat-card stat-coral"><span class="stat-label">NEEDS ATTENTION</span><strong>${outOfStock}</strong><span class="stat-foot">Out of stock or unlisted</span><span class="stat-mark" aria-hidden="true">!</span></article>
        </section>
        <section class="section-block">
            <div class="section-heading"><div><span class="overline">YOUR CATALOG</span><h2>Recently added</h2></div><button class="text-button" type="button" data-page="products">View all <span aria-hidden="true">→</span></button></div>
            ${homeProductList()}
        </section>`;
}

function homeProductList() {
    if (state.itemsLoading) return `<div class="empty-state compact"><span class="loader" aria-hidden="true"></span><p>Loading your products…</p></div>`;
    if (state.itemsError) return `<div class="inline-message"><span>${escapeHtml(state.itemsError)}</span><button class="text-button" type="button" data-action="retry-products">Try again</button></div>`;
    if (!state.items.length) return `<div class="empty-state compact"><span class="empty-icon" aria-hidden="true">▦</span><div><strong>Your catalog starts here.</strong><p>Add your first product to see it in this space.</p></div><button class="button button-quiet" type="button" data-action="add-product">Add product <span aria-hidden="true">→</span></button></div>`;
    return `<div class="recent-list">${state.items.slice(0, 4).map((item) => productRow(item, false)).join("")}</div>`;
}

function productsPage() {
    return `
        <div class="page-heading heading-row">
            <div><span class="overline">YOUR SPACE / CATALOG</span><h1>Products</h1><p class="muted-copy">Keep your collection tidy and up to date.</p></div>
            <button class="button button-primary" type="button" data-action="add-product"><span aria-hidden="true">＋</span> Add a product</button>
        </div>
        ${state.composerOpen ? productForm() : ""}
        <section class="catalog-section">
            <div class="catalog-toolbar"><div><strong>Your catalog</strong><span>${state.items.length} ${state.items.length === 1 ? "item" : "items"}</span></div><button class="icon-button" type="button" data-action="retry-products" aria-label="Refresh products" title="Refresh products">↻</button></div>
            ${state.itemsLoading ? `<div class="empty-state"><span class="loader" aria-hidden="true"></span><p>Loading your products…</p></div>` : ""}
            ${state.itemsError ? `<div class="empty-state error-state"><span class="empty-icon" aria-hidden="true">!</span><strong>We couldn't load your catalog.</strong><p>${escapeHtml(state.itemsError)}</p><button class="button button-quiet" type="button" data-action="retry-products">Try again</button></div>` : ""}
            ${!state.itemsLoading && !state.itemsError && !state.items.length ? `<div class="empty-state"><span class="empty-icon" aria-hidden="true">▦</span><strong>Nothing here just yet.</strong><p>Add your first product and it will appear here.</p><button class="button button-primary" type="button" data-action="add-product">Add a product <span aria-hidden="true">→</span></button></div>` : ""}
            ${!state.itemsLoading && !state.itemsError && state.items.length ? `<div class="product-list">${state.items.map((item) => productRow(item, true)).join("")}</div>` : ""}
        </section>`;
}

function productRow(item, showDelete) {
    const status = item.stockStatus || "Status not set";
    const isAvailable = status.toLowerCase() === "in stock";
    return `<article class="product-row">
        <span class="product-thumb" aria-hidden="true">${escapeHtml((item.name || "P").trim()[0]?.toUpperCase() || "P")}</span>
        <div class="product-details"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.description || "No description")}</span></div>
        <span class="stock-badge${isAvailable ? " is-available" : ""}"><span></span>${escapeHtml(status)}</span>
        <strong class="product-price">${formatPrice(item.price)}</strong>
        ${showDelete ? `<button class="delete-button" type="button" data-action="delete-product" data-id="${escapeHtml(item._id)}" aria-label="Delete ${escapeHtml(item.name)}" title="Delete product">×</button>` : ""}
    </article>`;
}

function formatPrice(price) {
    const amount = Number(price);
    return Number.isFinite(amount) ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount) : "—";
}

function productForm() {
    return `<form class="product-form" id="productForm">
        <div class="form-heading"><div><span class="overline">NEW IN YOUR CATALOG</span><h2>Add a product</h2></div><button class="icon-button" type="button" data-action="close-composer" aria-label="Close form">×</button></div>
        <div class="form-grid"><label class="field-label">Product name<input name="name" maxlength="100" placeholder="e.g. Studio mug" required></label><label class="field-label">Price<input name="price" type="number" min="0" step="0.01" placeholder="0.00" required></label><label class="field-label field-span">Description<input name="description" maxlength="240" placeholder="A short description" required></label><label class="field-label">Availability<select name="stockStatus"><option>In stock</option><option>Out of stock</option></select></label></div>
        <p class="form-error" id="productError" role="alert"></p><div class="form-actions"><button class="button button-quiet" type="button" data-action="close-composer">Cancel</button><button class="button button-primary" type="submit">Save product <span aria-hidden="true">→</span></button></div>
    </form>`;
}

function profilePage() {
    return `
        <div class="page-heading"><span class="overline">YOUR SPACE / ACCOUNT</span><h1>Your profile</h1><p class="muted-copy">A few details about the person behind this workspace.</p></div>
        <section class="settings-panel profile-panel"><div class="profile-banner"><span class="profile-avatar">${escapeHtml(initials(state.user.name))}</span><div><span class="overline">PERSONAL WORKSPACE</span><h2>${escapeHtml(state.user.name)}</h2></div></div>
            <form id="profileForm" class="settings-form"><div class="panel-heading"><div><h2>Personal details</h2><p>Update how your workspace greets you.</p></div></div><label class="field-label" for="profileName">Name<input id="profileName" name="name" maxlength="48" value="${escapeHtml(state.user.name)}" required></label><p class="form-error" id="profileError" role="alert"></p><button class="button button-primary" type="submit">Save changes <span aria-hidden="true">→</span></button></form>
        </section>`;
}

function settingsPage() {
    return `
        <div class="page-heading"><span class="overline">YOUR SPACE / PREFERENCES</span><h1>Settings</h1><p class="muted-copy">Make this workspace feel a little more like yours.</p></div>
        <section class="settings-panel"><div class="panel-heading"><div><h2>Preferences</h2><p>Choose which updates you'd like to see.</p></div></div>
            <div class="setting-row"><div><strong>Product updates</strong><p>Show helpful notes about your catalog on the home page.</p></div><label class="switch"><input id="updatesToggle" type="checkbox" ${state.settings.updates ? "checked" : ""}><span class="switch-track"></span><span class="sr-only">Product updates</span></label></div>
            <div class="setting-row"><div><strong>Workspace name</strong><p>Your personal space, ready when you are.</p></div><span class="setting-value">Daymark</span></div>
        </section>
        <button class="signout-button" type="button" data-action="sign-out">Sign out <span aria-hidden="true">↗</span></button>`;
}

function bindPageForms() {
    const form = document.getElementById("productForm");
    if (form) form.addEventListener("submit", saveProduct);
    const profileForm = document.getElementById("profileForm");
    if (profileForm) profileForm.addEventListener("submit", saveProfile);
    const toggle = document.getElementById("updatesToggle");
    if (toggle) toggle.addEventListener("change", () => {
        state.settings.updates = toggle.checked;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    });
}

function handleAction(action) {
    if (action === "add-product") {
        state.page = "products";
        state.composerOpen = true;
        render();
        document.querySelector('#productForm input[name="name"]')?.focus();
    } else if (action === "close-composer") {
        state.composerOpen = false;
        render();
    } else if (action === "retry-products") {
        loadItems(true);
    } else if (action === "delete-product") {
        deleteProduct(app.querySelector(`[data-action="delete-product"][data-id="${CSS.escape(event.currentTarget?.dataset.id || "")}"]`)?.dataset.id);
    } else if (action === "sign-out") {
        localStorage.removeItem(USER_KEY);
        state.user = null;
        state.page = "home";
        render();
    }
}

async function loadItems(force = false) {
    if (state.itemsLoading && !force) return;
    state.itemsLoading = true;
    state.itemsError = "";
    render();
    try {
        const response = await fetch("/api/items");
        if (!response.ok) throw new Error("The product service is unavailable. Check that the server and database are running.");
        const items = await response.json();
        if (!Array.isArray(items)) throw new Error("The server returned an unexpected product list.");
        state.items = items;
    } catch (error) {
        state.itemsError = error.message || "Couldn't connect to the product service.";
    } finally {
        state.itemsLoading = false;
        render();
    }
}

async function saveProduct(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const submit = form.querySelector('[type="submit"]');
    const errorLabel = document.getElementById("productError");
    submit.disabled = true;
    submit.textContent = "Saving…";
    errorLabel.textContent = "";
    try {
        const response = await fetch("/api/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...values, price: Number(values.price) })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "The product couldn't be saved.");
        state.items.unshift(result);
        state.composerOpen = false;
        render();
    } catch (error) {
        errorLabel.textContent = error.message || "Couldn't connect to the product service.";
        submit.disabled = false;
        submit.innerHTML = 'Save product <span aria-hidden="true">→</span>';
    }
}

async function deleteProduct(id) {
    if (!id) return;
    try {
        const response = await fetch(`/api/items/${encodeURIComponent(id)}`, { method: "DELETE" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "The product couldn't be deleted.");
        state.items = state.items.filter((item) => item._id !== id);
        render();
    } catch (error) {
        window.alert(error.message || "Couldn't connect to the product service.");
    }
}

function saveProfile(event) {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get("name").trim();
    if (!name) {
        document.getElementById("profileError").textContent = "Please enter your name.";
        return;
    }
    state.user = { ...state.user, name };
    localStorage.setItem(USER_KEY, JSON.stringify(state.user));
    render();
}

app.addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="delete-product"]');
    if (button) deleteProduct(button.dataset.id);
});

render();
if (state.user) loadItems();
