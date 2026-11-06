// THEMED TOAST NOTIFICATION SYSTEM (Replaces native browser alerts)
function showToast(message, type = 'info', title = '') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    let iconClass = 'fa-solid fa-circle-info';
    let defaultTitle = 'Notice';
    if (type === 'success') {
        iconClass = 'fa-solid fa-circle-check';
        defaultTitle = 'Success';
    } else if (type === 'error') {
        iconClass = 'fa-solid fa-circle-xmark';
        defaultTitle = 'Attention';
    } else if (type === 'warning') {
        iconClass = 'fa-solid fa-triangle-exclamation';
        defaultTitle = 'Notice';
    }

    const displayTitle = title || defaultTitle;

    toast.innerHTML = `
        <div class="toast-icon"><i class="${iconClass}"></i></div>
        <div class="toast-body">
            <span class="toast-title">${displayTitle}</span>
            <span class="toast-message">${message}</span>
        </div>
        <button class="toast-close" type="button" aria-label="Close" onclick="this.parentElement.remove()">&times;</button>
        <div class="toast-progress"></div>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-show'));

    const dismissTimer = setTimeout(() => {
        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');
        setTimeout(() => { if (toast.parentElement) toast.remove(); }, 350);
    }, 3800);

    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(dismissTimer);
        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');
        setTimeout(() => { if (toast.parentElement) toast.remove(); }, 350);
    });
}

// DEFAULT PRODUCT CATALOG (Available offline & instant seed)
const DEFAULT_PRODUCT_CATALOG = [
    {
        id: 1,
        name: "Fresh Tomatoes",
        category: "Vegetables",
        price: 120,
        image: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=500"
    },
    {
        id: 2,
        name: "Red Onions",
        category: "Vegetables",
        price: 150,
        image: "https://images.unsplash.com/photo-1508747703725-719777637510?w=500"
    },
    {
        id: 3,
        name: "Bananas",
        category: "Fruits",
        price: 100,
        image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500"
    },
    {
        id: 4,
        name: "Apples",
        category: "Fruits",
        price: 280,
        image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500"
    },
    {
        id: 5,
        name: "Fresh Milk",
        category: "Dairy",
        price: 75,
        image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500"
    },
    {
        id: 6,
        name: "Eggs",
        category: "Dairy",
        price: 480,
        image: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=500"
    },
    {
        id: 7,
        name: "Rice",
        category: "Groceries",
        price: 320,
        image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500"
    },
    {
        id: 8,
        name: "Cooking Oil",
        category: "Groceries",
        price: 250,
        image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500"
    }
];

const PRODUCT_IMAGE_FALLBACKS = {
    "fresh tomatoes": "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=500",
    "red onions": "https://images.unsplash.com/photo-1508747703725-719777637510?w=500",
    "bananas": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500",
    "apples": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500",
    "fresh milk": "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500",
    "eggs": "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=500",
    "rice": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500",
    "cooking oil": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500"
};

const CATEGORY_IMAGE_FALLBACKS = {
    "vegetables": "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=500",
    "fruits": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500",
    "dairy": "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500",
    "groceries": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500"
};

// GLOBAL STATE
let products = JSON.parse(localStorage.getItem("products")) || DEFAULT_PRODUCT_CATALOG;
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let currentUser = JSON.parse(localStorage.getItem("currentUser")) || null;
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
let adminOrdersData = [];

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("currentUser")) || null;
    } catch (e) {
        return null;
    }
}

// HELPER: FIND CATALOG PRODUCT BY ID OR NAME
function getCatalogProduct(item) {
    if (!item) return null;
    const targetId = Number(item.id);
    let prod = null;
    if (!isNaN(targetId) && targetId > 0) {
        prod = products.find(p => Number(p.id) === targetId) || DEFAULT_PRODUCT_CATALOG.find(p => Number(p.id) === targetId);
    }
    if (!prod && item.name) {
        const cleanName = item.name.trim().toLowerCase();
        prod = products.find(p => p.name && p.name.trim().toLowerCase() === cleanName) || 
               DEFAULT_PRODUCT_CATALOG.find(p => p.name && p.name.trim().toLowerCase() === cleanName);
    }
    return prod;
}

// HELPER: RESOLVE SPECIFIC PRODUCT IMAGE (AVOID GENERIC SHELVES)
function resolveProductImage(item, catalogProd) {
    const genericStoreImg = 'photo-1542838132-92c53300491e';
    if (item && item.image && !item.image.includes(genericStoreImg)) {
        return item.image;
    }
    if (catalogProd && catalogProd.image && !catalogProd.image.includes(genericStoreImg)) {
        return catalogProd.image;
    }
    const nameKey = (item && item.name ? item.name : (catalogProd && catalogProd.name ? catalogProd.name : '')).trim().toLowerCase();
    if (PRODUCT_IMAGE_FALLBACKS[nameKey]) {
        return PRODUCT_IMAGE_FALLBACKS[nameKey];
    }
    const catKey = (item && item.category ? item.category : (catalogProd && catalogProd.category ? catalogProd.category : '')).trim().toLowerCase();
    if (CATEGORY_IMAGE_FALLBACKS[catKey]) {
        return CATEGORY_IMAGE_FALLBACKS[catKey];
    }
    return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500';
}

// SYNC STORED CART ITEMS WITH PRODUCT CATALOG (FIXES OLD/MISSING IMAGES)
function syncCartWithProducts() {
    let changed = false;
    cart.forEach(item => {
        const prod = getCatalogProduct(item);
        const resolvedImg = resolveProductImage(item, prod);
        const resolvedCat = (prod && prod.category) || (item.category && item.category !== 'Organic Groceries' ? item.category : 'Groceries');
        
        if (item.image !== resolvedImg) {
            item.image = resolvedImg;
            changed = true;
        }
        if (item.category !== resolvedCat) {
            item.category = resolvedCat;
            changed = true;
        }
        if (prod && item.name !== prod.name) {
            item.name = prod.name;
            changed = true;
        }
    });
    if (changed) {
        localStorage.setItem("cart", JSON.stringify(cart));
    }
}

// FAVORITES MANAGEMENT
function saveFavorites() {
    localStorage.setItem("favorites", JSON.stringify(favorites));
    updateWishlistBadges();
}

function isFavorite(id) {
    return favorites.includes(Number(id));
}

function toggleFavorite(id) {
    id = Number(id);
    const idx = favorites.indexOf(id);
    if (idx > -1) {
        favorites.splice(idx, 1);
        showToast("Item removed from your favorites.", "info", "Wishlist");
    } else {
        favorites.push(id);
        showToast("Item saved to your favorites!", "success", "Wishlist");
    }
    saveFavorites();

    // Update heart icons across storefront
    document.querySelectorAll(`.product-fav-btn[data-id="${id}"]`).forEach(btn => {
        const fav = isFavorite(id);
        btn.classList.toggle('active', fav);
        btn.innerHTML = `<i class="${fav ? 'fa-solid' : 'fa-regular'} fa-heart"></i>`;
        btn.title = fav ? 'Remove from favorites' : 'Add to favorites';
    });

    displayCart();
    updateModalFavButton(id);
    renderWishlistModal();
}

function updateWishlistBadges() {
    const count = favorites.length;
    document.querySelectorAll(".wishlist-count-badge").forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? "inline-block" : "none";
    });
}

// FETCH PRODUCTS FROM NODE.JS BACKEND
async function fetchProducts() {
    try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error("API Network error");
        const data = await response.json();
        if (data.success && data.products && data.products.length > 0) {
            products = data.products.map(p => ({
                ...p,
                price: Number(p.price),
                image: resolveProductImage(p, p)
            }));
            localStorage.setItem("products", JSON.stringify(products));
            syncCartWithProducts();
        }
    } catch (err) {
        console.warn("Backend products API offline, using local storage:", err.message);
    }
    displayProducts();
    updateWishlistBadges();
}

// DISPLAY PRODUCTS
function displayProducts(list = products) {
    const container = document.getElementById("product-container");
    if (!container) return;

    container.innerHTML = "";

    if (!list || list.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #64748B;">
                <i class="fa-solid fa-magnifying-glass" style="font-size: 2rem; color: #05A648; margin-bottom: 10px; display:block;"></i>
                <p>No products found matching your search or filter.</p>
            </div>
        `;
        return;
    }

    const user = getCurrentUser();
    const isAdmin = user && user.role === 'admin';

    list.forEach(product => {
        const oldPrice = Math.round(product.price * 1.25);
        const isFav = isFavorite(product.id);

        const actionButtonHtml = isAdmin
            ? `<button class="btn-add-cart btn-admin-mode" onclick="showToast('Management Mode: Product inventory is managed in the Admin Dashboard.', 'info', 'Store Manager')">
                 <i class="fa-solid fa-lock" aria-hidden="true"></i> Manager View
               </button>`
            : `<button class="btn-add-cart" onclick="addToCart(${product.id})">
                 <i class="fa-solid fa-cart-shopping" aria-hidden="true"></i> Add to Cart
               </button>`;

        container.innerHTML += `
            <div class="product">
                <button type="button" class="product-fav-btn ${isFav ? 'active' : ''}" data-id="${product.id}" onclick="event.stopPropagation(); toggleFavorite(${product.id})" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}" aria-label="Favorite">
                    <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                </button>
                <div class="product-img-box" onclick="openProductModal(${product.id})" title="Click to view ${product.name} details">
                    <img src="${product.image}" alt="${product.name}" loading="lazy" decoding="async" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=500'">
                </div>
                <div class="product-rating">
                    <i class="fa-solid fa-star"></i>
                    <i class="fa-solid fa-star"></i>
                    <i class="fa-solid fa-star"></i>
                    <i class="fa-solid fa-star"></i>
                    <i class="fa-solid fa-star"></i>
                </div>
                <h3 onclick="openProductModal(${product.id})" style="cursor: pointer;" title="Click to view details">${product.name}</h3>
                <div class="product-cat-label">${product.category}</div>
                <div class="product-pricing">
                    <strong>KES ${product.price}</strong>
                    <span class="old-price">KES ${oldPrice}</span>
                </div>
                ${actionButtonHtml}
            </div>
        `;
    });
}

