// ─────────────────────────────────────────────────────────────────────
// SMARTCOT - BASE DE DATOS COMPLETA (IndexedDB + Dexie.js)
// Soporta 20,000+ registros fácilmente
// ─────────────────────────────────────────────────────────────────────

console.log('💾 db.js cargado - SmartCot Database');

// Inicializar Dexie
const db = new Dexie('SmartCotDB');

// Definir esquema de base de datos (Versión 2)
db.version(2).stores({
    // Presupuestos/Cotizaciones
    presupuestos: '++id, clienteId, fecha, estado, total, capitulos[]',
    cotizaciones: '++id, clienteId, fecha, estado, totalFinal',
    
    // Clientes
    clientes: '++id, nombre, email, telefono, rfc',
    
    // Catálogo de Materiales (20,000+ registros)
    materiales: '++id, codigo, nombre, categoria, unidad, precioBase, [categoria+nombre]',
    
    // Catálogo de Mano de Obra
    manoObra: '++id, codigo, especialidad, unidad, precioHora',
    
    // Catálogo de Maquinaria
    maquinaria: '++id, codigo, nombre, tipo, unidad, precioHora',
    
    // Factores de Rendimiento (Altura, Dificultad, Clima, etc.)
    factoresRendimiento: '++id, tipo, nombre, valor, descripcion',
    
    // Configuración
    configuracion: 'clave, valor',
    
    // Licencias
    licencias: 'id, clave, tipo, expiracion'
});

// ─────────────────────────────────────────────────────────────────────
// COTIZACIONES / PRESUPUESTOS
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
        try {
            const id = await db.clientes.add(cliente);
            console.log('✅ Cliente guardado:', id);
            return id;
        } catch (error) {
            console.error('❌ Error guardando cliente:', error);
            throw error;
        }
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
        try {
            await db.configuracion.put({ clave, valor });
            console.log('✅ Configuración guardada:', clave);
        } catch (error) {
            console.error('❌ Error guardando configuración:', error);
            throw error;
        }
    },

    obtener: async function(clave) {
        try {
            const config = await db.configuracion.get(clave);
            return config ? config.valor : null;
        } catch (error) {
            console.error('❌ Error obteniendo configuración:', error);
            return null;
        }
    },

    obtenerTodas: async function() {
        try {
            const configs = await db.configuracion.toArray();
            const resultado = {};
            configs.forEach(c => resultado[c.clave] = c.valor);
            return resultado;
        } catch (error) {
            console.error('❌ Error obteniendo todas las configuraciones:', error);
            return {};
        }
    }
};

// ─────────────────────────────────────────────────────────────────────
// MATERIALES (20,000+ REGISTROS)
// ─────────────────────────────────────────────────────────────────────
window.dbMateriales = {
    // Buscar con índice (rápido incluso con 20,000+)
    buscar: async function(termino, limite = 50) {
        if (termino.length < 2) return [];
        
        try {
            const resultados = await db.materiales
                .filter(m => 
                    m.nombre.toLowerCase().includes(termino.toLowerCase()) ||
                    m.codigo.toLowerCase().includes(termino.toLowerCase())
                )
                .limit(limite)
                .toArray();
            
            console.log('🔍 Materiales encontrados:', resultados.length);
            return resultados;
        } catch (error) {
            console.error('❌ Error buscando materiales:', error);
            return [];
        }
    },

    // Obtener por categoría
    porCategoria: async function(categoria) {
        return await db.materiales.where('categoria').equals(categoria).toArray();
    },

    // Obtener todos (con paginación para 20,000+)
    todos: async function(offset = 0, limite = 100) {
        return await db.materiales.offset(offset).limit(limite).toArray();
    },

    // Contar total
    contar: async function() {
        return await db.materiales.count();
    },

    // Guardar material
    guardar: async function(material) {
        try {
            const id = await db.materiales.put(material);
            console.log('✅ Material guardado:', id);
            return id;
        } catch (error) {
            console.error('❌ Error guardando material:', error);
            throw error;
        }
    },

    // Actualizar precio
    actualizarPrecio: async function(codigo, nuevoPrecio) {
        await db.materiales.update(codigo, { precioBase: nuevoPrecio });
    },

    // Bulk insert (para importar catálogos grandes)
    importarBulk: async function(materiales) {
        try {
            await db.materiales.bulkPut(materiales);
            console.log('✅ Materiales importados:', materiales.length);
        } catch (error) {
            console.error('❌ Error importando materiales:', error);
            throw error;
        }
    },

    // Exportar catálogo completo
    exportar: async function() {
        return await db.materiales.toArray();
    },

    // Eliminar material
    eliminar: async function(id) {
        await db.materiales.delete(id);
    }
};

