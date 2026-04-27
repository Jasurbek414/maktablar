-- Seed script for Andijon shahar
DO $$
DECLARE
    prov_id BIGINT;
    dist_id BIGINT;
    current_school_id BIGINT;
    current_class_id BIGINT;
    s_idx INT;
    c_idx INT;
    stu_idx INT;
    photo_urls TEXT[] := ARRAY[
        'https://picsum.photos/seed/and1/200', 'https://picsum.photos/seed/and2/200', 'https://picsum.photos/seed/and3/200',
        'https://picsum.photos/seed/and4/200', 'https://picsum.photos/seed/and5/200', 'https://picsum.photos/seed/and6/200',
        'https://picsum.photos/seed/and7/200', 'https://picsum.photos/seed/and8/200', 'https://picsum.photos/seed/and9/200',
        'https://picsum.photos/seed/and10/200'
    ];
BEGIN
    -- 1. Create Province
    SELECT id INTO prov_id FROM provinces WHERE name = 'Andijon viloyati' LIMIT 1;
    IF prov_id IS NULL THEN
        INSERT INTO provinces (name) VALUES ('Andijon viloyati') RETURNING id INTO prov_id;
    END IF;
    
    -- 2. Create District
    SELECT id INTO dist_id FROM districts WHERE name = 'Andijon shahar' AND province_id = prov_id LIMIT 1;
    IF dist_id IS NULL THEN
        INSERT INTO districts (name, province_id) VALUES ('Andijon shahar', prov_id) RETURNING id INTO dist_id;
    END IF;
    
    -- 3. Create 3 Schools
    FOR s_idx IN 1..3 LOOP
        INSERT INTO schools (name, district_id) VALUES ('Andijon ' || s_idx || '-sonli maktab', dist_id) RETURNING id INTO current_school_id;
        
        -- 4. Create 4 Classes per school
        FOR c_idx IN 1..4 LOOP
            INSERT INTO school_classes (name, grade, section, school_id) VALUES (c_idx || '-A sinf', c_idx, 'A', current_school_id) RETURNING id INTO current_class_id;
            
            -- 5. Create 10 Students per class
            FOR stu_idx IN 1..10 LOOP
                INSERT INTO students (full_name, face_id, school_id, class_id, photo_url) 
                VALUES ('Andijon Oquvchi ' || s_idx || '-' || c_idx || '-' || stu_idx, 'FACE_AND_' || s_idx || c_idx || stu_idx, current_school_id, current_class_id, photo_urls[stu_idx]);
            END LOOP;
        END LOOP;
    END LOOP;
END $$;
