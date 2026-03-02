// ─────────────────────────────────────────────────────────────────────
// SMARTCOT - BASE DE DATOS (SOPORTE 20,000+ REGISTROS)
// ─────────────────────────────────────────────────────────────────────

console.log('💾 db.js cargado - Soporte 20,000+ registros');

const db = new Dexie('SmartCotDB');

db.version(2).stores({
    presupuestos: '++id, clienteId, fecha, estado, total, capitulos[]',
    clientes: '++id, nombre, email, telefono, rfc',
    materiales: '++id, codigo, nombre, categoria, unidad, precioBase, [categoria+nombre]',
    manoObra: '++id, codigo, especialidad, unidad, precioHora',
    maquinaria: '++id, codigo, nombre, tipo, unidad, precioHora',
    factoresRendimiento: '++id, tipo, nombre, valor, descripcion',
    configuracion: 'clave, valor',
    licencias: 'id, clave, tipo, expiracion'
});

// ─────────────────────────────────────────────────────────────────────
// MATERIALES (20,000+ REGISTROS)
// ─────────────────────────────────────────────────────────────────────
window.dbMateriales = {
    // Buscar con índice (rápido incluso con 20,000+)
    buscar: async function(termino, limite = 50) {
        if (termino.length < 2) return [];
        
        // Búsqueda optimizada con índice
        const resultados = await db.materiales
            .filter(m => 
                m.nombre.toLowerCase().includes(termino.toLowerCase()) ||
                m.codigo.toLowerCase().includes(termino.toLowerCase())
            )
            .limit(limite)
            .toArray();
        
        console.log('🔍 Materiales encontrados:', resultados.length);
        return resultados;
    },

    // Obtener por categoría (índice compuesto)
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
        const id = await db.materiales.put(material);
        console.log('✅ Material guardado:', id);
        return id;
    },

    // Actualizar precio (útil para actualizaciones masivas)
    actualizarPrecio: async function(codigo, nuevoPrecio) {
        await db.materiales.update(codigo, { precioBase: nuevoPrecio });
    },

    // Bulk insert (para importar catálogos grandes)
    importarBulk: async function(materiales) {
        await db.materiales.bulkPut(materiales);
        console.log('✅ Materiales importados:', materiales.length);
    },

    // Exportar catálogo completo
    exportar: async function() {
        return await db.materiales.toArray();
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
        const id = await db.factoresRendimiento.put(factor);
        console.log('✅ Factor guardado:', id);
        return id;
    },

    // Calcular factor compuesto (múltiples factores aplicados)
    calcularCompuesto: async function(tipos) {
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
        const id = await db.manoObra.put(mo);
        return id;
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
        const id = await db.maquinaria.put(maq);
        return id;
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
                    throw new Error('Formato inválido');
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

console.log('✅ db.js listo - Soporte 20,000+ materiales');
