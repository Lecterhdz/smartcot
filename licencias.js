// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - SISTEMA DE LICENCIAS (CORREGIDO)
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
            limiteClientes: 10
        },
        PRO: {
            nombre: 'PRO',
            dias: 365,
            limiteConceptos: 10000,
            limiteCotizaciones: 999999,
            limiteClientes: 999999
        },
        ENTERPRISE: {
            nombre: 'ENTERPRISE',
            dias: 365,
            limiteConceptos: 999999,
            limiteCotizaciones: 999999,
            limiteClientes: 999999
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CARGAR LICENCIA (CORREGIDO)
    // ─────────────────────────────────────────────────────────────────
    cargar: function() {
        try {
            const licenciaGuardada = localStorage.getItem('smartcot_licencia');
            
            if (!licenciaGuardada) {
                // Crear licencia DEMO por defecto
                const ahora = new Date();
                const expiracion = new Date(ahora.getTime() + (7 * 24 * 60 * 60 * 1000));
                
                const licenciaDemo = {
                    tipo: 'DEMO',
                    activa: true,
                    expirada: false,
                    fechaInicio: ahora.toISOString(),
                    fechaExpiracion: expiracion.toISOString(),
                    diasRestantes: 7
                };
                
                localStorage.setItem('smartcot_licencia', JSON.stringify(licenciaDemo));
                console.log('📋 Licencia DEMO creada:', licenciaDemo);
                return licenciaDemo;
            }
            
            const licencia = JSON.parse(licenciaGuardada);
            
            // Verificar si expiró
            const ahora = new Date();
            const expiracion = new Date(licencia.fechaExpiracion);
            const diasRestantes = Math.ceil((expiracion - ahora) / (1000 * 60 * 60 * 24));
            
            licencia.expirada = ahora > expiracion;
            licencia.activa = !licencia.expirada;
            licencia.diasRestantes = diasRestantes > 0 ? diasRestantes : 0;
            
            if (licencia.expirada) {
                localStorage.setItem('smartcot_licencia', JSON.stringify(licencia));
            }
            
            console.log('📋 Licencia cargada:', licencia);
            return licencia;
            
        } catch (error) {
            console.error('❌ Error cargando licencia:', error);
            return null;
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // VERIFICAR LÍMITE
    // ─────────────────────────────────────────────────────────────────
    verificarLimite: async function(tipo) {
        const licencia = this.cargar();
        
        if (!licencia || !licencia.activa) {
            return { 
                permitido: false, 
                razon: 'Licencia expirada. Por favor renueva tu licencia.' 
            };
        }
        
        const plan = this.PLANES[licencia.tipo] || this.PLANES.DEMO;
        
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
            
            return { permitido: true };
            
        } catch (error) {
            console.error('❌ Error verificando límite:', error);
            return { permitido: true };
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // ACTIVAR LICENCIA
    // ─────────────────────────────────────────────────────────────────
    activar: function(clave, email) {
        try {
            // Validar formato de clave (ej: PRO-XXXX-XXXX-XXXX)
            const partes = clave.split('-');
            if (partes.length < 2) {
                return { valido: false, razon: 'Clave inválida' };
            }
            
            const planTipo = partes[0].toUpperCase();
            if (!this.PLANES[planTipo]) {
                return { valido: false, razon: 'Plan no reconocido' };
            }
            
            const plan = this.PLANES[planTipo];
            const ahora = new Date();
            const expiracion = new Date(ahora.getTime() + (plan.dias * 24 * 60 * 60 * 1000));
            
            const licencia = {
                tipo: planTipo,
                activa: true,
                expirada: false,
                fechaInicio: ahora.toISOString(),
                fechaExpiracion: expiracion.toISOString(),
                diasRestantes: plan.dias,
                email: email,
                clave: clave
            };
            
            localStorage.setItem('smartcot_licencia', JSON.stringify(licencia));
            
            console.log('✅ Licencia activada:', licencia);
            return { valido: true, licencia: licencia };
            
        } catch (error) {
            console.error('❌ Error activando licencia:', error);
            return { valido: false, razon: error.message };
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CERRAR LICENCIA
    // ─────────────────────────────────────────────────────────────────
    cerrar: function() {
        localStorage.removeItem('smartcot_licencia');
        // Redirigir a página de login o landing
        window.location.href = 'index.html';
        setTimeout(() => {
            window.location.reload();
        }, 100);
    }
};

console.log('✅ licencias.js listo');
