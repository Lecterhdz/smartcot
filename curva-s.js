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
        montoEjecutado: []
    },
    
    grafica: null,
    
    // ─────────────────────────────────────────────────────────────────
    // INICIALIZAR PANTALLA
    // ─────────────────────────────────────────────────────────────────
    init: async function() {
        try {
            // ⚠️ VERIFICAR SI EL PLAN TIENE ACCESO A CURVA S
            var limite = await window.licencia.verificarLimite('curvaS');
            if (!limite.permitido) {
                alert('❌ ' + limite.razon);
                if (window.app) {
                    window.app.mostrarPantalla('dashboard-screen');
                }
                return;
            }  
            console.log('📈 Inicializando Curva S...');
            await this.cargarCotizacionesEnDropdown();
        } catch (error) {
            console.error('❌ Error inicializando Curva S:', error);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CARGAR COTIZACIONES EN DROPDOWN
    // ─────────────────────────────────────────────────────────────────
    cargarCotizacionesEnDropdown: async function() {
        try {
            if (!window.db) {
                console.error('❌ DB no disponible');
                return;
            }
            
            const cotizaciones = await window.db.cotizaciones.reverse().limit(50).toArray();
            const select = document.getElementById('curva-s-cotizacion');
            
            if (!select) {
                console.error('❌ Select de cotizaciones no encontrado');
                return;
            }
            
            if (cotizaciones.length === 0) {
                select.innerHTML = '<option value="">No hay cotizaciones guardadas</option>';
                return;
            }
            
            const clientes = await window.db.clientes.toArray();
            
            select.innerHTML = '<option value="">Seleccionar cotización...</option>' +
                cotizaciones.map(function(c) {
                    const cliente = clientes.find(cl => cl.id == c.clienteId);
                    const clienteNombre = cliente ? cliente.nombre : 'Sin cliente';
                    const fecha = new Date(c.fecha).toLocaleDateString('es-MX');
                    const total = calculator.formatoMoneda(c.totalFinal || 0);
                    
                    return '<option value="' + c.id + '">' + 
                        'Cotización #' + c.id + ' - ' + clienteNombre + ' - ' + total + ' (' + fecha + ')' +
                        '</option>';
                }).join('');
            
            console.log('✅ Cotizaciones cargadas:', cotizaciones.length);
            
        } catch (error) {
            console.error('❌ Error cargando cotizaciones:', error);
        }
    },
       
  
    // ─────────────────────────────────────────────────────────────────
    // CARGAR COTIZACIÓN SELECCIONADA (VERSIÓN MEJORADA)
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
            
            this.datos.cotizacionId = cotizacionId;
            this.datos.cotizacionNumero = cotizacion.id;
            
            // Obtener nombre del cliente
            if (cotizacion.clienteId) {
                const cliente = await window.db.clientes.get(parseInt(cotizacion.clienteId));
                this.datos.cliente = cliente ? cliente.nombre : 'Sin cliente';
            } else {
                this.datos.cliente = 'Sin cliente';
            }
            
            // Calcular semanas totales
            const semanasTotales = Math.ceil(cotizacion.tiempoEjecucion?.semanas || 0) || 1;
            const montoTotal = cotizacion.totalFinal || 0;
            
            // Calcular fechas
            const fechaInicio = cotizacion.fechaInicio ? new Date(cotizacion.fechaInicio) : new Date();
            const fechaFinEstimada = new Date(fechaInicio);
            fechaFinEstimada.setDate(fechaFinEstimada.getDate() + (semanasTotales * 7));
            const fechaFinSolicitada = cotizacion.fechaFinSolicitada ? new Date(cotizacion.fechaFinSolicitada) : null;
            
            // Generar curva programada
            this.generarCurvaProgramada(semanasTotales, montoTotal, fechaInicio, fechaFinEstimada);
            
            // Cargar avance ejecutado
            await this.cargarAvanceEjecutado();
            
            // ⚠️ CORRECCIÓN AQUÍ: usar inicializarGrafica + actualizarGrafica
            setTimeout(() => {
                this.inicializarGrafica();      // ✅ Primero inicializa Chart.js
                this.actualizarGrafica();        // ✅ Luego carga los datos
            }, 300);
            
            // Calcular y mostrar variaciones
            this.calcularVariaciones();
            
            // Mostrar información de la cotización
            this.mostrarInfoCotizacion(cotizacion, fechaInicio, fechaFinEstimada, fechaFinSolicitada);
            
            // ⚠️ NUEVO: ACTUALIZAR COMPONENTES VISUALES CON DATOS REALES
            const semanaActual = 8; // ← Esto debería venir de tus datos de avance
            this.actualizarIndicadorSemana(semanaActual);
            this.resaltarFilaSemana(semanaActual);
            
            // ⚠️ ACTUALIZAR VALORES EVM (usar datos reales de tu cotización)
            if (cotizacion.evm) {
                this.actualizarValoresEVM(cotizacion.evm);
            }
            
            // ⚠️ ACTUALIZAR CURVA DE INVERSIÓN
            const avanceReal = cotizacion.avanceEjecutado || 0;
            const inversionEjecutada = (avanceReal / 100) * montoTotal;
            this.actualizarCurvaInversion(inversionEjecutada, montoTotal);
            
            // ⚠️ MOSTRAR SECCIÓN EVM SI HAY DATOS
            const seccionEVM = document.getElementById('curva-s-avanzada-seccion');
            if (seccionEVM && cotizacion.evm) {
                seccionEVM.style.display = 'block';
            }
            
        } catch (error) {
            console.error('❌ Error cargando cotización:', error);
            alert('❌ Error: ' + error.message);
        }
    },
    // ─────────────────────────────────────────────────────────────────
    // ACTUALIZAR INDICADOR DE SEMANA ACTUAL EN GRÁFICA SVG
    // ─────────────────────────────────────────────────────────────────
    actualizarIndicadorSemana: function(semanaActual) {
      try {
        console.log('📍 Actualizando indicador semana:', semanaActual);
        
        // Calcular posición X basada en escala (60px inicio, ~42.5px por semana)
        const x = 60 + (semanaActual * 42.5);
        
        // Actualizar línea vertical "ACTUAL"
        const lineHoy = document.querySelector('#curva-s-screen svg line[stroke="var(--rose)"]');
        const textHoy = document.querySelector('#curva-s-screen svg text[fill="var(--rose)"]');
        
        if (lineHoy) {
          lineHoy.setAttribute('x1', x);
          lineHoy.setAttribute('x2', x);
        }
        if (textHoy) {
          textHoy.setAttribute('x', x + 3);
          textHoy.textContent = 'S' + semanaActual + ' ◀';
        }
        
        // Actualizar puntos de datos (ejemplo: ajustar posición Y según avance)
        const puntos = document.querySelectorAll('#curva-s-screen svg circle');
        if (puntos.length >= 2) {
          const avanceReal = this.datosCotizacion?.avanceReal || 42;
          const avanceProg = this.datosCotizacion?.avanceProg || 55;
          const yReal = 260 - (avanceReal * 2);
          const yProg = 260 - (avanceProg * 2);
          
          puntos[0].setAttribute('cy', yReal);
          puntos[1].setAttribute('cy', yProg);
          
          const etiquetas = document.querySelectorAll('#curva-s-screen svg rect + text');
          if (etiquetas.length >= 2) {
            etiquetas[0].textContent = avanceReal + '% Real';
            etiquetas[1].textContent = avanceProg + '% Prog';
          }
        }
        
        console.log('✅ Indicador de semana actualizado');
      } catch (error) {
        console.error('❌ Error actualizando indicador:', error);
      }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // RESALTAR FILA DE SEMANA ACTUAL EN TABLA
    // ─────────────────────────────────────────────────────────────────
    resaltarFilaSemana: function(semanaActual) {
      try {
        document.querySelectorAll('#curva-s-screen tbody tr').forEach(tr => {
          tr.style.background = '';
          tr.style.fontWeight = '';
          tr.querySelector('td:first-child')?.classList.remove('semana-actual');
        });
        
        const filas = document.querySelectorAll('#curva-s-screen tbody tr');
        filas.forEach(fila => {
          const celdaSemana = fila.querySelector('td:first-child');
          if (celdaSemana && celdaSemana.textContent.includes('S' + semanaActual)) {
            fila.style.background = 'var(--blue-l)';
            fila.style.fontWeight = '700';
            celdaSemana.innerHTML = 'S' + semanaActual + ' ◀';
            celdaSemana.classList.add('semana-actual');
          }
        });
        
        console.log('✅ Fila de semana ' + semanaActual + ' resaltada');
      } catch (error) {
        console.error('❌ Error resaltando fila:', error);
      }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // ACTUALIZAR VALORES EVM DINÁMICAMENTE
    // ─────────────────────────────────────────────────────────────────
    actualizarValoresEVM: function(datosEVM) {
      try {
        const mapeo = {
          pv: 'evm-pv', ev: 'evm-ev', ac: 'evm-ac',
          cv: 'evm-cv', sv: 'evm-sv', cpi: 'evm-cpi',
          spi: 'evm-spi', eac: 'evm-eac', etc: 'evm-etc', vac: 'evm-vac'
        };
        
        Object.entries(mapeo).forEach(([clave, id]) => {
          const el = document.getElementById(id);
          if (el && datosEVM[clave] !== undefined) {
            const valor = datosEVM[clave];
            if (typeof valor === 'number' && (clave === 'cpi' || clave === 'spi')) {
              el.textContent = valor.toFixed(2);
            } else if (typeof valor === 'number') {
              el.textContent = calculator?.formatoMoneda?.(valor) || '$' + valor.toLocaleString();
            } else {
              el.textContent = valor;
            }
          }
        });
        
        console.log('✅ Valores EVM actualizados');
      } catch (error) {
        console.error('❌ Error actualizando EVM:', error);
      }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // ACTUALIZAR CURVA DE INVERSIÓN
    // ─────────────────────────────────────────────────────────────────
    actualizarCurvaInversion: function(inversionEjecutada, inversionTotal) {
      try {
        const elEjecutada = document.getElementById('curva-inversion-ejecutada');
        const elTotal = document.getElementById('curva-inversion-total');
        const barra = document.querySelector('#curva-s-screen .card-body div[style*="linear-gradient"] div[style*="position:absolute"]');
        
        if (elEjecutada) {
          elEjecutada.textContent = calculator?.formatoMoneda?.(inversionEjecutada) || '$' + inversionEjecutada.toLocaleString();
        }
        if (elTotal) {
          elTotal.textContent = calculator?.formatoMoneda?.(inversionTotal) || '$' + inversionTotal.toLocaleString();
        }
        
        if (barra && inversionTotal > 0) {
          const porcentaje = Math.min(100, Math.max(0, (inversionEjecutada / inversionTotal) * 100));
          barra.style.width = porcentaje + '%';
          const label = barra.parentElement.querySelector('div[style*="position:absolute;top:8px"]');
          if (label) label.textContent = porcentaje.toFixed(0) + '%';
        }
        
        console.log('✅ Curva de inversión actualizada');
      } catch (error) {
        console.error('❌ Error actualizando curva de inversión:', error);
      }
    },     
    // ─────────────────────────────────────────────────────────────────
    // MOSTRAR INFORMACIÓN DE COTIZACIÓN
    // ─────────────────────────────────────────────────────────────────
    mostrarInfoCotizacion: function(cotizacion, fechaInicio, fechaFinEstimada, fechaFinSolicitada) {
        const infoDiv = document.getElementById('curva-s-info-cotizacion');
        if (!infoDiv) return;
        
        const semanasTotales = Math.ceil(cotizacion.tiempoEjecucion?.semanas || 0) || 1;
        
        // Calcular diferencia entre fecha solicitada y estimada
        const diferenciaDias = fechaFinSolicitada ? Math.round((fechaFinSolicitada - fechaFinEstimada) / (1000 * 60 * 60 * 24)) : 0;
        
        infoDiv.innerHTML = `
            <div style="background:#E3F2FD;padding:20px;border-radius:15px;margin-bottom:25px;">
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;">
                    <div>
                        <div style="font-size:11px;color:#666;">Cotización #</div>
                        <div style="font-size:16px;font-weight:700;color:#1a1a1a;">${cotizacion.id}</div>
                    </div>
                    <div>
                        <div style="font-size:11px;color:#666;">Cliente</div>
                        <div style="font-size:14px;font-weight:600;color:#1a1a1a;">${this.datos.cliente}</div>
                    </div>
                    <div>
                        <div style="font-size:11px;color:#666;">Total</div>
                        <div style="font-size:16px;font-weight:700;color:#4CAF50;">${calculator.formatoMoneda(cotizacion.totalFinal || 0)}</div>
                    </div>
                    <div>
                        <div style="font-size:11px;color:#666;">Tiempo Estimado</div>
                        <div style="font-size:16px;font-weight:700;color:#2196F3;">${semanasTotales} semanas</div>
                    </div>
                    <div>
                        <div style="font-size:11px;color:#666;">Fecha Inicio</div>
                        <div style="font-size:16px;font-weight:700;color:#1a1a1a;">${fechaInicio.toLocaleDateString('es-MX')}</div>
                    </div>
                    <div>
                        <div style="font-size:11px;color:#666;">Fecha Fin Estimada</div>
                        <div style="font-size:16px;font-weight:700;color:#FF9800;">${fechaFinEstimada.toLocaleDateString('es-MX')}</div>
                    </div>
                    ${fechaFinSolicitada ? `
                    <div>
                        <div style="font-size:11px;color:#666;">Fecha Fin Solicitada</div>
                        <div style="font-size:16px;font-weight:700;color:${diferenciaDias >= 0 ? '#4CAF50' : '#f44336'};">
                            ${fechaFinSolicitada.toLocaleDateString('es-MX')}
                        </div>
                        <div style="font-size:11px;color:${diferenciaDias >= 0 ? '#4CAF50' : '#f44336'};">
                            ${diferenciaDias >= 0 ? '+' + diferenciaDias : diferenciaDias} días vs estimado
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    },
    
    // ─────────────────────────────────────────────────────────────────
    // GENERAR CURVA PROGRAMADA (S-CURVE TÍPICA)
    // ─────────────────────────────────────────────────────────────────
    generarCurvaProgramada: function(semanasTotales, montoTotal, fechaInicio, fechaFin) {
        this.datos.semanas = [];
        this.datos.avanceProgramado = [];
        this.datos.montoProgramado = [];
        this.datos.fechas = [];
        
        let acumulado = 0;
        const fechaActual = new Date(fechaInicio);
        
        for (let i = 1; i <= semanasTotales; i++) {
            // Calcular fecha de cada semana
            const fechaSemana = new Date(fechaActual);
            fechaSemana.setDate(fechaActual.getDate() + ((i - 1) * 7));
            
            this.datos.semanas.push('Sem ' + i + ' (' + fechaSemana.toLocaleDateString('es-MX') + ')');
            this.datos.fechas.push(fechaSemana);
            
            // S-Curve típica: lento al inicio, rápido en medio, lento al final
            const progreso = i / semanasTotales;
            const sCurve = Math.pow(progreso, 2) * (3 - 2 * progreso) * 100;
            
            acumulado = Math.min(sCurve, 100);
            this.datos.avanceProgramado.push(acumulado);
            this.datos.montoProgramado.push((acumulado / 100) * montoTotal);
        }
        
        console.log('✅ Curva programada generada:', this.datos);
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CARGAR AVANCE EJECUTADO
    // ─────────────────────────────────────────────────────────────────
    cargarAvanceEjecutado: async function() {
        try {
            if (!this.datos.cotizacionId) {
                this.datos.avanceEjecutado = new Array(this.datos.semanas.length).fill(0);
                this.datos.montoEjecutado = new Array(this.datos.semanas.length).fill(0);
                return;
            }
            
            const avance = await window.db.avanceObra
                .where('cotizacionId')
                .equals(parseInt(this.datos.cotizacionId))
                .toArray();
            
            console.log('📊 Avance cargado desde DB:', avance);
            
            // Inicializar arrays con ceros del tamaño de semanas
            this.datos.avanceEjecutado = new Array(this.datos.semanas.length).fill(0);
            this.datos.montoEjecutado = new Array(this.datos.semanas.length).fill(0);
            
            // Llenar con datos reales según la semana
            avance.forEach(function(a) {
                const semanaIndex = a.semana - 1; // Las semanas empiezan en 1, los índices en 0
                if (semanaIndex >= 0 && semanaIndex < this.datos.avanceEjecutado.length) {
                    this.datos.avanceEjecutado[semanaIndex] = a.porcentajeEjecutado || 0;
                    this.datos.montoEjecutado[semanaIndex] = a.montoEjecutado || 0;
                    console.log('📊 Semana', a.semana, '=> Índice', semanaIndex, '=>', a.porcentajeEjecutado + '%');
                }
            }.bind(this));
            
            console.log('✅ Avance ejecutado cargado:', this.datos.avanceEjecutado);
            
        } catch (error) {
            console.error('❌ Error cargando avance:', error);
            this.datos.avanceEjecutado = new Array(this.datos.semanas.length).fill(0);
            this.datos.montoEjecutado = new Array(this.datos.semanas.length).fill(0);
        }
    },

    // ─────────────────────────────────────────────────────────────────
    // INICIALIZAR GRÁFICA (CORREGIDO - CANVAS + PROYECCIÓN)
    // ─────────────────────────────────────────────────────────────────
    inicializarGrafica: function() {
        try {
            console.log('📈 Inicializando gráfica de Curva S...');
            
            // ⚠️ VERIFICAR QUE EL CANVAS EXISTA ANTES DE ACCEDER
            const canvas = document.getElementById('curva-s-chart');
            if (!canvas) {
                console.error('❌ Canvas no encontrado: curva-s-chart');
                console.log('🔍 Verifica que el ID en HTML sea exactamente "curva-s-chart"');
                return;
            }
            
            // ⚠️ VERIFICAR QUE EL CONTEXTO 2D ESTÉ DISPONIBLE
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('❌ No se pudo obtener el contexto 2D del canvas');
                return;
            }
            
            // ⚠️ DESTRUIR GRÁFICA ANTERIOR SI EXISTE
            if (this.grafica) {
                this.grafica.destroy();
                this.grafica = null;
            }
            
            // ⚠️ CONFIGURAR TAMAÑO DEL CANVAS
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            
            // ⚠️ CREAR GRÁFICA CON CHART.JS
            this.grafica = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Programado',
                            data: [],
                            borderColor: '#7c6ff0',
                            backgroundColor: 'rgba(124, 111, 240, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Real',
                            data: [],
                            borderColor: '#4d8ef0',
                            backgroundColor: 'rgba(77, 142, 240, 0.1)',
                            borderWidth: 3,
                            borderDash: [6, 3],
                            fill: true,
                            tension: 0.4
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
                                font: {
                                    family: "'Outfit', sans-serif",
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: '#1e2330',
                            titleColor: '#e8edf5',
                            bodyColor: '#c4cde0',
                            borderColor: '#2a3347',
                            borderWidth: 1,
                            padding: 12,
                            displayColors: true,
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: '#2a3347'
                            },
                            ticks: {
                                color: '#8a97b4',
                                font: {
                                    family: "'JetBrains Mono', monospace",
                                    size: 10
                                }
                            },
                            title: {
                                display: true,
                                text: 'Semanas',
                                color: '#5a6a8a',
                                font: {
                                    family: "'Outfit', sans-serif",
                                    size: 11
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            max: 100,
                            grid: {
                                color: '#2a3347'
                            },
                            ticks: {
                                color: '#8a97b4',
                                font: {
                                    family: "'JetBrains Mono', monospace",
                                    size: 10
                                },
                                callback: function(value) {
                                    return value + '%';
                                }
                            },
                            title: {
                                display: true,
                                text: 'Avance %',
                                color: '#5a6a8a',
                                font: {
                                    family: "'Outfit', sans-serif",
                                    size: 11
                                }
                            }
                        }
                    }
                }
            });
            
            console.log('✅ Gráfica de Curva S inicializada correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando gráfica:', error);
            console.error('Stack:', error.stack);
        }
    },

    // ─────────────────────────────────────────────────────────────────
    // CALCULAR Y MOSTRAR PROYECCIÓN (NUEVA FUNCIÓN)
    // ─────────────────────────────────────────────────────────────────
    calcularProyeccion: function() {
        try {
            console.log('📊 Calculando proyección...');
            
            // ⚠️ OBTENER DATOS DE AVANCE REAL
            const avancesReales = this.avances || [];
            if (avancesReales.length < 2) {
                console.log('⚠️ No hay suficientes datos para calcular proyección');
                return;
            }
            
            // ⚠️ CALCULAR VELOCIDAD PROMEDIO (semanas)
            const ultimoAvance = avancesReales[avancesReales.length - 1];
            const primerAvance = avancesReales[0];
            
            const semanasTranscurridas = ultimoAvance.semana - primerAvance.semana;
            const avanceTotal = ultimoAvance.porcentaje - primerAvance.porcentaje;
            
            const velocidadPromedio = semanasTranscurridas > 0 
                ? avanceTotal / semanasTranscurridas 
                : 0;
            
            console.log('📊 Velocidad promedio:', velocidadPromedio.toFixed(2) + '%/semana');
            
            // ⚠️ CALCULAR SEMANAS RESTANTES
            const avanceRestante = 100 - ultimoAvance.porcentaje;
            const semanasRestantes = velocidadPromedio > 0 
                ? Math.ceil(avanceRestante / velocidadPromedio) 
                : 0;
            
            // ⚠️ CALCULAR FECHA ESTIMADA DE TERMINACIÓN
            const fechaActual = new Date();
            const fechaEstimada = new Date(fechaActual);
            fechaEstimada.setDate(fechaEstimada.getDate() + (semanasRestantes * 7));
            
            // ⚠️ ACTUALIZAR UI CON PROYECCIÓN
            const elSemanasRestantes = document.getElementById('proyeccion-semanas-restantes');
            const elFechaEstimada = document.getElementById('proyeccion-fecha-estimada');
            const elVelocidad = document.getElementById('proyeccion-velocidad');
            
            if (elSemanasRestantes) {
                elSemanasRestantes.textContent = semanasRestantes + ' semanas';
                elSemanasRestantes.style.color = semanasRestantes > 10 ? 'var(--rose)' : 'var(--amber)';
            }
            
            if (elFechaEstimada) {
                elFechaEstimada.textContent = fechaEstimada.toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });
                elFechaEstimada.style.color = 'var(--blue)';
            }
            
            if (elVelocidad) {
                elVelocidad.textContent = velocidadPromedio.toFixed(2) + '%/semana';
                elVelocidad.style.color = velocidadPromedio >= 5 ? 'var(--green)' : 'var(--amber)';
            }
            
            // ⚠️ GUARDAR PROYECCIÓN PARA USAR EN GRÁFICA
            this.proyeccion = {
                semanasRestantes: semanasRestantes,
                fechaEstimada: fechaEstimada,
                velocidadPromedio: velocidadPromedio,
                avanceRestante: avanceRestante
            };
            
            console.log('✅ Proyección calculada:', this.proyeccion);
            
        } catch (error) {
            console.error('❌ Error calculando proyección:', error);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CALCULAR VARIACIONES (CORREGIDO)
    // ─────────────────────────────────────────────────────────────────
    calcularVariaciones: function() {
        // Encontrar la última semana con avance ejecutado
        let ultimaSemanaConAvance = -1;
        for (let i = this.datos.avanceEjecutado.length - 1; i >= 0; i--) {
            if (this.datos.avanceEjecutado[i] > 0) {
                ultimaSemanaConAvance = i;
                break;
            }
        }
        
        // Si no hay avance, usar la primera semana
        if (ultimaSemanaConAvance === -1) {
            ultimaSemanaConAvance = 0;
        }
        
        const avanceProgramado = this.datos.avanceProgramado[ultimaSemanaConAvance] || 0;
        const avanceEjecutado = this.datos.avanceEjecutado[ultimaSemanaConAvance] || 0;
        
        // Variación de tiempo (diferencia entre ejecutado y programado)
        const variacionTiempo = avanceEjecutado - avanceProgramado;
        
        // Índice de desempeño (SPI = Earned Value / Planned Value)
        const indiceTiempo = avanceProgramado > 0 ? (avanceEjecutado / avanceProgramado) : 0;
        
        // Actualizar UI
        const elVariacionTiempo = document.getElementById('variacion-tiempo');
        const elIndiceTiempo = document.getElementById('indice-tiempo');
        
        if (elVariacionTiempo) {
            elVariacionTiempo.textContent = (variacionTiempo >= 0 ? '+' : '') + variacionTiempo.toFixed(1) + '%';
            elVariacionTiempo.style.color = variacionTiempo >= 0 ? '#4CAF50' : '#f44336';
        }
        
        if (elIndiceTiempo) {
            elIndiceTiempo.textContent = indiceTiempo.toFixed(2);
            elIndiceTiempo.style.color = indiceTiempo >= 1 ? '#4CAF50' : '#f44336';
        }
        
        // Guardar para el reporte PDF
        this.ultimaVariacion = variacionTiempo;
        this.ultimoIndice = indiceTiempo;
        this.ultimaSemana = ultimaSemanaConAvance + 1;
        
        console.log('📊 Variaciones calculadas:', {
            semana: this.ultimaSemana,
            variacion: variacionTiempo.toFixed(1) + '%',
            indice: indiceTiempo.toFixed(2)
        });
    },
    
    // ─────────────────────────────────────────────────────────────────
    // GUARDAR AVANCE SEMANAL (CORREGIDO - ACTUALIZA VARIACIONES)
    // ─────────────────────────────────────────────────────────────────
    guardarAvance: async function() {
        try {
            if (!this.datos.cotizacionId) {
                alert('⚠️ Primero selecciona una cotización');
                return;
            }
            
            // ⚠️ OBTENER VALORES COMO STRING PRIMERO
            const semanaInput = document.getElementById('avance-semana')?.value;
            const porcentajeInput = document.getElementById('avance-porcentaje')?.value;
            const montoInput = document.getElementById('avance-monto')?.value;
            
            // ⚠️ VALIDAR QUE LOS CAMPOS NO ESTÉN VACÍOS
            if (!semanaInput || semanaInput.trim() === '') {
                alert('⚠️ Completa el campo "Semana"');
                return;
            }
            
            if (!porcentajeInput || porcentajeInput.trim() === '') {
                alert('⚠️ Completa el campo "Avance Ejecutado (%)"');
                return;
            }
            
            // ⚠️ CONVERTIR DESPUÉS DE VALIDAR
            const semana = parseInt(semanaInput);
            const porcentaje = parseFloat(porcentajeInput);
            const monto = montoInput ? parseFloat(montoInput) : 0;
            
            // ⚠️ VALIDAR RANGOS (PERMITE 0 A 100 CON DECIMALES)
            if (isNaN(semana) || semana <= 0) {
                alert('⚠️ La semana debe ser un número mayor a 0');
                return;
            }
            
            if (isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
                alert('⚠️ El porcentaje debe ser entre 0 y 100 (ej: 45.5)');
                return;
            }
            
            console.log('💾 Guardando avance:', {
                cotizacionId: this.datos.cotizacionId,
                semana: semana,
                porcentaje: porcentaje,
                monto: monto
            });
            
            await window.db.avanceObra.put({
                cotizacionId: parseInt(this.datos.cotizacionId),
                semana: semana,
                porcentajeEjecutado: porcentaje,
                montoEjecutado: monto || 0,
                fecha: new Date().toISOString()
            });
            
            console.log('✅ Avance guardado en DB');
            
            // Recargar avance ejecutado
            await this.cargarAvanceEjecutado();
            
            // Regenerar gráfica
            this.generarGrafica('curva-s-chart');
            
            // ⚠️ IMPORTANTE: Calcular variaciones DESPUÉS de guardar
            this.calcularVariaciones();
            
            alert('✅ Avance semana ' + semana + ' guardado exitosamente');
            
            // Limpiar campos
            document.getElementById('avance-semana').value = '';
            document.getElementById('avance-porcentaje').value = '';
            document.getElementById('avance-monto').value = '';
            
        } catch (error) {
            console.error('❌ Error guardando avance:', error);
            alert('❌ Error: ' + error.message);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // ACTUALIZAR GRÁFICA (CORREGIDO - ACTUALIZA VARIACIONES)
    // ─────────────────────────────────────────────────────────────────
    actualizarGrafica: async function() {
        console.log('🔄 Actualizando gráfica...');
        await this.cargarAvanceEjecutado();
        this.inicializargrafica('curva-s-chart');
        // ⚠️ IMPORTANTE: Calcular variaciones después de actualizar
        this.calcularVariaciones();
        this.calcularProyeccion();
    },
   
    // ─────────────────────────────────────────────────────────────────
    // FUNCIONES AVANZADAS CURVA S (SOLO ENTERPRISE) - CORREGIDO
    // ─────────────────────────────────────────────────────────────────
    generarCurvaAvanzada: async function() {
        // ⚠️ VERIFICAR LICENCIA ENTERPRISE
        const licencia = window.licencia.cargar();
        if (licencia?.tipo !== 'ENTERPRISE') {
            alert('❌ Curva S Avanzada solo disponible en plan ENTERPRISE');
            return;
        }
        
        // ⚠️ VERIFICAR QUE HAY COTIZACIÓN SELECCIONADA
        const cotizacionId = document.getElementById('curva-s-cotizacion')?.value;
        if (!cotizacionId) {
            alert('⚠️ Selecciona una cotización para ver la Curva S Avanzada');
            return;
        }
        
        // ⚠️ LIMPIAR VALORES ANTERIORES
        this.limpiarValoresEVM();
        
        // Mostrar sección avanzada
        const seccionAvanzada = document.getElementById('curva-s-avanzada-seccion');
        if (seccionAvanzada) {
            seccionAvanzada.style.display = 'block';
            seccionAvanzada.scrollIntoView({ behavior: 'smooth' });
        }
        
        // 1. Calcular Valor Ganado (EVM)
        await this.calcularEVM();
        
        // 2. Generar curva de inversión
        await this.generarCurvaInversion();
        
        // 3. Proyección de fecha
        await this.proyectarFechaTerminacion();
        
        console.log('✅ Curva S Avanzada generada');
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CALCULAR EVM (CORREGIDO - CAMPOS CORRECTOS)
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
            
            const avances = await window.db.avanceObra
                .where('cotizacionId')
                .equals(parseInt(cotizacionId))
                .toArray();
            
            console.log('📊 Avances encontrados:', avances);  // ⚠️ DEBUG
            
            if (avances.length === 0) {
                alert('⚠️ No hay avances registrados.\nPara ver EVM, registra al menos 2 avances semanales.');
                this.limpiarValoresEVM();
                return;
            }
            
                // ⚠️ FILTRAR AVANCES CON DATOS VÁLIDOS (VERIFICAR VALOR > 0)
            const avancesValidos = avances.filter(a => {
                const porcentaje = a.porcentajeEjecutado || a.porcentaje || 0;
                return porcentaje >= 0 && porcentaje <= 100;  // ✅ VALIDAR RANGO 0-100
            });
            
            console.log('📊 Avances válidos:', avancesValidos);  // ⚠️ DEBUG
            
            if (avancesValidos.length === 0) {
                alert('⚠️ Los avances registrados no tienen porcentaje válido.');
                this.limpiarValoresEVM();
                return;
            }
            
            // Calcular métricas EVM
            let PV = 0;
            let EV = 0;
            let AC = 0;
            const totalProyecto = parseFloat(cotizacion.totalFinal) || 0;
            
            console.log('💰 Total Proyecto:', totalProyecto);  // ⚠️ DEBUG
            
            if (totalProyecto === 0) {
                console.warn('⚠️ El total del proyecto es 0');
                this.limpiarValoresEVM();
                return;
            }
            
            avancesValidos.forEach((avance, index) => {
                console.log('📊 Procesando avance:', avance);  // ⚠️ DEBUG
                
                // PV = Porcentaje planificado * Total proyecto
                const porcentajePlanificado = ((index + 1) / avancesValidos.length) * 100;
                PV += (porcentajePlanificado / 100) * totalProyecto;
                
                // ⚠️ EV = Porcentaje ejecutado * Total proyecto (CAMPOS CORREGIDOS)
                const porcentajeEjecutado = parseFloat(avance.porcentajeEjecutado || avance.porcentaje || 0);
                console.log('  Porcentaje Ejecutado:', porcentajeEjecutado);  // ⚠️ DEBUG
                EV += (porcentajeEjecutado / 100) * totalProyecto;
                
                // ⚠️ AC = Monto ejecutado real (CAMPOS CORREGIDOS)
                const monto = parseFloat(avance.montoEjecutado || avance.monto || 0);
                console.log('  Monto Ejecutado:', monto);  // ⚠️ DEBUG
                AC += monto;
            });
            
            console.log('📊 EVM Calculado:', { PV, EV, AC });  // ⚠️ DEBUG
            
            // ⚠️ CALCULAR INDICADORES
            const CV = EV - AC;
            const SV = EV - PV;
            const CPI = AC > 0 ? EV / AC : 0;
            const SPI = PV > 0 ? EV / PV : 0;
            const EAC = CPI > 0 ? totalProyecto / CPI : totalProyecto;
            const ETC = EAC - AC;
            const VAC = totalProyecto - EAC;
            
            // ⚠️ ACTUALIZAR UI
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
            
            if (elPV) elPV.textContent = calculator.formatoMoneda(PV);
            if (elEV) elEV.textContent = calculator.formatoMoneda(EV);
            if (elAC) elAC.textContent = calculator.formatoMoneda(AC);
            if (elCV) {
                elCV.textContent = isNaN(CV) ? '$0.00' : calculator.formatoMoneda(CV);
                elCV.style.color = CV >= 0 ? '#4CAF50' : '#f44336';
            }
            if (elSV) {
                elSV.textContent = isNaN(SV) ? '$0.00' : calculator.formatoMoneda(SV);
                elSV.style.color = SV >= 0 ? '#4CAF50' : '#f44336';
            }
            if (elCPI) {
                elCPI.textContent = isNaN(CPI) ? '0.00' : CPI.toFixed(2);
                elCPI.style.color = CPI >= 1 ? '#4CAF50' : '#f44336';
            }
            if (elSPI) {
                elSPI.textContent = isNaN(SPI) ? '0.00' : SPI.toFixed(2);
                elSPI.style.color = SPI >= 1 ? '#4CAF50' : '#f44336';
            }
            if (elEAC) elEAC.textContent = calculator.formatoMoneda(EAC);
            if (elETC) elETC.textContent = calculator.formatoMoneda(ETC);
            if (elVAC) {
                elVAC.textContent = isNaN(VAC) ? '$0.00' : calculator.formatoMoneda(VAC);
                elVAC.style.color = VAC >= 0 ? '#4CAF50' : '#f44336';
            }
            
            // Actualizar indicadores de Curva S básica
            const elVariacionTiempo = document.getElementById('variacion-tiempo');
            const elIndiceTiempo = document.getElementById('indice-tiempo');
            if (elVariacionTiempo) {
                const variacion = ((SPI - 1) * 100).toFixed(1);
                elVariacionTiempo.textContent = (variacion >= 0 ? '+' : '') + variacion + '%';
                elVariacionTiempo.style.color = SPI >= 1 ? '#4CAF50' : '#f44336';
            }
            if (elIndiceTiempo) {
                elIndiceTiempo.textContent = isNaN(SPI) ? '0.00' : SPI.toFixed(2);
                elIndiceTiempo.style.color = SPI >= 1 ? '#4CAF50' : '#f44336';
            }
            
            console.log('📊 EVM Final:', { PV, EV, AC, CV, SV, CPI, SPI, EAC, ETC, VAC });
            
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
            if (!cotizacionId) {
                console.warn('⚠️ No hay cotización seleccionada');
                return;
            }
            
            const cotizacion = await window.db.cotizaciones.get(parseInt(cotizacionId));
            if (!cotizacion) return;
            
            const avances = await window.db.avanceObra
                .where('cotizacionId')
                .equals(parseInt(cotizacionId))
                .toArray();
            
            if (avances.length === 0) {
                console.warn('⚠️ No hay avances para curva de inversión');
                return;
            }
            
            // ⚠️ CALCULAR INVERSIÓN ACUMULADA (CAMPOS CORREGIDOS)
            let inversionAcumulada = 0;
            const datosInversion = avances.map((avance, index) => {
                // ⚠️ USAR montoEjecutado EN VEZ DE monto
                const monto = parseFloat(avance.montoEjecutado || avance.monto || 0);
                inversionAcumulada += monto;
                return {
                    semana: avance.semana || (index + 1),
                    inversion: inversionAcumulada,
                    avance: parseFloat(avance.porcentajeEjecutado || avance.porcentaje || 0)
                };
            });
            
            // ⚠️ ACTUALIZAR UI
            const elInversionTotal = document.getElementById('curva-inversion-total');
            if (elInversionTotal) {
                elInversionTotal.textContent = calculator.formatoMoneda(inversionAcumulada);
            }
            
            console.log('💰 Curva de Inversión generada:', datosInversion);
        } catch (error) {
            console.error('❌ Error generando curva de inversión:', error);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // PROYECTAR FECHA DE TERMINACIÓN (CORREGIDO)
    // ─────────────────────────────────────────────────────────────────
    proyectarFechaTerminacion: async function() {
        try {
            const cotizacionId = document.getElementById('curva-s-cotizacion')?.value;
            if (!cotizacionId) {
                console.warn('⚠️ No hay cotización seleccionada');
                return;
            }
            
            const cotizacion = await window.db.cotizaciones.get(parseInt(cotizacionId));
            if (!cotizacion) return;
            
            const avances = await window.db.avanceObra
                .where('cotizacionId')
                .equals(parseInt(cotizacionId))
                .toArray();
            
            console.log('📊 Avances encontrados:', avances);  // ⚠️ DEBUG
            
            if (avances.length < 2) {
                console.warn('⚠️ Se necesitan al menos 2 avances para proyectar');
                const elSemanasRestantes = document.getElementById('proyeccion-semanas-restantes');
                const elFechaEstimada = document.getElementById('proyeccion-fecha-estimada');
                const elVelocidad = document.getElementById('proyeccion-velocidad');
                if (elSemanasRestantes) elSemanasRestantes.textContent = 'N/A';
                if (elFechaEstimada) elFechaEstimada.textContent = 'N/A';
                if (elVelocidad) elVelocidad.textContent = 'N/A';
                return;
            }
            
            // ⚠️ FILTRAR AVANCES VÁLIDOS (VERIFICAR QUE EL VALOR SEA > 0)
            const avancesValidos = avances.filter(a => {
                const porcentaje = a.porcentajeEjecutado || a.porcentaje || 0;
                const semana = a.semana || 0;
                return porcentaje > 0 && semana > 0;  // ✅ VALIDAR QUE TENGA VALOR
            });
            
            console.log('📊 Avances válidos:', avancesValidos);  // ⚠️ DEBUG
            
            if (avancesValidos.length < 2) {
                console.warn('⚠️ Se necesitan al menos 2 avances con porcentaje > 0');
                console.log('Avances con porcentaje válido:', avancesValidos.length);
                const elSemanasRestantes = document.getElementById('proyeccion-semanas-restantes');
                const elFechaEstimada = document.getElementById('proyeccion-fecha-estimada');
                const elVelocidad = document.getElementById('proyeccion-velocidad');
                if (elSemanasRestantes) elSemanasRestantes.textContent = 'N/A';
                if (elFechaEstimada) elFechaEstimada.textContent = 'N/A';
                if (elVelocidad) elVelocidad.textContent = 'N/A';
                return;
            }
            
            // ⚠️ ORDENAR POR SEMANA (ASEGURAR QUE EL ÚLTIMO SEA EL MÁS RECIENTE)
            avancesValidos.sort(function(a, b) {
                return (a.semana || 0) - (b.semana || 0);
            });
            
            // Calcular velocidad de avance
            const ultimoAvance = avancesValidos[avancesValidos.length - 1];
            const avanceActual = parseFloat(ultimoAvance.porcentajeEjecutado || ultimoAvance.porcentaje || 0);
            const semanaActual = parseInt(ultimoAvance.semana) || avancesValidos.length;
            
            console.log('📊 Último avance:', { avanceActual, semanaActual });  // ⚠️ DEBUG
            
            if (semanaActual === 0 || avanceActual === 0) {
                console.warn('⚠️ Datos inválidos para proyección');
                return;
            }
            
            const velocidad = avanceActual / semanaActual;
            const semanasTotales = velocidad > 0 ? Math.ceil(100 / velocidad) : 0;
            const semanasRestantes = semanasTotales - semanaActual;
            
            const fechaInicio = new Date(cotizacion.fechaInicio || Date.now());
            const fechaEstimada = new Date(fechaInicio);
            fechaEstimada.setDate(fechaInicio.getDate() + (semanasTotales * 7));
            
            // ⚠️ ACTUALIZAR UI
            const elSemanasRestantes = document.getElementById('proyeccion-semanas-restantes');
            const elFechaEstimada = document.getElementById('proyeccion-fecha-estimada');
            const elVelocidad = document.getElementById('proyeccion-velocidad');
            
            if (elSemanasRestantes) {
                elSemanasRestantes.textContent = (semanasRestantes > 0 ? semanasRestantes : 0) + ' semanas';
                elSemanasRestantes.style.color = semanasRestantes > 0 ? '#FF9800' : '#4CAF50';
            }
            if (elFechaEstimada) {
                elFechaEstimada.textContent = fechaEstimada.toLocaleDateString('es-MX');
            }
            if (elVelocidad) {
                elVelocidad.textContent = velocidad.toFixed(2) + '%/semana';
            }
            
            console.log('📅 Proyección calculada:', { semanasTotales, semanasRestantes, fechaEstimada, velocidad });
        } catch (error) {
            console.error('❌ Error proyectando fecha:', error);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // LIMPIAR VALORES EVM (NUEVA FUNCIÓN)
    // ─────────────────────────────────────────────────────────────────
    limpiarValoresEVM: function() {
        const ids = ['evm-pv', 'evm-ev', 'evm-ac', 'evm-cv', 'evm-sv', 'evm-cpi', 'evm-spi', 'evm-eac', 'evm-etc', 'evm-vac'];
        ids.forEach(function(id) {
            const el = document.getElementById(id);
            if (el) {
                if (id.includes('cpi') || id.includes('spi')) {
                    el.textContent = '0.00';
                } else {
                    el.textContent = '$0.00';
                }
                // ⚠️ RESETEAR COLORES
                el.style.color = '#1a1a1a';
            }
        });
        
        // ⚠️ LIMPIAR INDICADORES DE CURVA S BÁSICA
        const elVariacionTiempo = document.getElementById('variacion-tiempo');
        const elIndiceTiempo = document.getElementById('indice-tiempo');
        if (elVariacionTiempo) {
            elVariacionTiempo.textContent = '0.0%';
            elVariacionTiempo.style.color = '#1a1a1a';
        }
        if (elIndiceTiempo) {
            elIndiceTiempo.textContent = '0.00';
            elIndiceTiempo.style.color = '#1a1a1a';
        }
        
        // ⚠️ LIMPIAR PROYECCIÓN DE FECHA
        const elSemanasRestantes = document.getElementById('proyeccion-semanas-restantes');
        const elFechaEstimada = document.getElementById('proyeccion-fecha-estimada');
        const elVelocidad = document.getElementById('proyeccion-velocidad');
        if (elSemanasRestantes) elSemanasRestantes.textContent = '-';
        if (elFechaEstimada) elFechaEstimada.textContent = '-';
        if (elVelocidad) elVelocidad.textContent = '-';
        
        // ⚠️ LIMPIAR CURVA DE INVERSIÓN
        const elInversionTotal = document.getElementById('curva-inversion-total');
        if (elInversionTotal) elInversionTotal.textContent = '$0.00';
        
        console.log('✅ Valores EVM limpiados');
    },
    // ─────────────────────────────────────────────────────────────────
    // EXPORTAR REPORTE PDF (PROFESIONAL - CORREGIDO)
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
            
            const cotizacion = await window.db.cotizaciones.get(parseInt(this.datos.cotizacionId));
            if (!cotizacion) {
                alert('❌ Cotización no encontrada');
                return;
            }
            
            // ─────────────────────────────────────────────────────────
            // ENCABEZADO
            // ─────────────────────────────────────────────────────────
            doc.setFillColor(26, 26, 26);
            doc.rect(0, 0, 210, 30, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(15);
            doc.setFont('helvetica', 'bold');
            doc.text('CURVA S - SEGUIMIENTO DE OBRA', 105, 17, { align: 'center' });
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('SmartCot v2.0 - Reporte de Avance', 105, 25, { align: 'center' });
            
            // ─────────────────────────────────────────────────────────
            // INFORMACIÓN DE LA COTIZACIÓN
            // ─────────────────────────────────────────────────────────
            let yPos = 40;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(10);
            doc.text('Cotizacion #' + this.datos.cotizacionId, 15, yPos);
            yPos += 6;
            doc.text('Cliente: ' + (this.datos.cliente || 'Sin cliente'), 15, yPos);
            yPos += 6;
            doc.text('Fecha de Reporte: ' + new Date().toLocaleDateString('es-MX'), 15, yPos);
            yPos += 6;
            doc.text('Total Proyecto: ' + calculator.formatoMoneda(cotizacion.totalFinal || 0), 15, yPos);
            
            // ─────────────────────────────────────────────────────────
            // INDICADORES DE DESEMPEÑO
            // ─────────────────────────────────────────────────────────
            yPos += 10;
            doc.setFillColor(227, 242, 253);
            doc.rect(15, yPos - 4, 180, 28, 'F');
            doc.setTextColor(21, 101, 192);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('INDICADORES DE DESEMPENO', 20, yPos);
            
            yPos += 8;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(9);
            this.calcularVariaciones();
            const variacion = this.ultimaVariacion || 0;
            const indice = this.ultimoIndice || 0;
            const semana = this.ultimaSemana || 0;
            
            doc.text('Semana Actual: ' + semana, 20, yPos);
            doc.text('Desviacion: ' + (variacion >= 0 ? '+' : '') + variacion.toFixed(1) + '%', 90, yPos);
            doc.text('Indice Desempeno (SPI): ' + indice.toFixed(2), 150, yPos);
            
            // ─────────────────────────────────────────────────────────
            // VALOR GANADO (EVM) - NUEVA SECCION
            // ─────────────────────────────────────────────────────────
            yPos += 15;
            doc.setFillColor(245, 245, 245);
            doc.rect(15, yPos - 4, 180, 5, 'F');
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('VALOR GANADO (EVM)', 20, yPos);
            
            yPos += 8;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            
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
            doc.text('PV (Valor Planificado): ' + (elPV ? elPV.textContent : '$0.00'), 20, yPos);
            doc.text('EV (Valor Ganado): ' + (elEV ? elEV.textContent : '$0.00'), 110, yPos);
            yPos += 5;
            
            // Fila 2
            doc.text('AC (Costo Actual): ' + (elAC ? elAC.textContent : '$0.00'), 20, yPos);
            doc.text('CV (Variacion Costo): ' + (elCV ? elCV.textContent : '$0.00'), 110, yPos);
            yPos += 5;
            
            // Fila 3
            doc.text('SV (Variacion Tiempo): ' + (elSV ? elSV.textContent : '$0.00'), 20, yPos);
            doc.text('CPI (Indice Costo): ' + (elCPI ? elCPI.textContent : '0.00'), 110, yPos);
            yPos += 5;
            
            // Fila 4
            doc.text('SPI (Indice Tiempo): ' + (elSPI ? elSPI.textContent : '0.00'), 20, yPos);
            doc.text('EAC (Estimado Final): ' + (elEAC ? elEAC.textContent : '$0.00'), 110, yPos);
            yPos += 5;
            
            // Fila 5
            doc.text('ETC (Por Completar): ' + (elETC ? elETC.textContent : '$0.00'), 20, yPos);
            doc.text('VAC (Variacion Final): ' + (elVAC ? elVAC.textContent : '$0.00'), 110, yPos);
            
            // ─────────────────────────────────────────────────────────
            // PROYECCION DE FECHA - NUEVA SECCION
            // ─────────────────────────────────────────────────────────
            yPos += 10;
            doc.setFillColor(227, 242, 253);
            doc.rect(15, yPos - 4, 180, 5, 'F');
            doc.setTextColor(21, 101, 192);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('PROYECCION DE TERMINACION', 20, yPos);
            
            yPos += 8;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(26, 26, 26);
            
            const elSemanasRestantes = document.getElementById('proyeccion-semanas-restantes');
            const elFechaEstimada = document.getElementById('proyeccion-fecha-estimada');
            const elVelocidad = document.getElementById('proyeccion-velocidad');
            
            doc.text('Semanas Restantes: ' + (elSemanasRestantes ? elSemanasRestantes.textContent : 'N/A'), 20, yPos);
            doc.text('Fecha Estimada: ' + (elFechaEstimada ? elFechaEstimada.textContent : 'N/A'), 110, yPos);
            yPos += 5;
            doc.text('Velocidad: ' + (elVelocidad ? elVelocidad.textContent : 'N/A'), 20, yPos);
            
            // ─────────────────────────────────────────────────────────
            // CURVA DE INVERSION - NUEVA SECCION
            // ─────────────────────────────────────────────────────────
            yPos += 10;
            doc.setFillColor(255, 243, 224);
            doc.rect(15, yPos - 4, 180, 5, 'F');
            doc.setTextColor(230, 81, 0);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('CURVA DE INVERSION', 20, yPos);
            
            yPos += 8;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(26, 26, 26);
            
            const elInversionTotal = document.getElementById('curva-inversion-total');
            doc.text('Inversion Total Acumulada: ' + (elInversionTotal ? elInversionTotal.textContent : '$0.00'), 20, yPos);
                        
            yPos += 7;
            let interpretacion = '';
            if (indice >= 1.0) {
                interpretacion = '✅ Proyecto: En tiempo';
                doc.setTextColor(76, 175, 80);
            } else if (indice >= 0.9) {
                interpretacion = '⚠️ Proyecto: Ligeramente atrasado';
                doc.setTextColor(255, 152, 0);
            } else {
                interpretacion = '🚨 Proyecto: Atrasado - Accion requerida';
                doc.setTextColor(244, 67, 54);
            }
            doc.setFontSize(8);
            doc.text(interpretacion, 20, yPos);
            
            // ─────────────────────────────────────────────────────────
            // GRÁFICA
            // ─────────────────────────────────────────────────────────
            yPos += 15;
            const canvas = document.getElementById('curva-s-chart');
            if (canvas) {
                const imgData = canvas.toDataURL('image/png');
                doc.addImage(imgData, 'PNG', 15, yPos, 180, 100);
                yPos += 105;
            }
            
            // ─────────────────────────────────────────────────────────
            // TABLA DE AVANCE POR SEMANA
            // ─────────────────────────────────────────────────────────
            yPos += 5;

            // ⚠️ VERIFICAR SI HAY ESPACIO SUFICIENTE (MÍNIMO 40mm)
            if (yPos > 240) {  // ✅ SI ESTÁ MUY CERCA DEL FINAL, NUEVA PÁGINA
                doc.addPage();
                yPos = 20;
            }
            doc.setFillColor(232, 245, 233);
            doc.rect(15, yPos - 4, 180, 5, 'F');
            doc.setTextColor(46, 125, 50);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('AVANCE POR SEMANA', 20, yPos);
            
            yPos += 8;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            
            doc.setFont('helvetica', 'bold');
            doc.text('Semana', 20, yPos);
            doc.text('Programado', 65, yPos);
            doc.text('Ejecutado', 105, yPos);
            doc.text('Desviacion', 145, yPos);
            doc.text('Estado', 175, yPos);
            
            yPos += 2;
            doc.setDrawColor(200);
            doc.line(15, yPos, 195, yPos);
            yPos += 5;
            doc.setFont('helvetica', 'normal');
            
            this.datos.semanas.forEach(function(semana, index) {
                const programado = this.datos.avanceProgramado[index] || 0;
                const ejecutado = this.datos.avanceEjecutado[index] || 0;
                const desviacion = ejecutado - programado;
                let estado = '';
                if (ejecutado === 0 && programado === 0) {
                    estado = 'Pendiente';
                } else if (desviacion >= 0) {
                    estado = 'Adelantado';
                } else if (desviacion >= -5) {
                    estado = 'Ligero atraso';
                } else {
                    estado = 'Atrasado';
                }
                doc.text(semana.replace('Sem ', 'S'), 20, yPos);
                doc.text(programado.toFixed(1) + '%', 65, yPos);
                doc.text(ejecutado.toFixed(1) + '%', 105, yPos);
                doc.text((desviacion >= 0 ? '+' : '') + desviacion.toFixed(1) + '%', 145, yPos);
                doc.text(estado, 175, yPos);
                yPos += 5;
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
            }.bind(this));


            // ─────────────────────────────────────────────────────────
            // MANO DE OBRA (SI ES COTIZACIÓN SOLO MO)
            // ─────────────────────────────────────────────────────────
            if (cotizacion.tipo === 'solo-mano-obra-extraida' && cotizacion.manoObraExtraida) {
                yPos += 10;
                doc.setFillColor(76, 175, 80);
                doc.rect(15, yPos - 5, 180, 5, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('MANO DE OBRA', 20, yPos + 1);
                
                yPos += 8;
                doc.setTextColor(26, 26, 26);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                
                cotizacion.manoObraExtraida.forEach(function(mo) {
                    // ⚠️ USAR conceptoDescripcion SI EXISTE (DESCRIPCIÓN COMPLETA)
                    let conceptoInfo = '';
                    if (mo.conceptoDescripcion && mo.conceptoDescripcion.trim() !== '') {
                        conceptoInfo = mo.conceptoCodigo + ' - ' + mo.conceptoDescripcion;  // ✅ CÓDIGO + DESCRIPCIÓN COMPLETA
                    } else if (mo.concepto && mo.concepto.trim() !== '') {
                        conceptoInfo = mo.concepto;
                    } else if (mo.conceptoCodigo && mo.conceptoCodigo.trim() !== '') {
                        conceptoInfo = mo.conceptoCodigo;
                    } else {
                        conceptoInfo = 'Sin concepto';
                    }
                    
                    // ⚠️ DIVIDIR EN LÍNEAS DE 90 CARACTERES
                    const lineasConcepto = doc.splitTextToSize(conceptoInfo, 90);
                    
                    // ⚠️ ESCRIBIR DESCRIPCIÓN DEL CONCEPTO
                    doc.setFont('helvetica', 'bold');
                    doc.text(lineasConcepto, 20, yPos);
                    yPos += (lineasConcepto.length * 5);
                    
                    // ⚠️ DATOS EN LÍNEAS SEPARADAS
                    doc.setFont('helvetica', 'normal');
                    yPos += 2;
                    doc.text('Puesto: ' + (mo.puesto || 'Sin puesto'), 20, yPos);
                    yPos += 5;
                    doc.text('Jornadas: ' + (mo.jornadas ? mo.jornadas.toFixed(2) : '0') + ' jor', 20, yPos);
                    yPos += 5;
                    doc.text('Costo/Jornada: ' + (mo.costoJornada ? calculator.formatoMoneda(mo.costoJornada) : '$0.00'), 20, yPos);
                    yPos += 5;
                    doc.text('Importe: ' + (mo.importe ? calculator.formatoMoneda(mo.importe) : '$0.00'), 20, yPos);
                    yPos += 8;
                    
                    if (yPos > 250) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
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
                doc.text('Generado por SmartCot v2.0 - ' + new Date().toLocaleDateString('es-MX'), 15, 295);
            }
            
            // ─────────────────────────────────────────────────────────
            // GUARDAR PDF
            // ─────────────────────────────────────────────────────────
            const nombreArchivo = 'Curva-S-Cotizacion-' + this.datos.cotizacionId + '-Reporte.pdf';
            doc.save(nombreArchivo);
            
            console.log('✅ Reporte PDF exportado:', nombreArchivo);
            alert('✅ Reporte exportado exitosamente\n\nIncluye:\n• Gráfica de avance\n• Tabla de desviaciones\n• Índice de desempeño (SPI)\n• Interpretación del estado');
            
        } catch (error) {
            console.error('❌ Error exportando reporte PDF:', error);
            alert('❌ Error al exportar reporte: ' + error.message);
        }
    },
};

console.log('✅ curva-s.js listo');
