-- Tepkiler: "bu anı gördüm" işareti. Sayılar herkese gösterilmez, sadece fotoğrafın sahibi görür.
CREATE TABLE reactions (
  contribution_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (contribution_id, user_id),
  FOREIGN KEY (contribution_id) REFERENCES contributions(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