// SEARCH PRODUCTS
const searchInput = document.getElementById("search");
if (searchInput) {
    searchInput.addEventListener("input", function() {
        const searchValue = this.value.toLowerCase().trim();
        const filtered = products.filter(product =>
            product.name.toLowerCase().includes(searchValue) ||
            product.category.toLowerCase().includes(searchValue)
        );
        displayProducts(filtered);
    });
}

// FILTER PRODUCTS BY CATEGORY
function filterProducts(category) {
    const buttons = document.querySelectorAll("#category-filter-buttons button");
    buttons.forEach(btn => {
        if (btn.textContent.trim().toLowerCase().includes(category.toLowerCase()) || 
           (category === "All" && btn.textContent.trim().toLowerCase().includes("all"))) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    if (category === "All") {
        displayProducts(products);
    } else {
        const filtered = products.filter(product =>
            product.category === category
        );
        displayProducts(filtered);
    }

    const prodSec = document.getElementById("products");
    if (prodSec) {
        prodSec.scrollIntoView({ behavior: "smooth" });
    }
}

// CONTINUOUS AUTO-SCROLLING CATEGORIES TO THE LEFT (SEAMLESS INFINITE LOOP)
let categoryScrollAnimFrame = null;
let categoryCurrentPos = 0;

function initCategoryAutoScroll() {
    const track = document.getElementById("category-icon-track");
    if (!track) return;

    let lastTime = null;
    const speedPerSecond = 26;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartPos = 0;

    function autoScrollStep(currentTime) {
        if (!lastTime) lastTime = currentTime;
        const delta = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        const firstGroup = track.querySelector(".category-track-group");
        const groupWidth = firstGroup ? firstGroup.offsetWidth : 0;

        if (!isDragging && delta > 0 && delta < 0.2 && groupWidth > 0) {
            categoryCurrentPos += speedPerSecond * delta;
            if (categoryCurrentPos >= groupWidth) {
                categoryCurrentPos -= groupWidth;
            }
            track.style.transform = `translate3d(-${categoryCurrentPos.toFixed(2)}px, 0, 0)`;
        }

        categoryScrollAnimFrame = requestAnimationFrame(autoScrollStep);
    }

    track.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartPos = categoryCurrentPos;
    });

    window.addEventListener("pointermove", (e) => {
        if (!isDragging) return;
        const firstGroup = track.querySelector(".category-track-group");
        const groupWidth = firstGroup ? firstGroup.offsetWidth : 0;
        if (groupWidth <= 0) return;

        const diff = e.clientX - dragStartX;
        categoryCurrentPos = dragStartPos - diff;
        while (categoryCurrentPos < 0) categoryCurrentPos += groupWidth;
        while (categoryCurrentPos >= groupWidth) categoryCurrentPos -= groupWidth;
        track.style.transform = `translate3d(-${categoryCurrentPos.toFixed(2)}px, 0, 0)`;
    });

    const endDrag = () => {
        if (isDragging) {
            isDragging = false;
            lastTime = performance.now();
        }
    };

    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    if (categoryScrollAnimFrame) cancelAnimationFrame(categoryScrollAnimFrame);
    categoryScrollAnimFrame = requestAnimationFrame(autoScrollStep);
}

