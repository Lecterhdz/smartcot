// ─────────────────────────────────────────────────────────────────────
// SMARTCOT - APLICACIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────────────────

console.log('🏭 app.js cargado');

const app = {
    datosCotizacion: {
        materiales: [],
        manoObra: [],
        indirectos: []
    },

    init: async function() {
        console.log('🏭 SmartCot iniciado');
        
        // Cargar licencia
        const licencia = window.licencia.cargar();
        this.actualizarInfoLicencia(licencia);
        
        // Cargar configuración
        await this.cargarConfiguracion();
        
        // Cargar estadísticas
        await this.cargarEstadisticas();
        
        // Cargar clientes en select
        await this.cargarClientesSelect();
        
        // Inicializar formularios
        this.agregarMaterial();
        this.agregarManoObra();
        this.agregarIndirecto();
        
        console.log('✅ SmartCot listo');
    },

    mostrarPantalla: function(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        window.scrollTo(0, 0);
        
        if (id === 'historial-screen') this.cargarHistorial();
        if (id === 'clientes-screen') this.cargarClientesTabla();
        if (id === 'configuracion-screen') this.cargarConfiguracionForm();
    },

    actualizarInfoLicencia: function(licencia) {
        const info = document.getElementById('license-info');
        if (licencia && !licencia.expirada) {
            info.textContent = `✅ ${licencia.tipo} - Exp: ${new Date(licencia.expiracion).toLocaleDateString('es-MX')}`;
        } else {
            info.textContent = '🔓 Sin licencia';
        }
    },

    cargarEstadisticas: async function() {
        const stats = await dbEstadisticas();
        document.getElementById('stat-cotizaciones').textContent = stats.cotizaciones;
        document.getElementById('stat-clientes').textContent = stats.clientes;
        document.getElementById('stat-ingresos').textContent = calculator.formatoMoneda(stats.totalIngresos);
        document.getElementById('stat-margen').textContent = stats.margenPromedio.toFixed(1) + '%';
    },

    agregarMaterial: function() {
        const container = document.getElementById('materiales-lista');
        const id = Date.now();
        this.datosCotizacion.materiales.push({ id, nombre: '', cantidad: 1, precioUnitario: 0 });
        
        const div = document.createElement('div');
        div.className = 'material-item';
        div.dataset.id = id;
        div.innerHTML = `
            <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px;margin:10px 0;">
                <input type="text" placeholder="Material" onchange="app.actualizarMaterial(${id}, 'nombre', this.value)">
                <input type="number" placeholder="Cant." value="1" min="1" onchange="app.actualizarMaterial(${id}, 'cantidad', this.value)">
                <input type="number" placeholder="Precio" value="0" min="0" step="0.01" onchange="app.actualizarMaterial(${id}, 'precioUnitario', this.value)">
                <button onclick="app.eliminarMaterial(${id})" style="background:#f44336;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;">🗑️</button>
            </div>
        `;
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
        document.querySelector(`.material-item[data-id="${id}"]`).remove();
        this.calcularTotal();
    },

    agregarManoObra: function() {
        const container = document.getElementById('mano-obra-lista');
        const id = Date.now();
        this.datosCotizacion.manoObra.push({ id, concepto: '', horas: 1, precioHora: 0 });
        
        const div = document.createElement('div');
        div.className = 'mano-obra-item';
        div.dataset.id = id;
        div.innerHTML = `
            <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px;margin:10px 0;">
                <input type="text" placeholder="Concepto" onchange="app.actualizarManoObra(${id}, 'concepto', this.value)">
                <input type="number" placeholder="Horas" value="1" min="1" onchange="app.actualizarManoObra(${id}, 'horas', this.value)">
                <input type="number" placeholder="$ Hora" value="0" min="0" step="0.01" onchange="app.actualizarManoObra(${id}, 'precioHora', this.value)">
                <button onclick="app.eliminarManoObra(${id})" style="background:#f44336;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;">🗑️</button>
            </div>
        `;
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
        document.querySelector(`.mano-obra-item[data-id="${id}"]`).remove();
        this.calcularTotal();
    },

    agregarIndirecto: function() {
        const container = document.getElementById('indirectos-lista');
        const id = Date.now();
        this.datosCotizacion.indirectos.push({ id, concepto: '', monto: 0 });
        
        const div = document.createElement('div');
        div.className = 'indirecto-item';
        div.dataset.id = id;
        div.innerHTML = `
            <div style="display:grid;grid-template-columns:2fr 1fr auto;gap:10px;margin:10px 0;">
                <input type="text" placeholder="Concepto" onchange="app.actualizarIndirecto(${id}, 'concepto', this.value)">
                <input type="number" placeholder="Monto" value="0" min="0" step="0.01" onchange="app.actualizarIndirecto(${id}, 'monto', this.value)">
                <button onclick="app.eliminarIndirecto(${id})" style="background:#f44336;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;">🗑️</button>
            </div>
        `;
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
        document.querySelector(`.indirecto-item[data-id="${id}"]`).remove();
        this.calcularTotal();
    },

    calcularTotal: function() {
        const utilidadPorcentaje = parseFloat(document.getElementById('cot-utilidad').value) || 15;
        const ivaPorcentaje = 16;
        
        const resultado = calculator.calcularCotizacion({
            materiales: this.datosCotizacion.materiales,
            manoObra: this.datosCotizacion.manoObra,
            indirectos: this.datosCotizacion.indirectos,
            utilidadPorcentaje: utilidadPorcentaje,
            ivaPorcentaje: ivaPorcentaje
        });
        
        document.getElementById('resumen-subtotal').textContent = calculator.formatoMoneda(resultado.subtotal);
        document.getElementById('resumen-indirectos').textContent = calculator.formatoMoneda(resultado.indirectosTotal);
        document.getElementById('resumen-utilidad').textContent = calculator.formatoMoneda(resultado.utilidad);
        document.getElementById('resumen-iva').textContent = calculator.formatoMoneda(resultado.iva);
        document.getElementById('resumen-total').textContent = calculator.formatoMoneda(resultado.totalFinal);
        
        document.getElementById('lbl-utilidad').textContent = utilidadPorcentaje;
        document.getElementById('lbl-iva').textContent = ivaPorcentaje;
        
        // SmartMargin warnings
        this.verificarSmartMargin(resultado);
    },

    verificarSmartMargin: function(resultado) {
        const warning = document.getElementById('smartmargin-warning');
        const alertas = [];
        
        if (resultado.margenReal < 15) {
            alertas.push('⚠️ Utilidad menor al 15% recomendado.');
        }
        if (resultado.indirectosTotal === 0) {
            alertas.push('⚠️ No se incluyeron costos indirectos.');
        }
        if (resultado.materialesTotal > resultado.manoObraTotal * 3) {
            alertas.push('⚠️ Costo de materiales muy alto vs mano de obra.');
        }
        
        if (alertas.length > 0) {
            warning.style.display = 'block';
            warning.innerHTML = '<strong>⚠️ SmartMargin Alertas:</strong><br>' + alertas.join('<br>');
        } else {
            warning.style.display = 'none';
        }
    },

    guardarCotizacion: async function() {
        const limite = await window.licencia.verificarLimite();
        if (!limite.permitido) {
            alert('⚠️ ' + limite.razon);
            return;
        }
        
        const clienteId = document.getElementById('cot-cliente').value;
        const descripcion = document.getElementById('cot-descripcion').value;
        const ubicacion = document.getElementById('cot-ubicacion').value;
        const utilidadPorcentaje = parseFloat(document.getElementById('cot-utilidad').value) || 15;
        
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
        
        await dbCotizaciones.guardar(cotizacion);
        alert('✅ Cotización guardada exitosamente');
        
        // Resetear formulario
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
    },

    cargarHistorial: async function() {
        const cotizaciones = await dbCotizaciones.obtenerTodas();
        const clientes = await dbClientes.obtenerTodos();
        
        const tbody = document.getElementById('historial-tabla');
        tbody.innerHTML = cotizaciones.map(c => {
            const cliente = clientes.find(cl => cl.id == c.clienteId);
            return `<tr>
                <td>${new Date(c.fecha).toLocaleDateString('es-MX')}</td>
                <td>${cliente ? cliente.nombre : 'N/A'}</td>
                <td>${c.descripcion}</td>
                <td>${calculator.formatoMoneda(c.totalFinal)}</td>
                <td>${c.margenReal.toFixed(1)}%</td>
                <td>
                    <button onclick="alert('Próximamente: Ver detalle')" style="padding:5px 10px;border:none;border-radius:5px;cursor:pointer;">👁️</button>
                    <button onclick="alert('Próximamente: Editar')" style="padding:5px 10px;border:none;border-radius:5px;cursor:pointer;">✏️</button>
                </td>
            </tr>`;
        }).join('');
    },

    buscarCotizaciones: async function() {
        const termino = document.getElementById('buscar-cotizacion').value;
        if (termino.length < 2) {
            this.cargarHistorial();
            return;
        }
        
        const cotizaciones = await dbCotizaciones.buscar(termino);
        // Render similar a cargarHistorial
    },

    cargarClientesSelect: async function() {
        const clientes = await dbClientes.obtenerTodos();
        const select = document.getElementById('cot-cliente');
        select.innerHTML = '<option value="">Seleccionar cliente...</option>' +
            clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    },

    cargarClientesTabla: async function() {
        const clientes = await dbClientes.obtenerTodos();
        const tbody = document.getElementById('clientes-tabla');
        tbody.innerHTML = clientes.map(c => `<tr>
            <td>${c.nombre}</td>
            <td>${c.email || 'N/A'}</td>
            <td>${c.telefono || 'N/A'}</td>
            <td>
                <button onclick="alert('Próximamente: Editar')" style="padding:5px 10px;border:none;border-radius:5px;cursor:pointer;">✏️</button>
                <button onclick="app.eliminarCliente(${c.id})" style="padding:5px 10px;border:none;border-radius:5px;background:#f44336;color:white;cursor:pointer;">🗑️</button>
            </td>
        </tr>`).join('');
    },

    guardarCliente: async function() {
        const nombre = document.getElementById('cliente-nombre').value;
        const email = document.getElementById('cliente-email').value;
        const telefono = document.getElementById('cliente-telefono').value;
        const notas = document.getElementById('cliente-notas').value;
        
        if (!nombre) {
            alert('⚠️ Nombre requerido');
            return;
        }
        
        await dbClientes.guardar({ nombre, email, telefono, notas });
        alert('✅ Cliente guardado');
        
        document.getElementById('cliente-nombre').value = '';
        document.getElementById('cliente-email').value = '';
        document.getElementById('cliente-telefono').value = '';
        document.getElementById('cliente-notas').value = '';
        
        this.cargarClientesSelect();
        this.cargarClientesTabla();
    },

    eliminarCliente: async function(id) {
        if (confirm('¿Eliminar este cliente?')) {
            await dbClientes.eliminar(id);
            this.cargarClientesSelect();
            this.cargarClientesTabla();
        }
    },

    cargarConfiguracion: async function() {
        const config = await dbConfig.obtenerTodas();
        if (config.iva) document.getElementById('config-iva').value = config.iva;
        if (config.utilidad) document.getElementById('config-utilidad').value = config.utilidad;
        if (config.empresa) document.getElementById('config-empresa').value = config.empresa;
    },

    cargarConfiguracionForm: async function() {
        await this.cargarConfiguracion();
    },

    guardarConfiguracion: async function() {
        const empresa = document.getElementById('config-empresa').value;
        const iva = parseFloat(document.getElementById('config-iva').value) || 16;
        const utilidad = parseFloat(document.getElementById('config-utilidad').value) || 15;
        
        await dbConfig.guardar('empresa', empresa);
        await dbConfig.guardar('iva', iva);
        await dbConfig.guardar('utilidad', utilidad);
        
        alert('✅ Configuración guardada');
    },

    exportarDatos: async function() {
        await dbExportar();
        alert('✅ Datos exportados. Guarda el archivo en un lugar seguro.');
    },

    importarDatos: async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async function(e) {
            await dbImportar(e.target.result);
        };
        reader.readAsText(file);
    },

    generarPDF: function() {
        alert('🚧 Próximamente: Generar PDF profesional con jsPDF');
        // Implementar en siguiente iteración
    },

    cerrarSesion: function() {
        window.licencia.cerrar();
    }
};

// Iniciar cuando DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    app.init();
});

console.log('✅ app.js listo');