// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - APLICACIÓN PRINCIPAL (COMPLETO Y CORREGIDO)
// ─────────────────────────────────────────────────────────────────────

console.log('🏭 SmartCot v2.0 iniciando...');

window.app = {
    
    estado: {
        dbLista: false,
        licenciaActiva: false,
        cotizacionActual: null,
        factoresAplicados: false
    },
    
    datosCotizacion: {
        materiales: [],
        manoObra: [],
        equipos: [],
        herramienta: [],
        indirectos: [],
        conceptosSeleccionados: []
    },
    
    tiempoEjecucion: {
        jornadas: 0,
        diasHabiles: 0,
        semanas: 0,
        meses: 0
    },
    
    factoresAjuste: {
        altura: 1,
        clima: 1,
        acceso: 1,
        seguridad: 1,
        total: 1
    },
    
    impactoFactores: {
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
    },
    
    costoIndirectosDiario: 0,
    
    // ─────────────────────────────────────────────────────────────────
    // INICIALIZACIÓN
    // ─────────────────────────────────────────────────────────────────
    init: async function() {
        try {
            console.log('🏭 SmartCot v2.0 iniciando...');
            
            await this.esperarDB();
            this.estado.dbLista = true;
            console.log('✅ Base de datos lista');
            
            const licencia = window.licencia.cargar();
            this.estado.licenciaActiva = licencia && !licencia.expirada;
            this.actualizarInfoLicencia(licencia);
            
            await this.cargarConfiguracion();
            await this.cargarEstadisticas();
            await this.cargarClientesSelect();
            await this.cargarActividadReciente();
            
            this.inicializarFormularios();
            
            console.log('✅ SmartCot v2.0 listo');
            this.notificacion('¡Bienvenido a SmartCot v2.0!', 'exito');
            
        } catch (error) {
            console.error('❌ Error en inicialización:', error);
            this.notificacion('Error al iniciar SmartCot', 'error');
        }
    },
    
    esperarDB: async function() {
        let intentos = 0;
        const maxIntentos = 50;
        
        while (!window.db && intentos < maxIntentos) {
            await new Promise(function(resolve) { setTimeout(resolve, 100); });
            intentos++;
        }
        
        if (!window.db) {
            throw new Error('DB no disponible después de 5 segundos');
        }
        
        this.estado.dbLista = true;
    },
    
    inicializarFormularios: function() {
        this.agregarMaterial();
        this.agregarManoObra();
        this.agregarEquipo();
        this.agregarIndirecto();
        this.calcularTotal();
    },
    
    // ─────────────────────────────────────────────────────────────────
    // NAVEGACIÓN
    // ─────────────────────────────────────────────────────────────────
    mostrarPantalla: function(id) {
        console.log('📄 Navegando a:', id);
        
        document.querySelectorAll('.screen').forEach(function(s) {
            s.classList.remove('active');
            s.style.display = 'none';
        });
        
        const pantalla = document.getElementById(id);
        if (!pantalla) {
            console.error('❌ Pantalla NO encontrada:', id);
            return;
        }
        
        pantalla.classList.add('active');
        pantalla.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        switch(id) {
            case 'dashboard-screen':
                this.cargarEstadisticas();
                this.cargarActividadReciente();
                break;
            case 'catalogos-screen':
                this.cargarCatalogoCompleto();
                break;
            case 'nueva-cotizacion-screen':
                this.verificarClientesDisponibles();
                this.actualizarConceptosSeleccionadosUI();
                this.calcularTotalConConceptos();
                break;
            case 'curva-s-screen':
                if (window.curvaS) {
                    setTimeout(() => { curvaS.init(); }, 300);
                }
                break;
            case 'historial-cotizaciones-screen':
                if (window.historialCotizaciones) {
                    setTimeout(() => { historialCotizaciones.cargar(); }, 300);
                }
                break;
            case 'importar-screen':
                console.log('✅ Pantalla de importar lista');
                break;
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // LICENCIA
    // ─────────────────────────────────────────────────────────────────
    actualizarInfoLicencia: function(licencia) {
        const info = document.getElementById('license-info');
        if (!info) return;
        
        if (licencia && !licencia.expirada) {
            info.textContent = '✅ ' + licencia.tipo + ' - Exp: ' + new Date(licencia.expiracion).toLocaleDateString('es-MX');
            info.style.background = 'rgba(76, 175, 80, 0.2)';
            info.style.color = '#4CAF50';
        } else {
            info.textContent = '🔓 Sin licencia';
            info.style.background = 'rgba(244, 67, 54, 0.2)';
            info.style.color = '#f44336';
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // ESTADÍSTICAS
    // ─────────────────────────────────────────────────────────────────
    cargarEstadisticas: async function() {
        try {
            if (!window.db || !window.dbUtils) {
                console.warn('⚠️ DB o dbUtils no disponible');
                return;
            }
            
            const stats = await window.dbUtils.estadisticas();
            
            this.animarNumero('stat-conceptos', stats.conceptos || 0);
            this.animarNumero('stat-materiales', stats.materiales || 0);
            this.animarNumero('stat-mano-obra', stats.manoObra || 0);
            this.animarNumero('stat-equipos', stats.equipos || 0);
            
            const elIngresos = document.getElementById('stat-ingresos');
            if (elIngresos) {
                elIngresos.textContent = calculator.formatoMoneda(stats.totalIngresos || 0);
            }
            
        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
        }
    },
    
    animarNumero: function(elementId, valorFinal) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const valorActual = parseInt(element.textContent) || 0;
        const duracion = 1000;
        const pasos = 30;
        const incremento = (valorFinal - valorActual) / pasos;
        
        let pasoActual = 0;
        const intervalo = setInterval(function() {
            pasoActual++;
            const valor = Math.round(valorFinal - (incremento * (pasos - pasoActual)));
            element.textContent = valor;
            
            if (pasoActual >= pasos) {
                clearInterval(intervalo);
                element.textContent = valorFinal;
            }
        }, duracion / pasos);
    },
    
    // ─────────────────────────────────────────────────────────────────
    // ACTIVIDAD RECIENTE
    // ─────────────────────────────────────────────────────────────────
    cargarActividadReciente: async function() {
        try {
            const container = document.getElementById('recent-activity');
            if (!container) return;
            
            const cotizaciones = await window.db.cotizaciones.reverse().limit(5).toArray();
            
            if (cotizaciones.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><h3>Sin actividad reciente</h3><p>Comienza creando una cotización</p></div>';
                return;
            }
            
            const clientes = await window.db.clientes.toArray();
            
            container.innerHTML = '<div style="display:grid;gap:15px;">' + cotizaciones.map(function(c) {
                const cliente = clientes.find(cl => cl.id == c.clienteId);
                const fecha = new Date(c.fecha).toLocaleDateString('es-MX');
                return '<div style="background:white;padding:15px;border-radius:10px;border-left:4px solid #4CAF50;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                    '<div>' +
                    '<div style="font-weight:600;color:#1a1a1a;">Cotización #' + c.id + '</div>' +
                    '<div style="font-size:13px;color:#666;">' + (cliente ? cliente.nombre : 'Sin cliente') + '</div>' +
                    '<div style="font-size:12px;color:#999;">' + fecha + '</div>' +
                    '</div>' +
                    '<div style="font-size:18px;font-weight:700;color:#4CAF50;">' + calculator.formatoMoneda(c.totalFinal || 0) + '</div>' +
                    '</div>' +
                    '</div>';
            }).join('') + '</div>';
            
        } catch (error) {
            console.error('❌ Error cargando actividad reciente:', error);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CATÁLOGO
    // ─────────────────────────────────────────────────────────────────
    cargarCatalogoCompleto: async function() {
        try {
            if (!window.db) {
                console.error('❌ DB no disponible');
                return;
            }
            
            const container = document.getElementById('lista-catalogo');
            if (!container) {
                console.error('❌ Container lista-catalogo no encontrado');
                return;
            }
            
            const conceptos = await window.db.conceptos.limit(50).toArray();
            
            if (conceptos.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><h3>Sin conceptos</h3><p>Importa conceptos desde Excel para comenzar</p><button onclick="app.mostrarPantalla(\'importar-screen\')" style="margin-top:15px;background:#2196F3;color:white;border:none;padding:12px 25px;border-radius:10px;cursor:pointer;font-weight:600;">📥 Importar Ahora</button></div>';
                return;
            }
            
            const app = this;
            container.innerHTML = conceptos.map(function(c) {
                return '<div style="padding:15px;border:1px solid #ddd;border-radius:10px;margin-bottom:10px;background:white;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:start;">' +
                    '<div>' +
                    '<div style="font-weight:700;color:#1a1a1a;margin-bottom:5px;">' + c.codigo + '</div>' +
                    '<div style="color:#666;font-size:14px;">' + c.descripcion_corta + '</div>' +
                    '<div style="color:#999;font-size:12px;margin-top:5px;">Unidad: ' + c.unidad + ' | Rendimiento: ' + c.rendimiento_base + '</div>' +
                    '</div>' +
                    '<button onclick="app.agregarConceptoACotizacion(\'' + c.id + '\')" style="background:#4CAF50;color:white;border:none;padding:8px 15px;border-radius:8px;cursor:pointer;font-weight:600;">➕ Agregar</button>' +
                    '</div></div>';
            }).join('');
            
        } catch (error) {
            console.error('❌ Error cargando catálogo:', error);
            const container = document.getElementById('lista-catalogo');
            if (container) {
                container.innerHTML = '<div style="padding:20px;text-align:center;color:#f44336;">Error cargando catálogo: ' + error.message + '</div>';
            }
        }
    },
    
    filtrarCatalogo: async function(categoria) {
        try {
            const container = document.getElementById('lista-catalogo');
            if (!container) return;
            
            document.querySelectorAll('#catalogos-screen .btn').forEach(function(btn) {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
            });
            if (event && event.target) {
                event.target.classList.remove('btn-secondary');
                event.target.classList.add('btn-primary');
            }
            
            let conceptos;
            if (categoria === 'todos') {
                conceptos = await window.db.conceptos.limit(50).toArray();
            } else {
                conceptos = await window.db.conceptos.where('categoria').equals(categoria).limit(50).toArray();
            }
            
            if (conceptos.length === 0) {
                container.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">No hay conceptos en esta categoría</div>';
                return;
            }
            
            const app = this;
            container.innerHTML = conceptos.map(function(c) {
                return '<div style="padding:15px;border:1px solid #ddd;border-radius:10px;margin-bottom:10px;background:white;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:start;">' +
                    '<div>' +
                    '<div style="font-weight:700;color:#1a1a1a;margin-bottom:5px;">' + c.codigo + '</div>' +
                    '<div style="color:#666;font-size:14px;">' + (c.descripcion_corta || '') + '</div>' +
                    '<div style="color:#999;font-size:12px;margin-top:5px;">' +
                    '<span style="background:#E3F2FD;padding:2px 8px;border-radius:4px;font-size:11px;">' + (c.categoria || 'General') + '</span>' +
                    '<span style="margin-left:10px;">Unidad: ' + (c.unidad || 'N/A') + '</span>' +
                    '<span style="margin-left:10px;">Rendimiento: ' + (c.rendimiento_base || 0) + '</span>' +
                    '</div>' +
                    '</div>' +
                    '<button onclick="app.agregarConceptoACotizacion(\'' + c.id + '\')" ' +
                    'style="background:#4CAF50;color:white;border:none;padding:8px 15px;border-radius:8px;cursor:pointer;font-weight:600;">➕ Agregar</button>' +
                    '</div></div>';
            }).join('');
            
            this.actualizarContadorCatalogo();
            
        } catch (error) {
            console.error('❌ Error filtrando catálogo:', error);
        }
    },
    
    buscarEnCatalogo: async function() {
        try {
            const termino = document.getElementById('buscar-catalogo')?.value.trim();
            const container = document.getElementById('lista-catalogo');
            if (!container) return;
            
            if (!termino || termino.length < 2) {
                await this.filtrarCatalogo('todos');
                return;
            }
            
            const conceptos = await window.db.conceptos
                .filter(function(c) {
                    return (c.codigo || '').toLowerCase().includes(termino.toLowerCase()) ||
                        (c.descripcion_corta || '').toLowerCase().includes(termino.toLowerCase());
                })
                .limit(50)
                .toArray();
            
            if (conceptos.length === 0) {
                container.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">No se encontraron conceptos</div>';
                return;
            }
            
            const app = this;
            container.innerHTML = conceptos.map(function(c) {
                return '<div style="padding:15px;border:1px solid #ddd;border-radius:10px;margin-bottom:10px;background:white;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:start;">' +
                    '<div>' +
                    '<div style="font-weight:700;color:#1a1a1a;margin-bottom:5px;">' + c.codigo + '</div>' +
                    '<div style="color:#666;font-size:14px;">' + (c.descripcion_corta || '') + '</div>' +
                    '<div style="color:#999;font-size:12px;margin-top:5px;">Unidad: ' + (c.unidad || 'N/A') + ' | Rendimiento: ' + (c.rendimiento_base || 0) + '</div>' +
                    '</div>' +
                    '<button onclick="app.agregarConceptoACotizacion(\'' + c.id + '\')" ' +
                    'style="background:#4CAF50;color:white;border:none;padding:8px 15px;border-radius:8px;cursor:pointer;font-weight:600;">➕ Agregar</button>' +
                    '</div></div>';
            }).join('');
            
            this.actualizarContadorCatalogo();
            
        } catch (error) {
            console.error('❌ Error buscando en catálogo:', error);
        }
    },
    
    actualizarContadorCatalogo: function() {
        const countLabel = document.getElementById('conceptos-count-catalogo');
        const container = document.getElementById('conceptos-seleccionados-catalogo');
        
        if (countLabel) {
            countLabel.textContent = this.datosCotizacion.conceptosSeleccionados.length;
        }
        
        if (container) {
            this.actualizarConceptosSeleccionadosUI();
        }
    },
    
    actualizarContadorGeneral: function() {
        const count = this.datosCotizacion.conceptosSeleccionados.length;
        
        const countNuevaCot = document.getElementById('conceptos-count');
        if (countNuevaCot) {
            countNuevaCot.textContent = count;
        }
        
        const countCatalogo = document.getElementById('conceptos-count-catalogo');
        if (countCatalogo) {
            countCatalogo.textContent = count;
        }
    },
    
    limpiarConceptosSeleccionados: function() {
        if (confirm('¿Eliminar todos los conceptos seleccionados?')) {
            this.datosCotizacion.conceptosSeleccionados = [];
            this.actualizarConceptosSeleccionadosUI();
            this.actualizarContadorCatalogo();
            this.notificacion('🗑️ Conceptos eliminados', 'advertencia');
        }
    },
    
    agregarConceptoACotizacion: async function(conceptoId) {
        try {
            console.log('📋 Agregando concepto:', conceptoId);
            
            const concepto = await window.db.conceptos.get(conceptoId);
            
            if (!concepto) {
                this.notificacion('Concepto no encontrado', 'error');
                return;
            }
            
            const existe = this.datosCotizacion.conceptosSeleccionados.find(function(c) {
                return c.id === conceptoId;
            });
            
            if (existe) {
                this.notificacion('⚠️ Este concepto ya está en la cotización', 'advertencia');
                return;
            }
            
            concepto.cantidad = 1;
            this.datosCotizacion.conceptosSeleccionados.push(concepto);
            
            console.log('✅ Concepto agregado:', concepto.codigo);
            console.log('📊 Total conceptos:', this.datosCotizacion.conceptosSeleccionados.length);
            
            this.actualizarConceptosSeleccionadosUI();
            this.actualizarContadorGeneral();
            this.calcularTotalConConceptos();
            
            this.notificacion('✅ Concepto ' + concepto.codigo + ' agregado (' +
                this.datosCotizacion.conceptosSeleccionados.length + ' total)', 'exito');
            
        } catch (error) {
            console.error('❌ Error agregando concepto:', error);
            this.notificacion('Error al agregar concepto: ' + error.message, 'error');
        }
    },
    
    actualizarConceptosSeleccionadosUI: function() {
        const container = document.getElementById('conceptos-seleccionados');
        const containerCatalogo = document.getElementById('conceptos-seleccionados-catalogo');
        
        this.actualizarContadorGeneral();
        
        if (!container && !containerCatalogo) return;
        
        if (this.datosCotizacion.conceptosSeleccionados.length === 0) {
            const emptyHTML = '<div style="padding:40px;text-align:center;color:#999;">' +
                '<div style="font-size:48px;margin-bottom:10px;">📭</div>' +
                '<div>No hay conceptos seleccionados</div>' +
                '<div style="font-size:13px;margin-top:5px;">Ve a Catálogos y agrega conceptos para comenzar</div>' +
                '</div>';
            if (container) container.innerHTML = emptyHTML;
            if (containerCatalogo) containerCatalogo.innerHTML = emptyHTML;
            return;
        }
        
        const app = this;
        const conceptosHTML = this.datosCotizacion.conceptosSeleccionados.map(function(c, index) {
            const subtotal = (c.costos_base?.costo_directo_total || 0) * (c.cantidad || 1);
            
            const materiales = c.recursos?.materiales || [];
            const manoObra = c.recursos?.mano_obra || [];
            const equipos = c.recursos?.equipos || [];
            const herramienta = c.recursos?.herramienta || [];
            
            const totalMateriales = materiales.reduce(function(sum, m) { return sum + (m.importe || 0); }, 0);
            const totalManoObra = manoObra.reduce(function(sum, mo) { return sum + (mo.importe || 0); }, 0);
            const totalEquipos = equipos.reduce(function(sum, e) { return sum + (e.importe || 0); }, 0);
            const totalHerramienta = herramienta.reduce(function(sum, h) { return sum + (h.importe || 0); }, 0);
            
            return '<div style="padding:20px;border:2px solid #ddd;border-radius:15px;margin:15px 0;background:white;">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">' +
                '<div style="flex:1;">' +
                '<div style="font-weight:700;color:#1a1a1a;font-size:16px;">' + c.codigo + '</div>' +
                '<div style="color:#666;font-size:13px;">' + (c.descripcion_corta || '').substring(0, 60) + '...</div>' +
                '</div>' +
                '<button onclick="app.eliminarConceptoDeCotizacion(' + index + ')" ' +
                'style="background:#f44336;color:white;border:none;padding:8px 15px;border-radius:8px;cursor:pointer;">🗑️</button>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px;margin-bottom:15px;">' +
                '<div>' +
                '<label style="font-size:12px;color:#666;">Cantidad</label>' +
                '<input type="number" value="' + (c.cantidad || 1) + '" min="1" step="1" ' +
                'onchange="app.actualizarCantidadConcepto(' + index + ', this.value)" ' +
                'style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">' +
                '</div>' +
                '<div>' +
                '<label style="font-size:12px;color:#666;">Unidad</label>' +
                '<div style="padding:8px;background:#f5f7fa;border-radius:6px;font-weight:600;">' + c.unidad + '</div>' +
                '</div>' +
                '<div>' +
                '<label style="font-size:12px;color:#666;">Costo Unitario</label>' +
                '<div style="padding:8px;background:#E8F5E9;border-radius:6px;font-weight:700;color:#2E7D32;">' + calculator.formatoMoneda(c.costos_base?.costo_directo_total || 0) + '</div>' +
                '</div>' +
                '<div>' +
                '<label style="font-size:12px;color:#666;">Subtotal</label>' +
                '<div style="padding:8px;background:#1a1a1a;color:white;border-radius:6px;font-weight:700;">' + calculator.formatoMoneda(subtotal) + '</div>' +
                '</div>' +
                '</div>' +
                '<div style="background:#f5f7fa;padding:15px;border-radius:10px;margin-top:15px;">' +
                '<div style="font-weight:600;color:#1a1a1a;margin-bottom:10px;border-bottom:2px solid #ddd;padding-bottom:5px;">📦 MATERIALES (' + materiales.length + ') - ' + calculator.formatoMoneda(totalMateriales) + '</div>' +
                (materiales.length > 0 ? materiales.map(function(m) {
                    return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #ddd;font-size:12px;">' +
                        '<span style="color:#666;">' + (m.nombre || m.material_codigo || 'Sin nombre') + '</span>' +
                        '<span style="font-weight:600;">' + m.cantidad + ' ' + m.unidad + ' × ' + calculator.formatoMoneda(m.precio_unitario || 0) + ' = <span style="color:#1a1a1a;">' + calculator.formatoMoneda(m.importe || 0) + '</span></span>' +
                        '</div>';
                }).join('') : '<div style="color:#999;padding:10px;text-align:center;">Sin materiales</div>') +
                '</div>' +
                '<div style="background:#f5f7fa;padding:15px;border-radius:10px;margin-top:10px;">' +
                '<div style="font-weight:600;color:#1a1a1a;margin-bottom:10px;border-bottom:2px solid #ddd;padding-bottom:5px;">👷 MANO DE OBRA (' + manoObra.length + ') - ' + calculator.formatoMoneda(totalManoObra) + '</div>' +
                (manoObra.length > 0 ? manoObra.map(function(mo) {
                    return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ddd;font-size:13px;">' +
                        '<span style="color:#666;">' + (mo.puesto || 'Sin nombre') + '</span>' +
                        '<span style="font-weight:600;">' + mo.horas_jornada + ' JOR × ' +
                        calculator.formatoMoneda(mo.salario_hora * 8) + '/JOR = ' +
                        '<span style="color:#1a1a1a;">' + calculator.formatoMoneda(mo.importe || 0) + '</span></span>' +
                        '</div>';
                }).join('') : '<div style="color:#999;padding:10px;text-align:center;">Sin mano de obra</div>') +
                '</div>' +
                '<div style="background:#f5f7fa;padding:15px;border-radius:10px;margin-top:10px;">' +
                '<div style="font-weight:600;color:#1a1a1a;margin-bottom:10px;border-bottom:2px solid #ddd;padding-bottom:5px;">🏗️ EQUIPOS (' + equipos.length + ') - ' + calculator.formatoMoneda(totalEquipos) + '</div>' +
                (equipos.length > 0 ? equipos.map(function(e) {
                    return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #ddd;font-size:12px;">' +
                        '<span style="color:#666;">' + (e.nombre || e.equipo_codigo || 'Sin nombre') + '</span>' +
                        '<span style="font-weight:600;">' + e.horas + ' ' + e.unidad + ' × ' + calculator.formatoMoneda(e.costo_unitario || 0) + ' = <span style="color:#1a1a1a;">' + calculator.formatoMoneda(e.importe || 0) + '</span></span>' +
                        '</div>';
                }).join('') : '<div style="color:#999;padding:10px;text-align:center;">Sin equipos</div>') +
                '</div>' +
                '<div style="background:#f5f7fa;padding:15px;border-radius:10px;margin-top:10px;">' +
                '<div style="font-weight:600;color:#1a1a1a;margin-bottom:10px;border-bottom:2px solid #ddd;padding-bottom:5px;">🔧 HERRAMIENTA (' + herramienta.length + ') - ' + calculator.formatoMoneda(totalHerramienta) + '</div>' +
                (herramienta.length > 0 ? herramienta.map(function(h) {
                    return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ddd;font-size:13px;">' +
                        '<span style="color:#666;">' + (h.nombre || 'Sin nombre') + '</span>' +
                        '<span style="font-weight:600;">' + h.porcentaje + '% = ' +
                        '<span style="color:#1a1a1a;">' + calculator.formatoMoneda(h.importe || 0) + '</span></span>' +
                        '</div>';
                }).join('') : '<div style="color:#999;padding:10px;text-align:center;">Sin herramienta</div>') +
                '</div>' +
                '</div>';
        }).join('');
        
        if (container) container.innerHTML = conceptosHTML;
        if (containerCatalogo) containerCatalogo.innerHTML = conceptosHTML;
    },
    
    actualizarCantidadConcepto: function(index, cantidad) {
        if (this.datosCotizacion.conceptosSeleccionados[index]) {
            this.datosCotizacion.conceptosSeleccionados[index].cantidad = parseFloat(cantidad) || 1;
            this.calcularTotalConConceptos();
            this.actualizarConceptosSeleccionadosUI();
        }
    },
    
    eliminarConceptoDeCotizacion: function(index) {
        this.datosCotizacion.conceptosSeleccionados.splice(index, 1);
        this.calcularTotalConConceptos();
        this.actualizarConceptosSeleccionadosUI();
        this.notificacion('Concepto eliminado', 'advertencia');
    },
    
    // ─────────────────────────────────────────────────────────────────
    // MATERIALES
    // ─────────────────────────────────────────────────────────────────
    agregarMaterial: function() {
        const container = document.getElementById('materiales-lista');
        if (!container) return;
        
        const id = Date.now();
        this.datosCotizacion.materiales.push({ id: id, nombre: '', cantidad: 1, precioUnitario: 0 });
        
        const div = document.createElement('div');
        div.className = 'material-item';
        div.dataset.id = id;
        div.innerHTML = '<div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px;margin:10px 0;">' +
            '<input type="text" placeholder="Material" onchange="app.actualizarMaterial(' + id + ', \'nombre\', this.value)" style="padding:10px;border:1px solid #ddd;border-radius:8px;">' +
            '<input type="number" placeholder="Cant." value="1" min="1" onchange="app.actualizarMaterial(' + id + ', \'cantidad\', this.value)" style="padding:10px;border:1px solid #ddd;border-radius:8px;">' +
            '<input type="number" placeholder="Precio" value="0" min="0" step="0.01" onchange="app.actualizarMaterial(' + id + ', \'precioUnitario\', this.value)" style="padding:10px;border:1px solid #ddd;border-radius:8px;">' +
            '<button onclick="app.eliminarMaterial(' + id + ')" style="background:#f44336;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;">🗑️</button>' +
            '</div>';
        container.appendChild(div);
        this.calcularTotal();
    },
    
    actualizarMaterial: function(id, campo, valor) {
        const material = this.datosCotizacion.materiales.find(function(m) { return m.id === id; });
        if (material) {
            material[campo] = campo === 'nombre' ? valor : (parseFloat(valor) || 0);
        }
        this.calcularTotal();
    },
    
    eliminarMaterial: function(id) {
        this.datosCotizacion.materiales = this.datosCotizacion.materiales.filter(function(m) { return m.id !== id; });
        const el = document.querySelector('.material-item[data-id="' + id + '"]');
        if (el) el.remove();
        this.calcularTotal();
    },
    
    // ─────────────────────────────────────────────────────────────────
    // MANO DE OBRA
    // ─────────────────────────────────────────────────────────────────
    agregarManoObra: function() {
        const container = document.getElementById('mano-obra-lista');
        if (!container) return;
        
        const id = Date.now();
        this.datosCotizacion.manoObra.push({
            id: id,
            concepto: '',
            jornadas: 0,
            costoJornada: 0,
            importe: 0
        });
        
        const div = document.createElement('div');
        div.className = 'mano-obra-item';
        div.dataset.id = id;
        div.innerHTML = '<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:10px;margin:10px 0;">' +
            '<input type="text" placeholder="Concepto (ej: Ayudante general)" onchange="app.actualizarManoObra(' + id + ', \'concepto\', this.value)" style="padding:10px;border:1px solid #ddd;border-radius:8px;">' +
            '<input type="number" placeholder="Jor" value="0" min="0" step="0.01" onchange="app.actualizarManoObra(' + id + ', \'jornadas\', this.value)" style="padding:10px;border:1px solid #ddd;border-radius:8px;" title="Jornadas para tiempo de ejecución">' +
            '<input type="number" placeholder="$ / Jor" value="0" min="0" step="0.01" onchange="app.actualizarManoObra(' + id + ', \'costoJornada\', this.value)" style="padding:10px;border:1px solid #ddd;border-radius:8px;">' +
            '<div style="padding:10px;background:#f5f7fa;border-radius:8px;text-align:center;font-weight:600;" id="mo-importe-' + id + '">$0.00</div>' +
            '<button onclick="app.eliminarManoObra(' + id + ')" style="background:#f44336;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;">🗑️</button>' +
            '</div>';
        container.appendChild(div);
        this.calcularTotalConConceptos();
    },
    
    actualizarManoObra: function(id, campo, valor) {
        const mo = this.datosCotizacion.manoObra.find(function(m) { return m.id === id; });
        if (mo) {
            mo[campo] = campo === 'concepto' ? valor : (parseFloat(valor) || 0);
            
            if (campo === 'jornadas' || campo === 'costoJornada') {
                mo.importe = (mo.jornadas || 0) * (mo.costoJornada || 0);
                const importeEl = document.getElementById('mo-importe-' + id);
                if (importeEl) {
                    importeEl.textContent = calculator.formatoMoneda(mo.importe);
                }
            }
        }
        this.calcularTotalConConceptos();
    },
    
    eliminarManoObra: function(id) {
        this.datosCotizacion.manoObra = this.datosCotizacion.manoObra.filter(function(m) { return m.id !== id; });
        const el = document.querySelector('.mano-obra-item[data-id="' + id + '"]');
        if (el) el.remove();
        this.calcularTotal();
    },
    
    // ─────────────────────────────────────────────────────────────────
    // EQUIPOS
    // ─────────────────────────────────────────────────────────────────
    agregarEquipo: function() {
        const container = document.getElementById('equipos-lista');
        if (!container) return;
        
        const id = Date.now();
        this.datosCotizacion.equipos.push({ id: id, nombre: '', horas: 1, costoUnitario: 0 });
        
        const div = document.createElement('div');
        div.className = 'equipo-item';
        div.dataset.id = id;
        div.innerHTML = '<div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px;margin:10px 0;">' +
            '<input type="text" placeholder="Equipo" onchange="app.actualizarEquipo(' + id + ', \'nombre\', this.value)" style="padding:10px;border:1px solid #ddd;border-radius:8px;">' +
            '<input type="number" placeholder="Horas" value="1" min="1" onchange="app.actualizarEquipo(' + id + ', \'horas\', this.value)" style="padding:10px;border:1px solid #ddd;border-radius:8px;">' +
            '<input type="number" placeholder="$ Unit" value="0" min="0" step="0.01" onchange="app.actualizarEquipo(' + id + ', \'costoUnitario\', this.value)" style="padding:10px;border:1px solid #ddd;border-radius:8px;">' +
            '<button onclick="app.eliminarEquipo(' + id + ')" style="background:#f44336;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;">🗑️</button>' +
            '</div>';
        container.appendChild(div);
        this.calcularTotal();
    },
    
    actualizarEquipo: function(id, campo, valor) {
        const equipo = this.datosCotizacion.equipos.find(function(e) { return e.id === id; });
        if (equipo) {
            equipo[campo] = campo === 'nombre' ? valor : (parseFloat(valor) || 0);
        }
        this.calcularTotal();
    },
    
    eliminarEquipo: function(id) {
        this.datosCotizacion.equipos = this.datosCotizacion.equipos.filter(function(e) { return e.id !== id; });
        const el = document.querySelector('.equipo-item[data-id="' + id + '"]');
        if (el) el.remove();
        this.calcularTotal();
    },
    
    // ─────────────────────────────────────────────────────────────────
    // INDIRECTOS
    // ─────────────────────────────────────────────────────────────────
    agregarIndirecto: function() {
        const container = document.getElementById('indirectos-lista');
        if (!container) {
            console.warn('⚠️ No existe indirectos-lista en el HTML');
            return;
        }
        
        if (!this.datosCotizacion.indirectos) {
            this.datosCotizacion.indirectos = [];
        }
        
        const id = Date.now();
        this.datosCotizacion.indirectos.push({ id: id, concepto: '', monto: 0 });
        
        const div = document.createElement('div');
        div.className = 'indirecto-item';
        div.dataset.id = id;
        div.innerHTML = '<div style="display:grid;grid-template-columns:2fr 1fr auto;gap:10px;margin:10px 0;">' +
            '<input type="text" placeholder="Concepto" onchange="app.actualizarIndirecto(' + id + ', \'concepto\', this.value)" style="padding:10px;border:1px solid #ddd;border-radius:8px;">' +
            '<input type="number" placeholder="Monto" value="0" min="0" step="0.01" onchange="app.actualizarIndirecto(' + id + ', \'monto\', this.value)" style="padding:10px;border:1px solid #ddd;border-radius:8px;">' +
            '<button onclick="app.eliminarIndirecto(' + id + ')" style="background:#f44336;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;">🗑️</button>' +
            '</div>';
        container.appendChild(div);
        this.calcularTotal();
    },
    
    actualizarIndirecto: function(id, campo, valor) {
        const ind = this.datosCotizacion.indirectos.find(function(i) { return i.id === id; });
        if (ind) {
            ind[campo] = campo === 'concepto' ? valor : (parseFloat(valor) || 0);
        }
        this.calcularTotal();
    },
    
    eliminarIndirecto: function(id) {
        this.datosCotizacion.indirectos = this.datosCotizacion.indirectos.filter(function(i) { return i.id !== id; });
        const el = document.querySelector('.indirecto-item[data-id="' + id + '"]');
        if (el) el.remove();
        this.calcularTotal();
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CÁLCULOS
    // ─────────────────────────────────────────────────────────────────
    calcularTotal: function() {
        if (this.datosCotizacion.conceptosSeleccionados && this.datosCotizacion.conceptosSeleccionados.length > 0) {
            this.calcularTotalConConceptos();
            return;
        }
        
        const utilidadPorcentaje = parseFloat(document.getElementById('cot-utilidad')?.value) || 10;
        
        const subtotal =
            this.datosCotizacion.materiales.reduce(function(sum, m) { return sum + ((m.cantidad || 0) * (m.precioUnitario || 0)); }, 0) +
            this.datosCotizacion.manoObra.reduce(function(sum, m) { return sum + ((m.jornadas || 0) * (m.costoJornada || 0)); }, 0) +
            this.datosCotizacion.equipos.reduce(function(sum, e) { return sum + ((e.horas || 0) * (e.costoUnitario || 0)); }, 0);
        
        const indirectos = this.datosCotizacion.indirectos.reduce(function(sum, i) { return sum + (i.monto || 0); }, 0);
        const utilidad = (subtotal + indirectos) * (utilidadPorcentaje / 100);
        const iva = (subtotal + indirectos + utilidad) * 0.16;
        const total = subtotal + indirectos + utilidad + iva;
        
        const elementos = {
            'resumen-costo-directo': subtotal,
            'resumen-subtotal': subtotal + indirectos + utilidad,
            'resumen-indirectos': indirectos,
            'resumen-utilidad': utilidad,
            'resumen-utilidad-costo': utilidad,
            'resumen-iva': iva,
            'resumen-total': total
        };
        
        const app = this;
        Object.entries(elementos).forEach(function(par) {
            const el = document.getElementById(par[0]);
            if (el) el.textContent = calculator.formatoMoneda(par[1]);
        });
    },
    
    calcularTotalConConceptos: function() {
        let subtotal = 0;
        let totalJOR = 0;
        
        // Sumar conceptos del catálogo
        this.datosCotizacion.conceptosSeleccionados.forEach(function(c) {
            let costoDirecto = c.costos_base?.costo_directo_total || 0;
            
            if (costoDirecto === 0) {
                const mat = (c.recursos?.materiales || []).reduce(function(sum, m) {
                    return sum + (m.importe || 0);
                }, 0);
                const mo = (c.recursos?.mano_obra || []).reduce(function(sum, mo) {
                    return sum + (mo.importe || 0);
                }, 0);
                const eq = (c.recursos?.equipos || []).reduce(function(sum, e) {
                    return sum + (e.importe || 0);
                }, 0);
                const herr = (c.recursos?.herramienta || []).reduce(function(sum, h) {
                    return sum + (h.importe || 0);
                }, 0);
                costoDirecto = mat + mo + eq + herr;
            }
            
            subtotal += costoDirecto * (c.cantidad || 1);
            
            if (c.recursos?.mano_obra) {
                c.recursos.mano_obra.forEach(function(mo) {
                    totalJOR += (mo.horas_jornada || 0) * (c.cantidad || 1);
                });
            }
        });
        
        // Sumar adicionales
        subtotal += this.datosCotizacion.materiales.reduce(function(sum, m) {
            return sum + ((m.cantidad || 0) * (m.precioUnitario || 0));
        }, 0);
        
        subtotal += this.datosCotizacion.manoObra.reduce(function(sum, m) {
            return sum + ((m.jornadas || 0) * (m.costoJornada || 0));
        }, 0);
        
        subtotal += this.datosCotizacion.equipos.reduce(function(sum, e) {
            return sum + ((e.horas || 0) * (e.costoUnitario || 0));
        }, 0);
        
        const indirectosManuales = this.datosCotizacion.indirectos.reduce(function(sum, i) {
            return sum + (i.monto || 0);
        }, 0);
        
        // Indirectos porcentuales (EDITABLES)
        const indirectosOficinaPorcentaje = parseFloat(document.getElementById('cot-indirectos-oficina')?.value) || 5;
        const indirectosCampoPorcentaje = parseFloat(document.getElementById('cot-indirectos-campo')?.value) || 15;
        const financiamientoPorcentaje = parseFloat(document.getElementById('cot-financiamiento')?.value) || 0.85;
        
        const indirectosOficina = subtotal * (indirectosOficinaPorcentaje / 100);
        const indirectosCampo = subtotal * (indirectosCampoPorcentaje / 100);
        const financiamiento = subtotal * (financiamientoPorcentaje / 100);
        
        const totalSobrecostos = indirectosOficina + indirectosCampo + financiamiento + indirectosManuales;
        const porcentajeSobrecostos = subtotal > 0 ? (totalSobrecostos / subtotal) * 100 : 0;
        
        const baseConIndirectos = subtotal + totalSobrecostos;
        
        // Calcular costo indirectos diario para factores
        const diasOriginales = Math.ceil(totalJOR) || 1;
        this.costoIndirectosDiario = totalSobrecostos / diasOriginales;
        
        const utilidadPorcentaje = parseFloat(document.getElementById('cot-utilidad')?.value) || 10;
        const utilidad = baseConIndirectos * (utilidadPorcentaje / 100);
        const iva = (baseConIndirectos + utilidad) * 0.16;
        
        // Agregar costo por tiempo extendido (factores)
        const costoTiempoExtendido = this.impactoFactores?.aplicado ? this.impactoFactores.costoTiempoExtendido : 0;
        const totalConFactores = baseConIndirectos + utilidad + iva + costoTiempoExtendido;
        
        // Actualizar UI - TODOS los campos
        const elementos = {
            'resumen-costo-directo': subtotal,
            'resumen-indirectos-oficina': indirectosOficina,
            'resumen-indirectos-campo': indirectosCampo,
            'resumen-financiamiento': financiamiento,
            'resumen-sobrecosto-monto': totalSobrecostos,
            'resumen-sobrecosto-porcentaje': porcentajeSobrecostos.toFixed(2) + '%',
            'resumen-utilidad': utilidad,
            'resumen-utilidad-costo': utilidad,
            'resumen-iva': iva,
            'resumen-subtotal': baseConIndirectos + utilidad,
            'resumen-total': totalConFactores
        };
        
        // Actualizar costo total con factores si existe la sección
        const elCostoTotalImpacto = document.getElementById('impacto-costo-total');
        if (elCostoTotalImpacto && this.impactoFactores?.aplicado) {
            elCostoTotalImpacto.textContent = calculator.formatoMoneda(totalConFactores);
        }
        
        const app = this;
        Object.entries(elementos).forEach(function(par) {
            const el = document.getElementById(par[0]);
            if (el) {
                if (par[0].includes('porcentaje')) {
                    el.textContent = par[1];
                } else {
                    el.textContent = calculator.formatoMoneda(par[1]);
                }
            }
        });
        
        // Actualizar tiempo de ejecución
        this.actualizarTiempoEjecucion(totalJOR);
        
        // Mostrar impacto de factores si está aplicado
        this.mostrarImpactoFactores();
        
        // Verificar margen
        const margenReal = utilidad > 0 ? (utilidad / totalConFactores) * 100 : 0;
        this.verificarSmartMargin({ margenReal: margenReal, indirectosTotal: totalSobrecostos });
    },
    
    actualizarTiempoEjecucion: function(totalJOR) {
        const diasHabilesEl = document.getElementById('tiempo-dias-habiles');
        const semanasEl = document.getElementById('tiempo-semanas');
        const mesesEl = document.getElementById('tiempo-meses');
        
        if (!diasHabilesEl || !semanasEl || !mesesEl) return;
        
        const diasHabiles = Math.ceil(totalJOR);
        const semanas = (diasHabiles / 5).toFixed(2);
        const meses = ((diasHabiles / 5) / 4.33).toFixed(2);
        
        diasHabilesEl.textContent = diasHabiles + ' días hábiles';
        semanasEl.textContent = semanas + ' semanas';
        mesesEl.textContent = meses + ' meses';
        
        this.tiempoEjecucion = {
            jornadas: totalJOR.toFixed(2),
            diasHabiles: diasHabiles,
            semanas: parseFloat(semanas),
            meses: parseFloat(meses)
        };
    },
    
    verificarSmartMargin: function(resultado) {
        const warning = document.getElementById('smartmargin-warning');
        const alertasEl = document.getElementById('smartmargin-alertas');
        if (!warning || !alertasEl) return;
        
        const alertas = [];
        
        if (resultado.margenReal < 10) {
            alertas.push('⚠️ Utilidad menor al 10% recomendado para proyectos electromecánicos.');
        }
        
        if (resultado.margenReal < 5) {
            alertas.push('🚨 Utilidad CRÍTICA (<5%). Considera revisar costos o rechazar el proyecto.');
        }
        
        if (resultado.indirectosTotal === 0) {
            alertas.push('⚠️ No se incluyeron costos indirectos. Lo normal es 20-25% del costo directo.');
        }
        
        if (alertas.length > 0) {
            warning.style.display = 'block';
            alertasEl.innerHTML = alertas.join('<br>');
        } else {
            warning.style.display = 'none';
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // FACTORES DE AJUSTE
    // ─────────────────────────────────────────────────────────────────
    abrirFactoresAjuste: function() {
        const modal = document.getElementById('modal-factores');
        if (modal) {
            modal.style.display = 'flex';
            this.aplicarFactores();
        } else {
            console.error('❌ Modal de factores no encontrado');
        }
    },
    // ─────────────────────────────────────────────────────────────────────
    // APLICAR FACTORES (CORREGIDO - LLENA impactoFactores)
    // ─────────────────────────────────────────────────────────────────────
    aplicarFactores: function() {
        const factorAltura = parseFloat(document.getElementById('factor-altura')?.value) || 1;
        const factorClima = parseFloat(document.getElementById('factor-clima')?.value) || 1;
        const factorAcceso = parseFloat(document.getElementById('factor-acceso')?.value) || 1;
        const factorSeguridad = parseFloat(document.getElementById('factor-seguridad')?.value) || 1;
        const factorTotal = factorAltura * factorClima * factorAcceso * factorSeguridad;
      
        const tiempoOriginal = this.tiempoEjecucion?.diasHabiles || 0;
        const tiempoAjustado = Math.ceil(tiempoOriginal * factorTotal);
        const diasIncremento = tiempoAjustado - tiempoOriginal;
        const porcentajeIncremento = tiempoOriginal > 0 ? ((factorTotal - 1) * 100) : 0;
        
        // Calcular costo por tiempo extendido
        const costoIndirectosDiario = this.costoIndirectosDiario || 0;
        const costoTiempoExtendido = costoIndirectosDiario * diasIncremento;

        
        // ✅ GUARDAR IMPACTO (ESTO FALTA EN TU CÓDIGO)
        this.impactoFactores = {
            factorAltura: factorAltura,
            factorClima: factorClima,
            factorAcceso: factorAcceso,
            factorSeguridad: factorSeguridad,
            factorTotal: factorTotal,
            tiempoOriginal: tiempoOriginal,
            tiempoAjustado: tiempoAjustado,
            diasIncremento: diasIncremento,
            porcentajeIncremento: porcentajeIncremento,
            costoTiempoExtendido: costoTiempoExtendido,
            aplicado: factorTotal > 1
        };
        
        // Actualizar modal
        const elTiempoOriginal = document.getElementById('tiempo-original');
        const elTiempoAjustado = document.getElementById('tiempo-ajustado');
        if (elTiempoOriginal) elTiempoOriginal.textContent = tiempoOriginal + ' días';
        if (elTiempoAjustado) elTiempoAjustado.textContent = tiempoAjustado + ' días';
        
        this.factorAjusteActual = factorTotal;
        
        console.log('✅ Impacto calculado:', this.impactoFactores);
    },
    
    // ─────────────────────────────────────────────────────────────────────
    // GUARDAR FACTORES (CORREGIDO - Muestra la sección)
    // ─────────────────────────────────────────────────────────────────────
    guardarFactores: function() {
        const factorAltura = parseFloat(document.getElementById('factor-altura')?.value) || 1;
        const factorClima = parseFloat(document.getElementById('factor-clima')?.value) || 1;
        const factorAcceso = parseFloat(document.getElementById('factor-acceso')?.value) || 1;
        const factorSeguridad = parseFloat(document.getElementById('factor-seguridad')?.value) || 1;
        const factorTotal = factorAltura * factorClima * factorAcceso * factorSeguridad;
        
        this.factoresAjuste = {
            altura: factorAltura,
            clima: factorClima,
            acceso: factorAcceso,
            seguridad: factorSeguridad,
            total: factorTotal
        };
        
        // Recalcular tiempo con factores
        if (this.tiempoEjecucion) {
            this.tiempoEjecucion.diasHabilesAjustado = Math.ceil(
                this.tiempoEjecucion.diasHabiles * factorTotal
            );
            this.tiempoEjecucion.semanasAjustado = (this.tiempoEjecucion.diasHabilesAjustado / 5).toFixed(2);
            this.tiempoEjecucion.mesesAjustado = (this.tiempoEjecucion.semanasAjustado / 4.33).toFixed(2);
        }
        
        // Cerrar modal
        const modal = document.getElementById('modal-factores');
        if (modal) modal.style.display = 'none';
        
        // ⚠️ IMPORTANTE: Marcar como aplicado y mostrar sección
        this.impactoFactores.aplicado = factorTotal > 1;
        this.impactoFactores.factorTotal = factorTotal;
        
        // Mostrar sección de impacto permanentemente
        this.mostrarImpactoFactores();
        
        // Recalcular totales (ESTO ACTUALIZA LOS COSTOS)
        this.calcularTotalConConceptos();
        
        this.notificacion('✅ Factores aplicados: ' + (factorTotal * 100).toFixed(0) + '%', 'exito');
    },
    // ─────────────────────────────────────────────────────────────────────
    // MOSTRAR IMPACTO FACTORES (CORREGIDO - Debug incluido)
    // ─────────────────────────────────────────────────────────────────────
    mostrarImpactoFactores: function() {
        const seccion = document.getElementById('seccion-impacto-factores');
        if (!seccion) {
            console.error('❌ No se encontró seccion-impacto-factores en HTML');
            return;
        }
        
        console.log('📊 Mostrar impacto - impactoFactores:', this.impactoFactores);
        console.log('📊 factorTotal:', this.impactoFactores?.factorTotal);
        console.log('📊 aplicado:', this.impactoFactores?.aplicado);
        
        // Mostrar sección solo si hay factores aplicados (factorTotal > 1)
        if (this.impactoFactores && this.impactoFactores.factorTotal > 1) {
            seccion.style.display = 'block';
            console.log('✅ Sección de impacto MOSTRADA');
            
            // Llenar datos
            const elTiempoOriginal = document.getElementById('impacto-tiempo-original');
            const elTiempoAjustado = document.getElementById('impacto-tiempo-ajustado');
            const elDiasIncremento = document.getElementById('impacto-dias-incremento');
            const elPorcentajeTiempo = document.getElementById('impacto-porcentaje-tiempo');
            const elFactorTotal = document.getElementById('impacto-factor-total');
            const elCostoTiempo = document.getElementById('impacto-costo-tiempo');
            const elCostoTotal = document.getElementById('impacto-costo-total');
            const elSemanasOriginal = document.getElementById('impacto-semanas-original');
            const elSemanasAjustado = document.getElementById('impacto-semanas-ajustado');
            const elDesglose = document.getElementById('impacto-desglose-factores');
            
            if (elTiempoOriginal) elTiempoOriginal.textContent = this.impactoFactores.tiempoOriginal + ' días';
            if (elTiempoAjustado) elTiempoAjustado.textContent = this.impactoFactores.tiempoAjustado + ' días';
            if (elDiasIncremento) elDiasIncremento.textContent = '+' + this.impactoFactores.diasIncremento + ' días';
            if (elPorcentajeTiempo) elPorcentajeTiempo.textContent = '+' + this.impactoFactores.porcentajeIncremento.toFixed(1) + '%';
            if (elFactorTotal) elFactorTotal.textContent = this.impactoFactores.factorTotal.toFixed(2) + 'x';
            if (elCostoTiempo) elCostoTiempo.textContent = calculator.formatoMoneda(this.impactoFactores.costoTiempoExtendido);
            
            if (elSemanasOriginal) {
                const semanasOrig = (this.impactoFactores.tiempoOriginal / 5).toFixed(2);
                elSemanasOriginal.textContent = semanasOrig + ' semanas';
            }
            if (elSemanasAjustado) {
                const semanasAjust = (this.impactoFactores.tiempoAjustado / 5).toFixed(2);
                elSemanasAjustado.textContent = semanasAjust + ' semanas';
            }
            
            // Desglose de factores
            if (elDesglose) {
                elDesglose.innerHTML =
                    '<div style="background:#f5f7fa;padding:10px;border-radius:8px;">' +
                    '<div style="font-size:11px;color:#666;">🏔️ Altura</div>' +
                    '<div style="font-size:14px;font-weight:700;color:#1a1a1a;">' + this.impactoFactores.factorAltura.toFixed(2) + 'x</div>' +
                    '</div>' +
                    '<div style="background:#f5f7fa;padding:10px;border-radius:8px;">' +
                    '<div style="font-size:11px;color:#666;">🌤️ Clima</div>' +
                    '<div style="font-size:14px;font-weight:700;color:#1a1a1a;">' + this.impactoFactores.factorClima.toFixed(2) + 'x</div>' +
                    '</div>' +
                    '<div style="background:#f5f7fa;padding:10px;border-radius:8px;">' +
                    '<div style="font-size:11px;color:#666;">🚪 Acceso</div>' +
                    '<div style="font-size:14px;font-weight:700;color:#1a1a1a;">' + this.impactoFactores.factorAcceso.toFixed(2) + 'x</div>' +
                    '</div>' +
                    '<div style="background:#f5f7fa;padding:10px;border-radius:8px;">' +
                    '<div style="font-size:11px;color:#666;">🔒 Seguridad</div>' +
                    '<div style="font-size:14px;font-weight:700;color:#1a1a1a;">' + this.impactoFactores.factorSeguridad.toFixed(2) + 'x</div>' +
                    '</div>';
            }
            
            // Actualizar tiempo de ejecución ajustado
            this.tiempoEjecucion.diasHabilesAjustado = this.impactoFactores.tiempoAjustado;
            this.tiempoEjecucion.semanasAjustado = (this.impactoFactores.tiempoAjustado / 5).toFixed(2);
            this.tiempoEjecucion.mesesAjustado = (this.impactoFactores.tiempoAjustado / 4.33).toFixed(2);
            
        } else {
            seccion.style.display = 'none';
            console.log('❌ Sección de impacto OCULTA (factorTotal <= 1)');
        }
    },
    
    calcularCostoTiempoExtendido: function() {
        const factorAltura = parseFloat(document.getElementById('factor-altura')?.value) || 1;
        const factorClima = parseFloat(document.getElementById('factor-clima')?.value) || 1;
        const factorAcceso = parseFloat(document.getElementById('factor-acceso')?.value) || 1;
        const factorSeguridad = parseFloat(document.getElementById('factor-seguridad')?.value) || 1;
        
        const factorTotal = factorAltura * factorClima * factorAcceso * factorSeguridad;
        
        const tiempoOriginal = this.tiempoEjecucion?.diasHabiles || 0;
        const tiempoAjustado = Math.ceil(tiempoOriginal * factorTotal);
        const diasIncremento = tiempoAjustado - tiempoOriginal;
        
        // Calcular costo indirectos diario
        const costoIndirectosDiario = this.costoIndirectosDiario || 0;
        const costoTiempoExtendido = costoIndirectosDiario * diasIncremento;
        
        // Actualizar UI del modal
        const elCostoTiempo = document.getElementById('impacto-costo-tiempo');
        if (elCostoTiempo) {
            elCostoTiempo.textContent = calculator.formatoMoneda(costoTiempoExtendido);
        }
        
        // Actualizar desglose de factores
        const elDesglose = document.getElementById('impacto-desglose-factores');
        if (elDesglose) {
            elDesglose.innerHTML =
                '<div style="background:#f5f7fa;padding:10px;border-radius:8px;">' +
                '<div style="font-size:11px;color:#666;">🏔️ Altura</div>' +
                '<div style="font-size:14px;font-weight:700;color:#1a1a1a;">' + factorAltura.toFixed(2) + 'x</div>' +
                '</div>' +
                '<div style="background:#f5f7fa;padding:10px;border-radius:8px;">' +
                '<div style="font-size:11px;color:#666;">🌤️ Clima</div>' +
                '<div style="font-size:14px;font-weight:700;color:#1a1a1a;">' + factorClima.toFixed(2) + 'x</div>' +
                '</div>' +
                '<div style="background:#f5f7fa;padding:10px;border-radius:8px;">' +
                '<div style="font-size:11px;color:#666;">🚪 Acceso</div>' +
                '<div style="font-size:14px;font-weight:700;color:#1a1a1a;">' + factorAcceso.toFixed(2) + 'x</div>' +
                '</div>' +
                '<div style="background:#f5f7fa;padding:10px;border-radius:8px;">' +
                '<div style="font-size:11px;color:#666;">🔒 Seguridad</div>' +
                '<div style="font-size:14px;font-weight:700;color:#1a1a1a;">' + factorSeguridad.toFixed(2) + 'x</div>' +
                '</div>';
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // GUARDAR COTIZACIÓN
    // ─────────────────────────────────────────────────────────────────
    guardarCotizacion: async function() {
        try {
            console.log('💾 Guardando cotización...');
            
            const limite = await window.licencia.verificarLimite();
            if (!limite.permitido) {
                this.notificacion(limite.razon, 'error');
                return;
            }
            
            const clienteId = document.getElementById('cot-cliente')?.value;
            const descripcion = document.getElementById('cot-descripcion')?.value;
            const ubicacion = document.getElementById('cot-ubicacion')?.value;
            const fechaInicio = document.getElementById('cot-fecha-inicio')?.value;
            const fechaFinSolicitada = document.getElementById('cot-fecha-fin')?.value;
            
            const indirectosOficinaPorcentaje = parseFloat(document.getElementById('cot-indirectos-oficina')?.value) || 5;
            const indirectosCampoPorcentaje = parseFloat(document.getElementById('cot-indirectos-campo')?.value) || 15;
            const financiamientoPorcentaje = parseFloat(document.getElementById('cot-financiamiento')?.value) || 0.85;
            const utilidadPorcentaje = parseFloat(document.getElementById('cot-utilidad')?.value) || 10;
            
            if (!clienteId || !descripcion) {
                this.notificacion('⚠️ Completa cliente y descripción', 'error');
                return;
            }
            
            if (this.datosCotizacion.conceptosSeleccionados.length === 0) {
                this.notificacion('⚠️ Agrega al menos un concepto', 'error');
                return;
            }
            
            this.calcularTotalConConceptos();
            
            const cotizacion = {
                clienteId: clienteId,
                descripcion: descripcion,
                ubicacion: ubicacion || '',
                fechaInicio: fechaInicio || new Date().toISOString(),
                fechaFinSolicitada: fechaFinSolicitada || null,
                conceptosCatalogo: this.datosCotizacion.conceptosSeleccionados,
                materialesAdicionales: this.datosCotizacion.materiales,
                manoObraAdicional: this.datosCotizacion.manoObra,
                equiposAdicionales: this.datosCotizacion.equipos,
                herramientaAdicional: this.datosCotizacion.herramienta,
                indirectosAdicionales: this.datosCotizacion.indirectos,
                porcentajes: {
                    indirectosOficina: indirectosOficinaPorcentaje,
                    indirectosCampo: indirectosCampoPorcentaje,
                    financiamiento: financiamientoPorcentaje,
                    utilidad: utilidadPorcentaje
                },
                factoresAjuste: this.factoresAjuste,
                tiempoEjecucion: this.tiempoEjecucion,
                fecha: new Date().toISOString(),
                estado: 'pendiente'
            };
            
            await window.db.cotizaciones.add(cotizacion);
            
            console.log('✅ Cotización guardada:', cotizacion);
            this.notificacion('✅ Cotización guardada exitosamente', 'exito');
            
            this.resetearFormulario();
            await this.cargarEstadisticas();
            this.mostrarPantalla('dashboard-screen');
            
        } catch (error) {
            console.error('❌ Error guardando cotización:', error);
            this.notificacion('❌ Error: ' + error.message, 'error');
        }
    },
    
    resetearFormulario: function() {
        this.datosCotizacion = {
            materiales: [],
            manoObra: [],
            equipos: [],
            herramienta: [],
            indirectos: [],
            conceptosSeleccionados: []
        };
        
        this.impactoFactores = {
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
        
        const ids = ['materiales-lista', 'mano-obra-lista', 'equipos-lista', 'indirectos-lista', 'conceptos-seleccionados'];
        const app = this;
        ids.forEach(function(id) {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });
        
        const seccionImpacto = document.getElementById('seccion-impacto-factores');
        if (seccionImpacto) seccionImpacto.style.display = 'none';
        
        this.inicializarFormularios();
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CLIENTES
    // ─────────────────────────────────────────────────────────────────
    cargarClientesSelect: async function() {
        try {
            if (!window.db) return;
            
            const clientes = await window.db.clientes.toArray();
            const select = document.getElementById('cot-cliente');
            if (!select) return;
            
            select.innerHTML = '<option value="">Seleccionar cliente...</option>' +
                clientes.map(function(c) { return '<option value="' + c.id + '">' + c.nombre + '</option>'; }).join('');
            
        } catch (error) {
            console.error('❌ Error cargando clientes:', error);
        }
    },
    
    verificarClientesDisponibles: async function() {
        try {
            if (!window.db) return;
            
            const clientes = await window.db.clientes.toArray();
            const select = document.getElementById('cot-cliente');
            const mensaje = document.getElementById('sin-clientes-msg');
            
            if (clientes.length === 0) {
                if (mensaje) mensaje.style.display = 'block';
                if (select) {
                    select.disabled = false;
                    select.value = '';
                }
                
                const alertaExistente = document.getElementById('alerta-sin-clientes');
                if (!alertaExistente) {
                    const alerta = document.createElement('div');
                    alerta.className = 'alert alert-warning';
                    alerta.id = 'alerta-sin-clientes';
                    alerta.innerHTML = '<strong>⚠️ No hay clientes registrados</strong><br>' +
                        '<button onclick="app.mostrarModalCliente()" ' +
                        'style="margin-top:10px;background:#2196F3;color:white;border:none;padding:8px 15px;border-radius:8px;cursor:pointer;font-weight:600;">' +
                        '➕ Agregar Cliente Ahora</button>';
                    
                    const parent = select?.parentElement;
                    if (parent) parent.insertBefore(alerta, select);
                }
            } else {
                if (mensaje) mensaje.style.display = 'none';
                if (select) select.disabled = false;
                
                const alertaExistente = document.getElementById('alerta-sin-clientes');
                if (alertaExistente) alertaExistente.remove();
            }
            
        } catch (error) {
            console.error('❌ Error verificando clientes:', error);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────
    // MODAL CLIENTE RÁPIDO
    // ─────────────────────────────────────────────────────────────────────
    mostrarModalCliente: function() {
        const modal = document.getElementById('modal-cliente');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('modal-cliente-nombre')?.focus();
        } else {
            console.error('❌ Modal de cliente no encontrado en HTML');
        }
    },
    
    cerrarModalCliente: function() {
        const modal = document.getElementById('modal-cliente');
        if (modal) {
            modal.style.display = 'none';
        }
        
        const campos = ['modal-cliente-nombre', 'modal-cliente-email', 'modal-cliente-telefono', 'modal-cliente-notas'];
        campos.forEach(function(id) {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    },
    
    guardarClienteRapido: async function() {
        try {
            const nombre = document.getElementById('modal-cliente-nombre')?.value.trim();
            
            if (!nombre) {
                this.notificacion('⚠️ El nombre del cliente es obligatorio', 'error');
                return;
            }
            
            const clienteId = await window.db.clientes.add({
                nombre: nombre,
                email: document.getElementById('modal-cliente-email')?.value.trim(),
                telefono: document.getElementById('modal-cliente-telefono')?.value.trim(),
                notas: document.getElementById('modal-cliente-notas')?.value.trim(),
                activo: true
            });
            
            await this.cargarClientesSelect();
            
            const select = document.getElementById('cot-cliente');
            if (select) select.value = clienteId;
            
            this.cerrarModalCliente();
            this.notificacion('✅ Cliente guardado y seleccionado', 'exito');
            
        } catch (error) {
            console.error('❌ Error guardando cliente:', error);
            this.notificacion('❌ Error: ' + error.message, 'error');
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CONFIGURACIÓN
    // ─────────────────────────────────────────────────────────────────
    cargarConfiguracion: async function() {
        try {
            if (!window.db) return;
            
            const config = await window.db.configuracion.toArray();
            const configObj = {};
            config.forEach(function(c) { configObj[c.clave] = c.valor; });
            
            const elIva = document.getElementById('config-iva');
            const elUtilidad = document.getElementById('config-utilidad');
            const elEmpresa = document.getElementById('config-empresa');
            
            if (elIva && configObj.iva) elIva.value = configObj.iva;
            if (elUtilidad && configObj.utilidad) elUtilidad.value = configObj.utilidad;
            if (elEmpresa && configObj.empresa) elEmpresa.value = configObj.empresa;
            
        } catch (error) {
            console.error('❌ Error cargando configuración:', error);
        }
    },
    
    guardarConfiguracion: async function() {
        try {
            const empresa = document.getElementById('config-empresa')?.value;
            const iva = parseFloat(document.getElementById('config-iva')?.value) || 16;
            const utilidad = parseFloat(document.getElementById('config-utilidad')?.value) || 15;
            
            await window.db.configuracion.bulkPut([
                { clave: 'empresa', valor: empresa },
                { clave: 'iva', valor: iva },
                { clave: 'utilidad', valor: utilidad }
            ]);
            
            this.notificacion('✅ Configuración guardada', 'exito');
            
        } catch (error) {
            console.error('❌ Error guardando configuración:', error);
            this.notificacion('❌ Error: ' + error.message, 'error');
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // EXPORTAR/IMPORTAR
    // ─────────────────────────────────────────────────────────────────
    exportarDatos: async function() {
        try {
            console.log('📤 Exportando datos...');
            
            if (!window.dbUtils) {
                throw new Error('dbUtils no está disponible');
            }
            
            await window.dbUtils.exportarTodo();
            this.notificacion('✅ Respaldo exportado exitosamente', 'exito');
            
        } catch (error) {
            console.error('❌ Error exportando:', error);
            this.notificacion('❌ Error al exportar: ' + error.message, 'error');
        }
    },
    
    importarDatos: async function(event) {
        try {
            const file = event.target.files[0];
            if (!file) return;
            
            console.log('📥 Importando datos...', file.name);
            
            const reader = new FileReader();
            const app = this;
            
            reader.onload = async function(e) {
                try {
                    if (!window.dbImportar) {
                        throw new Error('dbImportar no está disponible');
                    }
                    
                    await window.dbImportar(e.target.result);
                    app.notificacion('✅ Datos importados exitosamente', 'exito');
                    
                    setTimeout(function() {
                        window.location.reload();
                    }, 2000);
                    
                } catch (error) {
                    console.error('❌ Error importando:', error);
                    app.notificacion('❌ Error al importar: ' + error.message, 'error');
                }
            };
            
            reader.readAsText(file);
            
        } catch (error) {
            console.error('❌ Error:', error);
            this.notificacion('❌ Error: ' + error.message, 'error');
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // NOTIFICACIONES
    // ─────────────────────────────────────────────────────────────────
    notificacion: function(mensaje, tipo) {
        const colores = {
            info: '#2196F3',
            exito: '#4CAF50',
            error: '#f44336',
            advertencia: '#FF9800'
        };
        
        const div = document.createElement('div');
        div.style.cssText = 'position:fixed;top:20px;right:20px;background:' + (colores[tipo] || colores.info) + ';color:white;padding:15px 25px;border-radius:10px;box-shadow:0 4px 15px rgba(0,0,0,0.2);z-index:10000;font-weight:600;';
        div.textContent = mensaje;
        document.body.appendChild(div);
        
        setTimeout(function() {
            div.style.opacity = '0';
            setTimeout(function() { div.remove(); }, 300);
        }, 3000);
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CERRAR SESIÓN
    // ─────────────────────────────────────────────────────────────────
    cerrarSesion: function() {
        if (confirm('¿Cerrar sesión?')) {
            window.licencia.cerrar();
        }
    }
};

// ─────────────────────────────────────────────────────────────────────
// INICIAR APLICACIÓN
// ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    window.app.init();
});

console.log('✅ app.js v2.0 listo');



