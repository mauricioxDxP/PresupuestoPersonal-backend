/*
  Warnings:

  - Added the required column `casaId` to the `Archivo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `casaId` to the `Categoria` table without a default value. This is not possible if the table is not empty.
  - Added the required column `casaId` to the `Motivo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `casaId` to the `Transaccion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `usuarioId` to the `Transaccion` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'MAESTRO_CASA', 'USUARIO');

-- CreateEnum
CREATE TYPE "AccionHistorial" AS ENUM ('CREAR', 'MODIFICAR', 'ELIMINAR');

-- AlterTable
ALTER TABLE "Archivo" ADD COLUMN     "casaId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Categoria" ADD COLUMN     "casaId" TEXT NOT NULL,
ADD COLUMN     "orden" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Motivo" ADD COLUMN     "casaId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Transaccion" ADD COLUMN     "casaId" TEXT NOT NULL,
ADD COLUMN     "usuarioId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Casa" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Casa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioCasa" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "casaId" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'USUARIO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsuarioCasa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "nombre" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'USUARIO',
    "casaId" TEXT,
    "eliminado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioCategoriaPermiso" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "puedeCrear" BOOLEAN NOT NULL DEFAULT false,
    "puedeEditar" BOOLEAN NOT NULL DEFAULT false,
    "puedeEliminar" BOOLEAN NOT NULL DEFAULT false,
    "puedeVer" BOOLEAN NOT NULL DEFAULT false,
    "puedeVerTransaccionesOtros" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsuarioCategoriaPermiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioMotivoPermiso" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "motivoId" TEXT NOT NULL,
    "puedeCrear" BOOLEAN NOT NULL DEFAULT false,
    "puedeEditar" BOOLEAN NOT NULL DEFAULT false,
    "puedeEliminar" BOOLEAN NOT NULL DEFAULT false,
    "puedeVer" BOOLEAN NOT NULL DEFAULT false,
    "puedeVerTransaccionesOtros" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsuarioMotivoPermiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransaccionHistorial" (
    "id" TEXT NOT NULL,
    "transaccionId" TEXT NOT NULL,
    "accion" "AccionHistorial" NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "datosAnteriores" JSONB,
    "datosNuevos" JSONB,

    CONSTRAINT "TransaccionHistorial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Casa_nombre_key" ON "Casa"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioCasa_usuarioId_casaId_key" ON "UsuarioCasa"("usuarioId", "casaId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_googleId_key" ON "Usuario"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioCategoriaPermiso_usuarioId_categoriaId_key" ON "UsuarioCategoriaPermiso"("usuarioId", "categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioMotivoPermiso_usuarioId_motivoId_key" ON "UsuarioMotivoPermiso"("usuarioId", "motivoId");

-- CreateIndex
CREATE INDEX "TransaccionHistorial_transaccionId_idx" ON "TransaccionHistorial"("transaccionId");

-- AddForeignKey
ALTER TABLE "UsuarioCasa" ADD CONSTRAINT "UsuarioCasa_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioCasa" ADD CONSTRAINT "UsuarioCasa_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioCategoriaPermiso" ADD CONSTRAINT "UsuarioCategoriaPermiso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioCategoriaPermiso" ADD CONSTRAINT "UsuarioCategoriaPermiso_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioMotivoPermiso" ADD CONSTRAINT "UsuarioMotivoPermiso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioMotivoPermiso" ADD CONSTRAINT "UsuarioMotivoPermiso_motivoId_fkey" FOREIGN KEY ("motivoId") REFERENCES "Motivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Motivo" ADD CONSTRAINT "Motivo_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaccion" ADD CONSTRAINT "Transaccion_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaccion" ADD CONSTRAINT "Transaccion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransaccionHistorial" ADD CONSTRAINT "TransaccionHistorial_transaccionId_fkey" FOREIGN KEY ("transaccionId") REFERENCES "Transaccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransaccionHistorial" ADD CONSTRAINT "TransaccionHistorial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Archivo" ADD CONSTRAINT "Archivo_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
