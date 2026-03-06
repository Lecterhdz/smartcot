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
    // CARGAR COTIZACIÓN SELECCIONADA
    // ─────────────────────────────────────────────────────────────────
    cargarCotizacion: async function() {
        try {
            const cotizacionId = document.getElementById('curva-s-cotizacion')?.value;
            
            if (!cotizacionId) {
                alert('⚠️ Selecciona una cotización');
                return;
            }
            
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
            
            // Calcular semanas totales desde tiempo de ejecución
            const semanasTotales = Math.ceil(cotizacion.tiempoEjecucion?.semanas || 0) || 1;
            const montoTotal = cotizacion.totalFinal || 0;
            
            // Calcular fechas
            const fechaInicio = cotizacion.fechaInicio ? new Date(cotizacion.fechaInicio) : new Date();
            const fechaFinEstimada = new Date(fechaInicio);
            fechaFinEstimada.setDate(fechaFinEstimada.getDate() + (semanasTotales * 7));
            
            // Calcular fecha fin solicitada por cliente (si existe)
            const fechaFinSolicitada = cotizacion.fechaFinSolicitada ? new Date(cotizacion.fechaFinSolicitada) : null;
            
            // Generar curva programada CON FECHAS
            this.generarCurvaProgramada(semanasTotales, montoTotal, fechaInicio, fechaFinEstimada);
            
            // Cargar avance ejecutado
            await this.cargarAvanceEjecutado();
            
            // Generar gráfica (ESPERAR a que el canvas esté visible)
            setTimeout(() => {
                this.generarGrafica('curva-s-chart');
            }, 300);
            
            // Calcular y mostrar variaciones
            this.calcularVariaciones();
            
            // Mostrar información de la cotización
            this.mostrarInfoCotizacion(cotizacion, fechaInicio, fechaFinEstimada, fechaFinSolicitada);
            
        } catch (error) {
            console.error('❌ Error cargando cotización:', error);
            alert('❌ Error: ' + error.message);
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
    // GENERAR GRÁFICA
    // ─────────────────────────────────────────────────────────────────
    generarGrafica: function(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error('❌ Canvas no encontrado:', canvasId);
            return;
        }
        
        // Verificar que Chart.js está cargado
        if (typeof Chart === 'undefined') {
            console.error('❌ Chart.js no está cargado');
            return;
        }
        
        console.log('📊 Generando gráfica con datos:', {
            semanas: this.datos.semanas,
            programado: this.datos.avanceProgramado,
            ejecutado: this.datos.avanceEjecutado
        });
        
        // Destruir gráfica anterior si existe
        if (this.grafica) {
            this.grafica.destroy();
            this.grafica = null;
        }
        
        // Asegurar que el canvas tenga dimensiones
        canvas.width = canvas.offsetWidth || 800;
        canvas.height = canvas.offsetHeight || 400;
        
        try {
            this.grafica = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: this.datos.semanas,
                    datasets: [
                        {
                            label: 'Programado (%)',
                            data: this.datos.avanceProgramado,
                            borderColor: '#2196F3',
                            backgroundColor: 'rgba(33, 150, 243, 0.1)',
                            borderWidth: 3,
                            tension: 0.4,
                            fill: true,
                            pointRadius: 5,
                            pointHoverRadius: 7
                        },
                        {
                            label: 'Ejecutado (%)',
                            data: this.datos.avanceEjecutado,
                            borderColor: '#4CAF50',
                            backgroundColor: 'rgba(76, 175, 80, 0.1)',
                            borderWidth: 3,
                            tension: 0.4,
                            fill: true,
                            pointRadius: 5,
                            pointHoverRadius: 7
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                font: {
                                    size: 14
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + '%';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                },
                                font: {
                                    size: 12
                                }
                            },
                            title: {
                                display: true,
                                text: 'Avance (%)',
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                }
                            }
                        },
                        x: {
                            ticks: {
                                font: {
                                    size: 12
                                }
                            },
                            title: {
                                display: true,
                                text: 'Semanas',
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                }
                            }
                        }
                    }
                }
            });
            
            console.log('✅ Gráfica generada exitosamente');
            
        } catch (error) {
            console.error('❌ Error generando gráfica:', error);
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
            
            const semana = parseInt(document.getElementById('avance-semana')?.value);
            const porcentaje = parseFloat(document.getElementById('avance-porcentaje')?.value);
            const monto = parseFloat(document.getElementById('avance-monto')?.value);
            
            if (!semana || porcentaje === undefined) {
                alert('⚠️ Completa semana y porcentaje');
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
        this.generarGrafica('curva-s-chart');
        // ⚠️ IMPORTANTE: Calcular variaciones después de actualizar
        this.calcularVariaciones();
    },

    // ─────────────────────────────────────────────────────────────────
    // FUNCIONES AVANZADAS CURVA S (SOLO ENTERPRISE)
    // ─────────────────────────────────────────────────────────────────
    generarCurvaAvanzada: async function() {
        // ⚠️ VERIFICAR LICENCIA ENTERPRISE
        const licencia = window.licencia.cargar();
        if (licencia?.tipo !== 'ENTERPRISE') {
            alert('❌ Curva S Avanzada solo disponible en plan ENTERPRISE');
            return;
        }
        
        // Mostrar sección avanzada
        const seccionAvanzada = document.getElementById('curva-s-avanzada-seccion');
        if (seccionAvanzada) {
            seccionAvanzada.style.display = 'block';
        }
        
        // 1. Calcular Valor Ganado (EVM)
        this.calcularEVM();
        
        // 2. Generar curva de inversión
        this.generarCurvaInversion();
        
        // 3. Proyección de fecha
        this.proyectarFechaTerminacion();
        
        console.log('✅ Curva S Avanzada generada');
    },
    
    calcularEVM: function() {
        // ⚠️ OBTENER DATOS DE LA COTIZACIÓN SELECCIONADA
        const cotizacionId = document.getElementById('curva-s-cotizacion')?.value;
        if (!cotizacionId) {
            console.warn('⚠️ No hay cotización seleccionada para EVM');
            return;
        }
        
        // Obtener cotización de la BD
        window.db.cotizaciones.get(parseInt(cotizacionId)).then(async (cotizacion) => {
            if (!cotizacion) {
                console.warn('⚠️ Cotización no encontrada');
                return;
            }
            
            // Obtener avances registrados
            const avances = await window.db.avanceObra
                .where('cotizacionId')
                .equals(parseInt(cotizacionId))
                .toArray();
            // ⚠️ VALIDAR QUE HAY AVANCES
            if (avances.length === 0) {
                alert('⚠️ No hay avances registrados. Registra al menos 2 avances semanales para ver EVM.');
                
                // Limpiar valores NaN
                this.limpiarValoresEVM();
                return;
            }            
            // Calcular métricas EVM
            let PV = 0; // Planned Value (Valor Planificado)
            let EV = 0; // Earned Value (Valor Ganado)
            let AC = 0; // Actual Cost (Costo Actual)
            
            const totalProyecto = cotizacion.totalFinal || 0;
            
            avances.forEach((avance, index) => {
                // PV = Porcentaje planificado * Total proyecto
                const porcentajePlanificado = ((index + 1) / avances.length) * 100;
                PV += (porcentajePlanificado / 100) * totalProyecto;
                
                // EV = Porcentaje ejecutado * Total proyecto
                EV += (avance.porcentaje / 100) * totalProyecto;
                
                // AC = Monto ejecutado real
                AC += avance.monto || 0;
            });
            
            // Calcular indicadores
            const CV = EV - AC;  // Cost Variance
            const SV = EV - PV;  // Schedule Variance
            const CPI = AC > 0 ? EV / AC : 0;  // Cost Performance Index
            const SPI = PV > 0 ? EV / PV : 0;  // Schedule Performance Index
            const EAC = CPI > 0 ? totalProyecto / CPI : totalProyecto;  // Estimate at Completion
            const ETC = EAC - AC;  // Estimate to Complete
            const VAC = totalProyecto - EAC;  // Variance at Completion
            
            // ⚠️ ACTUALIZAR UI CON LOS VALORES
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
                elCV.textContent = calculator.formatoMoneda(CV);
                elCV.style.color = CV >= 0 ? '#4CAF50' : '#f44336';
            }
            if (elSV) {
                elSV.textContent = calculator.formatoMoneda(SV);
                elSV.style.color = SV >= 0 ? '#4CAF50' : '#f44336';
            }
            if (elCPI) {
                elCPI.textContent = CPI.toFixed(2);
                elCPI.style.color = CPI >= 1 ? '#4CAF50' : '#f44336';
            }
            if (elSPI) {
                elSPI.textContent = SPI.toFixed(2);
                elSPI.style.color = SPI >= 1 ? '#4CAF50' : '#f44336';
            }
            if (elEAC) elEAC.textContent = calculator.formatoMoneda(EAC);
            if (elETC) elETC.textContent = calculator.formatoMoneda(ETC);
            if (elVAC) {
                elVAC.textContent = calculator.formatoMoneda(VAC);
                elVAC.style.color = VAC >= 0 ? '#4CAF50' : '#f44336';
            }
            
            // Actualizar indicadores existentes
            const elVariacionTiempo = document.getElementById('variacion-tiempo');
            const elIndiceTiempo = document.getElementById('indice-tiempo');
            
            if (elVariacionTiempo) {
                const variacion = ((SPI - 1) * 100).toFixed(1);
                elVariacionTiempo.textContent = (variacion >= 0 ? '+' : '') + variacion + '%';
                elVariacionTiempo.style.color = SPI >= 1 ? '#4CAF50' : '#f44336';
            }
            
            if (elIndiceTiempo) {
                elIndiceTiempo.textContent = SPI.toFixed(2);
                elIndiceTiempo.style.color = SPI >= 1 ? '#4CAF50' : '#f44336';
            }
            
            console.log('📊 EVM Calculado:', { PV, EV, AC, CV, SV, CPI, SPI, EAC, ETC, VAC });
        });
    },
    
    generarCurvaInversion: function() {
        // ⚠️ OBTENER DATOS DE LA COTIZACIÓN SELECCIONADA
        const cotizacionId = document.getElementById('curva-s-cotizacion')?.value;
        if (!cotizacionId) {
            console.warn('⚠️ No hay cotización seleccionada para Curva de Inversión');
            return;
        }
        
        window.db.cotizaciones.get(parseInt(cotizacionId)).then(async (cotizacion) => {
            if (!cotizacion) return;
            
            const avances = await window.db.avanceObra
                .where('cotizacionId')
                .equals(parseInt(cotizacionId))
                .toArray();
            
            // Calcular inversión acumulada
            let inversionAcumulada = 0;
            const datosInversion = avances.map((avance, index) => {
                inversionAcumulada += avance.monto || 0;
                return {
                    semana: avance.semana || (index + 1),
                    inversion: inversionAcumulada,
                    avance: avance.porcentaje || 0
                };
            });
            
            // ⚠️ ACTUALIZAR UI
            const elInversionTotal = document.getElementById('curva-inversion-total');
            if (elInversionTotal) {
                elInversionTotal.textContent = calculator.formatoMoneda(inversionAcumulada);
            }
            
            console.log('💰 Curva de Inversión generada:', datosInversion);
        });
    },
    
    proyectarFechaTerminacion: function() {
        // ⚠️ OBTENER DATOS DE LA COTIZACIÓN SELECCIONADA
        const cotizacionId = document.getElementById('curva-s-cotizacion')?.value;
        if (!cotizacionId) {
            console.warn('⚠️ No hay cotización seleccionada para Proyección');
            return;
        }
        
        window.db.cotizaciones.get(parseInt(cotizacionId)).then(async (cotizacion) => {
            if (!cotizacion) return;
            
            const avances = await window.db.avanceObra
                .where('cotizacionId')
                .equals(parseInt(cotizacionId))
                .toArray();
            
            if (avances.length < 2) {
                console.warn('⚠️ Se necesitan al menos 2 avances para proyectar');
                return;
            }
            
            // Calcular velocidad de avance
            const avanceActual = avances[avances.length - 1].porcentaje || 0;
            const semanaActual = avances[avances.length - 1].semana || avances.length;
            const velocidad = avanceActual / semanaActual;
            
            // Proyectar semanas restantes
            const semanasTotales = velocidad > 0 ? Math.ceil(100 / velocidad) : 0;
            const semanasRestantes = semanasTotales - semanaActual;
            
            // Calcular fecha estimada de terminación
            const fechaInicio = new Date(cotizacion.fechaInicio || Date.now());
            const fechaEstimada = new Date(fechaInicio);
            fechaEstimada.setDate(fechaInicio.getDate() + (semanasTotales * 7));
            
            // ⚠️ ACTUALIZAR UI
            const elSemanasRestantes = document.getElementById('proyeccion-semanas-restantes');
            const elFechaEstimada = document.getElementById('proyeccion-fecha-estimada');
            const elVelocidad = document.getElementById('proyeccion-velocidad');
            
            if (elSemanasRestantes) {
                elSemanasRestantes.textContent = semanasRestantes + ' semanas';
                elSemanasRestantes.style.color = semanasRestantes > 0 ? '#FF9800' : '#4CAF50';
            }
            
            if (elFechaEstimada) {
                elFechaEstimada.textContent = fechaEstimada.toLocaleDateString('es-MX');
            }
            
            if (elVelocidad) {
                elVelocidad.textContent = velocidad.toFixed(2) + '%/semana';
            }
            
            console.log('📅 Proyección de fecha calculada:', {
                semanasTotales,
                semanasRestantes,
                fechaEstimada,
                velocidad
            });
        });
    },
    // ─────────────────────────────────────────────────────────────────
    // EXPORTAR REPORTE PDF (CORREGIDO - INCLUYE DESVIACIÓN E ÍNDICE)
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
            
            // Obtener cotización
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
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('CURVA S - SEGUIMIENTO DE OBRA', 105, 18, { align: 'center' });
            
            doc.setFontSize(10);
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
            
            // ─────────────────────────────────────────────────────────────────
            // INDICADORES DE DESEMPEÑO (CORREGIDO - DENTRO DEL MARGEN)
            // ─────────────────────────────────────────────────────────────────
            yPos += 10;
            
            doc.setFillColor(227, 242, 253);
            doc.rect(15, yPos - 5, 180, 25, 'F');  // ← Altura aumentada de 20 a 25
            
            doc.setTextColor(21, 101, 192);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('📊 INDICADORES DE DESEMPEÑO', 20, yPos);
            
            yPos += 8;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(9);  // ← Tamaño reducido de 10 a 9
            
            // Calcular variación e índice actuales
            this.calcularVariaciones();
            
            const variacion = this.ultimaVariacion || 0;
            const indice = this.ultimoIndice || 0;
            const semana = this.ultimaSemana || 0;
            
            // Primera fila
            doc.text('Semana Actual: ' + semana, 20, yPos);
            doc.text('Desviacion: ' + (variacion >= 0 ? '+' : '') + variacion.toFixed(1) + '%', 90, yPos);
            doc.text('Indice Desempeno (SPI): ' + indice.toFixed(2), 150, yPos);
            
            // Segunda fila (interpretación) - MOVIDA HACIA ABAJO
            yPos += 6;
            let interpretacion = '';
            if (indice >= 1.0) {
                interpretacion = '✅ Proyecto adelantado o en tiempo';
                doc.setTextColor(76, 175, 80);
            } else if (indice >= 0.9) {
                interpretacion = '⚠️ Proyecto ligeramente atrasado';
                doc.setTextColor(255, 152, 0);
            } else {
                interpretacion = '🚨 Proyecto atrasado - Accion requerida';
                doc.setTextColor(244, 67, 54);
            }
            doc.setFontSize(8);  // ← Tamaño más pequeño
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
            
            doc.setFillColor(232, 245, 233);
            doc.rect(15, yPos - 5, 180, 5, 'F');
            
            doc.setTextColor(46, 125, 50);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('📈 AVANCE POR SEMANA', 20, yPos);
            
            yPos += 8;
            doc.setTextColor(26, 26, 26);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            
            // Encabezados de tabla
            doc.setFont('helvetica', 'bold');
            doc.text('Semana', 20, yPos);
            doc.text('Programado', 60, yPos);
            doc.text('Ejecutado', 100, yPos);
            doc.text('Desviacion', 140, yPos);
            doc.text('Estado', 180, yPos);
            
            yPos += 2;
            doc.setDrawColor(200);
            doc.line(15, yPos, 195, yPos);
            yPos += 5;
            
            doc.setFont('helvetica', 'normal');
            
            // Filas de la tabla
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
                doc.text(programado.toFixed(1) + '%', 60, yPos);
                doc.text(ejecutado.toFixed(1) + '%', 100, yPos);
                doc.text((desviacion >= 0 ? '+' : '') + desviacion.toFixed(1) + '%', 140, yPos);
                doc.text(estado, 180, yPos);
                
                yPos += 5;
                
                // Verificar si necesita nueva página
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
            }.bind(this));
            
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
    }
};

console.log('✅ curva-s.js listo');
