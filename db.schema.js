// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - ESQUEMA DE BASE DE DATOS (COMPLETO Y CORREGIDO)
// ─────────────────────────────────────────────────────────────────────

console.log('💾 db.schema.js cargado');

const db = new Dexie('SmartCotDB');

// ─────────────────────────────────────────────────────────────────────
// VERSIÓN 3 - TODAS LAS TABLAS NECESARIAS
// ─────────────────────────────────────────────────────────────────────
db.version(3).stores({
    // Conceptos (APU completos)
    conceptos: '++id, codigo, categoria, subcategoria, unidad, activo',
    
    // Materiales
    materiales: '++id, codigo, nombre, categoria, unidad, precio_base, activo',
    
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
// INICIALIZAR DATOS POR DEFECTO
// ─────────────────────────────────────────────────────────────────────
db.on('populate', function() {
    console.log('💾 Inicializando SmartCotDB...');
    
    // Configuración por defecto
    db.configuracion.bulkPut([
        { clave: 'version', valor: '3.0' },
        { clave: 'iva_default', valor: 16 },
        { clave: 'utilidad_default', valor: 10 },
        { clave: 'moneda', valor: 'MXN' }
    ]);
    
    // Herramienta por defecto (%MO1, %MO2, %MO3, %MO5)
    db.herramienta.bulkPut([
        { id: 1, codigo: '%MO1', nombre: 'HERRAMIENTA MENOR', tipo: 'herramienta', activo: true },
        { id: 2, codigo: '%MO2', nombre: 'ANDAMIOS', tipo: 'andamios', activo: true },
        { id: 3, codigo: '%MO3', nombre: 'MATERIALES MENORES', tipo: 'materiales_menores', activo: true },
        { id: 4, codigo: '%MO5', nombre: 'EQUIPO DE SEGURIDAD', tipo: 'seguridad', activo: true }
    ]);
    
    // Factores de rendimiento por defecto
    db.factoresRendimiento.bulkPut([
        { id: 1, tipo: 'altura', nombre: 'Trabajo en altura >3m', valor: 1.15, activo: true },
        { id: 2, tipo: 'altura', nombre: 'Trabajo en altura >5m', valor: 1.25, activo: true },
        { id: 3, tipo: 'clima', nombre: 'Clima extremo calor', valor: 1.10, activo: true },
        { id: 4, tipo: 'dificultad', nombre: 'Espacio confinado', valor: 1.20, activo: true },
        { id: 5, tipo: 'desperdicio', nombre: 'Desperdicio estándar', valor: 1.05, activo: true }
    ]);
    
    console.log('✅ SmartCotDB inicializada');
});

// ─────────────────────────────────────────────────────────────────────
// CONECTAR Y VERIFICAR
// ─────────────────────────────────────────────────────────────────────
db.open().then(function() {
    console.log('✅ SmartCotDB conectada');
    console.log('📊 Tablas disponibles:', db.tables.map(t => t.name).join(', '));
    
    // Exportar db globalmente
    window.db = db;
}).catch(function(error) {
    console.error('❌ Error conectando a SmartCotDB:', error);
});

console.log('✅ db.schema.js listo');