// SCROLL CATEGORIES ARROWS
function scrollCategories(offset) {
    const track = document.getElementById("category-icon-track");
    if (!track) return;
    const firstGroup = track.querySelector(".category-track-group");
    const groupWidth = firstGroup ? firstGroup.offsetWidth : 0;
    if (groupWidth <= 0) return;

    categoryCurrentPos += offset;
    while (categoryCurrentPos < 0) categoryCurrentPos += groupWidth;
    while (categoryCurrentPos >= groupWidth) categoryCurrentPos -= groupWidth;
    track.style.transform = `translate3d(-${categoryCurrentPos.toFixed(2)}px, 0, 0)`;
}

// ADD TO CART (Restricted for Store Managers/Admins)
function addToCart(id, qty = 1) {
    const user = getCurrentUser();
    if (user && user.role === 'admin') {
        showToast("Management Mode: Administrators manage store operations and cannot add items to cart.", "warning", "Admin Restriction");
        return;
    }

    id = Number(id);
    const product = getCatalogProduct({ id });
    if (!product) return;

    const existing = cart.find(item => Number(item.id) === id);
    if (existing) {
        existing.quantity += qty;
        existing.image = resolveProductImage(existing, product);
        existing.category = product.category;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: resolveProductImage(product, product),
            category: product.category,
            quantity: qty
        });
    }

    saveCart();
    showToast(`Added ${qty > 1 ? qty + ' × ' : ''}"${product.name}" to your cart!`, "success", "Cart Updated");
}

// SAVE CART
function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
    displayCart();
}

// CLEAR CART
function clearCart() {
    if (cart.length === 0) return;
    cart = [];
    saveCart();
    showToast("Shopping cart cleared.", "info", "Cart");
}

