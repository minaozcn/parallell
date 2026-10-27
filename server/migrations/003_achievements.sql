-- Rozetler artık satın alınmaz, kazanılır.
-- Mağazadaki rozet ürünlerini satıştan kaldır (geçmiş kayıtlar bozulmasın diye silmiyoruz).
ALTER TABLE shop_items ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1;
UPDATE shop_items SET active = 0 WHERE type = 'badge';
UPDATE user_items SET equipped = 0
  WHERE shop_item_id IN (SELECT id FROM (SELECT id FROM shop_items WHERE type = 'badge') t);

-- Kazanılan rozetler. contribution_id: rozeti kazandıran katkı (silinirse rozet de geri alınır).
CREATE TABLE user_achievements (
  user_id INT NOT NULL,
  achievement_key VARCHAR(40) NOT NULL,
  contribution_id INT NULL,
  earned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, achievement_key),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (contribution_id) REFERENCES contributions(id)
);

-- Profilde gösterilen rozet
ALTER TABLE users ADD COLUMN equipped_badge VARCHAR(40) NULL;
