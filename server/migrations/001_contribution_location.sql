-- Katkılara şehir düzeyinde konum. Koordinatlar 0.1 dereceye (~10 km) yuvarlanır: kesin konum asla saklanmaz.
ALTER TABLE contributions
  ADD COLUMN city VARCHAR(100) NULL,
  ADD COLUMN country CHAR(2) NULL,
  ADD COLUMN lat DECIMAL(4, 1) NULL,
  ADD COLUMN lng DECIMAL(4, 1) NULL;
