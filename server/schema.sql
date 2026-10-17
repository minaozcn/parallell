CREATE DATABASE IF NOT EXISTS parallell CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE parallell;

-- Tüm zamanlar UTC olarak saklanır.

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token CHAR(36) NOT NULL UNIQUE,
  display_name VARCHAR(50) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS capsules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prompt VARCHAR(200) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  opens_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_capsule_opens_at (opens_at)
);

CREATE TABLE IF NOT EXISTS contributions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  capsule_id INT NOT NULL,
  user_id INT NOT NULL,
  photo_path VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  -- Silinmemiş katkılarda user_id, silinmişlerde NULL olur.
  -- Böylece bir kullanıcının bir kapsülde en fazla 1 aktif katkısı olabilir.
  active_user_id INT GENERATED ALWAYS AS (IF(deleted_at IS NULL, user_id, NULL)) STORED,
  FOREIGN KEY (capsule_id) REFERENCES capsules(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY uq_one_active_contribution (capsule_id, active_user_id)
);

CREATE TABLE IF NOT EXISTS shop_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  type ENUM('frame', 'border', 'theme', 'badge') NOT NULL,
  price INT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_items (
  user_id INT NOT NULL,
  shop_item_id INT NOT NULL,
  purchased_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, shop_item_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (shop_item_id) REFERENCES shop_items(id)
);

-- Her puan hareketi bir satır. Bakiye = SUM(amount).
CREATE TABLE IF NOT EXISTS point_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount INT NOT NULL,
  reason ENUM('participation', 'early_bonus', 'revoke_participation', 'revoke_early_bonus', 'purchase') NOT NULL,
  contribution_id INT NULL,
  shop_item_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (contribution_id) REFERENCES contributions(id),
  FOREIGN KEY (shop_item_id) REFERENCES shop_items(id)
);

-- Fiyatlar henüz kesinleşmedi: geçici değerler
INSERT IGNORE INTO shop_items (name, type, price) VALUES
  ('Peach frame', 'frame', 50),
  ('Soft glow border', 'border', 30),
  ('Night sky theme', 'theme', 120),
  ('Early bird badge', 'badge', 80);