// DISPLAY CART WITH THUMBNAILS, KES PRICING, AND FAVORITE TOGGLE
function displayCart() {
    const container = document.getElementById("cart-items");
    const totalElem = document.getElementById("total");
    const summarySubtotal = document.getElementById("summary-subtotal");
    const summaryCount = document.getElementById("cart-summary-count");
    const clearBtn = document.getElementById("btn-clear-cart");

    if (!container) return;

    const user = getCurrentUser();
    const isAdmin = user && user.role === 'admin';

    container.innerHTML = "";

    // Show Admin Banner in Cart if manager account is logged in
    let adminBannerHtml = '';
    if (isAdmin) {
        adminBannerHtml = `
            <div class="admin-cart-notice">
                <i class="fa-solid fa-shield-halved" style="font-size: 18px;"></i>
                <div>
                    <strong>Store Management Mode:</strong> Customer ordering and checkout are restricted for administrator accounts.
                    Use this profile to oversee stock and client orders in the <a href="#admin-panel" style="font-weight: 700; color: #166534; text-decoration: underline;">Admin Dashboard</a>.
                </div>
            </div>
        `;
    }

    if (cart.length === 0) {
        container.innerHTML = `
            ${adminBannerHtml}
            <div class="cart-empty-state">
                <div class="cart-empty-icon"><i class="fa-solid fa-basket-shopping"></i></div>
                <h3>Your shopping cart is empty</h3>
                <p>Browse our farm fresh selection of organic vegetables, fruits, and dairy to get started.</p>
                <a href="#products" class="btn btn-primary"><i class="fa-solid fa-arrow-down"></i> Explore Products</a>
            </div>
        `;
        if (totalElem) totalElem.textContent = "KES 0";
        if (summarySubtotal) summarySubtotal.textContent = "KES 0";
        if (summaryCount) summaryCount.textContent = "0";
        if (clearBtn) clearBtn.style.display = "none";
        updateCartCount();
        return;
    }

    if (clearBtn) clearBtn.style.display = "inline-flex";

    let total = 0;
    let totalItemsCount = 0;
    let itemsHtml = adminBannerHtml;

    cart.forEach(item => {
        const prod = getCatalogProduct(item);
        const resolvedImage = resolveProductImage(item, prod);
        const resolvedCat = (prod && prod.category) || item.category || 'Organic Groceries';
        const itemSubtotal = item.price * item.quantity;
        total += itemSubtotal;
        totalItemsCount += item.quantity;
        const isFav = isFavorite(item.id);

        itemsHtml += `
            <div class="cart-item">
                <div class="cart-item-img-wrap" onclick="openProductModal(${item.id})" title="Click to view details">
                    <img src="${resolvedImage}" alt="${item.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=500'">
                </div>
                <div class="cart-item-details">
                    <h4 onclick="openProductModal(${item.id})">${item.name}</h4>
                    <span class="cart-item-cat">${resolvedCat}</span>
                    <span class="cart-item-unit-price">KES ${item.price} <small class="cart-item-qty-mult">× ${item.quantity} = <strong>KES ${itemSubtotal.toLocaleString()}</strong></small></span>
                </div>
                <div class="cart-item-actions">
                    <button type="button" class="btn-cart-fav ${isFav ? 'active' : ''}" onclick="toggleFavorite(${item.id})" title="${isFav ? 'Remove from favorites' : 'Save to favorites'}" aria-label="Favorite">
                        <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                    </button>
                    <div class="cart-qty-ctrl">
                        <button type="button" class="btn-qty" onclick="changeQuantity(${item.id}, -1)" aria-label="Decrease quantity">−</button>
                        <span class="cart-qty-num">${item.quantity}</span>
                        <button type="button" class="btn-qty" onclick="changeQuantity(${item.id}, 1)" aria-label="Increase quantity">+</button>
                    </div>
                    <button type="button" class="btn-cart-del" onclick="removeFromCart(${item.id})" title="Remove item" aria-label="Remove item">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = itemsHtml;

    if (totalElem) totalElem.textContent = `KES ${total.toLocaleString()}`;
    if (summarySubtotal) summarySubtotal.textContent = `KES ${total.toLocaleString()}`;
    if (summaryCount) summaryCount.textContent = totalItemsCount;

    updateCartCount();
}

// CHANGE ITEM QUANTITY IN CART
function changeQuantity(id, delta) {
    id = Number(id);
    const item = cart.find(i => Number(i.id) === id);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
        removeFromCart(id);
    } else {
        saveCart();
    }
}

// REMOVE FROM CART
function removeFromCart(id) {
    id = Number(id);
    const item = cart.find(i => Number(i.id) === id);
    cart = cart.filter(item => Number(item.id) !== id);
    saveCart();
    if (item) {
        showToast(`Removed "${item.name}" from your cart.`, "info", "Cart");
    }
}

// UPDATE CART COUNT BADGE
function updateCartCount() {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const countElems = [
        document.getElementById("cart-count"),
        document.getElementById("nav-cart-count")
    ];
    countElems.forEach(elem => {
        if (elem) elem.textContent = totalCount;
    });
}

// PRODUCT DETAIL PREVIEW MODAL
let currentModalProduct = null;
let currentModalQty = 1;

function openProductModal(id) {
    const product = getCatalogProduct({ id });
    if (!product) return;

    currentModalProduct = product;
    currentModalQty = 1;

    const modal = document.getElementById("product-detail-modal");
    if (!modal) return;

    const imgEl = document.getElementById("modal-product-img");
    const catEl = document.getElementById("modal-product-category");
    const titleEl = document.getElementById("modal-product-title");
    const priceEl = document.getElementById("modal-product-price");
    const descEl = document.getElementById("modal-product-desc");
    const qtyEl = document.getElementById("modal-qty-display");

    const resolvedImage = resolveProductImage(product, product);

    if (imgEl) {
        imgEl.src = resolvedImage;
        imgEl.alt = product.name;
    }
    if (catEl) catEl.textContent = (product.category || "Organic").toUpperCase();
    if (titleEl) titleEl.textContent = product.name;
    if (priceEl) priceEl.textContent = `KES ${product.price.toLocaleString()}`;
    if (qtyEl) qtyEl.textContent = "1";

    const descriptions = {
        Vegetables: `Crisp, pesticide-free organic ${product.name.toLowerCase()} harvested fresh daily from certified sustainable local farms. Packed with vital vitamins and natural minerals for healthy living.`,
        Fruits: `Sun-ripened, juicy organic ${product.name.toLowerCase()} picked at peak sweetness. Naturally rich in dietary fiber and essential antioxidants, delivered fresh to your door.`,
        Dairy: `Pure, fresh organic ${product.name.toLowerCase()} from pasture-raised farms adhering to the strictest quality, hygiene, and ethical standards.`,
        Groceries: `Pantry staple ${product.name.toLowerCase()} packaged with care to retain peak nutritional integrity, aroma, and natural taste for your kitchen.`
    };
    if (descEl) {
        descEl.textContent = descriptions[product.category] || `Farm-fresh, 100% natural organic product harvested under sustainable agricultural practices.`;
    }

    updateModalFavButton(product.id);
    modal.style.display = "flex";
}

function closeProductModal() {
    const modal = document.getElementById("product-detail-modal");
    if (modal) modal.style.display = "none";
}

function adjustModalQty(delta) {
    currentModalQty = Math.max(1, currentModalQty + delta);
    const display = document.getElementById("modal-qty-display");
    if (display) display.textContent = currentModalQty;

    if (currentModalProduct) {
        const total = currentModalProduct.price * currentModalQty;
        const priceEl = document.getElementById("modal-product-price");
        if (priceEl) priceEl.textContent = `KES ${total.toLocaleString()}`;
    }
}

function toggleCurrentModalFavorite() {
    if (!currentModalProduct) return;
    toggleFavorite(currentModalProduct.id);
}

function updateModalFavButton(id) {
    if (!currentModalProduct || currentModalProduct.id !== id) return;
    const isFav = isFavorite(id);
    const favIconBtn = document.getElementById("modal-product-fav-btn");
    const favPillBtn = document.getElementById("modal-fav-toggle-btn");

    if (favIconBtn) {
        favIconBtn.classList.toggle("active", isFav);
        favIconBtn.innerHTML = `<i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i>`;
        favIconBtn.title = isFav ? "Remove from favorites" : "Add to favorites";
    }
    if (favPillBtn) {
        favPillBtn.classList.toggle("active", isFav);
        favPillBtn.innerHTML = `<i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i>`;
        favPillBtn.title = isFav ? "Remove from favorites" : "Add to favorites";
    }
}

function addModalProductToCart() {
    const user = getCurrentUser();
    if (user && user.role === 'admin') {
        showToast("Management Mode: Administrators manage store operations and cannot add items to cart.", "warning", "Admin Restriction");
        return;
    }
    if (!currentModalProduct) return;
    addToCart(currentModalProduct.id, currentModalQty);
    closeProductModal();
}

// WISHLIST / FAVORITES MODAL
function openWishlistModal(event) {
    if (event) event.preventDefault();
    const modal = document.getElementById("wishlist-modal");
    if (!modal) return;
    renderWishlistModal();
    modal.style.display = "flex";
}

function closeWishlistModal() {
    const modal = document.getElementById("wishlist-modal");
    if (modal) modal.style.display = "none";
}

function renderWishlistModal() {
    const container = document.getElementById("wishlist-items-container");
    if (!container) return;

    const favProducts = products.filter(p => isFavorite(p.id));
    if (favProducts.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 15px; color: #64748B;">
                <i class="fa-regular fa-heart" style="font-size: 2.4rem; color: #CBD5E1; margin-bottom: 12px; display: block;"></i>
                <h4 style="font-family: var(--font-display); font-size: 18px; color: var(--dark); margin-bottom: 6px;">No Favorites Yet</h4>
                <p style="font-size: 13.5px; line-height: 1.5;">Click the heart icon on any grocery item to save it to your personal wishlist!</p>
            </div>
        `;
        return;
    }

    const user = getCurrentUser();
    const isAdmin = user && user.role === 'admin';

    let html = "";
    favProducts.forEach(p => {
        const resolvedImage = resolveProductImage(p, p);
        const actionBtn = isAdmin
            ? `<button class="btn btn-outline" style="font-size: 12px;" onclick="showToast('Management Mode: Active for administrator accounts.', 'info')"><i class="fa-solid fa-lock"></i> Manager</button>`
            : `<button class="btn btn-primary" onclick="addToCart(${p.id}); closeWishlistModal();"><i class="fa-solid fa-cart-shopping"></i> Add to Cart</button>`;

        html += `
            <div class="wishlist-item-row">
                <div class="wishlist-img-wrap" onclick="openProductModal(${p.id}); closeWishlistModal();">
                    <img src="${resolvedImage}" alt="${p.name}">
                </div>
                <div class="wishlist-info">
                    <h4>${p.name}</h4>
                    <span class="wishlist-cat">${p.category}</span>
                    <strong class="wishlist-price">KES ${p.price}</strong>
                </div>
                <div class="wishlist-actions">
                    ${actionBtn}
                    <button class="btn-wishlist-remove" onclick="toggleFavorite(${p.id})" title="Remove"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// TOGGLE MOBILE NAVIGATION MENU
function toggleNav() {
    const nav = document.getElementById("main-nav");
    if (nav) {
        nav.classList.toggle("open");
    }
}

// UPDATE ACCOUNT & ROLE STATE IN NAVIGATION
function updateAccountLink() {
    const container = document.getElementById("user-account-container");
    const adminLink = document.getElementById("admin-nav-link");
    const adminPanel = document.getElementById("admin-panel");
    const roleBanner = document.getElementById("role-banner");
    const roleBannerText = document.getElementById("role-banner-text");
    const heroAuthBtn = document.getElementById("hero-auth-btn");

    currentUser = getCurrentUser();

    if (currentUser) {
        const role = currentUser.role || "client";
        const roleBadge = role === "admin"
            ? `<span class="badge badge-admin"><i class="fa-solid fa-shield-halved"></i> Admin</span>`
            : `<span class="badge badge-client"><i class="fa-solid fa-user-check"></i> Client</span>`;

        if (container) {
            container.innerHTML = `
                <div class="user-chip" title="Signed in as ${currentUser.name} (${role})">
                    ${roleBadge}
                    <span class="user-name">${currentUser.name}</span>
                    <button class="btn-logout" onclick="logout()" title="Sign Out">
                        <i class="fa-solid fa-arrow-right-from-bracket"></i>
                    </button>
                </div>
            `;
        }

        if (roleBanner && roleBannerText) {
            roleBanner.style.display = "block";
            roleBannerText.innerHTML = `<i class="fa-solid fa-circle-user"></i> Signed in as: <strong>${currentUser.name}</strong> (${role.toUpperCase()})`;
        }

        if (heroAuthBtn) {
            heroAuthBtn.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> Switch Role / Account`;
        }

        if (role === "admin") {
            if (adminLink) adminLink.style.display = "inline-flex";
            if (adminPanel) {
                adminPanel.style.display = "block";
                renderAdminDashboard();
            }
        } else {
            if (adminLink) adminLink.style.display = "none";
            if (adminPanel) adminPanel.style.display = "none";
        }
    } else {
        if (container) {
            container.innerHTML = `
                <a href="login.html" class="btn btn-nav-login" title="Login / Register" aria-label="Login / Register">
                    <i class="fa-solid fa-right-to-bracket"></i>
                    <span class="nav-login-text">Login / Register</span>
                </a>
            `;
        }

        if (roleBanner) roleBanner.style.display = "none";
        if (adminLink) adminLink.style.display = "none";
        if (adminPanel) adminPanel.style.display = "none";

        if (heroAuthBtn) {
            heroAuthBtn.innerHTML = `<i class="fa-solid fa-user-lock"></i> Account & Roles`;
        }
    }

    displayProducts();
    displayCart();
}

// LOGOUT
function logout() {
    localStorage.removeItem("currentUser");
    currentUser = null;
    updateAccountLink();
    showToast("You have logged out successfully.", "info", "Signed Out");
}

// CHECKOUT (Restricted for Store Managers/Admins)
function checkout() {
    const user = getCurrentUser();

    if (user && user.role === 'admin') {
        showToast("Management Mode: Administrators manage store operations and cannot place customer orders. Sign in with a client account to test checkout.", "warning", "Admin Restriction");
        return;
    }

    if (cart.length === 0) {
        showToast("Your cart is empty! Please add groceries before checkout.", "warning", "Empty Cart");
        return;
    }

    if (!user) {
        showToast("Please log in with your client account to proceed with your order.", "warning", "Sign In Required");
        window.location.href = "login.html";
        return;
    }

    const checkoutUser = document.getElementById("checkout-user");
    if (checkoutUser) {
        checkoutUser.innerHTML = `
            <strong>Ordering as:</strong> ${user.name} (${(user.role || 'client').toUpperCase()})<br>
            <small>${user.email}</small>
        `;
    }

    document.getElementById("checkout-modal").style.display = "flex";
}

function closeCheckout() {
    const modal = document.getElementById("checkout-modal");
    if (modal) modal.style.display = "none";
}

// INITIATE ORDER VERIFICATION VIA RESEND EMAIL (Step 1 of Checkout)
let pendingOrderPayload = null;

async function initiateOrderVerification() {
    const user = getCurrentUser();
    if (!user) return;

    const address = document.getElementById("delivery-address").value.trim();
    const phone = document.getElementById("delivery-phone").value.trim();
    const payment = document.getElementById("payment-method").value;

    if (!address || !phone) {
        showToast("Please provide both delivery address and contact phone number.", "warning", "Missing Information");
        return;
    }

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    pendingOrderPayload = {
        customer: user.name,
        email: user.email,
        products: [...cart],
        total,
        address,
        phone,
        payment
    };

    showToast("Sending 6-digit confirmation code to your email...", "info", "Security Verification");

    try {
        const res = await fetch('/api/orders?action=send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer: user.name,
                email: user.email,
                total
            })
        });

        const data = await res.json();

        if (data.success) {
            closeCheckout();
            const verifyModal = document.getElementById("order-verify-modal");
            const emailDisplay = document.getElementById("verify-email-display");
            const demoHint = document.getElementById("verify-demo-hint");

            if (emailDisplay) emailDisplay.textContent = user.email;
            if (demoHint) {
                if (data.demoCode) {
                    demoHint.textContent = `(Dev Mode Code: ${data.demoCode} or 123456)`;
                } else {
                    demoHint.textContent = `(Check your email inbox or spam folder)`;
                }
            }

            const otpInput = document.getElementById("order-otp-code");
            if (otpInput) {
                otpInput.value = data.demoCode || "";
                otpInput.focus();
            }

            if (verifyModal) verifyModal.style.display = "flex";
            showToast(`Verification code sent to ${user.email}!`, "success", "Code Sent");
        } else {
            showToast(data.message || "Failed to dispatch verification email.", "error", "Verification Error");
        }
    } catch (err) {
        console.error(err);
        showToast("Network error contacting verification service.", "error", "Network Error");
    }
}

