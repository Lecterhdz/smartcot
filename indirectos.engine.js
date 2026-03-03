// ─────────────────────────────────────────────────────────────────────
// SMARTCOT - MOTOR DE INDIRECTOS (Basado en tu Excel real)
// ─────────────────────────────────────────────────────────────────────

window.indirectosEngine = {
    
    // Tipos de indirectos según tu Excel
    tiposIndirectos: {
        '%MO1': { nombre: 'Herramienta Menor', tipo: 'herramienta', calculo: 'porcentaje' },
        '%MO2': { nombre: 'Andamios', tipo: 'andamios', calculo: 'porcentaje' },
        '%MO3': { nombre: 'Materiales Menores', tipo: 'materiales_menores', calculo: 'porcentaje' },
        '%MO5': { nombre: 'Equipo de Seguridad', tipo: 'seguridad', calculo: 'porcentaje' }
    },
    
    // Calcular indirectos de un concepto
    calcularIndirectos: function(concepto) {
        const costoDirecto = this.calcularCostoDirecto(concepto);
        const indirectos = {};
        
        // Buscar todos los %MO en los recursos del concepto
        concepto.recursos.herramienta?.forEach(herr => {
            const tipo = this.tiposIndirectos[herr.codigo];
            if (tipo) {
                indirectos[tipo.nombre] = {
                    codigo: herr.codigo,
                    porcentaje: herr.porcentaje,
                    monto: costoDirecto * (herr.porcentaje / 100)
                };
            }
        });
        
        const totalIndirectos = Object.values(indirectos).reduce((sum, i) => sum + i.monto, 0);
        
        return {
            detalle: indirectos,
            total: totalIndirectos,
            costoDirecto: costoDirecto,
            costoConIndirectos: costoDirecto + totalIndirectos
        };
    },
    
    calcularCostoDirecto: function(concepto) {
        const materiales = concepto.recursos.materiales?.reduce((sum, m) => sum + m.importe, 0) || 0;
        const manoObra = concepto.recursos.mano_obra?.reduce((sum, mo) => sum + mo.importe, 0) || 0;
        const equipos = concepto.recursos.equipos?.reduce((sum, e) => sum + e.importe, 0) || 0;
        
        return materiales + manoObra + equipos;
    }
};

console.log('✅ indirectos.engine.js listo');
