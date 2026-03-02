// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - APLICACIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────────────────

console.log('🏭 SmartCot iniciado');

const app = {
    datosCotizacion: { materiales: [], manoObra: [], equipos: [], herramienta: [], indirectos: [] },
    
    // ─────────────────────────────────────────────────────────────────
    // INICIALIZACIÓN
    // ─────────────────────────────────────────────────────────────────
    init: async function() {
        console.log('🏭 SmartCot iniciado');
        
        // Esperar a que DB esté lista
        await this.esperarDB();
        
        const licencia = window.licencia.cargar();
        this.actualizarInfoLicencia(licencia);
        
        await this.cargarConfiguracion();
        await this.cargarEstadisticas();
        await this.cargarClientesSelect();
        await this.verificarClientesDisponibles();
        
        this.agregarMaterial();
        this.agregarManoObra();
        this.agregarIndirecto();
        
        console.log('✅ SmartCot listo');
    },
    
    // Esperar a que la DB esté disponible
    esperarDB: async function() {
        let intentos = 0;
        while (!window.db && intentos < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            intentos++;
        }
        if (!window.db) {
            console.error('❌ DB no disponible después de 5 segundos');
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // NAVEGACIÓN ENTRE PANTALLAS
    // ─────────────────────────────────────────────────────────────────
    mostrarPantalla: function(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        window.scrollTo(0, 0);
        
        if (id === 'historial-screen') this.cargarHistorial();
        if (id === 'clientes-screen') this.cargarClientesTabla();
        if (id === 'configuracion-screen') this.cargarConfiguracionForm();
        if (id === 'nueva-cotizacion') this.verificarClientesDisponibles();
    },
    
    // ─────────────────────────────────────────────────────────────────
    // LICENCIA
    // ─────────────────────────────────────────────────────────────────
    actualizarInfoLicencia: function(licencia) {
        const info = document.getElementById('license-info');
        if (!info) return;
        
        if (licencia && !licencia.expirada) {
            info.textContent = '✅ ' + licencia.tipo + ' - Exp: ' + new Date(licencia.expiracion).toLocaleDateString('es-MX');
        } else {
            info.textContent = '🔓 Sin licencia';
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // ESTADÍSTICAS
    // ─────────────────────────────────────────────────────────────────
    cargarEstadisticas: async function() {
        try {
            if (!window.db) return;
            
            const stats = await window.dbUtils.estadisticas();
            
            const elConceptos = document.getElementById('stat-cotizaciones');
            const elClientes = document.getElementById('stat-clientes');
            const elIngresos = document.getElementById('stat-ingresos');
            const elMargen = document.getElementById('stat-margen');
            
            if (elConceptos) elConceptos.textContent = stats.conceptos || 0;
            if (elClientes) elClientes.textContent = stats.clientes || 0;
            if (elIngresos) elIngresos.textContent = calculator.formatoMoneda(stats.totalIngresos || 0);
            if (elMargen) elMargen.textContent = (stats.margenPromedio || 0).toFixed(1) + '%';
            
        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // MATERIALES
    // ─────────────────────────────────────────────────────────────────
    agregarMaterial: function() {
        const container = document.getElementById('materiales-lista');
        if (!container) return;
        
        const id = Date.now();
        this.datosCotizacion.materiales.push({ id, nombre: '', cantidad: 1, precioUnitario: 0 });
        
        const div = document.createElement('div');
        div.className = 'material-item';
        div.dataset.id = id;
        div.innerHTML = '<div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px;margin:10px 0;">' +
            '<input type="text" placeholder="Material" onchange="app.actualizarMaterial(' + id + ', \'nombre\', this.value)">' +
            '<input type="number" placeholder="Cant." value="1" min="1" onchange="app.actualizarMaterial(' + id + ', \'cantidad\', this.value)">' +
            '<input type="number" placeholder="Precio" value="0" min="0" step="0.01" onchange="app.actualizarMaterial(' + id + ', \'precioUnitario\', this.value)">' +
            '<button onclick="app.eliminarMaterial(' + id + ')" style="background:#f44336;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;">🗑️</button>' +
            '</div>';
        container.appendChild(div);
        this.calcularTotal();
    },
    
    actualizarMaterial: function(id, campo, valor) {
        const material = this.datosCotizacion.materiales.find(m => m.id === id);
        if (material) {
            material[campo] = campo === 'nombre' ? valor : parseFloat(valor) || 0;
        }
        this.calcularTotal();
    },
    
    eliminarMaterial: function(id) {
        this.datosCotizacion.materiales = this.datosCotizacion.materiales.filter(m => m.id !== id);
        const el = document.querySelector('.material-item[data-id="' + id + '"]');
        if (el) el.remove();
        this.calcularTotal();
    },
    
    // ─────────────────────────────────────────────────────────────────
    // MANO DE OBRA
    // ─────────────────────────────────────────────────────────────────
    agregarManoObra: function() {
        const container = document.getElementById('mano-obra-lista');
        if (!container) return;
        
        const id = Date.now();
        this.datosCotizacion.manoObra.push({ id, concepto: '', horas: 1, precioHora: 0 });
        
        const div = document.createElement('div');
        div.className = 'mano-obra-item';
        div.dataset.id = id;
        div.innerHTML = '<div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px;margin:10px 0;">' +
            '<input type="text" placeholder="Concepto" onchange="app.actualizarManoObra(' + id + ', \'concepto\', this.value)">' +
            '<input type="number" placeholder="Horas" value="1" min="1" onchange="app.actualizarManoObra(' + id + ', \'horas\', this.value)">' +
            '<input type="number" placeholder="$ Hora" value="0" min="0" step="0.01" onchange="app.actualizarManoObra(' + id + ', \'precioHora\', this.value)">' +
            '<button onclick="app.eliminarManoObra(' + id + ')" style="background:#f44336;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;">🗑️</button>' +
            '</div>';
        container.appendChild(div);
        this.calcularTotal();
    },
    
    actualizarManoObra: function(id, campo, valor) {
        const mo = this.datosCotizacion.manoObra.find(m => m.id === id);
        if (mo) {
            mo[campo] = campo === 'concepto' ? valor : parseFloat(valor) || 0;
        }
        this.calcularTotal();
    },
    
    eliminarManoObra: function(id) {
        this.datosCotizacion.manoObra = this.datosCotizacion.manoObra.filter(m => m.id !== id);
        const el = document.querySelector('.mano-obra-item[data-id="' + id + '"]');
        if (el) el.remove();
        this.calcularTotal();
    },
    
    // ─────────────────────────────────────────────────────────────────
    // INDIRECTOS
    // ─────────────────────────────────────────────────────────────────
    agregarIndirecto: function() {
        const container = document.getElementById('indirectos-lista');
        if (!container) {
            console.warn('⚠️ No existe indirectos-lista en el HTML');
            return;
        }
    
        // Asegurar que indirectos está inicializado
        if (!this.datosCotizacion.indirectos) {
            this.datosCotizacion.indirectos = [];
        }
        const id = Date.now();
        this.datosCotizacion.indirectos.push({ id, concepto: '', monto: 0 });
        
        const div = document.createElement('div');
        div.className = 'indirecto-item';
        div.dataset.id = id;
        div.innerHTML = '<div style="display:grid;grid-template-columns:2fr 1fr auto;gap:10px;margin:10px 0;">' +
            '<input type="text" placeholder="Concepto" onchange="app.actualizarIndirecto(' + id + ', \'concepto\', this.value)">' +
            '<input type="number" placeholder="Monto" value="0" min="0" step="0.01" onchange="app.actualizarIndirecto(' + id + ', \'monto\', this.value)">' +
            '<button onclick="app.eliminarIndirecto(' + id + ')" style="background:#f44336;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;">🗑️</button>' +
            '</div>';
        container.appendChild(div);
        this.calcularTotal();
    },
    
    actualizarIndirecto: function(id, campo, valor) {
        const ind = this.datosCotizacion.indirectos.find(i => i.id === id);
        if (ind) {
            ind[campo] = campo === 'concepto' ? valor : parseFloat(valor) || 0;
        }
        this.calcularTotal();
    },
    
    eliminarIndirecto: function(id) {
        this.datosCotizacion.indirectos = this.datosCotizacion.indirectos.filter(i => i.id !== id);
        const el = document.querySelector('.indirecto-item[data-id="' + id + '"]');
        if (el) el.remove();
        this.calcularTotal();
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CÁLCULOS
    // ─────────────────────────────────────────────────────────────────
    calcularTotal: function() {
        const utilidadPorcentaje = parseFloat(document.getElementById('cot-utilidad')?.value) || 15;
        const ivaPorcentaje = 16;
        
        const resultado = calculator.calcularCotizacion({
            materiales: this.datosCotizacion.materiales,
            manoObra: this.datosCotizacion.manoObra,
            indirectos: this.datosCotizacion.indirectos,
            utilidadPorcentaje: utilidadPorcentaje,
            ivaPorcentaje: ivaPorcentaje
        });
        
        const elSubtotal = document.getElementById('resumen-subtotal');
        const elIndirectos = document.getElementById('resumen-indirectos');
        const elUtilidad = document.getElementById('resumen-utilidad');
        const elIva = document.getElementById('resumen-iva');
        const elTotal = document.getElementById('resumen-total');
        const lblUtilidad = document.getElementById('lbl-utilidad');
        const lblIva = document.getElementById('lbl-iva');
        
        if (elSubtotal) elSubtotal.textContent = calculator.formatoMoneda(resultado.subtotal);
        if (elIndirectos) elIndirectos.textContent = calculator.formatoMoneda(resultado.indirectosTotal);
        if (elUtilidad) elUtilidad.textContent = calculator.formatoMoneda(resultado.utilidad);
        if (elIva) elIva.textContent = calculator.formatoMoneda(resultado.iva);
        if (elTotal) elTotal.textContent = calculator.formatoMoneda(resultado.totalFinal);
        if (lblUtilidad) lblUtilidad.textContent = utilidadPorcentaje;
        if (lblIva) lblIva.textContent = ivaPorcentaje;
        
        this.verificarSmartMargin(resultado);
    },
    
    verificarSmartMargin: function(resultado) {
        const warning = document.getElementById('smartmargin-warning');
        if (!warning) return;
        
        const alertas = [];
        if (resultado.margenReal < 15) alertas.push('⚠️ Utilidad menor al 15% recomendado.');
        if (resultado.indirectosTotal === 0) alertas.push('⚠️ No se incluyeron costos indirectos.');
        
        if (alertas.length > 0) {
            warning.style.display = 'block';
            warning.innerHTML = '<strong>⚠️ SmartMargin Alertas:</strong><br>' + alertas.join('<br>');
        } else {
            warning.style.display = 'none';
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // GUARDAR COTIZACIÓN
    // ─────────────────────────────────────────────────────────────────
    guardarCotizacion: async function() {
        try {
            const limite = await window.licencia.verificarLimite();
            if (!limite.permitido) {
                alert('⚠️ ' + limite.razon);
                return;
            }
            
            const clienteId = document.getElementById('cot-cliente')?.value;
            const descripcion = document.getElementById('cot-descripcion')?.value;
            const ubicacion = document.getElementById('cot-ubicacion')?.value;
            const utilidadPorcentaje = parseFloat(document.getElementById('cot-utilidad')?.value) || 15;
            
            if (!clienteId || !descripcion) {
                alert('⚠️ Completa cliente y descripción');
                return;
            }
            
            const resultado = calculator.calcularCotizacion({
                materiales: this.datosCotizacion.materiales,
                manoObra: this.datosCotizacion.manoObra,
                indirectos: this.datosCotizacion.indirectos,
                utilidadPorcentaje: utilidadPorcentaje,
                ivaPorcentaje: 16
            });
            
            const cotizacion = {
                clienteId: clienteId,
                descripcion: descripcion,
                ubicacion: ubicacion,
                materiales: this.datosCotizacion.materiales,
                manoObra: this.datosCotizacion.manoObra,
                indirectos: this.datosCotizacion.indirectos,
                utilidadPorcentaje: utilidadPorcentaje,
                ...resultado,
                fecha: new Date().toISOString(),
                estado: 'pendiente'
            };
            
            await window.db.cotizaciones.add(cotizacion);
            alert('✅ Cotización guardada exitosamente');
            
            // Resetear
            this.datosCotizacion = { materiales: [], manoObra: [], indirectos: [] };
            document.getElementById('materiales-lista').innerHTML = '';
            document.getElementById('mano-obra-lista').innerHTML = '';
            document.getElementById('indirectos-lista').innerHTML = '';
            this.agregarMaterial();
            this.agregarManoObra();
            this.agregarIndirecto();
            this.calcularTotal();
            
            await this.cargarEstadisticas();
            this.mostrarPantalla('dashboard-screen');
            
        } catch (error) {
            console.error('❌ Error guardando cotización:', error);
            alert('❌ Error: ' + error.message);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // HISTORIAL
    // ─────────────────────────────────────────────────────────────────
    cargarHistorial: async function() {
        try {
            if (!window.db) return;
            
            const cotizaciones = await window.db.cotizaciones.reverse().toArray();
            const clientes = await window.db.clientes.toArray();
            
            const tbody = document.getElementById('historial-tabla');
            if (!tbody) return;
            
            tbody.innerHTML = cotizaciones.map(c => {
                const cliente = clientes.find(cl => cl.id == c.clienteId);
                return '<tr>' +
                    '<td style="padding:12px;border-bottom:1px solid #ddd;">' + new Date(c.fecha).toLocaleDateString('es-MX') + '</td>' +
                    '<td style="padding:12px;border-bottom:1px solid #ddd;">' + (cliente ? cliente.nombre : 'N/A') + '</td>' +
                    '<td style="padding:12px;border-bottom:1px solid #ddd;">' + c.descripcion + '</td>' +
                    '<td style="padding:12px;border-bottom:1px solid #ddd;">' + calculator.formatoMoneda(c.totalFinal) + '</td>' +
                    '<td style="padding:12px;border-bottom:1px solid #ddd;">' +
                    '<button onclick="alert(\'Próximamente: Ver detalle\')" style="padding:5px 10px;border:none;border-radius:5px;cursor:pointer;">👁️</button>' +
                    '</td></tr>';
            }).join('');
            
        } catch (error) {
            console.error('❌ Error cargando historial:', error);
        }
    },
    
    buscarCotizaciones: async function() {
        const termino = document.getElementById('buscar-cotizacion')?.value;
        if (!termino || termino.length < 2) {
            this.cargarHistorial();
            return;
        }
        // Implementar búsqueda
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CLIENTES
    // ─────────────────────────────────────────────────────────────────
    cargarClientesSelect: async function() {
        try {
            if (!window.db) return;
            
            const clientes = await window.db.clientes.toArray();
            const select = document.getElementById('cot-cliente');
            if (!select) return;
            
            select.innerHTML = '<option value="">Seleccionar cliente...</option>' +
                clientes.map(c => '<option value="' + c.id + '">' + c.nombre + '</option>').join('');
            
        } catch (error) {
            console.error('❌ Error cargando clientes:', error);
        }
    },
    
    cargarClientesTabla: async function() {
        try {
            if (!window.db) return;
            
            const clientes = await window.db.clientes.toArray();
            const tbody = document.getElementById('clientes-tabla');
            if (!tbody) return;
            
            tbody.innerHTML = clientes.map(c => '<tr>' +
                '<td style="padding:12px;border-bottom:1px solid #ddd;">' + c.nombre + '</td>' +
                '<td style="padding:12px;border-bottom:1px solid #ddd;">' + (c.email || 'N/A') + '</td>' +
                '<td style="padding:12px;border-bottom:1px solid #ddd;">' + (c.telefono || 'N/A') + '</td>' +
                '<td style="padding:12px;border-bottom:1px solid #ddd;">' +
                '<button onclick="alert(\'Próximamente: Editar\')" style="padding:5px 10px;border:none;border-radius:5px;cursor:pointer;">✏️</button>' +
                '<button onclick="app.eliminarCliente(' + c.id + ')" style="padding:5px 10px;border:none;border-radius:5px;background:#f44336;color:white;cursor:pointer;">🗑️</button>' +
                '</td></tr>').join('');
            
        } catch (error) {
            console.error('❌ Error cargando tabla clientes:', error);
        }
    },
    
    guardarCliente: async function() {
        try {
            const nombre = document.getElementById('cliente-nombre')?.value.trim();
            const email = document.getElementById('cliente-email')?.value.trim();
            const telefono = document.getElementById('cliente-telefono')?.value.trim();
            const notas = document.getElementById('cliente-notas')?.value.trim();
            
            if (!nombre) {
                alert('⚠️ Nombre requerido');
                return;
            }
            
            await window.db.clientes.add({ nombre, email, telefono, notas, activo: true });
            alert('✅ Cliente guardado');
            
            document.getElementById('cliente-nombre').value = '';
            document.getElementById('cliente-email').value = '';
            document.getElementById('cliente-telefono').value = '';
            document.getElementById('cliente-notas').value = '';
            
            this.cargarClientesSelect();
            this.cargarClientesTabla();
            
        } catch (error) {
            console.error('❌ Error guardando cliente:', error);
            alert('❌ Error: ' + error.message);
        }
    },
    
    eliminarCliente: async function(id) {
        if (confirm('¿Eliminar este cliente?')) {
            await window.db.clientes.delete(id);
            this.cargarClientesSelect();
            this.cargarClientesTabla();
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CONFIGURACIÓN
    // ─────────────────────────────────────────────────────────────────
    cargarConfiguracion: async function() {
        try {
            if (!window.db) return;
            
            const config = await window.db.configuracion.toArray();
            const configObj = {};
            config.forEach(c => configObj[c.clave] = c.valor);
            
            const elIva = document.getElementById('config-iva');
            const elUtilidad = document.getElementById('config-utilidad');
            const elEmpresa = document.getElementById('config-empresa');
            
            if (elIva && configObj.iva) elIva.value = configObj.iva;
            if (elUtilidad && configObj.utilidad) elUtilidad.value = configObj.utilidad;
            if (elEmpresa && configObj.empresa) elEmpresa.value = configObj.empresa;
            
        } catch (error) {
            console.error('❌ Error cargando configuración:', error);
        }
    },
    
    cargarConfiguracionForm: async function() {
        await this.cargarConfiguracion();
    },
    
    guardarConfiguracion: async function() {
        try {
            const empresa = document.getElementById('config-empresa')?.value;
            const iva = parseFloat(document.getElementById('config-iva')?.value) || 16;
            const utilidad = parseFloat(document.getElementById('config-utilidad')?.value) || 15;
            
            await window.db.configuracion.bulkPut([
                { clave: 'empresa', valor: empresa },
                { clave: 'iva', valor: iva },
                { clave: 'utilidad', valor: utilidad }
            ]);
            
            alert('✅ Configuración guardada');
            
        } catch (error) {
            console.error('❌ Error guardando configuración:', error);
            alert('❌ Error: ' + error.message);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // EXPORTAR/IMPORTAR
    // ─────────────────────────────────────────────────────────────────
    exportarDatos: async function() {
        try {
            await window.dbUtils.exportarTodo();
        } catch (error) {
            console.error('❌ Error exportando:', error);
            alert('❌ Error: ' + error.message);
        }
    },
    
    importarDatos: async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                await window.dbImportar(e.target.result);
            } catch (error) {
                console.error('❌ Error importando:', error);
                alert('❌ Error: ' + error.message);
            }
        };
        reader.readAsText(file);
    },
    
    // ─────────────────────────────────────────────────────────────────
    // MODAL CLIENTE RÁPIDO
    // ─────────────────────────────────────────────────────────────────
    mostrarModalCliente: function() {
        const modal = document.getElementById('modal-cliente');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('modal-cliente-nombre')?.focus();
        }
    },
    
    cerrarModalCliente: function() {
        const modal = document.getElementById('modal-cliente');
        if (modal) modal.style.display = 'none';
        
        const campos = ['modal-cliente-nombre', 'modal-cliente-email', 'modal-cliente-telefono', 'modal-cliente-notas'];
        campos.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    },
    
    guardarClienteRapido: async function() {
        try {
            const nombre = document.getElementById('modal-cliente-nombre')?.value.trim();
            const email = document.getElementById('modal-cliente-email')?.value.trim();
            const telefono = document.getElementById('modal-cliente-telefono')?.value.trim();
            const notas = document.getElementById('modal-cliente-notas')?.value.trim();
            
            if (!nombre) {
                alert('⚠️ El nombre del cliente es obligatorio');
                return;
            }
            
            const clienteId = await window.db.clientes.add({ nombre, email, telefono, notas, activo: true });
            
            await this.cargarClientesSelect();
            const select = document.getElementById('cot-cliente');
            if (select) select.value = clienteId;
            
            this.cerrarModalCliente();
            alert('✅ Cliente guardado y seleccionado');
            
        } catch (error) {
            console.error('❌ Error guardando cliente:', error);
            alert('❌ Error: ' + error.message);
        }
    },
    
    verificarClientesDisponibles: async function() {
        try {
            if (!window.db) return;
            
            const clientes = await window.db.clientes.toArray();
            const select = document.getElementById('cot-cliente');
            const mensaje = document.getElementById('sin-clientes-msg');
            
            if (clientes.length === 0) {
                if (mensaje) mensaje.style.display = 'block';
                if (select) select.disabled = true;
                
                const alertaExistente = document.getElementById('alerta-sin-clientes');
                if (!alertaExistente) {
                    const alerta = document.createElement('div');
                    alerta.className = 'alert alert-warning';
                    alerta.id = 'alerta-sin-clientes';
                    alerta.innerHTML = '<strong>⚠️ No hay clientes registrados</strong><br>Primero debes agregar al menos un cliente para crear una cotización.';
                    
                    const parent = select?.parentElement;
                    if (parent) parent.insertBefore(alerta, select);
                }
                
                setTimeout(() => { this.mostrarModalCliente(); }, 1000);
                
            } else {
                if (mensaje) mensaje.style.display = 'none';
                if (select) select.disabled = false;
                
                const alertaExistente = document.getElementById('alerta-sin-clientes');
                if (alertaExistente) alertaExistente.remove();
            }
            
        } catch (error) {
            console.error('❌ Error verificando clientes:', error);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // PDF
    // ─────────────────────────────────────────────────────────────────
    generarPDF: function() {
        alert('🚧 Próximamente: Generar PDF profesional');
    },
    
    // ─────────────────────────────────────────────────────────────────
    // CERRAR SESIÓN
    // ─────────────────────────────────────────────────────────────────
    cerrarSesion: function() {
        window.licencia.cerrar();
    }
};

// Iniciar cuando DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    app.init();
});

console.log('✅ app.js listo');

