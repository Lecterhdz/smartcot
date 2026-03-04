// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - GESTOR DE BASE DE DATOS PRINCIPAL
// Este archivo inicializa IndexedDB y exporta funciones globales
// ─────────────────────────────────────────────────────────────────────

console.log('💾 db.js cargado - Inicializando SmartCotDB...');

// ─────────────────────────────────────────────────────────────────────
// VERIFICAR QUE DEXIE.JS ESTÁ CARGADO
// ─────────────────────────────────────────────────────────────────────
if (typeof Dexie === 'undefined') {
    console.error('❌ ERROR: Dexie.js no está cargado. Verifica que el CDN esté incluido en index.html');
    throw new Error('Dexie.js no encontrado');
}

// ─────────────────────────────────────────────────────────────────────
// CREAR INSTANCIA DE BASE DE DATOS
// ─────────────────────────────────────────────────────────────────────
const db = new Dexie('SmartCotDB');

// ─────────────────────────────────────────────────────────────────────
// DEFINIR ESQUEMA DE BASE DE DATOS (VERSIÓN 3)
// ─────────────────────────────────────────────────────────────────────
db.version(3).stores({
    // Curva S
    avanceObra: '++id, cotizacionId, semana, fecha',
    
    // Conceptos (APU completos)
    conceptos: '++id, codigo, categoria, subcategoria, unidad, activo, [categoria+subcategoria]',
    
    // Materiales (20,000+ registros)
    materiales: '++id, codigo, nombre, categoria, unidad, precio_base, activo, [categoria+nombre]',
    
    // Mano de Obra
    manoObra: '++id, codigo, puesto, especialidad, activo',
    
    // Equipos
    equipos: '++id, codigo, nombre, tipo, categoria, activo',
    
    // Herramienta (%MO1, %MO2, %MO3, %MO5)
    herramienta: '++id, codigo, nombre, tipo, activo',
    
    // Factores de rendimiento
    factoresRendimiento: '++id, tipo, nombre, valor, activo',
    
    // Clientes
    clientes: '++id, nombre, email, telefono, activo',
    
    // Proyectos
    proyectos: '++id, nombre, cliente, fecha, estado',
    
    // Cotizaciones
    cotizaciones: '++id, proyectoId, fecha, estado, total',
    
    // Configuración
    configuracion: 'clave, valor'
});

// ─────────────────────────────────────────────────────────────────────
// CONECTAR A LA BASE DE DATOS
// ─────────────────────────────────────────────────────────────────────
db.open().then(function() {
    console.log('✅ SmartCotDB conectada exitosamente');
    console.log('📊 Tablas disponibles:', db.tables.map(t => t.name).join(', '));
    
    // Inicializar datos por defecto
    inicializarDatosPorDefecto();
    
    // Exportar db globalmente para que otros archivos puedan usarla
    window.db = db;
    
    // Disparar evento de DB lista
    document.dispatchEvent(new CustomEvent('db-ready', { detail: db }));
    
}).catch(function(error) {
    console.error('❌ Error conectando a SmartCotDB:', error);
    console.error('Stack:', error.stack);
    
    // Intentar reconstruir si hay error de versión
    if (error.name === 'DexieError' || error.name === 'InvalidStateError') {
        console.log('🔄 Intentando reconstruir base de datos...');
        Dexie.delete('SmartCotDB').then(() => {
            console.log('✅ Base de datos reconstruida, recargando...');
            location.reload();
        }).catch(rebuildError => {
            console.error('❌ No se pudo reconstruir:', rebuildError);
            alert('❌ Error de base de datos. Limpia el cache del navegador y recarga.');
        });
    }
});

