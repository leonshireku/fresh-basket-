// GLOBAL STATE
let products = [];
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let currentUser = JSON.parse(localStorage.getItem("currentUser")) || null;

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
        container.innerHTML += `
            <div class="product">
                <div class="product-img-box">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=500'">
                </div>
                <div class="product-rating">
                    <i class="fa-solid fa-star"></i>
                    <i class="fa-solid fa-star"></i>
                    <i class="fa-solid fa-star"></i>
                    <i class="fa-solid fa-star"></i>
                    <i class="fa-solid fa-star"></i>
                </div>
                <h3>${product.name}</h3>
                <div class="product-cat-label">${product.category}</div>
                <div class="product-pricing">
                    <strong>KSh ${product.price}</strong>
                    <span class="old-price">KSh ${oldPrice}</span>
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

// SCROLL CATEGORIES ARROWS
function scrollCategories(offset) {
    const track = document.getElementById("category-icon-track");
    if (track) {
        track.scrollBy({ left: offset, behavior: "smooth" });
    }
}

// ADD TO CART
function addToCart(id) {
    const product = products.find(item => item.id === id);
    if (!product) return;

    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }

    saveCart();
    alert(product.name + " added to cart!");
}

// SAVE CART
function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
    displayCart();
}

// DISPLAY CART
function displayCart() {
    const container = document.getElementById("cart-items");
    if (!container) return;

    container.innerHTML = "";

    let total = 0;
    let count = 0;

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fa-solid fa-basket-shopping" style="font-size: 2.2rem; color: #05A648; margin-bottom: 8px; display: block;" aria-hidden="true"></i>
                <p>Your shopping cart is currently empty. Explore our fresh products above!</p>
            </div>
        `;
    } else {
        cart.forEach(item => {
            const subtotal = item.price * item.quantity;
            total += subtotal;
            count += item.quantity;

            container.innerHTML += `
                <div class="cart-item">
                    <span><strong>${item.name}</strong></span>
                    <span>KSh ${item.price}</span>
                    <span class="quantity-controls">
                        <button onclick="changeQuantity(${item.id}, -1)" title="Decrease" aria-label="Decrease quantity"><i class="fa-solid fa-minus" aria-hidden="true"></i></button>
                        <span class="item-qty">${item.quantity}</span>
                        <button onclick="changeQuantity(${item.id}, 1)" title="Increase" aria-label="Increase quantity"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>
                    </span>
                    <button class="btn-remove" onclick="removeItem(${item.id})" title="Remove item" aria-label="Remove ${item.name} from cart">
                        <i class="fa-solid fa-trash-can" aria-hidden="true"></i> Remove
                    </button>
                </div>
            `;
        });
    }

    const totalEl = document.getElementById("total");
    const countEl = document.getElementById("cart-count");
    const mobileCountEl = document.getElementById("mobile-cart-count");
    if (totalEl) totalEl.textContent = total;
    if (countEl) countEl.textContent = count;
    if (mobileCountEl) mobileCountEl.textContent = count;
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
                <div class="user-chip">
                    ${roleBadge}
                    <span>${currentUser.name}</span>
                    <button class="btn-logout" onclick="logout()" title="Logout"><i class="fa-solid fa-right-from-bracket"></i></button>
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
                <a href="login.html" class="btn btn-nav-login">
                    <i class="fa-solid fa-right-to-bracket"></i> Login / Register
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
                            <td><strong>KSh ${o.total}</strong></td>
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
                    <td>KSh ${p.price}</td>
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
    }, 5000);
}

// INITIALIZE STORE ON PAGE LOAD
fetchProducts();
displayCart();
updateAccountLink();
updateCopyright();
initScrollHeader();
initHeroBackgroundSlider();

// AUTO-CLOSE MOBILE MENU ON LINK CLICK
document.querySelectorAll("#main-nav a").forEach(link => {
    link.addEventListener("click", () => {
        const nav = document.getElementById("main-nav");
        if (nav && nav.classList.contains("open")) {
            toggleNav();
        }
    });
});
