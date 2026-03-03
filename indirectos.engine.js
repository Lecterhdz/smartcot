// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - MOTOR DE INDIRECTOS (VERSIÓN COMPLETA)
// Basado en estructura REAL de tu Excel (Relacion de Rendimientos de Insumos)
// ─────────────────────────────────────────────────────────────────────

console.log('💰 indirectos.engine.js v2.0 cargado');

window.indirectosEngine = {
    
    // ─────────────────────────────────────────────────────────────────
    // VERSIÓN DEL MOTOR
    // ─────────────────────────────────────────────────────────────────
    version: '2.0.0',
    ultimaActualizacion: '2026-03-03',
    
    // ─────────────────────────────────────────────────────────────────
    // TIPOS DE INDIRECTOS SEGÚN TU EXCEL
    // Basado en los códigos reales: %MO1, %MO2, %MO3, %MO5
    // ─────────────────────────────────────────────────────────────────
    tiposIndirectos: {
        '%MO1': { 
            codigo: '%MO1', 
            nombre: 'Herramienta Menor', 
            tipo: 'herramienta',
            descripcion: 'Herramienta manual y menor requerida para la ejecución del concepto',
            rangoNormal: { min: 0.5, max: 25 },
            obligatorio: false
        },
        '%MO2': { 
            codigo: '%MO2', 
            nombre: 'Andamios', 
            tipo: 'andamios',
            descripcion: 'Andamios metálicos o plataformas para trabajo en altura',
            rangoNormal: { min: 0, max: 45 },
            obligatorio: false
        },
        '%MO3': { 
            codigo: '%MO3', 
            nombre: 'Materiales Menores', 
            tipo: 'materiales_menores',
            descripcion: 'Materiales complementarios y accesorios menores (clavos, tornillos, etc.)',
            rangoNormal: { min: 0, max: 15 },
            obligatorio: false
        },
        '%MO5': { 
            codigo: '%MO5', 
            nombre: 'Equipo de Seguridad', 
            tipo: 'seguridad',
            descripcion: 'Equipo de protección personal y seguridad industrial',
            rangoNormal: { min: 0.5, max: 15 },
            obligatorio: true
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // EQUIPOS ESPECIALES (CF***, LL***) - También son indirectos
    // ─────────────────────────────────────────────────────────────────
    equiposEspeciales: {
        'CFGRUA': { nombre: 'Grúa de Patio Pettibone 20 Ton', tipo: 'izaje', unidad: 'HRS' },
        'CFECORTE': { nombre: 'Equipo de Corte Oxi-Acetileno', tipo: 'corte', unidad: 'HRS' },
        'CFPLAN': { nombre: 'Planta de Soldar Miller', tipo: 'soldadura', unidad: 'HRS' },
        'CFTORRE': { nombre: 'Andamios Metálico (Módulo 1.80m)', tipo: 'acceso', unidad: 'HRS' },
        'CFCAMION': { nombre: 'Camión de Volteo 7 M3', tipo: 'transporte', unidad: 'HRS' },
        'CFASPIRAR': { nombre: 'Aspiradora Eléctrica', tipo: 'limpieza', unidad: 'HRS' },
        'CFVIB': { nombre: 'Vibradora para Concreto', tipo: 'compactacion', unidad: 'HRS' },
        'CFDOBLA': { nombre: 'Máquina Dobladora de Lámina', tipo: 'doblado', unidad: 'HRS' },
        'LLGRUA': { nombre: 'Llantas Grúa Pettibone', tipo: 'refacciones', unidad: 'JGO' },
        'LLTORRE': { nombre: 'Llantas Andamios Metálico', tipo: 'refacciones', unidad: 'JGO' },
        'LLCAMION': { nombre: 'Llantas Camión', tipo: 'refacciones', unidad: 'JGO' },
        'LLREV': { nombre: 'Llantas para Revolvedor', tipo: 'refacciones', unidad: 'JGO' }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CALCULAR INDIRECTOS DE UN CONCEPTO (COMPLETO)
    // ─────────────────────────────────────────────────────────────────
    calcularIndirectos: function(concepto) {
        const resultado = {
            exito: false,
            error: null,
            detalle: {},
            equipos: {},
            total: 0,
            costoDirecto: 0,
            costoConIndirectos: 0,
            porcentajeTotal: 0,
            desglose: {},
            validacion: null,
            fecha: new Date().toISOString()
        };
        
        // ─────────────────────────────────────────────────────────────
        // VALIDACIONES
        // ─────────────────────────────────────────────────────────────
        if (!concepto) {
            resultado.error = 'Concepto es undefined o null';
            console.error('❌ Error:', resultado.error);
            return resultado;
        }
        
        if (!concepto.codigo) {
            resultado.error = 'Concepto no tiene código';
            console.error('❌ Error:', resultado.error);
            return resultado;
        }
        
        // ─────────────────────────────────────────────────────────────
        // CALCULAR COSTO DIRECTO
        // ─────────────────────────────────────────────────────────────
        const costoDirecto = this.calcularCostoDirecto(concepto);
        resultado.costoDirecto = costoDirecto;
        
        if (costoDirecto === 0) {
            console.warn('⚠️ Costo directo es 0 para concepto:', concepto.codigo);
        }
        
        // ─────────────────────────────────────────────────────────────
        // CALCULAR INDIRECTOS PORCENTUALES (%MO1, %MO2, %MO3, %MO5)
        // ─────────────────────────────────────────────────────────────
        let totalIndirectosPorcentuales = 0;
        
        // Opción 1: Desde recursos.herramienta (estructura nueva)
        if (concepto.recursos?.herramienta && Array.isArray(concepto.recursos.herramienta)) {
            concepto.recursos.herramienta.forEach(herr => {
                const codigo = herr.herramienta_codigo || herr.codigo;
                const tipoInfo = this.tiposIndirectos[codigo];
                
                if (tipoInfo) {
                    const porcentaje = herr.porcentaje || 0;
                    const monto = costoDirecto * (porcentaje / 100);
                    
                    resultado.detalle[codigo] = {
                        codigo: codigo,
                        nombre: tipoInfo.nombre,
                        tipo: tipoInfo.tipo,
                        porcentaje: porcentaje,
                        monto: monto,
                        descripcion: tipoInfo.descripcion,
                        baseCalculo: costoDirecto
                    };
                    
                    totalIndirectosPorcentuales += monto;
                }
            });
        }
        
        // Opción 2: Desde costos_base (estructura importada)
        if (concepto.costos_base?.indirectos && Array.isArray(concepto.costos_base.indirectos)) {
            concepto.costos_base.indirectos.forEach(ind => {
                const codigo = ind.codigo || ind.tipo;
                const tipoInfo = this.tiposIndirectos[codigo];
                
                if (tipoInfo && !resultado.detalle[codigo]) {
                    const porcentaje = ind.porcentaje || 0;
                    const monto = ind.monto || (costoDirecto * (porcentaje / 100));
                    
                    resultado.detalle[codigo] = {
                        codigo: codigo,
                        nombre: tipoInfo.nombre,
                        tipo: tipoInfo.tipo,
                        porcentaje: porcentaje,
                        monto: monto,
                        descripcion: tipoInfo.descripcion,
                        baseCalculo: costoDirecto
                    };
                    
                    totalIndirectosPorcentuales += monto;
                }
            });
        }
        
        resultado.total = totalIndirectosPorcentuales;
        
        // ─────────────────────────────────────────────────────────────
        // CALCULAR EQUIPOS ESPECIALES (CF***, LL***)
        // ─────────────────────────────────────────────────────────────
        let totalEquipos = 0;
        
        if (concepto.recursos?.equipos && Array.isArray(concepto.recursos.equipos)) {
            concepto.recursos.equipos.forEach(equipo => {
                const codigo = equipo.equipo_codigo || equipo.codigo;
                const equipoInfo = this.equiposEspeciales[codigo];
                
                if (equipoInfo) {
                    const monto = equipo.importe || (equipo.cantidad || equipo.horas || 1) * (equipo.costo_unitario || equipo.precioUnitario || 0);
                    
                    resultado.equipos[codigo] = {
                        codigo: codigo,
                        nombre: equipoInfo.nombre,
                        tipo: equipoInfo.tipo,
                        unidad: equipoInfo.unidad,
                        cantidad: equipo.cantidad || equipo.horas || 1,
                        costoUnitario: equipo.costo_unitario || equipo.precioUnitario || 0,
                        monto: monto,
                        esIndirecto: true
                    };
                    
                    totalEquipos += monto;
                }
            });
        }
        
        // ─────────────────────────────────────────────────────────────
        // TOTALES GENERALES
        // ─────────────────────────────────────────────────────────────
        resultado.costoConIndirectos = costoDirecto + totalIndirectosPorcentuales + totalEquipos;
        resultado.porcentajeTotal = costoDirecto > 0 ? (totalIndirectosPorcentuales / costoDirecto) * 100 : 0;
        
        resultado.desglose = {
            costoDirecto: costoDirecto,
            indirectosPorcentuales: totalIndirectosPorcentuales,
            equiposEspeciales: totalEquipos,
            costoTotal: resultado.costoConIndirectos
        };
        
        // ─────────────────────────────────────────────────────────────
        // VALIDACIÓN AUTOMÁTICA
        // ─────────────────────────────────────────────────────────────
        resultado.validacion = this.validarIndirectos(concepto, resultado);
        
        resultado.exito = true;
        
        console.log('✅ Indirectos calculados:', {
            concepto: concepto.codigo,
            costoDirecto: costoDirecto,
            indirectos: totalIndirectosPorcentuales,
            equipos: totalEquipos,
            total: resultado.costoConIndirectos,
            porcentaje: resultado.porcentajeTotal.toFixed(2) + '%'
        });
        
        return resultado;
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CALCULAR COSTO DIRECTO (MEJORADO)
    // Soporta múltiples estructuras de datos
    // ─────────────────────────────────────────────────────────────────
    calcularCostoDirecto: function(concepto) {
        if (!concepto) {
            console.warn('⚠️ concepto es undefined en calcularCostoDirecto');
            return 0;
        }
        
        let materiales = 0;
        let manoObra = 0;
        let equipos = 0;
        
        // ─────────────────────────────────────────────────────────────
        // OPCIÓN 1: Desde recursos (estructura nueva)
        // ─────────────────────────────────────────────────────────────
        if (concepto.recursos) {
            if (Array.isArray(concepto.recursos.materiales)) {
                materiales = concepto.recursos.materiales.reduce((sum, m) => sum + (m.importe || 0), 0);
            }
            
            if (Array.isArray(concepto.recursos.mano_obra)) {
                manoObra = concepto.recursos.mano_obra.reduce((sum, mo) => sum + (mo.importe || 0), 0);
            }
            
            if (Array.isArray(concepto.recursos.equipos)) {
                // Solo equipos NO especiales (los especiales van en indirectos)
                equipos = concepto.recursos.equipos
                    .filter(e => {
                        const codigo = e.equipo_codigo || e.codigo;
                        return !this.equiposEspeciales[codigo];
                    })
                    .reduce((sum, e) => sum + (e.importe || 0), 0);
            }
        }
        
        // ─────────────────────────────────────────────────────────────
        // OPCIÓN 2: Desde costos_base (estructura importada)
        // ─────────────────────────────────────────────────────────────
        if (concepto.costos_base) {
            if (concepto.costos_base.costo_material > 0) {
                materiales = concepto.costos_base.costo_material;
            }
            if (concepto.costos_base.costo_mano_obra > 0) {
                manoObra = concepto.costos_base.costo_mano_obra;
            }
            if (concepto.costos_base.costo_equipo > 0) {
                equipos = concepto.costos_base.costo_equipo;
            }
        }
        
        // ─────────────────────────────────────────────────────────────
        // OPCIÓN 3: Desde importe directo (estructura mínima)
        // ─────────────────────────────────────────────────────────────
        if (materiales === 0 && manoObra === 0 && equipos === 0 && concepto.importe) {
            return concepto.importe;
        }
        
        const total = materiales + manoObra + equipos;
        
        return total;
    },
    
    // ─────────────────────────────────────────────────────────────────
    // VALIDAR INDIRECTOS (COMPLETO)
    // Basado en rangos reales de tu Excel
    // ─────────────────────────────────────────────────────────────────
    validarIndirectos: function(concepto, resultadoCalculo) {
        const validacion = {
            valido: true,
            errores: [],
            advertencias: [],
            sugerencias: [],
            puntaje: 100
        };
        
        const resultado = resultadoCalculo || this.calcularIndirectos(concepto);
        
        // ─────────────────────────────────────────────────────────────
        // ERROR: Sin costo directo
        // ─────────────────────────────────────────────────────────────
        if (resultado.costoDirecto === 0) {
            validacion.errores.push({
                codigo: 'SIN_COSTO_DIRECTO',
                mensaje: 'El concepto no tiene costo directo calculado',
                severidad: 'error',
                impacto: 50
            });
            validacion.valido = false;
        }
        
        // ─────────────────────────────────────────────────────────────
        // ERROR: Indirectos > 50% (muy alto)
        // ─────────────────────────────────────────────────────────────
        if (resultado.porcentajeTotal > 50) {
            validacion.errores.push({
                codigo: 'INDIRECTOS_MUY_ALTOS',
                mensaje: `Indirectos muy altos (${resultado.porcentajeTotal.toFixed(2)}%). Lo normal es 10-25%`,
                severidad: 'error',
                impacto: 30
            });
            validacion.valido = false;
        }
        
        // ─────────────────────────────────────────────────────────────
        // ADVERTENCIA: Indirectos < 5% (muy bajo)
        // ─────────────────────────────────────────────────────────────
        if (resultado.porcentajeTotal > 0 && resultado.porcentajeTotal < 5) {
            validacion.advertencias.push({
                codigo: 'INDIRECTOS_MUY_BAJOS',
                mensaje: `Indirectos muy bajos (${resultado.porcentajeTotal.toFixed(2)}%). Verificar si faltan conceptos`,
                severidad: 'advertencia',
                impacto: 15
            });
        }
        
        // ─────────────────────────────────────────────────────────────
        // ADVERTENCIA: Sin %MO1 (Herramienta Menor)
        // ─────────────────────────────────────────────────────────────
        if (!resultado.detalle['%MO1']) {
            validacion.advertencias.push({
                codigo: 'SIN_HERRAMIENTA_MENOR',
                mensaje: 'No incluye Herramienta Menor (%MO1). Lo normal es 1-20%',
                severidad: 'advertencia',
                impacto: 10
            });
        }
        
        // ─────────────────────────────────────────────────────────────
        // ADVERTENCIA: Sin %MO5 (Equipo de Seguridad) - OBLIGATORIO
        // ─────────────────────────────────────────────────────────────
        if (!resultado.detalle['%MO5']) {
            validacion.advertencias.push({
                codigo: 'SIN_EQUIPO_SEGURIDAD',
                mensaje: 'No incluye Equipo de Seguridad (%MO5). RECOMENDADO para todos los conceptos',
                severidad: 'advertencia',
                impacto: 15
            });
        }
        
        // ─────────────────────────────────────────────────────────────
        // VALIDAR RANGOS POR TIPO
        // ─────────────────────────────────────────────────────────────
        Object.entries(resultado.detalle).forEach(([codigo, indirecto]) => {
            const tipoInfo = this.tiposIndirectos[codigo];
            
            if (tipoInfo && tipoInfo.rangoNormal) {
                const { min, max } = tipoInfo.rangoNormal;
                
                if (indirecto.porcentaje < min) {
                    validacion.advertencias.push({
                        codigo: `PORCENTAJE_BAJO_${codigo}`,
                        mensaje: `${tipoInfo.nombre} (${indirecto.porcentaje.toFixed(2)}%) está por debajo del rango normal (${min}-${max}%)`,
                        severidad: 'advertencia',
                        impacto: 5
                    });
                }
                
                if (indirecto.porcentaje > max) {
                    validacion.errores.push({
                        codigo: `PORCENTAJE_ALTO_${codigo}`,
                        mensaje: `${tipoInfo.nombre} (${indirecto.porcentaje.toFixed(2)}%) está por encima del rango normal (${min}-${max}%)`,
                        severidad: 'error',
                        impacto: 20
                    });
                    validacion.valido = false;
                }
            }
        });
        
        // ─────────────────────────────────────────────────────────────
        // CALCULAR PUNTAJE
        // ─────────────────────────────────────────────────────────────
        const impactoErrores = validacion.errores.reduce((sum, e) => sum + (e.impacto || 0), 0);
        const impactoAdvertencias = validacion.advertencias.reduce((sum, a) => sum + (a.impacto || 0), 0);
        
        validacion.puntaje = Math.max(0, 100 - impactoErrores - impactoAdvertencias);
        
        // ─────────────────────────────────────────────────────────────
        // SUGERENCIAS
        // ─────────────────────────────────────────────────────────────
        if (validacion.puntaje < 50) {
            validacion.sugerencias.push('Revisar estructura de costos del concepto');
        }
        
        if (!resultado.detalle['%MO1'] && !resultado.detalle['%MO5']) {
            validacion.sugerencias.push('Agregar al menos Herramienta Menor (%MO1) y Equipo de Seguridad (%MO5)');
        }
        
        if (resultado.porcentajeTotal > 30) {
            validacion.sugerencias.push('Considerar si algunos equipos deberían ir como costo directo en lugar de indirecto');
        }
        
        return validacion;
    },
    
    // ─────────────────────────────────────────────────────────────────
    // OBTENER INDIRECTOS POR TIPO
    // ─────────────────────────────────────────────────────────────────
    obtenerPorTipo: function(tipo) {
        return Object.values(this.tiposIndirectos).filter(ind => ind.tipo === tipo);
    },
    
    // ─────────────────────────────────────────────────────────────────
    // OBTENER EQUIPOS ESPECIALES POR TIPO
    // ─────────────────────────────────────────────────────────────────
    obtenerEquiposPorTipo: function(tipo) {
        return Object.entries(this.equiposEspeciales)
            .filter(([_, eq]) => eq.tipo === tipo)
            .map(([codigo, eq]) => ({ codigo, ...eq }));
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CALCULAR INDIRECTOS PARA MÚLTIPLES CONCEPTOS
    // ─────────────────────────────────────────────────────────────────
    calcularIndirectosLote: function(conceptos) {
        if (!Array.isArray(conceptos)) {
            console.error('❌ Error: conceptos debe ser un array');
            return [];
        }
        
        return conceptos.map(concepto => ({
            codigo: concepto.codigo,
            descripcion: concepto.descripcion_corta,
            ...this.calcularIndirectos(concepto)
        }));
    },
    
    // ─────────────────────────────────────────────────────────────────
    // EXPORTAR REPORTE DE INDIRECTOS (COMPLETO)
    // ─────────────────────────────────────────────────────────────────
    exportarReporte: function(concepto, formato = 'json') {
        const resultado = this.calcularIndirectos(concepto);
        
        const reporte = {
            metadata: {
                version: this.version,
                fechaExportacion: new Date().toISOString(),
                empresa: 'SU EMPRESA, S.A. DE C.V.'
            },
            concepto: {
                codigo: concepto.codigo,
                descripcion: concepto.descripcion_corta,
                descripcionCompleta: concepto.descripcion_tecnica,
                unidad: concepto.unidad,
                rendimiento: concepto.rendimiento_base
            },
            costos: {
                costoDirecto: resultado.costoDirecto,
                indirectosPorcentuales: resultado.total,
                equiposEspeciales: Object.values(resultado.equipos).reduce((sum, e) => sum + e.monto, 0),
                costoTotal: resultado.costoConIndirectos,
                porcentajeIndirectos: resultado.porcentajeTotal
            },
            desgloseIndirectos: Object.values(resultado.detalle).map(ind => ({
                codigo: ind.codigo,
                nombre: ind.nombre,
                tipo: ind.tipo,
                porcentaje: ind.porcentaje,
                monto: ind.monto,
                descripcion: ind.descripcion
            })),
            desgloseEquipos: Object.values(resultado.equipos).map(eq => ({
                codigo: eq.codigo,
                nombre: eq.nombre,
                tipo: eq.tipo,
                unidad: eq.unidad,
                cantidad: eq.cantidad,
                costoUnitario: eq.costoUnitario,
                monto: eq.monto
            })),
            validacion: resultado.validacion
        };
        
        if (formato === 'json') {
            return reporte;
        }
        
        if (formato === 'csv') {
            return this.exportarCSV(reporte);
        }
        
        return reporte;
    },
    
    // ─────────────────────────────────────────────────────────────────
    // EXPORTAR A CSV
    // ─────────────────────────────────────────────────────────────────
    exportarCSV: function(reporte) {
        const lineas = [
            ['Concepto', reporte.concepto.codigo],
            ['Descripción', reporte.concepto.descripcion],
            ['Unidad', reporte.concepto.unidad],
            ['Rendimiento', reporte.concepto.rendimiento],
            [],
            ['COSTOS'],
            ['Costo Directo', reporte.costos.costoDirecto.toFixed(2)],
            ['Indirectos', reporte.costos.indirectosPorcentuales.toFixed(2)],
            ['Equipos', reporte.costos.equiposEspeciales.toFixed(2)],
            ['Costo Total', reporte.costos.costoTotal.toFixed(2)],
            ['% Indirectos', reporte.costos.porcentajeIndirectos.toFixed(2) + '%'],
            [],
            ['DETALLE DE INDIRECTOS']
        ];
        
        reporte.desgloseIndirectos.forEach(ind => {
            lineas.push([ind.codigo, ind.nombre, ind.porcentaje + '%', ind.monto.toFixed(2)]);
        });
        
        lineas.push([]);
        lineas.push(['DETALLE DE EQUIPOS']);
        
        reporte.desgloseEquipos.forEach(eq => {
            lineas.push([eq.codigo, eq.nombre, eq.cantidad, eq.unidad, eq.costoUnitario.toFixed(2), eq.monto.toFixed(2)]);
        });
        
        return lineas.map(linea => linea.join(',')).join('\n');
    },
    
    // ─────────────────────────────────────────────────────────────────
    // IMPRIMIR REPORTE EN CONSOLA
    // ─────────────────────────────────────────────────────────────────
    imprimirReporte: function(concepto) {
        const resultado = this.calcularIndirectos(concepto);
        
        console.group('📊 REPORTE DE INDIRECTOS - ' + concepto.codigo);
        
        console.log('┌─────────────────────────────────────────────────────────────────┐');
        console.log('│ CONCEPTO: ' + concepto.codigo.padEnd(56) + '│');
        console.log('│ ' + (concepto.descripcion_corta || '').substring(0, 56).padEnd(56) + '│');
        console.log('├─────────────────────────────────────────────────────────────────┤');
        console.log('│ COSTOS                                                          │');
        console.log('│   Costo Directo:      ' + this.formatoMoneda(resultado.costoDirecto).padEnd(32) + '│');
        console.log('│   Indirectos:         ' + this.formatoMoneda(resultado.total).padEnd(32) + '│');
        console.log('│   Equipos Especiales: ' + this.formatoMoneda(Object.values(resultado.equipos).reduce((sum, e) => sum + e.monto, 0)).padEnd(32) + '│');
        console.log('│   ──────────────────────────────────────────────────────────────│');
        console.log('│   COSTO TOTAL:        ' + this.formatoMoneda(resultado.costoConIndirectos).padEnd(32) + '│');
        console.log('│   % Indirectos:       ' + resultado.porcentajeTotal.toFixed(2) + '%'.padEnd(32) + '│');
        console.log('├─────────────────────────────────────────────────────────────────┤');
        console.log('│ DETALLE DE INDIRECTOS                                           │');
        
        Object.values(resultado.detalle).forEach(ind => {
            console.log('│   ' + ind.codigo.padEnd(6) + ind.nombre.padEnd(30) + (ind.porcentaje.toFixed(2) + '%').padEnd(10) + this.formatoMoneda(ind.monto).padEnd(10) + '│');
        });
        
        console.log('├─────────────────────────────────────────────────────────────────┤');
        console.log('│ VALIDACIÓN: ' + (resultado.validacion.valido ? '✅ VÁLIDO' : '❌ REVISAR').padEnd(44) + '│');
        console.log('│ PUNTAJE: ' + resultado.validacion.puntaje.toFixed(0) + '/100'.padEnd(47) + '│');
        console.log('└─────────────────────────────────────────────────────────────────┘');
        
        console.groupEnd();
        
        return resultado;
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
    
    // ─────────────────────────────────────────────────────────────────
    // OBTENER ESTADÍSTICAS DE INDIRECTOS
    // ─────────────────────────────────────────────────────────────────
    obtenerEstadisticas: function(conceptos) {
        if (!Array.isArray(conceptos)) {
            return null;
        }
        
        const estadisticas = {
            totalConceptos: conceptos.length,
            conIndirectos: 0,
            sinIndirectos: 0,
            porcentajePromedio: 0,
            porcentajeMin: Infinity,
            porcentajeMax: 0,
            totalIndirectos: 0,
            porTipo: {}
        };
        
        conceptos.forEach(concepto => {
            const resultado = this.calcularIndirectos(concepto);
            
            if (resultado.total > 0) {
                estadisticas.conIndirectos++;
            } else {
                estadisticas.sinIndirectos++;
            }
            
            estadisticas.porcentajePromedio += resultado.porcentajeTotal;
            estadisticas.porcentajeMin = Math.min(estadisticas.porcentajeMin, resultado.porcentajeTotal);
            estadisticas.porcentajeMax = Math.max(estadisticas.porcentajeMax, resultado.porcentajeTotal);
            estadisticas.totalIndirectos += resultado.total;
            
            // Contar por tipo
            Object.entries(resultado.detalle).forEach(([codigo, indirecto]) => {
                if (!estadisticas.porTipo[codigo]) {
                    estadisticas.porTipo[codigo] = { count: 0, total: 0, porcentajePromedio: 0 };
                }
                estadisticas.porTipo[codigo].count++;
                estadisticas.porTipo[codigo].total += indirecto.monto;
            });
        });
        
        estadisticas.porcentajePromedio = estadisticas.totalConceptos > 0 
            ? estadisticas.porcentajePromedio / estadisticas.totalConceptos 
            : 0;
        
        // Calcular promedios por tipo
        Object.entries(estadisticas.porTipo).forEach(([codigo, datos]) => {
            datos.porcentajePromedio = datos.count > 0 ? datos.total / datos.count : 0;
        });
        
        return estadisticas;
    }
};

console.log('✅ indirectos.engine.js v2.0 listo - Completo y Mejorado');
