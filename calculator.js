// ─────────────────────────────────────────────────────────────────────
// SMARTCOT - CALCULADORA CON FACTORES DE RENDIMIENTO
// ─────────────────────────────────────────────────────────────────────

console.log('🧮 calculator.js cargado - Con factores');

window.calculator = {
    // Calcular costo de material CON factores de rendimiento
    calcularMaterial: function(material, factoresAplicados = []) {
        const precioBase = material.precioBase || 0;
        const cantidad = material.cantidad || 1;
        
        // Calcular factor compuesto
        const factorTotal = factoresAplicados.reduce((acc, f) => acc * f.valor, 1);
        
        // Cantidad ajustada por factores
        const cantidadAjustada = cantidad * factorTotal;
        
        // Costo total
        const importe = cantidadAjustada * precioBase;
        
        return {
            precioBase: precioBase,
            cantidadOriginal: cantidad,
            factores: factoresAplicados,
            factorTotal: factorTotal,
            cantidadAjustada: cantidadAjustada,
            importe: importe,
            desperdicio: importe - (cantidad * precioBase)
        };
    },

    // Calcular mano de obra CON factores
    calcularManoObra: function(mo, factoresAplicados = []) {
        const precioHora = mo.precioHora || 0;
        const horas = mo.horas || 1;
        
        const factorTotal = factoresAplicados.reduce((acc, f) => acc * f.valor, 1);
        const horasAjustadas = horas * factorTotal;
        
        return {
            precioHora: precioHora,
            horasOriginal: horas,
            factores: factoresAplicados,
            factorTotal: factorTotal,
            horasAjustadas: horasAjustadas,
            importe: horasAjustadas * precioHora
        };
    },

    // Calcular APU completo (Análisis de Precio Unitario)
    calcularAPU: function(concepto) {
        // Costo Directo
        const materialesTotal = (concepto.materiales || []).reduce((sum, m) => {
            const calculo = this.calcularMaterial(m, m.factores || []);
            return sum + calculo.importe;
        }, 0);
        
        const manoObraTotal = (concepto.manoObra || []).reduce((sum, mo) => {
            const calculo = this.calcularManoObra(mo, mo.factores || []);
            return sum + calculo.importe;
        }, 0);
        
        const maquinariaTotal = (concepto.maquinaria || []).reduce((sum, maq) => {
            return sum + (maq.cantidad * maq.precioHora);
        }, 0);
        
        const costoDirecto = materialesTotal + manoObraTotal + maquinariaTotal;
        
        // Indirectos
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
                maquinaria: maquinariaTotal,
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

    // Formato de moneda
    formatoMoneda: function(cantidad) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(cantidad);
    },

    // Formato de porcentaje
    formatoPorcentaje: function(valor) {
        return valor.toFixed(2) + '%';
    }
};

console.log('✅ calculator.js listo - Con factores de rendimiento');
