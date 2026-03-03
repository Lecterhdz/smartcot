// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - MOTOR DE INDIRECTOS (CORREGIDO)
// Basado en estructura REAL de tu Excel
// ─────────────────────────────────────────────────────────────────────

console.log('💰 indirectos.engine.js cargado');

window.indirectosEngine = {
    
    // ─────────────────────────────────────────────────────────────────
    // TIPOS DE INDIRECTOS SEGÚN TU EXCEL
    // ─────────────────────────────────────────────────────────────────
    tiposIndirectos: {
        '%MO1': { 
            codigo: '%MO1', 
            nombre: 'Herramienta Menor', 
            tipo: 'herramienta',
            descripcion: 'Herramienta manual y menor requerida para la ejecución del concepto'
        },
        '%MO2': { 
            codigo: '%MO2', 
            nombre: 'Andamios', 
            tipo: 'andamios',
            descripcion: 'Andamios metálicos o plataformas para trabajo en altura'
        },
        '%MO3': { 
            codigo: '%MO3', 
            nombre: 'Materiales Menores', 
            tipo: 'materiales_menores',
            descripcion: 'Materiales complementarios y accesorios menores'
        },
        '%MO5': { 
            codigo: '%MO5', 
            nombre: 'Equipo de Seguridad', 
            tipo: 'seguridad',
            descripcion: 'Equipo de protección personal y seguridad industrial'
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CALCULAR INDIRECTOS DE UN CONCEPTO
    // ─────────────────────────────────────────────────────────────────
    calcularIndirectos: function(concepto) {
        // VALIDACIÓN: Verificar que concepto existe
        if (!concepto) {
            console.error('❌ Error: concepto es undefined o null');
            return {
                detalle: {},
                total: 0,
                costoDirecto: 0,
                costoConIndirectos: 0,
                porcentajeTotal: 0,
                error: 'Concepto no válido'
            };
        }
        
        // VALIDACIÓN: Verificar que tiene recursos
        if (!concepto.recursos) {
            console.error('❌ Error: concepto no tiene recursos', concepto);
            return {
                detalle: {},
                total: 0,
                costoDirecto: 0,
                costoConIndirectos: 0,
                porcentajeTotal: 0,
                error: 'Concepto no tiene recursos'
            };
        }
        
        const costoDirecto = this.calcularCostoDirecto(concepto);
        const indirectos = {};
        let totalIndirectos = 0;
        
        // Buscar todos los %MO en los recursos del concepto
        if (concepto.recursos.herramienta && Array.isArray(concepto.recursos.herramienta)) {
            concepto.recursos.herramienta.forEach(herr => {
                const codigo = herr.herramienta_codigo || herr.codigo;
                const tipo = this.tiposIndirectos[codigo];
                
                if (tipo) {
                    const monto = costoDirecto * (herr.porcentaje / 100);
                    
                    indirectos[codigo] = {
                        codigo: codigo,
                        nombre: tipo.nombre,
                        tipo: tipo.tipo,
                        porcentaje: herr.porcentaje,
                        monto: monto,
                        descripcion: tipo.descripcion
                    };
                    
                    totalIndirectos += monto;
                }
            });
        }
        
        return {
            detalle: indirectos,
            total: totalIndirectos,
            costoDirecto: costoDirecto,
            costoConIndirectos: costoDirecto + totalIndirectos,
            porcentajeTotal: costoDirecto > 0 ? (totalIndirectos / costoDirecto) * 100 : 0
        };
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CALCULAR COSTO DIRECTO (CORREGIDO)
    // ─────────────────────────────────────────────────────────────────
    calcularCostoDirecto: function(concepto) {
        // VALIDACIÓN: Verificar que concepto existe
        if (!concepto) {
            console.warn('⚠️ concepto es undefined en calcularCostoDirecto');
            return 0;
        }
        
        // VALIDACIÓN: Verificar que tiene recursos
        if (!concepto.recursos) {
            console.warn('⚠️ concepto no tiene recursos en calcularCostoDirecto');
            return 0;
        }
        
        // Sumar materiales
        const materiales = Array.isArray(concepto.recursos.materiales) 
            ? concepto.recursos.materiales.reduce((sum, m) => sum + (m.importe || 0), 0) 
            : 0;
        
        // Sumar mano de obra
        const manoObra = Array.isArray(concepto.recursos.mano_obra) 
            ? concepto.recursos.mano_obra.reduce((sum, mo) => sum + (mo.importe || 0), 0) 
            : 0;
        
        // Sumar equipos
        const equipos = Array.isArray(concepto.recursos.equipos) 
            ? concepto.recursos.equipos.reduce((sum, e) => sum + (e.importe || 0), 0) 
            : 0;
        
        const total = materiales + manoObra + equipos;
        
        console.log('📊 Costo Directo:', { materiales, manoObra, equipos, total });
        return total;
    },
    
    // ─────────────────────────────────────────────────────────────────
    // OBTENER INDIRECTOS POR TIPO
    // ─────────────────────────────────────────────────────────────────
    obtenerPorTipo: function(tipo) {
        return Object.values(this.tiposIndirectos).filter(ind => ind.tipo === tipo);
    },
    
    // ─────────────────────────────────────────────────────────────────
    // VALIDAR INDIRECTOS
    // ─────────────────────────────────────────────────────────────────
    validarIndirectos: function(concepto) {
        const alertas = [];
        const indirectos = this.calcularIndirectos(concepto);
        
        // Verificar si hay error
        if (indirectos.error) {
            alertas.push({
                tipo: 'error',
                codigo: 'CONCEPTO_INVALIDO',
                mensaje: indirectos.error
            });
            return {
                valido: false,
                alertas: alertas,
                indirectos: indirectos
            };
        }
        
        // Verificar si faltan indirectos comunes
        if (!indirectos.detalle['%MO1']) {
            alertas.push({
                tipo: 'advertencia',
                codigo: 'SIN_HERRAMIENTA',
                mensaje: 'No incluye Herramienta Menor (%MO1)'
            });
        }
        
        if (!indirectos.detalle['%MO5']) {
            alertas.push({
                tipo: 'advertencia',
                codigo: 'SIN_SEGURIDAD',
                mensaje: 'No incluye Equipo de Seguridad (%MO5)'
            });
        }
        
        // Verificar porcentaje total
        if (indirectos.porcentajeTotal < 5) {
            alertas.push({
                tipo: 'advertencia',
                codigo: 'INDIRECTOS_BAJOS',
                mensaje: `Indirectos muy bajos (${indirectos.porcentajeTotal.toFixed(2)}%). Lo normal es 10-25%`
            });
        }
        
        if (indirectos.porcentajeTotal > 50) {
            alertas.push({
                tipo: 'error',
                codigo: 'INDIRECTOS_ALTOS',
                mensaje: `Indirectos muy altos (${indirectos.porcentajeTotal.toFixed(2)}%). Revisar conceptos`
            });
        }
        
        return {
            valido: alertas.filter(a => a.tipo === 'error').length === 0,
            alertas: alertas,
            indirectos: indirectos
        };
    },
    
    // ─────────────────────────────────────────────────────────────────
    // EXPORTAR REPORTE DE INDIRECTOS
    // ─────────────────────────────────────────────────────────────────
    exportarReporte: function(concepto) {
        const indirectos = this.calcularIndirectos(concepto);
        
        return {
            concepto: concepto.codigo,
            descripcion: concepto.descripcion_corta,
            costoDirecto: indirectos.costoDirecto,
            indirectos: Object.values(indirectos.detalle).map(ind => ({
                codigo: ind.codigo,
                nombre: ind.nombre,
                porcentaje: ind.porcentaje,
                monto: ind.monto
            })),
            totalIndirectos: indirectos.total,
            costoTotal: indirectos.costoConIndirectos,
            fecha: new Date().toISOString()
        };
    }
};

console.log('✅ indirectos.engine.js listo - Versión Corregida');
