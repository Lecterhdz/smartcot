// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - CURVA S (SEGUIMIENTO DE OBRA)
// ─────────────────────────────────────────────────────────────────────

console.log('📈 curva-s.js cargado');

window.curvaS = {

    datos: {
        cotizacionId: null,
        cotizacionNumero: null,
        cliente: null,
        semanas: [],
        avanceProgramado: [],
        avanceEjecutado: [],
        montoProgramado: [],
        montoEjecutado: [],
        fechas: []
    },

    grafica: null,

    // ─────────────────────────────────────────────────────────────────
    // HELPER — leer colores CSS del tema activo
    // ─────────────────────────────────────────────────────────────────
    _css: function(variable) {
        return getComputedStyle(document.documentElement)
            .getPropertyValue(variable).trim();
    },

    // ─────────────────────────────────────────────────────────────────
    // INICIALIZAR — espera a que db esté lista
    // ─────────────────────────────────────────────────────────────────
    init: async function() {
        try {
            // Verificar licencia
            var limite = await window.licencia.verificarLimite('curvaS');
            if (!limite.permitido) {
                alert('❌ ' + limite.razon);
                if (window.app) window.app.mostrarPantalla('dashboard-screen');
                return;
            }

            // Si window.db ya existe, cargar directo
            if (window.db) {
                await this.cargarCotizacionesEnDropdown();
                return;
            }

            // Si no, esperar el evento db-ready
            document.addEventListener('db-ready', async function handler() {
                document.removeEventListener('db-ready', handler);
                await window.curvaS.cargarCotizacionesEnDropdown();
            });

        } catch (error) {
            console.error('❌ Error inicializando Curva S:', error);
        }
    },

    // ─────────────────────────────────────────────────────────────────
    // CARGAR COTIZACIONES EN DROPDOWN
    // ─────────────────────────────────────────────────────────────────
    cargarCotizacionesEnDropdown: async function() {
        try {
            var select = document.getElementById('curva-s-cotizacion');
            if (!select) return;

            if (!window.db) {
                select.innerHTML = '<option value="">⚠️ Base de datos no disponible</option>';
                return;
            }

            var cotizaciones = await window.db.cotizaciones.reverse().limit(100).toArray();

            if (cotizaciones.length === 0) {
                select.innerHTML = '<option value="">No hay cotizaciones guardadas</option>';
                return;
            }

            var clientes = await window.db.clientes.toArray();

            select.innerHTML = '<option value="">Seleccionar cotización...</option>' +
                cotizaciones.map(function(c) {
                    var cliente = clientes.find(function(cl) { return cl.id == c.clienteId; });
                    var clienteNombre = cliente ? cliente.nombre : 'Sin cliente';
                    var fecha = c.fecha ? new Date(c.fecha).toLocaleDateString('es-MX') : '—';
                    var total = window.calculator ? window.calculator.formatoMoneda(c.totalFinal || 0) : '$0.00';
                    return '<option value="' + c.id + '">#' + c.id + ' — ' + clienteNombre + ' — ' + total + ' (' + fecha + ')</option>';
                }).join('');

            console.log('✅ Cotizaciones cargadas en dropdown:', cotizaciones.length);

        } catch (error) {
            console.error('❌ Error cargando cotizaciones en dropdown:', error);
            var select = document.getElementById('curva-s-cotizacion');
            if (select) select.innerHTML = '<option value="">Error al cargar</option>';
        }
    },

// ─────────────────────────────────────────────────────────────────
// GENERAR TABLA DE AVANCE CON SEMANA ACTUAL RESALTADA (CORREGIDO)
// ─────────────────────────────────────────────────────────────────
generarTablaAvance: function() {
    try {
        console.log('📊 Generando tabla de avance...');
        
        // ⚠️ BUSCAR TBODY CON ID CORRECTO
        let tbody = document.getElementById('curva-s-tabla-avance');
        
        if (!tbody) {
            console.warn('⚠️ Tabla de avance no encontrada (ID: curva-s-tabla-avance)');
            // Intentar fallback
            tbody = document.querySelector('#curva-s-screen table tbody');
            if (!tbody) {
                console.error('❌ No se encontró tbody para tabla de avance');
                return;
            }
        }
        
        // ⚠️ ENCONTRAR SEMANA ACTUAL (último índice con valor no-null y > 0)
        let semanaActualIndex = -1;
        for (let i = this.datos.avanceEjecutado.length - 1; i >= 0; i--) {
            const valor = this.datos.avanceEjecutado[i];
            if (valor !== null && valor !== undefined && valor > 0) {
                semanaActualIndex = i;
                break;
            }
        }
        
        console.log('📍 Semana actual (índice):', semanaActualIndex, '=> Semana:', semanaActualIndex + 1);
        console.log('📊 Datos avance ejecutado:', this.datos.avanceEjecutado);
        
        // ⚠️ GENERAR FILAS
        let html = '';
        
        // Si no hay datos, mostrar mensaje
        if (!this.datos.semanas || this.datos.semanas.length === 0) {
            html = '<tr><td colspan="4" style="padding:20px;text-align:center;color:var(--ink4);">Sin datos de semanas</td></tr>';
        } else {
            this.datos.semanas.forEach(function(semanaLabel, index) {
                const numSemana = index + 1;
                const programado = this.datos.avanceProgramado?.[index] || 0;
                const ejecutado = this.datos.avanceEjecutado?.[index];
                const tieneEjecutado = ejecutado !== null && ejecutado !== undefined && ejecutado > 0;
                const desviacion = tieneEjecutado ? (ejecutado - programado) : null;
                
                // ⚠️ CLASE ESPECIAL PARA SEMANA ACTUAL
                const esSemanaActual = (index === semanaActualIndex);
                const estiloFila = esSemanaActual 
                    ? 'style="background:var(--blue-l);font-weight:700;"' 
                    : 'style="border-bottom:1px solid var(--border);"';
                const indicador = esSemanaActual ? ' ◀' : '';
                
                // ⚠️ COLOR DE DESVIACIÓN
                let colorDesviacion = desviacion !== null 
                    ? (desviacion >= 0 ? 'var(--green)' : 'var(--rose)') 
                    : 'var(--ink4)';
                
                html += '<tr ' + estiloFila + '>' +
                    '<td style="padding:10px 14px;font-family:var(--mono);font-size:12px;">S' + numSemana + indicador + '</td>' +
                    '<td style="padding:10px 14px;font-family:var(--mono);font-size:12px;color:var(--indigo);">' + programado.toFixed(1) + '%</td>' +
                    '<td style="padding:10px 14px;font-family:var(--mono);font-size:12px;color:var(--blue);">' + 
                        (tieneEjecutado ? ejecutado.toFixed(1) + '%' : '—') + 
                    '</td>' +
                    '<td style="padding:10px 14px;font-size:11px;color:' + colorDesviacion + ';font-family:var(--mono);font-weight:600;">' + 
                        (tieneEjecutado ? (desviacion >= 0 ? '+' : '') + desviacion.toFixed(1) + '%' : '—') + 
                    '</td>' +
                    '</tr>';
            }.bind(this));
        }
        
        tbody.innerHTML = html;
        console.log('✅ Tabla de avance generada con', this.datos.semanas?.length || 0, 'filas');
        
    } catch (error) {
        console.error('❌ Error generando tabla:', error);
    }
},
    
    // ─────────────────────────────────────────────────────────────────
    // CARGAR COTIZACIÓN SELECCIONADA
    // ─────────────────────────────────────────────────────────────────
    cargarCotizacion: async function() {
        try {
            const cotizacionId = document.getElementById('curva-s-cotizacion')?.value;
            if (!cotizacionId) {
                alert('⚠️ Selecciona una cotización');
                return;
            }
            
            this.limpiarValoresEVM();
            const cotizacion = await window.db.cotizaciones.get(parseInt(cotizacionId));
            if (!cotizacion) {
                alert('❌ Cotización no encontrada');
                return;
            }
            
            console.log('✅ Cotización cargada:', cotizacion);

            this.datos.cotizacionId    = cotizacionId;
            this.datos.cotizacionNumero = cotizacion.id;

            // Cliente
            if (cotizacion.clienteId) {
                var cliente = await window.db.clientes.get(parseInt(cotizacion.clienteId));
                this.datos.cliente = cliente ? cliente.nombre : 'Sin cliente';
            } else {
                this.datos.cliente = 'Sin cliente';
            }

            // Semanas totales y monto
            var semanasTotales = Math.ceil((cotizacion.tiempoEjecucion && cotizacion.tiempoEjecucion.semanas) || 0) || 1;
            var montoTotal     = cotizacion.totalFinal || 0;

            // Fechas
            var fechaInicio = cotizacion.fechaInicio ? new Date(cotizacion.fechaInicio) : new Date();
            var fechaFinEstimada = new Date(fechaInicio);
            fechaFinEstimada.setDate(fechaFinEstimada.getDate() + (semanasTotales * 7));
            var fechaFinSolicitada = cotizacion.fechaFinSolicitada ? new Date(cotizacion.fechaFinSolicitada) : null;

            // Generar curva programada
            this.generarCurvaProgramada(semanasTotales, montoTotal, fechaInicio, fechaFinEstimada);

            // Cargar avance ejecutado
            await this.cargarAvanceEjecutado();

            // ⚠️ ESPERAR A QUE EL CANVAS SEA VISIBLE
            setTimeout(() => {
                this.inicializarGrafica();      // 1. Inicializar Chart.js
                this.actualizarGrafica();        // 2. Cargar datos en gráfica
                this.generarTablaAvance();       // 3. Generar tabla con semana actual
                this.calcularVariaciones();      // 4. Calcular variaciones
            }, 300);

            // ⚠️ GENERAR TABLA DE AVANCE (DESPUÉS DE CARGAR DATOS)
            this.generarTablaAvance();

            // Variaciones y tabla
            this.calcularVariaciones();
            this.renderizarTablaAvances();
            
            // Actualizar componentes visuales

            if (cotizacion.evm && typeof this.actualizarValoresEVM === 'function') {
                this.actualizarValoresEVM(cotizacion.evm);
            } else {
                console.log('ℹ️ No hay datos EVM en esta cotización, calculando...');
                // Calcular EVM dinámicamente si no existe guardado
                this.calcularEVM();
            }
            this.actualizarCurvaInversion(
                cotizacion.avanceEjecutado ? (cotizacion.avanceEjecutado / 100) * montoTotal : 0,
                montoTotal
            );
            
            // Info de cotización
            this.mostrarInfoCotizacion(cotizacion, fechaInicio, fechaFinEstimada, fechaFinSolicitada);

            console.log('✅ Cotización cargada en Curva S');
            // ⚠️ AGREGAR ESTO AL FINAL
            this.generarTablaAvance();  // ✅ Generar tabla con semana actual resaltada
        } catch (error) {
            console.error('❌ Error cargando cotización:', error);
            alert('❌ Error: ' + error.message);
        }
    },
    // ─────────────────────────────────────────────────────────────────
    // ACTUALIZAR VALORES EVM (VERSIÓN CORREGIDA - SIN ERRORES)
    // ─────────────────────────────────────────────────────────────────
    actualizarValoresEVM: function(datosEVM) {
        try {
            console.log('📊 Actualizando valores EVM:', datosEVM);
            
            // ⚠️ VALIDAR QUE EXISTAN DATOS
            if (!datosEVM || typeof datosEVM !== 'object') {
                console.warn('⚠️ No hay datos EVM válidos');
                this.limpiarValoresEVM();
                return;
            }
            
            const mapeo = {
                pv: 'evm-pv', ev: 'evm-ev', ac: 'evm-ac',
                cv: 'evm-cv', sv: 'evm-sv', cpi: 'evm-cpi',
                spi: 'evm-spi', eac: 'evm-eac', etc: 'evm-etc', vac: 'evm-vac'
            };
            
            Object.entries(mapeo).forEach(([clave, id]) => {
                const el = document.getElementById(id);
                if (el) {
                    const valor = datosEVM[clave];
                    if (valor !== undefined && valor !== null) {
                        if (typeof valor === 'number' && (clave === 'cpi' || clave === 'spi')) {
                            el.textContent = valor.toFixed(2);
                            el.style.color = valor >= 1 ? 'var(--green)' : 'var(--rose)';
                        } else if (typeof valor === 'number') {
                            el.textContent = calculator?.formatoMoneda?.(valor) || '$' + valor.toLocaleString();
                            if (['cv', 'sv', 'vac'].includes(clave)) {
                                el.style.color = valor >= 0 ? 'var(--green)' : 'var(--rose)';
                            } else {
                                el.style.color = 'var(--ink)';
                            }
                        } else {
                            el.textContent = valor;
                        }
                    } else {
                        el.textContent = clave.includes('cpi') || clave.includes('spi') ? '0.00' : '$0.00';
                        el.style.color = 'var(--ink)';
                    }
                }
            });
            
            console.log('✅ Valores EVM actualizados');
        } catch (error) {
            console.error('❌ Error actualizando EVM:', error);
            this.limpiarValoresEVM();
        }
    },
    // ─────────────────────────────────────────────────────────────────
    // MOSTRAR INFO DE COTIZACIÓN
    // ─────────────────────────────────────────────────────────────────
    mostrarInfoCotizacion: function(cotizacion, fechaInicio, fechaFinEstimada, fechaFinSolicitada) {
        var infoDiv = document.getElementById('curva-s-info-cotizacion');
        if (!infoDiv) return;

        var semanasTotales = Math.ceil((cotizacion.tiempoEjecucion && cotizacion.tiempoEjecucion.semanas) || 0) || 1;
        var diferenciaDias = fechaFinSolicitada
            ? Math.round((fechaFinSolicitada - fechaFinEstimada) / (1000 * 60 * 60 * 24))
            : 0;
        var fmt = window.calculator ? window.calculator.formatoMoneda : function(v) { return '$' + v; };

        infoDiv.innerHTML =
            '<div style="background:var(--blue-l);padding:20px;border-radius:var(--radius);margin-bottom:22px;border:1px solid var(--blue-m);">' +
              '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;">' +
                '<div>' +
                  '<div style="font-size:11px;color:var(--ink4);font-family:var(--mono);text-transform:uppercase;margin-bottom:3px;">Cotización #</div>' +
                  '<div style="font-size:18px;font-weight:800;color:var(--ink);font-family:var(--mono);">' + cotizacion.id + '</div>' +
                '</div>' +
                '<div>' +
                  '<div style="font-size:11px;color:var(--ink4);font-family:var(--mono);text-transform:uppercase;margin-bottom:3px;">Cliente</div>' +
                  '<div style="font-size:15px;font-weight:700;color:var(--ink);">' + this.datos.cliente + '</div>' +
                '</div>' +
                '<div>' +
                  '<div style="font-size:11px;color:var(--ink4);font-family:var(--mono);text-transform:uppercase;margin-bottom:3px;">Total Proyecto</div>' +
                  '<div style="font-size:18px;font-weight:800;color:var(--green);font-family:var(--mono);">' + fmt(cotizacion.totalFinal || 0) + '</div>' +
                '</div>' +
                '<div>' +
                  '<div style="font-size:11px;color:var(--ink4);font-family:var(--mono);text-transform:uppercase;margin-bottom:3px;">Duración</div>' +
                  '<div style="font-size:18px;font-weight:800;color:var(--blue);font-family:var(--mono);">' + semanasTotales + ' sem</div>' +
                '</div>' +
                '<div>' +
                  '<div style="font-size:11px;color:var(--ink4);font-family:var(--mono);text-transform:uppercase;margin-bottom:3px;">Inicio</div>' +
                  '<div style="font-size:15px;font-weight:700;color:var(--ink);">' + fechaInicio.toLocaleDateString('es-MX') + '</div>' +
                '</div>' +
                '<div>' +
                  '<div style="font-size:11px;color:var(--ink4);font-family:var(--mono);text-transform:uppercase;margin-bottom:3px;">Fin Estimado</div>' +
                  '<div style="font-size:15px;font-weight:700;color:var(--amber);">' + fechaFinEstimada.toLocaleDateString('es-MX') + '</div>' +
                '</div>' +
                (fechaFinSolicitada
                  ? '<div>' +
                      '<div style="font-size:11px;color:var(--ink4);font-family:var(--mono);text-transform:uppercase;margin-bottom:3px;">Fin Solicitado</div>' +
                      '<div style="font-size:15px;font-weight:700;color:' + (diferenciaDias >= 0 ? 'var(--green)' : 'var(--rose)') + ';">' +
                        fechaFinSolicitada.toLocaleDateString('es-MX') +
                        '<span style="display:block;font-size:11px;">' + (diferenciaDias >= 0 ? '+' : '') + diferenciaDias + ' días vs estimado</span>' +
                      '</div>' +
                    '</div>'
                  : '') +
              '</div>' +
            '</div>';
    },

    // ─────────────────────────────────────────────────────────────────
    // GENERAR CURVA PROGRAMADA (S-CURVE)
    // ─────────────────────────────────────────────────────────────────
    generarCurvaProgramada: function(semanasTotales, montoTotal, fechaInicio) {
        this.datos.semanas         = [];
        this.datos.avanceProgramado = [];
        this.datos.montoProgramado  = [];
        this.datos.fechas           = [];

        var fechaActual = new Date(fechaInicio);

        for (var i = 1; i <= semanasTotales; i++) {
            var fechaSemana = new Date(fechaActual);
            fechaSemana.setDate(fechaActual.getDate() + ((i - 1) * 7));

            this.datos.semanas.push('S' + i);
            this.datos.fechas.push(fechaSemana);

            var progreso = i / semanasTotales;
            var sCurve   = Math.pow(progreso, 2) * (3 - 2 * progreso) * 100;
            var acumulado = Math.min(sCurve, 100);

            this.datos.avanceProgramado.push(parseFloat(acumulado.toFixed(2)));
            this.datos.montoProgramado.push(parseFloat(((acumulado / 100) * montoTotal).toFixed(2)));
        }

        console.log('✅ Curva programada generada. Semanas:', semanasTotales);
    },

    // ─────────────────────────────────────────────────────────────────
    // CARGAR AVANCE EJECUTADO DESDE DB
    // ─────────────────────────────────────────────────────────────────
    cargarAvanceEjecutado: async function() {
        try {
            // Inicializar con ceros
            if (!this.datos.cotizacionId) {
                this.datos.avanceEjecutado = new Array(this.datos.semanas?.length || 0).fill(0);
                this.datos.montoEjecutado = new Array(this.datos.semanas?.length || 0).fill(0);
                return;
            }

            var avances = await window.db.avanceObra
                .where('cotizacionId')
                .equals(parseInt(this.datos.cotizacionId))
                .toArray();

            console.log('📊 Registros de avance encontrados:', avances.length, avances);
            
            // ⚠️ INICIALIZAR ARRAYS CON EL TAMAÑO DE SEMANAS
            const totalSemanas = this.datos.semanas?.length || 0;
            this.datos.avanceEjecutado = new Array(totalSemanas).fill(null);  // ← null para distinguir "sin dato"
            this.datos.montoEjecutado = new Array(totalSemanas).fill(0);
            
            avances.forEach(function(a) {
                var idx = (a.semana || 0) - 1;
                if (idx >= 0 && idx < window.curvaS.datos.semanas.length) {
                    window.curvaS.datos.avanceEjecutado[idx] = parseFloat(a.porcentajeEjecutado || 0);
                    window.curvaS.datos.montoEjecutado[idx]  = parseFloat(a.montoEjecutado || 0);
                }
            });

            console.log('✅ Avance ejecutado mapeado:', this.datos.avanceEjecutado);

        } catch (error) {
            console.error('❌ Error cargando avance ejecutado:', error);
            const totalSemanas = this.datos.semanas?.length || 0;
            this.datos.avanceEjecutado = new Array(this.datos.semanas.length).fill(null);
            this.datos.montoEjecutado  = new Array(this.datos.semanas.length).fill(0);
        }
    },

    // ─────────────────────────────────────────────────────────────────
    // INICIALIZAR GRÁFICA CHART.JS
    // ─────────────────────────────────────────────────────────────────
    inicializarGrafica: function() {
        try {
            var canvas = document.getElementById('curva-s-chart');
            if (!canvas) { console.error('❌ Canvas curva-s-chart no encontrado'); return; }
            var ctx = canvas.getContext('2d');
            if (!ctx) { console.error('❌ No se pudo obtener contexto 2D'); return; }

            if (this.grafica) { this.grafica.destroy(); this.grafica = null; }

            canvas.width  = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;

            // ── Encontrar última semana con avance > 0 ──────────────────────
            var ultimaSemanaIndex = -1;
            for (var i = this.datos.avanceEjecutado.length - 1; i >= 0; i--) {
                var v = this.datos.avanceEjecutado[i];
                if (v !== null && v !== undefined && v > 0) { ultimaSemanaIndex = i; break; }
            }
            this._ultimaSemanaIndex = ultimaSemanaIndex;
            console.log('📍 Línea vertical en semana:', ultimaSemanaIndex + 1);

            // ── Plugin que dibuja la línea roja punteada SOBRE el canvas ────
            var pluginLineaVertical = {
                id: 'lineaVerticalSemanaActual',
                afterDraw: function(chart) {
                    var idx = window.curvaS._ultimaSemanaIndex;
                    if (idx === undefined || idx < 0) return;
                    var xAxis = chart.scales.x;
                    var yAxis = chart.scales.y;
                    if (!xAxis || !yAxis) return;
                    var xPos = xAxis.getPixelForValue(idx);
                    if (isNaN(xPos)) return;
                    var c = chart.ctx;
                    c.save();
                    c.beginPath();
                    c.setLineDash([6, 4]);
                    c.strokeStyle = '#f0436a';
                    c.lineWidth   = 2;
                    c.moveTo(xPos, yAxis.top);
                    c.lineTo(xPos, yAxis.bottom);
                    c.stroke();
                    c.setLineDash([]);
                    c.fillStyle    = '#f0436a';
                    c.font         = 'bold 11px "Outfit",sans-serif';
                    c.textAlign    = 'center';
                    c.textBaseline = 'bottom';
                    c.fillText('▼ Hoy', xPos, yAxis.top - 2);
                    c.restore();
                }
            };

            this.grafica = new Chart(ctx, {
                type: 'line',
                plugins: [pluginLineaVertical],
                data: {
                    labels: this.datos.semanas || [],
                    datasets: [
                        {
                            label: 'Programado',
                            data: this.datos.avanceProgramado || [],
                            borderColor: '#7c6ff0',
                            backgroundColor: 'rgba(124,111,240,0.1)',
                            borderWidth: 3, fill: true, tension: 0.4,
                            pointRadius: 4, pointHoverRadius: 6
                        },
                        {
                            label: 'Real',
                            data: this.datos.avanceEjecutado || [],
                            borderColor: '#4d8ef0',
                            backgroundColor: 'rgba(77,142,240,0.1)',
                            borderWidth: 3, borderDash: [6, 3],
                            fill: true, tension: 0.4,
                            pointRadius: 5, pointHoverRadius: 7,
                            pointBackgroundColor: '#4d8ef0',
                            pointBorderColor: '#fff', pointBorderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true, position: 'top',
                            labels: { color: '#e8edf5', font: { family: "'Outfit',sans-serif", size: 12 }, padding: 20 }
                        },
                        tooltip: {
                            backgroundColor: '#1e2330', titleColor: '#e8edf5',
                            bodyColor: '#c4cde0', borderColor: '#2a3347', borderWidth: 1, padding: 12,
                            callbacks: {
                                label: function(ctx) {
                                    if (ctx.parsed.y === null) return null;
                                    return ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(1) + '%';
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: '#334155' },
                            ticks: { color: '#e8edf5', font: { family: "'JetBrains Mono',monospace", size: 11 } },
                            title: { display: true, text: 'Semanas', color: '#5a6a8a', font: { family: "'Outfit',sans-serif", size: 12, weight: 'bold'  } }
                        },
                        y: {
                            beginAtZero: true, max: 100,
                            grid: { color: '#334155' },
                            ticks: { color: '#e8edf5', font: { family: "'JetBrains Mono',monospace", size: 11 }, callback: function(v) { return v + '%'; } },
                            title: { display: true, text: 'Avance %', color: '#5a6a8a', font: { family: "'Outfit',sans-serif", size: 12, weight: 'bold' } }
                        }
                    }
                }
            });

            console.log('✅ Gráfica inicializada');

        } catch (error) {
            console.error('❌ Error inicializando gráfica:', error);
        }
    },


    // ─────────────────────────────────────────────────────────────────
    // ACTUALIZAR DATOS EN LA GRÁFICA (CORREGIDO — sin typo)
    // ─────────────────────────────────────────────────────────────────
    actualizarGrafica: async function() {
        try {
            if (!this.grafica) {
                this.inicializarGrafica();  // ← sin typo, mayúscula G
            }
            if (!this.grafica) return;

            // Recargar avance por si hubo cambios
            await this.cargarAvanceEjecutado();
            
            // ── Recalcular índice para el plugin ────────────────────────────
            var ultimaSemanaIndex = -1;
            for (var i = this.datos.avanceEjecutado.length - 1; i >= 0; i--) {
                var v = this.datos.avanceEjecutado[i];
                if (v !== null && v !== undefined && v > 0) { ultimaSemanaIndex = i; break; }
            }
            
            this._ultimaSemanaIndex = ultimaSemanaIndex;
            
            this.grafica.data.labels                    = this.datos.semanas;
            this.grafica.data.datasets[0].data          = this.datos.avanceProgramado;
            this.grafica.data.datasets[1].data          = this.datos.avanceEjecutado;
            this.grafica.update();

            // Actualizar variaciones y tabla después de refrescar
            this.calcularVariaciones();
            this.renderizarTablaAvances();

            console.log('✅ Gráfica actualizada');

        } catch (error) {
            console.error('❌ Error actualizando gráfica:', error);
        }
    },

    // ─────────────────────────────────────────────────────────────────
    // RENDERIZAR TABLA DE AVANCES REALES
    // ─────────────────────────────────────────────────────────────────
    renderizarTablaAvances: function() {
        // Buscar o crear el contenedor de la tabla
        var contenedor = document.getElementById('tabla-avances-reales');
        if (!contenedor) {
            // Insertar después de la gráfica
            var chartWrap = document.querySelector('#curva-s-screen .card > div[style*="height:400px"]');
            if (!chartWrap) return;

            contenedor = document.createElement('div');
            contenedor.id = 'tabla-avances-reales';
            contenedor.style.marginTop = '22px';
            chartWrap.parentNode.insertBefore(contenedor, chartWrap.nextSibling);
        }

        if (!this.datos.semanas.length) {
            contenedor.innerHTML = '';
            return;
        }

        var fmt = window.calculator ? window.calculator.formatoMoneda : function(v) { return '$' + (v || 0).toLocaleString(); };

        var filas = this.datos.semanas.map(function(sem, i) {
            var prog     = window.curvaS.datos.avanceProgramado[i] || 0;
            var ejec     = window.curvaS.datos.avanceEjecutado[i];
            var monto    = window.curvaS.datos.montoEjecutado[i] || 0;
            var fecha    = window.curvaS.datos.fechas[i]
                ? window.curvaS.datos.fechas[i].toLocaleDateString('es-MX')
                : '—';

            var sinDatos = (ejec === null || ejec === undefined);
            var desv     = sinDatos ? null : parseFloat((ejec - prog).toFixed(1));

            var colorDesv = 'var(--ink4)';
            var textoDesv = '—';
            var estadoBadge = '<span style="background:var(--bg2);color:var(--ink4);padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;">Pendiente</span>';

            if (!sinDatos) {
                textoDesv   = (desv >= 0 ? '+' : '') + desv + '%';
                colorDesv   = desv >= 0 ? 'var(--green)' : 'var(--rose)';

                if (desv >= 0) {
                    estadoBadge = '<span style="background:var(--green-l);color:var(--green);padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;">En tiempo</span>';
                } else if (desv >= -5) {
                    estadoBadge = '<span style="background:var(--amber-l);color:var(--amber);padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;">Leve atraso</span>';
                } else {
                    estadoBadge = '<span style="background:var(--rose-l);color:var(--rose);padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;">Atrasado</span>';
                }
            }

            return '<tr>' +
                '<td style="padding:10px 14px;font-family:var(--mono);font-size:13px;font-weight:600;">' + sem + '</td>' +
                '<td style="padding:10px 14px;font-size:12px;color:var(--ink4);font-family:var(--mono);">' + fecha + '</td>' +
                '<td style="padding:10px 14px;font-family:var(--mono);color:var(--indigo);font-weight:600;">' + prog.toFixed(1) + '%</td>' +
                '<td style="padding:10px 14px;font-family:var(--mono);color:' + (sinDatos ? 'var(--ink4)' : 'var(--blue)') + ';font-weight:600;">' + (sinDatos ? '—' : ejec.toFixed(1) + '%') + '</td>' +
                '<td style="padding:10px 14px;font-family:var(--mono);color:' + colorDesv + ';font-weight:700;">' + textoDesv + '</td>' +
                '<td style="padding:10px 14px;font-family:var(--mono);font-size:12px;">' + (sinDatos ? '—' : fmt(monto)) + '</td>' +
                '<td style="padding:10px 14px;">' + estadoBadge + '</td>' +
            '</tr>';
        }).join('');

        contenedor.innerHTML =
            '<h4 style="color:var(--ink);font-weight:700;margin-bottom:14px;">📊 Tabla de Avances por Semana</h4>' +
            '<div style="overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border);overflow:hidden;">' +
              '<table style="width:100%;border-collapse:collapse;min-width:600px;">' +
                '<thead>' +
                  '<tr style="background:linear-gradient(135deg,var(--blue),var(--indigo));">' +
                    '<th style="padding:11px 14px;text-align:left;font-size:11px;font-weight:700;color:rgba(255,255,255,.9);text-transform:uppercase;letter-spacing:.5px;font-family:var(--mono);">Sem.</th>' +
                    '<th style="padding:11px 14px;text-align:left;font-size:11px;font-weight:700;color:rgba(255,255,255,.9);text-transform:uppercase;letter-spacing:.5px;font-family:var(--mono);">Fecha</th>' +
                    '<th style="padding:11px 14px;text-align:left;font-size:11px;font-weight:700;color:rgba(255,255,255,.9);text-transform:uppercase;letter-spacing:.5px;font-family:var(--mono);">Programado</th>' +
                    '<th style="padding:11px 14px;text-align:left;font-size:11px;font-weight:700;color:rgba(255,255,255,.9);text-transform:uppercase;letter-spacing:.5px;font-family:var(--mono);">Ejecutado</th>' +
                    '<th style="padding:11px 14px;text-align:left;font-size:11px;font-weight:700;color:rgba(255,255,255,.9);text-transform:uppercase;letter-spacing:.5px;font-family:var(--mono);">Desviación</th>' +
                    '<th style="padding:11px 14px;text-align:left;font-size:11px;font-weight:700;color:rgba(255,255,255,.9);text-transform:uppercase;letter-spacing:.5px;font-family:var(--mono);">Monto Ejec.</th>' +
                    '<th style="padding:11px 14px;text-align:left;font-size:11px;font-weight:700;color:rgba(255,255,255,.9);text-transform:uppercase;letter-spacing:.5px;font-family:var(--mono);">Estado</th>' +
                  '</tr>' +
                '</thead>' +
                '<tbody>' + filas + '</tbody>' +
              '</table>' +
            '</div>';
    },

    // ─────────────────────────────────────────────────────────────────
    // CALCULAR VARIACIONES
    // ─────────────────────────────────────────────────────────────────
    calcularVariaciones: function() {
        // Última semana con avance registrado
        var ultimaIdx = -1;
        for (var i = this.datos.avanceEjecutado.length - 1; i >= 0; i--) {
            if (this.datos.avanceEjecutado[i] !== null && this.datos.avanceEjecutado[i] !== undefined) {
                ultimaIdx = i;
                break;
            }
        }

        if (ultimaIdx === -1) {
            // Sin avance registrado
            var elV = document.getElementById('variacion-tiempo');
            var elI = document.getElementById('indice-tiempo');
            if (elV) { elV.textContent = '—'; elV.style.color = 'var(--ink4)'; }
            if (elI) { elI.textContent = '—'; elI.style.color = 'var(--ink4)'; }
            return;
        }

        var prog   = this.datos.avanceProgramado[ultimaIdx] || 0;
        var ejec   = this.datos.avanceEjecutado[ultimaIdx]  || 0;
        var variacion = parseFloat((ejec - prog).toFixed(1));
        var indice    = prog > 0 ? parseFloat((ejec / prog).toFixed(2)) : 0;

        var elVariacion = document.getElementById('variacion-tiempo');
        var elIndice    = document.getElementById('indice-tiempo');

        if (elVariacion) {
            elVariacion.textContent  = (variacion >= 0 ? '+' : '') + variacion + '%';
            elVariacion.style.color  = variacion >= 0 ? 'var(--green)' : 'var(--rose)';
        }
        if (elIndice) {
            elIndice.textContent = indice.toFixed(2);
            elIndice.style.color = indice >= 1 ? 'var(--green)' : 'var(--rose)';
        }

        // Guardar para PDF
        this.ultimaVariacion = variacion;
        this.ultimoIndice    = indice;
        this.ultimaSemana    = ultimaIdx + 1;
    },

    // ─────────────────────────────────────────────────────────────────
    // GUARDAR AVANCE SEMANAL
    // ─────────────────────────────────────────────────────────────────
    guardarAvance: async function() {
        try {
            if (!this.datos.cotizacionId) {
                alert('⚠️ Primero selecciona y carga una cotización');
                return;
            }

            var semanaInput     = document.getElementById('avance-semana')     && document.getElementById('avance-semana').value;
            var porcentajeInput = document.getElementById('avance-porcentaje') && document.getElementById('avance-porcentaje').value;
            var montoInput      = document.getElementById('avance-monto')      && document.getElementById('avance-monto').value;

            if (!semanaInput || semanaInput.trim() === '') { alert('⚠️ Completa el campo "Semana"');           return; }
            if (!porcentajeInput || porcentajeInput.trim() === '') { alert('⚠️ Completa el campo "Avance %"'); return; }

            var semana     = parseInt(semanaInput);
            var porcentaje = parseFloat(porcentajeInput);
            var monto      = montoInput ? parseFloat(montoInput) : 0;

            if (isNaN(semana) || semana <= 0)               { alert('⚠️ La semana debe ser mayor a 0');          return; }
            if (isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) { alert('⚠️ El porcentaje debe ser 0-100'); return; }

            // Guardar o actualizar (put usa cotizacionId+semana como clave lógica)
            var existente = await window.db.avanceObra
                .where('cotizacionId').equals(parseInt(this.datos.cotizacionId))
                .and(function(a) { return a.semana === semana; })
                .first();

            if (existente) {
                await window.db.avanceObra.update(existente.id, {
                    porcentajeEjecutado: porcentaje,
                    montoEjecutado: monto,
                    fecha: new Date().toISOString()
                });
            } else {
                await window.db.avanceObra.add({
                    cotizacionId: parseInt(this.datos.cotizacionId),
                    semana: semana,
                    porcentajeEjecutado: porcentaje,
                    montoEjecutado: monto,
                    fecha: new Date().toISOString()
                });
            }

            console.log('✅ Avance semana', semana, 'guardado');

            // Refrescar
            await this.actualizarGrafica();

            alert('✅ Avance semana ' + semana + ' guardado (' + porcentaje + '%)');

            // Limpiar campos
            document.getElementById('avance-semana').value     = '';
            document.getElementById('avance-porcentaje').value = '';
            document.getElementById('avance-monto').value      = '';

        } catch (error) {
            console.error('❌ Error guardando avance:', error);
            alert('❌ Error: ' + error.message);
        }
    },

    // ─────────────────────────────────────────────────────────────────
    // LIMPIAR VALORES EVM (COMPLETA)
    // ─────────────────────────────────────────────────────────────────
    limpiarValoresEVM: function() {
        // Limpiar valores monetarios EVM
        ['evm-pv','evm-ev','evm-ac','evm-cv','evm-sv','evm-eac','evm-etc','evm-vac'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) { 
                el.textContent = '$0.00'; 
                el.style.color = 'var(--ink)'; 
            }
        });
        
        // Limpiar índices EVM
        ['evm-cpi','evm-spi'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) { 
                el.textContent = '0.00'; 
                el.style.color = 'var(--ink)'; 
            }
        });
    
        // Limpiar indicadores de Curva S básica
        var elV = document.getElementById('variacion-tiempo');
        var elI = document.getElementById('indice-tiempo');
        if (elV) { elV.textContent = '0%'; elV.style.color = 'var(--ink)'; }
        if (elI) { elI.textContent = '0.00'; elI.style.color = 'var(--ink)'; }
    
        // Limpiar proyección de fecha
        ['proyeccion-semanas-restantes','proyeccion-fecha-estimada','proyeccion-velocidad'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.textContent = '—';
        });
    
        // ⚠️ LIMPIAR CURVA DE INVERSIÓN (AGREGADO)
        var elEjecutada = document.getElementById('curva-inversion-ejecutada');
        var elTotal = document.getElementById('curva-inversion-total');
        var elPorcentaje = document.getElementById('curva-inversion-porcentaje');
        var barra = document.getElementById('curva-inversion-barra');
        
        if (elEjecutada) elEjecutada.textContent = '$0.00';
        if (elTotal) elTotal.textContent = '$0.00';
        if (elPorcentaje) elPorcentaje.textContent = '0.0%';
        if (barra) barra.style.width = '0%';
    
        // Limpiar tabla de avances si existe
        var tabla = document.getElementById('tabla-avances-reales');
        if (tabla) tabla.innerHTML = '';
        
        console.log('✅ Valores EVM limpiados');
    },
    // ─────────────────────────────────────────────────────────────────
    // CURVA S AVANZADA (EVM) — SOLO ENTERPRISE
    // ─────────────────────────────────────────────────────────────────
    generarCurvaAvanzada: async function() {
        var lic = window.licencia.cargar();
        if (!lic || lic.tipo !== 'ENTERPRISE') {
            alert('❌ Curva S Avanzada solo disponible en plan ENTERPRISE');
            return;
        }

        var cotizacionId = document.getElementById('curva-s-cotizacion') &&
                           document.getElementById('curva-s-cotizacion').value;
        if (!cotizacionId) {
            alert('⚠️ Selecciona y carga una cotización primero');
            return;
        }

        this.limpiarValoresEVM();

        var seccion = document.getElementById('curva-s-avanzada-seccion');
        if (seccion) {
            seccion.style.display = 'block';
            seccion.scrollIntoView({ behavior: 'smooth' });
        }

        await this.calcularEVM();
        await this.generarCurvaInversion();
        await this.proyectarFechaTerminacion();
    },

    // ─────────────────────────────────────────────────────────────────
    // CALCULAR EVM (VERSIÓN CORREGIDA - SIN CÓDIGO DUPLICADO)
    // ─────────────────────────────────────────────────────────────────
    calcularEVM: async function() {
        try {
            console.log('📊 Calculando EVM...');
            
            const cotizacionId = document.getElementById('curva-s-cotizacion')?.value;
            if (!cotizacionId) {
                console.warn('⚠️ No hay cotización seleccionada para EVM');
                this.limpiarValoresEVM();
                return;
            }
            
            const cotizacion = await window.db.cotizaciones.get(parseInt(cotizacionId));
            if (!cotizacion) {
                console.warn('⚠️ Cotización no encontrada');
                this.limpiarValoresEVM();
                return;
            }
            
            const avances = await window.db.avanceObra
                .where('cotizacionId')
                .equals(parseInt(cotizacionId))
                .sortBy('semana');
            
            console.log('📊 Avances encontrados:', avances.length);
            
            if (avances.length === 0) {
                alert('⚠️ No hay avances registrados para calcular EVM');
                this.limpiarValoresEVM();
                return;
            }
            
            // Filtrar avances válidos
            const avancesValidos = avances.filter(a => {
                const porcentaje = a.porcentajeEjecutado || a.porcentaje || 0;
                return porcentaje >= 0 && porcentaje <= 100;
            });
            
            if (avancesValidos.length === 0) {
                alert('⚠️ Los avances registrados no tienen porcentaje válido.');
                this.limpiarValoresEVM();
                return;
            }
            
            // ⚠️ DECLARAR VARIABLES AL INICIO
            let PV = 0;  // Planned Value
            let EV = 0;  // Earned Value  
            let AC = 0;  // Actual Cost
            
            const BAC = parseFloat(cotizacion.totalFinal) || 0;
            
            if (BAC === 0) {
                console.warn('⚠️ El total del proyecto es 0');
                this.limpiarValoresEVM();
                return;
            }
            
            // ⚠️ CALCULAR EVM ITERANDO SOBRE AVANCES
            avancesValidos.forEach(function(avance, index) {
                // PV = Progresión planificada acumulada
                const progresoPlanificado = (index + 1) / avancesValidos.length;
                PV += (progresoPlanificado / avancesValidos.length) * BAC;
                
                // EV = Porcentaje ejecutado real × BAC
                const porcentajeEjecutado = parseFloat(avance.porcentajeEjecutado || avance.porcentaje || 0);
                EV += (porcentajeEjecutado / 100) * BAC;
                
                // AC = Suma acumulada de montos ejecutados
                const monto = parseFloat(avance.montoEjecutado || avance.monto || 0);
                AC += monto;
            });
            
            // ⚠️ CALCULAR INDICADORES DERIVADOS
            const CV = EV - AC;
            const SV = EV - PV;
            const CPI = AC > 0 ? EV / AC : 0;
            const SPI = PV > 0 ? EV / PV : 0;
            const EAC = CPI > 0 ? BAC / CPI : BAC;
            const ETC = EAC - AC;
            const VAC = BAC - EAC;
            
            console.log('📊 EVM Calculado:', { PV, EV, AC, CV, SV, CPI, SPI, EAC, ETC, VAC });
            
            // ⚠️ ACTUALIZAR UI
            const actualizarElemento = (id, valor, esIndice = false, esMoneda = true) => {
                const el = document.getElementById(id);
                if (!el) return;
                if (esIndice) {
                    el.textContent = valor.toFixed(2);
                    el.style.color = valor >= 1 ? 'var(--green)' : 'var(--rose)';
                } else if (esMoneda) {
                    el.textContent = calculator?.formatoMoneda?.(valor) || '$' + valor.toLocaleString();
                    if (['evm-cv','evm-sv','evm-vac'].includes(id)) {
                        el.style.color = valor >= 0 ? 'var(--green)' : 'var(--rose)';
                    } else {
                        el.style.color = 'var(--ink)';
                    }
                }
            };
            
            actualizarElemento('evm-pv', PV, false, true);
            actualizarElemento('evm-ev', EV, false, true);
            actualizarElemento('evm-ac', AC, false, true);
            actualizarElemento('evm-cv', CV, false, true);
            actualizarElemento('evm-sv', SV, false, true);
            actualizarElemento('evm-cpi', CPI, true, false);
            actualizarElemento('evm-spi', SPI, true, false);
            actualizarElemento('evm-eac', EAC, false, true);
            actualizarElemento('evm-etc', ETC, false, true);
            actualizarElemento('evm-vac', VAC, false, true);
            
            // Actualizar indicadores de Curva S básica
            const elVariacion = document.getElementById('variacion-tiempo');
            const elIndice = document.getElementById('indice-tiempo');
            if (elVariacion) {
                const v = ((SPI - 1) * 100).toFixed(1);
                elVariacion.textContent = (v >= 0 ? '+' : '') + v + '%';
                elVariacion.style.color = SPI >= 1 ? 'var(--green)' : 'var(--rose)';
            }
            if (elIndice) {
                elIndice.textContent = isNaN(SPI) ? '0.00' : SPI.toFixed(2);
                elIndice.style.color = SPI >= 1 ? 'var(--green)' : 'var(--rose)';
            }
            
            // ⚠️ ACTUALIZAR CURVA DE INVERSIÓN
            this.actualizarCurvaInversion(AC, BAC);
            
            console.log('✅ EVM actualizado correctamente');
            
        } catch (error) {
            console.error('❌ Error calculando EVM:', error);
            this.limpiarValoresEVM();
        }
    },        

    // ─────────────────────────────────────────────────────────────────
    // GENERAR CURVA DE INVERSIÓN
    // ─────────────────────────────────────────────────────────────────
    generarCurvaInversion: async function() {
        try {
            const cotizacionId = document.getElementById('curva-s-cotizacion')?.value;
            if (!cotizacionId) return;
            
            const cotizacion = await window.db.cotizaciones.get(parseInt(cotizacionId));
            if (!cotizacion) return;
            
            const avances = await window.db.avanceObra
                .where('cotizacionId')
                .equals(parseInt(cotizacionId))
                .sortBy('semana');
            
            if (avances.length === 0) {
                this.actualizarCurvaInversion(0, cotizacion.totalFinal || 0);
                return;
            }
            
            const BAC = Number(cotizacion.totalFinal) || 0;
            let AC = 0;
            
            avances.forEach(function(avance) {
                AC += Number(avance.montoEjecutado) || 0;
            });
            
            this.actualizarCurvaInversion(AC, BAC);
            
        } catch (error) {
            console.error('❌ Error en curva de inversión:', error);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // ACTUALIZAR CURVA DE INVERSIÓN (UI)
    // ─────────────────────────────────────────────────────────────────
    actualizarCurvaInversion: function(AC, BAC) {
        try {
            const ac = Number(AC) || 0;
            const bac = Number(BAC) || 0;
            
            // Actualizar textos
            const elEjecutada = document.getElementById('curva-inversion-ejecutada');
            const elTotal = document.getElementById('curva-inversion-total');
            
            if (elEjecutada) {
                elEjecutada.textContent = calculator?.formatoMoneda?.(ac) || '$' + ac.toLocaleString();
            }
            if (elTotal) {
                elTotal.textContent = calculator?.formatoMoneda?.(bac) || '$' + bac.toLocaleString();
            }
            
            // Calcular porcentaje
            const porcentaje = bac > 0 ? Math.min(100, Math.max(0, (ac / bac) * 100)) : 0;
            
            // Actualizar barra visual (por ID específico)
            const barra = document.getElementById('curva-inversion-barra');
            if (barra) {
                barra.style.width = porcentaje + '%';
            }
            
            // Actualizar etiqueta de porcentaje (por ID específico)
            const label = document.getElementById('curva-inversion-porcentaje');
            if (label) {
                label.textContent = porcentaje.toFixed(1) + '%';
            }
            
            console.log('💰 Curva de inversión:', { AC: ac, BAC: bac, porcentaje: porcentaje.toFixed(1) + '%' });
            
        } catch (error) {
            console.error('❌ Error actualizando curva de inversión:', error);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // PROYECTAR FECHA DE TERMINACIÓN
    // ─────────────────────────────────────────────────────────────────
    proyectarFechaTerminacion: async function() {
        try {
            var cotizacionId = document.getElementById('curva-s-cotizacion') &&
                               document.getElementById('curva-s-cotizacion').value;
            if (!cotizacionId) return;

            var cotizacion = await window.db.cotizaciones.get(parseInt(cotizacionId));
            if (!cotizacion) return;

            var avances = await window.db.avanceObra
                .where('cotizacionId').equals(parseInt(cotizacionId)).toArray();

            var validos = avances.filter(function(a) {
                return a.semana > 0 && parseFloat(a.porcentajeEjecutado || 0) > 0;
            }).sort(function(a, b) { return a.semana - b.semana; });

            var na = '—';
            var elSR  = document.getElementById('proyeccion-semanas-restantes');
            var elFE  = document.getElementById('proyeccion-fecha-estimada');
            var elVel = document.getElementById('proyeccion-velocidad');

            if (validos.length < 2) {
                if (elSR) elSR.textContent = 'Insuficiente datos';
                if (elFE) elFE.textContent = na;
                if (elVel) elVel.textContent = na;
                return;
            }

            var ultimo     = validos[validos.length - 1];
            var avanceActual = parseFloat(ultimo.porcentajeEjecutado || 0);
            var semanaActual = parseInt(ultimo.semana);
            var velocidad    = avanceActual / semanaActual;
            var semanasTotales = velocidad > 0 ? Math.ceil(100 / velocidad) : 0;
            var semanasRestantes = Math.max(0, semanasTotales - semanaActual);

            var fechaInicio = new Date(cotizacion.fechaInicio || Date.now());
            var fechaEst = new Date(fechaInicio);
            fechaEst.setDate(fechaInicio.getDate() + (semanasTotales * 7));

            if (elSR)  { elSR.textContent  = semanasRestantes + ' semanas'; elSR.style.color = semanasRestantes > 10 ? 'var(--rose)' : 'var(--amber)'; }
            if (elFE)  { elFE.textContent  = fechaEst.toLocaleDateString('es-MX'); }
            if (elVel) { elVel.textContent = velocidad.toFixed(2) + '%/semana'; elVel.style.color = velocidad >= 5 ? 'var(--green)' : 'var(--amber)'; }

        } catch (error) {
            console.error('❌ Error proyectando fecha:', error);
        }
    },

    // ─────────────────────────────────────────────────────────────────
    // GENERAR CONCLUSIÓN AUTOMÁTICA (EXTENSA Y PROFESIONAL)
    // ─────────────────────────────────────────────────────────────────
    generarConclusionEVM: function() {
        try {
            // Obtener valores de los elementos DOM
            const cpi = parseFloat(document.getElementById('evm-cpi')?.textContent) || 0;
            const spi = parseFloat(document.getElementById('evm-spi')?.textContent) || 0;
            const cvTexto = document.getElementById('evm-cv')?.textContent || '$0.00';
            const svTexto = document.getElementById('evm-sv')?.textContent || '$0.00';
            const cv = parseFloat(cvTexto.replace(/[^0-9.-]/g, '')) || 0;
            const sv = parseFloat(svTexto.replace(/[^0-9.-]/g, '')) || 0;
            const eacTexto = document.getElementById('evm-eac')?.textContent || '$0.00';
            const vacTexto = document.getElementById('evm-vac')?.textContent || '$0.00';
            const eac = parseFloat(eacTexto.replace(/[^0-9.-]/g, '')) || 0;
            const vac = parseFloat(vacTexto.replace(/[^0-9.-]/g, '')) || 0;
            
            let conclusion = '';
            let color = '#1a1a1a';
            
            // ─────────────────────────────────────────────────────────
            // ANÁLISIS DE COSTO (CPI y CV)
            // ─────────────────────────────────────────────────────────
            conclusion += 'ANÁLISIS DE COSTO:\n';
            if (cpi >= 1.0) {
                conclusion += '• El Índice de Desempeño de Costo (CPI = ' + cpi.toFixed(2) + ') indica que el proyecto está dentro o por debajo del presupuesto. ';
                if (cpi > 1.1) {
                    conclusion += 'Existe una eficiencia superior al 10%, lo que sugiere una gestión óptima de recursos. ';
                } else {
                    conclusion += 'La eficiencia es adecuada, manteniéndose dentro de los parámetros esperados. ';
                }
            } else if (cpi >= 0.9) {
                conclusion += '• El CPI de ' + cpi.toFixed(2) + ' muestra una ligera desviación en costos (' + (cpi < 1 ? 'sobrecosto' : 'ahorro') + ' del ' + ((1 - cpi) * 100).toFixed(1) + '%). ';
                conclusion += 'Se recomienda monitorear de cerca los gastos y revisar las partidas con mayor variación. ';
                color = '#d97706';
            } else {
                conclusion += '• El CPI de ' + cpi.toFixed(2) + ' indica un sobrecosto significativo del ' + ((1 - cpi) * 100).toFixed(1) + '%. ';
                conclusion += 'La Variación de Costo (CV) de ' + cvTexto + ' confirma esta situación. ';
                conclusion += 'Se requiere una acción correctiva inmediata: revisar alcances, renegociar con proveedores o ajustar el presupuesto. ';
                color = '#dc2626';
            }
            conclusion += '\n\n';
            
            // ─────────────────────────────────────────────────────────
            // ANÁLISIS DE TIEMPO (SPI y SV)
            // ─────────────────────────────────────────────────────────
            conclusion += 'ANÁLISIS DE TIEMPO:\n';
            if (spi >= 1.0) {
                conclusion += '• El Índice de Desempeño de Tiempo (SPI = ' + spi.toFixed(2) + ') muestra que el proyecto está en tiempo o adelantado. ';
                if (spi > 1.1) {
                    conclusion += 'El avance es superior al planificado en un ' + ((spi - 1) * 100).toFixed(1) + '%, lo que permite considerar la entrega anticipada. ';
                } else {
                    conclusion += 'El cronograma se está cumpliendo según lo establecido. ';
                }
            } else if (spi >= 0.9) {
                conclusion += '• El SPI de ' + spi.toFixed(2) + ' refleja un ligero retraso del ' + ((1 - spi) * 100).toFixed(1) + '%. ';
                conclusion += 'La Variación de Tiempo (SV) de ' + svTexto + ' confirma esta desviación. ';
                conclusion += 'Se sugiere revisar la ruta crítica y considerar la asignación de recursos adicionales para recuperar el tiempo. ';
                if (color === '#1a1a1a') color = '#d97706';
            } else {
                conclusion += '• El SPI de ' + spi.toFixed(2) + ' indica un retraso crítico del ' + ((1 - spi) * 100).toFixed(1) + '%. ';
                conclusion += 'La SV de ' + svTexto + ' representa el valor del trabajo no completado según el cronograma. ';
                conclusion += 'Se requiere replanificación urgente: revisar dependencias, considerar fast-tracking o crashing, y comunicar el impacto al cliente. ';
                color = '#dc2626';
            }
            conclusion += '\n\n';
            
            // ─────────────────────────────────────────────────────────
            // PROYECCIÓN FINAL (EAC y VAC)
            // ─────────────────────────────────────────────────────────
            conclusion += 'PROYECCIÓN FINAL:\n';
            conclusion += '• El Estimado al Completar (EAC) es de ' + eacTexto + ', basado en el desempeño actual. ';
            if (vac >= 0) {
                conclusion += 'La Variación al Completar (VAC) de ' + vacTexto + ' proyecta un ahorro final. ';
                conclusion += 'Si se mantiene el desempeño actual, el proyecto finalizará dentro del presupuesto. ';
            } else {
                conclusion += 'La VAC de ' + vacTexto + ' proyecta un sobrecosto final. ';
                conclusion += 'De no implementarse acciones correctivas, el proyecto excederá el presupuesto original en esta cantidad. ';
                if (color === '#1a1a1a') color = '#d97706';
            }
            conclusion += '\n\n';
            
            // ─────────────────────────────────────────────────────────
            // RECOMENDACIÓN FINAL
            // ─────────────────────────────────────────────────────────
            conclusion += 'RECOMENDACIÓN GENERAL:\n';
            if (cpi >= 1.0 && spi >= 1.0) {
                conclusion += '✅ PROYECTO SALUDABLE: El proyecto muestra un desempeño óptimo en costo y tiempo. Continuar con la ejecución planificada, manteniendo el monitoreo periódico de los indicadores EVM. Considerar documentar las mejores prácticas aplicadas para futuros proyectos.';
            } else if (cpi < 1.0 && spi < 1.0) {
                conclusion += '🔴 PROYECTO EN RIESGO CRÍTICO: El proyecto presenta desviaciones significativas en costo y tiempo. Se recomienda: (1) Convocar una reunión de revisión con el equipo y stakeholders, (2) Realizar un análisis de causa raíz de las desviaciones, (3) Desarrollar un plan de recuperación con hitos intermedios, (4) Considerar solicitud de cambio de presupuesto o cronograma si las desviaciones son justificadas.';
                color = '#dc2626';
            } else if (cpi >= 1.0 && spi < 1.0) {
                conclusion += '🟡 PROYECTO CON RETRASO PERO CONTROLADO EN COSTO: El proyecto está atrasado pero dentro del presupuesto. Se recomienda: (1) Evaluar la posibilidad de asignar recursos adicionales (crashing), (2) Revisar dependencias para aplicar fast-tracking, (3) Priorizar actividades de la ruta crítica, (4) Comunicar el impacto en el cronograma al cliente.';
                if (color === '#1a1a1a') color = '#d97706';
            } else {
                conclusion += '🟡 PROYECTO CON SOBRECOSTO PERO EN TIEMPO: El proyecto está en tiempo pero excede el presupuesto. Se recomienda: (1) Revisar partidas con mayor variación de costo, (2) Renegociar con proveedores, (3) Evaluar reducción de alcances no críticos, (4) Documentar lecciones aprendidas para mejorar estimaciones futuras.';
                if (color === '#1a1a1a') color = '#d97706';
            }
            
            return { texto: conclusion, color: color };
            
        } catch (error) {
            console.error('❌ Error generando conclusión:', error);
            return { 
                texto: 'No se pudo generar la conclusión automática. Verifique que los indicadores EVM estén calculados correctamente.', 
                color: '#1a1a1a' 
            };
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // EXPORTAR REPORTE PDF (PROFESIONAL - CORREGIDO Y MEJORADO)
    // ─────────────────────────────────────────────────────────────────
    exportarReportePDF: async function() {
        try {
            if (typeof window.jspdf === 'undefined') {
                alert('⚠️ jsPDF no está cargado. Verifica que el script esté incluido.');
                return;
            }
            if (!this.datos.cotizacionId) {
                alert('⚠️ Primero carga una cotización');
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // ─────────────────────────────────────────────────────────
            // ESTILOS PROFESIONALES
            // ─────────────────────────────────────────────────────────
            const colores = {
                primario: '#1a1a1a',
                secundario: '#4a4a4a',
                acento: '#2563eb',
                exito: '#16a34a',
                advertencia: '#d97706',
                peligro: '#dc2626',
                fondo: '#f8fafc'
            };
            
            const fuentes = {
                titulo: { family: 'helvetica', size: 16, style: 'bold' },
                seccion: { family: 'helvetica', size: 12, style: 'bold' },
                subseccion: { family: 'helvetica', size: 10, style: 'bold' },
                normal: { family: 'helvetica', size: 9, style: 'normal' },
                pequeno: { family: 'helvetica', size: 8, style: 'normal' }
            };
            
            // ─────────────────────────────────────────────────────────
            // ENCABEZADO
            // ─────────────────────────────────────────────────────────
            doc.setFillColor(colores.primario);
            doc.rect(0, 0, 210, 35, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFont(fuentes.titulo.family, fuentes.titulo.style);
            doc.setFontSize(fuentes.titulo.size);
            doc.text('CURVA S - SEGUIMIENTO DE OBRA', 105, 18, { align: 'center' });
            
            doc.setFont(fuentes.normal.family, fuentes.normal.style);
            doc.setFontSize(fuentes.pequeno.size);
            doc.text('SmartCot v2.0 — Reporte Ejecutivo de Avance', 105, 26, { align: 'center' });
            doc.text('Generado: ' + new Date().toLocaleDateString('es-MX') + ' ' + new Date().toLocaleTimeString('es-MX'), 105, 31, { align: 'center' });
            
            // ─────────────────────────────────────────────────────────
            // INFORMACIÓN DE LA COTIZACIÓN
            // ─────────────────────────────────────────────────────────
            let yPos = 45;
            const cotizacion = await window.db.cotizaciones.get(parseInt(this.datos.cotizacionId));
            if (!cotizacion) {
                alert('❌ Cotización no encontrada');
                return;
            }
            
            doc.setTextColor(colores.primario);
            doc.setFont(fuentes.subseccion.family, fuentes.subseccion.style);
            doc.setFontSize(fuentes.subseccion.size);
            doc.text('INFORMACIÓN DEL PROYECTO', 15, yPos);
            yPos += 2;
            doc.setDrawColor(colores.acento);
            doc.setLineWidth(0.5);
            doc.line(15, yPos, 195, yPos);
            yPos += 5;
            
            doc.setFont(fuentes.normal.family, fuentes.normal.style);
            doc.setFontSize(fuentes.pequeno.size);
            doc.text('Cotización #' + this.datos.cotizacionId, 15, yPos);
            doc.text('Cliente: ' + (this.datos.cliente || 'Sin cliente'), 105, yPos);
            yPos += 5;
            doc.text('Total Proyecto: ' + calculator.formatoMoneda(cotizacion.totalFinal || 0), 15, yPos);
            doc.text('Fecha de Reporte: ' + new Date().toLocaleDateString('es-MX'), 105, yPos);
            
            // ─────────────────────────────────────────────────────────
            // INDICADORES DE DESEMPEÑO (SEPARADO Y PROFESIONAL)
            // ─────────────────────────────────────────────────────────
            yPos += 12;
            doc.setFillColor(colores.fondo);
            doc.roundedRect(15, yPos - 3, 180, 22, 3, 3, 'F');
            
            doc.setTextColor(colores.acento);
            doc.setFont(fuentes.seccion.family, fuentes.seccion.style);
            doc.setFontSize(fuentes.seccion.size);
            doc.text('INDICADORES DE DESEMPEÑO', 20, yPos);
            yPos += 2;
            doc.setDrawColor(colores.acento);
            doc.setLineWidth(0.5);
            doc.line(20, yPos, 190, yPos);
            yPos += 6;
            
            this.calcularVariaciones();
            const variacion = this.ultimaVariacion || 0;
            const indice = this.ultimoIndice || 0;
            const semana = this.ultimaSemana || 0;
            
            doc.setTextColor(colores.primario);
            doc.setFont(fuentes.pequeno.family, fuentes.pequeno.style);
            doc.setFontSize(fuentes.pequeno.size);
            
            // Caja de semana actual
            doc.setFillColor('#e0f2fe');
            doc.roundedRect(20, yPos - 4, 50, 12, 2, 2, 'F');
            doc.setTextColor(colores.acento);
            doc.setFont(fuentes.subseccion.family, fuentes.subseccion.style);
            doc.text('Semana ' + semana, 45, yPos, { align: 'center' });
            
            // Caja de desviación
            const colorDesviacion = variacion >= 0 ? colores.exito : colores.peligro;
            doc.setFillColor(variacion >= 0 ? '#dcfce7' : '#fee2e2');
            doc.roundedRect(75, yPos - 4, 55, 12, 2, 2, 'F');
            doc.setTextColor(colorDesviacion);
            doc.setFont(fuentes.subseccion.family, fuentes.subseccion.style);
            doc.text('Desviación: ' + (variacion >= 0 ? '+' : '') + variacion.toFixed(1) + '%', 102, yPos, { align: 'center' });
            
            // Caja de SPI
            const colorSPI = indice >= 1 ? colores.exito : (indice >= 0.9 ? colores.advertencia : colores.peligro);
            doc.setFillColor(indice >= 1 ? '#dcfce7' : (indice >= 0.9 ? '#fef3c7' : '#fee2e2'));
            doc.roundedRect(135, yPos - 4, 55, 12, 2, 2, 'F');
            doc.setTextColor(colorSPI);
            doc.setFont(fuentes.subseccion.family, fuentes.subseccion.style);
            doc.text('SPI: ' + indice.toFixed(2), 162, yPos, { align: 'center' });
            
            yPos += 18;
            
            // ─────────────────────────────────────────────────────────
            // VALOR GANADO (EVM) - SEPARADO
            // ─────────────────────────────────────────────────────────
            yPos += 8;
            doc.setFillColor(colores.fondo);
            doc.roundedRect(15, yPos - 3, 180, 35, 3, 3, 'F');
            
            doc.setTextColor(colores.primario);
            doc.setFont(fuentes.seccion.family, fuentes.seccion.style);
            doc.setFontSize(fuentes.seccion.size);
            doc.text('VALOR GANADO (EVM)', 20, yPos);
            yPos += 2;
            doc.setDrawColor(colores.acento);
            doc.setLineWidth(0.5);
            doc.line(20, yPos, 190, yPos);
            yPos += 6;
            
            doc.setFont(fuentes.pequeno.family, fuentes.pequeno.style);
            doc.setFontSize(fuentes.pequeno.size);
            doc.setTextColor(colores.secundario);
            
            // Obtener valores de los elementos HTML
            const elPV = document.getElementById('evm-pv');
            const elEV = document.getElementById('evm-ev');
            const elAC = document.getElementById('evm-ac');
            const elCV = document.getElementById('evm-cv');
            const elSV = document.getElementById('evm-sv');
            const elCPI = document.getElementById('evm-cpi');
            const elSPI = document.getElementById('evm-spi');
            const elEAC = document.getElementById('evm-eac');
            const elETC = document.getElementById('evm-etc');
            const elVAC = document.getElementById('evm-vac');
            
            // Fila 1
            doc.text('PV (Valor Planificado):', 20, yPos);
            doc.setTextColor(colores.primario);
            doc.setFont(fuentes.subseccion.family, fuentes.subseccion.style);
            doc.text((elPV ? elPV.textContent : '$0.00'), 90, yPos);
            doc.setTextColor(colores.secundario);
            doc.setFont(fuentes.pequeno.family, fuentes.pequeno.style);
            doc.text('EV (Valor Ganado):', 120, yPos);
            doc.setTextColor(colores.primario);
            doc.setFont(fuentes.subseccion.family, fuentes.subseccion.style);
            doc.text((elEV ? elEV.textContent : '$0.00'), 190, yPos, { align: 'right' });
            yPos += 5;
            
            // Fila 2
            doc.setTextColor(colores.secundario);
            doc.setFont(fuentes.pequeno.family, fuentes.pequeno.style);
            doc.text('AC (Costo Actual):', 20, yPos);
            doc.setTextColor(colores.primario);
            doc.setFont(fuentes.subseccion.family, fuentes.subseccion.style);
            doc.text((elAC ? elAC.textContent : '$0.00'), 90, yPos);
            doc.setTextColor(colores.secundario);
            doc.setFont(fuentes.pequeno.family, fuentes.pequeno.style);
            doc.text('CV (Variación Costo):', 120, yPos);
            const cvValor = elCV ? elCV.textContent : '$0.00';
            doc.setTextColor(cvValor.includes('-') ? colores.peligro : colores.exito);
            doc.setFont(fuentes.subseccion.family, fuentes.subseccion.style);
            doc.text(cvValor, 190, yPos, { align: 'right' });
            yPos += 5;
            
            // Fila 3
            doc.setTextColor(colores.secundario);
            doc.setFont(fuentes.pequeno.family, fuentes.pequeno.style);
            doc.text('SV (Variación Tiempo):', 20, yPos);
            const svValor = elSV ? elSV.textContent : '$0.00';
            doc.setTextColor(svValor.includes('-') ? colores.peligro : colores.exito);
            doc.setFont(fuentes.subseccion.family, fuentes.subseccion.style);
            doc.text(svValor, 90, yPos);
            doc.setTextColor(colores.secundario);
            doc.setFont(fuentes.pequeno.family, fuentes.pequeno.style);
            doc.text('CPI (Índice Costo):', 120, yPos);
            const cpiValor = elCPI ? elCPI.textContent : '0.00';
            doc.setTextColor(parseFloat(cpiValor) >= 1 ? colores.exito : colores.peligro);
            doc.setFont(fuentes.subseccion.family, fuentes.subseccion.style);
            doc.text(cpiValor, 190, yPos, { align: 'right' });
            yPos += 5;
            
            // Fila 4
            doc.setTextColor(colores.secundario);
            doc.setFont(fuentes.pequeno.family, fuentes.pequeno.style);
            doc.text('SPI (Índice Tiempo):', 20, yPos);
            const spiValor = elSPI ? elSPI.textContent : '0.00';
            doc.setTextColor(parseFloat(spiValor) >= 1 ? colores.exito : colores.peligro);
            doc.setFont(fuentes.subseccion.family, fuentes.subseccion.style);
            doc.text(spiValor, 90, yPos);
            doc.setTextColor(colores.secundario);
            doc.setFont(fuentes.pequeno.family, fuentes.pequeno.style);
            doc.text('EAC (Estimado Final):', 120, yPos);
            doc.setTextColor(colores.primario);
            doc.setFont(fuentes.subseccion.family, fuentes.subseccion.style);
            doc.text((elEAC ? elEAC.textContent : '$0.00'), 190, yPos, { align: 'right' });
            
            // ─────────────────────────────────────────────────────────
            // PROYECCIÓN DE TERMINACIÓN (SEPARADO)
            // ─────────────────────────────────────────────────────────
            yPos += 12;
            doc.setFillColor(colores.fondo);
            doc.roundedRect(15, yPos - 3, 180, 18, 3, 3, 'F');
            
            doc.setTextColor(colores.acento);
            doc.setFont(fuentes.seccion.family, fuentes.seccion.style);
            doc.setFontSize(fuentes.seccion.size);
            doc.text('PROYECCIÓN DE TERMINACIÓN', 20, yPos);
            yPos += 2;
            doc.setDrawColor(colores.acento);
            doc.setLineWidth(0.5);
            doc.line(20, yPos, 190, yPos);
            yPos += 6;
            
            doc.setFont(fuentes.pequeno.family, fuentes.pequeno.style);
            doc.setFontSize(fuentes.pequeno.size);
            doc.setTextColor(colores.secundario);
            
            const elSemanasRestantes = document.getElementById('proyeccion-semanas-restantes');
            const elFechaEstimada = document.getElementById('proyeccion-fecha-estimada');
            const elVelocidad = document.getElementById('proyeccion-velocidad');
            
            doc.text('Semanas Restantes:', 20, yPos);
            doc.setTextColor(colores.primario);
            doc.setFont(fuentes.subseccion.family, fuentes.subseccion.style);
            doc.text((elSemanasRestantes ? elSemanasRestantes.textContent : 'N/A'), 75, yPos);
            
            doc.setTextColor(colores.secundario);
            doc.setFont(fuentes.pequeno.family, fuentes.pequeno.style);
            doc.text('Fecha Estimada:', 105, yPos);
            doc.setTextColor(colores.primario);
            doc.setFont(fuentes.subseccion.family, fuentes.subseccion.style);
            doc.text((elFechaEstimada ? elFechaEstimada.textContent : 'N/A'), 155, yPos);
            yPos += 5;
            
            doc.setTextColor(colores.secundario);
            doc.setFont(fuentes.pequeno.family, fuentes.pequeno.style);
            doc.text('Velocidad de Avance:', 20, yPos);
            doc.setTextColor(colores.primario);
            doc.setFont(fuentes.subseccion.family, fuentes.subseccion.style);
            doc.text((elVelocidad ? elVelocidad.textContent : 'N/A'), 75, yPos);
            
            // ─────────────────────────────────────────────────────────
            // CURVA DE INVERSIÓN (SEPARADO)
            // ─────────────────────────────────────────────────────────
            yPos += 12;
            doc.setFillColor(colores.fondo);
            doc.roundedRect(15, yPos - 3, 180, 15, 3, 3, 'F');
            
            doc.setTextColor('#ea580c');
            doc.setFont(fuentes.seccion.family, fuentes.seccion.style);
            doc.setFontSize(fuentes.seccion.size);
            doc.text('CURVA DE INVERSIÓN', 20, yPos);
            yPos += 2;
            doc.setDrawColor('#ea580c');
            doc.setLineWidth(0.5);
            doc.line(20, yPos, 190, yPos);
            yPos += 6;
            
            doc.setFont(fuentes.pequeno.family, fuentes.pequeno.style);
            doc.setFontSize(fuentes.pequeno.size);
            doc.setTextColor(colores.secundario);
            
            const elInversionTotal = document.getElementById('curva-inversion-total');
            doc.text('Inversión Total Acumulada:', 20, yPos);
            doc.setTextColor(colores.primario);
            doc.setFont(fuentes.subseccion.family, fuentes.subseccion.style);
            doc.text((elInversionTotal ? elInversionTotal.textContent : '$0.00'), 90, yPos);
            
            // ─────────────────────────────────────────────────────────
            // ESPACIO ANTES DE LA GRÁFICA
            // ─────────────────────────────────────────────────────────
            yPos += 12;
            
            // ─────────────────────────────────────────────────────────
            // GRÁFICA
            // ─────────────────────────────────────────────────────────
            const canvas = document.getElementById('curva-s-chart');
            if (canvas) {
                const imgData = canvas.toDataURL('image/png', 1.0);
                doc.addImage(imgData, 'PNG', 15, yPos, 180, 100);
                yPos += 110;
            }
            
            // ─────────────────────────────────────────────────────────
            // ESPACIO ANTES DE LA TABLA
            // ─────────────────────────────────────────────────────────
            yPos += 8;
            
            // Verificar si hay espacio suficiente
            if (yPos > 220) {
                doc.addPage();
                yPos = 20;
            }
            
            // ─────────────────────────────────────────────────────────
            // TABLA DE AVANCE POR SEMANA
            // ─────────────────────────────────────────────────────────
            doc.setFillColor('#f0fdf4');
            doc.roundedRect(15, yPos - 3, 180, 5, 3, 3, 'F');
            
            doc.setTextColor(colores.exito);
            doc.setFont(fuentes.seccion.family, fuentes.seccion.style);
            doc.setFontSize(fuentes.seccion.size);
            doc.text('AVANCE POR SEMANA', 20, yPos);
            yPos += 2;
            doc.setDrawColor(colores.exito);
            doc.setLineWidth(0.5);
            doc.line(20, yPos, 190, yPos);
            yPos += 6;
            
            doc.setFont(fuentes.subseccion.family, fuentes.subseccion.style);
            doc.setFontSize(fuentes.pequeno.size);
            doc.setTextColor(colores.primario);
            doc.text('Semana', 20, yPos);
            doc.text('Programado', 55, yPos);
            doc.text('Ejecutado', 95, yPos);
            doc.text('Desviación', 135, yPos);
            doc.text('Estado', 170, yPos);
            yPos += 2;
            doc.setDrawColor('#cbd5e1');
            doc.setLineWidth(0.3);
            doc.line(15, yPos, 195, yPos);
            yPos += 5;
            
            doc.setFont(fuentes.normal.family, fuentes.normal.style);
            doc.setFontSize(fuentes.pequeno.size);
            
            this.datos.semanas.forEach(function(semana, index) {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                    // Re-encabezado en nueva página
                    doc.setFont(fuentes.subseccion.family, fuentes.subseccion.style);
                    doc.text('Semana', 20, yPos);
                    doc.text('Programado', 55, yPos);
                    doc.text('Ejecutado', 95, yPos);
                    doc.text('Desviación', 135, yPos);
                    doc.text('Estado', 170, yPos);
                    yPos += 5;
                }
                
                const programado = this.datos.avanceProgramado[index] || 0;
                const ejecutado = this.datos.avanceEjecutado[index] || 0;
                const desviacion = ejecutado - programado;
                
                let estado = '';
                let colorEstado = colores.secundario;
                if (ejecutado === 0 && programado === 0) {
                    estado = 'Pendiente';
                    colorEstado = colores.secundario;
                } else if (desviacion >= 0) {
                    estado = 'Adelantado';
                    colorEstado = colores.exito;
                } else if (desviacion >= -5) {
                    estado = 'Ligero atraso';
                    colorEstado = colores.advertencia;
                } else {
                    estado = 'Atrasado';
                    colorEstado = colores.peligro;
                }
                
                doc.setTextColor(colores.secundario);
                doc.text(semana.replace('Sem ', 'S'), 20, yPos);
                
                doc.setTextColor(colores.acento);
                doc.text(programado.toFixed(1) + '%', 55, yPos);
                
                doc.setTextColor(ejecutado > 0 ? colores.primario : colores.secundario);
                doc.text(ejecutado > 0 ? ejecutado.toFixed(1) + '%' : '—', 95, yPos);
                
                doc.setTextColor(desviacion >= 0 ? colores.exito : colores.peligro);
                doc.text((desviacion >= 0 ? '+' : '') + desviacion.toFixed(1) + '%', 135, yPos);
                
                doc.setTextColor(colorEstado);
                doc.text(estado, 170, yPos);
                yPos += 5;
            }.bind(this));
            
            // ─────────────────────────────────────────────────────────
            // CONCLUSIÓN AUTOMÁTICA (EXTENSA Y PROFESIONAL)
            // ─────────────────────────────────────────────────────────
            yPos += 10;
            
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }
            
            const conclusion = this.generarConclusionEVM();
            
            doc.setFillColor('#f8fafc');
            doc.roundedRect(15, yPos - 3, 180, 3, 3, 3, 'F');
            
            doc.setTextColor(colores.primario);
            doc.setFont(fuentes.seccion.family, fuentes.seccion.style);
            doc.setFontSize(fuentes.seccion.size);
            doc.text('ANÁLISIS Y CONCLUSIONES', 20, yPos);
            yPos += 2;
            doc.setDrawColor(colores.acento);
            doc.setLineWidth(0.5);
            doc.line(20, yPos, 190, yPos);
            yPos += 6;
            
            doc.setFont(fuentes.normal.family, fuentes.normal.style);
            doc.setFontSize(fuentes.pequeno.size);
            doc.setTextColor(colores.secundario);
            
            // Dividir texto en líneas de 85 caracteres para que no se salga
            const lineasConclusion = doc.splitTextToSize(conclusion.texto, 170);
            
            // Si hay muchas líneas, agregar páginas adicionales
            lineasConclusion.forEach((linea, i) => {
                if (yPos > 280) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.setTextColor(colores.secundario);
                doc.text(linea, 20, yPos + (i * 5));
            });
            
            yPos += (lineasConclusion.length * 5) + 5;
            
            // ─────────────────────────────────────────────────────────
            // PIE DE PÁGINA
            // ─────────────────────────────────────────────────────────
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(fuentes.pequeno.size);
                doc.setTextColor('#94a3b8');
                doc.text('Página ' + i + ' de ' + pageCount, 105, 290, { align: 'center' });
                doc.text('Generado por SmartCot v2.0 — ' + new Date().toLocaleDateString('es-MX'), 15, 295);
            }
            
            // ─────────────────────────────────────────────────────────
            // GUARDAR PDF
            // ─────────────────────────────────────────────────────────
            const nombreArchivo = 'Curva-S-Cotizacion-' + this.datos.cotizacionId + '-Reporte.pdf';
            doc.save(nombreArchivo);
            console.log('✅ Reporte PDF exportado:', nombreArchivo);
            alert('✅ Reporte exportado exitosamente\n\nIncluye:\n• Indicadores de Desempeño\n• Valor Ganado (EVM)\n• Proyección de Terminación\n• Curva de Inversión\n• Gráfica de Avance\n• Tabla de Desviaciones\n• Análisis y Conclusiones');
        } catch (error) {
            console.error('❌ Error exportando reporte PDF:', error);
            alert('❌ Error al exportar reporte: ' + error.message);
        }
    }
}
