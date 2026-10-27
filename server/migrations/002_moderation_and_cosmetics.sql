-- Moderasyon: bildirimler + yeterince bildirilen katkıyı gizleme
ALTER TABLE contributions ADD COLUMN hidden_at DATETIME NULL;

CREATE TABLE reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contribution_id INT NOT NULL,
  reporter_id INT NOT NULL,
  reason ENUM('inappropriate', 'spam', 'other') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contribution_id) REFERENCES contributions(id),
  FOREIGN KEY (reporter_id) REFERENCES users(id),
  UNIQUE KEY uq_one_report_per_user (contribution_id, reporter_id)
);

-- Kozmetikler: her ürünün görsel anahtarı + kullanıcının taktığı ürünler
ALTER TABLE shop_items ADD COLUMN style VARCHAR(30) NULL;
UPDATE shop_items SET style = 'peach' WHERE name = 'Peach frame';
UPDATE shop_items SET style = 'glow' WHERE name = 'Soft glow border';
UPDATE shop_items SET style = 'night' WHERE name = 'Night sky theme';
UPDATE shop_items SET style = 'early-bird' WHERE name = 'Early bird badge';

ALTER TABLE user_items ADD COLUMN equipped TINYINT(1) NOT NULL DEFAULT 0;
