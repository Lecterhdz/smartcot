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
    // CARGAR LICENCIA (CORREGIDO - PROPIEDADES COMPATIBLES)
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
                console.log('📋 Licencia DEMO creada:', licenciaDemo);
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
            
            console.log('📋 Licencia cargada:', licencia);
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
            var expiracion = new Date(ahora.getTime() + (plan.dias * 24 * 60 * 60 * 1000));
            
            var licencia = {
                tipo: planCode,
                activa: true,
                expirada: false,
                expiracion: expiracion.toISOString(),
                diasRestantes: plan.dias,
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
            return { permitido: true };
        }
        
        if (tipo === 'cotizaciones') {
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
    },
    
    // ─────────────────────────────────────────────────────────────────
    // COMPRAR PLAN (para los botones de la pantalla de licencia)
    // ─────────────────────────────────────────────────────────────────
    comprarPlan: function(plan) {
        var info = this.PLANES[plan];
        var mensaje = 'Para adquirir el plan ' + plan + ':\n\n' +
            '💰 Precio: $' + info.precio + ' MXN\n' +
            '📅 Duración: ' + info.dias + ' días\n\n' +
            'Contacta a lecterhdz@gmail.com para generar tu clave de licencia.\n\n' +
            'O genera tu clave en: https://lecterhdz.github.io/smartcot/generador-licencias.html';
        alert(mensaje);
    }
};

console.log('✅ licencias.js listo');
