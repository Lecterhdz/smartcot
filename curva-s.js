// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - CURVA S (PROGRAMADO VS EJECUTADO)
// ─────────────────────────────────────────────────────────────────────

console.log('📈 curva-s.js cargado');

window.curvaS = {
    
    datos: {
        cotizacionId: null,
        semanas: [],
        avanceProgramado: [],
        avanceEjecutado: []
    },
    
    grafica: null,
    
    // ─────────────────────────────────────────────────────────────────
    // CARGAR COTIZACIÓN
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
            
            this.datos.cotizacionId = cotizacionId;
            
            // Calcular semanas totales
            const semanasTotales = Math.ceil(cotizacion.tiempoEjecucion?.semanas || 0);
            
            // Generar curva programada
            this.generarCurvaProgramada(semanasTotales, cotizacion.totalFinal);
            
            // Cargar avance ejecutado (si existe)
            await this.cargarAvanceEjecutado();
            
            // Generar gráfica
            this.generarGrafica('curva-s-chart');
            
            // Calcular variaciones
            this.calcularVariaciones();
            
            console.log('✅ Curva S cargada:', this.datos);
            
        } catch (error) {
            console.error('❌ Error cargando curva S:', error);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // GENERAR CURVA PROGRAMADA
    // ─────────────────────────────────────────────────────────────────
    generarCurvaProgramada: function(semanasTotales, montoTotal) {
        this.datos.semanas = [];
        this.datos.avanceProgramado = [];
        
        let acumulado = 0;
        
        for (let i = 1; i <= semanasTotales; i++) {
            this.datos.semanas.push('Sem ' + i);
            
            // S-Curve típica
            const progreso = i / semanasTotales;
            const sCurve = Math.pow(progreso, 2) * (3 - 2 * progreso) * 100;
            
            acumulado = Math.min(sCurve, 100);
            this.datos.avanceProgramado.push(acumulado);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CARGAR AVANCE EJECUTADO
    // ─────────────────────────────────────────────────────────────────
    cargarAvanceEjecutado: async function() {
        try {
            const avance = await window.db.avanceObra
                .where('cotizacionId')
                .equals(parseInt(this.datos.cotizacionId))
                .toArray();
            
            this.datos.avanceEjecutado = avance.map(a => a.porcentajeEjecutado || 0);
            
            // Rellenar con ceros si hay menos semanas
            while (this.datos.avanceEjecutado.length < this.datos.semanas.length) {
                this.datos.avanceEjecutado.push(0);
            }
            
        } catch (error) {
            console.error('❌ Error cargando avance:', error);
            this.datos.avanceEjecutado = new Array(this.datos.semanas.length).fill(0);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // GENERAR GRÁFICA
    // ─────────────────────────────────────────────────────────────────
    generarGrafica: function(canvasId) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error('❌ Canvas no encontrado');
            return;
        }
        
        // Destruir gráfica anterior
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
    // GUARDAR AVANCE SEMANAL
    // ─────────────────────────────────────────────────────────────────
    guardarAvance: async function() {
        try {
            const semana = parseInt(document.getElementById('avance-semana')?.value);
            const porcentaje = parseFloat(document.getElementById('avance-porcentaje')?.value);
            const monto = parseFloat(document.getElementById('avance-monto')?.value);
            
            if (!semana || !porcentaje) {
                alert('⚠️ Completa semana y porcentaje');
                return;
            }
            
            await window.db.avanceObra.put({
                cotizacionId: parseInt(this.datos.cotizacionId),
                semana: semana,
                porcentajeEjecutado: porcentaje,
                montoEjecutado: monto || 0,
                fecha: new Date().toISOString()
            });
            
            await this.cargarAvanceEjecutado();
            this.generarGrafica('curva-s-chart');
            this.calcularVariaciones();
            
            alert('✅ Avance guardado exitosamente');
            
        } catch (error) {
            console.error('❌ Error guardando avance:', error);
            alert('❌ Error: ' + error.message);
        }
    }
};

console.log('✅ curva-s.js listo');
