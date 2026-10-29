-- Profil: kısa bir tanıtım cümlesi
ALTER TABLE users ADD COLUMN bio VARCHAR(160) NULL;

-- Engelleme: engellenen kişi profili göremez, mesaj atamaz; ikisi birbirinin fotoğraflarını görmez
CREATE TABLE blocks (
  blocker_id INT NOT NULL,
  blocked_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (blocker_id, blocked_id),
  FOREIGN KEY (blocker_id) REFERENCES users(id),
  FOREIGN KEY (blocked_id) REFERENCES users(id)
);

-- Kullanıcı bildirme (profil/mesaj kaynaklı)
CREATE TABLE user_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reporter_id INT NOT NULL,
  reported_id INT NOT NULL,
  reason ENUM('harassment', 'spam', 'inappropriate', 'other') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_id) REFERENCES users(id),
  FOREIGN KEY (reported_id) REFERENCES users(id)
);

-- Mesajlar. Bir sohbet = iki kullanıcı arasındaki mesajlar.
CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  recipient_id INT NOT NULL,
  body VARCHAR(1000) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  read_at DATETIME NULL,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id),
  INDEX idx_pair (sender_id, recipient_id, created_at)
);
