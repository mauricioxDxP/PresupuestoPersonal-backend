-- =====================================================
-- Script de migración: Multi-Casa, Roles y Permisos
-- ¡SAFE! No elimina ni modifica datos existentes
-- =====================================================

-- 1. Crear tabla Casa
CREATE TABLE IF NOT EXISTS "Casa" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "nombre" TEXT UNIQUE NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- 2. Crear tabla Usuario
CREATE TABLE IF NOT EXISTS "Usuario" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" TEXT UNIQUE NOT NULL,
    "passwordHash" TEXT,
    "googleId" TEXT UNIQUE,
    "nombre" TEXT NOT NULL,
    "rol" TEXT DEFAULT 'USUARIO',
    "casaId" UUID,
    "eliminado" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Usuario_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE SET NULL
);

-- 3. Crear tabla UsuarioCategoriaPermiso
CREATE TABLE IF NOT EXISTS "UsuarioCategoriaPermiso" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "usuarioId" UUID NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "puedeCrear" BOOLEAN DEFAULT false,
    "puedeEditar" BOOLEAN DEFAULT false,
    "puedeEliminar" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsuarioCategoriaPermiso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE,
    CONSTRAINT "UsuarioCategoriaPermiso_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE CASCADE
);

-- 4. Crear tabla UsuarioMotivoPermiso
CREATE TABLE IF NOT EXISTS "UsuarioMotivoPermiso" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "usuarioId" UUID NOT NULL,
    "motivoId" TEXT NOT NULL,
    "puedeCrear" BOOLEAN DEFAULT false,
    "puedeEditar" BOOLEAN DEFAULT false,
    "puedeEliminar" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsuarioMotivoPermiso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE,
    CONSTRAINT "UsuarioMotivoPermiso_motivoId_fkey" FOREIGN KEY ("motivoId") REFERENCES "Motivo"("id") ON DELETE CASCADE
);

-- 5. Agregar columna casaId a tablas existentes (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Categoria' AND column_name = 'casaId'
    ) THEN
        ALTER TABLE "Categoria" ADD COLUMN "casaId" UUID;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Motivo' AND column_name = 'casaId'
    ) THEN
        ALTER TABLE "Motivo" ADD COLUMN "casaId" UUID;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Transaccion' AND column_name = 'casaId'
    ) THEN
        ALTER TABLE "Transaccion" ADD COLUMN "casaId" UUID;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Archivo' AND column_name = 'casaId'
    ) THEN
        ALTER TABLE "Archivo" ADD COLUMN "casaId" UUID;
    END IF;
END $$;

-- 6. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS "Usuario_casaId_idx" ON "Usuario"("casaId");
CREATE INDEX IF NOT EXISTS "Categoria_casaId_idx" ON "Categoria"("casaId");
CREATE INDEX IF NOT EXISTS "Motivo_casaId_idx" ON "Motivo"("casaId");
CREATE INDEX IF NOT EXISTS "Transaccion_casaId_idx" ON "Transaccion"("casaId");
CREATE INDEX IF NOT EXISTS "Archivo_casaId_idx" ON "Archivo"("casaId");
CREATE INDEX IF NOT EXISTS "UsuarioCategoriaPermiso_usuarioId_idx" ON "UsuarioCategoriaPermiso"("usuarioId");
CREATE INDEX IF NOT EXISTS "UsuarioMotivoPermiso_usuarioId_idx" ON "UsuarioMotivoPermiso"("usuarioId");

-- =====================================================
-- DATOS INICIALES (opcional - ejecutar después de migrate)
-- =====================================================
-- Después de ejecutar este script, podés correr el seed para crear un ADMIN inicial
-- =====================================================