// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - MOTOR DE EQUIPOS
// Basado en estructura REAL de tu Excel (CF***, LL***)
// ─────────────────────────────────────────────────────────────────────

console.log('🏗️ equipos.engine.js cargado');

window.equiposEngine = {
    
    // ─────────────────────────────────────────────────────────────────
    // CATÁLOGO DE EQUIPOS SEGÚN TU EXCEL
    // ─────────────────────────────────────────────────────────────────
    catalogoEquipos: {
        // Grúas
        'CFGRUA': { 
            nombre: 'Grúa de Patio Pettibone 20 Ton', 
            unidad: 'HRS', 
            costoBase: 571.39,
            categoria: 'Izaje',
            requiereOperador: true
        },
        'LLGRUA': { 
            nombre: 'Llantas Grúa Pettibone', 
            unidad: 'JGO', 
            costoBase: 335608.00,
            categoria: 'Refacciones',
            requiereOperador: false
        },
        
        // Equipos de Corte y Soldadura
        'CFECORTE': { 
            nombre: 'Equipo de Corte Oxi-Acetileno', 
            unidad: 'HRS', 
            costoBase: 4.03,
            categoria: 'Corte',
            requiereOperador: false
        },
        'CFPLAN': { 
            nombre: 'Planta de Soldar Miller', 
            unidad: 'HRS', 
            costoBase: 10.00,
            categoria: 'Soldadura',
            requiereOperador: false
        },
        'CFDOBLA': { 
            nombre: 'Máquina Dobladora de Lámina', 
            unidad: 'HRS', 
            costoBase: 8.98,
            categoria: 'Doblado',
            requiereOperador: false
        },
        
        // Andamios
        'CFTORRE': { 
            nombre: 'Andamios Metálico (Módulo 1.80m)', 
            unidad: 'HRS', 
            costoBase: 2.41,
            categoria: 'Acceso',
            requiereOperador: false
        },
        'LLTORRE': { 
            nombre: 'Llantas Andamios Metálico', 
            unidad: 'JGO', 
            costoBase: 2862.00,
            categoria: 'Refacciones',
            requiereOperador: false
        },
        
        // Camiones y Transporte
        'CFCAMION': { 
            nombre: 'Camión de Volteo 7 M3', 
            unidad: 'HRS', 
            costoBase: 199.67,
            categoria: 'Transporte',
            requiereOperador: true
        },
        'LLCAMION': { 
            nombre: 'Llantas Camión', 
            unidad: 'JGO', 
            costoBase: 5000.00,
            categoria: 'Refacciones',
            requiereOperador: false
        },
        'LLCAMIONPP': { 
            nombre: 'Llantas Camión Patrón', 
            unidad: 'JGO', 
            costoBase: 6500.00,
            categoria: 'Refacciones',
            requiereOperador: false
        },
        
        // Equipos Especializados
        'CFASPIRAR': { 
            nombre: 'Aspiradora Eléctrica', 
            unidad: 'HRS', 
            costoBase: 11.88,
            categoria: 'Limpieza',
            requiereOperador: false
        },
        'CFVIB': { 
            nombre: 'Vibradora para Concreto', 
            unidad: 'HRS', 
            costoBase: 15.00,
            categoria: 'Compactación',
            requiereOperador: false
        },
        'LLREV': { 
            nombre: 'Llantas para Revolvedor', 
            unidad: 'JGO', 
            costoBase: 1636.00,
            categoria: 'Refacciones',
            requiereOperador: false
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CALCULAR EQUIPOS PARA UN CONCEPTO
    // ─────────────────────────────────────────────────────────────────
    calcularEquipos: function(concepto) {
        const equiposCalculo = [];
        let totalEquipos = 0;
        
        if (concepto.recursos?.equipos) {
            concepto.recursos.equipos.forEach(equipo => {
                const catalogo = this.catalogoEquipos[equipo.equipo_codigo || equipo.codigo];
                
                equiposCalculo.push({
                    codigo: equipo.equipo_codigo || equipo.codigo,
                    nombre: equipo.nombre || catalogo?.nombre || 'Equipo sin nombre',
                    unidad: equipo.horas > 0 ? 'HRS' : 'JGO',
                    cantidad: equipo.horas || 1,
                    precioUnitario: equipo.costo_unitario || catalogo?.costoBase || 0,
                    importe: equipo.importe || 0,
                    categoria: catalogo?.categoria || 'General',
                    requiereOperador: catalogo?.requiereOperador || false
                });
                
                totalEquipos += equipo.importe || 0;
            });
        }
        
        return {
            detalle: equiposCalculo,
            total: totalEquipos,
            count: equiposCalculo.length
        };
    },
    
    // ─────────────────────────────────────────────────────────────────
    // OBTENER EQUIPO POR CÓDIGO
    // ─────────────────────────────────────────────────────────────────
    obtenerEquipo: function(codigo) {
        return this.catalogoEquipos[codigo] || null;
    },
    
    // ─────────────────────────────────────────────────────────────────
    // ACTUALIZAR COSTOS DE EQUIPOS (INFLACIÓN)
    // ─────────────────────────────────────────────────────────────────
    actualizarCostos: function(factorInflacion, year) {
        Object.keys(this.catalogoEquipos).forEach(codigo => {
            const costoAnterior = this.catalogoEquipos[codigo].costoBase;
            this.catalogoEquipos[codigo].costoBase *= factorInflacion;
            this.catalogoEquipos[codigo].ultimaActualizacion = new Date().toISOString();
            
            console.log(`📊 ${codigo}: $${costoAnterior.toFixed(2)} → $${this.catalogoEquipos[codigo].costoBase.toFixed(2)}`);
        });
        
        console.log(`✅ Costos de equipos actualizados con factor ${factorInflacion} (${year})`);
    },
    
    // ─────────────────────────────────────────────────────────────────
    // VALIDAR EQUIPOS
    // ─────────────────────────────────────────────────────────────────
    validarEquipos: function(concepto) {
        const alertas = [];
        const equipos = this.calcularEquipos(concepto);
        
        // Verificar si hay equipos sin operador cuando se requiere
        equipos.detalle.forEach(eq => {
            const catalogo = this.catalogoEquipos[eq.codigo];
            if (catalogo?.requiereOperador) {
                // Verificar si hay mano de obra de operador en el concepto
                const hayOperador = concepto.recursos?.mano_obra?.some(mo => 
                    mo.puesto?.toLowerCase().includes('operador')
                );
                
                if (!hayOperador) {
                    alertas.push({
                        tipo: 'advertencia',
                        codigo: 'EQUIPO_SIN_OPERADOR',
                        mensaje: `El equipo ${eq.nombre} requiere operador pero no se incluyó`
                    });
                }
            }
        });
        
        return {
            valido: alertas.filter(a => a.tipo === 'error').length === 0,
            alertas: alertas,
            equipos: equipos
        };
    },
    
    // ─────────────────────────────────────────────────────────────────
    // EXPORTAR REPORTE DE EQUIPOS
    // ─────────────────────────────────────────────────────────────────
    exportarReporte: function(concepto) {
        const equipos = this.calcularEquipos(concepto);
        
        return {
            concepto: concepto.codigo,
            descripcion: concepto.descripcion_corta,
            equipos: equipos.detalle.map(eq => ({
                codigo: eq.codigo,
                nombre: eq.nombre,
                unidad: eq.unidad,
                cantidad: eq.cantidad,
                precioUnitario: eq.precioUnitario,
                importe: eq.importe,
                categoria: eq.categoria
            })),
            totalEquipos: equipos.total,
            count: equipos.count,
            fecha: new Date().toISOString()
        };
    }
};

console.log('✅ equipos.engine.js listo');
