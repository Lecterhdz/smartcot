// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - CURVA S (PROGRAMADO VS EJECUTADO)
// ─────────────────────────────────────────────────────────────────────

console.log('📈 curva-s.js cargado');

window.curvaS = {
    
    datos: {
        cotizacionId: null,
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
            
            // Obtener clientes para mostrar nombres
            const clientes = await window.db.clientes.toArray();
            
            select.innerHTML = '<option value="">Seleccionar cotización...</option>' +
                cotizaciones.map(function(c) {
                    const cliente = clientes.find(cl => cl.id == c.clienteId);
                    const clienteNombre = cliente ? cliente.nombre : 'Sin cliente';
                    const fecha = new Date(c.fecha).toLocaleDateString('es-MX');
                    const total = calculator.formatoMoneda(c.totalFinal || 0);
                    
                    return '<option value="' + c.id + '">' + 
                        c.id + ' - ' + clienteNombre + ' - ' + total + ' (' + fecha + ')' +
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
            
            // Calcular semanas totales desde tiempo de ejecución
            const semanasTotales = Math.ceil(cotizacion.tiempoEjecucion?.semanas || 0) || 1;
            const montoTotal = cotizacion.totalFinal || 0;
            
            // Generar curva programada
            this.generarCurvaProgramada(semanasTotales, montoTotal);
            
            // Cargar avance ejecutado si existe
            await this.cargarAvanceEjecutado();
            
            // Generar gráfica
            this.generarGrafica('curva-s-chart');
            
            // Calcular y mostrar variaciones
            this.calcularVariaciones();
            
            // Mostrar información de la cotización
            this.mostrarInfoCotizacion(cotizacion);
            
        } catch (error) {
            console.error('❌ Error cargando cotización:', error);
            alert('❌ Error: ' + error.message);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // MOSTRAR INFORMACIÓN DE COTIZACIÓN
    // ─────────────────────────────────────────────────────────────────
    mostrarInfoCotizacion: function(cotizacion) {
        const infoDiv = document.getElementById('curva-s-info-cotizacion');
        if (!infoDiv) return;
        
        infoDiv.innerHTML = `
            <div style="background:#E3F2FD;padding:15px;border-radius:10px;margin-bottom:20px;">
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;">
                    <div>
                        <div style="font-size:11px;color:#666;">Cotización #</div>
                        <div style="font-size:16px;font-weight:700;color:#1a1a1a;">${cotizacion.id}</div>
                    </div>
                    <div>
                        <div style="font-size:11px;color:#666;">Total</div>
                        <div style="font-size:16px;font-weight:700;color:#4CAF50;">${calculator.formatoMoneda(cotizacion.totalFinal || 0)}</div>
                    </div>
                    <div>
                        <div style="font-size:11px;color:#666;">Tiempo Estimado</div>
                        <div style="font-size:16px;font-weight:700;color:#2196F3;">${cotizacion.tiempoEjecucion?.semanas || 0} semanas</div>
                    </div>
                    <div>
                        <div style="font-size:11px;color:#666;">Fecha</div>
                        <div style="font-size:16px;font-weight:700;color:#1a1a1a;">${new Date(cotizacion.fecha).toLocaleDateString('es-MX')}</div>
                    </div>
                </div>
            </div>
        `;
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
            
            // Inicializar arrays con ceros
            this.datos.avanceEjecutado = new Array(this.datos.semanas.length).fill(0);
            this.datos.montoEjecutado = new Array(this.datos.semanas.length).fill(0);
            
            // Llenar con datos reales
            avance.forEach(function(a) {
                const semanaIndex = a.semana - 1;
                if (semanaIndex >= 0 && semanaIndex < this.datos.avanceEjecutado.length) {
                    this.datos.avanceEjecutado[semanaIndex] = a.porcentajeEjecutado || 0;
                    this.datos.montoEjecutado[semanaIndex] = a.montoEjecutado || 0;
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
    // GUARDAR AVANCE SEMANAL
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
            
            alert('✅ Avance semana ' + semana + ' guardado exitosamente');
            
            // Limpiar campos
            document.getElementById('avance-semana').value = '';
            document.getElementById('avance-porcentaje').value = '';
            document.getElementById('avance-monto').value = '';
            
        } catch (error) {
            console.error('❌ Error guardando avance:', error);
            alert('❌ Error: ' + error.message);
        }
    }
};

console.log('✅ curva-s.js listo');