function closeOrderVerifyModal() {
    const modal = document.getElementById("order-verify-modal");
    if (modal) modal.style.display = "none";
}

async function resendVerificationCode() {
    if (!pendingOrderPayload) return;
    showToast("Resending verification code...", "info", "Resend OTP");
    await initiateOrderVerification();
}

// CONFIRM AND COMPLETE ORDER WITH OTP (Step 2 of Checkout)
async function confirmOrderWithCode() {
    if (!pendingOrderPayload) {
        showToast("No active order session found. Please try checking out again.", "error", "Session Error");
        closeOrderVerifyModal();
        return;
    }

    const otpInput = document.getElementById("order-otp-code");
    const code = (otpInput ? otpInput.value : "").trim();

    if (!code || code.length < 4) {
        showToast("Please enter the 6-digit confirmation code from your email.", "warning", "Code Required");
        return;
    }

    const payload = {
        ...pendingOrderPayload,
        verificationCode: code
    };

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.success) {
            cart = [];
            saveCart();
            closeOrderVerifyModal();
            pendingOrderPayload = null;

            showToast(data.message || `Order confirmed! Thank you for shopping with FreshBasket.`, "success", "Order Placed");

            const user = getCurrentUser();
            if (user && user.role === "admin") {
                renderAdminDashboard();
            }
        } else {
            showToast(data.message || "Invalid or expired verification code.", "error", "Verification Failed");
        }
    } catch (err) {
        console.error(err);
        showToast("Network error connecting to backend service.", "error", "Network Error");
    }
}

