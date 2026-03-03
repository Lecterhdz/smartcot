// ─────────────────────────────────────────────────────────────────────
// SMARTCOT - ACTUALIZACIÓN DE PRECIOS (Inflación 2026)
// ─────────────────────────────────────────────────────────────────────

window.preciosActuales = {
    
    // Factores de actualización por categoría (2024 → 2026)
    factoresActualizacion: {
        'materiales': 1.18,      // +18% inflación materiales
        'mano_obra': 1.15,       // +15% salarios
        'equipos': 1.12,         // +12% equipos
        'herramienta': 1.10,     // +10% herramienta
        'indirectos': 1.08       // +8% indirectos
    },
    
    // Actualizar precios de materiales
    actualizarMateriales: async function() {
        const materiales = await db.materiales.toArray();
        const actualizados = materiales.map(m => ({
            ...m,
            precio_base: m.precio_base * this.factoresActualizacion.materiales,
            ultima_actualizacion: new Date().toISOString()
        }));
        
        await db.materiales.bulkPut(actualizados);
        console.log('✅ Materiales actualizados:', actualizados.length);
        return actualizados.length;
    },
    
    // Actualizar salarios de mano de obra
    actualizarManoObra: async function() {
        const manoObra = await db.manoObra.toArray();
        const actualizados = manoObra.map(mo => ({
            ...mo,
            salario_diario: mo.salario_diario * this.factoresActualizacion.mano_obra,
            salario_hora: (mo.salario_diario * this.factoresActualizacion.mano_obra) / 8,
            ultima_actualizacion: new Date().toISOString()
        }));
        
        await db.manoObra.bulkPut(actualizados);
        console.log('✅ Mano de obra actualizada:', actualizados.length);
        return actualizados.length;
    },
    
    // Actualizar equipos
    actualizarEquipos: async function() {
        const equipos = await db.equipos.toArray();
        const actualizados = equipos.map(e => ({
            ...e,
            costo_renta_dia: e.costo_renta_dia * this.factoresActualizacion.equipos,
            costo_propiedad_dia: e.costo_propiedad_dia * this.factoresActualizacion.equipos,
            ultima_actualizacion: new Date().toISOString()
        }));
        
        await db.equipos.bulkPut(actualizados);
        console.log('✅ Equipos actualizados:', actualizados.length);
        return actualizados.length;
    },
    
    // Actualización masiva
    actualizarTodo: async function() {
        const resultados = await Promise.all([
            this.actualizarMateriales(),
            this.actualizarManoObra(),
            this.actualizarEquipos()
        ]);
        
        return {
            materiales: resultados[0],
            manoObra: resultados[1],
            equipos: resultados[2],
            fecha: new Date().toISOString()
        };
    }
};

console.log('✅ precios-actuales.js listo');
