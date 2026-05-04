-- CreateTable
CREATE TABLE "Perfil" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "casaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Perfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioPerfil" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "casaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsuarioPerfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfilCategoriaPermiso" (
    "id" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "puedeCrear" BOOLEAN NOT NULL DEFAULT false,
    "puedeEditar" BOOLEAN NOT NULL DEFAULT false,
    "puedeEliminar" BOOLEAN NOT NULL DEFAULT false,
    "puedeVer" BOOLEAN NOT NULL DEFAULT false,
    "puedeVerTransaccionesOtros" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PerfilCategoriaPermiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfilMotivoPermiso" (
    "id" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "motivoId" TEXT NOT NULL,
    "puedeCrear" BOOLEAN NOT NULL DEFAULT false,
    "puedeEditar" BOOLEAN NOT NULL DEFAULT false,
    "puedeEliminar" BOOLEAN NOT NULL DEFAULT false,
    "puedeVer" BOOLEAN NOT NULL DEFAULT false,
    "puedeVerTransaccionesOtros" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PerfilMotivoPermiso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Perfil_nombre_casaId_key" ON "Perfil"("nombre", "casaId");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioPerfil_usuarioId_casaId_key" ON "UsuarioPerfil"("usuarioId", "casaId");

-- CreateIndex
CREATE UNIQUE INDEX "PerfilCategoriaPermiso_perfilId_categoriaId_key" ON "PerfilCategoriaPermiso"("perfilId", "categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "PerfilMotivoPermiso_perfilId_motivoId_key" ON "PerfilMotivoPermiso"("perfilId", "motivoId");

-- AddForeignKey
ALTER TABLE "Perfil" ADD CONSTRAINT "Perfil_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioPerfil" ADD CONSTRAINT "UsuarioPerfil_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioPerfil" ADD CONSTRAINT "UsuarioPerfil_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "Perfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfilCategoriaPermiso" ADD CONSTRAINT "PerfilCategoriaPermiso_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "Perfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfilCategoriaPermiso" ADD CONSTRAINT "PerfilCategoriaPermiso_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfilMotivoPermiso" ADD CONSTRAINT "PerfilMotivoPermiso_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "Perfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfilMotivoPermiso" ADD CONSTRAINT "PerfilMotivoPermiso_motivoId_fkey" FOREIGN KEY ("motivoId") REFERENCES "Motivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
