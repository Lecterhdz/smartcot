// ─────────────────────────────────────────────────────────────────────
// SMARTCOT - MOTOR DE EQUIPOS (Basado en tu Excel real)
// ─────────────────────────────────────────────────────────────────────

window.equiposEngine = {
    
    // Catálogo de equipos según tu Excel
    catalogoEquipos: {
        'CFGRUA': { nombre: 'Grúa de Patio Pettibone 20 Ton', unidad: 'HRS', costoBase: 571.39 },
        'CFECORTE': { nombre: 'Equipo de Corte Oxi-Acetileno', unidad: 'HRS', costoBase: 4.03 },
        'CFPLAN': { nombre: 'Planta de Soldar Miller', unidad: 'HRS', costoBase: 10.00 },
        'CFTORRE': { nombre: 'Andamios Metálico (Módulo 1.80m)', unidad: 'HRS', costoBase: 2.41 },
        'CFCAMION': { nombre: 'Camión de Volteo 7 M3', unidad: 'HRS', costoBase: 199.67 },
        'CFASPIRAR': { nombre: 'Aspiradora Eléctrica', unidad: 'HRS', costoBase: 11.88 },
        'CFVIB': { nombre: 'Vibradora para Concreto', unidad: 'HRS', costoBase: 15.00 },
        'CFDOBLA': { nombre: 'Máquina Dobladora de Varilla', unidad: 'HRS', costoBase: 25.00 },
        'LLGRUA': { nombre: 'Llantas Grúa Pettibone', unidad: 'JGO', costoBase: 335608.00 },
        'LLTORRE': { nombre: 'Llantas Andamios Metálico', unidad: 'JGO', costoBase: 2862.00 },
        'LLCAMION': { nombre: 'Llantas Camión', unidad: 'JGO', costoBase: 5000.00 },
        'LLREV': { nombre: 'Llantas para Revolvedor', unidad: 'JGO', costoBase: 1636.00 }
    },
    
    // Calcular costo de equipos para un concepto
    calcularEquipos: function(concepto) {
        const equiposCalculo = [];
        let totalEquipos = 0;
        
        concepto.recursos.equipos?.forEach(equipo => {
            const catalogo = this.catalogoEquipos[equipo.equipo_codigo];
            
            equiposCalculo.push({
                codigo: equipo.equipo_codigo,
                nombre: equipo.nombre || catalogo?.nombre || 'Equipo sin nombre',
                unidad: equipo.horas > 0 ? 'HRS' : 'JGO',
                cantidad: equipo.horas || 1,
                precioUnitario: equipo.costo_unitario || catalogo?.costoBase || 0,
                importe: equipo.importe || 0
            });
            
            totalEquipos += equipo.importe || 0;
        });
        
        return {
            detalle: equiposCalculo,
            total: totalEquipos
        };
    },
    
    // Actualizar costos de equipos (inflación)
    actualizarCostos: function(factorInflacion) {
        Object.keys(this.catalogoEquipos).forEach(codigo => {
            this.catalogoEquipos[codigo].costoBase *= factorInflacion;
        });
        console.log('✅ Costos de equipos actualizados con factor:', factorInflacion);
    }
};

console.log('✅ equipos.engine.js listo');