// RENDER ADMIN DASHBOARD WITH LIVE BACKEND DATA & PREVIOUS RECORDS
async function renderAdminDashboard() {
    const productsCount = document.getElementById("stat-products-count");
    const ordersCount = document.getElementById("stat-orders-count");
    const revenueTotal = document.getElementById("stat-revenue-total");
    const inventoryCount = document.getElementById("inventory-count");
    const inventoryTable = document.getElementById("admin-inventory-list");

    try {
        const [statsRes, ordersRes] = await Promise.all([
            fetch('/api/stats').then(r => r.json()),
            fetch('/api/orders').then(r => r.json())
        ]);

        if (statsRes.success) {
            if (productsCount) productsCount.textContent = statsRes.stats.totalProducts;
            if (ordersCount) ordersCount.textContent = statsRes.stats.totalOrders;
            if (revenueTotal) revenueTotal.textContent = statsRes.stats.totalRevenue.toLocaleString();
            if (inventoryCount) inventoryCount.textContent = statsRes.stats.totalProducts;
        }

        if (ordersRes.success && ordersRes.orders) {
            adminOrdersData = ordersRes.orders;
            renderAdminOrdersList(adminOrdersData);
        }
    } catch (err) {
        console.error("Error updating admin stats from Node.js API:", err);
    }

    // Render Inventory Table
    if (inventoryTable) {
        inventoryTable.innerHTML = "";
        products.forEach(p => {
            inventoryTable.innerHTML += `
                <tr>
                    <td><img src="${p.image}" class="table-img" alt="${p.name}" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=500'"></td>
                    <td><strong>${p.name}</strong></td>
                    <td><span class="badge" style="background:#EBF3E4; color:#05A648;">${p.category}</span></td>
                    <td>KES ${p.price.toLocaleString()}</td>
                    <td>
                        <button class="btn-delete-prod" onclick="adminDeleteProduct(${p.id})">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        });
    }
}

// RENDER PREVIOUS RECORDS LIST WITH STATUS & ACTIONS
function renderAdminOrdersList(ordersList) {
    const ordersTable = document.getElementById("admin-orders-list");
    if (!ordersTable) return;

    ordersTable.innerHTML = "";

    if (!ordersList || ordersList.length === 0) {
        ordersTable.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding: 28px; color: #888;">
                    <i class="fa-solid fa-inbox" style="font-size: 24px; color: #cbd5e1; margin-bottom: 8px; display:block;"></i>
                    No previous order records match your query.
                </td>
            </tr>
        `;
        return;
    }

    ordersList.forEach(o => {
        const orderNum = o.order_number || o.id;
        const itemsSummary = (o.products || []).map(i => `${i.name} (×${i.quantity})`).join(", ") || "General Order";
        const currentStatus = o.status || 'Pending';

        let statusBadgeClass = 'badge-client';
        if (currentStatus === 'Confirmed') statusBadgeClass = 'badge-admin';
        if (currentStatus === 'Dispatched') statusBadgeClass = 'badge-warning';
        if (currentStatus === 'Delivered') statusBadgeClass = 'badge-success';

        ordersTable.innerHTML += `
            <tr>
                <td><strong>#${orderNum}</strong></td>
                <td><small>${o.date}</small></td>
                <td><strong>${o.customer}</strong><br><small style="color: #64748B;">${o.email || o.phone}</small></td>
                <td style="max-width: 220px; font-size: 13px;">${itemsSummary}</td>
                <td><strong style="color: #059669;">KES ${(o.total || 0).toLocaleString()}</strong></td>
                <td>
                    <select class="admin-status-select" onchange="adminUpdateOrderStatus('${orderNum}', this.value)" style="padding: 4px 8px; border: 1px solid #E2ECE5; border-radius: 6px; font-size: 12px; font-weight: 600; background: #fff; cursor: pointer;">
                        <option value="Pending" ${currentStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Confirmed" ${currentStatus === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="Dispatched" ${currentStatus === 'Dispatched' ? 'selected' : ''}>Dispatched</option>
                        <option value="Delivered" ${currentStatus === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                </td>
                <td>
                    <button class="btn btn-outline" onclick="adminViewOrderDetails('${orderNum}')" style="padding: 5px 10px; font-size: 12px;">
                        <i class="fa-solid fa-eye"></i> Details
                    </button>
                </td>
            </tr>
        `;
    });
}

// SEARCH PREVIOUS RECORDS
function handleAdminOrdersSearch(query) {
    const q = (query || "").toLowerCase().trim();
    if (!q) {
        renderAdminOrdersList(adminOrdersData);
        return;
    }

    const filtered = adminOrdersData.filter(o => {
        const orderNum = (o.order_number || o.id || "").toLowerCase();
        const cust = (o.customer || "").toLowerCase();
        const mail = (o.email || "").toLowerCase();
        const phone = (o.phone || "").toLowerCase();
        const itemsStr = (o.products || []).map(p => p.name).join(" ").toLowerCase();
        return orderNum.includes(q) || cust.includes(q) || mail.includes(q) || phone.includes(q) || itemsStr.includes(q);
    });

    renderAdminOrdersList(filtered);
}

// FILTER PREVIOUS RECORDS BY STATUS
function filterAdminOrdersByStatus(status) {
    if (!status || status === 'all') {
        renderAdminOrdersList(adminOrdersData);
        return;
    }
    const filtered = adminOrdersData.filter(o => (o.status || 'Pending').toLowerCase() === status.toLowerCase());
    renderAdminOrdersList(filtered);
}

// UPDATE ORDER STATUS (PUT /api/orders)
async function adminUpdateOrderStatus(orderNumber, newStatus) {
    try {
        const res = await fetch('/api/orders', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderNumber, status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
            const found = adminOrdersData.find(o => (o.order_number || o.id) === orderNumber);
            if (found) found.status = newStatus;
            showToast(`Order #${orderNumber} marked as ${newStatus}.`, "success", "Status Updated");
        } else {
            showToast(data.message || "Failed to update status.", "error", "Update Error");
        }
    } catch (e) {
        showToast("Network error updating order status.", "error", "Network Error");
    }
}

// VIEW DETAILED PREVIOUS RECORD MODAL
function adminViewOrderDetails(orderNumber) {
    const order = adminOrdersData.find(o => (o.order_number || o.id) === orderNumber);
    if (!order) return;

    const modal = document.getElementById("admin-order-modal");
    const numEl = document.getElementById("modal-order-number");
    const dateEl = document.getElementById("modal-order-date");
    const badgeEl = document.getElementById("modal-order-status-badge");
    const bodyEl = document.getElementById("modal-order-details-body");

    if (numEl) numEl.textContent = `#${orderNumber}`;
    if (dateEl) dateEl.textContent = `Recorded on: ${order.date || 'N/A'}`;
    if (badgeEl) {
        badgeEl.textContent = order.status || 'Pending';
        badgeEl.className = `badge badge-${(order.status === 'Delivered' ? 'success' : (order.status === 'Dispatched' ? 'warning' : 'admin'))}`;
    }

    let itemsRows = '';
    (order.products || []).forEach(item => {
        const sub = (item.price || 0) * (item.quantity || 1);
        itemsRows += `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px;">
                <span>${item.name} <strong style="color: #64748B;">× ${item.quantity}</strong></span>
                <span style="font-weight: 600; color: #123824;">KES ${sub.toLocaleString()}</span>
            </div>
        `;
    });

    if (bodyEl) {
        bodyEl.innerHTML = `
            <div style="background: #F8FAF9; padding: 16px; border-radius: 12px; margin-bottom: 16px; border: 1px solid #E2ECE5;">
                <h4 style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; color: #64748B;">Customer & Fulfillment Information</h4>
                <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>Customer Name:</strong> ${order.customer}</p>
                <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>Customer Email:</strong> ${order.email || 'N/A'}</p>
                <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>Contact Phone:</strong> ${order.phone || 'N/A'}</p>
                <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>Delivery Address:</strong> ${order.address || 'N/A'}</p>
                <p style="margin: 0; font-size: 14px;"><strong>Payment Method:</strong> ${order.payment || 'Cash on Delivery'}</p>
            </div>

            <div style="margin-bottom: 16px;">
                <h4 style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; color: #64748B;">Itemized Breakdown</h4>
                ${itemsRows}
                <div style="display: flex; justify-content: space-between; padding: 12px 0 0 0; font-size: 16px; font-weight: 700; color: #123824;">
                    <span>Total Amount</span>
                    <span style="color: #059669; font-size: 18px;">KES ${(order.total || 0).toLocaleString()}</span>
                </div>
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button class="btn btn-outline" onclick="closeAdminOrderModal()">Close</button>
            </div>
        `;
    }

    if (modal) modal.style.display = "flex";
}

function closeAdminOrderModal() {
    const modal = document.getElementById("admin-order-modal");
    if (modal) modal.style.display = "none";
}

// ADMIN: ADD PRODUCT VIA BACKEND POST /api/products
async function handleAdminAddProduct(event) {
    event.preventDefault();
    const name = document.getElementById("prod-name").value.trim();
    const category = document.getElementById("prod-category").value;
    const price = parseFloat(document.getElementById("prod-price").value);
    let image = document.getElementById("prod-image").value.trim();

    if (!name || isNaN(price) || price <= 0) {
        showToast("Please enter a valid product name and price.", "warning", "Validation Error");
        return;
    }

    if (!image) {
        const fallbacks = {
            Vegetables: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500",
            Fruits: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=500",
            Dairy: "https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?w=500",
            Groceries: "https://images.unsplash.com/photo-1584473457406-6240486418e9?w=500"
        };
        image = fallbacks[category] || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500";
    }

    try {
        const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, category, price, image })
        });

        const data = await res.json();

        if (data.success) {
            showToast(data.message || `Product "${name}" added to catalog!`, "success", "Catalog Updated");
            document.getElementById("admin-add-form").reset();
            await fetchProducts();
            renderAdminDashboard();
        } else {
            showToast(data.message || "Failed to add product.", "error", "Add Product Error");
        }
    } catch (err) {
        console.error(err);
        showToast("Network error connecting to backend API.", "error", "Network Error");
    }
}

