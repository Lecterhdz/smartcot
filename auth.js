// ─────────────────────────────────────────────────────────────────────
// SMARTCOT - SISTEMA DE LICENCIAS
// ─────────────────────────────────────────────────────────────────────

console.log('🔐 auth.js cargado');

window.licencia = {
    actual: null,

    // Validar licencia
    validar: async function(clave) {
        // Licencias de prueba (en producción, validar contra Firebase)
        const licenciasValidas = {
            'SMARTCOT-DEMO-2026': { tipo: 'DEMO', dias: 7, cotizacionesLimite: 5 },
            'SMARTCOT-PRO-2026': { tipo: 'PROFESIONAL', dias: 365, cotizacionesLimite: 9999 },
            'SMARTCOT-EMP-2026': { tipo: 'EMPRESA', dias: 365, cotizacionesLimite: 9999 }
        };

        const licenciaData = licenciasValidas[clave.toUpperCase()];
        
        if (!licenciaData) {
            return { valido: false, error: 'Clave inválida' };
        }

        const expiracion = new Date();
        expiracion.setDate(expiracion.getDate() + licenciaData.dias);

        this.actual = {
            clave: clave,
            tipo: licenciaData.tipo,
            expiracion: expiracion.toISOString(),
            cotizacionesLimite: licenciaData.cotizacionesLimite
        };

        // Guardar en localStorage
        localStorage.setItem('smartcot_licencia', JSON.stringify(this.actual));

        return { valido: true, ...this.actual };
    },

    // Cargar licencia guardada
    cargar: function() {
        const guardada = localStorage.getItem('smartcot_licencia');
        if (guardada) {
            this.actual = JSON.parse(guardada);
            
            // Verificar expiración
            if (new Date() > new Date(this.actual.expiracion)) {
                this.actual = null;
                localStorage.removeItem('smartcot_licencia');
                return { expirada: true };
            }
        }
        return this.actual;
    },

    // Verificar límite de cotizaciones
    verificarLimite: async function() {
        if (!this.actual) return { permitido: false, razon: 'Sin licencia' };
        
        if (this.actual.tipo === 'DEMO') {
            const cotizaciones = await dbCotizaciones.contar();
            if (cotizaciones >= this.actual.cotizacionesLimite) {
                return { permitido: false, razon: 'Límite DEMO alcanzado (' + this.actual.cotizacionesLimite + ')' };
            }
        }
        
        return { permitido: true };
    },

    // Cerrar sesión
    cerrar: function() {
        this.actual = null;
        localStorage.removeItem('smartcot_licencia');
        window.location.href = 'login.html';
    }
};

console.log('✅ auth.js listo');