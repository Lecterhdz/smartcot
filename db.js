// SMARTCOT - BASE DE DATOS COMPLETA (IndexedDB + Dexie.js)
console.log('💾 db.js cargado - SmartCot Database');

const db = new Dexie('SmartCotDB');

db.version(2).stores({
    cotizaciones: '++id, clienteId, fecha, estado, totalFinal',
    clientes: '++id, nombre, email, telefono',
    configuracion: 'clave, valor',
    materiales: '++id, codigo, nombre, categoria',
    manoObra: '++id, codigo, especialidad',
    maquinaria: '++id, codigo, nombre',
    factoresRendimiento: '++id, tipo, nombre'
});

async function dbErrorHandler(operation, error) {
    console.error('❌ DB Error en', operation, ':', error.name, error.message);
    if (error.name === 'DexieError' || error.name === 'InvalidStateError') {
        console.log('🔄 Intentando reconstruir base de datos...');
        try {
            await db.close();
            await Dexie.delete('SmartCotDB');
            window.location.reload();
        } catch (rebuildError) {
            console.error('❌ No se pudo reconstruir DB:', rebuildError);
        }
    }
    throw error;
}

window.dbCotizaciones = {
    guardar: async function(cotizacion) { try { const id = await db.cotizaciones.add(cotizacion); console.log('✅ Cotización guardada:', id); return id; } catch (error) { return dbErrorHandler('guardar cotización', error); } },
    obtener: async function(id) { try { return await db.cotizaciones.get(id); } catch (error) { return dbErrorHandler('obtener cotización', error); } },
    obtenerTodas: async function() { try { return await db.cotizaciones.reverse().toArray(); } catch (error) { console.error('❌ Error obteniendo cotizaciones:', error); return []; } },
    actualizar: async function(id, datos) { await db.cotizaciones.update(id, datos); },
    eliminar: async function(id) { await db.cotizaciones.delete(id); },
    contar: async function() { try { return await db.cotizaciones.count(); } catch (error) { return 0; } }
};

window.dbClientes = {
    guardar: async function(cliente) { try { const id = await db.clientes.add(cliente); console.log('✅ Cliente guardado:', id); return id; } catch (error) { return dbErrorHandler('guardar cliente', error); } },
    obtener: async function(id) { try { return await db.clientes.get(id); } catch (error) { return dbErrorHandler('obtener cliente', error); } },
    obtenerTodos: async function() { try { return await db.clientes.reverse().toArray(); } catch (error) { console.error('❌ Error obteniendo clientes:', error); return []; } },
    actualizar: async function(id, datos) { await db.clientes.update(id, datos); },
    eliminar: async function(id) { await db.clientes.delete(id); },
    contar: async function() { try { return await db.clientes.count(); } catch (error) { return 0; } }
};

window.dbConfig = {
    guardar: async function(clave, valor) { try { await db.configuracion.put({ clave, valor }); console.log('✅ Configuración guardada:', clave); } catch (error) { return dbErrorHandler('guardar configuración', error); } },
    obtener: async function(clave) { try { const config = await db.configuracion.get(clave); return config ? config.valor : null; } catch (error) { console.error('❌ Error obteniendo configuración:', error); return null; } },
    obtenerTodas: async function() { try { const configs = await db.configuracion.toArray(); const resultado = {}; configs.forEach(c => resultado[c.clave] = c.valor); return resultado; } catch (error) { console.error('❌ Error obteniendo configuraciones:', error); return { iva: 16, utilidad: 10, empresa: '' }; } }
};

window.dbMateriales = {
    buscar: async function(termino, limite = 50) { try { if (termino.length < 2) return []; return await db.materiales.filter(m => m.nombre.toLowerCase().includes(termino.toLowerCase())).limit(limite).toArray(); } catch (error) { return []; } },
    todos: async function(offset = 0, limite = 100) { try { return await db.materiales.offset(offset).limit(limite).toArray(); } catch (error) { return []; } },
    guardar: async function(material) { try { return await db.materiales.put(material); } catch (error) { return dbErrorHandler('guardar material', error); } },
    contar: async function() { try { return await db.materiales.count(); } catch (error) { return 0; } },
    importarBulk: async function(materiales) { try { await db.materiales.bulkPut(materiales); console.log('✅ Materiales importados:', materiales.length); } catch (error) { return dbErrorHandler('importar materiales', error); } }
};

