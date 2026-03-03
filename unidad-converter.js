// ─────────────────────────────────────────────────────────────────────
// SMARTCOT - CONVERTIDOR DE UNIDADES (Basado en tu Excel real)
// ─────────────────────────────────────────────────────────────────────

window.unidadConverter = {
    
    // Unidades según tu Excel
    unidades: {
        'PZA': { nombre: 'Pieza', tipo: 'cantidad', factor: 1 },
        'M': { nombre: 'Metro Lineal', tipo: 'longitud', factor: 1 },
        'M2': { nombre: 'Metro Cuadrado', tipo: 'area', factor: 1 },
        'M3': { nombre: 'Metro Cúbico', tipo: 'volumen', factor: 1 },
        'KG': { nombre: 'Kilogramo', tipo: 'peso', factor: 1 },
        'TON': { nombre: 'Tonelada', tipo: 'peso', factor: 1000 },
        'LT': { nombre: 'Litro', tipo: 'volumen', factor: 1 },
        'JGO': { nombre: 'Juego', tipo: 'cantidad', factor: 1 },
        'SAL': { nombre: 'Salida', tipo: 'cantidad', factor: 1 },
        'HRS': { nombre: 'Hora', tipo: 'tiempo', factor: 1 },
        'JOR': { nombre: 'Jornada (8 horas)', tipo: 'tiempo', factor: 8 },
        'CIL': { nombre: 'Cilindro', tipo: 'cantidad', factor: 1 },
        'VIAJE': { nombre: 'Viaje', tipo: 'cantidad', factor: 1 },
        'JGO': { nombre: 'Juego', tipo: 'cantidad', factor: 1 }
    },
    
    // Convertir entre unidades
    convertir: function(cantidad, unidadOrigen, unidadDestino) {
        const origen = this.unidades[unidadOrigen];
        const destino = this.unidades[unidadDestino];
        
        if (!origen || !destino) {
            console.warn('⚠️ Unidad no soportada:', unidadOrigen, 'o', unidadDestino);
            return cantidad;
        }
        
        // Convertir a unidad base primero
        const enBase = cantidad * origen.factor;
        
        // Convertir a unidad destino
        return enBase / destino.factor;
    },
    
    // Validar compatibilidad de unidades
    sonCompatibles: function(unidad1, unidad2) {
        const u1 = this.unidades[unidad1];
        const u2 = this.unidades[unidad2];
        
        if (!u1 || !u2) return false;
        
        return u1.tipo === u2.tipo;
    },
    
    // Obtener todas las unidades de un tipo
    obtenerPorTipo: function(tipo) {
        return Object.entries(this.unidades)
            .filter(([_, u]) => u.tipo === tipo)
            .map(([codigo, u]) => ({ codigo, ...u }));
    }
};

console.log('✅ unidad-converter.js listo');
