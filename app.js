// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - APLICACIÓN PRINCIPAL (LIMPIO Y CORREGIDO)
// ─────────────────────────────────────────────────────────────────────

console.log('🏭 SmartCot v2.0 iniciando...');

// Crear objeto app en scope global
window.app = {
    
    // Estado de la aplicación
    estado: {
        dbLista: false,
        licenciaActiva: false,
        cotizacionActual: null
    },
    
    // Datos de la cotización actual
    datosCotizacion: {
        materiales: [],
        manoObra: [],
        equipos: [],
        herramienta: [],
        indirectos: [],
        conceptosSeleccionados: [],
        resultadosBusquedaActual: []
    },
    
    // ─────────────────────────────────────────────────────────────────
    // INICIALIZACIÓN
    // ─────────────────────────────────────────────────────────────────
    init: async function() {
        try {
            console.log('🏭 SmartCot v2.0 iniciando...');
            
            // 1. Esperar DB
            await this.esperarDB();
            this.estado.dbLista = true;
            console.log('✅ Base de datos lista');
            
            // 2. Cargar licencia
            const licencia = window.licencia.cargar();
            this.estado.licenciaActiva = licencia && !licencia.expirada;
            this.actualizarInfoLicencia(licencia);
            
            // 3. Cargar configuración
            await this.cargarConfiguracion();
            
            // 4. Cargar estadísticas
            await this.cargarEstadisticas();
            
            // 5. Cargar clientes
            await this.cargarClientesSelect();
            
            // 6. Inicializar formularios
            this.inicializarFormularios();
            
            console.log('✅ SmartCot v2.0 listo');
            this.notificacion('¡Bienvenido a SmartCot v2.0!', 'exito');
            
        } catch (error) {
            console.error('❌ Error en inicialización:', error);
            this.notificacion('Error al iniciar SmartCot', 'error');
        }
    },
    
    // Esperar a que la DB esté disponible
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
    
    // Inicializar formularios
    inicializarFormularios: function() {
        this.agregarMaterial();
        this.agregarManoObra();
        this.agregarEquipo();
        this.agregarIndirecto();
        this.calcularTotal();
    },
    
    // ─────────────────────────────────────────────────────────────────
    // NAVEGACIÓN ENTRE PANTALLAS
    // ─────────────────────────────────────────────────────────────────
    mostrarPantalla: function(id) {
        console.log('📄 Navegando a:', id);
        
        // Ocultar todas las pantallas
        document.querySelectorAll('.screen').forEach(function(s) {
            s.classList.remove('active');
            s.style.display = 'none';
        });
        
        // Mostrar pantalla seleccionada
        const pantalla = document.getElementById(id);
        if (!pantalla) {
            console.error('❌ Pantalla NO encontrada:', id);
            return;
        }
        
        pantalla.classList.add('active');
        pantalla.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Cargar datos específicos
        switch(id) {
            case 'dashboard-screen':
                this.cargarEstadisticas();
                break;
            case 'catalogos-screen':
                this.cargarCatalogoCompleto();
                break;
            case 'nueva-cotizacion-screen':
                this.verificarClientesDisponibles();
                this.actualizarConceptosSeleccionadosUI(); // ← IMPORTANTE: Mostrar conceptos
                this.calcularTotalConConceptos();
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
            
            const elMargen = document.getElementById('stat-margen');
            if (elMargen) {
                elMargen.textContent = ((stats.margenPromedio || 0).toFixed(1)) + '%';
            }
            
        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
        }
    },
    
    // Animar números
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
    // CATÁLOGO COMPLETO
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
    
    // ─────────────────────────────────────────────────────────────────
    // FILTRAR CATÁLOGO POR CATEGORÍA
    // ─────────────────────────────────────────────────────────────────
    filtrarCatalogo: async function(categoria) {
        try {
            const container = document.getElementById('lista-catalogo');
            if (!container) return;
            
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
            
            container.innerHTML = conceptos.map(function(c) {
                return '<div style="padding:15px;border:1px solid #ddd;border-radius:10px;margin-bottom:10px;background:white;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:start;">' +
                    '<div>' +
                    '<div style="font-weight:700;color:#1a1a1a;margin-bottom:5px;">' + c.codigo + '</div>' +
                    '<div style="color:#666;font-size:14px;">' + c.descripcion_corta + '</div>' +
                    '<div style="color:#999;font-size:12px;margin-top:5px;"><span style="background:#E3F2FD;padding:2px 8px;border-radius:4px;font-size:11px;">' + c.categoria + '</span> <span style="margin-left:10px;">Unidad: ' + c.unidad + '</span> <span style="margin-left:10px;">Rendimiento: ' + c.rendimiento_base + '</span></div>' +
                    '</div>' +
                    '<button onclick="app.agregarConceptoACotizacion(\'' + c.id + '\')" style="background:#4CAF50;color:white;border:none;padding:8px 15px;border-radius:8px;cursor:pointer;font-weight:600;">➕ Agregar</button>' +
                    '</div></div>';
            }).join('');
            
        } catch (error) {
            console.error('❌ Error filtrando catálogo:', error);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // BUSCAR EN CATÁLOGO
    // ─────────────────────────────────────────────────────────────────
    buscarEnCatalogo: async function() {
        try {
            const termino = document.getElementById('buscar-catalogo')?.value.trim();
            const container = document.getElementById('lista-catalogo');
            if (!container) return;
            
            if (termino.length < 2) {
                await this.filtrarCatalogo('todos');
                return;
            }
            
            const conceptos = await window.db.conceptos.filter(function(c) {
                return c.codigo.toLowerCase().includes(termino.toLowerCase()) ||
                    (c.descripcion_corta && c.descripcion_corta.toLowerCase().includes(termino.toLowerCase()));
            }).limit(50).toArray();
            
            if (conceptos.length === 0) {
                container.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">No se encontraron conceptos</div>';
                return;
            }
            
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
            console.error('❌ Error buscando en catálogo:', error);
        }
    },

    // ─────────────────────────────────────────────────────────────────────
    // MOSTRAR DETALLE DE CONCEPTOS SELECCIONADOS
    // ─────────────────────────────────────────────────────────────────────
    mostrarDetalleConceptos: async function() {
        const container = document.getElementById('conceptos-detalle-container');
        const lista = document.getElementById('conceptos-detalle-lista');
    
        if (!container || !lista) return;
    
        if (this.datosCotizacion.conceptosSeleccionados.length === 0) {
            container.style.display = 'none';
            return;
        }
    
        container.style.display = 'block';
    
        const app = this;
        lista.innerHTML = this.datosCotizacion.conceptosSeleccionados.map(function(c, index) {
            return '<div style="padding:20px;border:2px solid #ddd;border-radius:15px;margin:15px 0;background:white;">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">' +
                '<div>' +
                '<div style="font-weight:700;color:#1a1a1a;font-size:16px;">' + c.codigo + '</div>' +
                '<div style="color:#666;font-size:13px;">' + c.descripcion_corta + '</div>' +
                '</div>' +
                '<button onclick="app.eliminarConceptoDeCotizacion(' + index + ')" ' +
                'style="background:#f44336;color:white;border:none;padding:8px 15px;border-radius:8px;cursor:pointer;">🗑️ Eliminar</button>' +
                '</div>' +
            
                '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-bottom:15px;">' +
                '<div>' +
                '<label style="font-size:12px;color:#666;">Cantidad Total</label>' +
                '<input type="number" value="' + (c.cantidad || 1) + '" min="1" step="1" ' +
                'onchange="app.actualizarCantidadConcepto(' + index + ', this.value)" ' +
                'style="width:100%;padding:10px;border:2px solid #ddd;border-radius:8px;">' +
                '</div>' +
                '<div>' +
                '<label style="font-size:12px;color:#666;">Unidad</label>' +
                '<div style="padding:10px;background:#f5f7fa;border-radius:8px;font-weight:600;">' + c.unidad + '</div>' +
                '</div>' +
                '<div>' +
                '<label style="font-size:12px;color:#666;">Rendimiento Base</label>' +
                '<div style="padding:10px;background:#f5f7fa;border-radius:8px;font-weight:600;">' + c.rendimiento_base + ' ' + c.unidad + '/jornada</div>' +
                '</div>' +
                '<div>' +
                '<label style="font-size:12px;color:#666;">Costo Unitario</label>' +
                '<div style="padding:10px;background:#E8F5E9;border-radius:8px;font-weight:700;color:#2E7D32;">' + calculator.formatoMoneda(c.costos_base?.costo_directo_total || 0) + '</div>' +
                '</div>' +
                '</div>' +
            
                '<div style="background:#f5f7fa;padding:15px;border-radius:10px;">' +
                '<div style="font-weight:600;color:#1a1a1a;margin-bottom:10px;">📦 Materiales</div>' +
                (c.recursos?.materiales || []).map(function(m) {
                    return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ddd;">' +
                        '<span style="color:#666;font-size:13px;">' + m.nombre + '</span>' +
                        '<span style="font-weight:600;">' + m.cantidad + ' ' + m.unidad + ' × ' + calculator.formatoMoneda(m.precio_unitario) + ' = ' + calculator.formatoMoneda(m.importe) + '</span>' +
                        '</div>';
                }).join('') +
                '</div>' +
            
                '<div style="background:#f5f7fa;padding:15px;border-radius:10px;margin-top:10px;">' +
                '<div style="font-weight:600;color:#1a1a1a;margin-bottom:10px;">👷 Mano de Obra</div>' +
                (c.recursos?.mano_obra || []).map(function(mo) {
                    return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ddd;">' +
                        '<span style="color:#666;font-size:13px;">' + mo.puesto + '</span>' +
                        '<span style="font-weight:600;">' + mo.horas_jornada + ' hrs × ' + calculator.formatoMoneda(mo.salario_hora) + ' = ' + calculator.formatoMoneda(mo.importe) + '</span>' +
                        '</div>';
                }).join('') +
                '</div>' +
            
                '</div>';
        }).join('');
    },

    // ─────────────────────────────────────────────────────────────────────
    // ACTUALIZAR CANTIDAD DE CONCEPTO
    // ─────────────────────────────────────────────────────────────────────
    actualizarCantidadConcepto: function(index, cantidad) {
        if (this.datosCotizacion.conceptosSeleccionados[index]) {
            this.datosCotizacion.conceptosSeleccionados[index].cantidad = parseFloat(cantidad) || 1;
            this.calcularTotalConConceptos();
            this.mostrarDetalleConceptos();
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // AGREGAR CONCEPTO A COTIZACIÓN
    // ─────────────────────────────────────────────────────────────────
    agregarConceptoACotizacion: async function(conceptoId) {
        try {
            console.log('📋 Agregando concepto:', conceptoId);
        
            const concepto = await window.db.conceptos.get(conceptoId);
        
            if (!concepto) {
                this.notificacion('Concepto no encontrado', 'error');
                return;
            }
        
            // Verificar si ya está agregado
            const existe = this.datosCotizacion.conceptosSeleccionados.find(function(c) { 
                return c.id === conceptoId; 
            });
        
            if (existe) {
                this.notificacion('⚠️ Este concepto ya está en la cotización', 'advertencia');
                return;
            }
        
            // Agregar con cantidad por defecto
            concepto.cantidad = 1;
            this.datosCotizacion.conceptosSeleccionados.push(concepto);
        
            console.log('✅ Concepto agregado:', concepto.codigo);
            console.log('📊 Total conceptos:', this.datosCotizacion.conceptosSeleccionados.length);
        
            // Actualizar UI en TODAS las pantallas
            this.actualizarConceptosSeleccionadosUI();
        
            this.notificacion('✅ Concepto ' + concepto.codigo + ' agregado (' + this.datosCotizacion.conceptosSeleccionados.length + ' total)', 'exito');
        
        } catch (error) {
            console.error('❌ Error agregando concepto:', error);
            this.notificacion('Error al agregar concepto: ' + error.message, 'error');
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────
    // ACTUALIZAR UI DE CONCEPTOS SELECCIONADOS (CORREGIDO)
    // ─────────────────────────────────────────────────────────────────────
    actualizarConceptosSeleccionadosUI: function() {
        const container = document.getElementById('conceptos-seleccionados');
        const countLabel = document.getElementById('conceptos-count');
    
        if (!container) {
            console.warn('⚠️ Container conceptos-seleccionados no encontrado');
            return;
        }
    
        // Actualizar contador
        if (countLabel) {
            countLabel.textContent = this.datosCotizacion.conceptosSeleccionados.length;
        }
    
        if (this.datosCotizacion.conceptosSeleccionados.length === 0) {
            container.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">' +
                '<div style="font-size:48px;margin-bottom:10px;">📭</div>' +
                '<div>No hay conceptos seleccionados</div>' +
                '<div style="font-size:13px;margin-top:5px;">Ve a Catálogos y agrega conceptos para comenzar</div>' +
                '</div>';
            return;
        }
    
        const app = this;
        container.innerHTML = this.datosCotizacion.conceptosSeleccionados.map(function(c, index) {
            const subtotal = (c.costos_base?.costo_directo_total || 0) * (c.cantidad || 1);
        
            // Obtener desglose de recursos
            const materiales = c.recursos?.materiales || [];
            const manoObra = c.recursos?.mano_obra || [];
            const equipos = c.recursos?.equipos || [];
            const herramienta = c.recursos?.herramienta || [];
        
            return '<div style="padding:20px;border:2px solid #ddd;border-radius:15px;margin:15px 0;background:white;">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">' +
                '<div style="flex:1;">' +
                '<div style="font-weight:700;color:#1a1a1a;font-size:16px;">' + c.codigo + '</div>' +
                '<div style="color:#666;font-size:13px;margin-top:5px;">' + (c.descripcion_corta || '').substring(0, 80) + '...</div>' +
                '<div style="color:#999;font-size:12px;margin-top:5px;">Unidad: ' + c.unidad + ' | Rendimiento: ' + c.rendimiento_base + '</div>' +
                '</div>' +
                '<button onclick="app.eliminarConceptoDeCotizacion(' + index + ')" ' +
                'style="background:#f44336;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;">🗑️ Eliminar</button>' +
                '</div>' +
            
                '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px;margin-bottom:15px;">' +
                '<div>' +
                '<label style="font-size:12px;color:#666;">Cantidad Total</label>' +
                '<input type="number" value="' + (c.cantidad || 1) + '" min="1" step="1" ' +
                'onchange="app.actualizarCantidadConcepto(' + index + ', this.value)" ' +
                'style="width:100%;padding:10px;border:2px solid #ddd;border-radius:8px;font-weight:600;">' +
                '</div>' +
                '<div>' +
                '<label style="font-size:12px;color:#666;">Unidad</label>' +
                '<div style="padding:10px;background:#f5f7fa;border-radius:8px;font-weight:600;">' + c.unidad + '</div>' +
                '</div>' +
                '<div>' +
                '<label style="font-size:12px;color:#666;">Costo Unitario</label>' +
                '<div style="padding:10px;background:#E8F5E9;border-radius:8px;font-weight:700;color:#2E7D32;">' + calculator.formatoMoneda(c.costos_base?.costo_directo_total || 0) + '</div>' +
                '</div>' +
                '<div>' +
                '<label style="font-size:12px;color:#666;">Subtotal</label>' +
                '<div style="padding:10px;background:#1a1a1a;color:white;border-radius:8px;font-weight:700;">' + calculator.formatoMoneda(subtotal) + '</div>' +
                '</div>' +
                '</div>' +
            
                '<div style="background:#f5f7fa;padding:15px;border-radius:10px;margin-top:15px;">' +
                '<div style="font-weight:600;color:#1a1a1a;margin-bottom:10px;border-bottom:2px solid #ddd;padding-bottom:5px;">📦 Materiales (' + materiales.length + ')</div>' +
                (materiales.length > 0 ? materiales.map(function(m) {
                    return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ddd;font-size:13px;">' +
                        '<span style="color:#666;">' + (m.nombre || m.material_codigo || 'Sin nombre') + '</span>' +
                        '<span style="font-weight:600;">' + m.cantidad + ' ' + m.unidad + ' × ' + calculator.formatoMoneda(m.precio_unitario || 0) + ' = <span style="color:#1a1a1a;">' + calculator.formatoMoneda(m.importe || 0) + '</span></span>' +
                        '</div>';
                }).join('') : '<div style="color:#999;padding:10px;text-align:center;">Sin materiales</div>') +
                '</div>' +
            
                '<div style="background:#f5f7fa;padding:15px;border-radius:10px;margin-top:10px;">' +
                '<div style="font-weight:600;color:#1a1a1a;margin-bottom:10px;border-bottom:2px solid #ddd;padding-bottom:5px;">👷 Mano de Obra (' + manoObra.length + ')</div>' +
                (manoObra.length > 0 ? manoObra.map(function(mo) {
                    return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ddd;font-size:13px;">' +
                        '<span style="color:#666;">' + (mo.puesto || mo.mano_obra_codigo || 'Sin nombre') + '</span>' +
                        '<span style="font-weight:600;">' + mo.horas_jornada + ' hrs × ' + calculator.formatoMoneda(mo.salario_hora || 0) + ' = <span style="color:#1a1a1a;">' + calculator.formatoMoneda(mo.importe || 0) + '</span></span>' +
                        '</div>';
                }).join('') : '<div style="color:#999;padding:10px;text-align:center;">Sin mano de obra</div>') +
                '</div>' +
            
                '<div style="background:#f5f7fa;padding:15px;border-radius:10px;margin-top:10px;">' +
                '<div style="font-weight:600;color:#1a1a1a;margin-bottom:10px;border-bottom:2px solid #ddd;padding-bottom:5px;">🏗️ Equipos (' + equipos.length + ')</div>' +
                (equipos.length > 0 ? equipos.map(function(eq) {
                    return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ddd;font-size:13px;">' +
                        '<span style="color:#666;">' + (eq.nombre || eq.equipo_codigo || 'Sin nombre') + '</span>' +
                        '<span style="font-weight:600;">' + eq.horas + ' hrs × ' + calculator.formatoMoneda(eq.costo_unitario || 0) + ' = <span style="color:#1a1a1a;">' + calculator.formatoMoneda(eq.importe || 0) + '</span></span>' +
                        '</div>';
                }).join('') : '<div style="color:#999;padding:10px;text-align:center;">Sin equipos</div>') +
                '</div>' +
            
                '<div style="background:#f5f7fa;padding:15px;border-radius:10px;margin-top:10px;">' +
                '<div style="font-weight:600;color:#1a1a1a;margin-bottom:10px;border-bottom:2px solid #ddd;padding-bottom:5px;">🔧 Herramienta (' + herramienta.length + ')</div>' +
                (herramienta.length > 0 ? herramienta.map(function(h) {
                    return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ddd;font-size:13px;">' +
                        '<span style="color:#666;">' + (h.nombre || h.herramienta_codigo || 'Sin nombre') + '</span>' +
                        '<span style="font-weight:600;">' + h.porcentaje + '% = <span style="color:#1a1a1a;">' + calculator.formatoMoneda(h.importe || 0) + '</span></span>' +
                        '</div>';
                }).join('') : '<div style="color:#999;padding:10px;text-align:center;">Sin herramienta</div>') +
                '</div>' +
            
                '</div>';
        }).join('');
    
        // Recalcular totales
        this.calcularTotalConConceptos();
    },

    // ─────────────────────────────────────────────────────────────────────
    // GUARDAR COTIZACIÓN (CORREGIDO - FUNCIÓN COMPLETA)
    // ─────────────────────────────────────────────────────────────────────
    guardarCotizacion: async function() {
        try {
            console.log('💾 Guardando cotización...');
        
            // Verificar licencia
            const limite = await window.licencia.verificarLimite();
            if (!limite.permitido) {
                this.notificacion(limite.razon, 'error');
                return;
            }
        
            // Validar datos
            const clienteId = document.getElementById('cot-cliente') ? document.getElementById('cot-cliente').value : '';
            const descripcion = document.getElementById('cot-descripcion') ? document.getElementById('cot-descripcion').value : '';
            const ubicacion = document.getElementById('cot-ubicacion') ? document.getElementById('cot-ubicacion').value : '';
            const utilidadPorcentaje = parseFloat(document.getElementById('cot-utilidad') ? document.getElementById('cot-utilidad').value : '15') || 15;
        
            if (!clienteId || !descripcion) {
                this.notificacion('⚠️ Completa cliente y descripción', 'error');
                return;
            }
        
            // Verificar que haya conceptos
            if (this.datosCotizacion.conceptosSeleccionados.length === 0) {
                this.notificacion('⚠️ Agrega al menos un concepto', 'error');
                return;
            }
        
            // Calcular totales
            const resultado = calculator.calcularCotizacion({
                materiales: this.datosCotizacion.materiales,
                manoObra: this.datosCotizacion.manoObra,
                indirectos: this.datosCotizacion.indirectos,
                utilidadPorcentaje: utilidadPorcentaje,
                ivaPorcentaje: 16
            });
        
            // Crear cotización
            const cotizacion = {
                clienteId: clienteId,
                descripcion: descripcion,
                ubicacion: ubicacion || '',
                materiales: this.datosCotizacion.materiales,
                manoObra: this.datosCotizacion.manoObra,
                indirectos: this.datosCotizacion.indirectos,
                conceptos: this.datosCotizacion.conceptosSeleccionados,
                utilidadPorcentaje: utilidadPorcentaje,
                subtotal: resultado.subtotal,
                indirectosTotal: resultado.indirectosTotal,
                utilidad: resultado.utilidad,
                iva: resultado.iva,
                totalFinal: resultado.totalFinal,
                fecha: new Date().toISOString(),
                estado: 'pendiente'
            };
        
            // Guardar en DB
            await window.db.cotizaciones.add(cotizacion);
        
            this.notificacion('✅ Cotización guardada exitosamente', 'exito');
        
            // Resetear formulario
            this.resetearFormulario();
        
            // Actualizar estadísticas
            await this.cargarEstadisticas();
        
            // Ir al dashboard
            this.mostrarPantalla('dashboard-screen');
        
        } catch (error) {
            console.error('❌ Error guardando cotización:', error);
            this.notificacion('❌ Error: ' + error.message, 'error');
        }
    },

    // ─────────────────────────────────────────────────────────────────────
    // RESETEAR FORMULARIO
    // ─────────────────────────────────────────────────────────────────────
    resetearFormulario: function() {
        this.datosCotizacion = {
            materiales: [],
            manoObra: [],
            equipos: [],
            herramienta: [],
            indirectos: [],
            conceptosSeleccionados: []
        };
    
        const ids = ['materiales-lista', 'mano-obra-lista', 'equipos-lista', 'indirectos-lista', 'conceptos-seleccionados'];
        ids.forEach(function(id) {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });
    
        this.inicializarFormularios();
    },

    // ─────────────────────────────────────────────────────────────────────
    // ACTUALIZAR CANTIDAD DE CONCEPTO
    // ─────────────────────────────────────────────────────────────────────
    actualizarCantidadConcepto: function(index, cantidad) {
        if (this.datosCotizacion.conceptosSeleccionados[index]) {
            this.datosCotizacion.conceptosSeleccionados[index].cantidad = parseFloat(cantidad) || 1;
            this.calcularTotalConConceptos();
            this.actualizarConceptosSeleccionadosUI();
        }
    },

    // ─────────────────────────────────────────────────────────────────────
    // ELIMINAR CONCEPTO DE COTIZACIÓN
    // ─────────────────────────────────────────────────────────────────────
    eliminarConceptoDeCotizacion: function(index) {
        this.datosCotizacion.conceptosSeleccionados.splice(index, 1);
        this.calcularTotalConConceptos();
        this.actualizarConceptosSeleccionadosUI();
        this.notificacion('Concepto eliminado', 'advertencia');
    },

    // ─────────────────────────────────────────────────────────────────────
    // CALCULAR TOTAL CON CONCEPTOS
    // ─────────────────────────────────────────────────────────────────────
    calcularTotalConConceptos: function() {
        let subtotal = 0;
    
        this.datosCotizacion.conceptosSeleccionados.forEach(function(c) {
            subtotal += (c.costos_base?.costo_directo_total || 0) * (c.cantidad || 1);
        });
    
        subtotal += this.datosCotizacion.materiales.reduce(function(sum, m) { return sum + (m.cantidad * m.precioUnitario); }, 0);
        subtotal += this.datosCotizacion.manoObra.reduce(function(sum, m) { return sum + (m.horas * m.precioHora); }, 0);
        subtotal += this.datosCotizacion.equipos.reduce(function(sum, e) { return sum + (e.horas * e.costoUnitario); }, 0);
    
        const indirectos = this.datosCotizacion.indirectos.reduce(function(sum, i) { return sum + i.monto; }, 0);
        const utilidadPorcentaje = parseFloat(document.getElementById('cot-utilidad') ? document.getElementById('cot-utilidad').value : '15') || 15;
        const utilidad = (subtotal + indirectos) * (utilidadPorcentaje / 100);
        const iva = (subtotal + indirectos + utilidad) * 0.16;
        const total = subtotal + indirectos + utilidad + iva;
    
        const elementos = {
            'resumen-subtotal': subtotal,
            'resumen-indirectos': indirectos,
            'resumen-utilidad': utilidad,
            'resumen-iva': iva,
            'resumen-total': total
        };
    
        const app = this;
        Object.entries(elementos).forEach(function(par) {
            const el = document.getElementById(par[0]);
            if (el) el.textContent = calculator.formatoMoneda(par[1]);
        });
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
        this.datosCotizacion.manoObra.push({ id: id, concepto: '', horas: 1, precioHora: 0 });
        
        const div = document.createElement('div');
        div.className = 'mano-obra-item';
        div.dataset.id = id;
        div.innerHTML = '<div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px;margin:10px 0;">' +
            '<input type="text" placeholder="Concepto" onchange="app.actualizarManoObra(' + id + ', \'concepto\', this.value)" style="padding:10px;border:1px solid #ddd;border-radius:8px;">' +
            '<input type="number" placeholder="Horas" value="1" min="1" onchange="app.actualizarManoObra(' + id + ', \'horas\', this.value)" style="padding:10px;border:1px solid #ddd;border-radius:8px;">' +
            '<input type="number" placeholder="$ Hora" value="0" min="0" step="0.01" onchange="app.actualizarManoObra(' + id + ', \'precioHora\', this.value)" style="padding:10px;border:1px solid #ddd;border-radius:8px;">' +
            '<button onclick="app.eliminarManoObra(' + id + ')" style="background:#f44336;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;">🗑️</button>' +
            '</div>';
        container.appendChild(div);
        this.calcularTotal();
    },
    
    actualizarManoObra: function(id, campo, valor) {
        const mo = this.datosCotizacion.manoObra.find(function(m) { return m.id === id; });
        if (mo) {
            mo[campo] = campo === 'concepto' ? valor : (parseFloat(valor) || 0);
        }
        this.calcularTotal();
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
        const utilidadPorcentaje = parseFloat(document.getElementById('cot-utilidad')?.value) || 15;
        const ivaPorcentaje = 16;
        
        const resultado = calculator.calcularCotizacion({
            materiales: this.datosCotizacion.materiales,
            manoObra: this.datosCotizacion.manoObra,
            indirectos: this.datosCotizacion.indirectos,
            utilidadPorcentaje: utilidadPorcentaje,
            ivaPorcentaje: ivaPorcentaje
        });
        
        const elementos = {
            'resumen-subtotal': resultado.subtotal,
            'resumen-indirectos': resultado.indirectosTotal,
            'resumen-utilidad': resultado.utilidad,
            'resumen-iva': resultado.iva,
            'resumen-total': resultado.totalFinal
        };
        
        const app = this;
        Object.entries(elementos).forEach(function(par) {
            const el = document.getElementById(par[0]);
            if (el) el.textContent = calculator.formatoMoneda(par[1]);
        });
        
        const lblUtilidad = document.getElementById('lbl-utilidad');
        const lblIva = document.getElementById('lbl-iva');
        if (lblUtilidad) lblUtilidad.textContent = utilidadPorcentaje;
        if (lblIva) lblIva.textContent = ivaPorcentaje;
        
        this.verificarSmartMargin(resultado);
    },
    
    calcularTotalConConceptos: function() {
        let subtotal = 0;
        
        this.datosCotizacion.conceptosSeleccionados.forEach(function(c) {
            subtotal += (c.costos_base?.costo_directo_total || 0) * c.cantidad;
        });
        
        subtotal += this.datosCotizacion.materiales.reduce(function(sum, m) { return sum + (m.cantidad * m.precioUnitario); }, 0);
        subtotal += this.datosCotizacion.manoObra.reduce(function(sum, m) { return sum + (m.horas * m.precioHora); }, 0);
        subtotal += this.datosCotizacion.equipos.reduce(function(sum, e) { return sum + (e.horas * e.costoUnitario); }, 0);
        
        const indirectos = this.datosCotizacion.indirectos.reduce(function(sum, i) { return sum + i.monto; }, 0);
        const utilidadPorcentaje = parseFloat(document.getElementById('cot-utilidad')?.value) || 15;
        const utilidad = (subtotal + indirectos) * (utilidadPorcentaje / 100);
        const iva = (subtotal + indirectos + utilidad) * 0.16;
        const total = subtotal + indirectos + utilidad + iva;
        
        const elementos = {
            'resumen-subtotal': subtotal,
            'resumen-indirectos': indirectos,
            'resumen-utilidad': utilidad,
            'resumen-iva': iva,
            'resumen-total': total
        };
        
        const app = this;
        Object.entries(elementos).forEach(function(par) {
            const el = document.getElementById(par[0]);
            if (el) el.textContent = calculator.formatoMoneda(par[1]);
        });
    },
    
    verificarSmartMargin: function(resultado) {
        const warning = document.getElementById('smartmargin-warning');
        if (!warning) return;
        
        const alertas = [];
        if (resultado.margenReal < 15) alertas.push('⚠️ Utilidad menor al 15% recomendado.');
        if (resultado.indirectosTotal === 0) alertas.push('⚠️ No se incluyeron costos indirectos.');
        
        if (alertas.length > 0) {
            warning.style.display = 'block';
            warning.innerHTML = '<strong>⚠️ SmartMargin Alertas:</strong><br>' + alertas.join('<br>');
        } else {
            warning.style.display = 'none';
        }
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
    
    guardarCliente: async function() {
        try {
            const nombre = document.getElementById('cliente-nombre')?.value.trim();
            const email = document.getElementById('cliente-email')?.value.trim();
            const telefono = document.getElementById('cliente-telefono')?.value.trim();
            const notas = document.getElementById('cliente-notas')?.value.trim();
            
            if (!nombre) {
                this.notificacion('⚠️ Nombre requerido', 'error');
                return;
            }
            
            await window.db.clientes.add({ nombre: nombre, email: email, telefono: telefono, notas: notas, activo: true });
            
            this.notificacion('✅ Cliente guardado', 'exito');
            
            document.getElementById('cliente-nombre').value = '';
            document.getElementById('cliente-email').value = '';
            document.getElementById('cliente-telefono').value = '';
            document.getElementById('cliente-notas').value = '';
            
            await this.cargarClientesSelect();
            
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
// INICIAR APLICACIÓN CUANDO DOM ESTÉ LISTO
// ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    window.app.init();
});

console.log('✅ app.js v2.0 listo');




