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
            precio: 0
        },
        PRO: {
            nombre: 'PRO',
            dias: 365,
            limiteConceptos: 10000,
            limiteCotizaciones: 999999,
            limiteClientes: 999999,
            precio: 599
        },
        ENTERPRISE: {
            nombre: 'ENTERPRISE',
            dias: 365,
            limiteConceptos: 999999,
            limiteCotizaciones: 999999,
            limiteClientes: 999999,
            precio: 999
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // GENERAR CLAVE DE LICENCIA
    // ─────────────────────────────────────────────────────────────────
    generarClave: function(plan, email) {
        var timestamp = Date.now();
        var random = Math.random().toString(36).substring(2, 10).toUpperCase();
        var planCode = plan.substring(0, 3).toUpperCase();
        var emailHash = this.hashEmail(email);
        
        // Formato: PLAN-EMAIL_HASH-TIMESTAMP-RANDOM
        var clave = planCode + '-' + emailHash + '-' + timestamp + '-' + random;
        
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
            
            var partes = clave.split('-');
            if (partes.length !== 4) {
                return { valido: false, razon: 'Formato inválido' };
            }
            
            var planCode = partes[0];
            var emailHash = partes[1];
            var timestamp = partes[2];
            var random = partes[3];
            
            // Verificar hash del email
            var emailHashGenerado = this.hashEmail(email);
            if (emailHash !== emailHashGenerado) {
                return { valido: false, razon: 'Email no coincide' };
            }
            
            // Determinar plan
            var plan = 'DEMO';
            if (planCode === 'PRO') plan = 'PRO';
            if (planCode === 'ENT') plan = 'ENTERPRISE';
            
            // Verificar timestamp (no mayor a 1 año)
            var ahora = Date.now();
            var diferenciaDias = (ahora - parseInt(timestamp)) / (1000 * 60 * 60 * 24);
            
            if (diferenciaDias > 365) {
                return { valido: false, razon: 'Clave expirada' };
            }
            
            // Guardar licencia
            var licencia = {
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
            var licenciaGuardada = localStorage.getItem('smartcot_licencia');
            
            if (!licenciaGuardada) {
                // Licencia DEMO por defecto
                var ahora = new Date();
                var expiracion = new Date(ahora.getTime() + (7 * 24 * 60 * 60 * 1000));
                
                var demoLicencia = {
                    plan: 'DEMO',
                    fechaInicio: ahora.toISOString(),
                    fechaExpiracion: expiracion.toISOString(),
                    activa: true
                };
                localStorage.setItem('smartcot_licencia', JSON.stringify(demoLicencia));
                return demoLicencia;
            }
            
            var licencia = JSON.parse(licenciaGuardada);
            
            // Verificar si expiró
            var ahora = new Date();
            var expiracion = new Date(licencia.fechaExpiracion);
            
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
    verificarLimite: function(tipo) {
        var licencia = this.cargar();
        
        if (!licencia || !licencia.activa) {
            return { 
                permitido: false, 
                razon: 'Licencia expirada. Por favor renueva tu licencia.' 
            };
        }
        
        var plan = this.PLANES[licencia.plan] || this.PLANES.DEMO;
        
        if (tipo === 'conceptos') {
            // Verificar cuando se intente importar
            return { permitido: true };
        }
        
        if (tipo === 'cotizaciones') {
            // Verificar cuando se guarde cotización
            return { permitido: true };
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
    // HASH DE EMAIL (para validar)
    // ─────────────────────────────────────────────────────────────────
    hashEmail: function(email) {
        var hash = 0;
        for (var i = 0; i < email.length; i++) {
            var char = email.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36).toUpperCase().substring(0, 8);
    },
    
    // ─────────────────────────────────────────────────────────────────
    // OBTENER INFORMACIÓN DE LICENCIA PARA UI
    // ─────────────────────────────────────────────────────────────────
    obtenerInfo: function() {
        var licencia = this.cargar();
        
        if (!licencia) {
            return { plan: 'DEMO', activa: false, diasRestantes: 0 };
        }
        
        var ahora = new Date();
        var expiracion = new Date(licencia.fechaExpiracion);
        var diferencia = expiracion - ahora;
        var diasRestantes = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
        
        return {
            plan: licencia.plan,
            activa: licencia.activa,
            diasRestantes: diasRestantes > 0 ? diasRestantes : 0,
            fechaExpiracion: expiracion.toLocaleDateString('es-MX')
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
    },

    // ─────────────────────────────────────────────────────────────────
    // COMPRAR PLAN (para los botones de la pantalla de licencia)
    // ─────────────────────────────────────────────────────────────────
    comprarPlan: function(plan) {
        var info = this.PLANES[plan];
        var mensaje = 'Para adquirir el plan ' + plan + ':\n\n' +
            '💰 Precio: $' + info.precio + ' MXN\n' +
            '📅 Duración: ' + info.dias + ' días\n\n' +
            'Contacta a ventas@smartcot.com para generar tu clave de licencia.';
        
        alert(mensaje);
    }
    
};

console.log('✅ licencias.js listo');
