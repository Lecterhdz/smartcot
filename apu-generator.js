// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - GENERADOR DE APU (ANÁLISIS DE PRECIOS UNITARIOS)
// Formato profesional para clientes - Basado en tu Excel
// ─────────────────────────────────────────────────────────────────────

console.log('📄 apu-generator.js cargado');

window.apuGenerator = {
    
    // ─────────────────────────────────────────────────────────────────
    // GENERAR APU PARA UN CONCEPTO
    // ─────────────────────────────────────────────────────────────────
    generarAPU: async function(conceptoId) {
        const concepto = await db.conceptos.get(conceptoId);
        
        if (!concepto) {
            throw new Error('Concepto no encontrado: ' + conceptoId);
        }
        
        // Calcular costos con motores
        const costoDirecto = indirectosEngine.calcularCostoDirecto(concepto);
        const indirectos = indirectosEngine.calcularIndirectos(concepto);
        const equipos = equiposEngine.calcularEquipos(concepto);
        
        return {
            concepto: {
                codigo: concepto.codigo,
                descripcion: concepto.descripcion_corta,
                descripcionCompleta: concepto.descripcion_tecnica,
                unidad: concepto.unidad,
                rendimiento: concepto.rendimiento_base
            },
            costos: {
                materiales: {
                    detalle: concepto.recursos?.materiales || [],
                    subtotal: concepto.costos_base?.costo_material || 0
                },
                manoObra: {
                    detalle: concepto.recursos?.mano_obra || [],
                    subtotal: concepto.costos_base?.costo_mano_obra || 0
                },
                equipos: {
                    detalle: equipos.detalle,
                    subtotal: equipos.total
                },
                indirectos: {
                    detalle: Object.values(indirectos.detalle),
                    subtotal: indirectos.total
                },
                costoDirectoTotal: costoDirecto,
                costoConIndirectos: indirectos.costoConIndirectos,
                costoUnitario: concepto.rendimiento_base > 0 
                    ? indirectos.costoConIndirectos / concepto.rendimiento_base 
                    : 0
            },
            fecha: new Date().toISOString()
        };
    },
    
    // ─────────────────────────────────────────────────────────────────
    // EXPORTAR APU A PDF
    // ─────────────────────────────────────────────────────────────────
    exportarPDF: async function(apu, opciones = {}) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configuración
        const margenIzq = 20;
        const margenSup = 20;
        let yPos = margenSup;
        
        // ─────────────────────────────────────────────────────────────
        // ENCABEZADO
        // ─────────────────────────────────────────────────────────────
        doc.setFillColor(26, 26, 26);
        doc.rect(0, 0, 210, 30, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('ANÁLISIS DE PRECIOS UNITARIOS', 105, yPos + 10, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('SmartCot - Cotizador Industrial Inteligente', 105, yPos + 18, { align: 'center' });
        
        yPos = 45;
        
        // ─────────────────────────────────────────────────────────────
        // DATOS DEL CONCEPTO
        // ─────────────────────────────────────────────────────────────
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('DATOS DEL CONCEPTO', margenIzq, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Código: ${apu.concepto.codigo}`, margenIzq, yPos);
        yPos += 6;
        doc.text(`Descripción: ${apu.concepto.descripcion}`, margenIzq, yPos);
        yPos += 6;
        doc.text(`Unidad: ${apu.concepto.unidad}`, margenIzq, yPos);
        yPos += 6;
        doc.text(`Rendimiento: ${apu.concepto.rendimiento} ${apu.concepto.unidad}/jornada`, margenIzq, yPos);
        yPos += 10;
        
        // ─────────────────────────────────────────────────────────────
        // MATERIALES
        // ─────────────────────────────────────────────────────────────
        if (apu.costos.materiales.detalle.length > 0) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('MATERIALES', margenIzq, yPos);
            yPos += 7;
            
            // Encabezados de tabla
            const headers = ['Código', 'Descripción', 'Cantidad', 'Unidad', 'P. Unit', 'Importe'];
            const widths = [25, 70, 20, 15, 25, 35];
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setFillColor(240, 240, 240);
            
            let xPos = margenIzq;
            headers.forEach((header, i) => {
                doc.rect(xPos, yPos - 5, widths[i], 5, 'F');
                doc.text(header, xPos + 2, yPos - 1.5);
                xPos += widths[i];
            });
            
            yPos += 2;
            
            // Datos
            doc.setFont('helvetica', 'normal');
            apu.costos.materiales.detalle.forEach((m, i) => {
                xPos = margenIzq;
                doc.text(m.material_codigo || '', xPos + 2, yPos);
                xPos += widths[0];
                doc.text((m.nombre || '').substring(0, 40), xPos + 2, yPos);
                xPos += widths[1];
                doc.text(m.cantidad.toFixed(4), xPos + 2, yPos);
                xPos += widths[2];
                doc.text(m.unidad, xPos + 2, yPos);
                xPos += widths[3];
                doc.text('$' + m.precio_unitario.toFixed(2), xPos + 2, yPos);
                xPos += widths[4];
                doc.text('$' + m.importe.toFixed(2), xPos + 2, yPos);
                yPos += 5;
            });
            
            // Subtotal
            yPos += 3;
            doc.setFont('helvetica', 'bold');
            doc.text('SUBTOTAL MATERIALES:', 150, yPos);
            doc.text('$' + apu.costos.materiales.subtotal.toFixed(2), 190, yPos, { align: 'right' });
            yPos += 10;
        }
        
        // ─────────────────────────────────────────────────────────────
        // MANO DE OBRA
        // ─────────────────────────────────────────────────────────────
        if (apu.costos.manoObra.detalle.length > 0) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('MANO DE OBRA', margenIzq, yPos);
            yPos += 7;
            
            const headers = ['Puesto', 'Horas', 'Sal/Hora', 'Importe'];
            const widths = [90, 30, 35, 35];
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setFillColor(240, 240, 240);
            
            let xPos = margenIzq;
            headers.forEach((header, i) => {
                doc.rect(xPos, yPos - 5, widths[i], 5, 'F');
                doc.text(header, xPos + 2, yPos - 1.5);
                xPos += widths[i];
            });
            
            yPos += 2;
            
            doc.setFont('helvetica', 'normal');
            apu.costos.manoObra.detalle.forEach((mo, i) => {
                xPos = margenIzq;
                doc.text(mo.puesto || '', xPos + 2, yPos);
                xPos += widths[0];
                doc.text(mo.horas_jornada.toFixed(4), xPos + 2, yPos);
                xPos += widths[1];
                doc.text('$' + mo.salario_hora.toFixed(2), xPos + 2, yPos);
                xPos += widths[2];
                doc.text('$' + mo.importe.toFixed(2), xPos + 2, yPos);
                yPos += 5;
            });
            
            yPos += 3;
            doc.setFont('helvetica', 'bold');
            doc.text('SUBTOTAL MANO DE OBRA:', 150, yPos);
            doc.text('$' + apu.costos.manoObra.subtotal.toFixed(2), 190, yPos, { align: 'right' });
            yPos += 10;
        }
        
        // ─────────────────────────────────────────────────────────────
        // EQUIPOS
        // ─────────────────────────────────────────────────────────────
        if (apu.costos.equipos.detalle.length > 0) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('EQUIPOS', margenIzq, yPos);
            yPos += 7;
            
            const headers = ['Equipo', 'Cantidad', 'Unidad', 'P. Unit', 'Importe'];
            const widths = [80, 25, 20, 30, 35];
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setFillColor(240, 240, 240);
            
            let xPos = margenIzq;
            headers.forEach((header, i) => {
                doc.rect(xPos, yPos - 5, widths[i], 5, 'F');
                doc.text(header, xPos + 2, yPos - 1.5);
                xPos += widths[i];
            });
            
            yPos += 2;
            
            doc.setFont('helvetica', 'normal');
            apu.costos.equipos.detalle.forEach((eq, i) => {
                xPos = margenIzq;
                doc.text(eq.nombre.substring(0, 40), xPos + 2, yPos);
                xPos += widths[0];
                doc.text(eq.cantidad.toFixed(4), xPos + 2, yPos);
                xPos += widths[1];
                doc.text(eq.unidad, xPos + 2, yPos);
                xPos += widths[2];
                doc.text('$' + eq.precioUnitario.toFixed(2), xPos + 2, yPos);
                xPos += widths[3];
                doc.text('$' + eq.importe.toFixed(2), xPos + 2, yPos);
                yPos += 5;
            });
            
            yPos += 3;
            doc.setFont('helvetica', 'bold');
            doc.text('SUBTOTAL EQUIPOS:', 150, yPos);
            doc.text('$' + apu.costos.equipos.subtotal.toFixed(2), 190, yPos, { align: 'right' });
            yPos += 10;
        }
        
        // ─────────────────────────────────────────────────────────────
        // INDIRECTOS
        // ─────────────────────────────────────────────────────────────
        if (apu.costos.indirectos.detalle.length > 0) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('INDIRECTOS', margenIzq, yPos);
            yPos += 7;
            
            const headers = ['Concepto', '%', 'Importe'];
            const widths = [120, 30, 40];
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setFillColor(240, 240, 240);
            
            let xPos = margenIzq;
            headers.forEach((header, i) => {
                doc.rect(xPos, yPos - 5, widths[i], 5, 'F');
                doc.text(header, xPos + 2, yPos - 1.5);
                xPos += widths[i];
            });
            
            yPos += 2;
            
            doc.setFont('helvetica', 'normal');
            apu.costos.indirectos.detalle.forEach((ind, i) => {
                xPos = margenIzq;
                doc.text(ind.nombre, xPos + 2, yPos);
                xPos += widths[0];
                doc.text(ind.porcentaje.toFixed(2) + '%', xPos + 2, yPos);
                xPos += widths[1];
                doc.text('$' + ind.monto.toFixed(2), xPos + 2, yPos);
                yPos += 5;
            });
            
            yPos += 3;
            doc.setFont('helvetica', 'bold');
            doc.text('SUBTOTAL INDIRECTOS:', 150, yPos);
            doc.text('$' + apu.costos.indirectos.subtotal.toFixed(2), 190, yPos, { align: 'right' });
            yPos += 10;
        }
        
        // ─────────────────────────────────────────────────────────────
        // TOTALES
        // ─────────────────────────────────────────────────────────────
        yPos += 5;
        doc.setFillColor(26, 26, 26);
        doc.rect(margenIzq, yPos, 170, 25, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Costo Directo:', margenIzq + 5, yPos + 8);
        doc.text('$' + apu.costos.costoDirectoTotal.toFixed(2), margenIzq + 165, yPos + 8, { align: 'right' });
        
        doc.text('Indirectos:', margenIzq + 5, yPos + 15);
        doc.text('$' + apu.costos.indirectos.subtotal.toFixed(2), margenIzq + 165, yPos + 15, { align: 'right' });
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('COSTO TOTAL:', margenIzq + 5, yPos + 22);
        doc.text('$' + apu.costos.costoConIndirectos.toFixed(2), margenIzq + 165, yPos + 22, { align: 'right' });
        
        yPos += 30;
        
        // ─────────────────────────────────────────────────────────────
        // COSTO UNITARIO
        // ─────────────────────────────────────────────────────────────
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('COSTO UNITARIO:', margenIzq, yPos);
        doc.setFontSize(14);
        doc.text('$' + apu.costos.costoUnitario.toFixed(2) + ' por ' + apu.concepto.unidad, margenIzq + 50, yPos);
        yPos += 15;
        
        // ─────────────────────────────────────────────────────────────
        // PIE DE PÁGINA
        // ─────────────────────────────────────────────────────────────
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150, 150, 150);
        doc.text('Generado por SmartCot - ' + new Date().toLocaleDateString('es-MX'), 105, 280, { align: 'center' });
        
        // Guardar PDF
        const nombreArchivo = `APU_${apu.concepto.codigo}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(nombreArchivo);
        
        console.log('✅ PDF generado:', nombreArchivo);
        return { success: true, archivo: nombreArchivo };
    },
    
    // ─────────────────────────────────────────────────────────────────
    // EXPORTAR APU A EXCEL
    // ─────────────────────────────────────────────────────────────────
    exportarExcel: async function(apu) {
        if (typeof XLSX === 'undefined') {
            throw new Error('SheetJS (XLSX) no está cargado');
        }
        
        const datos = {
            'Concepto': [{
                'Código': apu.concepto.codigo,
                'Descripción': apu.concepto.descripcion,
                'Unidad': apu.concepto.unidad,
                'Rendimiento': apu.concepto.rendimiento
            }],
            'Materiales': apu.costos.materiales.detalle.map(m => ({
                'Código': m.material_codigo,
                'Descripción': m.nombre,
                'Cantidad': m.cantidad,
                'Unidad': m.unidad,
                'Precio Unitario': m.precio_unitario,
                'Importe': m.importe
            })),
            'Mano de Obra': apu.costos.manoObra.detalle.map(mo => ({
                'Puesto': mo.puesto,
                'Horas': mo.horas_jornada,
                'Salario Hora': mo.salario_hora,
                'Importe': mo.importe
            })),
            'Equipos': apu.costos.equipos.detalle.map(eq => ({
                'Equipo': eq.nombre,
                'Cantidad': eq.cantidad,
                'Unidad': eq.unidad,
                'Precio Unitario': eq.precioUnitario,
                'Importe': eq.importe
            })),
            'Indirectos': apu.costos.indirectos.detalle.map(ind => ({
                'Concepto': ind.nombre,
                'Porcentaje': ind.porcentaje,
                'Importe': ind.monto
            })),
            'Totales': [{
                'Costo Directo': apu.costos.costoDirectoTotal,
                'Indirectos': apu.costos.indirectos.subtotal,
                'Costo Total': apu.costos.costoConIndirectos,
                'Costo Unitario': apu.costos.costoUnitario
            }]
        };
        
        const workbook = XLSX.utils.book_new();
        
        Object.entries(datos).forEach(([nombre, hoja]) => {
            const worksheet = XLSX.utils.json_to_sheet(hoja);
            XLSX.utils.book_append_sheet(workbook, worksheet, nombre);
        });
        
        const nombreArchivo = `APU_${apu.concepto.codigo}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, nombreArchivo);
        
        console.log('✅ Excel generado:', nombreArchivo);
        return { success: true, archivo: nombreArchivo };
    }
};

console.log('✅ apu-generator.js listo');
