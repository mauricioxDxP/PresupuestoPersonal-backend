-- =====================================================
-- Seed: Datos iniciales para Multi-Casa
-- Ejecutar DESPUÉS de migration-add-casa.sql
-- =====================================================

-- 1. Crear una casa por defecto (ajustar nombre según necesidad)
INSERT INTO "Casa" ("id", "nombre", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    'Mi Casa',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("nombre") DO NOTHING;

-- Obtener el ID de la casa creada (para usar en el próximo paso)
-- Reemplazá 'MI_CASA_ID_AQUI' con el ID real o executa la consulta completa

-- 2. Crear usuario ADMIN global (solo hay un ADMIN)
-- Password: Admin123! (después cambiá esto)
INSERT INTO "Usuario" ("id", "email", "passwordHash", "nombre", "rol", "casaId", "eliminado", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    'admin@finance.local',
    '$2b$10$YourHashedPasswordHere',  -- Reemplazar con hash real
    'Administrador',
    'ADMIN',
    NULL,  -- ADMIN no pertenece a ninguna casa
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO NOTHING;

-- 3. Crear usuario Maestro de Casa de ejemplo
-- Primero obtené el ID de la casa
DO $$
DECLARE
    casa_id UUID;
    hashed_pwd TEXT;
BEGIN
    -- Buscar la casa
    SELECT id INTO casa_id FROM "Casa" WHERE nombre = 'Mi Casa' LIMIT 1;
    
    -- Crear hash de password (contraseña: Maestro123!)
    hashed_pwd := '$2b$10$YourMaestroHashedPasswordHere';  -- Reemplazar
    
    IF casa_id IS NOT NULL THEN
        INSERT INTO "Usuario" ("id", "email", "passwordHash", "nombre", "rol", "casaId", "eliminado", "createdAt", "updatedAt")
        VALUES (
            gen_random_uuid(),
            'maestro@finance.local',
            hashed_pwd,
            'Maestro de Casa',
            'MAESTRO_CASA',
            casa_id,
            false,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT ("email") DO NOTHING;
        
        RAISE NOTICE 'Maestro de Casa creado en casa: %', casa_id;
    ELSE
        RAISE WARNING 'No se encontró la casa Mi Casa. Ejecutá el paso 1 primero.';
    END IF;
END $$;

-- =====================================================
-- NOTA IMPORTANTE:
-- Para crear los hashes de password, usá en Node.js:
-- const hash = await bcrypt.hash('TuPassword', 10);
-- console.log(hash);
-- =====================================================