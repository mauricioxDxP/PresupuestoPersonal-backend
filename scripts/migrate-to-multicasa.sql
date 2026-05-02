-- Migration Script: Multi-Casa Support
-- This script migrates the database from single casaId to many-to-many UsuarioCasa relationship
-- Run this BEFORE the Prisma migration, as part of data migration

BEGIN;

-- 1. Create the new UsuarioCasa table (matches new schema.prisma)
CREATE TABLE "UsuarioCasa" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "usuarioId" UUID NOT NULL REFERENCES "Usuario"("id") ON DELETE CASCADE,
  "casaId" UUID NOT NULL REFERENCES "Casa"("id") ON DELETE CASCADE,
  "rol" "Rol" NOT NULL DEFAULT 'USUARIO',
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE ("usuarioId", "casaId")
);

-- 2. Migrate existing data: for each Usuario with a casaId, create a UsuarioCasa record
-- This preserves the user's role from the Usuario table
INSERT INTO "UsuarioCasa" ("id", "usuarioId", "casaId", "rol", "createdAt")
SELECT 
  gen_random_uuid(),
  "id",
  "casaId",
  "rol",
  "createdAt"
FROM "Usuario"
WHERE "casaId" IS NOT NULL;

-- 3. Index for performance
CREATE INDEX "UsuarioCasa_usuarioId_idx" ON "UsuarioCasa"("usuarioId");
CREATE INDEX "UsuarioCasa_casaId_idx" ON "UsuarioCasa"("casaId");

-- 4. Drop the foreign key constraint on Usuario.casaId (we'll drop the column next)
-- Note: We do this in a transaction to ensure atomicity

-- Check if there are any foreign key constraints to drop
DO $$
DECLARE
    fk_name text;
    tbl_name text;
BEGIN
    -- Find and drop foreign key if exists
    FOR fk_name, tbl_name IN 
        SELECT conname, conrelid::regclass::text 
        FROM pg_constraint 
        WHERE conrelid = 'Usuario'::regclass 
        AND conname LIKE '%casa%'
    LOOP
        EXECUTE format('ALTER TABLE "Usuario" DROP CONSTRAINT %I', fk_name);
        RAISE NOTICE 'Dropped constraint: %', fk_name;
    END LOOP;
END $$;

-- 5. Now safe to drop the casaId column from Usuario
-- This is commented out for safety - uncomment after confirming data migration worked
-- ALTER TABLE "Usuario" DROP COLUMN "casaId";

COMMIT;

-- ROLLBACK (if needed):
-- BEGIN;
-- DELETE FROM "UsuarioCasa" WHERE "createdAt" = "createdAt";  -- This won't work due to timestamp
-- Better: DROP TABLE "UsuarioCasa"; then recreate manually
-- ALTER TABLE "Usuario" ADD COLUMN "casaId" UUID REFERENCES "Casa"("id");
-- UPDATE "Usuario" SET "casaId" = (SELECT "casaId" FROM "UsuarioCasa" WHERE "UsuarioCasa"."usuarioId" = "Usuario"."id" LIMIT 1);
-- COMMIT;

-- VERIFICATION QUERIES (run after migration):

-- 1. Check all users have at least one UsuarioCasa record
-- Should return 0 rows if migration is complete
-- SELECT u.id, u.email FROM "Usuario" u 
-- WHERE NOT EXISTS (SELECT 1 FROM "UsuarioCasa" uc WHERE uc."usuarioId" = u.id)
-- AND u."eliminado" = false;

-- 2. Check count of migrated records
-- SELECT COUNT(*) as total_usuarios, 
--        COUNT(uc."usuarioId") as con_casa,
--        COUNT(CASE WHEN uc."usuarioId" IS NULL THEN 1 END) as sin_casa
-- FROM "Usuario" u
-- LEFT JOIN "UsuarioCasa" uc ON u.id = uc."usuarioId"
-- WHERE u."eliminado" = false;

-- 3. Verify casaIds in JWT work by checking a sample user
-- SELECT u.email, u.rol, array_agg(uc."casaId") as casaIds
-- FROM "Usuario" u
-- JOIN "UsuarioCasa" uc ON u.id = uc."usuarioId"
-- GROUP BY u.email, u.rol;
