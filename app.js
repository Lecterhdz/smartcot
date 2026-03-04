// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - APLICACIÓN PRINCIPAL (COMPLETO ACTUALIZADO)
// Con sección de Impacto de Factores visible permanentemente
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
                    setTimeout(() => {
                        curvaS.init();
                    }, 300);
                }
                break;
            case 'historial-cotizaciones-screen':
                if (window.historialCotizaciones) {
                    setTimeout(() => {
                        historialCotizaciones.cargar();
                    }, 300);
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
        
        // CAMPOS DE FECHA (NUEVOS)
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
            // FECHAS (NUEVO)
            fechaInicio: fechaInicio || new Date().toISOString(),
            fechaFinSolicitada: fechaFinSolicitada || null,
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
    
    // Ocultar sección de impacto
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
// MODAL CLIENTE RÁPIDO (FUNCIONES FALTANTES)
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
    campos.forEach(id => {
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
