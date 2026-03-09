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
            
            // ⚠️ VERIFICAR SI EL PLAN TIENE ACCESO A REPORTES PDF
            var limite = await window.licencia.verificarLimite('reportesPDF');
            if (!limite.permitido) {
                alert('❌ ' + limite.razon);
                return;
            }
            
            if (typeof window.jspdf === 'undefined') {
                alert('⚠️ jsPDF no está cargado');
                return;
            }
            
            // ⚠️ CARGAR CONFIGURACIÓN DE MARCA (SOLO ENTERPRISE)
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
            
            // ⚠️ OBTENER COTIZACIÓN DE LA BD
            const cotizacion = await window.db.cotizaciones.get(parseInt(cotizacionId));
            if (!cotizacion) {
                alert('❌ Cotización no encontrada');
                return;
            }
            
            console.log('✅ Cotización obtenida:', cotizacion);
            
            // ⚠️ OBTENER CLIENTE
            let cliente = null;
            if (cotizacion.clienteId) {
                cliente = await window.db.clientes.get(parseInt(cotizacion.clienteId));
                console.log('✅ Cliente obtenido:', cliente);
            }
            
            // ─────────────────────────────────────────────────────────
            // ENCABEZADO CON LOGO
            // ─────────────────────────────────────────────────────────
            doc.setFillColor(245, 245, 245);
            doc.rect(0, 0, 210, 40, 'F');
            
            if (logoBase64) {
                doc.setFillColor(255, 255, 255);
                doc.rect(10, 8, 50, 25, 'F');
                doc.addImage(logoBase64, 'PNG', 12, 10, 46, 21);
                doc.setTextColor(26, 26, 26);
                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.text('COTIZACIÓN', 200, 20, { align: 'right' });
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text('SmartCot v2.0 - Cotizador Industrial', 200, 28, { align: 'right' });
            } else {
                doc.setFillColor(26, 26, 26);
                doc.rect(0, 0, 210, 40, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.text('COTIZACIÓN', 105, 20, { align: 'center' });
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text('SmartCot v2.0 - Cotizador Industrial', 105, 30, { align: 'center' });
            }
            
            // ⚠️ LÍNEA DE COLOR CORPORATIVO
            if (licencia?.tipo === 'ENTERPRISE' && colorCorporativo) {
                doc.setDrawColor(colorCorporativo);
                doc.setLineWidth(2);
                doc.line(0, 40, 210, 40);
            }
            
            // ─────────────────────────────────────────────────────────
            // DATOS DEL CLIENTE Y PROYECTO
            // ─────────────────────────────────────────────────────────
            let yPos = 50;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(11);
            
            // Cliente
            doc.setFont('helvetica', 'bold');
            doc.text('Cliente:', 15, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text((cliente ? cliente.nombre : 'Sin cliente') || 'Sin cliente', 50, yPos);
            
            yPos += 8;
            doc.setFont('helvetica', 'bold');
            doc.text('Proyecto:', 15, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(cotizacion.descripcion || 'Sin descripción', 50, yPos);
            
            yPos += 8;
            doc.setFont('helvetica', 'bold');
            doc.text('Ubicación:', 15, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(cotizacion.ubicacion || 'N/A', 50, yPos);
            
            yPos += 8;
            doc.setFont('helvetica', 'bold');
            doc.text('Fecha:', 15, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(new Date(cotizacion.fecha).toLocaleDateString('es-MX'), 50, yPos);
            
            yPos += 8;
            doc.setFont('helvetica', 'bold');
            doc.text('Número:', 15, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text('#' + cotizacion.id, 50, yPos);
            
            // ─────────────────────────────────────────────────────────
            // CONCEPTOS DEL CATÁLOGO
            // ─────────────────────────────────────────────────────────
            yPos += 15;
            
            if (licencia?.tipo === 'ENTERPRISE' && colorCorporativo) {
                doc.setFillColor(colorCorporativo);
            } else {
                doc.setFillColor(26, 26, 26);
            }
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            
            const headers = ['Código', 'Descripción', 'Cant.', 'Unidad', 'Costo Unit.', 'Importe'];
            const colWidths = [25, 80, 15, 15, 30, 35];
            let xPos = 15;
            
            doc.rect(15, yPos - 5, 180, 8, 'F');
            
            headers.forEach(function(header, index) {
                doc.text(header, xPos, yPos);
                xPos += colWidths[index];
            });
            
            yPos += 5;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            
            let totalConceptos = 0;
            
            // ⚠️ VERIFICAR SI HAY CONCEPTOS
            if (cotizacion.conceptosCatalogo && cotizacion.conceptosCatalogo.length > 0) {
                cotizacion.conceptosCatalogo.forEach(function(c) {
                    const importe = (c.costos_base?.costo_directo_total || 0) * (c.cantidad || 1);
                    totalConceptos += importe;
                    
                    // ⚠️ MARCAR CONCEPTOS CON PRECIO EDITADO
                    let codigo = c.codigo || '';
                    if (c.precioEditado) {
                        codigo = 'E' + codigo;
                    }
                    
                    // ⚠️ USAR DESCRIPCIÓN COMPLETA
                    const descripcion = (c.descripcion || c.descripcion_corta || 'Sin descripción').substring(0, 40);
                    
                    doc.text(codigo.substring(0, 12), 15, yPos);
                    doc.text(descripcion, 42, yPos);
                    doc.text((c.cantidad || 1).toString(), 125, yPos);
                    doc.text(c.unidad || '', 142, yPos);
                    doc.text(calculator.formatoMoneda(c.costos_base?.costo_directo_total || 0), 160, yPos);
                    doc.text(calculator.formatoMoneda(importe), 185, yPos, { align: 'right' });
                    
                    yPos += 6;
                    
                    if (yPos > 260) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
            } else {
                doc.text('No hay conceptos del catálogo', 15, yPos);
                yPos += 10;
            }
            
            // ─────────────────────────────────────────────────────────
            // MANO DE OBRA (SI ES COTIZACIÓN SOLO MO)
            // ─────────────────────────────────────────────────────────
            if (cotizacion.tipo === 'solo-mano-obra-extraida' && cotizacion.manoObraExtraida) {
                yPos += 10;
                doc.setFillColor(76, 175, 80);
                doc.rect(15, yPos - 5, 180, 5, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('👷 MANO DE OBRA', 20, yPos);
                yPos += 8;
                doc.setTextColor(26, 26, 26);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                
                cotizacion.manoObraExtraida.forEach(function(mo) {
                    const conceptoInfo = (mo.concepto || mo.conceptoCodigo || 'Sin concepto').substring(0, 25);
                    const puestoInfo = (mo.puesto || 'Sin puesto').substring(0, 20);
                    const jornadasInfo = mo.jornadas ? mo.jornadas.toFixed(2) : '0';
                    const costoInfo = mo.costoJornada ? calculator.formatoMoneda(mo.costoJornada) : '$0.00';
                    const importeInfo = mo.importe ? calculator.formatoMoneda(mo.importe) : '$0.00';
                    
                    doc.text(conceptoInfo, 20, yPos);
                    doc.text(puestoInfo, 50, yPos);
                    doc.text(jornadasInfo + ' jor', 90, yPos);
                    doc.text(costoInfo, 120, yPos);
                    doc.text(importeInfo, 160, yPos, { align: 'right' });
                    
                    yPos += 5;
                    
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
            }
            
            // ─────────────────────────────────────────────────────────
            // TOTALES
            // ─────────────────────────────────────────────────────────
            yPos += 10;
            
            doc.setFont('helvetica', 'bold');
            doc.text('Subtotal:', 150, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(calculator.formatoMoneda(cotizacion.costoDirecto || totalConceptos), 185, yPos, { align: 'right' });
            
            yPos += 8;
            doc.setFont('helvetica', 'bold');
            doc.text('IVA (16%):', 150, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(calculator.formatoMoneda(cotizacion.iva || 0), 185, yPos, { align: 'right' });
            
            yPos += 10;
            
            if (licencia?.tipo === 'ENTERPRISE' && colorCorporativo) {
                doc.setFillColor(colorCorporativo);
                doc.setTextColor(255, 255, 255);
            } else {
                doc.setFillColor(26, 26, 26);
                doc.setTextColor(255, 255, 255);
            }
            
            doc.rect(150, yPos - 5, 50, 10, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('TOTAL:', 185, yPos, { align: 'right' });
            
            yPos += 8;
            doc.setFontSize(14);
            doc.text(calculator.formatoMoneda(cotizacion.totalFinal || 0), 185, yPos, { align: 'right' });
            
            // ─────────────────────────────────────────────────────────
            // PIE DE PÁGINA
            // ─────────────────────────────────────────────────────────
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text('Página ' + i + ' de ' + pageCount, 105, 290, { align: 'center' });
                
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
            alert('✅ Cotización PDF generada exitosamente');
            
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
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('ANÁLISIS DE PRECIOS UNITARIOS', 105, 18, { align: 'center' });
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('SmartCot v2.0 - Cotizador Industrial', 105, 25, { align: 'center' });
            
            // Información del concepto
            let yPos = 40;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(11);
            doc.text('Concepto: ' + concepto.codigo, 15, yPos);
            yPos += 6;
            doc.setFontSize(9);
            doc.text('Descripción: ' + (concepto.descripcion || concepto.descripcion_corta || 'Sin descripción'), 15, yPos);
            yPos += 5;
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
                const headers = ['Material', 'Cantidad', 'Unidad', 'Precio Unit.', 'Importe'];
                const colWidths = [70, 25, 25, 30, 30];
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
                    doc.text((m.nombre || m.material_codigo || 'Sin nombre').substring(0, 30), 20, yPos);
                    doc.text((m.cantidad || 0).toString(), 95, yPos);
                    doc.text(m.unidad || '', 125, yPos);
                    doc.text(calculator.formatoMoneda(m.precio_unitario || 0), 155, yPos);
                    doc.text(calculator.formatoMoneda(m.importe || 0), 185, yPos, { align: 'right' });
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
                doc.text('Subtotal Materiales:', 150, yPos);
                doc.text(calculator.formatoMoneda(totalMateriales), 185, yPos, { align: 'right' });
            } else {
                doc.setTextColor(150, 150, 150);
                doc.text('No hay materiales', 20, yPos);
            }
            
            // Pie de página
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text('Página ' + i + ' de ' + pageCount, 105, 290, { align: 'center' });
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
