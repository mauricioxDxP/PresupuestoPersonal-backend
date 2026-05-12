import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export interface TransaccionParaReporte {
  id: string;
  monto: number | string;
  fecha: string;
  descripcion: string | null;
  motivoId: string;
  categoriaId: string;
  motivo: { id: string; nombre: string; orden: number; mostrarSinTransacciones: boolean };
  categoria: { id: string; nombre: string; tipo: string };
}

@Injectable()
export class ReportesService {
  private logger = new Logger(ReportesService.name);

  /**
   * Genera un reporte mensual tipo "Reporte 2" organizado por semanas.
   * Usa ExcelJS para soporte de comments flotantes.
   */
  async generateReporteTwo(
    transacciones: TransaccionParaReporte[],
    categorias: Array<{ id: string; nombre: string; tipo: string }>,
    motivos: Array<{ id: string; nombre: string; categoriaId: string; orden: number; mostrarSinTransacciones: boolean }>,
    nombreMes: string,
    includeEmpty: boolean,
  ): Promise<Buffer> {
    const tituloMes = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

    // Agrupar transacciones por categoría > fecha > motivo
    const transByCatFechaMotivo: Record<string, Record<string, Record<string, { monto: number; desc: string }>>> = {};
    for (const t of transacciones) {
      const catId = t.categoriaId;
      const motId = t.motivoId;
      const fecha = typeof t.fecha === 'string' ? t.fecha.split('T')[0] : new Date(t.fecha).toISOString().split('T')[0];
      const monto = Number(t.monto);
      const desc = t.descripcion || '';

      if (!transByCatFechaMotivo[catId]) transByCatFechaMotivo[catId] = {};
      if (!transByCatFechaMotivo[catId][fecha]) transByCatFechaMotivo[catId][fecha] = {};
      if (!transByCatFechaMotivo[catId][fecha][motId]) {
        transByCatFechaMotivo[catId][fecha][motId] = { monto: 0, desc: '' };
      }
      transByCatFechaMotivo[catId][fecha][motId].monto += monto;
      if (desc) {
        transByCatFechaMotivo[catId][fecha][motId].desc = desc;
      }
    }

    // Crear workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Reporte 2 - ${tituloMes}`, {
      properties: { tabColor: { argb: 'FF0000' } },
    });

    let currentRow = 1;

    // Título
    const titleCell = sheet.getCell(`A${currentRow}`);
    titleCell.value = `Reporte 2 - ${tituloMes}`;
    titleCell.font = { size: 16, bold: true };
    currentRow += 2;

    // Procesar primero gastos, luego ingresos
    const gastosCats = categorias.filter((c) => c.tipo === 'gasto');
    const ingresoCats = categorias.filter((c) => c.tipo === 'ingreso');
    const orderedCats = [...gastosCats, ...ingresoCats];

    // Get Monday of a date in UTC
    const getMondayUTC = (d: Date): Date => {
      const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const day = date.getUTCDay();
      const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
      date.setUTCDate(diff);
      return date;
    };

    // Formatea fecha como "4-May-26" usando UTC
    const formatFechaCorta = (fecha: string): string => {
      const d = new Date(fecha);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = d.getUTCDate();
      const month = months[d.getUTCMonth()];
      const year = String(d.getUTCFullYear()).slice(-2);
      return `${day}-${month}-${year}`;
    };

    // Formatea monto: si es entero muestra sin decimales, si tiene decimales muestra con 2
    const formatMonto = (monto: number): string => {
      return monto % 1 === 0 ? String(monto) : monto.toFixed(2);
    };

    // Nombres de días en español
    const dayNames = ['Lun', 'Mar', 'Miér', 'Jue', 'Vier', 'Sáb', 'Dom'];

    for (const cat of orderedCats) {
      const catData = transByCatFechaMotivo[cat.id] || {};

      const hasTrans = Object.keys(catData).length > 0;
      if (!hasTrans && !includeEmpty) continue;

      // Obtener motivos específicos de esta categoría (máx 8)
      const motivosDeCategoria = motivos
        .filter((m) => m.categoriaId === cat.id && transacciones.some((t) => t.motivoId === m.id))
        .slice(0, 8);

      // Título de categoría (merge A-J, centrado)
      const titleRow = currentRow;
      sheet.mergeCells(`A${titleRow}:J${titleRow}`);
      const titleCell = sheet.getCell(`A${titleRow}`);
      titleCell.value = `▸ ${cat.nombre}`;
      titleCell.alignment = { horizontal: 'center' };
      titleCell.font = { bold: true, size: 12 };
      currentRow++;

      // Header de columna
      const headerRow = sheet.getRow(currentRow);
      headerRow.getCell(1).value = 'Fecha';
      headerRow.getCell(1).font = { bold: true };
      for (let i = 0; i < 8; i++) {
        const m = motivosDeCategoria[i];
        headerRow.getCell(i + 2).value = m ? m.nombre : '';
        headerRow.getCell(i + 2).font = { bold: true };
      }
      headerRow.getCell(10).value = 'Total';
      headerRow.getCell(10).font = { bold: true };
      currentRow++;

      const fechasSorted = Object.keys(catData).sort();

      if (fechasSorted.length === 0) {
        sheet.getCell(`A${currentRow}`).value = 'Sin transacciones';
        currentRow++;
      } else {
        // Obtener rango de semanas
        const firstDate = new Date(fechasSorted[0]);
        const lastDate = new Date(fechasSorted[fechasSorted.length - 1]);
        const firstMonday = getMondayUTC(firstDate);
        const lastMonday = getMondayUTC(lastDate);
        lastMonday.setUTCDate(lastMonday.getUTCDate() + ((lastMonday.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)) * 7);

        // Iterar por cada semana
        let currentMonday = new Date(firstMonday);

        while (currentMonday <= lastMonday) {
          // Mostrar los 7 días de la semana
          for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
            const currentDate = new Date(currentMonday);
            currentDate.setUTCDate(currentMonday.getUTCDate() + dayIdx);
            const dateStr = currentDate.toISOString().split('T')[0];
            const motivoData = catData[dateStr];

            const row = sheet.getRow(currentRow);

            // Día de la semana con fecha
            const dayName = dayNames[dayIdx];
            row.getCell(1).value = `${formatFechaCorta(dateStr)}`;

            let dayTotal = 0;

            for (let i = 0; i < 8; i++) {
              const m = motivosDeCategoria[i];
              if (m && motivoData?.[m.id]) {
                const monto = motivoData[m.id].monto;
                row.getCell(i + 2).value = monto > 0 ? formatMonto(monto) : '';

                // Agregar comentario flotante si hay descripción
                if (motivoData[m.id].desc) {
                  const cell = row.getCell(i + 2);
                  cell.note = {
                    texts: [
                      {
                        text: motivoData[m.id].desc,
                        font: { size: 9 },
                      },
                    ],
                  };
                }
                dayTotal += monto;
              }
            }

            row.getCell(10).value = dayTotal > 0 ? formatMonto(dayTotal) : '';
            currentRow++;
          }

          // Total de la semana
          const totalRow = sheet.getRow(currentRow);
          totalRow.getCell(1).value = '  Total sem.';
          totalRow.getCell(1).font = { bold: true };
          let weekTotal = 0;
          for (let i = 0; i < 8; i++) {
            const m = motivosDeCategoria[i];
            let weekMotivoTotal = 0;
            if (m) {
              for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
                const d = new Date(currentMonday);
                d.setUTCDate(currentMonday.getUTCDate() + dayIdx);
                const ds = d.toISOString().split('T')[0];
                weekMotivoTotal += catData[ds]?.[m.id]?.monto || 0;
              }
            }
            totalRow.getCell(i + 2).value = weekMotivoTotal > 0 ? formatMonto(weekMotivoTotal) : '';
            weekTotal += weekMotivoTotal;
          }
          totalRow.getCell(10).value = formatMonto(weekTotal);
          totalRow.getCell(10).font = { bold: true };
          currentRow++;

          currentMonday.setUTCDate(currentMonday.getUTCDate() + 7);
        }

        // Total de categoría
        const catTotalRow = sheet.getRow(currentRow);
        catTotalRow.getCell(1).value = `Total ${cat.nombre}`;
        catTotalRow.getCell(1).font = { bold: true };
        let catTotal = 0;
        for (let i = 0; i < 8; i++) {
          const m = motivosDeCategoria[i];
          let motivoTotal = 0;
          if (m) {
            for (const fecha of fechasSorted) {
              motivoTotal += catData[fecha][m.id]?.monto || 0;
            }
          }
          catTotalRow.getCell(i + 2).value = motivoTotal > 0 ? formatMonto(motivoTotal) : '';
          catTotal += motivoTotal;
        }
        catTotalRow.getCell(10).value = formatMonto(catTotal);
        catTotalRow.getCell(10).font = { bold: true };
        currentRow++;
      }

      currentRow++; //空行
    }

    // Ajustar anchos de columna
    sheet.getColumn(1).width = 13; // A - Fecha
    for (let i = 2; i <= 9; i++) {
      sheet.getColumn(i).width = 11;
    }
    sheet.getColumn(10).width = 12; // J - Total

    // === HOJA 2: Reporte agrupado por Categoría > Motivo > Transacciones ===
    const sheet2 = workbook.addWorksheet('Transacciones');

    let rowNum2 = 1;

    for (const cat of orderedCats) {
      const catData = transByCatFechaMotivo[cat.id] || {};
      const hasTrans = Object.keys(catData).length > 0;
      if (!hasTrans && !includeEmpty) continue;

      const motivosDeCategoria = motivos
        .filter((m) => m.categoriaId === cat.id && transacciones.some((t) => t.motivoId === m.id));

      let hasAnyTransInCat = false;

      // Fila con nombre de categoría
      const catRow = sheet2.getRow(rowNum2);
      catRow.getCell(1).value = cat.nombre;
      catRow.getCell(1).font = { bold: true, size: 12 };
      rowNum2++;

      for (const m of motivosDeCategoria) {
        const hasTransInMotivo = Object.keys(catData).some(
          (fecha) => catData[fecha]?.[m.id]?.monto > 0,
        );
        if (!hasTransInMotivo) continue;
        hasAnyTransInCat = true;

        // Fila con nombre del motivo
        const motivoRow = sheet2.getRow(rowNum2);
        motivoRow.getCell(1).value = m.nombre;
        motivoRow.getCell(1).font = { italic: true };
        rowNum2++;

        // Filas de transacciones
        const fechasSorted = Object.keys(catData).sort();
        for (const fecha of fechasSorted) {
          const motivoData = catData[fecha][m.id];
          if (motivoData && motivoData.monto > 0) {
            const dataRow = sheet2.getRow(rowNum2);
            dataRow.getCell(1).value = formatFechaCorta(fecha);
            dataRow.getCell(2).value = formatMonto(motivoData.monto);
            dataRow.getCell(3).value = motivoData.desc || '';
            rowNum2++;
          }
        }
      }

      if (hasAnyTransInCat) {
        rowNum2++; //空行 entre categorías
      }
    }

    // Ajustar anchos de hoja 2
    sheet2.getColumn(1).width = 13; // A - Fecha
    sheet2.getColumn(2).width = 12; // B - Monto
    sheet2.getColumn(3).width = 40; // C - Descripción

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}