// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - APLICACIÓN PRINCIPAL (COMPLETA Y MEJORADA)
// Integración con motores: indirectos, equipos, unidades, APU
// ─────────────────────────────────────────────────────────────────────

console.log('🏭 SmartCot v2.0 iniciado');

const app = {
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
        conceptosSeleccionados: []
    },
    
    // ─────────────────────────────────────────────────────────────────
    // INICIALIZACIÓN
    // ─────────────────────────────────────────────────────────────────
    init: async function() {
        console.log('🏭 SmartCot v2.0 iniciando...');
        
        try {
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
            
            // 7. Configurar event listeners
            this.configurarEventListeners();
            
            console.log('✅ SmartCot v2.0 listo');
            
            // Notificación de bienvenida
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
            await new Promise(resolve => setTimeout(resolve, 100));
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
    
    // Configurar event listeners globales
    configurarEventListeners: function() {
        // Tecla Escape para cerrar modales
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cerrarModalCliente();
            }
        });
        
        // Auto-guardado cada 5 minutos
        setInterval(() => {
            if (this.datosCotizacion.conceptosSeleccionados.length > 0) {
                console.log('💾 Auto-guardado...');
            }
        }, 300000);
    },
    
    // ─────────────────────────────────────────────────────────────────
    // NAVEGACIÓN ENTRE PANTALLAS 
    // ─────────────────────────────────────────────────────────────────
    mostrarPantalla: function(id) {
        // Ocultar todas las pantallas
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            s.style.display = 'none';
            console.log('Ocultando:', s.id);
        });
        
        // Mostrar pantalla seleccionada
        const pantalla = document.getElementById(id);
        if (pantalla) {
            console.error('❌ Pantalla no encontrada:', id);
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
            case 'importar-screen':
                console.log('Pantalla de importar lista');
                break;
        }
        
        console.log('📄 Pantalla:', id);
    },
    
    // ─────────────────────────────────────────────────────────────────
    // LICENCIA
    // ─────────────────────────────────────────────────────────────────
    actualizarInfoLicencia: function(licencia) {
        const info = document.getElementById('license-info');
        if (!info) return;
        
        if (licencia && !licencia.expirada) {
            info.textContent = `✅ ${licencia.tipo} - Exp: ${new Date(licencia.expiracion).toLocaleDateString('es-MX')}`;
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
            
            // Actualizar UI con animación
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
        const intervalo = setInterval(() => {
            pasoActual++;
            const valorActual = Math.round(valorFinal - (incremento * (pasos - pasoActual)));
            element.textContent = valorActual;
            
            if (pasoActual >= pasos) {
                clearInterval(intervalo);
                element.textContent = valorFinal;
            }
        }, duracion / pasos);
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CATÁLOGO DE CONCEPTOS
    // ─────────────────────────────────────────────────────────────────
    cargarCatalogoBusqueda: async function() {
        const buscador = document.getElementById('buscar-concepto');
        if (!buscador) return;
        
        buscador.addEventListener('input', async (e) => {
            const termino = e.target.value.trim();
            
            if (termino.length < 2) {
                document.getElementById('resultados-busqueda').innerHTML = '';
                return;
            }
            
            try {
                const resultados = await window.conceptosService.buscar(termino);
                this.mostrarResultadosBusqueda(resultados);
            } catch (error) {
                console.error('❌ Error buscando conceptos:', error);
            }
        });
    },
    
    mostrarResultadosBusqueda: function(resultados) {
        const container = document.getElementById('resultados-busqueda');
        if (!container) return;
        
        if (resultados.length === 0) {
            container.innerHTML = '<div style="padding:20px;text-align:center;color:#999;">No se encontraron conceptos</div>';
            return;
        }
        
        container.innerHTML = resultados.slice(0, 10).map(c => `
            <div style="padding:15px;border:1px solid #ddd;border-radius:10px;margin:10px 0;background:white;cursor:pointer;transition:all 0.3s;" 
                 onmouseover="this.style.background='#f5f7fa'" 
                 onmouseout="this.style.background='white'"
                 onclick="app.agregarConceptoACotizacion('${c.id}')">
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <div style="flex:1;">
                        <div style="font-weight:700;color:#1a1a1a;margin-bottom:5px;">${c.codigo}</div>
                        <div style="color:#666;font-size:14px;margin-bottom:5px;">${c.descripcion_corta}</div>
                        <div style="color:#999;font-size:12px;">Unidad: ${c.unidad} | Rendimiento: ${c.rendimiento_base}</div>
                    </div>
                    <button style="background:#4CAF50;color:white;border:none;padding:8px 15px;border-radius:8px;cursor:pointer;font-weight:600;">➕ Agregar</button>
                </div>
            </div>
        `).join('');
    },
    
    agregarConceptoACotizacion: async function(conceptoId) {
        try {
            const concepto = await window.conceptosService.obtenerCompleto(conceptoId);
            
            if (!concepto) {
                this.notificacion('Concepto no encontrado', 'error');
                return;
            }
            
            // Verificar si ya está agregado
            const existe = this.datosCotizacion.conceptosSeleccionados.find(c => c.id === conceptoId);
            if (existe) {
                this.notificacion('Este concepto ya está en la cotización', 'advertencia');
                return;
            }
            
            // Agregar con cantidad por defecto
            concepto.cantidad = 1;
            this.datosCotizacion.conceptosSeleccionados.push(concepto);
            
            // Recalcular totales
            this.calcularTotalConConceptos();
            
            // Actualizar UI
            this.actualizarConceptosSeleccionadosUI();
            
            this.notificacion(`✅ Concepto ${concepto.codigo} agregado`, 'exito');
            
        } catch (error) {
            console.error('❌ Error agregando concepto:', error);
            this.notificacion('Error al agregar concepto', 'error');
        }
    },
    
    actualizarConceptosSeleccionadosUI: function() {
        const container = document.getElementById('conceptos-seleccionados');
        if (!container) return;
        
        if (this.datosCotizacion.conceptosSeleccionados.length === 0) {
            container.innerHTML = '<div style="padding:20px;text-align:center;color:#999;">No hay conceptos seleccionados</div>';
            return;
        }
        
        container.innerHTML = this.datosCotizacion.conceptosSeleccionados.map((c, index) => `
            <div style="padding:15px;border:1px solid #ddd;border-radius:10px;margin:10px 0;background:white;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <div>
                        <div style="font-weight:700;color:#1a1a1a;">${c.codigo}</div>
                        <div style="color:#666;font-size:13px;">${c.descripcion_corta.substring(0, 50)}...</div>
                    </div>
                    <button onclick="app.eliminarConceptoDeCotizacion(${index})" 
                            style="background:#f44336;color:white;border:none;padding:8px 15px;border-radius:8px;cursor:pointer;">🗑️</button>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div>
                        <label style="font-size:12px;color:#666;">Cantidad</label>
                        <input type="number" value="${c.cantidad}" min="1" step="1" 
                               onchange="app.actualizarCantidadConcepto(${index}, this.value)"
                               style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                    </div>
                    <div>
                        <label style="font-size:12px;color:#666;">Subtotal</label>
                        <div style="font-weight:700;color:#1a1a1a;">${calculator.formatoMoneda(c.costos_base?.costo_directo_total * c.cantidad)}</div>
                    </div>
                </div>
            </div>
        `).join('');
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
    
    // ─────────────────────────────────────────────────────────────────────
    // CATÁLOGO COMPLETO (CORREGIDO - SIN conceptosService)
    // ─────────────────────────────────────────────────────────────────────
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
        
            // Obtener conceptos directamente de DB
            const conceptos = await window.db.conceptos.limit(50).toArray();
        
            if (conceptos.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📭</div>
                        <h3>Sin conceptos</h3>
                        <p>Importa conceptos desde Excel para comenzar</p>
                        <button onclick="app.mostrarPantalla('importar-screen')" 
                                style="margin-top:15px;background:#2196F3;color:white;border:none;padding:12px 25px;border-radius:10px;cursor:pointer;font-weight:600;">📥 Importar Ahora</button>
                    </div>
                `;
                return;
            }
        
            container.innerHTML = conceptos.map(c => `
                <div style="padding:15px;border:1px solid #ddd;border-radius:10px;margin-bottom:10px;background:white;">
                    <div style="display:flex;justify-content:space-between;align-items:start;">
                        <div>
                            <div style="font-weight:700;color:#1a1a1a;margin-bottom:5px;">${c.codigo}</div>
                            <div style="color:#666;font-size:14px;">${c.descripcion_corta}</div>
                            <div style="color:#999;font-size:12px;margin-top:5px;">Unidad: ${c.unidad} | Rendimiento: ${c.rendimiento_base}</div>
                        </div>
                        <button onclick="console.log('Agregar concepto:', c.codigo)" 
                                style="background:#4CAF50;color:white;border:none;padding:8px 15px;border-radius:8px;cursor:pointer;font-weight:600;">➕ Agregar</button>
                    </div>
                </div>
            `).join('');
        
        } catch (error) {
            console.error('❌ Error cargando catálogo:', error);
            const container = document.getElementById('lista-catalogo');
            if (container) {
                container.innerHTML = '<div style="padding:20px;text-align:center;color:#f44336;">Error cargando catálogo: ' + error.message + '</div>';
            }
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // MATERIALES
    // ─────────────────────────────────────────────────────────────────
    agregarMaterial: function() {
        const container = document.getElementById('materiales-lista');
        if (!container) return;
        
        const id = Date.now();
        this.datosCotizacion.materiales.push({ id, nombre: '', cantidad: 1, precioUnitario: 0 });
        
        const div = document.createElement('div');
        div.className = 'material-item';
        div.dataset.id = id;
        div.innerHTML = `
            <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px;margin:10px 0;">
                <input type="text" placeholder="Material" 
                       onchange="app.actualizarMaterial(${id}, 'nombre', this.value)"
                       style="padding:10px;border:1px solid #ddd;border-radius:8px;">
                <input type="number" placeholder="Cant." value="1" min="1" 
                       onchange="app.actualizarMaterial(${id}, 'cantidad', this.value)"
                       style="padding:10px;border:1px solid #ddd;border-radius:8px;">
                <input type="number" placeholder="Precio" value="0" min="0" step="0.01" 
                       onchange="app.actualizarMaterial(${id}, 'precioUnitario', this.value)"
                       style="padding:10px;border:1px solid #ddd;border-radius:8px;">
                <button onclick="app.eliminarMaterial(${id})" 
                        style="background:#f44336;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;">🗑️</button>
            </div>
        `;
        container.appendChild(div);
        this.calcularTotal();
    },
    
    actualizarMaterial: function(id, campo, valor) {
        const material = this.datosCotizacion.materiales.find(m => m.id === id);
        if (material) {
            material[campo] = campo === 'nombre' ? valor : parseFloat(valor) || 0;
        }
        this.calcularTotal();
    },
    
    eliminarMaterial: function(id) {
        this.datosCotizacion.materiales = this.datosCotizacion.materiales.filter(m => m.id !== id);
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
        this.datosCotizacion.manoObra.push({ id, concepto: '', horas: 1, precioHora: 0 });
        
        const div = document.createElement('div');
        div.className = 'mano-obra-item';
        div.dataset.id = id;
        div.innerHTML = `
            <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px;margin:10px 0;">
                <input type="text" placeholder="Concepto" 
                       onchange="app.actualizarManoObra(${id}, 'concepto', this.value)"
                       style="padding:10px;border:1px solid #ddd;border-radius:8px;">
                <input type="number" placeholder="Horas" value="1" min="1" 
                       onchange="app.actualizarManoObra(${id}, 'horas', this.value)"
                       style="padding:10px;border:1px solid #ddd;border-radius:8px;">
                <input type="number" placeholder="$ Hora" value="0" min="0" step="0.01" 
                       onchange="app.actualizarManoObra(${id}, 'precioHora', this.value)"
                       style="padding:10px;border:1px solid #ddd;border-radius:8px;">
                <button onclick="app.eliminarManoObra(${id})" 
                        style="background:#f44336;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;">🗑️</button>
            </div>
        `;
        container.appendChild(div);
        this.calcularTotal();
    },
    
    actualizarManoObra: function(id, campo, valor) {
        const mo = this.datosCotizacion.manoObra.find(m => m.id === id);
        if (mo) {
            mo[campo] = campo === 'concepto' ? valor : parseFloat(valor) || 0;
        }
        this.calcularTotal();
    },
    
    eliminarManoObra: function(id) {
        this.datosCotizacion.manoObra = this.datosCotizacion.manoObra.filter(m => m.id !== id);
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
        this.datosCotizacion.equipos.push({ id, nombre: '', horas: 1, costoUnitario: 0 });
        
        const div = document.createElement('div');
        div.className = 'equipo-item';
        div.dataset.id = id;
        div.innerHTML = `
            <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px;margin:10px 0;">
                <input type="text" placeholder="Equipo" 
                       onchange="app.actualizarEquipo(${id}, 'nombre', this.value)"
                       style="padding:10px;border:1px solid #ddd;border-radius:8px;">
                <input type="number" placeholder="Horas" value="1" min="1" 
                       onchange="app.actualizarEquipo(${id}, 'horas', this.value)"
                       style="padding:10px;border:1px solid #ddd;border-radius:8px;">
                <input type="number" placeholder="$ Unit" value="0" min="0" step="0.01" 
                       onchange="app.actualizarEquipo(${id}, 'costoUnitario', this.value)"
                       style="padding:10px;border:1px solid #ddd;border-radius:8px;">
                <button onclick="app.eliminarEquipo(${id})" 
                        style="background:#f44336;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;">🗑️</button>
            </div>
        `;
        container.appendChild(div);
        this.calcularTotal();
    },
    
    actualizarEquipo: function(id, campo, valor) {
        const equipo = this.datosCotizacion.equipos.find(e => e.id === id);
        if (equipo) {
            equipo[campo] = campo === 'nombre' ? valor : parseFloat(valor) || 0;
        }
        this.calcularTotal();
    },
    
    eliminarEquipo: function(id) {
        this.datosCotizacion.equipos = this.datosCotizacion.equipos.filter(e => e.id !== id);
        const el = document.querySelector('.equipo-item[data-id="' + id + '"]');
        if (el) el.remove();
        this.calcularTotal();
    },
    
    // ─────────────────────────────────────────────────────────────────────
    // AGREGAR INDIRECTO (CORREGIDO - CON VALIDACIÓN)
    // ─────────────────────────────────────────────────────────────────────
    agregarIndirecto: function() {
        const container = document.getElementById('indirectos-lista');
        if (!container) {
            console.warn('⚠️ No existe indirectos-lista en el HTML - Se omite');
            return;
        }

        if (!this.datosCotizacion.indirectos) {
            this.datosCotizacion.indirectos = [];
        }
    
        const id = Date.now();
        this.datosCotizacion.indirectos.push({ id, concepto: '', monto: 0 });
    
        const div = document.createElement('div');
        div.className = 'indirecto-item';
        div.dataset.id = id;
        div.innerHTML = `
            <div style="display:grid;grid-template-columns:2fr 1fr auto;gap:10px;margin:10px 0;">
                <input type="text" placeholder="Concepto" 
                       onchange="app.actualizarIndirecto(${id}, 'concepto', this.value)"
                      style="padding:10px;border:1px solid #ddd;border-radius:8px;">
                <input type="number" placeholder="Monto" value="0" min="0" step="0.01" 
                       onchange="app.actualizarIndirecto(${id}, 'monto', this.value)"
                       style="padding:10px;border:1px solid #ddd;border-radius:8px;">
                <button onclick="app.eliminarIndirecto(${id})" 
                        style="background:#f44336;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;">🗑️</button>
           </div>
        `;
        container.appendChild(div);
        this.calcularTotal();
    },
    
    eliminarIndirecto: function(id) {
        this.datosCotizacion.indirectos = this.datosCotizacion.indirectos.filter(i => i.id !== id);
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
        
        // Actualizar UI
        const elementos = {
            'resumen-subtotal': resultado.subtotal,
            'resumen-indirectos': resultado.indirectosTotal,
            'resumen-utilidad': resultado.utilidad,
            'resumen-iva': resultado.iva,
            'resumen-total': resultado.totalFinal
        };
        
        Object.entries(elementos).forEach(([id, valor]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = calculator.formatoMoneda(valor);
        });
        
        const lblUtilidad = document.getElementById('lbl-utilidad');
        const lblIva = document.getElementById('lbl-iva');
        if (lblUtilidad) lblUtilidad.textContent = utilidadPorcentaje;
        if (lblIva) lblIva.textContent = ivaPorcentaje;
        
        this.verificarSmartMargin(resultado);
    },
    
    calcularTotalConConceptos: function() {
        // Calcular con conceptos seleccionados
        let subtotal = 0;
        
        this.datosCotizacion.conceptosSeleccionados.forEach(c => {
            subtotal += (c.costos_base?.costo_directo_total || 0) * c.cantidad;
        });
        
        // Agregar materiales, MO, equipos manuales
        subtotal += this.datosCotizacion.materiales.reduce((sum, m) => sum + (m.cantidad * m.precioUnitario), 0);
        subtotal += this.datosCotizacion.manoObra.reduce((sum, m) => sum + (m.horas * m.precioHora), 0);
        subtotal += this.datosCotizacion.equipos.reduce((sum, e) => sum + (e.horas * e.costoUnitario), 0);
        
        const indirectos = this.datosCotizacion.indirectos.reduce((sum, i) => sum + i.monto, 0);
        const utilidadPorcentaje = parseFloat(document.getElementById('cot-utilidad')?.value) || 15;
        const utilidad = (subtotal + indirectos) * (utilidadPorcentaje / 100);
        const iva = (subtotal + indirectos + utilidad) * 0.16;
        const total = subtotal + indirectos + utilidad + iva;
        
        // Actualizar UI
        const elementos = {
            'resumen-subtotal': subtotal,
            'resumen-indirectos': indirectos,
            'resumen-utilidad': utilidad,
            'resumen-iva': iva,
            'resumen-total': total
        };
        
        Object.entries(elementos).forEach(([id, valor]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = calculator.formatoMoneda(valor);
        });
        
        const resultado = {
            subtotal,
            indirectosTotal: indirectos,
            utilidad,
            iva,
            totalFinal: total,
            margenReal: utilidad > 0 ? (utilidad / total) * 100 : 0
        };
        
        this.verificarSmartMargin(resultado);
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
    // GUARDAR COTIZACIÓN
    // ─────────────────────────────────────────────────────────────────
    guardarCotizacion: async function() {
        try {
            // Verificar licencia
            const limite = await window.licencia.verificarLimite();
            if (!limite.permitido) {
                this.notificacion(limite.razon, 'error');
                return;
            }
            
            // Validar datos
            const clienteId = document.getElementById('cot-cliente')?.value;
            const descripcion = document.getElementById('cot-descripcion')?.value;
            const ubicacion = document.getElementById('cot-ubicacion')?.value;
            const utilidadPorcentaje = parseFloat(document.getElementById('cot-utilidad')?.value) || 15;
            
            if (!clienteId || !descripcion) {
                this.notificacion('Completa cliente y descripción', 'error');
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
                clienteId,
                descripcion,
                ubicacion: ubicacion || '',
                materiales: this.datosCotizacion.materiales,
                manoObra: this.datosCotizacion.manoObra,
                indirectos: this.datosCotizacion.indirectos,
                conceptos: this.datosCotizacion.conceptosSeleccionados,
                utilidadPorcentaje,
                ...resultado,
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
    
    resetearFormulario: function() {
        this.datosCotizacion = {
            materiales: [],
            manoObra: [],
            equipos: [],
            herramienta: [],
            indirectos: [],
            conceptosSeleccionados: []
        };
        
        document.getElementById('materiales-lista').innerHTML = '';
        document.getElementById('mano-obra-lista').innerHTML = '';
        document.getElementById('equipos-lista').innerHTML = '';
        document.getElementById('indirectos-lista').innerHTML = '';
        document.getElementById('conceptos-seleccionados').innerHTML = '';
        
        this.inicializarFormularios();
    },
    
    // ─────────────────────────────────────────────────────────────────
    // HISTORIAL
    // ─────────────────────────────────────────────────────────────────
    cargarHistorial: async function() {
        try {
            if (!window.db) return;
            
            const cotizaciones = await window.db.cotizaciones.reverse().limit(50).toArray();
            const clientes = await window.db.clientes.toArray();
            
            const tbody = document.getElementById('historial-tabla');
            if (!tbody) return;
            
            if (cotizaciones.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="padding:40px;text-align:center;color:#999;">No hay cotizaciones guardadas</td></tr>';
                return;
            }
            
            tbody.innerHTML = cotizaciones.map(c => {
                const cliente = clientes.find(cl => cl.id == c.clienteId);
                return `<tr style="transition:background 0.3s;" onmouseover="this.style.background='#f5f7fa'" onmouseout="this.style.background='white'">
                    <td style="padding:12px;border-bottom:1px solid #ddd;">${new Date(c.fecha).toLocaleDateString('es-MX')}</td>
                    <td style="padding:12px;border-bottom:1px solid #ddd;">${cliente ? cliente.nombre : 'N/A'}</td>
                    <td style="padding:12px;border-bottom:1px solid #ddd;">${c.descripcion}</td>
                    <td style="padding:12px;border-bottom:1px solid #ddd;font-weight:700;color:#1a1a1a;">${calculator.formatoMoneda(c.totalFinal)}</td>
                    <td style="padding:12px;border-bottom:1px solid #ddd;">
                        <button onclick="alert('Próximamente: Ver detalle')" 
                                style="padding:5px 10px;border:none;border-radius:5px;cursor:pointer;background:#2196F3;color:white;">👁️</button>
                    </td>
                </tr>`;
            }).join('');
            
        } catch (error) {
            console.error('❌ Error cargando historial:', error);
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
                clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
            
        } catch (error) {
            console.error('❌ Error cargando clientes:', error);
        }
    },
    
    cargarClientesTabla: async function() {
        try {
            if (!window.db) return;
            
            const clientes = await window.db.clientes.toArray();
            const tbody = document.getElementById('clientes-tabla');
            if (!tbody) return;
            
            if (clientes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="padding:40px;text-align:center;color:#999;">No hay clientes registrados</td></tr>';
                return;
            }
            
            tbody.innerHTML = clientes.map(c => `<tr style="transition:background 0.3s;" onmouseover="this.style.background='#f5f7fa'" onmouseout="this.style.background='white'">
                <td style="padding:12px;border-bottom:1px solid #ddd;">${c.nombre}</td>
                <td style="padding:12px;border-bottom:1px solid #ddd;">${c.email || 'N/A'}</td>
                <td style="padding:12px;border-bottom:1px solid #ddd;">${c.telefono || 'N/A'}</td>
                <td style="padding:12px;border-bottom:1px solid #ddd;">
                    <button onclick="alert('Próximamente: Editar')" 
                            style="padding:5px 10px;border:none;border-radius:5px;cursor:pointer;background:#2196F3;color:white;margin-right:5px;">✏️</button>
                    <button onclick="app.eliminarCliente(${c.id})" 
                            style="padding:5px 10px;border:none;border-radius:5px;cursor:pointer;background:#f44336;color:white;">🗑️</button>
                </td>
            </tr>`).join('');
            
        } catch (error) {
            console.error('❌ Error cargando tabla clientes:', error);
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
            
            await window.db.clientes.add({ nombre, email, telefono, notas, activo: true });
            
            this.notificacion('✅ Cliente guardado', 'exito');
            
            // Limpiar formulario
            document.getElementById('cliente-nombre').value = '';
            document.getElementById('cliente-email').value = '';
            document.getElementById('cliente-telefono').value = '';
            document.getElementById('cliente-notas').value = '';
            
            // Recargar listas
            await this.cargarClientesSelect();
            await this.cargarClientesTabla();
            
        } catch (error) {
            console.error('❌ Error guardando cliente:', error);
            this.notificacion('❌ Error: ' + error.message, 'error');
        }
    },
    
    eliminarCliente: async function(id) {
        if (confirm('¿Eliminar este cliente?')) {
            await window.db.clientes.delete(id);
            await this.cargarClientesSelect();
            await this.cargarClientesTabla();
            this.notificacion('Cliente eliminado', 'advertencia');
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
            config.forEach(c => configObj[c.clave] = c.valor);
            
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
    
    cargarConfiguracionForm: async function() {
        await this.cargarConfiguracion();
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
            await window.dbUtils.exportarTodo();
            this.notificacion('✅ Respaldo exportado', 'exito');
        } catch (error) {
            console.error('❌ Error exportando:', error);
            this.notificacion('❌ Error: ' + error.message, 'error');
        }
    },
    
    importarDatos: async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                await window.dbImportar(e.target.result);
            } catch (error) {
                console.error('❌ Error importando:', error);
                app.notificacion('❌ Error: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    },
    
    // ─────────────────────────────────────────────────────────────────
    // MODAL CLIENTE RÁPIDO
    // ─────────────────────────────────────────────────────────────────
    mostrarModalCliente: function() {
        const modal = document.getElementById('modal-cliente');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('modal-cliente-nombre')?.focus();
        }
    },
    
    cerrarModalCliente: function() {
        const modal = document.getElementById('modal-cliente');
        if (modal) modal.style.display = 'none';
        
        const campos = ['modal-cliente-nombre', 'modal-cliente-email', 'modal-cliente-telefono', 'modal-cliente-notas'];
        campos.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    },
    
    guardarClienteRapido: async function() {
        try {
            const nombre = document.getElementById('modal-cliente-nombre')?.value.trim();
            const email = document.getElementById('modal-cliente-email')?.value.trim();
            const telefono = document.getElementById('modal-cliente-telefono')?.value.trim();
            const notas = document.getElementById('modal-cliente-notas')?.value.trim();
            
            if (!nombre) {
                this.notificacion('⚠️ El nombre del cliente es obligatorio', 'error');
                return;
            }
            
            const clienteId = await window.db.clientes.add({ nombre, email, telefono, notas, activo: true });
            
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
    
    verificarClientesDisponibles: async function() {
        try {
            if (!window.db) return;
            
            const clientes = await window.db.clientes.toArray();
            const select = document.getElementById('cot-cliente');
            const mensaje = document.getElementById('sin-clientes-msg');
            
            if (clientes.length === 0) {
                if (mensaje) mensaje.style.display = 'block';
                if (select) select.disabled = true;
                
                const alertaExistente = document.getElementById('alerta-sin-clientes');
                if (!alertaExistente) {
                    const alerta = document.createElement('div');
                    alerta.className = 'alert alert-warning';
                    alerta.id = 'alerta-sin-clientes';
                    alerta.innerHTML = '<strong>⚠️ No hay clientes registrados</strong><br>Primero debes agregar al menos un cliente para crear una cotización.';
                    
                    const parent = select?.parentElement;
                    if (parent) parent.insertBefore(alerta, select);
                }
                
                setTimeout(() => { this.mostrarModalCliente(); }, 1000);
                
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
    
    // ─────────────────────────────────────────────────────────────────
    // PDF
    // ─────────────────────────────────────────────────────────────────
    generarPDF: async function() {
        try {
            if (this.datosCotizacion.conceptosSeleccionados.length === 0) {
                this.notificacion('Agrega conceptos antes de generar PDF', 'advertencia');
                return;
            }
            
            // Usar apuGenerator si está disponible
            if (window.apuGenerator) {
                this.notificacion('🚧 Generando PDF...', 'info');
                // Implementar generación de PDF
            } else {
                this.notificacion('🚧 Próximamente: Generar PDF profesional', 'info');
            }
            
        } catch (error) {
            console.error('❌ Error generando PDF:', error);
            this.notificacion('❌ Error: ' + error.message, 'error');
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // NOTIFICACIONES
    // ─────────────────────────────────────────────────────────────────
    notificacion: function(mensaje, tipo = 'info') {
        const colores = {
            info: '#2196F3',
            exito: '#4CAF50',
            error: '#f44336',
            advertencia: '#FF9800'
        };
        
        const div = document.createElement('div');
        div.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colores[tipo] || colores.info};
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            font-weight: 600;
        `;
        div.textContent = mensaje;
        document.body.appendChild(div);
        
        setTimeout(() => {
            div.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => div.remove(), 300);
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
    app.init();
});

// ─────────────────────────────────────────────────────────────────────
// ANIMACIONES CSS
// ─────────────────────────────────────────────────────────────────────
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

console.log('✅ app.js v2.0 listo');



