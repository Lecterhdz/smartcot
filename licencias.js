// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - SISTEMA DE LICENCIAS
// ─────────────────────────────────────────────────────────────────────

console.log('🔑 licencias.js cargado');

window.licencia = {
    
    // Planes disponibles
    PLANES: {
        DEMO: {
            nombre: 'DEMO',
            dias: 7,
            limiteConceptos: 100,
            limiteCotizaciones: 5,
            limiteClientes: 10,
            precio: 0,
            caracteristicas: [
                '100 conceptos máx.',
                '5 cotizaciones máx.',
                '10 clientes máx.',
                '7 días de uso',
                'Sin soporte'
            ]
        },
        PRO: {
            nombre: 'PRO',
            dias: 365,
            limiteConceptos: 10000,
            limiteCotizaciones: 999999,
            limiteClientes: 999999,
            precio: 599,
            caracteristicas: [
                '10,000 conceptos',
                'Cotizaciones ilimitadas',
                'Clientes ilimitados',
                '365 días de uso',
                'Soporte por email',
                'Reportes PDF',
                'Curva S'
            ]
        },
        ENTERPRISE: {
            nombre: 'ENTERPRISE',
            dias: 365,
            limiteConceptos: 999999,
            limiteCotizaciones: 999999,
            limiteClientes: 999999,
            precio: 999,
            caracteristicas: [
                'Conceptos ilimitados',
                'Cotizaciones ilimitadas',
                'Clientes ilimitados',
                '365 días de uso',
                'Soporte prioritario',
                'Reportes PDF/APU',
                'Curva S avanzada',
                'Multi-usuario (hasta 10)',
                'API access'
            ]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // GENERAR CLAVE DE LICENCIA
    // ─────────────────────────────────────────────────────────────────
    generarClave: function(plan, email) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 10);
        const planCode = plan.substring(0, 3).toUpperCase();
        
        // Formato: PLAN-EMAIL_HASH-TIMESTAMP-RANDOM
        const emailHash = this.hashEmail(email);
        const clave = `${planCode}-${emailHash}-${timestamp}-${random}`;
        
        console.log('🔑 Clave generada:', clave);
        return clave;
    },
    
    // ─────────────────────────────────────────────────────────────────
    // VALIDAR CLAVE DE LICENCIA
    // ─────────────────────────────────────────────────────────────────
    validarClave: function(clave, email) {
        try {
            if (!clave || clave.trim() === '') {
                return { valido: false, razon: 'Clave vacía' };
            }
            
            const partes = clave.split('-');
            if (partes.length !== 4) {
                return { valido: false, razon: 'Formato inválido' };
            }
            
            const [planCode, emailHash, timestamp, random] = partes;
            
            // Verificar hash del email
            const emailHashGenerado = this.hashEmail(email);
            if (emailHash !== emailHashGenerado) {
                return { valido: false, razon: 'Email no coincide' };
            }
            
            // Determinar plan
            let plan = 'DEMO';
            if (planCode === 'PRO') plan = 'PRO';
            if (planCode === 'ENT') plan = 'ENTERPRISE';
            
            // Verificar timestamp (no mayor a 1 año)
            const ahora = Date.now();
            const diferenciaDias = (ahora - parseInt(timestamp)) / (1000 * 60 * 60 * 24);
            
            if (diferenciaDias > 365) {
                return { valido: false, razon: 'Clave expirada' };
            }
            
            // Guardar licencia
            const licencia = {
                clave: clave,
                plan: plan,
                email: email,
                fechaInicio: new Date().toISOString(),
                fechaExpiracion: new Date(ahora + (this.PLANES[plan].dias * 24 * 60 * 60 * 1000)).toISOString(),
                activa: true
            };
            
            localStorage.setItem('smartcot_licencia', JSON.stringify(licencia));
            
            return { valido: true, plan: plan, licencia: licencia };
            
        } catch (error) {
            console.error('❌ Error validando licencia:', error);
            return { valido: false, razon: error.message };
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CARGAR LICENCIA ACTUAL
    // ─────────────────────────────────────────────────────────────────
    cargar: function() {
        try {
            const licenciaGuardada = localStorage.getItem('smartcot_licencia');
            
            if (!licenciaGuardada) {
                // Licencia DEMO por defecto
                const demoLicencia = {
                    plan: 'DEMO',
                    fechaInicio: new Date().toISOString(),
                    fechaExpiracion: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString(),
                    activa: true
                };
                localStorage.setItem('smartcot_licencia', JSON.stringify(demoLicencia));
                return demoLicencia;
            }
            
            const licencia = JSON.parse(licenciaGuardada);
            
            // Verificar si expiró
            const ahora = new Date();
            const expiracion = new Date(licencia.fechaExpiracion);
            
            if (ahora > expiracion) {
                licencia.activa = false;
                localStorage.setItem('smartcot_licencia', JSON.stringify(licencia));
            }
            
            return licencia;
            
        } catch (error) {
            console.error('❌ Error cargando licencia:', error);
            return null;
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // VERIFICAR LÍMITES
    // ─────────────────────────────────────────────────────────────────
    verificarLimite: async function(tipo) {
        const licencia = this.cargar();
        if (!licencia || !licencia.activa) {
            return { permitido: false, razon: 'Licencia expirada o inválida' };
        }
        
        const plan = this.PLANES[licencia.plan] || this.PLANES.DEMO;
        
        try {
            if (tipo === 'conceptos') {
                const count = await window.db.conceptos.count();
                if (count >= plan.limiteConceptos) {
                    return { 
                        permitido: false, 
                        razon: `Límite de conceptos alcanzado (${plan.limiteConceptos}). Actualiza a PRO o ENTERPRISE.` 
                    };
                }
            }
            
            if (tipo === 'cotizaciones') {
                const count = await window.db.cotizaciones.count();
                if (count >= plan.limiteCotizaciones) {
                    return { 
                        permitido: false, 
                        razon: `Límite de cotizaciones alcanzado (${plan.limiteCotizaciones}). Actualiza a PRO o ENTERPRISE.` 
                    };
                }
            }
            
            if (tipo === 'clientes') {
                const count = await window.db.clientes.count();
                if (count >= plan.limiteClientes) {
                    return { 
                        permitido: false, 
                        razon: `Límite de clientes alcanzado (${plan.limiteClientes}). Actualiza a PRO o ENTERPRISE.` 
                    };
                }
            }
            
            return { permitido: true };
            
        } catch (error) {
            console.error('❌ Error verificando límite:', error);
            return { permitido: true }; // Permitir por defecto si hay error
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CERRAR LICENCIA
    // ─────────────────────────────────────────────────────────────────
    cerrar: function() {
        localStorage.removeItem('smartcot_licencia');
        window.location.reload();
    },
    
    // ─────────────────────────────────────────────────────────────────
    // HASH DE EMAIL (para validar)
    // ─────────────────────────────────────────────────────────────────
    hashEmail: function(email) {
        let hash = 0;
        for (let i = 0; i < email.length; i++) {
            const char = email.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36).toUpperCase().substring(0, 8);
    },
    
    // ─────────────────────────────────────────────────────────────────
    // OBTENER INFORMACIÓN DE LICENCIA PARA UI
    // ─────────────────────────────────────────────────────────────────
    obtenerInfo: function() {
        const licencia = this.cargar();
        if (!licencia) {
            return { plan: 'DEMO', activa: false, diasRestantes: 0 };
        }
        
        const ahora = new Date();
        const expiracion = new Date(licencia.fechaExpiracion);
        const diasRestantes = Math.ceil((expiracion - ahora) / (1000 * 60 * 60 * 24));
        
        return {
            plan: licencia.plan,
            activa: licencia.activa,
            diasRestantes: diasRestantes,
            fechaExpiracion: expiracion.toLocaleDateString('es-MX')
        };
    }
};

console.log('✅ licencias.js listo');
