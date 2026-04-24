-- Maktab Platform – Database Initialization
-- ============================================

-- Viloyatlar
CREATE TABLE IF NOT EXISTS provinces (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

-- Tumanlar
CREATE TABLE IF NOT EXISTS districts (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    province_id BIGINT NOT NULL REFERENCES provinces(id) ON DELETE CASCADE
);

-- Maktablar
CREATE TABLE IF NOT EXISTS schools (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    district_id BIGINT NOT NULL REFERENCES districts(id) ON DELETE CASCADE
);

-- O'quvchilar
CREATE TABLE IF NOT EXISTS students (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    face_id VARCHAR(255) NOT NULL UNIQUE,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE
);

-- Vasiylar (ota-ona)
CREATE TABLE IF NOT EXISTS guardians (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    telegram_user_id VARCHAR(50) UNIQUE,
    password VARCHAR(255)
);

-- O'quvchi ↔ Vasiy ko'prik jadvali (many-to-many)
CREATE TABLE IF NOT EXISTS student_guardians (
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    guardian_id BIGINT NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
    PRIMARY KEY (student_id, guardian_id)
);

-- Davomat
CREATE TABLE IF NOT EXISTS attendance (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type VARCHAR(10) NOT NULL CHECK (type IN ('IN', 'OUT'))
);

-- Indekslar (tezlik uchun)
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp);
CREATE INDEX IF NOT EXISTS idx_students_face_id ON students(face_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_districts_province ON districts(province_id);
CREATE INDEX IF NOT EXISTS idx_schools_district ON schools(district_id);
CREATE INDEX IF NOT EXISTS idx_guardians_telegram ON guardians(telegram_user_id);

-- ============================================
-- Test ma'lumotlar (demo)
-- ============================================
INSERT INTO provinces (name) VALUES
    ('Toshkent shahri'),
    ('Toshkent viloyati'),
    ('Samarqand viloyati'),
    ('Buxoro viloyati'),
    ('Andijon viloyati'),
    ('Farg''ona viloyati'),
    ('Namangan viloyati'),
    ('Qashqadaryo viloyati'),
    ('Surxondaryo viloyati'),
    ('Jizzax viloyati'),
    ('Sirdaryo viloyati'),
    ('Navoiy viloyati'),
    ('Xorazm viloyati'),
    ('Qoraqalpog''iston Respublikasi')
ON CONFLICT (name) DO NOTHING;
