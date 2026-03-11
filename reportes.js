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

            // ─────────────────────────────────────────────────────────────────
            // FACTORES DE AJUSTE (SI APLICAN)
            // ─────────────────────────────────────────────────────────────────
            if (cotizacion.factoresAjuste && cotizacion.factoresAjuste.total > 1) {
                yPos += 10;
                doc.setFillColor(255, 243, 224);
                doc.rect(15, yPos - 4, 180, 5, 'F');
                doc.setTextColor(230, 81, 0);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text(window.reportes.normalizarTexto('🔧 FACTORES DE AJUSTE APLICADOS'), 20, yPos + 1);
                
                yPos += 8;
                doc.setTextColor(26, 26, 26);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                
                const factores = cotizacion.factoresAjuste;
                let factoresText = [];
                
                if (factores.altura > 1) factoresText.push('Altura: ' + factores.altura.toFixed(2) + 'x');
                if (factores.clima > 1) factoresText.push('Clima: ' + factores.clima.toFixed(2) + 'x');
                if (factores.acceso > 1) factoresText.push('Acceso: ' + factores.acceso.toFixed(2) + 'x');
                if (factores.seguridad > 1) factoresText.push('Seguridad: ' + factores.seguridad.toFixed(2) + 'x');
                
                doc.text(window.reportes.normalizarTexto('Factor Total: ' + (factores.total || 1).toFixed(2) + 'x'), 20, yPos);
                yPos += 5;
                
                if (cotizacion.tiempoEjecucion) {
                    doc.text(window.reportes.normalizarTexto('Tiempo Original: ' + cotizacion.tiempoEjecucion.diasHabiles + ' días'), 20, yPos);
                    yPos += 5;
                    const diasAjustados = Math.ceil((cotizacion.tiempoEjecucion.diasHabiles || 0) * (factores.total || 1));
                    doc.text(window.reportes.normalizarTexto('Tiempo Ajustado: ' + diasAjustados + ' días'), 20, yPos);
                    yPos += 5;
                }
                
                if (cotizacion.impactoFactores && cotizacion.impactoFactores.costoTiempoExtendido > 0) {
                    doc.text(window.reportes.normalizarTexto('Costo por Tiempo Extendido: ' + calculator.formatoMoneda(cotizacion.impactoFactores.costoTiempoExtendido)), 20, yPos);
                    yPos += 5;
                }
            }
            
            // ─────────────────────────────────────────────────────────────────
            // TABLA DE CONCEPTOS (CORREGIDO - CON INDIRECTOS Y UTILIDAD DISTRIBUIDOS)
            // ─────────────────────────────────────────────────────────────────
            yPos += 10;
            
            // ⚠️ CALCULAR FACTORES DE DISTRIBUCIÓN
            const costoDirectoTotal = cotizacion.costoDirecto || 0;
            const totalIndirectos = cotizacion.totalIndirectos || 0;
            const utilidad = cotizacion.utilidad || 0;
            const iva = cotizacion.iva || 0;
            const totalFinal = cotizacion.totalFinal || 0;
            
            // Factor para distribuir indirectos + utilidad sobre cada concepto
            const factorIndirectosUtilidad = costoDirectoTotal > 0 ? (costoDirectoTotal + totalIndirectos + utilidad) / costoDirectoTotal : 1;
            
            if (licencia?.tipo === 'ENTERPRISE' && colorCorporativo) {
                doc.setFillColor(colorCorporativo);
            } else {
                doc.setFillColor(26, 26, 26);
            }
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            
            const colWidths = [20, 90, 12, 15, 25, 26];
            const headers = ['Codigo', 'Descripcion', 'Cant.', 'Unidad', 'Costo Unit.', 'Importe'];
            let xPos = 15;
            
            doc.rect(15, yPos - 4, 180, 6, 'F');
            
            // ⚠️ GUARDAR REFERENCIA A this ANTES DEL forEach
            
            headers.forEach(function(header, index) {
                doc.text(window.reportes.normalizarTexto(header), xPos, yPos + 1);  
                xPos += colWidths[index];
            });
            
            yPos += 5;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            
            let sumaConceptos = 0;
            
            // ⚠️ CONCEPTOS (CORREGIDO - PRECIO INCLUYE INDIRECTOS Y UTILIDAD)
            if (cotizacion.conceptosCatalogo && cotizacion.conceptosCatalogo.length > 0) {
                for (let i = 0; i < cotizacion.conceptosCatalogo.length; i++) {
                    const concepto = cotizacion.conceptosCatalogo[i];
                    
                    // ⚠️ CALCULAR PRECIO CON INDIRECTOS Y UTILIDAD DISTRIBUIDOS
                    const costoDirectoConcepto = concepto.costos_base?.costo_directo_total || 0;
                    const cantidad = concepto.cantidad || 1;
                    
                    // Precio unitario con indirectos y utilidad distribuidos
                    const precioUnitarioConIndirectos = costoDirectoConcepto * factorIndirectosUtilidad;
                    const importeConIndirectos = precioUnitarioConIndirectos * cantidad;
                    
                    sumaConceptos += importeConIndirectos;
                    
                    let codigo = concepto.codigo || '';
                    if (concepto.precioEditado) {
                        codigo = 'E' + codigo;
                    }
                    
                    // ⚠️ OBTENER Y LIMPIAR DESCRIPCIÓN
                    let descripcion = '';
                    if (concepto.descripcion_tecnica && concepto.descripcion_tecnica.trim().length > 0) {
                        descripcion = window.reportes.limpiarDescripcion(concepto.descripcion_tecnica);
                    } else if (concepto.descripcion && concepto.descripcion.trim().length > 0) {
                        descripcion = window.reportes.limpiarDescripcion(concepto.descripcion);
                    } else {
                        descripcion = window.reportes.limpiarDescripcion(concepto.descripcion_corta || 'Sin descripcion');
                    }
                    
                    const lineas = doc.splitTextToSize(window.reportes.normalizarTexto(descripcion), 87);
                    
                    doc.text(codigo.substring(0, 10), 15, yPos);
                    doc.text(lineas, 34, yPos);
                    doc.text(cantidad.toString(), 128, yPos);
                    doc.text(window.reportes.normalizarTexto(concepto.unidad || ''), 140, yPos);
                    doc.text(calculator.formatoMoneda(precioUnitarioConIndirectos), 167, yPos, { align: 'right' });  // ✅ PRECIO CON INDIRECTOS
                    doc.text(calculator.formatoMoneda(importeConIndirectos), 193, yPos, { align: 'right' });  // ✅ IMPORTE CON INDIRECTOS
                    
                    yPos += (5 + (lineas.length * 4));
                    
                    if (yPos > 250) {
                        doc.addPage();
                        yPos = 20;
                    }
                }
            } else {
                doc.text(window.reportes.normalizarTexto('No hay conceptos del catalogo'), 15, yPos);
                yPos += 8;
            }

            // ─────────────────────────────────────────────────────────────────
            // RECURSOS ADICIONALES (NUEVO - DESPUÉS DE CONCEPTOS)
            // ─────────────────────────────────────────────────────────────────
            
            // ⚠️ MATERIALES ADICIONALES
            if (cotizacion.materialesAdicionales && cotizacion.materialesAdicionales.length > 0) {
                yPos += 10;
                doc.setFillColor(33, 150, 243);
                doc.rect(15, yPos - 4, 180, 5, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('MATERIALES ADICIONALES', 20, yPos + 1);
                
                yPos += 8;
                doc.setTextColor(26, 26, 26);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                
                // Encabezados
                doc.setFont('helvetica', 'bold');
                doc.text('Codigo', 20, yPos);
                doc.text('Descripcion', 50, yPos);
                doc.text('Cant.', 140, yPos);
                doc.text('Precio Unit.', 160, yPos);
                doc.text('Importe', 185, yPos, { align: 'right' });
                
                yPos += 2;
                doc.setDrawColor(200);
                doc.line(15, yPos, 195, yPos);
                yPos += 4;
                doc.setFont('helvetica', 'normal');
                
                cotizacion.materialesAdicionales.forEach(function(mat, index) {
                    const codigo = 'MA-' + (index + 1).toString().padStart(3, '0');
                    const importe = (mat.cantidad || 1) * (mat.precioUnitario || 0);
                    
                    doc.text(codigo, 20, yPos);
                    doc.text((mat.nombre || 'Sin nombre').substring(0, 28), 50, yPos);
                    doc.text((mat.cantidad || 1).toString(), 140, yPos);
                    doc.text(calculator.formatoMoneda(mat.precioUnitario || 0), 160, yPos);
                    doc.text(calculator.formatoMoneda(importe), 185, yPos, { align: 'right' });
                    
                    yPos += 5;
                    
                    if (yPos > 250) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
            }
            
            // ⚠️ MANO DE OBRA ADICIONAL
            if (cotizacion.manoObraAdicional && cotizacion.manoObraAdicional.length > 0) {
                yPos += 10;
                doc.setFillColor(76, 175, 80);
                doc.rect(15, yPos - 4, 180, 5, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('MANO DE OBRA ADICIONAL', 20, yPos + 1);
                
                yPos += 8;
                doc.setTextColor(26, 26, 26);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                
                // Encabezados
                doc.setFont('helvetica', 'bold');
                doc.text('Codigo', 20, yPos);
                doc.text('Puesto/Concepto', 50, yPos);
                doc.text('Jornadas', 140, yPos);
                doc.text('Costo/Jor', 165, yPos);
                doc.text('Importe', 185, yPos, { align: 'right' });
                
                yPos += 2;
                doc.setDrawColor(200);
                doc.line(15, yPos, 195, yPos);
                yPos += 4;
                doc.setFont('helvetica', 'normal');
                
                cotizacion.manoObraAdicional.forEach(function(mo, index) {
                    const codigo = 'MO-' + (index + 1).toString().padStart(3, '0');
                    const importe = (mo.jornadas || 0) * (mo.costoJornada || 0);
                    
                    doc.text(codigo, 20, yPos);
                    doc.text((mo.concepto || mo.puesto || 'Sin puesto').substring(0, 28), 50, yPos);
                    doc.text((mo.jornadas || 0).toFixed(2), 140, yPos);
                    doc.text(calculator.formatoMoneda(mo.costoJornada || 0), 165, yPos);
                    doc.text(calculator.formatoMoneda(importe), 185, yPos, { align: 'right' });
                    
                    yPos += 5;
                    
                    if (yPos > 250) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
            }
            
            // ⚠️ EQUIPOS ADICIONALES
            if (cotizacion.equiposAdicionales && cotizacion.equiposAdicionales.length > 0) {
                yPos += 10;
                doc.setFillColor(255, 152, 0);
                doc.rect(15, yPos - 4, 180, 5, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('EQUIPOS ADICIONALES', 20, yPos + 1);
                
                yPos += 8;
                doc.setTextColor(26, 26, 26);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                
                // Encabezados
                doc.setFont('helvetica', 'bold');
                doc.text('Codigo', 20, yPos);
                doc.text('Equipo', 50, yPos);
                doc.text('Horas', 140, yPos);
                doc.text('Costo Unit.', 160, yPos);
                doc.text('Importe', 185, yPos, { align: 'right' });
                
                yPos += 2;
                doc.setDrawColor(200);
                doc.line(15, yPos, 195, yPos);
                yPos += 4;
                doc.setFont('helvetica', 'normal');
                
                cotizacion.equiposAdicionales.forEach(function(eq, index) {
                    const codigo = 'EQ-' + (index + 1).toString().padStart(3, '0');
                    const importe = (eq.horas || 0) * (eq.costoUnitario || 0);
                    
                    doc.text(codigo, 20, yPos);
                    doc.text((eq.nombre || 'Sin nombre').substring(0, 28), 50, yPos);
                    doc.text((eq.horas || 0).toString(), 140, yPos);
                    doc.text(calculator.formatoMoneda(eq.costoUnitario || 0), 160, yPos);
                    doc.text(calculator.formatoMoneda(importe), 185, yPos, { align: 'right' });
                    
                    yPos += 5;
                    
                    if (yPos > 250) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
            }
            
            // ⚠️ INDIRECTOS ADICIONALES
            if (cotizacion.indirectosAdicionales && cotizacion.indirectosAdicionales.length > 0) {
                yPos += 10;
                doc.setFillColor(156, 39, 176);
                doc.rect(15, yPos - 4, 180, 5, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('INDIRECTOS ADICIONALES', 20, yPos + 1);
                
                yPos += 8;
                doc.setTextColor(26, 26, 26);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                
                // Encabezados
                doc.setFont('helvetica', 'bold');
                doc.text('Codigo', 20, yPos);
                doc.text('Concepto', 50, yPos);
                doc.text('Importe', 185, yPos, { align: 'right' });
                
                yPos += 2;
                doc.setDrawColor(200);
                doc.line(15, yPos, 195, yPos);
                yPos += 4;
                doc.setFont('helvetica', 'normal');
                
                cotizacion.indirectosAdicionales.forEach(function(ind, index) {
                    const codigo = 'IA-' + (index + 1).toString().padStart(3, '0');
                    
                    doc.text(codigo, 20, yPos);
                    doc.text((ind.concepto || 'Sin concepto').substring(0, 60), 50, yPos);
                    doc.text(calculator.formatoMoneda(ind.monto || 0), 185, yPos, { align: 'right' });
                    
                    yPos += 5;
                    
                    if (yPos > 250) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
            }
            
            // ─────────────────────────────────────────────────────────
            // MANO DE OBRA (SI APLICA)
            // ─────────────────────────────────────────────────────────
            if (cotizacion.tipo === 'solo-mano-obra-extraida' && cotizacion.manoObraExtraida) {
                yPos += 5;
                doc.setFillColor(76, 175, 80);
                doc.rect(15, yPos - 3, 180, 5, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('MANO DE OBRA', 20, yPos + 1);
                
                yPos += 6;
                doc.setTextColor(26, 26, 26);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                
                cotizacion.manoObraExtraida.forEach(function(mo) {
           
                    // ✅ ACCEDER CORRECTAMENTE A conceptoDescripcion
                    let descripcion = '';
                    if (mo.conceptoDescripcion && typeof mo.conceptoDescripcion === 'string' && mo.conceptoDescripcion.trim().length > 0) {
                        descripcion = mo.conceptoDescripcion;  // ✅ ESTE ES EL CAMPO QUE GUARDAMOS
                    } else if (mo.concepto && typeof mo.concepto === 'string' && mo.concepto.trim().length > 0) {
                        descripcion = mo.concepto;
                    } else if (mo.conceptoCodigo && typeof mo.conceptoCodigo === 'string' && mo.conceptoCodigo.trim().length > 0) {
                        descripcion = mo.conceptoCodigo;
                    } else {
                        descripcion = 'Sin descripcion';
                    }

                    // ⚠️ AGREGAR CÓDIGO AL INICIO SI EXISTE
                    if (mo.conceptoCodigo && mo.conceptoCodigo.trim().length > 0) {
                        descripcion = mo.conceptoCodigo + ' - ' + descripcion;  // ✅ CONCATENAR CÓDIGO + DESCRIPCIÓN
                    }
                    // ⚠️ ELIMINAR PALABRA "SUMINISTRO" (NUEVO)
                    descripcion = descripcion
                        .replace(/suministro/gi, '')
                        .replace(/suministros/gi, '')
                        .replace(/incluye:\s*,/gi, 'Incluye:')
                        .replace(/,\s*,/g, ',')
                        .replace(/^\s*,\s*/, '')
                        .replace(/\s*,\s*$/g, '')
                        .replace(/\s+/g, ' ')
                        .trim();    
                    
                    const lineasConcepto = doc.splitTextToSize(descripcion, 160);
                   
                    doc.setFont('helvetica', 'normal');
                    doc.text(lineasConcepto, 20, yPos);
                    yPos += (lineasConcepto.length * 5);

                    // Verificar si necesita nueva página
                    if (yPos > 250) {
                        doc.addPage();
                        yPos = 20;
                    }

                    // ⚠️ FONDO GRIS PARA LA FILA
                    doc.setFillColor(245, 245, 245);
                    doc.rect(15, yPos - 5, 180, 8, 'F');
                    
                    // ⚠️ TEXTO EN UNA SOLA LÍNEA
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.text((mo.puesto || 'Sin puesto'), 20, yPos);
                    doc.text((mo.jornadas ? mo.jornadas.toFixed(2) : '0') + ' jor', 80, yPos);
                    doc.text((mo.costoJornada ? calculator.formatoMoneda(mo.costoJornada) : '$0.00'), 120, yPos);
                    doc.text((mo.importe ? calculator.formatoMoneda(mo.importe) : '$0.00'), 180, yPos, { align: 'right' });
                    
                    yPos += 7;  // ⚠️ MÁS ESPACIO POR EL FONDO     

                    
                    if (yPos > 250) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
            }
            
            // ─────────────────────────────────────────────────────────────────
            // TOTALES (CORREGIDO - QUE CUAADRE LA SUMA)
            // ─────────────────────────────────────────────────────────────────
            yPos += 8;
            
            // ⚠️ MOSTRAR SUBTOTAL (YA INCLUYE INDIRECTOS Y UTILIDAD DISTRIBUIDOS)
            doc.setFont('helvetica', 'bold');
            doc.text(window.reportes.normalizarTexto('Subtotal:'), 140, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(calculator.formatoMoneda(sumaConceptos), 195, yPos, { align: 'right' });  // ✅ USA LA SUMA DE CONCEPTOS
            
            yPos += 6;
            doc.setFont('helvetica', 'bold');
            doc.text(window.reportes.normalizarTexto('IVA (16%):'), 140, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(calculator.formatoMoneda(iva), 195, yPos, { align: 'right' });
            
            yPos += 10;
            
            if (licencia?.tipo === 'ENTERPRISE' && colorCorporativo) {
                doc.setFillColor(colorCorporativo);
                doc.setTextColor(255, 255, 255);
            } else {
                doc.setFillColor(26, 26, 26);
                doc.setTextColor(255, 255, 255);
            }
            
            doc.rect(140, yPos - 3, 60, 12, 'F');
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(window.reportes.normalizarTexto('TOTAL:'), 170, yPos + 1, { align: 'center' });
            
            yPos += 7;
            doc.setFontSize(13);
            doc.text(calculator.formatoMoneda(totalFinal), 170, yPos, { align: 'center' });
            
            // ⚠️ VERIFICAR QUE CUAADRE
            const diferencia = Math.abs((sumaConceptos + iva) - totalFinal);
            if (diferencia > 1) {  // Si hay diferencia mayor a $1
                console.warn('⚠️ Diferencia en totales:', diferencia);
            }    
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
