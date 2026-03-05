// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - AUTENTICACIÓN (CON LICENCIAS)
// ─────────────────────────────────────────────────────────────────────

console.log('🔐 auth.js cargado');

window.auth = {
    
    // ─────────────────────────────────────────────────────────────────
    // INICIAR SESIÓN
    // ─────────────────────────────────────────────────────────────────
    iniciarSesion: async function(email, password) {
        try {
            console.log('🔐 Intentando iniciar sesión...', email);
            
            // Validar licencia primero
            const licenciaInfo = window.licencia.obtenerInfo();
            
            if (!licenciaInfo.activa) {
                return { 
                    exito: false, 
                    mensaje: 'Licencia expirada. Por favor renueva tu licencia.' 
                };
            }
            
            // Simular autenticación (puedes integrar Firebase aquí)
            const usuario = {
                email: email,
                nombre: email.split('@')[0],
                plan: licenciaInfo.plan
            };
            
            localStorage.setItem('smartcot_usuario', JSON.stringify(usuario));
            
            console.log('✅ Sesión iniciada:', usuario);
            return { exito: true, usuario: usuario };
            
        } catch (error) {
            console.error('❌ Error iniciando sesión:', error);
            return { exito: false, mensaje: error.message };
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CERRAR SESIÓN
    // ─────────────────────────────────────────────────────────────────
    cerrarSesion: function() {
        localStorage.removeItem('smartcot_usuario');
        window.location.reload();
    },
    
    // ─────────────────────────────────────────────────────────────────
    // VERIFICAR SESIÓN ACTIVA
    // ─────────────────────────────────────────────────────────────────
    verificarSesion: function() {
        const usuario = localStorage.getItem('smartcot_usuario');
        return usuario ? JSON.parse(usuario) : null;
    },
    
    // ─────────────────────────────────────────────────────────────────
    // VERIFICAR LICENCIA AL INICIAR
    // ─────────────────────────────────────────────────────────────────
    verificarLicencia: function() {
        const licenciaInfo = window.licencia.obtenerInfo();
        
        if (!licenciaInfo.activa) {
            return {
                valida: false,
                mensaje: `Licencia ${licenciaInfo.plan} expirada el ${licenciaInfo.fechaExpiracion}`,
                plan: licenciaInfo.plan
            };
        }
        
        if (licenciaInfo.diasRestantes <= 7) {
            return {
                valida: true,
                advertencia: true,
                mensaje: `Tu licencia ${licenciaInfo.plan} expira en ${licenciaInfo.diasRestantes} días`,
                plan: licenciaInfo.plan
            };
        }
        
        return {
            valida: true,
            plan: licenciaInfo.plan,
            diasRestantes: licenciaInfo.diasRestantes
        };
    }
};

console.log('✅ auth.js listo');
