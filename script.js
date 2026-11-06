// GLOBAL STATE
let products = [];
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let currentUser = JSON.parse(localStorage.getItem("currentUser")) || null;
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

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
    } else {
        favorites.push(id);
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
    const badge = document.getElementById("wishlist-count");
    if (badge) badge.textContent = count;
}

// FETCH PRODUCTS FROM NODE.JS BACKEND API
async function fetchProducts() {
    try {
        const response = await fetch('/api/products');
        const data = await response.json();
        if (data.success && Array.isArray(data.products)) {
            products = data.products;
            localStorage.setItem("products", JSON.stringify(products));
        }
    } catch (err) {
        console.warn("Node.js API unavailable, loading cached products:", err);
        products = JSON.parse(localStorage.getItem("products")) || [];
    }
    displayProducts(products);
    updateWishlistBadges();
}

// MOBILE NAVIGATION TOGGLE
function toggleNav() {
    const nav = document.getElementById("main-nav");
    const icon = document.getElementById("toggle-icon");
    const subNav = document.querySelector(".sub-nav-bar");
    if (!nav) return;
    nav.classList.toggle("open");
    if (subNav) subNav.classList.toggle("open");
    if (nav.classList.contains("open")) {
        if (icon) icon.className = "fa-solid fa-xmark";
    } else {
        if (icon) icon.className = "fa-solid fa-bars";
    }
}

// DISPLAY PRODUCTS IN STOREFRONT
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

    list.forEach(product => {
        const oldPrice = Math.round(product.price * 1.25);
        const isFav = isFavorite(product.id);
        container.innerHTML += `
            <div class="product">
                <button type="button" class="product-fav-btn ${isFav ? 'active' : ''}" data-id="${product.id}" onclick="event.stopPropagation(); toggleFavorite(${product.id})" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}" aria-label="Favorite">
                    <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                </button>
                <div class="product-img-box" onclick="openProductModal(${product.id})" title="Click to view ${product.name} details">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=500'">
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
                <button class="btn-add-cart" onclick="addToCart(${product.id})">
                    <i class="fa-solid fa-cart-shopping" aria-hidden="true"></i> Add to Cart
                </button>
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
    const speedPerSecond = 26; // pixels per second - smooth, steady, continuous
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

    // Pointer drag / swipe support
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

// ADD TO CART
function addToCart(id, qty = 1) {
    id = Number(id);
    const product = products.find(item => item.id === id);
    if (!product) return;

    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.quantity += qty;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            category: product.category,
            quantity: qty
        });
    }

    saveCart();
    alert(`Added ${qty > 1 ? qty + ' × ' : ''}"${product.name}" to your cart!`);
}

// SAVE CART
function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
    displayCart();
}

// CLEAR CART
function clearCart() {
    if (cart.length === 0) return;
    if (confirm("Are you sure you want to remove all items from your cart?")) {
        cart = [];
        saveCart();
    }
}

// DISPLAY CART WITH THUMBNAILS, KES PRICING, AND FAVORITE TOGGLE
function displayCart() {
    const container = document.getElementById("cart-items");
    const totalElem = document.getElementById("total");
    const summarySubtotal = document.getElementById("summary-subtotal");
    const summaryCount = document.getElementById("cart-summary-count");
    const clearBtn = document.getElementById("btn-clear-cart");

    if (!container) return;

    container.innerHTML = "";

    let total = 0;
    let count = 0;

    if (cart.length === 0) {
        if (clearBtn) clearBtn.style.display = "none";
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fa-solid fa-basket-shopping" style="font-size: 2.4rem; color: #05A648; margin-bottom: 12px; display: block;" aria-hidden="true"></i>
                <h4>Your Cart is Empty</h4>
                <p>You haven't added any fresh groceries to your cart yet. Explore our farm fresh catalog above!</p>
                <a href="#products" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-leaf"></i> Browse Fresh Products
                </a>
            </div>
        `;
    } else {
        if (clearBtn) clearBtn.style.display = "inline-flex";

        cart.forEach(item => {
            const subtotal = item.price * item.quantity;
            total += subtotal;
            count += item.quantity;

            // Fallback for image and category
            const catalogProd = products.find(p => p.id === item.id);
            const itemImg = item.image || (catalogProd ? catalogProd.image : 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500');
            const itemCat = item.category || (catalogProd ? catalogProd.category : 'Organic Groceries');
            const isFav = isFavorite(item.id);

            container.innerHTML += `
                <div class="cart-item">
                    <div class="cart-item-img-wrap" onclick="openProductModal(${item.id})" title="Click to view ${item.name} details">
                        <img src="${itemImg}" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=500'">
                        <span class="img-preview-hint"><i class="fa-solid fa-magnifying-glass-plus"></i></span>
                    </div>

                    <div class="cart-item-details">
                        <h4 class="cart-item-title" onclick="openProductModal(${item.id})" title="Click to view details">${item.name}</h4>
                        <span class="cart-item-cat">${itemCat}</span>
                        <div class="cart-item-price-tag">
                            <span class="unit-price">KES ${item.price}</span>
                            <span class="price-multiplier">× ${item.quantity} = <strong>KES ${subtotal.toLocaleString()}</strong></span>
                        </div>
                    </div>

                    <div class="cart-item-actions">
                        <button type="button" class="btn-fav-toggle ${isFav ? 'active' : ''}" onclick="toggleFavorite(${item.id})" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}" aria-label="Favorite">
                            <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                        </button>

                        <div class="quantity-controls">
                            <button type="button" onclick="changeQuantity(${item.id}, -1)" title="Decrease" aria-label="Decrease quantity"><i class="fa-solid fa-minus" aria-hidden="true"></i></button>
                            <span class="item-qty">${item.quantity}</span>
                            <button type="button" onclick="changeQuantity(${item.id}, 1)" title="Increase" aria-label="Increase quantity"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>
                        </div>

                        <button type="button" class="btn-remove" onclick="removeItem(${item.id})" title="Remove item" aria-label="Remove ${item.name} from cart">
                            <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>
            `;
        });
    }

    if (totalElem) totalElem.textContent = `KES ${total.toLocaleString()}`;
    if (summarySubtotal) summarySubtotal.textContent = `KES ${total.toLocaleString()}`;
    if (summaryCount) summaryCount.textContent = count;

    const countEl = document.getElementById("cart-count");
    const mobileCountEl = document.getElementById("mobile-cart-count");
    if (countEl) countEl.textContent = count;
    if (mobileCountEl) mobileCountEl.textContent = count;
}

// PRODUCT DETAIL PREVIEW MODAL (Matching Ref Design Screen 2)
let currentModalProduct = null;
let currentModalQty = 1;

function openProductModal(id) {
    id = Number(id);
    const product = products.find(p => p.id === id);
    if (!product) return;

    currentModalProduct = product;
    currentModalQty = 1;

    const modal = document.getElementById("product-detail-modal");
    if (!modal) return;

    const imgEl = document.getElementById("modal-product-img");
    const titleEl = document.getElementById("modal-product-title");
    const catEl = document.getElementById("modal-product-cat");
    const priceEl = document.getElementById("modal-product-price");
    const qtyDisplay = document.getElementById("modal-qty-display");
    const descEl = document.getElementById("modal-product-desc");

    if (imgEl) imgEl.src = product.image;
    if (titleEl) titleEl.textContent = product.name;
    if (catEl) catEl.textContent = product.category;
    if (priceEl) priceEl.textContent = `KES ${product.price.toLocaleString()}`;
    if (qtyDisplay) qtyDisplay.textContent = currentModalQty;

    // Organic farm descriptions tailored to category
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
        favPillBtn.innerHTML = `<i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i> ${isFav ? 'Favorited' : 'Favorite'}`;
    }
}