// ─────────────────────────────────────────────────────────────────────
// INICIALIZAR DATOS POR DEFECTO
// ─────────────────────────────────────────────────────────────────────
async function inicializarDatosPorDefecto() {
    try {
        // Verificar si ya hay configuración
        const configExiste = await db.configuracion.get('version');
        
        if (!configExiste) {
            console.log('📦 Inicializando datos por defecto...');
            
            // Configuración por defecto
            await db.configuracion.bulkPut([
                { clave: 'version', valor: '3.0' },
                { clave: 'iva_default', valor: 16 },
                { clave: 'utilidad_default', valor: 10 },
                { clave: 'moneda', valor: 'MXN' },
                { clave: 'empresa', valor: '' },
                { clave: 'fecha_instalacion', valor: new Date().toISOString() }
            ]);
            
            // Herramienta por defecto (%MO1, %MO2, %MO3, %MO5)
            await db.herramienta.bulkPut([
                { id: 1, codigo: '%MO1', nombre: 'HERRAMIENTA MENOR', tipo: 'herramienta', activo: true },
                { id: 2, codigo: '%MO2', nombre: 'ANDAMIOS', tipo: 'andamios', activo: true },
                { id: 3, codigo: '%MO3', nombre: 'MATERIALES MENORES', tipo: 'materiales_menores', activo: true },
                { id: 4, codigo: '%MO5', nombre: 'EQUIPO DE SEGURIDAD', tipo: 'seguridad', activo: true }
            ]);
            
            // Factores de rendimiento por defecto
            await db.factoresRendimiento.bulkPut([
                { id: 1, tipo: 'altura', nombre: 'Trabajo en altura >3m', valor: 1.15, descripcion: '+15% por altura >3m', activo: true },
                { id: 2, tipo: 'altura', nombre: 'Trabajo en altura >5m', valor: 1.25, descripcion: '+25% por altura >5m', activo: true },
                { id: 3, tipo: 'altura', nombre: 'Trabajo en altura >10m', valor: 1.40, descripcion: '+40% por altura >10m', activo: true },
                { id: 4, tipo: 'clima', nombre: 'Clima extremo calor', valor: 1.10, descripcion: '+10% por calor extremo (>35°C)', activo: true },
                { id: 5, tipo: 'clima', nombre: 'Clima extremo frío', valor: 1.10, descripcion: '+10% por frío extremo (<5°C)', activo: true },
                { id: 6, tipo: 'dificultad', nombre: 'Espacio confinado', valor: 1.20, descripcion: '+20% por espacio confinado', activo: true },
                { id: 7, tipo: 'dificultad', nombre: 'Acceso difícil', valor: 1.10, descripcion: '+10% por acceso difícil', activo: true },
                { id: 8, tipo: 'desperdicio', nombre: 'Desperdicio estándar', valor: 1.05, descripcion: '+5% desperdicio estándar', activo: true },
                { id: 9, tipo: 'desperdicio', nombre: 'Desperdicio alto', valor: 1.10, descripcion: '+10% desperdicio alto', activo: true },
                { id: 10, tipo: 'seguridad', nombre: 'EPP especial requerido', valor: 1.08, descripcion: '+8% por EPP especial', activo: true }
            ]);
            
            console.log('✅ Datos por defecto inicializados');
        }
        
    } catch (error) {
        console.error('⚠️ Error inicializando datos por defecto:', error);
    }
}

