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
    // GENERAR TABLA DE AVANCE CON SEMANA ACTUAL RESALTADA
    // ─────────────────────────────────────────────────────────────────
    generarTablaAvance: function() {
        try {
            const tbody = document.querySelector('#curva-s-screen table tbody');
            if (!tbody) {
                console.error('❌ No se encontró tbody para tabla de avance');
                return;
            }
            
            // ⚠️ ENCONTRAR SEMANA ACTUAL (última con avance > 0)
            let semanaActual = 0;
            for (let i = this.datos.avanceEjecutado.length - 1; i >= 0; i--) {
                if (this.datos.avanceEjecutado[i] > 0) {
                    semanaActual = i + 1;  // Las semanas empiezan en 1
                    break;
                }
            }
            
            console.log('📍 Semana actual para tabla:', semanaActual);
            
            // ⚠️ GENERAR FILAS
            let html = '';
            this.datos.semanas.forEach((semana, index) => {
                const numSemana = index + 1;
                const programado = this.datos.avanceProgramado[index] || 0;
                const ejecutado = this.datos.avanceEjecutado[index] || 0;
                const desviacion = ejecutado - programado;
                
                // ⚠️ CLASE ESPECIAL PARA SEMANA ACTUAL
                const esSemanaActual = (numSemana === semanaActual);
                const claseFila = esSemanaActual ? 'style="background:var(--blue-l);font-weight:700;"' : '';
                const indicador = esSemanaActual ? ' ◀' : '';
                
                // ⚠️ COLOR DE DESVIACIÓN
                let colorDesviacion = desviacion >= 0 ? 'var(--green)' : 'var(--rose)';
                
                html += '<tr ' + claseFila + '>' +
                    '<td style="padding:8px 14px;font-family:var(--mono);font-size:12px;">S' + numSemana + indicador + '</td>' +
                    '<td style="padding:8px 14px;font-family:var(--mono);font-size:12px;color:var(--indigo);">' + programado.toFixed(1) + '%</td>' +
                    '<td style="padding:8px 14px;font-family:var(--mono);font-size:12px;color:var(--blue);">' + (ejecutado > 0 ? ejecutado.toFixed(1) + '%' : '—') + '</td>' +
                    '<td style="padding:8px 14px;font-size:11px;color:' + colorDesviacion + ';font-family:var(--mono);font-weight:600;">' + 
                        (ejecutado > 0 ? (desviacion >= 0 ? '+' : '') + desviacion.toFixed(1) + '%' : '—') + 
                    '</td>' +
                    '</tr>';
            });
            
            tbody.innerHTML = html;
            console.log('✅ Tabla de avance generada');
        } catch (error) {
            console.error('❌ Error generando tabla:', error);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CARGAR COTIZACIÓN SELECCIONADA
    // ─────────────────────────────────────────────────────────────────
    cargarCotizacion: async function() {
        try {
            var cotizacionId = document.getElementById('curva-s-cotizacion') &&
                               document.getElementById('curva-s-cotizacion').value;

            if (!cotizacionId) {
                alert('⚠️ Selecciona una cotización');
                return;
            }

            this.limpiarValoresEVM();

            var cotizacion = await window.db.cotizaciones.get(parseInt(cotizacionId));
            if (!cotizacion) {
                alert('❌ Cotización no encontrada');
                return;
            }

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

            // Inicializar gráfica DESPUÉS de tener datos
            var self = this;
            setTimeout(function() {
                self.inicializarGrafica();
                self.actualizarGrafica();
            }, 300);

            // Variaciones y tabla
            this.calcularVariaciones();
            this.renderizarTablaAvances();

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
            this.datos.avanceEjecutado = new Array(this.datos.semanas.length).fill(null);
            this.datos.montoEjecutado  = new Array(this.datos.semanas.length).fill(0);

            if (!this.datos.cotizacionId) return;

            var avances = await window.db.avanceObra
                .where('cotizacionId')
                .equals(parseInt(this.datos.cotizacionId))
                .toArray();

            console.log('📊 Registros de avance encontrados:', avances.length, avances);

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
            if (!canvas) {
                console.error('❌ Canvas curva-s-chart no encontrado');
                return;
            }

            var ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('❌ No se pudo obtener contexto 2D');
                return;
            }

            // Destruir gráfica anterior si existe
            if (this.grafica) {
                this.grafica.destroy();
                this.grafica = null;
            }

            // Colores del tema activo
            var colorGrid    = this._css('--border');
            var colorTick    = this._css('--ink4');
            var colorTitle   = this._css('--ink3');
            var colorTooltipBg = this._css('--white');
            var colorTooltipTxt = this._css('--ink');

            // Configurar tamaño
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            
            // ⚠️ CALCULAR SEMANA ACTUAL (última con avance registrado)
            const semanaActual = this.datos.avanceEjecutado.findIndex((v, i) => {
                return v > 0 && (this.datos.avanceEjecutado[i + 1] === 0 || i === this.datos.avanceEjecutado.length - 1);
            }) + 1;
            
            console.log('📍 Semana actual detectada:', semanaActual);
            
            this.grafica = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: this.datos.semanas,
                    datasets: [
                        {
                            label: 'Programado (%)',
                            data: this.datos.avanceProgramado,
                            borderColor: '#7c6ff0',
                            backgroundColor: 'rgba(124,111,240,0.08)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 3,
                            pointHoverRadius: 6
                        },
                        {
                            label: 'Ejecutado (%)',
                            data: this.datos.avanceEjecutado,
                            borderColor: '#4d8ef0',
                            backgroundColor: 'rgba(77,142,240,0.08)',
                            borderWidth: 3,
                            borderDash: [6, 3],
                            fill: true,
                            tension: 0.4,
                            pointRadius: 5,
                            pointBackgroundColor: '#4d8ef0',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2                           
                            pointHoverRadius: 7,
                            spanGaps: false
                        }
                        // ⚠️ DATASET PARA LÍNEA VERTICAL DE SEMANA ACTUAL
                        {
                            label: 'Semana Actual',
                             new Array(this.datos.semanas.length).fill(null),
                            borderColor: '#f0436a',
                            borderWidth: 2,
                            borderDash: [4, 3],  // ✅ PUNTEADA ROJA
                            pointRadius: 0,
                            fill: false
                        }                        
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: '#e8edf5',
                                font: { family: "'Outfit', sans-serif", size: 12 },
                                padding: 20
                            }
                        },
                        tooltip: {
                            backgroundColor: '#1e2330',
                            titleColor: '#e8edf5',
                            bodyColor: '#c4cde0',
                            borderColor: '#2a3347',
                            borderWidth: 1,
                            padding: 12,
                            callbacks: {
                                label: function(ctx) {
                                    return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: '#2a3347' },
                            ticks: {
                                color: '#8a97b4',
                                font: { family: "'JetBrains Mono', monospace", size: 10 }
                            },
                            title: {
                                display: true, text: 'Semanas',
                                color: '#5a6a8a',
                                font: { family: "'Outfit', sans-serif", size: 11 }
                            }
                        },
                        y: {
                            beginAtZero: true, max: 100,
                            grid: { color: '#2a3347' },
                            ticks: {
                                color: '#8a97b4',
                                font: { family: "'JetBrains Mono', monospace", size: 10 },
                                callback: function(v) { return v + '%'; }
                            },
                            title: {
                                display: true, text: 'Avance %',
                                color: '#5a6a8a',
                                font: { family: "'Outfit', sans-serif", size: 11 }
                            }
                        }
                    }
                }
            });
            // ⚠️ AGREGAR LÍNEA VERTICAL EN SEMANA ACTUAL DESPUÉS DE CREAR GRÁFICA
            if (semanaActual > 0 && semanaActual <= this.datos.semanas.length) {
                this.grafica.data.datasets[2].data[semanaActual - 1] = 100;  // Línea hasta 100%
                this.grafica.update();
            }
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
    // LIMPIAR VALORES EVM
    // ─────────────────────────────────────────────────────────────────
    limpiarValoresEVM: function() {
        ['evm-pv','evm-ev','evm-ac','evm-cv','evm-sv','evm-eac','evm-etc','evm-vac'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) { el.textContent = '$0.00'; el.style.color = ''; }
        });
        ['evm-cpi','evm-spi'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) { el.textContent = '0.00'; el.style.color = ''; }
        });

        var elV = document.getElementById('variacion-tiempo');
        var elI = document.getElementById('indice-tiempo');
        if (elV) { elV.textContent = '0%'; elV.style.color = ''; }
        if (elI) { elI.textContent = '0.00'; elI.style.color = ''; }

        ['proyeccion-semanas-restantes','proyeccion-fecha-estimada','proyeccion-velocidad'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.textContent = '—';
        });

        var elInv = document.getElementById('curva-inversion-total');
        if (elInv) elInv.textContent = '$0.00';

        // Limpiar tabla
        var tabla = document.getElementById('tabla-avances-reales');
        if (tabla) tabla.innerHTML = '';
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
    // CALCULAR EVM (CORREGIDO - CÁLCULOS REALES)
    // ─────────────────────────────────────────────────────────────────
    calcularEVM: async function() {
        try {
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
            
            // ⚠️ OBTENER AVANCES ORDENADOS POR SEMANA
            const avances = await window.db.avanceObra
                .where('cotizacionId')
                .equals(parseInt(cotizacionId))
                .sortBy('semana');
            
            console.log('📊 Avances ordenados:', avances);
            
            if (avances.length === 0) {
                alert('⚠️ No hay avances registrados para calcular EVM');
                this.limpiarValoresEVM();
                return;
            }
            
            // ⚠️ DATOS BASE
            const BAC = parseFloat(cotizacion.totalFinal) || 0;  // Budget at Completion
            const semanasTotales = cotizacion.tiempoEjecucion?.semanas || 14;
            
            console.log('💰 BAC:', BAC, '| Semanas totales:', semanasTotales);
            
            if (BAC === 0) {
                console.warn('⚠️ El total del proyecto es 0');
                this.limpiarValoresEVM();
                return;
            }
            
            // ⚠️ TOMAR EL ÚLTIMO AVANCE REGISTRADO (más reciente)
            const ultimoAvance = avances[avances.length - 1];
            const semanaActual = parseInt(ultimoAvance.semana) || 1;
            const porcentajeEjecutado = parseFloat(ultimoAvance.porcentajeEjecutado || 0);
            
            console.log('📍 Semana actual:', semanaActual, '| % Ejecutado:', porcentajeEjecutado);
            
            // ─────────────────────────────────────────────────────────
            // ✅ CÁLCULOS EVM CORRECTOS
            // ─────────────────────────────────────────────────────────
            
            // 📊 PV (Planned Value) = Lo que DEBERÍAS haber gastado hasta la semana actual
            const PV = (semanaActual / semanasTotales) * BAC;
            
            // 📊 EV (Earned Value) = Lo que REALMENTE has ganado (avance real × BAC)
            const EV = (porcentajeEjecutado / 100) * BAC;
            
            // 📊 AC (Actual Cost) = Lo que REALMENTE has gastado (suma acumulada)
            const AC = avances.reduce((sum, a) => sum + (parseFloat(a.montoEjecutado) || 0), 0);
            
            // 📊 INDICADORES DERIVADOS
            const CV = EV - AC;                    // Variación de Costo
            const SV = EV - PV;                    // Variación de Tiempo
            const CPI = AC > 0 ? EV / AC : 0;      // Índice de Desempeño de Costo
            const SPI = PV > 0 ? EV / PV : 0;      // Índice de Desempeño de Tiempo
            const EAC = CPI > 0 ? BAC / CPI : BAC; // Estimado al Completar
            const ETC = EAC - AC;                  // Estimado para Completar
            const VAC = BAC - EAC;                 // Variación al Completar
            
            console.log('📊 EVM Calculado:', {
                BAC, semanasTotales, semanaActual, porcentajeEjecutado,
                PV: calculator.formatoMoneda(PV),
                EV: calculator.formatoMoneda(EV),
                AC: calculator.formatoMoneda(AC),
                CV: calculator.formatoMoneda(CV),
                SV: calculator.formatoMoneda(SV),
                CPI: CPI.toFixed(2),
                SPI: SPI.toFixed(2),
                EAC: calculator.formatoMoneda(EAC)
            });
            
            // ─────────────────────────────────────────────────────────
            // ✅ ACTUALIZAR UI CON COLORES DEL TEMA OSCURO
            // ─────────────────────────────────────────────────────────
            const actualizarElemento = (id, valor, esIndice = false, esMoneda = true) => {
                const el = document.getElementById(id);
                if (!el) return;
                if (esIndice) {
                    el.textContent = valor.toFixed(2);
                    el.style.color = valor >= 1 ? 'var(--green)' : 'var(--rose)';
                } else if (esMoneda) {
                    el.textContent = calculator.formatoMoneda(valor);
                    if (id === 'evm-cv' || id === 'evm-sv' || id === 'evm-vac') {
                        el.style.color = valor >= 0 ? 'var(--green)' : 'var(--rose)';
                    } else {
                        el.style.color = 'var(--ink)';
                    }
                } else {
                    el.textContent = valor;
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
            
            // ─────────────────────────────────────────────────────────
            // ✅ ACTUALIZAR CURVA DE INVERSIÓN (CORREGIDO)
            // ─────────────────────────────────────────────────────────
            const elInversionEjecutada = document.getElementById('curva-inversion-ejecutada');
            const elInversionTotal = document.getElementById('curva-inversion-total');
            const barraProgreso = document.querySelector('#curva-s-screen .card-body div[style*="linear-gradient"] div[style*="position:absolute"]');
            
            if (elInversionEjecutada) {
                elInversionEjecutada.textContent = calculator.formatoMoneda(AC);  // ← AC, no EV
            }
            if (elInversionTotal) {
                elInversionTotal.textContent = calculator.formatoMoneda(BAC);  // ← BAC, no AC
            }
            if (barraProgreso && BAC > 0) {
                const porcentaje = Math.min(100, Math.max(0, (AC / BAC) * 100));
                barraProgreso.style.width = porcentaje + '%';
                const label = barraProgreso.parentElement.querySelector('div[style*="position:absolute;top:8px"]');
                if (label) label.textContent = porcentaje.toFixed(0) + '%';
            }
            
            // ─────────────────────────────────────────────────────────
            // ✅ ACTUALIZAR INDICADORES DE CURVA S BÁSICA
            // ─────────────────────────────────────────────────────────
            const elVariacionTiempo = document.getElementById('variacion-tiempo');
            const elIndiceTiempo = document.getElementById('indice-tiempo');
            
            if (elVariacionTiempo) {
                const variacion = ((SPI - 1) * 100).toFixed(1);
                elVariacionTiempo.textContent = (variacion >= 0 ? '+' : '') + variacion + '%';
                elVariacionTiempo.style.color = SPI >= 1 ? 'var(--green)' : 'var(--rose)';
            }
            if (elIndiceTiempo) {
                elIndiceTiempo.textContent = SPI.toFixed(2);
                elIndiceTiempo.style.color = SPI >= 1 ? 'var(--green)' : 'var(--rose)';
            }
            
            console.log('✅ EVM actualizado correctamente');
            
        } catch (error) {
            console.error('❌ Error calculando EVM:', error);
            this.limpiarValoresEVM();
        }
    },
    // ─────────────────────────────────────────────────────────────────
    // GENERAR CURVA DE INVERSIÓN (CORREGIDO)
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
            
            if (avances.length === 0) return;
            
            // ⚠️ BAC = Presupuesto Total del Proyecto
            const BAC = parseFloat(cotizacion.totalFinal) || 0;
            
            // ⚠️ AC = Suma acumulada de montos ejecutados
            const AC = avances.reduce((sum, a) => sum + (parseFloat(a.montoEjecutado) || 0), 0);
            
            // ⚠️ ACTUALIZAR UI
            const elEjecutada = document.getElementById('curva-inversion-ejecutada');
            const elTotal = document.getElementById('curva-inversion-total');
            
            if (elEjecutada) elEjecutada.textContent = calculator.formatoMoneda(AC);
            if (elTotal) elTotal.textContent = calculator.formatoMoneda(BAC);
            
            // Actualizar barra visual
            const barra = document.querySelector('#curva-s-screen .card-body div[style*="linear-gradient"] div[style*="position:absolute"]');
            if (barra && BAC > 0) {
                const porcentaje = Math.min(100, Math.max(0, (AC / BAC) * 100));
                barra.style.width = porcentaje + '%';
                const label = barra.parentElement.querySelector('div[style*="position:absolute;top:8px"]');
                if (label) label.textContent = porcentaje.toFixed(0) + '%';
            }
            
            console.log('💰 Curva de Inversión:', { AC, BAC });
        } catch (error) {
            console.error('❌ Error en curva de inversión:', error);
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
    // EXPORTAR REPORTE PDF
    // ─────────────────────────────────────────────────────────────────
    exportarReportePDF: async function() {
        try {
            if (typeof window.jspdf === 'undefined') {
                alert('⚠️ jsPDF no está cargado');
                return;
            }
            if (!this.datos.cotizacionId) {
                alert('⚠️ Primero carga una cotización');
                return;
            }

            var jsPDF = window.jspdf.jsPDF;
            var doc   = new jsPDF();
            var cotizacion = await window.db.cotizaciones.get(parseInt(this.datos.cotizacionId));
            if (!cotizacion) { alert('❌ Cotización no encontrada'); return; }

            var fmt = window.calculator ? window.calculator.formatoMoneda : function(v) { return '$' + v.toFixed(2); };

            // Encabezado
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, 210, 32, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(15); doc.setFont('helvetica', 'bold');
            doc.text('CURVA S - SEGUIMIENTO DE OBRA', 105, 16, { align: 'center' });
            doc.setFontSize(9); doc.setFont('helvetica', 'normal');
            doc.text('SmartCot v2.0 — Reporte generado el ' + new Date().toLocaleDateString('es-MX'), 105, 26, { align: 'center' });

            var y = 42;
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(9);
            doc.text('Cotización #' + this.datos.cotizacionId + '   Cliente: ' + (this.datos.cliente || '—'), 15, y); y += 6;
            doc.text('Total Proyecto: ' + fmt(cotizacion.totalFinal || 0), 15, y); y += 6;
            doc.text('Variación: ' + ((this.ultimaVariacion || 0) >= 0 ? '+' : '') + (this.ultimaVariacion || 0).toFixed(1) + '%' +
                     '   SPI: ' + (this.ultimoIndice || 0).toFixed(2), 15, y); y += 10;

            // Gráfica
            var canvas = document.getElementById('curva-s-chart');
            if (canvas) {
                doc.addImage(canvas.toDataURL('image/png'), 'PNG', 15, y, 180, 80);
                y += 85;
            }

            // Tabla
            if (y > 230) { doc.addPage(); y = 20; }
            doc.setFillColor(37, 99, 235);
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8); doc.setFont('helvetica', 'bold');
            doc.rect(15, y - 4, 180, 7, 'F');
            doc.text('Sem.', 17, y); doc.text('Programado', 45, y); doc.text('Ejecutado', 80, y);
            doc.text('Desviacion', 110, y); doc.text('Monto Ejec.', 140, y); doc.text('Estado', 175, y);
            y += 6; doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);

            var self = this;
            this.datos.semanas.forEach(function(sem, i) {
                var prog  = (self.datos.avanceProgramado[i] || 0).toFixed(1) + '%';
                var ejec  = self.datos.avanceEjecutado[i];
                var monto = self.datos.montoEjecutado[i] || 0;
                var ejecTxt  = (ejec === null || ejec === undefined) ? '—' : ejec.toFixed(1) + '%';
                var desv     = (ejec === null || ejec === undefined) ? '—' : ((ejec - (self.datos.avanceProgramado[i] || 0)) >= 0 ? '+' : '') + (ejec - (self.datos.avanceProgramado[i] || 0)).toFixed(1) + '%';
                var montoTxt = (ejec === null || ejec === undefined) ? '—' : fmt(monto);
                var estado   = (ejec === null || ejec === undefined) ? 'Pendiente' : ((ejec >= (self.datos.avanceProgramado[i] || 0)) ? 'En tiempo' : 'Atrasado');

                if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(15, y - 4, 180, 6, 'F'); }
                doc.text(sem, 17, y); doc.text(prog, 45, y); doc.text(ejecTxt, 80, y);
                doc.text(desv, 110, y); doc.text(montoTxt, 140, y); doc.text(estado, 175, y);
                y += 6;
                if (y > 270) { doc.addPage(); y = 20; }
            });

            // Pie de página
            var pages = doc.internal.getNumberOfPages();
            for (var p = 1; p <= pages; p++) {
                doc.setPage(p);
                doc.setFontSize(7); doc.setTextColor(150);
                doc.text('Página ' + p + ' de ' + pages + ' — SmartCot v2.0', 105, 292, { align: 'center' });
            }

            doc.save('CurvaS-Cot' + this.datos.cotizacionId + '-' + new Date().toISOString().split('T')[0] + '.pdf');
            alert('✅ Reporte PDF exportado');

        } catch (error) {
            console.error('❌ Error exportando PDF:', error);
            alert('❌ Error: ' + error.message);
        }
    }
};

console.log('✅ curva-s.js listo');
