// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - PLANTILLAS DE COTIZACIÓN
// ─────────────────────────────────────────────────────────────────────

console.log('📝 plantillas.js cargado');

window.plantillas = {
    
    // ─────────────────────────────────────────────────────────────────
    // GUARDAR COMO PLANTILLA
    // ─────────────────────────────────────────────────────────────────
    guardarComoPlantilla: async function() {
        try {
            // ⚠️ VERIFICAR LICENCIA
            const licencia = window.licencia.cargar();
            const limite = await window.licencia.verificarLimite('plantillas');
            if (!limite.permitido) {
                alert('❌ ' + limite.razon);
                return;
            }
            
            const nombre = prompt('Nombre de la plantilla:');
            if (!nombre) return;
            
            const plantilla = {
                nombre: nombre,
                descripcion: document.getElementById('cot-descripcion')?.value || '',
                conceptosBase: app.datosCotizacion.conceptosSeleccionados,
                indirectosPorcentaje: {
                    oficina: parseFloat(document.getElementById('cot-indirectos-oficina')?.value) || 5,
                    campo: parseFloat(document.getElementById('cot-indirectos-campo')?.value) || 15,
                    financiamiento: parseFloat(document.getElementById('cot-financiamiento')?.value) || 0.85
                },
                utilidadPorcentaje: parseFloat(document.getElementById('cot-utilidad')?.value) || 10,
                fechaCreacion: new Date().toISOString(),
                usoCount: 0
            };
            
            await window.db.plantillas.add(plantilla);
            app.notificacion('✅ Plantilla "' + nombre + '" guardada', 'exito');
            
        } catch (error) {
            console.error('❌ Error guardando plantilla:', error);
            alert('❌ Error: ' + error.message);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CARGAR PLANTILLA
    // ─────────────────────────────────────────────────────────────────
    cargarPlantilla: async function(plantillaId) {
        try {
            const plantilla = await window.db.plantillas.get(plantillaId);
            if (!plantilla) return;
            
            // Incrementar contador de uso
            plantilla.usoCount++;
            await window.db.plantillas.put(plantilla);
            
            // Cargar conceptos
            app.datosCotizacion.conceptosSeleccionados = plantilla.conceptosBase || [];
            
            // Cargar porcentajes
            document.getElementById('cot-indirectos-oficina').value = plantilla.indirectosPorcentaje?.oficina || 5;
            document.getElementById('cot-indirectos-campo').value = plantilla.indirectosPorcentaje?.campo || 15;
            document.getElementById('cot-financiamiento').value = plantilla.indirectosPorcentaje?.financiamiento || 0.85;
            document.getElementById('cot-utilidad').value = plantilla.utilidadPorcentaje || 10;
            
            app.actualizarConceptosSeleccionadosUI();
            app.calcularTotalConConceptos();
            
            app.notificacion('✅ Plantilla "' + plantilla.nombre + '" cargada', 'exito');
            
        } catch (error) {
            console.error('❌ Error cargando plantilla:', error);
            alert('❌ Error: ' + error.message);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // LISTAR PLANTILLAS
    // ─────────────────────────────────────────────────────────────────
    listarPlantillas: async function() {
        try {
            const plantillas = await window.db.plantillas.toArray();
            return plantillas;
        } catch (error) {
            console.error('❌ Error listando plantillas:', error);
            return [];
        }
    }
};

console.log('✅ plantillas.js listo');
