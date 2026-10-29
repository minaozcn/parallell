-- Daha fazla kenarlık, profil çerçevesi ve tema. Fiyatlar geçici (SHOP_FREE=true iken hepsi ücretsiz).
INSERT IGNORE INTO shop_items (name, type, style, price) VALUES
  -- Fotoğraf kenarlıkları
  ('Sage', 'border', 'sage', 40),
  ('Midnight ink', 'border', 'ink', 40),
  ('Lavender dusk', 'border', 'lavender', 70),
  ('Golden hour', 'border', 'golden', 70),
  ('Aurora', 'border', 'aurora', 300),
  -- Profil çerçeveleri
  ('Cream lace', 'frame', 'cream', 50),
  ('Ocean breeze', 'frame', 'ocean', 90),
  ('Rose quartz', 'frame', 'rose', 90),
  ('Ember', 'frame', 'ember', 90),
  ('Aurora halo', 'frame', 'aurora', 400),
  -- Temalar
  ('Sakura', 'theme', 'sakura', 120),
  ('Forest', 'theme', 'forest', 120);
