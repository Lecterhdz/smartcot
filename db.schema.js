// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - ESQUEMA DE BASE DE DATOS (CORREGIDO)
// Basado en estructura REAL: Relacion de Rendimientos de Insumos.xlsx
// ─────────────────────────────────────────────────────────────────────

console.log('💾 db.schema.js cargado - Versión Corregida');

const db = new Dexie('SmartCotDB');

// ─────────────────────────────────────────────────────────────────────
// VERSIÓN 3 - ESQUEMA COMPLETO PARA IMPORTACIÓN EXCEL
// ─────────────────────────────────────────────────────────────────────
db.version(3).stores({
    // ─────────────────────────────────────────────────────────────────
    // CONCEPTOS (Padres - APU completos)
    // ─────────────────────────────────────────────────────────────────
    // Índices: codigo (búsqueda), categoria (filtro), activo (estado)
    // Compound index: [categoria+subcategoria] para filtros combinados
    conceptos: '++id, codigo, categoria, subcategoria, unidad, activo, [categoria+subcategoria]',
    
    // ─────────────────────────────────────────────────────────────────
    // MATERIALES (Insumos - 20,000+ registros)
    // ─────────────────────────────────────────────────────────────────
    // Índices: codigo (búsqueda), nombre (búsqueda), categoria (filtro)
    // Compound index: [categoria+nombre] para búsquedas combinadas
    materiales: '++id, codigo, nombre, categoria, unidad, precio_base, activo, [categoria+nombre]',
    
    // ─────────────────────────────────────────────────────────────────
    // MANO DE OBRA (Insumos - ~20 puestos)
    // ─────────────────────────────────────────────────────────────────
    // Índices: codigo (búsqueda), puesto (búsqueda), especialidad (filtro)
    manoObra: '++id, codigo, puesto, especialidad, salario_diario, activo',
    
    // ─────────────────────────────────────────────────────────────────
    // EQUIPOS (Insumos - ~30 equipos)
    // ─────────────────────────────────────────────────────────────────
    // Índices: codigo (búsqueda), nombre (búsqueda), tipo (filtro)
    equipos: '++id, codigo, nombre, tipo, categoria, costo_renta_dia, activo',
    
    // ─────────────────────────────────────────────────────────────────
    // HERRAMIENTA (Insumos porcentuales - %MO1, %MO2, %MO3, %MO5)
    // ─────────────────────────────────────────────────────────────────
    // Índices: codigo (búsqueda), tipo (filtro)
    herramienta: '++id, codigo, nombre, tipo, porcentaje, activo',
    
    // ─────────────────────────────────────────────────────────────────
    // RELACIÓN CONCEPTO-MATERIALES (Tabla pivote)
    // ─────────────────────────────────────────────────────────────────
    // Compound index: [conceptoId+materialCodigo] para búsquedas rápidas
    conceptoMateriales: '++id, conceptoId, materialCodigo, [conceptoId+materialCodigo]',
    
    // ─────────────────────────────────────────────────────────────────
    // RELACIÓN CONCEPTO-MANO DE OBRA (Tabla pivote)
    // ─────────────────────────────────────────────────────────────────
    conceptoManoObra: '++id, conceptoId, manoObraCodigo, [conceptoId+manoObraCodigo]',
    
    // ─────────────────────────────────────────────────────────────────
    // RELACIÓN CONCEPTO-EQUIPOS (Tabla pivote)
    // ─────────────────────────────────────────────────────────────────
    conceptoEquipos: '++id, conceptoId, equipoCodigo, [conceptoId+equipoCodigo]',
    
    // ─────────────────────────────────────────────────────────────────
    // RELACIÓN CONCEPTO-HERRAMIENTA (Tabla pivote)
    // ─────────────────────────────────────────────────────────────────
    conceptoHerramienta: '++id, conceptoId, herramientaCodigo, [conceptoId+herramientaCodigo]',
    
    // ─────────────────────────────────────────────────────────────────
    // PROYECTOS (Para agrupar cotizaciones por proyecto)
    // ─────────────────────────────────────────────────────────────────
    proyectos: '++id, nombre, cliente, fecha, estado, [cliente+estado]',
    
    // ─────────────────────────────────────────────────────────────────
    // COTIZACIONES/PRESUPUESTOS
    // ─────────────────────────────────────────────────────────────────
    cotizaciones: '++id, proyectoId, conceptoId, fecha, estado, total, [proyectoId+estado]',
    
    // ─────────────────────────────────────────────────────────────────
    // CLIENTES
    // ─────────────────────────────────────────────────────────────────
    clientes: '++id, nombre, email, telefono, rfc, activo',
    
    // ─────────────────────────────────────────────────────────────────
    // CONFIGURACIÓN (Valores globales de la app)
    // ─────────────────────────────────────────────────────────────────
    configuracion: 'clave, valor',
    
    // ─────────────────────────────────────────────────────────────────
    // FACTORES DE RENDIMIENTO (Altura, clima, dificultad, etc.)
    // ─────────────────────────────────────────────────────────────────
    factoresRendimiento: '++id, tipo, nombre, valor, activo',
    
    // ─────────────────────────────────────────────────────────────────
    // CATÁLOGOS (Para importar/exportar catálogos completos)
    // ─────────────────────────────────────────────────────────────────
    catalogos: '++id, nombre, tipo, fecha, version',
    
    // ─────────────────────────────────────────────────────────────────
    // LOGS DE IMPORTACIÓN (Para tracking de importaciones)
    // ─────────────────────────────────────────────────────────────────
    importLogs: '++id, fecha, tipo, registros, exitosos, fallidos'
});