// ─────────────────────────────────────────────────────────────────────
// MANO DE OBRA
// ─────────────────────────────────────────────────────────────────────
window.dbManoObra = {
    todos: async function() {
        return await db.manoObra.toArray();
    },

    porEspecialidad: async function(especialidad) {
        return await db.manoObra.where('especialidad').equals(especialidad).toArray();
    },

    guardar: async function(mo) {
        try {
            const id = await db.manoObra.put(mo);
            console.log('✅ Mano de obra guardada:', id);
            return id;
        } catch (error) {
            console.error('❌ Error guardando mano de obra:', error);
            throw error;
        }
    },

    eliminar: async function(id) {
        await db.manoObra.delete(id);
    },

    contar: async function() {
        return await db.manoObra.count();
    }
};

// ─────────────────────────────────────────────────────────────────────
// MAQUINARIA
// ─────────────────────────────────────────────────────────────────────
window.dbMaquinaria = {
    todos: async function() {
        return await db.maquinaria.toArray();
    },

    porTipo: async function(tipo) {
        return await db.maquinaria.where('tipo').equals(tipo).toArray();
    },

    guardar: async function(maq) {
        try {
            const id = await db.maquinaria.put(maq);
            console.log('✅ Maquinaria guardada:', id);
            return id;
        } catch (error) {
            console.error('❌ Error guardando maquinaria:', error);
            throw error;
        }
    },

    eliminar: async function(id) {
        await db.maquinaria.delete(id);
    },

    contar: async function() {
        return await db.maquinaria.count();
    }
};

// ─────────────────────────────────────────────────────────────────────
// FACTORES DE RENDIMIENTO
// ─────────────────────────────────────────────────────────────────────
window.dbFactores = {
    todos: async function() {
        return await db.factoresRendimiento.toArray();
    },

    porTipo: async function(tipo) {
        return await db.factoresRendimiento.where('tipo').equals(tipo).toArray();
    },

    guardar: async function(factor) {
        try {
            const id = await db.factoresRendimiento.put(factor);
            console.log('✅ Factor guardado:', id);
            return id;
        } catch (error) {
            console.error('❌ Error guardando factor:', error);
            throw error;
        }
    },

    eliminar: async function(id) {
        await db.factoresRendimiento.delete(id);
    },

    // Calcular factor compuesto (múltiples factores aplicados)
    calcularCompuesto: async function(tipos) {
        try {
            const factores = await db.factoresRendimiento
                .filter(f => tipos.includes(f.tipo))
                .toArray();
            
            // Multiplicar todos los factores
            const factorTotal = factores.reduce((acc, f) => acc * f.valor, 1);
            
            return {
                factores: factores,
                factorTotal: factorTotal,
                porcentajeExtra: ((factorTotal - 1) * 100).toFixed(2)
            };
        } catch (error) {
            console.error('❌ Error calculando factor compuesto:', error);
            return { factores: [], factorTotal: 1, porcentajeExtra: '0.00' };
        }
    }
};

// ─────────────────────────────────────────────────────────────────────
// EXPORTAR/IMPORTAR DATOS (Respaldo Completo)
// ─────────────────────────────────────────────────────────────────────
window.dbExportar = async function() {
    try {
        const datos = {
            version: '2.0',
            fecha: new Date().toISOString(),
            cotizaciones: await db.cotizaciones.toArray(),
            clientes: await db.clientes.toArray(),
            configuracion: await db.configuracion.toArray(),
            materiales: await db.materiales.toArray(),
            manoObra: await db.manoObra.toArray(),
            maquinaria: await db.maquinaria.toArray(),
            factoresRendimiento: await db.factoresRendimiento.toArray()
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
    } catch (error) {
        console.error('❌ Error exportando datos:', error);
        throw error;
    }
};

window.dbImportar = async function(datosJSON) {
    try {
        const datos = JSON.parse(datosJSON);
        
        // Limpiar base de datos actual
        await db.cotizaciones.clear();
        await db.clientes.clear();
        await db.configuracion.clear();
        await db.materiales.clear();
        await db.manoObra.clear();
        await db.maquinaria.clear();
        await db.factoresRendimiento.clear();
        
        // Importar datos
        if (datos.cotizaciones && datos.cotizaciones.length > 0) {
            await db.cotizaciones.bulkAdd(datos.cotizaciones);
        }
        if (datos.clientes && datos.clientes.length > 0) {
            await db.clientes.bulkAdd(datos.clientes);
        }
        if (datos.configuracion && datos.configuracion.length > 0) {
            await db.configuracion.bulkPut(datos.configuracion);
        }
        if (datos.materiales && datos.materiales.length > 0) {
            await db.materiales.bulkAdd(datos.materiales);
        }
        if (datos.manoObra && datos.manoObra.length > 0) {
            await db.manoObra.bulkAdd(datos.manoObra);
        }
        if (datos.maquinaria && datos.maquinaria.length > 0) {
            await db.maquinaria.bulkAdd(datos.maquinaria);
        }
        if (datos.factoresRendimiento && datos.factoresRendimiento.length > 0) {
            await db.factoresRendimiento.bulkAdd(datos.factoresRendimiento);
        }
        
        console.log('✅ Datos importados correctamente');
        alert('✅ Datos restaurados correctamente. La página se recargará.');
        location.reload();
        
    } catch (error) {
        console.error('❌ Error importando datos:', error);
        alert('❌ Error al importar datos: ' + error.message);
        throw error;
    }
};

// ─────────────────────────────────────────────────────────────────────
// IMPORTAR CATÁLOGO MASIVO (20,000+ MATERIALES)
// ─────────────────────────────────────────────────────────────────────
window.dbImportarCatalogo = async function(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                const datos = JSON.parse(e.target.result);
                
                if (!datos.materiales || !Array.isArray(datos.materiales)) {
                    throw new Error('Formato inválido - debe contener array "materiales"');
                }
                
                const total = datos.materiales.length;
                let procesados = 0;
                
                // Importar en lotes de 1000 (mejor rendimiento)
                const loteSize = 1000;
                for (let i = 0; i < total; i += loteSize) {
                    const lote = datos.materiales.slice(i, i + loteSize);
                    await db.materiales.bulkPut(lote);
                    procesados += lote.length;
                    console.log(`📦 Importados ${procesados}/${total}`);
                }
                
                resolve({ total, procesados });
                
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('Error leyendo archivo'));
        reader.readAsText(file);
    });
};

