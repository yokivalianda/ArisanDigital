-- ============================================
-- ArisanKu – Supabase Database Schema
-- Jalankan SQL ini di Supabase SQL Editor
-- ============================================

-- 1. Tabel Groups (Grup Arisan)
CREATE TABLE IF NOT EXISTS groups (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  amount_per_month BIGINT NOT NULL,    -- Iuran per bulan dalam Rupiah
  draw_day      SMALLINT NOT NULL CHECK (draw_day BETWEEN 1 AND 28), -- Tanggal kocok
  start_month   TEXT NOT NULL,         -- Format: YYYY-MM
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Members (Anggota Arisan)
CREATE TABLE IF NOT EXISTS members (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT,
  order_number  SMALLINT,              -- Nomor urut anggota
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Payments (Pembayaran Iuran)
CREATE TABLE IF NOT EXISTS payments (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  month_key     TEXT NOT NULL,         -- Format: YYYY-MM
  paid_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, month_key)        -- Satu anggota satu kali bayar per bulan
);

-- 4. Tabel Draw Results (Hasil Kocok)
CREATE TABLE IF NOT EXISTS draw_results (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  month_key     TEXT NOT NULL,         -- Format: YYYY-MM
  round_number  SMALLINT NOT NULL,     -- Putaran ke-berapa
  total_amount  BIGINT NOT NULL,       -- Total uang yang diterima
  drawn_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, month_key)         -- Satu grup satu kali kocok per bulan
);

-- ============================================
-- INDEX untuk performa query
-- ============================================
CREATE INDEX IF NOT EXISTS idx_members_group ON members(group_id);
CREATE INDEX IF NOT EXISTS idx_payments_group_month ON payments(group_id, month_key);
CREATE INDEX IF NOT EXISTS idx_payments_member_month ON payments(member_id, month_key);
CREATE INDEX IF NOT EXISTS idx_draws_group ON draw_results(group_id);
CREATE INDEX IF NOT EXISTS idx_draws_group_month ON draw_results(group_id, month_key);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_results ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations untuk anon key (simple mode)
-- Untuk production, sesuaikan dengan auth Anda
CREATE POLICY "Allow all for anon" ON groups FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON members FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON payments FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON draw_results FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================
-- SELESAI! Semua tabel sudah siap digunakan.
-- ============================================
