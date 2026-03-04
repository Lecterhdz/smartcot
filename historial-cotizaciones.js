// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - HISTORIAL DE COTIZACIONES (CORREGIDO)
// ─────────────────────────────────────────────────────────────────────

console.log('📋 historial-cotizaciones.js cargado');

window.historialCotizaciones = {
    
    cotizaciones: [],
    
    // ─────────────────────────────────────────────────────────────────
    // CARGAR COTIZACIONES
    // ─────────────────────────────────────────────────────────────────
    cargar: async function() {
        try {
            if (!window.db) {
                console.error('❌ DB no disponible');
                return;
            }
            
            this.cotizaciones = await window.db.cotizaciones.reverse().limit(100).toArray();
            const clientes = await window.db.clientes.toArray();
            
            const tbody = document.getElementById('historial-cotizaciones-tabla');
            if (!tbody) {
                console.error('❌ Tabla no encontrada');
                return;
            }
            
            if (this.cotizaciones.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="padding:40px;text-align:center;color:#999;">No hay cotizaciones guardadas</td></tr>';
                return;
            }
            
            tbody.innerHTML = this.cotizaciones.map(function(c) {
                const cliente = clientes.find(cl => cl.id == c.clienteId);
                const clienteNombre = cliente ? cliente.nombre : 'Sin cliente';
                const fecha = new Date(c.fecha).toLocaleDateString('es-MX');
                const total = calculator.formatoMoneda(c.totalFinal || 0);
                
                return '<tr style="transition:background 0.3s;border-bottom:1px solid #ddd;" onmouseover="this.style.background=\'#f5f7fa\'" onmouseout="this.style.background=\'white\'">' +
                    '<td style="padding:15px;font-weight:600;color:#1a1a1a;">#' + c.id + '</td>' +
                    '<td style="padding:15px;color:#666;">' + clienteNombre + '</td>' +
                    '<td style="padding:15px;color:#666;">' + (c.descripcion || 'Sin descripción') + '</td>' +
                    '<td style="padding:15px;color:#666;">' + fecha + '</td>' +
                    '<td style="padding:15px;text-align:right;font-weight:700;color:#4CAF50;">' + total + '</td>' +
                    '<td style="padding:15px;text-align:center;">' +
                    '<button onclick="historialCotizaciones.ver(' + c.id + ')" style="background:#2196F3;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;margin:2px;" title="Ver">👁️</button>' +
                    '<button onclick="historialCotizaciones.duplicar(' + c.id + ')" style="background:#FF9800;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;margin:2px;" title="Duplicar">📋</button>' +
                    '<button onclick="reportes.generarCotizacionPDF(' + c.id + ')" style="background:#f44336;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;margin:2px;" title="Exportar PDF">📄</button>' +
                    '<button onclick="historialCotizaciones.eliminar(' + c.id + ')" style="background:#9E9E9E;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;margin:2px;" title="Eliminar">🗑️</button>' +
                    '</td>' +
                    '</tr>';
            }).join('');
            
            console.log('✅ Cotizaciones cargadas:', this.cotizaciones.length);
            
        } catch (error) {
            console.error('❌ Error cargando cotizaciones:', error);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // BUSCAR COTIZACIONES
    // ─────────────────────────────────────────────────────────────────
    buscar: async function() {
        const termino = document.getElementById('buscar-cotizacion')?.value.trim().toLowerCase();
        const tbody = document.getElementById('historial-cotizaciones-tabla');
        
        if (!termino || termino.length < 2) {
            await this.cargar();
            return;
        }
        
        const filtradas = this.cotizaciones.filter(c => {
            return (c.id && c.id.toString().includes(termino)) ||
                   (c.descripcion && c.descripcion.toLowerCase().includes(termino)) ||
                   (c.clienteId && c.clienteId.toString().includes(termino));
        });
        
        if (filtradas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding:40px;text-align:center;color:#999;">No se encontraron cotizaciones</td></tr>';
            return;
        }
        
        await this.cargar();
    },
    
    // ─────────────────────────────────────────────────────────────────
    // VER COTIZACIÓN (MODAL COMPLETO)
    // ─────────────────────────────────────────────────────────────────
    ver: async function(id) {
        try {
            const cotizacion = await window.db.cotizaciones.get(id);
            if (!cotizacion) {
                alert('❌ Cotización no encontrada');
                return;
            }
            
            const clientes = await window.db.clientes.toArray();
            const cliente = clientes.find(cl => cl.id == cotizacion.clienteId);
            
            const modal = document.createElement('div');
            modal.id = 'modal-ver-cotizacion';
            modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;';
            
            modal.innerHTML = `
                <div style="background:white;padding:30px;border-radius:20px;max-width:900px;width:90%;max-height:90vh;overflow-y:auto;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                        <h3 style="margin:0;color:#1a1a1a;">📋 Cotización #${cotizacion.id}</h3>
                        <button onclick="document.getElementById('modal-ver-cotizacion').remove()" style="background:#f44336;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;">❌ Cerrar</button>
                    </div>
                    
                    <div style="background:#E3F2FD;padding:20px;border-radius:15px;margin-bottom:20px;">
                        <h4 style="color:#1565C0;margin:0 0 15px 0;">📋 Información General</h4>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;">
                            <div>
                                <div style="font-size:11px;color:#666;">Cliente</div>
                                <div style="font-size:14px;font-weight:600;">${cliente ? cliente.nombre : 'Sin cliente'}</div>
                            </div>
                            <div>
                                <div style="font-size:11px;color:#666;">Descripción</div>
                                <div style="font-size:14px;font-weight:600;">${cotizacion.descripcion || 'Sin descripción'}</div>
                            </div>
                            <div>
                                <div style="font-size:11px;color:#666;">Fecha</div>
                                <div style="font-size:14px;font-weight:600;">${new Date(cotizacion.fecha).toLocaleDateString('es-MX')}</div>
                            </div>
                            <div>
                                <div style="font-size:11px;color:#666;">Estado</div>
                                <div style="font-size:14px;font-weight:600;color:#4CAF50;">${cotizacion.estado || 'pendiente'}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background:#f5f7fa;padding:20px;border-radius:15px;margin-bottom:20px;">
                        <h4 style="color:#1a1a1a;margin:0 0 15px 0;">📦 Conceptos (${cotizacion.conceptosCatalogo?.length || 0})</h4>
                        <div style="max-height:300px;overflow-y:auto;">
                            ${(cotizacion.conceptosCatalogo || []).map(function(c) {
                                return '<div style="background:white;padding:15px;border-radius:10px;margin-bottom:10px;">' +
                                    '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                                    '<div>' +
                                    '<div style="font-weight:600;color:#1a1a1a;">' + c.codigo + '</div>' +
                                    '<div style="font-size:13px;color:#666;">' + (c.descripcion_corta || '').substring(0, 80) + '...</div>' +
                                    '</div>' +
                                    '<div style="text-align:right;">' +
                                    '<div style="font-size:12px;color:#666;">Cantidad: ' + (c.cantidad || 1) + ' ' + (c.unidad || '') + '</div>' +
                                    '<div style="font-weight:700;color:#4CAF50;">' + calculator.formatoMoneda((c.costos_base?.costo_directo_total || 0) * (c.cantidad || 1)) + '</div>' +
                                    '</div>' +
                                    '</div>' +
                                    '</div>';
                            }).join('') || '<div style="color:#999;text-align:center;padding:20px;">Sin conceptos</div>'}
                        </div>
                    </div>
                    
                    ${cotizacion.tiempoEjecucion ? `
                    <div style="background:#E8F5E9;padding:20px;border-radius:15px;margin-bottom:20px;">
                        <h4 style="color:#2E7D32;margin:0 0 15px 0;">⏱️ Tiempo de Ejecución</h4>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px;">
                            <div style="text-align:center;">
                                <div style="font-size:11px;color:#666;">Jornadas</div>
                                <div style="font-size:18px;font-weight:700;">${cotizacion.tiempoEjecucion.jornadas || 0}</div>
                            </div>
                            <div style="text-align:center;">
                                <div style="font-size:11px;color:#666;">Días Hábiles</div>
                                <div style="font-size:18px;font-weight:700;">${cotizacion.tiempoEjecucion.diasHabiles || 0}</div>
                            </div>
                            <div style="text-align:center;">
                                <div style="font-size:11px;color:#666;">Semanas</div>
                                <div style="font-size:18px;font-weight:700;">${cotizacion.tiempoEjecucion.semanas || 0}</div>
                            </div>
                            <div style="text-align:center;">
                                <div style="font-size:11px;color:#666;">Meses</div>
                                <div style="font-size:18px;font-weight:700;">${cotizacion.tiempoEjecucion.meses || 0}</div>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${cotizacion.factoresAjuste || cotizacion.porcentajes ? `
                    <div style="background:#FFF3E0;padding:20px;border-radius:15px;margin-bottom:20px;">
                        <h4 style="color:#E65100;margin:0 0 15px 0;">⚠️ Factores y Porcentajes</h4>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px;">
                            ${cotizacion.porcentajes ? `
                            <div style="text-align:center;">
                                <div style="font-size:11px;color:#666;">Ind. Oficina</div>
                                <div style="font-size:16px;font-weight:700;">${cotizacion.porcentajes.indirectosOficina || 5}%</div>
                            </div>
                            <div style="text-align:center;">
                                <div style="font-size:11px;color:#666;">Ind. Campo</div>
                                <div style="font-size:16px;font-weight:700;">${cotizacion.porcentajes.indirectosCampo || 15}%</div>
                            </div>
                            <div style="text-align:center;">
                                <div style="font-size:11px;color:#666;">Financiamiento</div>
                                <div style="font-size:16px;font-weight:700;">${cotizacion.porcentajes.financiamiento || 0.85}%</div>
                            </div>
                            <div style="text-align:center;">
                                <div style="font-size:11px;color:#666;">Utilidad</div>
                                <div style="font-size:16px;font-weight:700;">${cotizacion.porcentajes.utilidad || 10}%</div>
                            </div>
                            ` : ''}
                            ${cotizacion.factoresAjuste ? `
                            <div style="text-align:center;">
                                <div style="font-size:11px;color:#666;">Factor Total</div>
                                <div style="font-size:16px;font-weight:700;color:#E65100;">${cotizacion.factoresAjuste.total || 1}x</div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div style="background:linear-gradient(135deg,#1a1a1a,#333333);padding:20px;border-radius:15px;color:white;">
                        <h4 style="margin:0 0 15px 0;">💰 Resumen Financiero</h4>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px;">
                            <div>
                                <div style="font-size:11px;opacity:0.8;">Costo Directo</div>
                                <div style="font-size:18px;font-weight:700;">${calculator.formatoMoneda(cotizacion.costoDirecto || 0)}</div>
                            </div>
                            <div>
                                <div style="font-size:11px;opacity:0.8;">Indirectos</div>
                                <div style="font-size:18px;font-weight:700;">${calculator.formatoMoneda(cotizacion.totalIndirectos || 0)}</div>
                            </div>
                            <div>
                                <div style="font-size:11px;opacity:0.8;">Utilidad</div>
                                <div style="font-size:18px;font-weight:700;">${calculator.formatoMoneda(cotizacion.utilidad || 0)}</div>
                            </div>
                            <div>
                                <div style="font-size:11px;opacity:0.8;">IVA</div>
                                <div style="font-size:18px;font-weight:700;">${calculator.formatoMoneda(cotizacion.iva || 0)}</div>
                            </div>
                            <div style="grid-column:span 2;">
                                <div style="font-size:11px;opacity:0.8;">TOTAL FINAL</div>
                                <div style="font-size:24px;font-weight:700;color:#4CAF50;">${calculator.formatoMoneda(cotizacion.totalFinal || 0)}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display:flex;gap:15px;margin-top:20px;">
                        <button onclick="historialCotizaciones.duplicar(${cotizacion.id}); document.getElementById('modal-ver-cotizacion').remove();" 
                                style="flex:1;background:#FF9800;color:white;border:none;padding:14px;border-radius:10px;cursor:pointer;font-weight:600;">
                            📋 Duplicar para Editar
                        </button>
                        <button onclick="reportes.generarCotizacionPDF(${cotizacion.id})" 
                                style="flex:1;background:#4CAF50;color:white;border:none;padding:14px;border-radius:10px;cursor:pointer;font-weight:600;">
                            📄 Exportar PDF
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
        } catch (error) {
            console.error('❌ Error viendo cotización:', error);
            alert('❌ Error: ' + error.message);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // DUPLICAR COTIZACIÓN (CORREGIDO - CARGA TODOS LOS DATOS)
    // ─────────────────────────────────────────────────────────────────
    duplicar: async function(id) {
        try {
            const cotizacionOriginal = await window.db.cotizaciones.get(id);
            if (!cotizacionOriginal) {
                alert('❌ Cotización no encontrada');
                return;
            }
            
            if (!confirm('¿Duplicar cotización #' + id + ' para editar?\n\nSe copiarán:\n• Conceptos\n• Materiales adicionales\n• Mano de obra\n• Equipos\n• Tiempos estimados\n• Factores aplicados')) {
                return;
            }
            
            console.log('📋 Duplicando cotización:', cotizacionOriginal);
            
            // ⚠️ IMPORTANTE: Inicializar app.impactoFactores ANTES de navegar
            if (window.app) {
                // Inicializar impactoFactores con valores por defecto
                window.app.impactoFactores = {
                    factorAltura: 1,
                    factorClima: 1,
                    factorAcceso: 1,
                    factorSeguridad: 1,
                    factorTotal: 1,
                    tiempoOriginal: 0,
                    tiempoAjustado: 0,
                    diasIncremento: 0,
                    porcentajeIncremento: 0,
                    costoTiempoExtendido: 0,
                    aplicado: false
                };
                
                // Si la cotización original tiene factores, copiarlos
                if (cotizacionOriginal.factoresAjuste) {
                    window.app.factoresAjuste = { ...cotizacionOriginal.factoresAjuste };
                    window.app.impactoFactores.factorAltura = cotizacionOriginal.factoresAjuste.altura || 1;
                    window.app.impactoFactores.factorClima = cotizacionOriginal.factoresAjuste.clima || 1;
                    window.app.impactoFactores.factorAcceso = cotizacionOriginal.factoresAjuste.acceso || 1;
                    window.app.impactoFactores.factorSeguridad = cotizacionOriginal.factoresAjuste.seguridad || 1;
                    window.app.impactoFactores.factorTotal = cotizacionOriginal.factoresAjuste.total || 1;
                    window.app.impactoFactores.aplicado = (cotizacionOriginal.factoresAjuste.total || 1) > 1;
                }
                
                // Copiar tiempo de ejecución
                if (cotizacionOriginal.tiempoEjecucion) {
                    window.app.tiempoEjecucion = { ...cotizacionOriginal.tiempoEjecucion };
                    window.app.impactoFactores.tiempoOriginal = cotizacionOriginal.tiempoEjecucion.diasHabiles || 0;
                }
                
                // Copiar datos de la cotización
                window.app.datosCotizacion = {
                    materiales: cotizacionOriginal.materialesAdicionales || [],
                    manoObra: cotizacionOriginal.manoObraAdicional || [],
                    equipos: cotizacionOriginal.equiposAdicionales || [],
                    herramienta: cotizacionOriginal.herramientaAdicional || [],
                    indirectos: cotizacionOriginal.indirectosAdicionales || [],
                    conceptosSeleccionados: cotizacionOriginal.conceptosCatalogo || []
                };
                
                console.log('✅ impactoFactores inicializado:', window.app.impactoFactores);
            }
            
            // Navegar a Nueva Cotización
            if (window.app) {
                window.app.mostrarPantalla('nueva-cotizacion-screen');
                
                // ⚠️ IMPORTANTE: Actualizar UI después de navegar (con delay)
                setTimeout(function() {
                    if (window.app) {
                        // Llenar campos de texto
                        const inpCliente = document.getElementById('cot-cliente');
                        const inpDescripcion = document.getElementById('cot-descripcion');
                        const inpUbicacion = document.getElementById('cot-ubicacion');
                        const inpFechaInicio = document.getElementById('cot-fecha-inicio');
                        const inpFechaFin = document.getElementById('cot-fecha-fin');
                        
                        if (inpCliente) inpCliente.value = cotizacionOriginal.clienteId || '';
                        if (inpDescripcion) inpDescripcion.value = (cotizacionOriginal.descripcion || '') + ' (Copia)';
                        if (inpUbicacion) inpUbicacion.value = cotizacionOriginal.ubicacion || '';
                        if (inpFechaInicio) inpFechaInicio.value = cotizacionOriginal.fechaInicio ? cotizacionOriginal.fechaInicio.split('T')[0] : '';
                        if (inpFechaFin) inpFechaFin.value = cotizacionOriginal.fechaFinSolicitada ? cotizacionOriginal.fechaFinSolicitada.split('T')[0] : '';
                        
                        // Llenar porcentajes
                        if (cotizacionOriginal.porcentajes) {
                            const inpOficina = document.getElementById('cot-indirectos-oficina');
                            const inpCampo = document.getElementById('cot-indirectos-campo');
                            const inpFinanciamiento = document.getElementById('cot-financiamiento');
                            const inpUtilidad = document.getElementById('cot-utilidad');
                            
                            if (inpOficina) inpOficina.value = cotizacionOriginal.porcentajes.indirectosOficina || 5;
                            if (inpCampo) inpCampo.value = cotizacionOriginal.porcentajes.indirectosCampo || 15;
                            if (inpFinanciamiento) inpFinanciamiento.value = cotizacionOriginal.porcentajes.financiamiento || 0.85;
                            if (inpUtilidad) inpUtilidad.value = cotizacionOriginal.porcentajes.utilidad || 10;
                        }
                        
                        // Actualizar UI
                        window.app.actualizarConceptosSeleccionadosUI();
                        window.app.actualizarContadorGeneral();
                        window.app.calcularTotalConConceptos();
                        
                        console.log('✅ UI actualizada para edición');
                    }
                }, 500);
            }
            
            alert('✅ Cotización duplicada: #' + id + '\n\nAhora puedes editarla en Nueva Cotización');
            
            // Recargar historial
            await this.cargar();
            
        } catch (error) {
            console.error('❌ Error duplicando cotización:', error);
            alert('❌ Error: ' + error.message);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // EXPORTAR PDF
    // ─────────────────────────────────────────────────────────────────
    exportarPDF: async function(id) {
        try {
            if (typeof window.jspdf === 'undefined') {
                alert('⚠️ jsPDF no está cargado');
                return;
            }
            
            const cotizacion = await window.db.cotizaciones.get(id);
            if (!cotizacion) {
                alert('❌ Cotización no encontrada');
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            doc.setFontSize(18);
            doc.text('COTIZACIÓN #' + cotizacion.id, 105, 20, { align: 'center' });
            
            doc.setFontSize(12);
            doc.text('Fecha: ' + new Date(cotizacion.fecha).toLocaleDateString('es-MX'), 20, 40);
            doc.text('Descripción: ' + (cotizacion.descripcion || 'Sin descripción'), 20, 50);
            
            doc.text('Conceptos:', 20, 70);
            let yPos = 80;
            
            (cotizacion.conceptosCatalogo || []).forEach(function(c) {
                const subtotal = (c.costos_base?.costo_directo_total || 0) * (c.cantidad || 1);
                doc.setFontSize(10);
                doc.text(c.codigo + ' - ' + (c.descripcion_corta || '').substring(0, 50), 20, yPos);
                doc.text(calculator.formatoMoneda(subtotal), 180, yPos, { align: 'right' });
                yPos += 7;
                
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
            });
            
            yPos += 10;
            doc.setDrawColor(200);
            doc.line(20, yPos, 190, yPos);
            yPos += 10;
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('TOTAL FINAL:', 140, yPos);
            doc.text(calculator.formatoMoneda(cotizacion.totalFinal || 0), 190, yPos, { align: 'right' });
            
            doc.save('Cotizacion-' + cotizacion.id + '.pdf');
            
            console.log('✅ PDF exportado');
            
        } catch (error) {
            console.error('❌ Error exportando PDF:', error);
            alert('❌ Error: ' + error.message);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // ELIMINAR COTIZACIÓN
    // ─────────────────────────────────────────────────────────────────
    eliminar: async function(id) {
        try {
            if (!confirm('¿Eliminar cotización #' + id + '?\n\nEsta acción no se puede deshacer.')) {
                return;
            }
            
            await window.db.cotizaciones.delete(id);
            
            alert('✅ Cotización eliminada');
            
            await this.cargar();
            
        } catch (error) {
            console.error('❌ Error eliminando cotización:', error);
            alert('❌ Error: ' + error.message);
        }
    }
};

console.log('✅ historial-cotizaciones.js listo');