// ─────────────────────────────────────────────────────────────────────
// ESTADÍSTICAS GENERALES
// ─────────────────────────────────────────────────────────────────────
window.dbEstadisticas = async function() {
    try {
        const cotizaciones = await db.cotizaciones.toArray();
        const clientes = await db.clientes.toArray();
        const materiales = await db.materiales.toArray();
        
        const totalIngresos = cotizaciones.reduce((sum, c) => sum + (c.totalFinal || 0), 0);
        const margenPromedio = cotizaciones.length > 0 
            ? cotizaciones.reduce((sum, c) => sum + (c.margenUtilidad || 0), 0) / cotizaciones.length 
            : 0;
        
        return {
            cotizaciones: cotizaciones.length,
            clientes: clientes.length,
            materiales: materiales.length,
            totalIngresos: totalIngresos,
            margenPromedio: margenPromedio
        };
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        return {
            cotizaciones: 0,
            clientes: 0,
            materiales: 0,
            totalIngresos: 0,
            margenPromedio: 0
        };
    }
};

// ─────────────────────────────────────────────────────────────────────
// INICIALIZAR DATOS DE EJEMPLO (Para pruebas)
// ─────────────────────────────────────────────────────────────────────
window.dbInicializarEjemplo = async function() {
    // Factores de rendimiento por defecto
    const factoresEjemplo = [
        { id: 1, tipo: 'altura', nombre: 'Trabajo en altura >3m', valor: 1.15, descripcion: '+15% por trabajo en altura mayor a 3 metros' },
        { id: 2, tipo: 'altura', nombre: 'Trabajo en altura >5m', valor: 1.25, descripcion: '+25% por trabajo en altura mayor a 5 metros' },
        { id: 3, tipo: 'dificultad', nombre: 'Espacio confinado', valor: 1.20, descripcion: '+20% por trabajo en espacio confinado' },
        { id: 4, tipo: 'dificultad', nombre: 'Acceso difícil', valor: 1.10, descripcion: '+10% por acceso difícil al área de trabajo' },
        { id: 5, tipo: 'clima', nombre: 'Clima extremo calor', valor: 1.10, descripcion: '+10% por trabajo en clima de calor extremo' },
        { id: 6, tipo: 'clima', nombre: 'Clima extremo frío', valor: 1.10, descripcion: '+10% por trabajo en clima de frío extremo' },
        { id: 7, tipo: 'desperdicio', nombre: 'Desperdicio estándar', valor: 1.05, descripcion: '+5% desperdicio estándar de material' },
        { id: 8, tipo: 'desperdicio', nombre: 'Desperdicio alto', valor: 1.10, descripcion: '+10% desperdicio por cortes especiales' }
    ];

    const existentes = await db.factoresRendimiento.count();
    if (existentes === 0) {
        await db.factoresRendimiento.bulkAdd(factoresEjemplo);
        console.log('✅ Factores de ejemplo inicializados');
    }

    // Clientes de ejemplo
    const clientesEjemplo = [
        { id: 1, nombre: 'Constructora ABC SA de CV', email: 'contacto@abc.com', telefono: '55-1234-5678', rfc: 'ABC123456789' },
        { id: 2, nombre: 'Desarrollos Inmobiliarios XYZ', email: 'info@xyz.com', telefono: '55-8765-4321', rfc: 'XYZ987654321' }
    ];

    const clientesExistentes = await db.clientes.count();
    if (clientesExistentes === 0) {
        await db.clientes.bulkAdd(clientesEjemplo);
        console.log('✅ Clientes de ejemplo inicializados');
    }

    console.log('✅ Datos de ejemplo inicializados');
};

console.log('✅ db.js completo cargado - Todas las funciones disponibles');
console.log('💾 Tablas: cotizaciones, clientes, configuracion, materiales, manoObra, maquinaria, factoresRendimiento');
