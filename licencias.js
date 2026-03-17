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
    // VERIFICAR LICENCIAS REVOCADAS (CORREGIDO + ROBUSTO)
    // ─────────────────────────────────────────────────────────────────
    verificarLicenciaRevocada: async function(clave) {
        try {
            // ⚠️ URL SIN ESPACIOS AL FINAL (CORRECCIÓN CRÍTICA)
            const url = 'https://lecterhdz.github.io/smartcot/data/licencias-revocadas.json';
            
            // Si no hay clave, no hay nada que verificar
            if (!clave) {
                return { revocada: false };
            }
            
            // ⚠️ VERIFICAR CACHÉ (evitar descargar cada vez)
            const ultimoCheck = localStorage.getItem('smartcot_ultimo_check_revocadas');
            const ahora = Date.now();
            const DIAS_CACHÉ = 7;
            const MS_POR_DIA = 24 * 60 * 60 * 1000;
            
            // Si ya se verificó en los últimos 7 días, usar caché
            if (ultimoCheck && (ahora - parseInt(ultimoCheck)) < (DIAS_CACHÉ * MS_POR_DIA)) {
                const esRevocada = localStorage.getItem('smartcot_licencia_revocada');
                if (esRevocada === 'true') {
                    return { 
                        revocada: true, 
                        razon: localStorage.getItem('smartcot_razon_revocacion') || 'Licencia revocada' 
                    };
                }
                return { revocada: false };
            }
            
            // ⚠️ DESCARGAR LISTA DE REVOCADAS (con timeout)
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000); // 8 segundos
            
            try {
                const response = await fetch(url, { 
                    signal: controller.signal,
                    cache: 'no-cache'  // Forzar descarga fresca
                });
                clearTimeout(timeout);
                
                // Si falla la descarga, no bloquear (podría ser conexión)
                if (!response.ok) {
                    console.warn('⚠️ No se pudo verificar lista de revocadas (HTTP ' + response.status + ')');
                    return { revocada: false };
                }
                
                const data = await response.json();
                
                // ⚠️ VERIFICAR SI LA LICENCIA ESTÁ REVOCADA
                if (data.licenciasRevocadas && Array.isArray(data.licenciasRevocadas)) {
                    if (data.licenciasRevocadas.includes(clave)) {
                        // Marcar como revocada en caché local
                        localStorage.setItem('smartcot_licencia_revocada', 'true');
                        localStorage.setItem('smartcot_razon_revocacion', data.razones?.[clave] || 'Licencia revocada por el administrador');
                        localStorage.setItem('smartcot_ultimo_check_revocadas', ahora.toString());
                        
                        return { 
                            revocada: true, 
                            razon: data.razones?.[clave] || 'Licencia revocada' 
                        };
                    }
                }
                
                // ⚠️ ACTUALIZAR CACHÉ (licencia válida)
                localStorage.setItem('smartcot_ultimo_check_revocadas', ahora.toString());
                localStorage.setItem('smartcot_licencia_revocada', 'false');
                
                return { revocada: false };
                
            } catch (fetchError) {
                clearTimeout(timeout);
                console.warn('⚠️ Error de red verificando revocadas:', fetchError.message);
                // No bloquear por errores de conexión
                return { revocada: false };
            }
            
        } catch (error) {
            console.error('❌ Error crítico verificando licencias:', error);
            // Fail-safe: no bloquear la app por errores inesperados
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
    // OBTENER INFORMACIÓN DE LICENCIA PARA UI (CORREGIDO - DÍAS REALES)
    // ─────────────────────────────────────────────────────────────────
    obtenerInfo: function() {
        var licencia = this.cargar();
        
        // Si no hay licencia, retornar DEMO
        if (!licencia) {
            return { 
                plan: 'DEMO', 
                tipo: 'DEMO',
                activa: false, 
                diasRestantes: 7,
                fechaExpiracion: '--',
                clave: null,
                email: null
            };
        }
        
        // ⚠️ CALCULAR DÍAS RESTANTES REALES DESDE LA FECHA DE EXPIRACIÓN
        var fechaExpiracion = new Date(licencia.expiracion);
        var fechaActual = new Date();
        
        // Calcular diferencia en milisegundos y convertir a días
        var diferenciaTiempo = fechaExpiracion - fechaActual;
        var diasRestantes = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24));
        
        // Si ya expiró, mostrar 0 (no negativos)
        if (diasRestantes < 0) diasRestantes = 0;
        
        // Formatear fecha para mostrar
        var fechaExpiracionStr = fechaExpiracion.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        return {
            plan: licencia.tipo || 'DEMO',
            tipo: licencia.tipo || 'DEMO',
            activa: licencia.activa && !licencia.expirada && diasRestantes > 0,
            diasRestantes: diasRestantes,  // ← CALCULADO REAL, NO HARDCODED
            fechaExpiracion: fechaExpiracionStr,
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
    // ACTIVAR LICENCIA (CORREGIDO - LEE EXPIRACIÓN REAL DE LA CLAVE)
    // ─────────────────────────────────────────────────────────────────
    activar: async function(clave, email) {
        try {
            console.log('🔑 Procesando activación:', clave);
            
            // ⚠️ VALIDAR FORMATO DE CLAVE (ACEPTA AMBOS FORMATOS)
            const formato1 = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
            const formato2 = /^[A-Z]+-[A-Z0-9]{6}-\d{13,14}-[A-Z0-9]{8}$/i;
            
            if (!formato1.test(clave) && !formato2.test(clave)) {
                return { activo: false, razon: 'Formato de clave inválido' };
            }
            
            // ⚠️ PARSEAR LA CLAVE
            const partes = clave.split('-');
            let tipo = 'DEMO';
            let expiracion = null;
            
            if (partes.length === 4 && formato2.test(clave)) {
                // Formato real: PLAN-CODE6-TIMESTAMP-CODE8
                tipo = partes[0].toUpperCase();
                const timestampStr = partes[2];
                const timestamp = parseInt(timestampStr);
                
                // ⚠️ DETECTAR SI EL TIMESTAMP ES EXPIRACIÓN O CREACIÓN
                const ahora = Date.now();
                const fechaTimestamp = new Date(timestamp);
                
                // Si el timestamp está en el futuro → ES LA FECHA DE EXPIRACIÓN
                // Si el timestamp está en el pasado → ES LA FECHA DE CREACIÓN
                if (timestamp > ahora) {
                    // ✅ El timestamp YA es la fecha de expiración
                    expiracion = new Date(timestamp);
                    console.log('📅 Timestamp es fecha de expiración:', expiracion.toLocaleDateString('es-MX'));
                } else {
                    // ⚠️ El timestamp es fecha de creación → calcular expiración
                    // ⚠️ PERO: para ENTERPRISE, verificar si hay duración custom en el código
                    const code8 = partes[3];
                    
                    // ⚠️ DETECTAR DURACIÓN CUSTOM EN EL CÓDIGO FINAL (últimos 2 dígitos)
                    const duracionCustom = parseInt(code8.slice(-2));
                    let diasValidez;
                    
                    if (duracionCustom >= 1 && duracionCustom <= 99) {
                        // ✅ Usar duración custom (ej: "07" = 7 días)
                        diasValidez = duracionCustom;
                        console.log('📅 Duración custom detectada:', diasValidez, 'días');
                    } else {
                        // Fallback a duración por plan
                        diasValidez = this._obtenerDiasPorPlan(tipo);
                    }
                    
                    expiracion = new Date(timestamp);
                    expiracion.setDate(expiracion.getDate() + diasValidez);
                    console.log('📅 Licencia creada:', fechaTimestamp.toLocaleDateString('es-MX'));
                    console.log('📅 Licencia expira:', expiracion.toLocaleDateString('es-MX'));
                }
            } else {
                // Formato demo o fallback
                tipo = 'DEMO';
                expiracion = new Date();
                expiracion.setDate(expiracion.getDate() + 7);
            }
            
            // ⚠️ VALIDAR TIPO DE PLAN
            if (!this.PLANES[tipo]) {
                return { activo: false, razon: 'Tipo de plan no válido: ' + tipo };
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
            return { activo: false, razon: 'Error: ' + error.message };
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
