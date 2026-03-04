// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - GENERADOR DE REPORTES PDF
// ─────────────────────────────────────────────────────────────────────

console.log('📄 reportes.js cargado');

window.reportes = {
    
    // ─────────────────────────────────────────────────────────────────
    // GENERAR PDF DE COTIZACIÓN COMPLETA
    // ─────────────────────────────────────────────────────────────────
    generarCotizacionPDF: async function(cotizacionId) {
        try {
            console.log('📄 Generando PDF de cotización #', cotizacionId);
            
            if (typeof window.jspdf === 'undefined') {
                alert('⚠️ jsPDF no está cargado');
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Obtener cotización de la BD
            const cotizacion = await window.db.cotizaciones.get(parseInt(cotizacionId));
            if (!cotizacion) {
                alert('❌ Cotización no encontrada');
                return;
            }
            
            // Obtener cliente
            const cliente = cotizacion.clienteId ? await window.db.clientes.get(parseInt(cotizacion.clienteId)) : null;
            
            // ─────────────────────────────────────────────────────────
            // ENCABEZADO
            // ─────────────────────────────────────────────────────────
            // Logo y nombre de empresa
            const config = await window.db.configuracion.toArray();
            const configObj = {};
            config.forEach(function(c) { configObj[c.clave] = c.valor; });
            
            const empresa = configObj.empresa || 'SmartCot';
            
            // Fondo del encabezado
            doc.setFillColor(26, 26, 26);
            doc.rect(0, 0, 210, 40, 'F');
            
            // Nombre de empresa
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text(empresa, 15, 20);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Cotizador Industrial Inteligente', 15, 28);
            
            // Número de cotización
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('COTIZACIÓN #' + cotizacion.id, 150, 20);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Fecha: ' + new Date(cotizacion.fecha).toLocaleDateString('es-MX'), 150, 28);
            
            // ─────────────────────────────────────────────────────────
            // INFORMACIÓN DEL CLIENTE Y PROYECTO
            // ─────────────────────────────────────────────────────────
            let yPos = 55;
            
            doc.setFillColor(227, 242, 253);
            doc.rect(15, yPos - 10, 180, 35, 'F');
            
            doc.setTextColor(21, 101, 192);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('📋 INFORMACIÓN DEL PROYECTO', 20, yPos);
            
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            
            yPos += 8;
            doc.text('Cliente: ' + (cliente ? cliente.nombre : 'No especificado'), 20, yPos);
            yPos += 6;
            doc.text('Descripción: ' + (cotizacion.descripcion || 'Sin descripción'), 20, yPos);
            yPos += 6;
            doc.text('Ubicación: ' + (cotizacion.ubicacion || 'No especificada'), 20, yPos);
            yPos += 6;
            if (cotizacion.fechaInicio) {
                doc.text('Fecha Inicio: ' + new Date(cotizacion.fechaInicio).toLocaleDateString('es-MX'), 20, yPos);
                yPos += 6;
            }
            if (cotizacion.fechaFinSolicitada) {
                doc.text('Fecha Fin Solicitada: ' + new Date(cotizacion.fechaFinSolicitada).toLocaleDateString('es-MX'), 20, yPos);
            }
            
            // ─────────────────────────────────────────────────────────
            // CONCEPTOS
            // ─────────────────────────────────────────────────────────
            yPos += 15;
            
            doc.setFillColor(26, 26, 26);
            doc.rect(15, yPos - 8, 180, 8, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('📦 CONCEPTOS', 20, yPos - 2);
            
            yPos += 10;
            
            // Encabezados de tabla
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            
            const colWidths = [25, 100, 20, 25, 30];
            const headers = ['Código', 'Descripción', 'Cant.', 'Unitario', 'Importe'];
            let xPos = 20;
            
            headers.forEach(function(header, index) {
                doc.text(header, xPos, yPos);
                xPos += colWidths[index];
            });
            
            yPos += 2;
            doc.setDrawColor(200);
            doc.line(15, yPos, 195, yPos);
            yPos += 5;
            
            // Conceptos
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            
            if (cotizacion.conceptosCatalogo && cotizacion.conceptosCatalogo.length > 0) {
                cotizacion.conceptosCatalogo.forEach(function(c) {
                    const subtotal = (c.costos_base?.costo_directo_total || 0) * (c.cantidad || 1);
                    
                    // Código
                    doc.text(c.codigo || '', 20, yPos);
                    
                    // Descripción (truncada)
                    const desc = (c.descripcion_corta || 'Sin descripción').substring(0, 50);
                    doc.text(desc, 50, yPos);
                    
                    // Cantidad
                    doc.text((c.cantidad || 1).toString(), 155, yPos);
                    
                    // Costo Unitario
                    doc.text(calculator.formatoMoneda(c.costos_base?.costo_directo_total || 0), 175, yPos);
                    
                    // Importe
                    doc.text(calculator.formatoMoneda(subtotal), 200, yPos, { align: 'right' });
                    
                    yPos += 5;
                    
                    // Verificar si necesita nueva página
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
            } else {
                doc.setTextColor(150, 150, 150);
                doc.text('No hay conceptos en esta cotización', 20, yPos);
                yPos += 10;
            }
            
            // ─────────────────────────────────────────────────────────
            // TIEMPO DE EJECUCIÓN
            // ─────────────────────────────────────────────────────────
            yPos += 5;
            doc.setDrawColor(200);
            doc.line(15, yPos, 195, yPos);
            yPos += 8;
            
            doc.setFillColor(232, 245, 233);
            doc.rect(15, yPos - 8, 180, 8, 'F');
            
            doc.setTextColor(46, 125, 50);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('⏱️ TIEMPO DE EJECUCIÓN ESTIMADO', 20, yPos - 2);
            
            yPos += 10;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            
            if (cotizacion.tiempoEjecucion) {
                doc.text('Jornadas: ' + (cotizacion.tiempoEjecucion.jornadas || 0), 20, yPos);
                doc.text('Días Hábiles: ' + (cotizacion.tiempoEjecucion.diasHabiles || 0), 70, yPos);
                doc.text('Semanas: ' + (cotizacion.tiempoEjecucion.semanas || 0), 130, yPos);
                doc.text('Meses: ' + (cotizacion.tiempoEjecucion.meses || 0), 180, yPos);
            }
            
            yPos += 10;
            
            // ─────────────────────────────────────────────────────────
            // FACTORES DE AJUSTE (SI APLICAN)
            // ─────────────────────────────────────────────────────────
            if (cotizacion.factoresAjuste && cotizacion.factoresAjuste.total > 1) {
                doc.setFillColor(255, 243, 224);
                doc.rect(15, yPos - 8, 180, 8, 'F');
                
                doc.setTextColor(230, 81, 0);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text('⚠️ FACTORES DE AJUSTE APLICADOS', 20, yPos - 2);
                
                yPos += 10;
                doc.setTextColor(26, 26, 26);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                
                doc.text('Altura: ' + (cotizacion.factoresAjuste.altura || 1) + 'x', 20, yPos);
                doc.text('Clima: ' + (cotizacion.factoresAjuste.clima || 1) + 'x', 70, yPos);
                doc.text('Acceso: ' + (cotizacion.factoresAjuste.acceso || 1) + 'x', 120, yPos);
                doc.text('Seguridad: ' + (cotizacion.factoresAjuste.seguridad || 1) + 'x', 170, yPos);
                
                yPos += 6;
                doc.setFont('helvetica', 'bold');
                doc.text('Factor Total: ' + (cotizacion.factoresAjuste.total || 1) + 'x', 20, yPos);
                
                yPos += 10;
            }
            
            // ─────────────────────────────────────────────────────────
            // RESUMEN FINANCIERO
            // ─────────────────────────────────────────────────────────
            yPos += 5;
            doc.setDrawColor(200);
            doc.line(15, yPos, 195, yPos);
            yPos += 8;
            
            doc.setFillColor(26, 26, 26);
            doc.rect(15, yPos - 8, 180, 8, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('💰 RESUMEN FINANCIERO', 20, yPos - 2);
            
            yPos += 10;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            
            // Calcular totales si no existen
            const costoDirecto = cotizacion.costoDirecto || 0;
            const totalIndirectos = cotizacion.totalIndirectos || 0;
            const utilidad = cotizacion.utilidad || 0;
            const iva = cotizacion.iva || 0;
            const totalFinal = cotizacion.totalFinal || 0;
            
            doc.text('Costo Directo:', 20, yPos);
            doc.text(calculator.formatoMoneda(costoDirecto), 195, yPos, { align: 'right' });
            yPos += 6;
            
            doc.text('Indirectos:', 20, yPos);
            doc.text(calculator.formatoMoneda(totalIndirectos), 195, yPos, { align: 'right' });
            yPos += 6;
            
            doc.text('Utilidad:', 20, yPos);
            doc.text(calculator.formatoMoneda(utilidad), 195, yPos, { align: 'right' });
            yPos += 6;
            
            doc.text('IVA (16%):', 20, yPos);
            doc.text(calculator.formatoMoneda(iva), 195, yPos, { align: 'right' });
            yPos += 8;
            
            // TOTAL FINAL
            doc.setFillColor(76, 175, 80);
            doc.rect(15, yPos - 8, 180, 10, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('TOTAL FINAL:', 20, yPos - 1);
            doc.text(calculator.formatoMoneda(totalFinal), 195, yPos - 1, { align: 'right' });
            
            // ─────────────────────────────────────────────────────────
            // PIE DE PÁGINA
            // ─────────────────────────────────────────────────────────
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text('Página ' + i + ' de ' + pageCount, 105, 290, { align: 'center' });
                
                doc.text('Generado por SmartCot v2.0 - ' + new Date().toLocaleDateString('es-MX'), 15, 295);
            }
            
            // ─────────────────────────────────────────────────────────
            // GUARDAR PDF
            // ─────────────────────────────────────────────────────────
            const nombreArchivo = 'Cotizacion-' + cotizacion.id + '-' + (cliente ? cliente.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'sin-cliente') + '.pdf';
            doc.save(nombreArchivo);
            
            console.log('✅ PDF generado:', nombreArchivo);
            alert('✅ PDF generado exitosamente');
            
        } catch (error) {
            console.error('❌ Error generando PDF:', error);
            alert('❌ Error al generar PDF: ' + error.message);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // GENERAR PDF DE APU (ANÁLISIS DE PRECIOS UNITARIOS)
    // ─────────────────────────────────────────────────────────────────
    generarAPUPDF: async function(conceptoId) {
        try {
            console.log('📄 Generando APU PDF para concepto #', conceptoId);
            
            if (typeof window.jspdf === 'undefined') {
                alert('⚠️ jsPDF no está cargado');
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Obtener concepto de la BD
            const concepto = await window.db.conceptos.get(conceptoId);
            if (!concepto) {
                alert('❌ Concepto no encontrado');
                return;
            }
            
            // ─────────────────────────────────────────────────────────
            // ENCABEZADO
            // ─────────────────────────────────────────────────────────
            doc.setFillColor(26, 26, 26);
            doc.rect(0, 0, 210, 35, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('ANÁLISIS DE PRECIOS UNITARIOS', 15, 20);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('SmartCot v2.0 - Cotizador Industrial', 15, 28);
            
            // ─────────────────────────────────────────────────────────
            // INFORMACIÓN DEL CONCEPTO
            // ─────────────────────────────────────────────────────────
            let yPos = 50;
            
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Concepto: ' + concepto.codigo, 15, yPos);
            
            yPos += 8;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Descripción: ' + (concepto.descripcion_corta || 'Sin descripción'), 15, yPos);
            
            yPos += 6;
            doc.text('Unidad: ' + (concepto.unidad || 'N/A'), 15, yPos);
            
            yPos += 6;
            doc.text('Rendimiento: ' + (concepto.rendimiento_base || 0), 15, yPos);
            
            // ─────────────────────────────────────────────────────────
            // MATERIALES
            // ─────────────────────────────────────────────────────────
            yPos += 10;
            
            doc.setFillColor(33, 150, 243);
            doc.rect(15, yPos - 6, 180, 6, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('📦 MATERIALES', 20, yPos - 2);
            
            yPos += 8;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            
            const materiales = concepto.recursos?.materiales || [];
            if (materiales.length > 0) {
                let xPos = 20;
                const colWidths = [80, 25, 30, 30, 25];
                const headers = ['Material', 'Cantidad', 'Unidad', 'Precio Unit.', 'Importe'];
                
                headers.forEach(function(header, index) {
                    doc.text(header, xPos, yPos);
                    xPos += colWidths[index];
                });
                
                yPos += 2;
                doc.setDrawColor(200);
                doc.line(15, yPos, 195, yPos);
                yPos += 5;
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                
                let totalMateriales = 0;
                materiales.forEach(function(m) {
                    doc.text(m.nombre || m.material_codigo || 'Sin nombre', 20, yPos);
                    doc.text((m.cantidad || 0).toString(), 105, yPos);
                    doc.text(m.unidad || '', 135, yPos);
                    doc.text(calculator.formatoMoneda(m.precio_unitario || 0), 170, yPos);
                    doc.text(calculator.formatoMoneda(m.importe || 0), 195, yPos, { align: 'right' });
                    
                    totalMateriales += (m.importe || 0);
                    yPos += 5;
                    
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
                
                yPos += 2;
                doc.setDrawColor(200);
                doc.line(15, yPos, 195, yPos);
                yPos += 5;
                
                doc.setFont('helvetica', 'bold');
                doc.text('Subtotal Materiales:', 150, yPos);
                doc.text(calculator.formatoMoneda(totalMateriales), 195, yPos, { align: 'right' });
            } else {
                doc.setTextColor(150, 150, 150);
                doc.text('No hay materiales', 20, yPos);
            }
            
            // ─────────────────────────────────────────────────────────
            // MANO DE OBRA
            // ─────────────────────────────────────────────────────────
            yPos += 10;
            
            doc.setFillColor(76, 175, 80);
            doc.rect(15, yPos - 6, 180, 6, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('👷 MANO DE OBRA', 20, yPos - 2);
            
            yPos += 8;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            
            const manoObra = concepto.recursos?.mano_obra || [];
            if (manoObra.length > 0) {
                let xPos = 20;
                const colWidths = [80, 30, 40, 40];
                const headers = ['Puesto', 'Horas/Jornada', 'Salario/Hora', 'Importe'];
                
                headers.forEach(function(header, index) {
                    doc.text(header, xPos, yPos);
                    xPos += colWidths[index];
                });
                
                yPos += 2;
                doc.setDrawColor(200);
                doc.line(15, yPos, 195, yPos);
                yPos += 5;
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                
                let totalManoObra = 0;
                manoObra.forEach(function(mo) {
                    doc.text(mo.puesto || 'Sin nombre', 20, yPos);
                    doc.text((mo.horas_jornada || 0).toFixed(4), 105, yPos);
                    doc.text(calculator.formatoMoneda(mo.salario_hora || 0), 140, yPos);
                    doc.text(calculator.formatoMoneda(mo.importe || 0), 195, yPos, { align: 'right' });
                    
                    totalManoObra += (mo.importe || 0);
                    yPos += 5;
                    
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
                
                yPos += 2;
                doc.setDrawColor(200);
                doc.line(15, yPos, 195, yPos);
                yPos += 5;
                
                doc.setFont('helvetica', 'bold');
                doc.text('Subtotal Mano de Obra:', 150, yPos);
                doc.text(calculator.formatoMoneda(totalManoObra), 195, yPos, { align: 'right' });
            } else {
                doc.setTextColor(150, 150, 150);
                doc.text('No hay mano de obra', 20, yPos);
            }
            
            // ─────────────────────────────────────────────────────────
            // EQUIPOS
            // ─────────────────────────────────────────────────────────
            yPos += 10;
            
            doc.setFillColor(255, 152, 0);
            doc.rect(15, yPos - 6, 180, 6, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('🏗️ EQUIPOS', 20, yPos - 2);
            
            yPos += 8;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            
            const equipos = concepto.recursos?.equipos || [];
            if (equipos.length > 0) {
                let xPos = 20;
                const colWidths = [80, 30, 40, 40];
                const headers = ['Equipo', 'Horas', 'Costo Unit.', 'Importe'];
                
                headers.forEach(function(header, index) {
                    doc.text(header, xPos, yPos);
                    xPos += colWidths[index];
                });
                
                yPos += 2;
                doc.setDrawColor(200);
                doc.line(15, yPos, 195, yPos);
                yPos += 5;
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                
                let totalEquipos = 0;
                equipos.forEach(function(e) {
                    doc.text(e.nombre || e.equipo_codigo || 'Sin nombre', 20, yPos);
                    doc.text((e.horas || 0).toString(), 105, yPos);
                    doc.text(calculator.formatoMoneda(e.costo_unitario || 0), 140, yPos);
                    doc.text(calculator.formatoMoneda(e.importe || 0), 195, yPos, { align: 'right' });
                    
                    totalEquipos += (e.importe || 0);
                    yPos += 5;
                    
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
                
                yPos += 2;
                doc.setDrawColor(200);
                doc.line(15, yPos, 195, yPos);
                yPos += 5;
                
                doc.setFont('helvetica', 'bold');
                doc.text('Subtotal Equipos:', 150, yPos);
                doc.text(calculator.formatoMoneda(totalEquipos), 195, yPos, { align: 'right' });
            } else {
                doc.setTextColor(150, 150, 150);
                doc.text('No hay equipos', 20, yPos);
            }
            
            // ─────────────────────────────────────────────────────────
            // COSTO DIRECTO TOTAL
            // ─────────────────────────────────────────────────────────
            yPos += 10;
            
            doc.setFillColor(26, 26, 26);
            doc.rect(15, yPos - 8, 180, 10, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('COSTO DIRECTO TOTAL:', 20, yPos - 1);
            
            const costoDirecto = concepto.costos_base?.costo_directo_total || 0;
            doc.text(calculator.formatoMoneda(costoDirecto), 195, yPos - 1, { align: 'right' });
            
            // ─────────────────────────────────────────────────────────
            // PIE DE PÁGINA
            // ─────────────────────────────────────────────────────────
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text('Página ' + i + ' de ' + pageCount, 105, 290, { align: 'center' });
                
                doc.text('Generado por SmartCot v2.0 - ' + new Date().toLocaleDateString('es-MX'), 15, 295);
            }
            
            // ─────────────────────────────────────────────────────────
            // GUARDAR PDF
            // ─────────────────────────────────────────────────────────
            const nombreArchivo = 'APU-' + concepto.codigo + '.pdf';
            doc.save(nombreArchivo);
            
            console.log('✅ APU PDF generado:', nombreArchivo);
            alert('✅ APU PDF generado exitosamente');
            
        } catch (error) {
            console.error('❌ Error generando APU PDF:', error);
            alert('❌ Error al generar APU PDF: ' + error.message);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // EXPORTAR CURVA S A PDF
    // ─────────────────────────────────────────────────────────────────
    exportarCurvaSPDF: async function(cotizacionId) {
        try {
            console.log('📄 Exportando Curva S a PDF...');
            
            if (typeof window.jspdf === 'undefined') {
                alert('⚠️ jsPDF no está cargado');
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Obtener cotización
            const cotizacion = await window.db.cotizaciones.get(parseInt(cotizacionId));
            if (!cotizacion) {
                alert('❌ Cotización no encontrada');
                return;
            }
            
            // Encabezado
            doc.setFillColor(26, 26, 26);
            doc.rect(0, 0, 210, 35, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('CURVA S - SEGUIMIENTO DE OBRA', 15, 20);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('SmartCot v2.0', 15, 28);
            
            // Información
            let yPos = 50;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(10);
            doc.text('Cotización #' + cotizacion.id, 15, yPos);
            yPos += 6;
            doc.text('Fecha: ' + new Date().toLocaleDateString('es-MX'), 15, yPos);
            
            // Capturar gráfica
            const canvas = document.getElementById('curva-s-chart');
            if (canvas) {
                yPos += 10;
                const imgData = canvas.toDataURL('image/png');
                doc.addImage(imgData, 'PNG', 15, yPos, 180, 100);
            }
            
            // Pie de página
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text('Página ' + i + ' de ' + pageCount, 105, 290, { align: 'center' });
            }
            
            // Guardar
            doc.save('Curva-S-Cotizacion-' + cotizacionId + '.pdf');
            
            console.log('✅ Curva S PDF exportado');
            alert('✅ Curva S exportada a PDF');
            
        } catch (error) {
            console.error('❌ Error exportando Curva S:', error);
            alert('❌ Error: ' + error.message);
        }
    }
};

console.log('✅ reportes.js listo');
