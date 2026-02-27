// ─────────────────────────────────────────────────────────────────────
// SMARTCOT - MOTOR DE CÁLCULOS INDUSTRIALES
// Separado completamente del UI
// ─────────────────────────────────────────────────────────────────────

console.log('🧮 calculator.js cargado');

window.calculator = {
    // Calcular subtotal de materiales
    calcularMateriales: function(materiales) {
        return materiales.reduce((sum, m) => sum + (m.cantidad * m.precioUnitario), 0);
    },

    // Calcular subtotal de mano de obra
    calcularManoObra: function(manoObra) {
        return manoObra.reduce((sum, m) => sum + (m.horas * m.precioHora), 0);
    },

    // Calcular total de indirectos
    calcularIndirectos: function(indirectos) {
        return indirectos.reduce((sum, i) => sum + i.monto, 0);
    },

    // Calcular utilidad
    calcularUtilidad: function(base, porcentaje) {
        return base * (porcentaje / 100);
    },

    // Calcular IVA
    calcularIVA: function(base, porcentaje) {
        return base * (porcentaje / 100);
    },

    // ─────────────────────────────────────────────────────────────────
    // CÁLCULO COMPLETO DE COTIZACIÓN
    // ─────────────────────────────────────────────────────────────────
    calcularCotizacion: function(datos) {
        const materialesTotal = this.calcularMateriales(datos.materiales || []);
        const manoObraTotal = this.calcularManoObra(datos.manoObra || []);
        const indirectosTotal = this.calcularIndirectos(datos.indirectos || []);
        
        const subtotal = materialesTotal + manoObraTotal;
        const base = subtotal + indirectosTotal;
        
        const utilidad = this.calcularUtilidad(base, datos.utilidadPorcentaje || 15);
        const iva = this.calcularIVA(base + utilidad, datos.ivaPorcentaje || 16);
        
        const totalFinal = base + utilidad + iva;
        
        // Calcular margen real
        const margenReal = utilidad > 0 ? (utilidad / totalFinal) * 100 : 0;
        
        return {
            materialesTotal: materialesTotal,
            manoObraTotal: manoObraTotal,
            indirectosTotal: indirectosTotal,
            subtotal: subtotal,
            base: base,
            utilidad: utilidad,
            iva: iva,
            totalFinal: totalFinal,
            margenReal: margenReal
        };
    },

    // ─────────────────────────────────────────────────────────────────
    // FORMATO DE MONEDA
    // ─────────────────────────────────────────────────────────────────
    formatoMoneda: function(cantidad) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(cantidad);
    }
};

console.log('✅ calculator.js listo');