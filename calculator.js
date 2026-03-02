// SMARTCOT - MOTOR DE CÁLCULOS INDUSTRIALES
console.log('🧮 calculator.js cargado');

window.calculator = {
    calcularMateriales: function(materiales) { return materiales.reduce((sum, m) => sum + (m.cantidad * m.precioUnitario), 0); },
    calcularManoObra: function(manoObra) { return manoObra.reduce((sum, m) => sum + (m.horas * m.precioHora), 0); },
    calcularIndirectos: function(indirectos) { return indirectos.reduce((sum, i) => sum + i.monto, 0); },
    calcularUtilidad: function(base, porcentaje) { return base * (porcentaje / 100); },
    calcularIVA: function(base, porcentaje) { return base * (porcentaje / 100); },
    
    calcularCotizacion: function(datos) {
        const materialesTotal = this.calcularMateriales(datos.materiales || []);
        const manoObraTotal = this.calcularManoObra(datos.manoObra || []);
        const indirectosTotal = this.calcularIndirectos(datos.indirectos || []);
        const subtotal = materialesTotal + manoObraTotal;
        const base = subtotal + indirectosTotal;
        const utilidad = this.calcularUtilidad(base, datos.utilidadPorcentaje || 15);
        const iva = this.calcularIVA(base + utilidad, datos.ivaPorcentaje || 16);
        const totalFinal = base + utilidad + iva;
        const margenReal = utilidad > 0 ? (utilidad / totalFinal) * 100 : 0;
        return { materialesTotal, manoObraTotal, indirectosTotal, subtotal, base, utilidad, iva, totalFinal, margenReal };
    },
    
    formatoMoneda: function(cantidad) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cantidad); }
};

console.log('✅ calculator.js listo');
