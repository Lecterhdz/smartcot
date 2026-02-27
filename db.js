// ─────────────────────────────────────────────────────────────────────
// SMARTCOT - BASE DE DATOS INDEXEDDB (Dexie.js)
// Soporta 20,000+ registros fácilmente
// ─────────────────────────────────────────────────────────────────────

console.log('💾 db.js cargado');

// Inicializar Dexie
const db = new Dexie('SmartCotDB');

// Definir esquema de base de datos
db.version(1).stores({
    cotizaciones: '++id, clienteId, fecha, estado, total',
    clientes: '++id, nombre, email, telefono',
    configuracion: 'clave, valor',
    licencias: 'id, clave, tipo, expiracion'
});

// ─────────────────────────────────────────────────────────────────────
// COTIZACIONES
// ─────────────────────────────────────────────────────────────────────
window.dbCotizaciones = {
    guardar: async function(cotizacion) {
        try {
            const id = await db.cotizaciones.add(cotizacion);
            console.log('✅ Cotización guardada:', id);
            return id;
        } catch (error) {
            console.error('❌ Error guardando cotización:', error);
            throw error;
        }
    },

    obtener: async function(id) {
        return await db.cotizaciones.get(id);
    },

    obtenerTodas: async function() {
        return await db.cotizaciones.reverse().toArray();
    },

    actualizar: async function(id, datos) {
        await db.cotizaciones.update(id, datos);
    },

    eliminar: async function(id) {
        await db.cotizaciones.delete(id);
    },

    buscar: async function(termino) {
        return await db.cotizaciones.filter(cot => 
            cot.cliente?.toLowerCase().includes(termino.toLowerCase()) ||
            cot.descripcion?.toLowerCase().includes(termino.toLowerCase())
        ).toArray();
    },

    contar: async function() {
        return await db.cotizaciones.count();
    }
};

// ─────────────────────────────────────────────────────────────────────
// CLIENTES
// ─────────────────────────────────────────────────────────────────────
window.dbClientes = {
    guardar: async function(cliente) {
        const id = await db.clientes.add(cliente);
        console.log('✅ Cliente guardado:', id);
        return id;
    },

    obtener: async function(id) {
        return await db.clientes.get(id);
    },

    obtenerTodos: async function() {
        return await db.clientes.reverse().toArray();
    },

    actualizar: async function(id, datos) {
        await db.clientes.update(id, datos);
    },

    eliminar: async function(id) {
        await db.clientes.delete(id);
    },

    contar: async function() {
        return await db.clientes.count();
    }
};

// ─────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────
window.dbConfig = {
    guardar: async function(clave, valor) {
        await db.configuracion.put({ clave, valor });
    },

    obtener: async function(clave) {
        const config = await db.configuracion.get(clave);
        return config ? config.valor : null;
    },

    obtenerTodas: async function() {
        const configs = await db.configuracion.toArray();
        const resultado = {};
        configs.forEach(c => resultado[c.clave] = c.valor);
        return resultado;
    }
};

// ─────────────────────────────────────────────────────────────────────
// EXPORTAR/IMPORTAR DATOS (Respaldo)
// ─────────────────────────────────────────────────────────────────────
window.dbExportar = async function() {
    const datos = {
        version: '1.0',
        fecha: new Date().toISOString(),
        cotizaciones: await db.cotizaciones.toArray(),
        clientes: await db.clientes.toArray(),
        configuracion: await db.configuracion.toArray()
    };
    
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SmartCot_Respaldo_' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('✅ Datos exportados:', datos);
    return datos;
};

window.dbImportar = async function(datosJSON) {
    try {
        const datos = JSON.parse(datosJSON);
        
        // Limpiar base de datos actual
        await db.cotizaciones.clear();
        await db.clientes.clear();
        await db.configuracion.clear();
        
        // Importar datos
        if (datos.cotizaciones) {
            await db.cotizaciones.bulkAdd(datos.cotizaciones);
        }
        if (datos.clientes) {
            await db.clientes.bulkAdd(datos.clientes);
        }
        if (datos.configuracion) {
            await db.configuracion.bulkPut(datos.configuracion);
        }
        
        console.log('✅ Datos importados:', datos);
        alert('✅ Datos restaurados correctamente. La página se recargará.');
        location.reload();
        
    } catch (error) {
        console.error('❌ Error importando datos:', error);
        alert('❌ Error al importar datos: ' + error.message);
        throw error;
    }
};

// ─────────────────────────────────────────────────────────────────────
// ESTADÍSTICAS
// ─────────────────────────────────────────────────────────────────────
window.dbEstadisticas = async function() {
    const cotizaciones = await db.cotizaciones.toArray();
    const clientes = await db.clientes.toArray();
    
    const totalIngresos = cotizaciones.reduce((sum, c) => sum + (c.totalFinal || 0), 0);
    const margenPromedio = cotizaciones.length > 0 
        ? cotizaciones.reduce((sum, c) => sum + (c.margenUtilidad || 0), 0) / cotizaciones.length 
        : 0;
    
    return {
        cotizaciones: cotizaciones.length,
        clientes: clientes.length,
        totalIngresos: totalIngresos,
        margenPromedio: margenPromedio
    };
};

console.log('✅ db.js listo - IndexedDB inicializado');