window.dbManoObra = {
    todos: async function() { try { return await db.manoObra.toArray(); } catch (error) { return []; } },
    guardar: async function(mo) { try { return await db.manoObra.put(mo); } catch (error) { return dbErrorHandler('guardar mano de obra', error); } }
};

window.dbMaquinaria = {
    todos: async function() { try { return await db.maquinaria.toArray(); } catch (error) { return []; } },
    guardar: async function(maq) { try { return await db.maquinaria.put(maq); } catch (error) { return dbErrorHandler('guardar maquinaria', error); } }
};

window.dbFactores = {
    todos: async function() { try { return await db.factoresRendimiento.toArray(); } catch (error) { return []; } },
    guardar: async function(factor) { try { return await db.factoresRendimiento.put(factor); } catch (error) { return dbErrorHandler('guardar factor', error); } }
};

window.dbExportar = async function() { try { const datos = { version: '2.0', fecha: new Date().toISOString(), cotizaciones: await db.cotizaciones.toArray(), clientes: await db.clientes.toArray(), configuracion: await db.configuracion.toArray() }; const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'SmartCot_Respaldo_' + new Date().toISOString().split('T')[0] + '.json'; a.click(); URL.revokeObjectURL(url); return datos; } catch (error) { console.error('❌ Error exportando:', error); throw error; } };

window.dbImportar = async function(datosJSON) { try { const datos = JSON.parse(datosJSON); await db.cotizaciones.clear(); await db.clientes.clear(); await db.configuracion.clear(); if (datos.cotizaciones) await db.cotizaciones.bulkAdd(datos.cotizaciones); if (datos.clientes) await db.clientes.bulkAdd(datos.clientes); if (datos.configuracion) await db.configuracion.bulkPut(datos.configuracion); alert('✅ Datos restaurados. La página se recargará.'); location.reload(); } catch (error) { console.error('❌ Error importando:', error); alert('❌ Error: ' + error.message); throw error; } };

window.dbEstadisticas = async function() { try { const cotizaciones = await db.cotizaciones.toArray(); const clientes = await db.clientes.toArray(); const totalIngresos = cotizaciones.reduce((sum, c) => sum + (c.totalFinal || 0), 0); const margenPromedio = cotizaciones.length > 0 ? cotizaciones.reduce((sum, c) => sum + (c.margenUtilidad || 0), 0) / cotizaciones.length : 0; return { cotizaciones: cotizaciones.length, clientes: clientes.length, totalIngresos: totalIngresos, margenPromedio: margenPromedio }; } catch (error) { console.error('❌ Error en estadísticas:', error); return { cotizaciones: 0, clientes: 0, totalIngresos: 0, margenPromedio: 0 }; } };

window.dbInicializarEjemplo = async function() { try { const factoresExistentes = await db.factoresRendimiento.count(); if (factoresExistentes === 0) { await db.factoresRendimiento.bulkAdd([ { tipo: 'altura', nombre: 'Altura >3m', valor: 1.15, descripcion: '+15%' }, { tipo: 'dificultad', nombre: 'Espacio confinado', valor: 1.20, descripcion: '+20%' }, { tipo: 'desperdicio', nombre: 'Desperdicio estándar', valor: 1.05, descripcion: '+5%' } ]); } const clientesExistentes = await db.clientes.count(); if (clientesExistentes === 0) { await db.clientes.bulkAdd([ { nombre: 'Cliente Ejemplo 1', email: 'cliente1@email.com', telefono: '55-1234-5678' }, { nombre: 'Cliente Ejemplo 2', email: 'cliente2@email.com', telefono: '55-8765-4321' } ]); } console.log('✅ Datos de ejemplo inicializados'); } catch (error) { console.error('⚠️ Error inicializando ejemplos:', error); } };

console.log('✅ db.js listo - Con manejo de errores');
