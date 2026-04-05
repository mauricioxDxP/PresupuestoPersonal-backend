-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "eliminado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Motivo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "mostrarSinTransacciones" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "eliminado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Motivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaccion" (
    "id" TEXT NOT NULL,
    "motivoId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "monto" DECIMAL(15,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT,
    "facturable" BOOLEAN NOT NULL DEFAULT false,
    "eliminado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Archivo" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "transaccionId" TEXT NOT NULL,
    "eliminado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Archivo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Motivo" ADD CONSTRAINT "Motivo_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaccion" ADD CONSTRAINT "Transaccion_motivoId_fkey" FOREIGN KEY ("motivoId") REFERENCES "Motivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaccion" ADD CONSTRAINT "Transaccion_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Archivo" ADD CONSTRAINT "Archivo_transaccionId_fkey" FOREIGN KEY ("transaccionId") REFERENCES "Transaccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
