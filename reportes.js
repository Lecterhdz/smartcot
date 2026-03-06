// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - GENERADOR DE REPORTES PDF (CORREGIDO UTF-8)
// ─────────────────────────────────────────────────────────────────────

console.log('📄 reportes.js cargado');

window.reportes = {
    
    // ─────────────────────────────────────────────────────────────────
    // GENERAR PDF DE COTIZACIÓN COMPLETA
    // ─────────────────────────────────────────────────────────────────
    generarCotizacionPDF: async function(cotizacionId) {
        try {
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
            
            // ⚠️ CARGAR LOGO SI ES ENTERPRISE
            const licencia = window.licencia.cargar();
            let logoBase64 = null;
            let colorCorporativo = '#1a1a1a';
            
            if (licencia?.tipo === 'ENTERPRISE') {
                const configLogo = await window.db.configuracion.get('marca_logo');
                const configColor = await window.db.configuracion.get('marca_colores');
                if (configLogo) logoBase64 = configLogo.valor;
                if (configColor) colorCorporativo = configColor.valor;
            }
            
            console.log('📄 Generando PDF de cotización #', cotizacionId);
            
            
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
            // ENCABEZADO CON LOGO (CORREGIDO)
            // ─────────────────────────────────────────────────────────
            
            // ⚠️ CREAR RECTÁNGULO DE FONDO PARA EL LOGO
            doc.setFillColor(245, 245, 245);  // Gris claro de fondo
            doc.rect(0, 0, 210, 40, 'F');  // Rectángulo de 210mm x 40mm
            
            // ⚠️ AGREGAR LOGO CON FONDO BLANCO
            if (logoBase64) {
                // Fondo blanco detrás del logo
                doc.setFillColor(255, 255, 255);
                doc.rect(10, 8, 50, 25, 'F');  // Rectángulo blanco para el logo
                
                // Agregar logo
                doc.addImage(logoBase64, 'PNG', 12, 10, 46, 21);
                
                // Título alineado a la derecha
                doc.setTextColor(26, 26, 26);
                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.text('COTIZACIÓN', 200, 20, { align: 'right' });
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text('SmartCot v2.0 - Cotizador Industrial', 200, 28, { align: 'right' });
            } else {
                // Sin logo - texto centrado
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
            
            // ⚠️ LÍNEA DE COLOR CORPORATIVO DEBAJO DEL ENCABEZADO
            if (licencia?.tipo === 'ENTERPRISE' && colorCorporativo) {
                doc.setDrawColor(colorCorporativo);
                doc.setLineWidth(2);
                doc.line(0, 40, 210, 40);  // Línea de color en todo el ancho
            }
            
            // ─────────────────────────────────────────────────────────
            // DATOS DEL CLIENTE Y PROYECTO
            // ─────────────────────────────────────────────────────────
            let yPos = 50;
            
            const cotizacion = await window.db.cotizaciones.get(parseInt(cotizacionId));
            if (!cotizacion) {
                alert('❌ Cotización no encontrada');
                return;
            }
            
            const cliente = await window.db.clientes.get(cotizacion.clienteId);
            
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(11);
            
            // Cliente
            doc.setFont('helvetica', 'bold');
            doc.text('Cliente:', 15, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text((cliente ? cliente.nombre : 'Sin cliente'), 50, yPos);
            
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
            // TABLA DE CONCEPTOS
            // ─────────────────────────────────────────────────────────
            yPos += 15;
            
            // Encabezado de tabla con color corporativo
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
            
            // Conceptos
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            
            let totalConceptos = 0;
            
            if (cotizacion.conceptosCatalogo && cotizacion.conceptosCatalogo.length > 0) {
                cotizacion.conceptosCatalogo.forEach(function(c) {
                    const importe = (c.costos_base?.costo_directo_total || 0) * (c.cantidad || 1);
                    totalConceptos += importe;
                    
                    // ⚠️ MARCAR CONCEPTOS CON PRECIO EDITADO
                    let codigo = c.codigo || '';
                    if (c.precioEditado) {
                        codigo = 'E' + codigo;  // Agregar "E" al inicio
                    }
                    
                    doc.text(codigo.substring(0, 12), 15, yPos);
                    doc.text((c.descripcion_corta || '').substring(0, 40), 42, yPos);
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
            }
            
            // ─────────────────────────────────────────────────────────
            // TOTALES
            // ─────────────────────────────────────────────────────────
            yPos += 10;
            
            // Subtotal
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
            
            // Total Final con color corporativo
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
            // TIEMPO DE EJECUCION
            // ─────────────────────────────────────────────────────────
            yPos += 5;
            doc.setDrawColor(200);
            doc.line(15, yPos, 195, yPos);
            yPos += 8;
            
            doc.setFillColor(232, 245, 233);
            doc.rect(15, yPos - 5, 180, 5, 'F');
            
            doc.setTextColor(46, 125, 50);
            doc.setFontSize(10);
            doc.text('TIEMPO DE EJECUCION ESTIMADO', 20, yPos - 2);
            
            yPos += 8;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(8);
            
            if (cotizacion.tiempoEjecucion) {
                doc.text('Jornadas: ' + (cotizacion.tiempoEjecucion.jornadas || 0), 20, yPos);
                doc.text('Dias Habiles: ' + (cotizacion.tiempoEjecucion.diasHabiles || 0), 70, yPos);
                doc.text('Semanas: ' + (cotizacion.tiempoEjecucion.semanas || 0), 120, yPos);
                doc.text('Meses: ' + (cotizacion.tiempoEjecucion.meses || 0), 170, yPos);
            }
            
            yPos += 8;
            
            // ─────────────────────────────────────────────────────────
            // FACTORES DE AJUSTE (SI APLICAN)
            // ─────────────────────────────────────────────────────────
            if (cotizacion.factoresAjuste && cotizacion.factoresAjuste.total > 1) {
                doc.setFillColor(255, 243, 224);
                doc.rect(15, yPos - 5, 180, 5, 'F');
                
                doc.setTextColor(230, 81, 0);
                doc.setFontSize(10);
                doc.text('FACTORES DE AJUSTE APLICADOS', 20, yPos - 2);
                
                yPos += 8;
                doc.setTextColor(26, 26, 26);
                doc.setFontSize(8);
                
                doc.text('Altura: ' + (cotizacion.factoresAjuste.altura || 1) + 'x', 20, yPos);
                doc.text('Clima: ' + (cotizacion.factoresAjuste.clima || 1) + 'x', 70, yPos);
                doc.text('Acceso: ' + (cotizacion.factoresAjuste.acceso || 1) + 'x', 120, yPos);
                doc.text('Seguridad: ' + (cotizacion.factoresAjuste.seguridad || 1) + 'x', 170, yPos);
                
                yPos += 8;
            }
            
            // ─────────────────────────────────────────────────────────────────
            // RESUMEN FINANCIERO (CORREGIDO - OBTENER VALORES REALES)
            // ─────────────────────────────────────────────────────────────────
            yPos += 10;
            
            doc.setFillColor(26, 26, 26);
            doc.rect(15, yPos - 8, 180, 8, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('💰 RESUMEN FINANCIERO', 20, yPos - 2);
            
            yPos += 10;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(9);
            
            // ⚠️ IMPORTANTE: Obtener valores de la cotización o calcularlos
            const costoDirecto = cotizacion.costoDirecto || 0;
            const totalIndirectos = cotizacion.totalIndirectos || 0;
            const utilidad = cotizacion.utilidad || 0;
            const iva = cotizacion.iva || 0;
            const totalFinal = cotizacion.totalFinal || 0;
            
            // Si los valores son 0, calcularlos desde los conceptos
            if (costoDirecto === 0 && cotizacion.conceptosCatalogo && cotizacion.conceptosCatalogo.length > 0) {
                // Calcular costo directo desde conceptos
                let subtotal = 0;
                cotizacion.conceptosCatalogo.forEach(function(c) {
                    subtotal += (c.costos_base?.costo_directo_total || 0) * (c.cantidad || 1);
                });
                
                // Obtener porcentajes
                const indirectosOficinaPorcentaje = cotizacion.porcentajes?.indirectosOficina || 5;
                const indirectosCampoPorcentaje = cotizacion.porcentajes?.indirectosCampo || 15;
                const utilidadPorcentaje = cotizacion.porcentajes?.utilidad || 10;
                
                // Calcular indirectos
                const indirectosOficina = subtotal * (indirectosOficinaPorcentaje / 100);
                const indirectosCampo = subtotal * (indirectosCampoPorcentaje / 100);
                const totalIndirectosCalculado = indirectosOficina + indirectosCampo;
                
                // Calcular utilidad
                const baseConIndirectos = subtotal + totalIndirectosCalculado;
                const utilidadCalculada = baseConIndirectos * (utilidadPorcentaje / 100);
                
                // Calcular IVA
                const ivaCalculado = (baseConIndirectos + utilidadCalculada) * 0.16;
                
                // Calcular total
                const totalFinalCalculado = baseConIndirectos + utilidadCalculada + ivaCalculado;
                
                // Usar valores calculados
                doc.text('Costo Directo:', 20, yPos);
                doc.text(calculator.formatoMoneda(subtotal), 185, yPos, { align: 'right' });
                yPos += 6;
                
                doc.text('Indirectos:', 20, yPos);
                doc.text(calculator.formatoMoneda(totalIndirectosCalculado), 185, yPos, { align: 'right' });
                yPos += 6;
                
                doc.text('Utilidad:', 20, yPos);
                doc.text(calculator.formatoMoneda(utilidadCalculada), 185, yPos, { align: 'right' });
                yPos += 6;
                
                doc.text('IVA (16%):', 20, yPos);
                doc.text(calculator.formatoMoneda(ivaCalculado), 185, yPos, { align: 'right' });
                yPos += 8;
                
                // TOTAL FINAL
                doc.setFillColor(76, 175, 80);
                doc.rect(15, yPos - 8, 180, 10, 'F');
                
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('TOTAL FINAL:', 20, yPos - 1);
                doc.text(calculator.formatoMoneda(totalFinalCalculado), 185, yPos - 1, { align: 'right' });
                
            } else {
                // Usar valores guardados
                doc.text('Costo Directo:', 20, yPos);
                doc.text(calculator.formatoMoneda(costoDirecto), 185, yPos, { align: 'right' });
                yPos += 6;
                
                doc.text('Indirectos:', 20, yPos);
                doc.text(calculator.formatoMoneda(totalIndirectos), 185, yPos, { align: 'right' });
                yPos += 6;
                
                doc.text('Utilidad:', 20, yPos);
                doc.text(calculator.formatoMoneda(utilidad), 185, yPos, { align: 'right' });
                yPos += 6;
                
                doc.text('IVA (16%):', 20, yPos);
                doc.text(calculator.formatoMoneda(iva), 185, yPos, { align: 'right' });
                yPos += 8;
                
                // TOTAL FINAL
                doc.setFillColor(76, 175, 80);
                doc.rect(15, yPos - 8, 180, 10, 'F');
                
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('TOTAL FINAL:', 20, yPos - 1);
                doc.text(calculator.formatoMoneda(totalFinal), 185, yPos - 1, { align: 'right' });
            }
            
            // ─────────────────────────────────────────────────────────
            // PIE DE PÁGINA
            // ─────────────────────────────────────────────────────────
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text('Página ' + i + ' de ' + pageCount, 105, 290, { align: 'center' });
                
                // ⚠️ AGREGAR NOMBRE DE EMPRESA SI EXISTE
                const configEmpresa = await window.db.configuracion.get('empresa');
                if (configEmpresa && configEmpresa.valor) {
                    doc.text(configEmpresa.valor, 15, 295);
                } else {
                    doc.text('Generado por SmartCot v2.0 - ' + new Date().toLocaleDateString('es-MX'), 15, 295);
                }
            }
            
            // ─────────────────────────────────────────────────────────
            // GUARDAR PDF
            // ─────────────────────────────────────────────────────────
            const nombreArchivo = 'Cotizacion-' + cotizacion.id + '.pdf';
            doc.save(nombreArchivo);
            
            console.log('✅ PDF generado:', nombreArchivo);
            alert('✅ PDF generado exitosamente');
            
        } catch (error) {
            console.error('❌ Error generando PDF:', error);
            alert('❌ Error al generar PDF: ' + error.message);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // GENERAR PDF DE APU (ANALISIS DE PRECIOS UNITARIOS)
    // ─────────────────────────────────────────────────────────────────
    generarAPUPDF: async function(conceptoId) {
        try {
            console.log('📄 Generando APU PDF para concepto #', conceptoId);

            // ⚠️ VERIFICAR SI EL PLAN TIENE ACCESO A REPORTES APU
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
            doc.rect(0, 0, 210, 30, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('ANALISIS DE PRECIOS UNITARIOS', 105, 18, { align: 'center' });
            
            doc.setFontSize(10);
            doc.setFont('courier', 'italic'); 
            doc.text('SmartCot v2.0 - Cotizador Industrial', 105, 25, { align: 'center' });
            
            // ─────────────────────────────────────────────────────────
            // INFORMACION DEL CONCEPTO
            // ─────────────────────────────────────────────────────────
            let yPos = 40;
            
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(11);
            doc.text('Concepto: ' + concepto.codigo, 15, yPos);
            
            yPos += 6;
            doc.setFontSize(9);
            doc.text('Descripcion: ' + (concepto.descripcion_corta || 'Sin descripcion'), 15, yPos);
            
            yPos += 5;
            doc.text('Unidad: ' + (concepto.unidad || 'N/A'), 15, yPos);
            
            yPos += 5;
            doc.text('Rendimiento: ' + (concepto.rendimiento_base || 0), 15, yPos);
            
            // ─────────────────────────────────────────────────────────
            // MATERIALES
            // ─────────────────────────────────────────────────────────
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
            
            // ─────────────────────────────────────────────────────────
            // MANO DE OBRA
            // ─────────────────────────────────────────────────────────
            yPos += 8;
            
            doc.setFillColor(76, 175, 80);
            doc.rect(15, yPos - 4, 180, 4, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.text('MANO DE OBRA', 20, yPos - 1);
            
            yPos += 6;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(8);
            
            const manoObra = concepto.recursos?.mano_obra || [];
            if (manoObra.length > 0) {
                const headers = ['Puesto', 'Horas/Jornada', 'Salario/Hora', 'Importe'];
                const colWidths = [80, 35, 35, 30];
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
                
                let totalManoObra = 0;
                manoObra.forEach(function(mo) {
                    totalManoObra += (mo.importe || 0);
                    
                    doc.text((mo.puesto || 'Sin nombre').substring(0, 35), 20, yPos);
                    doc.text((mo.horas_jornada || 0).toFixed(4), 105, yPos);
                    doc.text(calculator.formatoMoneda(mo.salario_hora || 0), 145, yPos);
                    doc.text(calculator.formatoMoneda(mo.importe || 0), 185, yPos, { align: 'right' });
                    
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
                doc.text('Subtotal Mano de Obra:', 150, yPos);
                doc.text(calculator.formatoMoneda(totalManoObra), 185, yPos, { align: 'right' });
            } else {
                doc.setTextColor(150, 150, 150);
                doc.text('No hay mano de obra', 20, yPos);
            }
            
            // ─────────────────────────────────────────────────────────
            // EQUIPOS
            // ─────────────────────────────────────────────────────────
            yPos += 8;
            
            doc.setFillColor(255, 152, 0);
            doc.rect(15, yPos - 4, 180, 4, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.text('EQUIPOS', 20, yPos - 1);
            
            yPos += 6;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(8);
            
            const equipos = concepto.recursos?.equipos || [];
            if (equipos.length > 0) {
                const headers = ['Equipo', 'Horas', 'Costo Unit.', 'Importe'];
                const colWidths = [80, 30, 35, 35];
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
                
                let totalEquipos = 0;
                equipos.forEach(function(e) {
                    totalEquipos += (e.importe || 0);
                    
                    doc.text((e.nombre || e.equipo_codigo || 'Sin nombre').substring(0, 35), 20, yPos);
                    doc.text((e.horas || 0).toString(), 105, yPos);
                    doc.text(calculator.formatoMoneda(e.costo_unitario || 0), 145, yPos);
                    doc.text(calculator.formatoMoneda(e.importe || 0), 185, yPos, { align: 'right' });
                    
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
                doc.text('Subtotal Equipos:', 150, yPos);
                doc.text(calculator.formatoMoneda(totalEquipos), 185, yPos, { align: 'right' });
            } else {
                doc.setTextColor(150, 150, 150);
                doc.text('No hay equipos', 20, yPos);
            }
            
            // ─────────────────────────────────────────────────────────
            // COSTO DIRECTO TOTAL
            // ─────────────────────────────────────────────────────────
            yPos += 8;
            
            doc.setFillColor(26, 26, 26);
            doc.rect(15, yPos - 5, 180, 6, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.text('COSTO DIRECTO TOTAL:', 20, yPos - 1);
            
            const costoDirecto = concepto.costos_base?.costo_directo_total || 0;
            doc.text(calculator.formatoMoneda(costoDirecto), 185, yPos - 1, { align: 'right' });
            
            // ─────────────────────────────────────────────────────────
            // PIE DE PÁGINA
            // ─────────────────────────────────────────────────────────
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text('Página ' + i + ' de ' + pageCount, 105, 290, { align: 'center' });
                
                // ⚠️ AGREGAR NOMBRE DE EMPRESA SI EXISTE
                const configEmpresa = await window.db.configuracion.get('empresa');
                if (configEmpresa && configEmpresa.valor) {
                    doc.text(configEmpresa.valor, 15, 295);
                } else {
                    doc.text('Generado por SmartCot v2.0 - ' + new Date().toLocaleDateString('es-MX'), 15, 295);
                }
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
            
            // Encabezado
            doc.setFillColor(26, 26, 26);
            doc.rect(0, 0, 210, 30, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.text('CURVA S - SEGUIMIENTO DE OBRA', 105, 18, { align: 'center' });
            
            doc.setFontSize(10);
            doc.text('SmartCot v2.0', 105, 25, { align: 'center' });
            
            // Información
            let yPos = 40;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(10);
            doc.text('Cotizacion #' + cotizacionId, 15, yPos);
            yPos += 6;
            doc.text('Fecha: ' + new Date().toLocaleDateString('es-MX'), 15, yPos);
            
            // Capturar gráfica
            const canvas = document.getElementById('curva-s-chart');
            if (canvas) {
                yPos += 10;
                const imgData = canvas.toDataURL('image/png');
                doc.addImage(imgData, 'PNG', 15, yPos, 180, 100);
            }
            
            // ─────────────────────────────────────────────────────────
            // PIE DE PÁGINA
            // ─────────────────────────────────────────────────────────
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text('Página ' + i + ' de ' + pageCount, 105, 290, { align: 'center' });
                
                // ⚠️ AGREGAR NOMBRE DE EMPRESA SI EXISTE
                const configEmpresa = await window.db.configuracion.get('empresa');
                if (configEmpresa && configEmpresa.valor) {
                    doc.text(configEmpresa.valor, 15, 295);
                } else {
                    doc.text('Generado por SmartCot v2.0 - ' + new Date().toLocaleDateString('es-MX'), 15, 295);
                }
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