// ─────────────────────────────────────────────────────────────────────
// FUNCIONES DE UTILIDAD PARA LA BASE DE DATOS
// ─────────────────────────────────────────────────────────────────────
window.dbUtils = {
    // Limpiar toda la base de datos
    limpiarTodo: async function() {
        if (confirm('⚠️ ¿Estás seguro de eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
            await db.conceptos.clear();
            await db.materiales.clear();
            await db.manoObra.clear();
            await db.equipos.clear();
            await db.herramienta.clear();
            await db.clientes.clear();
            await db.proyectos.clear();
            await db.cotizaciones.clear();
            // No limpiar configuración ni factores
            console.log('✅ Base de datos limpiada (excepto configuración)');
            alert('✅ Datos eliminados. La página se recargará.');
            location.reload();
        }
    },
    
    // Exportar toda la base de datos
    exportarTodo: async function() {
        const datos = {
            version: '3.0',
            fecha: new Date().toISOString(),
            conceptos: await db.conceptos.toArray(),
            materiales: await db.materiales.toArray(),
            manoObra: await db.manoObra.toArray(),
            equipos: await db.equipos.toArray(),
            herramienta: await db.herramienta.toArray(),
            clientes: await db.clientes.toArray(),
            configuracion: await db.configuracion.toArray(),
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
        alert('✅ Respaldo descargado. Guárdalo en un lugar seguro.');
    },
    
    // Obtener estadísticas de la base de datos
    estadisticas: async function() {
        return {
            conceptos: await db.conceptos.count(),
            materiales: await db.materiales.count(),
            manoObra: await db.manoObra.count(),
            equipos: await db.equipos.count(),
            herramienta: await db.herramienta.count(),
            clientes: await db.clientes.count(),
            proyectos: await db.proyectos.count(),
            cotizaciones: await db.cotizaciones.count()
        };
    },
    
    // Verificar si la base de datos está vacía
    estaVacia: async function() {
        const count = await db.conceptos.count();
        return count === 0;
    },
    
    // Buscar concepto por código
    buscarConcepto: async function(codigo) {
        return await db.conceptos.where('codigo').equals(codigo).first();
    },
    
    // Buscar material por código
    buscarMaterial: async function(codigo) {
        return await db.materiales.where('codigo').equals(codigo).first();
    },
    
    // Obtener todos los conceptos de una categoría
    conceptosPorCategoria: async function(categoria) {
        return await db.conceptos.where('categoria').equals(categoria).toArray();
    },
    
    // Obtener configuración
    obtenerConfig: async function(clave) {
        const config = await db.configuracion.get(clave);
        return config ? config.valor : null;
    }
};

// ─────────────────────────────────────────────────────────────────────
// EVENTO DE DB LISTA PARA OTROS ARCHIVOS
// ─────────────────────────────────────────────────────────────────────
document.addEventListener('db-ready', function(e) {
    console.log('🎯 Evento db-ready disparado - Otros archivos pueden usar window.db');
});

console.log('✅ db.js listo - SmartCotDB inicializada');

// ─────────────────────────────────────────────────────────────────
// IMPORTAR DATOS (RESPALDO JSON)
// ─────────────────────────────────────────────────────────────────
window.dbImportar = async function(datosJSON) {
    try {
        const datos = JSON.parse(datosJSON);
        
        if (!datos) {
            throw new Error('Datos inválidos');
        }
        
        // Importar conceptos
        if (datos.conceptos && datos.conceptos.length > 0) {
            await db.conceptos.bulkPut(datos.conceptos);
            console.log('✅ Conceptos importados:', datos.conceptos.length);
        }
        
        // Importar materiales
        if (datos.materiales && datos.materiales.length > 0) {
            await db.materiales.bulkPut(datos.materiales);
            console.log('✅ Materiales importados:', datos.materiales.length);
        }
        
        // Importar mano de obra
        if (datos.manoObra && datos.manoObra.length > 0) {
            await db.manoObra.bulkPut(datos.manoObra);
            console.log('✅ Mano de obra importada:', datos.manoObra.length);
        }
        
        // Importar equipos
        if (datos.equipos && datos.equipos.length > 0) {
            await db.equipos.bulkPut(datos.equipos);
            console.log('✅ Equipos importados:', datos.equipos.length);
        }
        
        // Importar herramienta
        if (datos.herramienta && datos.herramienta.length > 0) {
            await db.herramienta.bulkPut(datos.herramienta);
            console.log('✅ Herramienta importada:', datos.herramienta.length);
        }
        
        // Importar clientes
        if (datos.clientes && datos.clientes.length > 0) {
            await db.clientes.bulkPut(datos.clientes);
            console.log('✅ Clientes importados:', datos.clientes.length);
        }
        
        // Importar cotizaciones
        if (datos.cotizaciones && datos.cotizaciones.length > 0) {
            await db.cotizaciones.bulkPut(datos.cotizaciones);
            console.log('✅ Cotizaciones importadas:', datos.cotizaciones.length);
        }
        
        console.log('✅ Importación completada');
        
    } catch (error) {
        console.error('❌ Error importando:', error);
        throw error;
    }
};