// ─────────────────────────────────────────────────────────────────────
// INICIALIZAR BASE DE DATOS
// ─────────────────────────────────────────────────────────────────────
db.on('populate', function() {
    console.log('💾 Inicializando base de datos SmartCot...');
    
    // Agregar configuración por defecto
    db.configuracion.bulkPut([
        { clave: 'version', valor: '3.0' },
        { clave: 'iva_default', valor: 16 },
        { clave: 'utilidad_default', valor: 10 },
        { clave: 'moneda', valor: 'MXN' },
        { clave: 'empresa', valor: '' },
        { clave: 'fecha_instalacion', valor: new Date().toISOString() }
    ]);
    
    // Agregar factores de rendimiento por defecto
    db.factoresRendimiento.bulkPut([
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
    
    // Agregar tipos de herramienta por defecto (%MO1, %MO2, %MO3, %MO5)
    db.herramienta.bulkPut([
        { id: 1, codigo: '%MO1', nombre: 'Herramienta Menor', tipo: 'herramienta', porcentaje: 0, activo: true },
        { id: 2, codigo: '%MO2', nombre: 'Andamios', tipo: 'andamios', porcentaje: 0, activo: true },
        { id: 3, codigo: '%MO3', nombre: 'Materiales Menores', tipo: 'materiales_menores', porcentaje: 0, activo: true },
        { id: 4, codigo: '%MO5', nombre: 'Equipo de Seguridad', tipo: 'seguridad', porcentaje: 0, activo: true }
    ]);
    
    console.log('✅ Base de datos inicializada con datos por defecto');
});

// ─────────────────────────────────────────────────────────────────────
// MANEJO DE ERRORES DE CONEXIÓN
// ─────────────────────────────────────────────────────────────────────
db.on('error', function(error) {
    console.error('❌ Error de base de datos:', error);
    
    // Si es error de versión, intentar reconstruir
    if (error.name === 'DexieError' || error.name === 'InvalidStateError') {
        console.log('🔄 Intentando reconstruir base de datos...');
        Dexie.delete('SmartCotDB').then(() => {
            console.log('✅ Base de datos reconstruida');
            location.reload();
        }).catch(rebuildError => {
            console.error('❌ No se pudo reconstruir:', rebuildError);
        });
    }
});

// ─────────────────────────────────────────────────────────────────────
// FUNCIONES DE UTILIDAD PARA LA BASE DE DATOS
// ─────────────────────────────────────────────────────────────────────
window.dbUtils = {
    // Limpiar toda la base de datos
    limpiarTodo: async function() {
        await db.conceptos.clear();
        await db.materiales.clear();
        await db.manoObra.clear();
        await db.equipos.clear();
        await db.herramienta.clear();
        await db.conceptoMateriales.clear();
        await db.conceptoManoObra.clear();
        await db.conceptoEquipos.clear();
        await db.conceptoHerramienta.clear();
        await db.proyectos.clear();
        await db.cotizaciones.clear();
        await db.clientes.clear();
        await db.factoresRendimiento.clear();
        await db.importLogs.clear();
        console.log('✅ Base de datos limpiada');
    },
    
    // Exportar toda la base de datos
    exportarTodo: async function() {
        return {
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
    }
};

// ─────────────────────────────────────────────────────────────────────
// CONECTAR A LA BASE DE DATOS
// ─────────────────────────────────────────────────────────────────────
db.open().then(function() {
    console.log('✅ SmartCotDB conectada exitosamente');
    console.log('📊 Tablas disponibles:', db.tables.map(t => t.name).join(', '));
}).catch(function(error) {
    console.error('❌ Error conectando a SmartCotDB:', error);
});

// Exportar db para uso global
window.db = db;

console.log('✅ db.schema.js listo - Versión 3.0');
