-- ============================================================
-- FreshBasket E-Commerce Database Schema
-- Compatible with MySQL 5.7+, MySQL 8.0+, MariaDB (WampServer)
-- ============================================================

-- 1. CREATE AND USE DATABASE
CREATE DATABASE IF NOT EXISTS freshbasket
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE freshbasket;

-- ============================================================
-- 2. USERS TABLE (Supports 'admin' and 'client' roles)
-- ============================================================
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'client') NOT NULL DEFAULT 'client',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 3. PRODUCTS TABLE (Catalog inventory)
-- ============================================================
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    image VARCHAR(500) NOT NULL,
    stock INT NOT NULL DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category)
) ENGINE=InnoDB;

-- ============================================================
-- 4. ORDERS TABLE (Customer purchase records)
-- ============================================================
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    user_id INT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(150) NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_phone VARCHAR(30) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash on Delivery',
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_customer_email (customer_email)
) ENGINE=InnoDB;

-- ============================================================
-- 5. ORDER ITEMS TABLE (Individual items within an order)
-- ============================================================
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NULL,
    product_name VARCHAR(150) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 6. SEED DATA (Default Users & Product Catalog)
-- ============================================================

-- Default Users: Admin & Client
INSERT INTO users (name, email, password, role) VALUES
('Store Administrator', 'admin@freshbasket.com', 'admin123', 'admin'),
('Jane Client', 'client@freshbasket.com', 'client123', 'client');

-- Default Product Catalog
INSERT INTO products (name, category, price, image, stock) VALUES
('Fresh Tomatoes', 'Vegetables', 120.00, 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=500', 150),
('Red Onions', 'Vegetables', 150.00, 'https://images.unsplash.com/photo-1508747703725-719777637510?w=500', 120),
('Bananas', 'Fruits', 100.00, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500', 200),
('Apples', 'Fruits', 280.00, 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500', 90),
('Fresh Milk', 'Dairy', 75.00, 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500', 80),
('Eggs', 'Dairy', 480.00, 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=500', 60),
('Rice', 'Groceries', 320.00, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500', 110),
('Cooking Oil', 'Groceries', 250.00, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500', 75);

-- Sample Initial Order (Demo)
INSERT INTO orders (order_number, user_id, customer_name, customer_email, delivery_address, delivery_phone, payment_method, total_amount, status) VALUES
('ORD-902184', 2, 'Jane Client', 'client@freshbasket.com', 'Kenyatta Ave, Suite 402', '0712345678', 'Cash on Delivery', 240.00, 'completed');

INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal) VALUES
(1, 1, 'Fresh Tomatoes', 120.00, 2, 240.00);

