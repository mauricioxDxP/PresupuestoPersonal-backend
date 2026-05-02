-- Migration Script: Multi-Casa Support (NO-destructive)
-- This script only adds data relationships, does NOT drop any columns or constraints
-- Safe to run multiple times - uses ON CONFLICT DO NOTHING

BEGIN;

-- 1. Create the UsuarioCasa table if it doesn't exist
CREATE TABLE IF NOT EXISTS "UsuarioCasa" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "usuarioId" UUID NOT NULL,
  "casaId" UUID NOT NULL,
  "rol" "Rol" NOT NULL DEFAULT 'USUARIO',
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "UsuarioCasa_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE,
  CONSTRAINT "UsuarioCasa_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE,
  CONSTRAINT "UsuarioCasa_usuarioId_casaId_unique" UNIQUE ("usuarioId", "casaId")
);

-- 2. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "UsuarioCasa_usuarioId_idx" ON "UsuarioCasa"("usuarioId");
CREATE INDEX IF NOT EXISTS "UsuarioCasa_casaId_idx" ON "UsuarioCasa"("casaId");

-- 3. Migrate existing data: for each Usuario with a casaId, create a UsuarioCasa record
-- ON CONFLICT DO NOTHING makes it safe to run again
INSERT INTO "UsuarioCasa" ("id", "usuarioId", "casaId", "rol", "createdAt")
SELECT 
  gen_random_uuid(),
  u."id",
  u."casaId",
  u."rol",
  u."createdAt"
FROM "Usuario" u
WHERE u."casaId" IS NOT NULL
ON CONFLICT ("usuarioId", "casaId") DO NOTHING;

-- 4. Verify migration
DO $$
DECLARE
  total_users INTEGER;
  migrated INTEGER;
  pending INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM "Usuario" WHERE "eliminado" = false;
  SELECT COUNT(DISTINCT "usuarioId") INTO migrated FROM "UsuarioCasa";
  SELECT COUNT(*) INTO pending FROM "Usuario" u 
  WHERE NOT EXISTS (SELECT 1 FROM "UsuarioCasa" uc WHERE uc."usuarioId" = u."id")
  AND u."eliminado" = false AND u."casaId" IS NOT NULL;
  
  RAISE NOTICE '=== Migration Status ===';
  RAISE NOTICE 'Total users: %', total_users;
  RAISE NOTICE 'Users migrated: %', migrated;
  RAISE NOTICE 'Users pending: %', pending;
  
  IF pending > 0 THEN
    RAISE WARNING 'There are % users with casaId that were not migrated!', pending;
  ELSE
    RAISE NOTICE 'Migration complete! All users with casaId have UsuarioCasa records.';
  END IF;
END $$;

COMMIT;

-- TO ROLLBACK:
-- DELETE FROM "UsuarioCasa";  -- Clears migration data but keeps table
-- OR: DROP TABLE "UsuarioCasa";  -- Full rollback

-- TO VERIFY AFTER ROLLBACK:
-- SELECT u."email", u."rol", u."casaId", 
--        (SELECT array_agg(uc."casaId") FROM "UsuarioCasa" uc WHERE uc."usuarioId" = u."id") as casaIds
-- FROM "Usuario" u
-- WHERE u."eliminado" = false;
