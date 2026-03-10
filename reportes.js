// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - GENERADOR DE REPORTES PDF (PROFESIONAL)
// ─────────────────────────────────────────────────────────────────────

console.log('📄 reportes.js cargado');

window.reportes = {
    
    // ─────────────────────────────────────────────────────────────────
    // GENERAR PDF DE COTIZACIÓN COMPLETA (CORREGIDO)
    // ─────────────────────────────────────────────────────────────────
    generarCotizacionPDF: async function(cotizacionId) {
        try {
            console.log('📄 Generando PDF de cotización #', cotizacionId);
            
            // ⚠️ VERIFICAR LICENCIA
            var limite = await window.licencia.verificarLimite('reportesPDF');
            if (!limite.permitido) {
                alert('❌ ' + limite.razon);
                return;
            }
            
            if (typeof window.jspdf === 'undefined') {
                alert('⚠️ jsPDF no está cargado');
                return;
            }
            
            // ⚠️ CARGAR CONFIGURACIÓN (ENTERPRISE)
            const licencia = window.licencia.cargar();
            let logoBase64 = null;
            let colorCorporativo = '#1a1a1a';
            let empresaNombre = '';
            
            if (licencia?.tipo === 'ENTERPRISE') {
                const configLogo = await window.db.configuracion.get('marca_logo');
                const configColor = await window.db.configuracion.get('marca_colores');
                const configEmpresa = await window.db.configuracion.get('empresa');
                if (configLogo) logoBase64 = configLogo.valor;
                if (configColor) colorCorporativo = configColor.valor;
                if (configEmpresa) empresaNombre = configEmpresa.valor;
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // ⚠️ OBTENER COTIZACIÓN
            const cotizacion = await window.db.cotizaciones.get(parseInt(cotizacionId));
            if (!cotizacion) {
                alert('❌ Cotización no encontrada');
                return;
            }
            
            // ⚠️ OBTENER CLIENTE
            let cliente = null;
            if (cotizacion.clienteId) {
                cliente = await window.db.clientes.get(parseInt(cotizacion.clienteId));
            }
            
            // ─────────────────────────────────────────────────────────
            // ENCABEZADO
            // ─────────────────────────────────────────────────────────
            doc.setFillColor(245, 245, 245);
            doc.rect(0, 0, 210, 35, 'F');
            
            if (logoBase64) {
                doc.setFillColor(255, 255, 255);
                doc.rect(10, 5, 45, 25, 'F');
                doc.addImage(logoBase64, 'PNG', 12, 7, 41, 21);
                
                doc.setTextColor(26, 26, 26);
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text('COTIZACION', 200, 18, { align: 'right' });
                
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.text('SmartCot v2.0 - Cotizador Industrial', 200, 26, { align: 'right' });
            } else {
                doc.setFillColor(26, 26, 26);
                doc.rect(0, 0, 210, 35, 'F');
                
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text('COTIZACION', 105, 18, { align: 'center' });
                
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.text('SmartCot v2.0 - Cotizador Industrial', 105, 27, { align: 'center' });
            }
            
            // Línea de color corporativo
            if (licencia?.tipo === 'ENTERPRISE' && colorCorporativo) {
                doc.setDrawColor(colorCorporativo);
                doc.setLineWidth(3);
                doc.line(0, 35, 210, 35);
            }
            
            // ─────────────────────────────────────────────────────────
            // DATOS DEL PROYECTO
            // ─────────────────────────────────────────────────────────
            let yPos = 45;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(10);
            
            // Cliente
            doc.setFont('helvetica', 'bold');
            doc.text('Cliente:', 15, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text((cliente ? cliente.nombre : 'Sin cliente') || 'Sin cliente', 50, yPos);
            
            yPos += 7;
            doc.setFont('helvetica', 'bold');
            doc.text('Proyecto:', 15, yPos);
            doc.setFont('helvetica', 'normal');
            // ⚠️ DESCRIPCIÓN COMPLETA EN 2-3 LÍNEAS
            const descripcionProyecto = cotizacion.descripcion || 'Sin descripcion';
            const lineasDesc = doc.splitTextToSize(descripcionProyecto, 145);
            doc.text(lineasDesc, 50, yPos);
            yPos += (lineasDesc.length * 7);
            
            doc.setFont('helvetica', 'bold');
            doc.text('Ubicacion:', 15, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(cotizacion.ubicacion || 'N/A', 50, yPos);
            
            yPos += 7;
            doc.setFont('helvetica', 'bold');
            doc.text('Fecha:', 15, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(new Date(cotizacion.fecha).toLocaleDateString('es-MX'), 50, yPos);
            
            yPos += 7;
            doc.setFont('helvetica', 'bold');
            doc.text('Numero:', 15, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text('#' + cotizacion.id, 50, yPos);
            
            // ─────────────────────────────────────────────────────────
            // TABLA DE CONCEPTOS
            // ─────────────────────────────────────────────────────────
            yPos += 10;
            
            // Encabezado de tabla
            if (licencia?.tipo === 'ENTERPRISE' && colorCorporativo) {
                doc.setFillColor(colorCorporativo);
            } else {
                doc.setFillColor(26, 26, 26);
            }
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            
            // ⚠️ COLUMNAS CORREGIDAS (ANCHOS AJUSTADOS)
            const colWidths = [27, 85, 15, 15, 25, 25];
            const headers = ['Codigo', 'Descripcion', 'Cant.', 'Unidad', 'Costo Unit.', 'Importe'];
            let xPos = 15;
            
            doc.rect(15, yPos - 4, 180, 6, 'F');
            
            headers.forEach(function(header, index) {
                doc.text(header, xPos, yPos + 1);
                xPos += colWidths[index];
            });
            
            yPos += 5;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            
            let totalConceptos = 0;
            
            // ⚠️ CONCEPTOS
            if (cotizacion.conceptosCatalogo && cotizacion.conceptosCatalogo.length > 0) {
                cotizacion.conceptosCatalogo.forEach(function(c) {
                    const importe = (c.costos_base?.costo_directo_total || 0) * (c.cantidad || 1);
                    totalConceptos += importe;
                    
                    let codigo = c.codigo || '';
                    if (c.precioEditado) {
                        codigo = 'E' + codigo;
                    }
                    
                    // ⚠️ DESCRIPCIÓN EN MÚLTIPLES LÍNEAS (MAX 45 CARACTERES POR LÍNEA)
                    let descripcion = '';
                    if (c.descripcion_tecnica && c.descripcion_tecnica.trim() !== '') {
                        descripcion = c.descripcion_tecnica;
                    } else if (c.descripcion && c.descripcion.trim() !== '') {
                        descripcion = c.descripcion;
                    } else if (c.descripcion_corta && c.descripcion_corta.trim() !== '') {
                        descripcion = c.descripcion_corta;
                    } else {
                        descripcion = 'Sin descripcion';
                    }
                    
                    const lineas = doc.splitTextToSize(descripcion, 80);
                    
                    doc.text(codigo.substring(0, 10), 15, yPos);
                    doc.text(lineas, 42, yPos);
                    doc.text((c.cantidad || 1).toString(), 125, yPos);
                    doc.text(c.unidad || '', 140, yPos);
                    doc.text(calculator.formatoMoneda(c.costos_base?.costo_directo_total || 0), 172, yPos, { align: 'right' });
                    doc.text(calculator.formatoMoneda(importe), 202, yPos, { align: 'right' });
                    
                    // ⚠️ ESPACIO ADICIONAL POR CADA LÍNEA DE DESCRIPCIÓN
                    yPos += (5 + (lineas.length * 4));
                    
                    if (yPos > 250) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
            } else {
                doc.text('No hay conceptos del catalogo', 15, yPos);
                yPos += 8;
            }
            
            // ─────────────────────────────────────────────────────────
            // MANO DE OBRA (SI APLICA)
            // ─────────────────────────────────────────────────────────
            if (cotizacion.tipo === 'solo-mano-obra-extraida' && cotizacion.manoObraExtraida) {
                yPos += 5;
                doc.setFillColor(76, 175, 80);
                doc.rect(15, yPos - 4, 180, 5, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('MANO DE OBRA', 20, yPos + 1);
                
                yPos += 6;
                doc.setTextColor(26, 26, 26);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                
                cotizacion.manoObraExtraida.forEach(function(mo) {
                    const conceptoInfo = (mo.concepto || mo.conceptoCodigo || 'Sin concepto');
                    const lineasConcepto = doc.splitTextToSize(conceptoInfo, 90);
                    
                    doc.text(lineasConcepto, 20, yPos);
                    yPos += (lineasConcepto.length * 5);
                    
                    doc.text('  Puesto: ' + (mo.puesto || 'Sin puesto'), 20, yPos);
                    yPos += 5;
                    doc.text('  Jornadas: ' + (mo.jornadas ? mo.jornadas.toFixed(2) : '0') + ' jor', 20, yPos);
                    yPos += 5;
                    doc.text('  Costo/Jornada: ' + (mo.costoJornada ? calculator.formatoMoneda(mo.costoJornada) : '$0.00'), 20, yPos);
                    yPos += 5;
                    doc.text('  Importe: ' + (mo.importe ? calculator.formatoMoneda(mo.importe) : '$0.00'), 20, yPos);
                    yPos += 8;
                    
                    if (yPos > 250) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
            }
            
            // ─────────────────────────────────────────────────────────
            // TOTALES (CORREGIDO - QUE QUEPA TODO)
            // ─────────────────────────────────────────────────────────
            yPos += 8;
            
            // Subtotal
            doc.setFont('helvetica', 'bold');
            doc.text('Subtotal:', 140, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(calculator.formatoMoneda(cotizacion.costoDirecto || totalConceptos), 195, yPos, { align: 'right' });
            
            yPos += 6;
            doc.setFont('helvetica', 'bold');
            doc.text('IVA (16%):', 140, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(calculator.formatoMoneda(cotizacion.iva || 0), 195, yPos, { align: 'right' });
            
            yPos += 10;
            
            // ⚠️ RECTÁNGULO DE TOTAL MÁS GRANDE
            if (licencia?.tipo === 'ENTERPRISE' && colorCorporativo) {
                doc.setFillColor(colorCorporativo);
                doc.setTextColor(255, 255, 255);
            } else {
                doc.setFillColor(26, 26, 26);
                doc.setTextColor(255, 255, 255);
            }
            
            // ⚠️ RECTÁNGULO MÁS ANCHO Y ALTO
            doc.rect(140, yPos - 5, 60, 12, 'F');
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text('TOTAL:', 170, yPos + 1, { align: 'center' });
            
            // ⚠️ VALOR EN SEGUNDO RENGLÓN (DENTRO DEL RECTÁNGULO)
            yPos += 7;
            doc.setFontSize(13);
            doc.text(calculator.formatoMoneda(cotizacion.totalFinal || 0), 170, yPos, { align: 'center' });
            
            // ─────────────────────────────────────────────────────────
            // PIE DE PÁGINA
            // ─────────────────────────────────────────────────────────
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text('Pagina ' + i + ' de ' + pageCount, 105, 290, { align: 'center' });
                
                if (empresaNombre) {
                    doc.text(empresaNombre, 15, 295);
                } else {
                    doc.text('Generado por SmartCot v2.0 - ' + new Date().toLocaleDateString('es-MX'), 15, 295);
                }
            }
            
            // ─────────────────────────────────────────────────────────
            // GUARDAR PDF
            // ─────────────────────────────────────────────────────────
            const nombreArchivo = 'Cotizacion-' + cotizacion.id + '-' + (cliente ? cliente.nombre.replace(/[^a-z0-9]/gi, '_') : 'SinCliente') + '.pdf';
            doc.save(nombreArchivo);
            
            console.log('✅ PDF generado:', nombreArchivo);
            alert('✅ Cotizacion PDF generada exitosamente');
            
        } catch (error) {
            console.error('❌ Error generando PDF:', error);
            console.error('Stack:', error.stack);
            alert('❌ Error al generar PDF: ' + error.message);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // GENERAR PDF DE APU
    // ─────────────────────────────────────────────────────────────────
    generarAPUPDF: async function(conceptoId) {
        try {
            console.log('📄 Generando APU PDF para concepto #', conceptoId);
            
            const limite = await window.licencia.verificarLimite('reportesAPU');
            if (!limite.permitido) {
                alert('❌ ' + limite.razon + '\n\nActualiza a ENTERPRISE para descargar APU individuales.');
                return;
            }
            
            if (typeof window.jspdf === 'undefined') {
                alert('⚠️ jsPDF no está cargado');
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            const concepto = await window.db.conceptos.get(conceptoId);
            if (!concepto) {
                alert('❌ Concepto no encontrado');
                return;
            }
            
            // Encabezado
            doc.setFillColor(26, 26, 26);
            doc.rect(0, 0, 210, 30, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(15);
            doc.setFont('helvetica', 'bold');
            doc.text('ANALISIS DE PRECIOS UNITARIOS', 105, 17, { align: 'center' });
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('SmartCot v2.0 - Cotizador Industrial', 105, 25, { align: 'center' });
            
            // Información
            let yPos = 40;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(10);
            doc.text('Concepto: ' + concepto.codigo, 15, yPos);
            
            yPos += 6;
            doc.setFontSize(9);
            const descLineas = doc.splitTextToSize(
                concepto.descripcion_tecnica || concepto.descripcion || concepto.descripcion_corta || 'Sin descripcion',
                180
            );
            doc.text('Descripcion: ' + descLineas, 15, yPos);
            yPos += (descLineas.length * 6);
            
            doc.text('Unidad: ' + (concepto.unidad || 'N/A'), 15, yPos);
            yPos += 5;
            doc.text('Rendimiento: ' + (concepto.rendimiento_base || 0), 15, yPos);
            
            // Materiales
            yPos += 10;
            doc.setFillColor(33, 150, 243);
            doc.rect(15, yPos - 4, 180, 4, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.text('MATERIALES', 20, yPos - 1);
            
            yPos += 6;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(8);
            
            const materiales = concepto.recursos?.materiales || [];
            if (materiales.length > 0) {
                const colWidths = [65, 22, 22, 28, 28];
                const headers = ['Material', 'Cantidad', 'Unidad', 'Precio Unit.', 'Importe'];
                let xPos = 20;
                
                headers.forEach(function(header, index) {
                    doc.text(header, xPos, yPos);
                    xPos += colWidths[index];
                });
                
                yPos += 2;
                doc.setDrawColor(200);
                doc.line(15, yPos, 195, yPos);
                yPos += 4;
                
                doc.setFontSize(7);
                
                let totalMateriales = 0;
                materiales.forEach(function(m) {
                    totalMateriales += (m.importe || 0);
                    doc.text((m.nombre || m.material_codigo || 'Sin nombre').substring(0, 28), 20, yPos);
                    doc.text((m.cantidad || 0).toString(), 90, yPos);
                    doc.text(m.unidad || '', 115, yPos);
                    doc.text(calculator.formatoMoneda(m.precio_unitario || 0), 140, yPos);
                    doc.text(calculator.formatoMoneda(m.importe || 0), 170, yPos, { align: 'right' });
                    yPos += 4;
                    if (yPos > 260) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
                
                yPos += 2;
                doc.setDrawColor(200);
                doc.line(15, yPos, 195, yPos);
                yPos += 4;
                
                doc.setFontSize(8);
                doc.text('Subtotal Materiales:', 145, yPos);
                doc.text(calculator.formatoMoneda(totalMateriales), 190, yPos, { align: 'right' });
            }
            
            // Pie
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text('Pagina ' + i + ' de ' + pageCount, 105, 290, { align: 'center' });
                doc.text('Generado por SmartCot v2.0 - ' + new Date().toLocaleDateString('es-MX'), 15, 295);
            }
            
            const nombreArchivo = 'APU-' + concepto.codigo + '.pdf';
            doc.save(nombreArchivo);
            
            console.log('✅ APU PDF generado:', nombreArchivo);
            alert('✅ APU PDF generado exitosamente');
            
        } catch (error) {
            console.error('❌ Error generando APU PDF:', error);
            alert('❌ Error al generar APU PDF: ' + error.message);
        }
    }
};

console.log('✅ reportes.js listo');
