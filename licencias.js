// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - SISTEMA DE LICENCIAS (CORREGIDO)
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
            reportesPDF: false,
            reportesAPU: false,  // ← AGREGAR
            importar: false,
            factoresAjuste: false,
            historial: false,
            plantillas: 0,
            historicoPrecios: false,
            editarPrecios: false,
            marcaPersonalizada: false,
            curvaSAvanzada: false
        },
        PRO: {
            nombre: 'PRO',
            precio: 599,
            duracion: 365,
            limiteConceptos: 10000,
            limiteCotizaciones: 999999,
            limiteClientes: 999999,
            curvaS: true,
            reportesPDF: true,
            reportesAPU: false,  // ← AGREGAR
            importar: true,
            factoresAjuste: true,
            historial: true,
            plantillas: 5,
            historicoPrecios: false,
            editarPrecios: true,
            marcaPersonalizada: false,
            curvaSAvanzada: false
        },
        ENTERPRISE: {
            nombre: 'ENTERPRISE',
            precio: 999,
            duracion: 365,
            limiteConceptos: 999999,
            limiteCotizaciones: 999999,
            limiteClientes: 999999,
            curvaS: true,
            reportesPDF: true,
            reportesAPU: true,  // ← AGREGAR
            importar: true,
            factoresAjuste: true,
            historial: true,
            plantillas: 999999,
            historicoPrecios: true,
            editarPrecios: true,
            marcaPersonalizada: true,
            curvaSAvanzada: true
        }
    },

    // ─────────────────────────────────────────────────────────────────
    // VERIFICAR LICENCIAS REVOCADAS
    // ─────────────────────────────────────────────────────────────────
    verificarLicenciaRevocada: async function(clave) {
        try {
            // URL del archivo en GitHub
            const url = 'https://lecterhdz.github.io/smartcot/data/licencias-revocadas.json';
            
            // Verificar caché (no descargar cada vez)
            const ultimoCheck = localStorage.getItem('smartcot_ultimo_check_revocadas');
            const ahora = Date.now();
            
            // Solo verificar cada 7 días (604800000 ms)
            if (ultimoCheck && (ahora - parseInt(ultimoCheck)) < 604800000) {
                const esRevocada = localStorage.getItem('smartcot_licencia_revocada');
                if (esRevocada === 'true') {
                    return { revocada: true, razon: localStorage.getItem('smartcot_razon_revocacion') };
                }
                return { revocada: false };
            }
            
            // Descargar lista de revocadas
            const response = await fetch(url);
            if (!response.ok) {
                console.warn('⚠️ No se pudo verificar lista de revocadas');
                return { revocada: false };
            }
            
            const data = await response.json();
            
            // Verificar si la licencia está en la lista
            if (data.licenciasRevocadas && data.licenciasRevocadas.includes(clave)) {
                // Marcar como revocada
                localStorage.setItem('smartcot_licencia_revocada', 'true');
                localStorage.setItem('smartcot_razon_revocacion', data.razones[clave] || 'Licencia revocada');
                localStorage.setItem('smartcot_ultimo_check_revocadas', ahora.toString());
                
                return { 
                    revocada: true, 
                    razon: data.razones[clave] || 'Licencia revocada por el administrador' 
                };
            }
            
            // Actualizar caché
            localStorage.setItem('smartcot_ultimo_check_revocadas', ahora.toString());
            localStorage.setItem('smartcot_licencia_revocada', 'false');
            
            return { revocada: false };
            
        } catch (error) {
            console.error('❌ Error verificando licencias revocadas:', error);
            // En caso de error, no bloquear (podría ser problema de conexión)
            return { revocada: false };
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CARGAR LICENCIA
    // ─────────────────────────────────────────────────────────────────
    cargar: function() {
        try {
            var licenciaGuardada = localStorage.getItem('smartcot_licencia');
            
            if (!licenciaGuardada) {
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
    // VERIFICAR LÍMITES (CORREGIDO)
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
            if (!window.db) {
                return { permitido: true };
            }
            
            if (tipo === 'conceptos') {
                var count = await window.db.conceptos.count();
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

            if (tipo === 'reportesAPU') {
                if (!plan.reportesAPU) {
                    return { 
                        permitido: false, 
                        razon: 'Reportes APU no disponibles en plan ' + plan.nombre + '. Actualiza a ENTERPRISE para acceder.'
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
            
            if (tipo === 'historial') {
                if (!plan.historial) {
                    return { 
                        permitido: false, 
                        razon: 'Historial de cotizaciones no disponible en plan ' + plan.nombre + '. Actualiza a PRO para acceder.'
                    };
                }
                return { permitido: true };
            }
            
            if (tipo === 'plantillas') {
                // ⚠️ VERIFICAR QUE window.db EXISTA
                if (!window.db) {
                    return { permitido: true };
                }
                
                const count = await window.db.plantillas.count();
                if (count >= plan.plantillas) {
                    return { 
                        permitido: false, 
                        razon: 'Límite de plantillas alcanzado (' + count + '/' + plan.plantillas + '). Actualiza a ENTERPRISE para ilimitadas.'
                    };
                }
                return { permitido: true };
            }
            
            if (tipo === 'historicoPrecios') {
                if (!plan.historicoPrecios) {
                    return { 
                        permitido: false, 
                        razon: 'Histórico de precios solo disponible en ENTERPRISE.'
                    };
                }
                return { permitido: true };
            }
            
            if (tipo === 'curvaSAvanzada') {
                if (!plan.curvaSAvanzada) {
                    return { 
                        permitido: false, 
                        razon: 'Curva S Avanzada solo disponible en ENTERPRISE.'
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
            return { plan: 'DEMO', activa: false, diasRestantes: '--' };
        }
        
        return {
            plan: licencia.tipo || 'DEMO',
            activa: licencia.activa && !licencia.expirada,
            diasRestantes: licencia.diasRestantes || 7,
            fechaExpiracion: licencia.expiracion ? new Date(licencia.expiracion).toLocaleDateString('es-MX') : '--',
            clave: licencia.clave,
            email: licencia.email
        };
    },

   
    // ─────────────────────────────────────────────────────────────────
    // OBTENER DÍAS POR PLAN (NUEVA FUNCIÓN)
    // ─────────────────────────────────────────────────────────────────
    _obtenerDiasPorPlan: function(tipo) {
        const diasPorPlan = {
            'DEMO': 7,
            'PRO': 365,      // 1 año
            'ENTERPRISE': 365 // 1 año
        };
        return diasPorPlan[tipo] || 7;
    },

    // ─────────────────────────────────────────────────────────────────
    // ACTIVAR LICENCIA (FUNCIÓN FALTANTE - AGREGAR ESTO)
    // ─────────────────────────────────────────────────────────────────
    activar: async function(clave, email) {
        try {
            console.log('🔑 Procesando activación:', clave);
            
            // ⚠️ VALIDAR FORMATO DE CLAVE (ACEPTA AMBOS FORMATOS)
            const formato1 = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
            const formato2 = /^[A-Z]+-[A-Z0-9]{6}-\d{13}-[A-Z0-9]{8}$/i;
            
            if (!formato1.test(clave) && !formato2.test(clave)) {
                return {
                    activo: false,
                    razon: 'Formato de clave inválido'
                };
            }
            
            // ⚠️ PARSEAR LA CLAVE
            const partes = clave.split('-');
            let tipo = 'DEMO';
            let expiracion = null;
            
            if (partes.length === 4 && formato2.test(clave)) {
                // Formato real: PLAN-CODE6-TIMESTAMP-CODE8
                tipo = partes[0].toUpperCase();
                const timestamp = parseInt(partes[2]);
                
                // Calcular expiración desde timestamp
                const fechaCreacion = new Date(timestamp);
                const diasValidez = this._obtenerDiasPorPlan(tipo);
                expiracion = new Date(fechaCreacion);
                expiracion.setDate(expiracion.getDate() + diasValidez);
                
                console.log('📅 Licencia creada:', fechaCreacion.toLocaleDateString());
                console.log('📅 Licencia expira:', expiracion.toLocaleDateString());
            } else {
                // Formato demo o fallback
                tipo = 'DEMO';
                expiracion = new Date();
                expiracion.setDate(expiracion.getDate() + 7);
            }
            
            // ⚠️ VALIDAR TIPO DE PLAN
            if (!this.PLANES[tipo]) {
                return {
                    activo: false,
                    razon: 'Tipo de plan no válido: ' + tipo
                };
            }
            
            // ⚠️ GUARDAR LICENCIA
            const licencia = {
                clave: clave,
                tipo: tipo,
                email: email || '',
                expiracion: expiracion.toISOString(),
                activa: true,
                fechaActivacion: new Date().toISOString()
            };
            
            localStorage.setItem('smartcot_licencia', JSON.stringify(licencia));
            
            console.log('✅ Licencia activada:', licencia);
            
            return {
                activo: true,
                tipo: tipo,
                expiracion: expiracion.toISOString(),
                diasRestantes: this._diasRestantes(expiracion)
            };
            
        } catch (error) {
            console.error('❌ Error activando licencia:', error);
            return {
                activo: false,
                razon: 'Error: ' + error.message
            };
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // OBTENER DÍAS POR PLAN (FUNCIÓN AUXILIAR)
    // ─────────────────────────────────────────────────────────────────
    _obtenerDiasPorPlan: function(tipo) {
        const diasPorPlan = {
            'DEMO': 7,
            'PRO': 365,
            'ENTERPRISE': 365
        };
        return diasPorPlan[tipo] || 7;
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CALCULAR DÍAS RESTANTES (FUNCIÓN AUXILIAR)
    // ─────────────────────────────────────────────────────────────────
    _diasRestantes: function(fechaExpiracion) {
        const ahora = new Date();
        const expiracion = new Date(fechaExpiracion);
        const diferencia = expiracion - ahora;
        return Math.max(0, Math.ceil(diferencia / (1000 * 60 * 60 * 24)));
    },
    
    // ─────────────────────────────────────────────────────────────────
    // ACTIVAR LICENCIA DESDE UI (CORREGIDO - AMBOS FORMATOS)
    // ─────────────────────────────────────────────────────────────────
    activarDesdeUI: async function() {
        try {
            console.log('🔑 Activando licencia desde UI...');
            
            // ⚠️ VERIFICAR QUE LOS ELEMENTOS EXISTAN ANTES DE ACCEDER
            const elEmail = document.getElementById('licencia-email-activar');
            const elClave = document.getElementById('licencia-clave-activar');
            
            if (!elEmail || !elClave) {
                console.error('❌ Campos de activación no encontrados en el HTML');
                alert('⚠️ Error: No se encontraron los campos de activación.\n\nVerifica que el HTML tenga:\n- id="licencia-email-activar"\n- id="licencia-clave-activar"');
                return;
            }
            
            // ⚠️ OBTENER VALORES CON FALLBACK SEGURO
            const email = (elEmail.value || '').trim();
            const clave = (elClave.value || '').trim().toUpperCase();
            
            // ⚠️ VALIDAR QUE NO ESTÉN VACÍOS
            if (!email) {
                alert('⚠️ Ingresa tu email de registro');
                elEmail.focus();
                return;
            }
            
            if (!clave) {
                alert('⚠️ Ingresa tu clave de licencia');
                elClave.focus();
                return;
            }
            
            // ⚠️ VALIDAR FORMATO DE CLAVE (ACEPTA AMBOS FORMATOS)
            // Formato 1: XXXX-XXXX-XXXX-XXXX (demo)
            // Formato 2: PLAN-CODE6-TIMESTAMP-CODE8 (real)
            const formato1 = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
            const formato2 = /^[A-Z]+-[A-Z0-9]{6}-\d{13}-[A-Z0-9]{8}$/i;
            
            if (!formato1.test(clave) && !formato2.test(clave)) {
                alert('⚠️ Formato de clave inválido\n\nDebe ser:\n• XXXX-XXXX-XXXX-XXXX (Demo)\n• PLAN-CODE6-TIMESTAMP-CODE8 (Real)\n\nEjemplo real: ENTERPRISE-ABC123-1234567890123-XYZ78901');
                elClave.focus();
                return;
            }
            
            // ⚠️ MOSTRAR ESTADO DE CARGA
            const btnActivar = elClave.parentElement.querySelector('button') || 
                              document.querySelector('button[onclick*="activarDesdeUI"]');
            if (btnActivar) {
                btnActivar.disabled = true;
                btnActivar.textContent = '⏳ Activando...';
            }
            
            // ⚠️ INTENTAR ACTIVAR
            const resultado = await this.activar(clave, email);
            
            if (resultado.activo) {
                alert('✅ ¡Licencia ' + resultado.tipo + ' activada exitosamente!\n\nExpira: ' + 
                      new Date(resultado.expiracion).toLocaleDateString('es-MX'));
                
                // Limpiar campos
                elEmail.value = '';
                elClave.value = '';
                
                // Recargar UI
                if (window.app && typeof window.app.actualizarInfoLicenciaUI === 'function') {
                    await window.app.actualizarInfoLicenciaUI();
                }
                if (window.licencia && typeof window.licencia.cargar === 'function') {
                    const licencia = window.licencia.cargar();
                    if (window.app && typeof window.app.actualizarInfoLicencia === 'function') {
                        window.app.actualizarInfoLicencia(licencia);
                    }
                }
                
                // Recargar página para aplicar cambios
                setTimeout(function() {
                    window.location.reload();
                }, 2000);
            } else {
                alert('❌ Error al activar: ' + (resultado.razon || 'Licencia inválida'));
            }
            
            // ⚠️ RESTAURAR BOTÓN
            if (btnActivar) {
                btnActivar.disabled = false;
                btnActivar.textContent = 'Activar';
            }
            
        } catch (error) {
            console.error('❌ Error en activarDesdeUI:', error);
            alert('❌ Error al activar licencia: ' + error.message);
            
            // Restaurar botón en caso de error
            const btnActivar = document.querySelector('button[onclick*="activarDesdeUI"]');
            if (btnActivar) {
                btnActivar.disabled = false;
                btnActivar.textContent = 'Activar';
            }
        }
    }
};

console.log('✅ licencias.js listo');