function addModalProductToCart() {
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

    container.innerHTML = favProducts.map(p => `
        <div class="wishlist-item">
            <img src="${p.image}" alt="${p.name}" onclick="closeWishlistModal(); openProductModal(${p.id});" style="cursor: pointer;" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=500'">
            <div class="wishlist-item-info">
                <h4 onclick="closeWishlistModal(); openProductModal(${p.id});" style="cursor: pointer;">${p.name}</h4>
                <span class="price">KES ${p.price}</span>
            </div>
            <button class="btn-wishlist-add-cart" onclick="addToCart(${p.id}); closeWishlistModal();">
                <i class="fa-solid fa-cart-shopping"></i> Add
            </button>
            <button class="btn-wishlist-remove" onclick="toggleFavorite(${p.id})" title="Remove from favorites" aria-label="Remove">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    `).join("");
}

// CHANGE QUANTITY
function changeQuantity(id, amount) {
    const item = cart.find(product => product.id === id);
    if (!item) return;

    item.quantity += amount;
    if (item.quantity <= 0) {
        removeItem(id);
        return;
    }
    saveCart();
}

// REMOVE ITEM
function removeItem(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
}

// UPDATE ACCOUNT & ROLE STATE IN NAVIGATION
function updateAccountLink() {
    const container = document.getElementById("account-link");
    const adminLink = document.getElementById("admin-nav-link");
    const adminPanel = document.getElementById("admin-panel");
    const roleBanner = document.getElementById("role-banner");
    const roleBannerText = document.getElementById("role-banner-text");
    const heroAuthBtn = document.getElementById("hero-auth-btn");

    if (currentUser) {
        const role = currentUser.role || "client";
        const roleBadge = role === "admin"
            ? `<span class="badge badge-admin"><i class="fa-solid fa-shield-halved"></i> Admin</span>`
            : `<span class="badge badge-client"><i class="fa-solid fa-user"></i> Client</span>`;

        if (container) {
            container.innerHTML = `
                <div class="user-chip" title="Signed in as ${currentUser.name} (${role})">
                    ${roleBadge}
                    <span class="user-chip-name">${currentUser.name}</span>
                    <button class="btn-logout" onclick="logout()" title="Logout" aria-label="Logout"><i class="fa-solid fa-right-from-bracket"></i></button>
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
}

// LOGOUT
function logout() {
    localStorage.removeItem("currentUser");
    currentUser = null;
    updateAccountLink();
    alert("You have logged out successfully.");
}

// CHECKOUT
function checkout() {
    if (cart.length === 0) {
        alert("Your cart is empty! Please add groceries before checkout.");
        return;
    }

    if (!currentUser) {
        alert("Please log in with your client or admin account to proceed with your order.");
        window.location.href = "login.html";
        return;
    }

    const checkoutUser = document.getElementById("checkout-user");
    if (checkoutUser) {
        checkoutUser.innerHTML = `
            <strong>Ordering as:</strong> ${currentUser.name} (${(currentUser.role || 'client').toUpperCase()})<br>
            <small>${currentUser.email}</small>
        `;
    }

    document.getElementById("checkout-modal").style.display = "flex";
}

// CLOSE CHECKOUT
function closeCheckout() {
    document.getElementById("checkout-modal").style.display = "none";
}

// PLACE ORDER TO NODE.JS BACKEND
async function placeOrder() {
    const address = document.getElementById("delivery-address").value.trim();
    const phone = document.getElementById("delivery-phone").value.trim();
    const payment = document.getElementById("payment-method").value;

    if (!address || !phone) {
        alert("Please provide both delivery address and contact phone number.");
        return;
    }

    const orderPayload = {
        customer: currentUser.name,
        email: currentUser.email,
        products: [...cart],
        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        address: address,
        phone: phone,
        payment: payment
    };

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });

        const data = await res.json();

        if (data.success) {
            cart = [];
            saveCart();
            closeCheckout();
            alert(data.message || `Order placed successfully! Thank you for shopping with FreshBasket.`);

            if (currentUser && currentUser.role === "admin") {
                renderAdminDashboard();
            }
        } else {
            alert(data.message || "Failed to place order.");
        }
    } catch (err) {
        console.error(err);
        alert("Network error connecting to Node.js backend.");
    }
}

// RENDER ADMIN DASHBOARD WITH LIVE BACKEND DATA
async function renderAdminDashboard() {
    const productsCount = document.getElementById("stat-products-count");
    const ordersCount = document.getElementById("stat-orders-count");
    const revenueTotal = document.getElementById("stat-revenue-total");
    const inventoryCount = document.getElementById("inventory-count");
    const inventoryTable = document.getElementById("admin-inventory-list");
    const ordersTable = document.getElementById("admin-orders-list");

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

        if (ordersTable && ordersRes.success) {
            ordersTable.innerHTML = "";
            if (!ordersRes.orders || ordersRes.orders.length === 0) {
                ordersTable.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align:center; padding: 25px; color: #888;">
                            No customer orders received yet. Place an order in client mode to test!
                        </td>
                    </tr>
                `;
            } else {
                ordersRes.orders.forEach(o => {
                    const itemsList = o.products.map(i => `${i.name} (x${i.quantity})`).join(", ");
                    ordersTable.innerHTML += `
                        <tr>
                            <td><small>${o.date}</small></td>
                            <td><strong>${o.customer}</strong><br><small>${o.email}</small></td>
                            <td>${itemsList}</td>
                            <td>${o.address}<br><small>${o.phone}</small></td>
                            <td><span class="badge" style="background:#dbeafe; color:#1e40af;">${o.payment}</span></td>
                            <td><strong>KES ${o.total.toLocaleString()}</strong></td>
                        </tr>
                    `;
                });
            }
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

// ADMIN: ADD PRODUCT VIA BACKEND POST /api/products
async function handleAdminAddProduct(event) {
    event.preventDefault();
    const name = document.getElementById("prod-name").value.trim();
    const category = document.getElementById("prod-category").value;
    const price = parseFloat(document.getElementById("prod-price").value);
    let image = document.getElementById("prod-image").value.trim();

    if (!name || isNaN(price) || price <= 0) {
        alert("Please enter a valid product name and price.");
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
            alert(data.message || `Product "${name}" added to the store catalog!`);
            document.getElementById("admin-add-form").reset();
            await fetchProducts();
            renderAdminDashboard();
        } else {
            alert(data.message || "Failed to add product.");
        }
    } catch (err) {
        console.error(err);
        alert("Network error connecting to Node.js backend.");
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
            alert(data.message || `Product deleted.`);
            await fetchProducts();
            renderAdminDashboard();
        } else {
            alert(data.message || "Failed to delete product.");
        }
    } catch (err) {
        console.error(err);
        alert("Network error deleting product.");
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

// CONSTANTLY CHANGING HERO BACKGROUND SLIDER
let heroSlideInterval = null;
let currentHeroSlideIndex = 0;

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
}

function initHeroBackgroundSlider() {
    const slides = document.querySelectorAll(".hero-bg-slide");
    if (!slides || slides.length < 2) return;

    if (heroSlideInterval) clearInterval(heroSlideInterval);

    heroSlideInterval = setInterval(() => {
        const nextIndex = (currentHeroSlideIndex + 1) % slides.length;
        setHeroSlide(nextIndex);
    }, 7000);
}

// INITIALIZE STORE ON PAGE LOAD
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
