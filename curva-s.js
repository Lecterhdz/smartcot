// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - CURVA S (PROGRAMADO VS EJECUTADO)
// ─────────────────────────────────────────────────────────────────────

console.log('📈 curva-s.js cargado');

window.curvaS = {
    
    // ─────────────────────────────────────────────────────────────────
    // DATOS DE LA CURVA S
    // ─────────────────────────────────────────────────────────────────
    datos: {
        cotizacionId: null,
        semanas: [],
        avanceProgramado: [],
        avanceEjecutado: [],
        montoProgramado: [],
        montoEjecutado: []
    },
    
    // ─────────────────────────────────────────────────────────────────
    // INICIALIZAR CURVA S DESDE COTIZACIÓN
    // ─────────────────────────────────────────────────────────────────
    inicializarDesdeCotizacion: async function(cotizacionId) {
        try {
            const cotizacion = await window.db.cotizaciones.get(cotizacionId);
            if (!cotizacion) {
                console.error('❌ Cotización no encontrada');
                return;
            }
            
            this.datos.cotizacionId = cotizacionId;
            
            // Calcular semanas totales
            const semanasTotales = Math.ceil(cotizacion.tiempoEjecucion?.semanas || 0);
            
            // Generar curva programada (distribución lineal o S-curve típica)
            this.generarCurvaProgramada(semanasTotales, cotizacion.totalFinal);
            
            // Cargar avance ejecutado si existe
            await this.cargarAvanceEjecutado();
            
            console.log('✅ Curva S inicializada:', this.datos);
            
        } catch (error) {
            console.error('❌ Error inicializando curva S:', error);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // GENERAR CURVA PROGRAMADA (S-CURVE TÍPICA)
    // ─────────────────────────────────────────────────────────────────
    generarCurvaProgramada: function(semanasTotales, montoTotal) {
        this.datos.semanas = [];
        this.datos.avanceProgramado = [];
        this.datos.montoProgramado = [];
        
        let acumulado = 0;
        
        for (let i = 1; i <= semanasTotales; i++) {
            this.datos.semanas.push('Sem ' + i);
            
            // S-Curve típica: lento al inicio, rápido en medio, lento al final
            const porcentajeSemana = this.calcularPorcentajeSCurve(i, semanasTotales);
            acumulado += porcentajeSemana;
            
            this.datos.avanceProgramado.push(Math.min(acumulado, 100));
            this.datos.montoProgramado.push((Math.min(acumulado, 100) / 100) * montoTotal);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CALCULAR PORCENTAJE S-CURVE (Fórmula de distribución típica)
    // ─────────────────────────────────────────────────────────────────
    calcularPorcentajeSCurve: function(semanaActual, semanasTotales) {
        const progreso = semanaActual / semanasTotales;
        
        // Fórmula S-Curve simplificada
        const sCurve = Math.pow(progreso, 2) * (3 - 2 * progreso) * 100;
        
        // Distribuir entre las semanas
        if (semanaActual === 1) {
            return sCurve;
        } else {
            const progresoAnterior = (semanaActual - 1) / semanasTotales;
            const sCurveAnterior = Math.pow(progresoAnterior, 2) * (3 - 2 * progresoAnterior) * 100;
            return sCurve - sCurveAnterior;
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CARGAR AVANCE EJECUTADO
    // ─────────────────────────────────────────────────────────────────
    cargarAvanceEjecutado: async function() {
        try {
            const avance = await window.db.avanceObra
                .where('cotizacionId')
                .equals(this.datos.cotizacionId)
                .toArray();
            
            this.datos.avanceEjecutado = avance.map(a => a.porcentajeEjecutado || 0);
            this.datos.montoEjecutado = avance.map(a => a.montoEjecutado || 0);
            
        } catch (error) {
            console.error('❌ Error cargando avance:', error);
            this.datos.avanceEjecutado = new Array(this.datos.semanas.length).fill(0);
            this.datos.montoEjecutado = new Array(this.datos.semanas.length).fill(0);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // GUARDAR AVANCE SEMANAL
    // ─────────────────────────────────────────────────────────────────
    guardarAvanceSemanal: async function(semana, porcentajeEjecutado, montoEjecutado) {
        try {
            await window.db.avanceObra.put({
                cotizacionId: this.datos.cotizacionId,
                semana: semana,
                porcentajeEjecutado: porcentajeEjecutado,
                montoEjecutado: montoEjecutado,
                fecha: new Date().toISOString()
            });
            
            await this.cargarAvanceEjecutado();
            console.log('✅ Avance semana', semana, 'guardado');
            
        } catch (error) {
            console.error('❌ Error guardando avance:', error);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CALCULAR VARIACIONES
    // ─────────────────────────────────────────────────────────────────
    calcularVariaciones: function() {
        const ultimaSemana = this.datos.avanceProgramado.length - 1;
        
        const avanceProgramado = this.datos.avanceProgramado[ultimaSemana] || 0;
        const avanceEjecutado = this.datos.avanceEjecutado[ultimaSemana] || 0;
        const montoProgramado = this.datos.montoProgramado[ultimaSemana] || 0;
        const montoEjecutado = this.datos.montoEjecutado[ultimaSemana] || 0;
        
        return {
            variacionTiempo: avanceEjecutado - avanceProgramado,
            variacionCosto: montoEjecutado - montoProgramado,
            indiceDesempenoTiempo: avanceProgramado > 0 ? (avanceEjecutado / avanceProgramado) : 0,
            indiceDesempenoCosto: montoProgramado > 0 ? (montoEjecutado / montoProgramado) : 0
        };
    },
    
    // ─────────────────────────────────────────────────────────────────
    // GENERAR GRÁFICA (USANDO CHART.JS)
    // ─────────────────────────────────────────────────────────────────
    generarGrafica: function(canvasId) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error('❌ Canvas no encontrado');
            return;
        }
        
        // Destruir gráfica anterior si existe
        if (this.grafica) {
            this.grafica.destroy();
        }
        
        this.grafica = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.datos.semanas,
                datasets: [
                    {
                        label: 'Programado (%)',
                        data: this.datos.avanceProgramado,
                        borderColor: '#2196F3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Ejecutado (%)',
                        data: this.datos.avanceEjecutado,
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top'
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
                            }
                        }
                    }
                }
            }
        });
    }
};

console.log('✅ curva-s.js listo');