// ADMIN: DELETE PRODUCT VIA BACKEND DELETE /api/products/:id
async function adminDeleteProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    if (!confirm(`Are you sure you want to delete "${product.name}" from the store catalog?`)) {
        return;
    }

    try {
        const res = await fetch(`/api/products/${id}`, {
            method: 'DELETE'
        });

        const data = await res.json();

        if (data.success) {
            showToast(data.message || `Product "${product.name}" deleted.`, "success", "Product Removed");
            await fetchProducts();
            renderAdminDashboard();
        } else {
            showToast(data.message || "Failed to delete product.", "error", "Delete Failed");
        }
    } catch (err) {
        console.error(err);
        showToast("Network error deleting product.", "error", "Network Error");
    }
}

// DYNAMIC COPYRIGHT YEAR
function updateCopyright() {
    const yearElem = document.getElementById("copyright-year");
    if (yearElem) {
        yearElem.textContent = new Date().getFullYear();
    }
}

// GLASS EFFECT ON SCROLL FOR NAVIGATION BAR
function initScrollHeader() {
    const header = document.querySelector("header");
    if (!header) return;

    const handleScroll = () => {
        const scrollPos = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        if (scrollPos > 10) {
            header.classList.add("header-scrolled");
        } else {
            header.classList.remove("header-scrolled");
        }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
}

// DYNAMIC HERO SLIDER WITH TYPEWRITER ANIMATION (Business Friendly Terms)
const HERO_SLIDES = [
    {
        title: "Our Garden's Most Favorite Food",
        highlight: "Garden's",
        subtitle: "Fresh organic groceries, vegetables, and household essentials directly from the farm to your door."
    },
    {
        title: "100% Certified Organic Quality Farm Harvest",
        highlight: "Organic",
        subtitle: "Sustainably cultivated, ethically sourced produce handpicked daily for peak nutrition and flavor."
    },
    {
        title: "Express Doorstep Fresh Groceries Delivery",
        highlight: "Doorstep",
        subtitle: "Same-day farm-to-table delivery across Kenya with real-time order tracking and secure M-Pesa payments."
    }
];

let heroSlideInterval = null;
let currentHeroSlideIndex = 0;
let heroTypewriterTimer = null;

function typeHeroContent(slideData) {
    if (heroTypewriterTimer) clearTimeout(heroTypewriterTimer);
    const titleEl = document.getElementById("hero-title");
    const subtitleEl = document.getElementById("hero-subtitle");
    if (!titleEl || !slideData) return;

    const fullTitle = slideData.title;
    const highlight = slideData.highlight;
    let charIdx = 0;

    titleEl.innerHTML = `<span class="hero-typewriter-cursor">|</span>`;
    if (subtitleEl) subtitleEl.style.opacity = '0.35';

    function step() {
        if (charIdx <= fullTitle.length) {
            const current = fullTitle.slice(0, charIdx);
            let formatted = current;
            if (highlight && current.includes(highlight)) {
                formatted = current.replace(highlight, `<span class="highlight-green">${highlight}</span>`);
            }
            titleEl.innerHTML = `${formatted}<span class="hero-typewriter-cursor">|</span>`;
            charIdx++;
            heroTypewriterTimer = setTimeout(step, 24);
        } else {
            let finalFormatted = fullTitle;
            if (highlight && fullTitle.includes(highlight)) {
                finalFormatted = fullTitle.replace(highlight, `<span class="highlight-green">${highlight}</span>`);
            }
            titleEl.innerHTML = finalFormatted;
            if (subtitleEl) {
                subtitleEl.textContent = slideData.subtitle;
                subtitleEl.style.transition = 'opacity 0.4s ease';
                subtitleEl.style.opacity = '1';
            }
        }
    }
    step();
}

function setHeroSlide(index) {
    const slides = document.querySelectorAll(".hero-bg-slide");
    const dots = document.querySelectorAll(".hero-carousel-dots .dot");
    if (!slides || slides.length === 0) return;

    slides.forEach((s, idx) => {
        if (idx === index) {
            s.classList.add("active");
        } else {
            s.classList.remove("active");
        }
    });

    if (dots && dots.length > 0) {
        dots.forEach((d, idx) => {
            if (idx === index) {
                d.classList.add("active");
            } else {
                d.classList.remove("active");
            }
        });
    }

    currentHeroSlideIndex = index;
    typeHeroContent(HERO_SLIDES[index % HERO_SLIDES.length]);
}

function initHeroBackgroundSlider() {
    const slides = document.querySelectorAll(".hero-bg-slide");
    if (!slides || slides.length < 2) return;

    if (heroSlideInterval) clearInterval(heroSlideInterval);

    // Initial typewriter on page load
    typeHeroContent(HERO_SLIDES[0]);

    heroSlideInterval = setInterval(() => {
        const nextIndex = (currentHeroSlideIndex + 1) % slides.length;
        setHeroSlide(nextIndex);
    }, 7000);
}

// INITIALIZE STORE ON PAGE LOAD
syncCartWithProducts();
fetchProducts();
displayCart();
updateAccountLink();
updateCopyright();
initScrollHeader();
initHeroBackgroundSlider();
initCategoryAutoScroll();

// AUTO-CLOSE MOBILE MENU ON LINK CLICK
document.querySelectorAll("#main-nav a").forEach(link => {
    link.addEventListener("click", () => {
        const nav = document.getElementById("main-nav");
        if (nav && nav.classList.contains("open")) {
            toggleNav();
        }
    });
});
