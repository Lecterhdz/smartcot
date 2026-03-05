// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - SISTEMA DE LICENCIAS (CON LÍMITES REALES)
// ─────────────────────────────────────────────────────────────────────

console.log('🔑 licencias.js cargado');

window.licencia = {
    
    // Planes disponibles
    PLANES: {
        DEMO: {
            nombre: 'DEMO',
            precio: 0,
            duracion: 7,
            limiteConceptos: 50,
            limiteCotizaciones: 5,
            limiteClientes: 3,
            curvaS: false,
            reportesPDF: false
        },
        PRO: {
            nombre: 'PRO',
            precio: 599,
            duracion: 365,
            limiteConceptos: 10000,
            limiteCotizaciones: 999999,
            limiteClientes: 999999,
            curvaS: true,
            reportesPDF: true
        },
        ENTERPRISE: {
            nombre: 'ENTERPRISE',
            precio: 999,
            duracion: 365,
            limiteConceptos: 999999,
            limiteCotizaciones: 999999,
            limiteClientes: 999999,
            curvaS: true,
            reportesPDF: true
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CARGAR LICENCIA
    // ─────────────────────────────────────────────────────────────────
    cargar: function() {
        try {
            var licenciaGuardada = localStorage.getItem('smartcot_licencia');
            
            if (!licenciaGuardada) {
                // Crear licencia DEMO por defecto
                var ahora = new Date();
                var expiracion = new Date(ahora.getTime() + (7 * 24 * 60 * 60 * 1000));
                
                var licenciaDemo = {
                    tipo: 'DEMO',
                    activa: true,
                    expirada: false,
                    expiracion: expiracion.toISOString(),
                    diasRestantes: 7
                };
                
                localStorage.setItem('smartcot_licencia', JSON.stringify(licenciaDemo));
                console.log('📋 Licencia DEMO creada');
                return licenciaDemo;
            }
            
            var licencia = JSON.parse(licenciaGuardada);
            
            // Verificar si expiró
            var ahora = new Date();
            var expiracion = new Date(licencia.expiracion);
            var diferencia = expiracion - ahora;
            var diasRestantes = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
            
            licencia.expirada = ahora > expiracion;
            licencia.activa = !licencia.expirada;
            licencia.diasRestantes = diasRestantes > 0 ? diasRestantes : 0;
            
            if (licencia.expirada) {
                localStorage.setItem('smartcot_licencia', JSON.stringify(licencia));
            }
            
            console.log('📋 Licencia cargada:', licencia.tipo);
            return licencia;
            
        } catch (error) {
            console.error('❌ Error cargando licencia:', error);
            return null;
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // VERIFICAR LÍMITES (CORREGIDO - CON VERIFICACIÓN REAL EN DB)
    // ─────────────────────────────────────────────────────────────────
    verificarLimite: async function(tipo) {
        var licencia = this.cargar();
        
        if (!licencia || !licencia.activa) {
            return { 
                permitido: false, 
                razon: 'Licencia expirada. Por favor renueva tu licencia.' 
            };
        }
        
        var plan = this.PLANES[licencia.tipo] || this.PLANES.DEMO;
        
        try {
            // Verificar que window.db exista
            if (!window.db) {
                console.warn('⚠️ DB no disponible, permitiendo por defecto');
                return { permitido: true };
            }
            
            if (tipo === 'conceptos') {
                var count = await window.db.conceptos.count();
                console.log('📊 Conceptos en BD:', count, 'Límite:', plan.limiteConceptos);
                if (count >= plan.limiteConceptos) {
                    return { 
                        permitido: false, 
                        razon: 'Límite de conceptos alcanzado (' + count + '/' + plan.limiteConceptos + '). Actualiza a PRO para tener hasta 10,000 conceptos.',
                        actual: count,
                        limite: plan.limiteConceptos
                    };
                }
                return { permitido: true, actual: count, limite: plan.limiteConceptos };
            }
            
            if (tipo === 'cotizaciones') {
                var count = await window.db.cotizaciones.count();
                console.log('📊 Cotizaciones en BD:', count, 'Límite:', plan.limiteCotizaciones);
                if (count >= plan.limiteCotizaciones) {
                    return { 
                        permitido: false, 
                        razon: 'Límite de cotizaciones alcanzado (' + count + '/' + plan.limiteCotizaciones + '). Actualiza a PRO para cotizaciones ilimitadas.',
                        actual: count,
                        limite: plan.limiteCotizaciones
                    };
                }
                return { permitido: true, actual: count, limite: plan.limiteCotizaciones };
            }
            
            if (tipo === 'clientes') {
                var count = await window.db.clientes.count();
                console.log('📊 Clientes en BD:', count, 'Límite:', plan.limiteClientes);
                if (count >= plan.limiteClientes) {
                    return { 
                        permitido: false, 
                        razon: 'Límite de clientes alcanzado (' + count + '/' + plan.limiteClientes + '). Actualiza a PRO para clientes ilimitados.',
                        actual: count,
                        limite: plan.limiteClientes
                    };
                }
                return { permitido: true, actual: count, limite: plan.limiteClientes };
            }
            
            if (tipo === 'curvaS') {
                if (!plan.curvaS) {
                    return { 
                        permitido: false, 
                        razon: 'Curva S no disponible en plan ' + plan.nombre + '. Actualiza a PRO para acceder.'
                    };
                }
                return { permitido: true };
            }
            
            if (tipo === 'reportesPDF') {
                if (!plan.reportesPDF) {
                    return { 
                        permitido: false, 
                        razon: 'Reportes PDF no disponibles en plan ' + plan.nombre + '. Actualiza a PRO para acceder.'
                    };
                }
                return { permitido: true };
            }
            
            if (tipo === 'importar') {
                if (!plan.importar) {
                    return { 
                        permitido: false, 
                        razon: 'Importación de datos no disponible en plan ' + plan.nombre + '. Actualiza a PRO para acceder.'
                    };
                }
                return { permitido: true };
            }
            
            if (tipo === 'factoresAjuste') {
                if (!plan.factoresAjuste) {
                    return { 
                        permitido: false, 
                        razon: 'Factores de ajuste no disponibles en plan ' + plan.nombre + '. Actualiza a PRO para acceder.'
                    };
                }
                return { permitido: true };
            }
            
            return { permitido: true };
            
        } catch (error) {
            console.error('❌ Error verificando límite:', error);
            return { permitido: true };
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // VALIDAR CLAVE DE LICENCIA
    // ─────────────────────────────────────────────────────────────────
    validarClave: function(clave, email) {
        try {
            if (!clave || clave.trim() === '') {
                return { valido: false, razon: 'Clave vacía' };
            }
            
            var partes = clave.split('-');
            if (partes.length < 2) {
                return { valido: false, razon: 'Formato inválido' };
            }
            
            var planCode = partes[0].toUpperCase();
            if (!this.PLANES[planCode]) {
                return { valido: false, razon: 'Plan no reconocido' };
            }
            
            var plan = this.PLANES[planCode];
            var ahora = new Date();
            var expiracion = new Date(ahora.getTime() + (plan.duracion * 24 * 60 * 60 * 1000));
            
            var licencia = {
                tipo: planCode,
                activa: true,
                expirada: false,
                expiracion: expiracion.toISOString(),
                diasRestantes: plan.duracion,
                email: email,
                clave: clave
            };
            
            localStorage.setItem('smartcot_licencia', JSON.stringify(licencia));
            
            console.log('✅ Licencia activada:', licencia);
            return { valido: true, plan: planCode, licencia: licencia };
            
        } catch (error) {
            console.error('❌ Error validando licencia:', error);
            return { valido: false, razon: error.message };
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
    // OBTENER INFORMACIÓN DE LICENCIA PARA UI
    // ─────────────────────────────────────────────────────────────────
    obtenerInfo: function() {
        var licencia = this.cargar();
        
        if (!licencia) {
            return { plan: 'DEMO', activa: false, diasRestantes: 0 };
        }
        
        return {
            plan: licencia.tipo || 'DEMO',
            activa: licencia.activa,
            diasRestantes: licencia.diasRestantes || 0,
            fechaExpiracion: licencia.expiracion ? new Date(licencia.expiracion).toLocaleDateString('es-MX') : 'N/A'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────
    // ACTIVAR LICENCIA DESDE UI
    // ─────────────────────────────────────────────────────────────────
    activarDesdeUI: function() {
        var email = document.getElementById('licencia-email').value.trim();
        var clave = document.getElementById('licencia-clave').value.trim();
        
        if (!email || !clave) {
            if (window.app) {
                window.app.notificacion('⚠️ Completa email y clave', 'error');
            }
            return;
        }
        
        var resultado = this.validarClave(clave, email);
        
        if (resultado.valido) {
            if (window.app) {
                window.app.notificacion('✅ Licencia ' + resultado.plan + ' activada exitosamente', 'exito');
                window.app.actualizarInfoLicencia(resultado.licencia);
            }
            
            // Cerrar modal si existe
            var modal = document.getElementById('modal-licencia');
            if (modal) {
                modal.style.display = 'none';
            }
            
            // Recargar para aplicar cambios
            setTimeout(function() {
                window.location.reload();
            }, 2000);
        } else {
            if (window.app) {
                window.app.notificacion('❌ ' + resultado.razon, 'error');
            }
        }
    }
};

console.log('✅ licencias.js listo');
