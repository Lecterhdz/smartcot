// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - UTILIDADES GENERALES
// ─────────────────────────────────────────────────────────────────────

console.log('🛠️ utils.js cargado');

window.utils = {
    // Generar ID único
    generarId: function() {
        return 'ID-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    },

    // Formatear fecha
    formatearFecha: function(fecha) {
        return new Date(fecha).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // Formatear moneda
    formatearMoneda: function(cantidad) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(cantidad);
    },

    // Formatear porcentaje
    formatearPorcentaje: function(valor) {
        return valor.toFixed(2) + '%';
    },

    // Validar email
    validarEmail: function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Validar teléfono
    validarTelefono: function(telefono) {
        const re = /^\d{10}$/;
        return re.test(telefono.replace(/\D/g, ''));
    },

    // Limpiar texto
    limpiarTexto: function(texto) {
        return texto?.trim().replace(/\s+/g, ' ') || '';
    },

    // Capitalizar primera letra
    capitalizar: function(texto) {
        return texto?.charAt(0).toUpperCase() + texto?.slice(1).toLowerCase() || '';
    },

    // Truncar texto
    truncarTexto: function(texto, longitud) {
        if (!texto) return '';
        if (texto.length <= longitud) return texto;
        return texto.substring(0, longitud) + '...';
    },

    // Descargar archivo
    descargarArchivo: function(contenido, nombre, tipo = 'text/plain') {
        const blob = new Blob([contenido], { type: tipo });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        a.click();
        URL.revokeObjectURL(url);
    },

    // Mostrar notificación
    notificacion: function(mensaje, tipo = 'info') {
        const colores = {
            info: '#2196F3',
            exito: '#4CAF50',
            error: '#f44336',
            advertencia: '#FF9800'
        };

        const div = document.createElement('div');
        div.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colores[tipo] || colores.info};
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        div.textContent = mensaje;
        document.body.appendChild(div);

        setTimeout(() => {
            div.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => div.remove(), 300);
        }, 3000);
    },

    // Confirmar acción
    confirmar: function(mensaje) {
        return confirm(mensaje);
    },

    // Esperar (delay)
    esperar: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Detectar móvil
    esMovil: function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    // Copiar al portapapeles
    copiarPortapapeles: function(texto) {
        navigator.clipboard.writeText(texto).then(() => {
            this.notificacion('✅ Copiado al portapapeles', 'exito');
        }).catch(() => {
            this.notificacion('❌ Error al copiar', 'error');
        });
    }
};

// Agregar animaciones CSS para notificaciones
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

console.log('✅ utils.js listo');
