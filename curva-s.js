// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - CURVA S (PROGRAMADO VS EJECUTADO) - CORREGIDO
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
            const cotizacion = await window.db.cotizaciones.get(parseInt(cotizacionId));
            
            // Calcular fechas
            const fechaInicio = cotizacion.fechaInicio ? new Date(cotizacion.fechaInicio) : new Date();
            const semanasTotales = Math.ceil(cotizacion.tiempoEjecucion?.semanas || 0) || 1;
            const fechaFin = new Date(fechaInicio);
            fechaFin.setDate(fechaFin.getDate() + (semanasTotales * 7));
            
            // Generar curva programada CON FECHAS
            this.generarCurvaProgramada(semanasTotales, cotizacion.totalFinal, fechaInicio, fechaFin);
            
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
            
            // Generar curva programada
            this.generarCurvaProgramada(semanasTotales, montoTotal);
            
            // Cargar avance ejecutado
            await this.cargarAvanceEjecutado();
            
            // Generar gráfica (ESPERAR a que el canvas esté visible)
            setTimeout(() => {
                this.generarGrafica('curva-s-chart');
            }, 300);
            
            // Calcular y mostrar variaciones
            this.calcularVariaciones();
            
            // Mostrar información de la cotización
            this.mostrarInfoCotizacion(cotizacion, fechaInicio, fechaFinEstimada);
            
        } catch (error) {
            console.error('❌ Error cargando cotización:', error);
            alert('❌ Error: ' + error.message);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // MOSTRAR INFORMACIÓN DE COTIZACIÓN (CON TODOS LOS CAMPOS)
    // ─────────────────────────────────────────────────────────────────
    mostrarInfoCotizacion: function(cotizacion, fechaInicio, fechaFinEstimada) {
        const infoDiv = document.getElementById('curva-s-info-cotizacion');
        if (!infoDiv) return;
        
        const semanasTotales = Math.ceil(cotizacion.tiempoEjecucion?.semanas || 0) || 1;
        
        // Calcular fecha fin solicitada por cliente (si existe)
        const fechaFinSolicitada = cotizacion.fechaFinSolicitada ? new Date(cotizacion.fechaFinSolicitada) : null;
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
    // CARGAR AVANCE EJECUTADO (CORREGIDO)
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
    // GENERAR GRÁFICA (CORREGIDO - CON ESPERA DE VISIBILIDAD)
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
    // CALCULAR VARIACIONES
    // ─────────────────────────────────────────────────────────────────
    calcularVariaciones: function() {
        const ultimaSemana = this.datos.avanceProgramado.length - 1;
        
        const avanceProgramado = this.datos.avanceProgramado[ultimaSemana] || 0;
        const avanceEjecutado = this.datos.avanceEjecutado[ultimaSemana] || 0;
        
        const variacionTiempo = avanceEjecutado - avanceProgramado;
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
    },
    
    // ─────────────────────────────────────────────────────────────────
    // GUARDAR AVANCE SEMANAL (CORREGIDO - ACTUALIZA GRÁFICA)
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
            
            // Regenerar gráfica (ESPERAR a que los datos se carguen)
            setTimeout(() => {
                this.generarGrafica('curva-s-chart');
                this.calcularVariaciones();
            }, 300);
            
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
    // ACTUALIZAR GRÁFICA (NUEVA FUNCIÓN PARA REFRESCAR)
    // ─────────────────────────────────────────────────────────────────
    actualizarGrafica: async function() {
        console.log('🔄 Actualizando gráfica...');
        await this.cargarAvanceEjecutado();
        this.generarGrafica('curva-s-chart');
        this.calcularVariaciones();
    },
    
    // ─────────────────────────────────────────────────────────────────
    // EXPORTAR DATOS PARA REPORTE
    // ─────────────────────────────────────────────────────────────────
    exportarDatosReporte: function() {
        const reporte = {
            cotizacionId: this.datos.cotizacionId,
            cotizacionNumero: this.datos.cotizacionNumero,
            cliente: this.datos.cliente,
            fechaExportacion: new Date().toISOString(),
            semanas: this.datos.semanas,
            avanceProgramado: this.datos.avanceProgramado,
            avanceEjecutado: this.datos.avanceEjecutado,
            montoProgramado: this.datos.montoProgramado,
            montoEjecutado: this.datos.montoEjecutado
        };
        
        // Descargar como JSON
        const blob = new Blob([JSON.stringify(reporte, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'curva-s-cotizacion-' + this.datos.cotizacionNumero + '.json';
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('✅ Datos exportados:', reporte);
        return reporte;
    }
};

    // ─────────────────────────────────────────────────────────────────────
    // EXPORTAR REPORTE PDF (NUEVA FUNCIÓN)
    // ─────────────────────────────────────────────────────────────────────
    exportarReportePDF: async function() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Encabezado
            doc.setFontSize(18);
            doc.text('CURVA S - SEGUIMIENTO DE OBRA', 105, 20, { align: 'center' });
            
            // Información de cotización
            doc.setFontSize(12);
            doc.text('Cotización #' + this.datos.cotizacionId, 20, 40);
            doc.text('Cliente: ' + this.datos.cliente, 20, 50);
            doc.text('Fecha de Reporte: ' + new Date().toLocaleDateString('es-MX'), 20, 60);
            
            // Gráfica (capturar canvas)
            const canvas = document.getElementById('curva-s-chart');
            if (canvas) {
                const imgData = canvas.toDataURL('image/png');
                doc.addImage(imgData, 'PNG', 20, 80, 170, 100);
            }
            
            // Tabla de avance
            doc.text('Avance por Semana:', 20, 190);
            doc.setFontSize(10);
            
            let yPos = 200;
            this.datos.semanas.forEach((semana, index) => {
                const programado = this.datos.avanceProgramado[index]?.toFixed(2) || 0;
                const ejecutado = this.datos.avanceEjecutado[index]?.toFixed(2) || 0;
                const desviacion = ((ejecutado - programado)).toFixed(2);
                
                doc.text(semana + ' | Prog: ' + programado + '% | Ejec: ' + ejecutado + '% | Dev: ' + desviacion + '%', 20, yPos);
                yPos += 7;
                
                if (yPos > 280) {
                    doc.addPage();
                    yPos = 20;
                }
            });
            
            // Descargar PDF
            doc.save('Curva-S-Cotizacion-' + this.datos.cotizacionId + '.pdf');
            
            console.log('✅ Reporte PDF exportado');
            
        } catch (error) {
            console.error('❌ Error exportando PDF:', error);
            alert('❌ Error: ' + error.message);
        }
    },


console.log('✅ curva-s.js listo');
