// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - SISTEMA DE LICENCIAS (DEFINITIVO)
// ─────────────────────────────────────────────────────────────────────

console.log('🔑 licencias.js cargado');

window.licencia = {
    
    // Planes disponibles
    PLANES: {
        DEMO: {
            nombre: 'DEMO',
            precioMensual: 0,
            precioAnual: 0,
            duracion: 7,
            limites: {
                conceptos: 50,
                cotizaciones: 5,
                clientes: 3
            },
            caracteristicas: [
                '50 conceptos',
                '5 cotizaciones',
                '3 clientes',
                '7 días de uso',
                'Sin soporte'
            ]
        },
        PRO: {
            nombre: 'PRO',
            precioMensual: 79,
            precioAnual: 599,
            duracion: 365,
            limites: {
                conceptos: 10000,
                cotizaciones: 999999,
                clientes: 999999
            },
            caracteristicas: [
                '10,000 conceptos',
                'Cotizaciones ilimitadas',
                'Clientes ilimitados',
                'Reportes PDF',
                'Curva S básica',
                'Factores de ajuste',
                'Soporte por email'
            ],
            ahorro: 349 // $79*12 - $599 = $349 de ahorro
        },
        ENTERPRISE: {
            nombre: 'ENTERPRISE',
            precioMensual: 129,
            precioAnual: 999,
            duracion: 365,
            limites: {
                conceptos: 999999,
                cotizaciones: 999999,
                clientes: 999999
            },
            caracteristicas: [
                'Conceptos ilimitados',
                'Todo lo de PRO',
                'Curva S avanzada (EVM)',
                'Reportes APU',
                'Marca personalizada',
                'Plantillas guardadas',
                'Histórico de precios',
                'Soporte prioritario 24hrs'
            ],
            ahorro: 549 // $129*12 - $999 = $549 de ahorro
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
    // VERIFICAR LÍMITES
    // ─────────────────────────────────────────────────────────────────
    verificarLimite: function(tipo) {
        var licencia = this.cargar();
        
        if (!licencia || !licencia.activa) {
            return { 
                permitido: false, 
                razon: 'Licencia expirada. Por favor renueva tu licencia.' 
            };
        }
        
        var plan = this.PLANES[licencia.tipo] || this.PLANES.DEMO;
        
        if (tipo === 'conceptos') {
            return { permitido: true, limite: plan.limites.conceptos };
        }
        
        if (tipo === 'cotizaciones') {
            return { permitido: true, limite: plan.limites.cotizaciones };
        }
        
        if (tipo === 'clientes') {
            return { permitido: true, limite: plan.limites.clientes };
        }
        
        return { permitido: true };
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
