// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - SERVICIO DE CONCEPTOS
// Carga conceptos con todos sus recursos (materiales, MO, equipos, herramienta)
// ─────────────────────────────────────────────────────────────────────

console.log('📦 conceptos.service.js cargado');

window.conceptosService = {
    
    // ─────────────────────────────────────────────────────────────────
    // OBTENER CONCEPTO COMPLETO CON RECURSOS
    // ─────────────────────────────────────────────────────────────────
    obtenerCompleto: async function(conceptoId) {
        try {
            // 1. Obtener concepto básico
            const concepto = await db.conceptos.get(conceptoId);
            
            if (!concepto) {
                console.error('❌ Concepto no encontrado:', conceptoId);
                return null;
            }
            
            // 2. Si ya tiene recursos embebidos, retornar directamente
            if (concepto.recursos) {
                return concepto;
            }
            
            // 3. Construir recursos desde las tablas separadas
            // NOTA: Esto requiere que hayamos guardado las relaciones
            // Por ahora, usamos una aproximación basada en el código del concepto
            
            concepto.recursos = await this.construirRecursos(concepto);
            concepto.costos_base = this.calcularCostosBase(concepto.recursos);
            
            return concepto;
            
        } catch (error) {
            console.error('❌ Error obteniendo concepto completo:', error);
            return null;
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CONSTRUIR RECURSOS DESDE TABLAS SEPARADAS
    // ─────────────────────────────────────────────────────────────────
    construirRecursos: async function(concepto) {
        // NOTA: Esta es una solución temporal
        // Lo ideal es haber guardado las relaciones concepto-material, etc.
        
        // Por ahora, retornamos estructura vacía
        // Los motores ya funcionan con costos_base calculados durante importación
        
        return {
            materiales: [],
            mano_obra: [],
            equipos: [],
            herramienta: []
        };
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CALCULAR COSTOS BASE DESDE RECURSOS
    // ─────────────────────────────────────────────────────────────────
    calcularCostosBase: function(recursos) {
        const costo_material = recursos.materiales?.reduce((sum, m) => sum + (m.importe || 0), 0) || 0;
        const costo_mano_obra = recursos.mano_obra?.reduce((sum, mo) => sum + (mo.importe || 0), 0) || 0;
        const costo_equipo = recursos.equipos?.reduce((sum, e) => sum + (e.importe || 0), 0) || 0;
        
        return {
            costo_material,
            costo_mano_obra,
            costo_equipo,
            costo_directo_total: costo_material + costo_mano_obra + costo_equipo
        };
    },
    
    // ─────────────────────────────────────────────────────────────────
    // ACTUALIZAR CONCEPTO CON COSTOS Y RECURSOS
    // ─────────────────────────────────────────────────────────────────
    actualizarConCostos: async function(conceptoId, recursos, costos_base) {
        try {
            await db.conceptos.update(conceptoId, {
                recursos: recursos,
                costos_base: costos_base,
                ultima_actualizacion: new Date().toISOString()
            });
            console.log('✅ Concepto actualizado con costos:', conceptoId);
        } catch (error) {
            console.error('❌ Error actualizando concepto:', error);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // LISTAR CONCEPTOS CON PAGINACIÓN
    // ─────────────────────────────────────────────────────────────────
    listar: async function(offset = 0, limite = 50) {
        try {
            return await db.conceptos.offset(offset).limit(limite).toArray();
        } catch (error) {
            console.error('❌ Error listando conceptos:', error);
            return [];
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // BUSCAR CONCEPTOS POR CÓDIGO O DESCRIPCIÓN
    // ─────────────────────────────────────────────────────────────────
    buscar: async function(termino) {
        try {
            if (!termino || termino.length < 2) {
                return [];
            }
            
            const terminoLower = termino.toLowerCase();
            
            const conceptos = await db.conceptos
                .filter(c => 
                    c.codigo.toLowerCase().includes(terminoLower) ||
                    (c.descripcion_corta && c.descripcion_corta.toLowerCase().includes(terminoLower)) ||
                    (c.descripcion_tecnica && c.descripcion_tecnica.toLowerCase().includes(terminoLower))
                )
                .limit(50)
                .toArray();
            
            return conceptos;
            
        } catch (error) {
            console.error('❌ Error buscando conceptos:', error);
            return [];
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // OBTENER CONCEPTO POR CÓDIGO
    // ─────────────────────────────────────────────────────────────────
    porCodigo: async function(codigo) {
        try {
            return await db.conceptos.where('codigo').equals(codigo).first();
        } catch (error) {
            console.error('❌ Error obteniendo concepto por código:', error);
            return null;
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CONTAR CONCEPTOS
    // ─────────────────────────────────────────────────────────────────
    contar: async function() {
        try {
            return await db.conceptos.count();
        } catch (error) {
            console.error('❌ Error contando conceptos:', error);
            return 0;
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // EXPORTAR CONCEPTO A PDF (USANDO APU GENERATOR)
    // ─────────────────────────────────────────────────────────────────
    exportarPDF: async function(conceptoId) {
        try {
            const concepto = await this.obtenerCompleto(conceptoId);
            
            if (!concepto) {
                throw new Error('Concepto no encontrado');
            }
            
            const apu = await apuGenerator.generarAPU(conceptoId);
            return await apuGenerator.exportarPDF(apu);
            
        } catch (error) {
            console.error('❌ Error exportando PDF:', error);
            throw error;
        }
    }
};

console.log('✅ conceptosService.js listo');
