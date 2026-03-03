// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - CONVERSOR DE UNIDADES
// Basado en unidades REALES de tu Excel
// ─────────────────────────────────────────────────────────────────────

console.log('📐 unidad-converter.js cargado');

window.unidadConverter = {
    
    // ─────────────────────────────────────────────────────────────────
    // UNIDADES SEGÚN TU EXCEL
    // ─────────────────────────────────────────────────────────────────
    unidades: {
        // Cantidad
        'PZA': { nombre: 'Pieza', tipo: 'cantidad', factor: 1, simbolo: 'pza' },
        'JGO': { nombre: 'Juego', tipo: 'cantidad', factor: 1, simbolo: 'jgo' },
        'SAL': { nombre: 'Salida', tipo: 'cantidad', factor: 1, simbolo: 'sal' },
        'CIL': { nombre: 'Cilindro', tipo: 'cantidad', factor: 1, simbolo: 'cil' },
        'VIAJE': { nombre: 'Viaje', tipo: 'cantidad', factor: 1, simbolo: 'viaje' },
        
        // Longitud
        'M': { nombre: 'Metro Lineal', tipo: 'longitud', factor: 1, simbolo: 'm' },
        'ML': { nombre: 'Metro Lineal', tipo: 'longitud', factor: 1, simbolo: 'ml' },
        'KM': { nombre: 'Kilómetro', tipo: 'longitud', factor: 1000, simbolo: 'km' },
        'CM': { nombre: 'Centímetro', tipo: 'longitud', factor: 0.01, simbolo: 'cm' },
        'MM': { nombre: 'Milímetro', tipo: 'longitud', factor: 0.001, simbolo: 'mm' },
        'PIE': { nombre: 'Pie', tipo: 'longitud', factor: 0.3048, simbolo: 'pie' },
        'PULG': { nombre: 'Pulgada', tipo: 'longitud', factor: 0.0254, simbolo: '"' },
        
        // Área
        'M2': { nombre: 'Metro Cuadrado', tipo: 'area', factor: 1, simbolo: 'm²' },
        'CM2': { nombre: 'Centímetro Cuadrado', tipo: 'area', factor: 0.0001, simbolo: 'cm²' },
        'KM2': { nombre: 'Kilómetro Cuadrado', tipo: 'area', factor: 1000000, simbolo: 'km²' },
        'HA': { nombre: 'Hectárea', tipo: 'area', factor: 10000, simbolo: 'ha' },
        
        // Volumen
        'M3': { nombre: 'Metro Cúbico', tipo: 'volumen', factor: 1, simbolo: 'm³' },
        'LT': { nombre: 'Litro', tipo: 'volumen', factor: 0.001, simbolo: 'L' },
        'GAL': { nombre: 'Galón', tipo: 'volumen', factor: 0.003785, simbolo: 'gal' },
        'CM3': { nombre: 'Centímetro Cúbico', tipo: 'volumen', factor: 0.000001, simbolo: 'cm³' },
        
        // Peso
        'KG': { nombre: 'Kilogramo', tipo: 'peso', factor: 1, simbolo: 'kg' },
        'TON': { nombre: 'Tonelada', tipo: 'peso', factor: 1000, simbolo: 'ton' },
        'GR': { nombre: 'Gramo', tipo: 'peso', factor: 0.001, simbolo: 'g' },
        'LB': { nombre: 'Libra', tipo: 'peso', factor: 0.4536, simbolo: 'lb' },
        
        // Tiempo
        'HRS': { nombre: 'Hora', tipo: 'tiempo', factor: 1, simbolo: 'h' },
        'JOR': { nombre: 'Jornada (8 horas)', tipo: 'tiempo', factor: 8, simbolo: 'jor' },
        'MIN': { nombre: 'Minuto', tipo: 'tiempo', factor: 1/60, simbolo: 'min' },
        'DIA': { nombre: 'Día', tipo: 'tiempo', factor: 24, simbolo: 'día' },
        
        // Energía
        'KW/H': { nombre: 'Kilowatt-Hora', tipo: 'energia', factor: 1, simbolo: 'kWh' },
        'KWH': { nombre: 'Kilowatt-Hora', tipo: 'energia', factor: 1, simbolo: 'kWh' },
        
        // Porcentaje
        '%': { nombre: 'Porcentaje', tipo: 'porcentaje', factor: 0.01, simbolo: '%' }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CONVERTIR ENTRE UNIDADES
    // ─────────────────────────────────────────────────────────────────
    convertir: function(cantidad, unidadOrigen, unidadDestino) {
        const origen = this.unidades[unidadOrigen];
        const destino = this.unidades[unidadDestino];
        
        if (!origen) {
            console.warn('⚠️ Unidad de origen no soportada:', unidadOrigen);
            return { valor: cantidad, valido: false, error: 'Unidad de origen no válida' };
        }
        
        if (!destino) {
            console.warn('⚠️ Unidad de destino no soportada:', unidadDestino);
            return { valor: cantidad, valido: false, error: 'Unidad de destino no válida' };
        }
        
        // Verificar compatibilidad
        if (origen.tipo !== destino.tipo) {
            return {
                valor: cantidad,
                valido: false,
                error: `Incompatibilidad: ${origen.tipo} no se puede convertir a ${destino.tipo}`
            };
        }
        
        // Convertir a unidad base primero
        const enBase = cantidad * origen.factor;
        
        // Convertir a unidad destino
        const resultado = enBase / destino.factor;
        
        return {
            valor: resultado,
            valido: true,
            origen: { unidad: unidadOrigen, cantidad: cantidad, tipo: origen.tipo },
            destino: { unidad: unidadDestino, cantidad: resultado, tipo: destino.tipo },
            formula: `${cantidad} ${origen.simbolo} × ${origen.factor} ÷ ${destino.factor} = ${resultado.toFixed(4)} ${destino.simbolo}`
        };
    },
    
    // ─────────────────────────────────────────────────────────────────
    // VALIDAR COMPATIBILIDAD DE UNIDADES
    // ─────────────────────────────────────────────────────────────────
    sonCompatibles: function(unidad1, unidad2) {
        const u1 = this.unidades[unidad1];
        const u2 = this.unidades[unidad2];
        
        if (!u1 || !u2) return false;
        
        return u1.tipo === u2.tipo;
    },
    
    // ─────────────────────────────────────────────────────────────────
    // OBTENER TODAS LAS UNIDADES DE UN TIPO
    // ─────────────────────────────────────────────────────────────────
    obtenerPorTipo: function(tipo) {
        return Object.entries(this.unidades)
            .filter(([_, u]) => u.tipo === tipo)
            .map(([codigo, u]) => ({ codigo, ...u }));
    },
    
    // ─────────────────────────────────────────────────────────────────
    // NORMALIZAR UNIDAD (limpiar formato)
    // ─────────────────────────────────────────────────────────────────
    normalizar: function(unidad) {
        if (!unidad) return null;
        
        // Limpiar y estandarizar
        let normalizada = unidad.toString().trim().toUpperCase();
        
        // Mapeos comunes
        const mapeos = {
            'M2': 'M2',
            'M3': 'M3',
            'M': 'M',
            'ML': 'M',
            'METRO': 'M',
            'METROS': 'M',
            'PZA': 'PZA',
            'PIEZA': 'PZA',
            'PIEZAS': 'PZA',
            'KG': 'KG',
            'KILO': 'KG',
            'KILOS': 'KG',
            'TON': 'TON',
            'TONELADA': 'TON',
            'TONELADAS': 'TON',
            'LT': 'LT',
            'LITRO': 'LT',
            'LITROS': 'LT',
            'HRS': 'HRS',
            'HORA': 'HRS',
            'HORAS': 'HRS',
            'JOR': 'JOR',
            'JORNADA': 'JOR',
            'JORNADAS': 'JOR',
            'JGO': 'JGO',
            'JUEGO': 'JGO',
            'JUEGOS': 'JGO',
            'SAL': 'SAL',
            'SALIDA': 'SAL',
            'SALIDAS': 'SAL',
            'CIL': 'CIL',
            'CILINDRO': 'CIL',
            'CILINDROS': 'CIL',
            'KW/H': 'KW/H',
            'KWH': 'KW/H',
            'KW-H': 'KW/H',
            '%': '%',
            'PORCIENTO': '%',
            'PORCENTAJE': '%'
        };
        
        return mapeos[normalizada] || normalizada;
    },
    
    // ─────────────────────────────────────────────────────────────────
    // EXPORTAR TABLA DE UNIDADES
    // ─────────────────────────────────────────────────────────────────
    exportarTabla: function() {
        const tabla = {};
        
        Object.entries(this.unidades).forEach(([codigo, unidad]) => {
            if (!tabla[unidad.tipo]) {
                tabla[unidad.tipo] = [];
            }
            
            tabla[unidad.tipo].push({
                codigo: codigo,
                nombre: unidad.nombre,
                simbolo: unidad.simbolo,
                factor: unidad.factor
            });
        });
        
        return tabla;
    }
};

console.log('✅ unidad-converter.js listo');
