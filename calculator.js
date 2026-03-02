// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - CALCULADORA DE PRECIOS UNITARIOS
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
    // CÁLCULO DE PRECIO UNITARIO (APU)
    // ─────────────────────────────────────────────────────────────────
    calcularAPU: function(concepto) {
        // Costo Directo
        const materialesTotal = (concepto.recursos?.materiales || []).reduce((sum, m) => sum + m.importe, 0);
        const manoObraTotal = (concepto.recursos?.mano_obra || []).reduce((sum, m) => sum + m.importe, 0);
        const equiposTotal = (concepto.recursos?.equipos || []).reduce((sum, e) => sum + e.importe, 0);
        const herramientaTotal = (concepto.recursos?.herramienta || []).reduce((sum, h) => sum + h.importe, 0);
        
        const costoDirecto = materialesTotal + manoObraTotal + equiposTotal + herramientaTotal;
        
        // Indirectos (porcentajes)
        const indirectosOp = concepto.indirectosOperacion || 8;
        const indirectosOf = concepto.indirectosOficina || 5;
        const financiamiento = concepto.financiamiento || 3;
        const utilidad = concepto.utilidad || 10;
        
        const montoIndirectos = costoDirecto * ((indirectosOp + indirectosOf) / 100);
        const montoFinanciamiento = costoDirecto * (financiamiento / 100);
        const montoUtilidad = costoDirecto * (utilidad / 100);
        
        const subtotal = costoDirecto + montoIndirectos + montoFinanciamiento + montoUtilidad;
        
        // Impuestos
        const iva = concepto.iva || 16;
        const montoIVA = subtotal * (iva / 100);
        
        const total = subtotal + montoIVA;
        
        return {
            costoDirecto: {
                materiales: materialesTotal,
                manoObra: manoObraTotal,
                equipos: equiposTotal,
                herramienta: herramientaTotal,
                total: costoDirecto
            },
            indirectos: {
                operacion: montoIndirectos,
                oficina: montoIndirectos,
                financiamiento: montoFinanciamiento,
                utilidad: montoUtilidad,
                total: montoIndirectos + montoFinanciamiento + montoUtilidad
            },
            impuestos: {
                iva: montoIVA
            },
            subtotal: subtotal,
            total: total,
            margenUtilidad: utilidad,
            rendimiento: {
                factorTotal: concepto.factorRendimiento || 1
            }
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
    },

    // Formato de porcentaje
    formatoPorcentaje: function(valor) {
        return valor.toFixed(2) + '%';
    },

    // Formato de número
    formatoNumero: function(valor, decimales = 2) {
        return new Intl.NumberFormat('es-MX').format(valor);
    }
};

console.log('✅ calculator.js listo');
