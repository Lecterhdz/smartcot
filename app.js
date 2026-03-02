// ─────────────────────────────────────────────────────────────────────
// SMARTCOT - APLICACIÓN PRINCIPAL (CORREGIDO)
// ─────────────────────────────────────────────────────────────────────

console.log('🏭 app.js cargado');

const app = {
    datosCotizacion: {
        conceptos: [], // Conceptos de precio unitario
        sobrecostos: []
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
        
        // Verificar clientes disponibles
        await this.verificarClientesDisponibles();
        
        // Inicializar primer concepto
        this.agregarConcepto();
        
        console.log('✅ SmartCot listo');
    },

    mostrarPantalla: function(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        window.scrollTo(0, 0);
        
        if (id === 'historial-screen') this.cargarHistorial();
        if (id === 'clientes-screen') this.cargarClientesTabla();
        if (id === 'configuracion-screen') this.cargarConfiguracionForm();
        if (id === 'nueva-cotizacion') this.verificarClientesDisponibles();
    },

    actualizarInfoLicencia: function(licencia) {
        const info = document.getElementById('license-info');
        if (licencia && !licencia.expirada) {
            info.textContent = '✅ ' + licencia.tipo + ' - Exp: ' + new Date(licencia.expiracion).toLocaleDateString('es-MX');
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

    // ─────────────────────────────────────────────────────────────────
    // GESTIÓN DE CONCEPTOS (PRECIO UNITARIO)
    // ─────────────────────────────────────────────────────────────────
    agregarConcepto: function() {
        const container = document.getElementById('conceptos-lista');
        if (!container) return;
        
        const id = Date.now();
        this.datosCotizacion.conceptos.push({
            id: id,
            codigo: 'C-' + (this.datosCotizacion.conceptos.length + 1),
            descripcion: '',
            unidad: 'm2',
            cantidad: 1,
            costoDirecto: 0,
            sobrecostos: 0,
            precioUnitario: 0,
            importe: 0,
            materiales: [],
            manoObra: [],
            maquinaria: []
        });
        
        const div = document.createElement('div');
        div.className = 'concepto-item card';
        div.dataset.id = id;
        div.style.marginBottom = '20px';
        div.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                <h4 style="margin:0;color:#1a1a1a;">📋 Concepto <span class="concepto-codigo">${id}</span></h4>
                <button onclick="app.eliminarConcepto(${id})" style="background:#f44336;color:white;border:none;padding:8px 15px;border-radius:8px;cursor:pointer;">🗑️ Eliminar</button>
            </div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px;">
                <div class="form-group" style="margin:0;">
                    <label>Código:</label>
                    <input type="text" value="C-${this.datosCotizacion.conceptos.length}" onchange="app.actualizarConcepto(${id}, 'codigo', this.value)">
                </div>
                <div class="form-group" style="margin:0;">
                    <label>Unidad:</label>
                    <select onchange="app.actualizarConcepto(${id}, 'unidad', this.value)">
                        <option value="m2">m² (Metro cuadrado)</option>
                        <option value="m3">m³ (Metro cúbico)</option>
                        <option value="ml">ml (Metro lineal)</option>
                        <option value="pza">pza (Pieza)</option>
                        <option value="kg">kg (Kilogramo)</option>
                        <option value="ton">ton (Tonelada)</option>
                        <option value="h">h (Hora)</option>
                        <option value="serv">serv (Servicio)</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label>Descripción del Concepto:</label>
                <textarea onchange="app.actualizarConcepto(${id}, 'descripcion', this.value)" placeholder="Describa el trabajo o suministro..." style="min-height:60px;"></textarea>
            </div>
            
            <div class="form-group">
                <label>Cantidad / Rendimiento:</label>
                <input type="number" value="1" min="0.01" step="0.01" onchange="app.actualizarConcepto(${id}, 'cantidad', this.value)">
            </div>
            
            <hr style="margin:20px 0;border:none;border-top:2px solid #ddd;">
            
            <h5 style="margin:15px 0 10px 0;color:#333;">📦 Materiales</h5>
            <div id="materiales-${id}" class="materiales-sublista"></div>
            <button type="button" onclick="app.agregarMaterial(${id})" style="background:#f5f7fa;color:#333;border:2px solid #ddd;padding:8px 15px;border-radius:8px;cursor:pointer;font-size:13px;margin:10px 0;">➕ Agregar Material</button>
            
            <h5 style="margin:15px 0 10px 0;color:#333;">👷 Mano de Obra</h5>
            <div id="mano-obra-${id}" class="mano-obra-sublista"></div>
            <button type="button" onclick="app.agregarManoObra(${id})" style="background:#f5f7fa;color:#333;border:2px solid #ddd;padding:8px 15px;border-radius:8px;cursor:pointer;font-size:13px;margin:10px 0;">➕ Agregar Mano de Obra</button>
            
            <h5 style="margin:15px 0 10px 0;color:#333;">🏗️ Maquinaria y Herramienta</h5>
            <div id="maquinaria-${id}" class="maquinaria-sublista"></div>
            <button type="button" onclick="app.agregarMaquinaria(${id})" style="background:#f5f7fa;color:#333;border:2px solid #ddd;padding:8px 15px;border-radius:8px;cursor:pointer;font-size:13px;margin:10px 0;">➕ Agregar Maquinaria</button>
            
            <div style="background:#f5f7fa;padding:15px;border-radius:10px;margin:20px 0;">
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px;">
                    <div>
                        <label style="font-size:12px;color:#666;">Costo Directo:</label>
                        <div class="concepto-costo-directo" style="font-size:18px;font-weight:700;color:#1a1a1a;">$0.00</div>
                    </div>
                    <div>
                        <label style="font-size:12px;color:#666;">Sobrecostos:</label>
                        <div class="concepto-sobrecostos" style="font-size:18px;font-weight:700;color:#FF9800;">$0.00</div>
                    </div>
                    <div>
                        <label style="font-size:12px;color:#666;">Precio Unitario:</label>
                        <div class="concepto-precio-unitario" style="font-size:18px;font-weight:700;color:#1a1a1a;">$0.00</div>
                    </div>
                    <div>
                        <label style="font-size:12px;color:#666;">Importe Total:</label>
                        <div class="concepto-importe" style="font-size:20px;font-weight:700;color:#4CAF50;">$0.00</div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(div);
        
        // Agregar sub-elementos iniciales
        this.agregarMaterial(id);
        this.agregarManoObra(id);
        this.agregarMaquinaria(id);
    },

    eliminarConcepto: function(id) {
        if (confirm('¿Eliminar este concepto?')) {
            this.datosCotizacion.conceptos = this.datosCotizacion.conceptos.filter(c => c.id !== id);
            document.querySelector(`.concepto-item[data-id="${id}"]`).remove();
            this.calcularTotalGeneral();
        }
    },

    actualizarConcepto: function(id, campo, valor) {
        const concepto = this.datosCotizacion.conceptos.find(c => c.id === id);
        if (concepto) {
            concepto[campo] = campo === 'cantidad' ? parseFloat(valor) || 0 : valor;
            this.calcularCostoConcepto(id);
        }
    },

    // ─────────────────────────────────────────────────────────────────
    // MATERIALES (Dentro de cada concepto)
    // ─────────────────────────────────────────────────────────────────
    agregarMaterial: function(conceptoId) {
        const container = document.getElementById('materiales-' + conceptoId);
        if (!container) return;
        
        const concepto = this.datosCotizacion.conceptos.find(c => c.id === conceptoId);
        const id = Date.now();
        concepto.materiales.push({ id, nombre: '', unidad: '', cantidad: 1, precioUnitario: 0, importe: 0 });
        
        const div = document.createElement('div');
        div.className = 'material-subitem';
        div.dataset.id = id;
        div.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:10px;margin:10px 0;align-items:center;';
        div.innerHTML = `
            <input type="text" placeholder="Material" onchange="app.actualizarMaterial(${conceptoId}, ${id}, 'nombre', this.value)">
            <input type="text" placeholder="Unidad" onchange="app.actualizarMaterial(${conceptoId}, ${id}, 'unidad', this.value)">
            <input type="number" placeholder="Cant." value="1" min="0.01" step="0.01" onchange="app.actualizarMaterial(${conceptoId}, ${id}, 'cantidad', this.value)">
            <input type="number" placeholder="$ Unit" value="0" min="0" step="0.01" onchange="app.actualizarMaterial(${conceptoId}, ${id}, 'precioUnitario', this.value)">
            <button onclick="app.eliminarMaterial(${conceptoId}, ${id})" style="background:#f44336;color:white;border:none;padding:8px;border-radius:6px;cursor:pointer;">🗑️</button>
        `;
        container.appendChild(div);
        this.calcularCostoConcepto(conceptoId);
    },

    actualizarMaterial: function(conceptoId, materialId, campo, valor) {
        const concepto = this.datosCotizacion.conceptos.find(c => c.id === conceptoId);
        if (concepto) {
            const material = concepto.materiales.find(m => m.id === materialId);
            if (material) {
                material[campo] = ['nombre', 'unidad'].includes(campo) ? valor : parseFloat(valor) || 0;
                material.importe = material.cantidad * material.precioUnitario;
                this.calcularCostoConcepto(conceptoId);
            }
        }
    },

    eliminarMaterial: function(conceptoId, materialId) {
        const concepto = this.datosCotizacion.conceptos.find(c => c.id === conceptoId);
        if (concepto) {
            concepto.materiales = concepto.materiales.filter(m => m.id !== materialId);
            document.querySelector(`.material-subitem[data-id="${materialId}"]`).remove();
            this.calcularCostoConcepto(conceptoId);
        }
    },

    // ─────────────────────────────────────────────────────────────────
    // MANO DE OBRA (Dentro de cada concepto)
    // ─────────────────────────────────────────────────────────────────
    agregarManoObra: function(conceptoId) {
        const container = document.getElementById('mano-obra-' + conceptoId);
        if (!container) return;
        
        const concepto = this.datosCotizacion.conceptos.find(c => c.id === conceptoId);
        const id = Date.now();
        concepto.manoObra.push({ id, concepto: '', unidad: 'h', cantidad: 1, precioUnitario: 0, importe: 0 });
        
        const div = document.createElement('div');
        div.className = 'mano-obra-subitem';
        div.dataset.id = id;
        div.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:10px;margin:10px 0;align-items:center;';
        div.innerHTML = `
            <input type="text" placeholder="Concepto" onchange="app.actualizarManoObra(${conceptoId}, ${id}, 'concepto', this.value)">
            <input type="text" placeholder="Unidad" value="h" onchange="app.actualizarManoObra(${conceptoId}, ${id}, 'unidad', this.value)">
            <input type="number" placeholder="Cant." value="1" min="0.01" step="0.01" onchange="app.actualizarManoObra(${conceptoId}, ${id}, 'cantidad', this.value)">
            <input type="number" placeholder="$ Unit" value="0" min="0" step="0.01" onchange="app.actualizarManoObra(${conceptoId}, ${id}, 'precioUnitario', this.value)">
            <button onclick="app.eliminarManoObra(${conceptoId}, ${id})" style="background:#f44336;color:white;border:none;padding:8px;border-radius:6px;cursor:pointer;">🗑️</button>
        `;
        container.appendChild(div);
        this.calcularCostoConcepto(conceptoId);
    },

    actualizarManoObra: function(conceptoId, moId, campo, valor) {
        const concepto = this.datosCotizacion.conceptos.find(c => c.id === conceptoId);
        if (concepto) {
            const mo = concepto.manoObra.find(m => m.id === moId);
            if (mo) {
                mo[campo] = ['concepto', 'unidad'].includes(campo) ? valor : parseFloat(valor) || 0;
                mo.importe = mo.cantidad * mo.precioUnitario;
                this.calcularCostoConcepto(conceptoId);
            }
        }
    },

    eliminarManoObra: function(conceptoId, moId) {
        const concepto = this.datosCotizacion.conceptos.find(c => c.id === conceptoId);
        if (concepto) {
            concepto.manoObra = concepto.manoObra.filter(m => m.id !== moId);
            document.querySelector(`.mano-obra-subitem[data-id="${moId}"]`).remove();
            this.calcularCostoConcepto(conceptoId);
        }
    },

    // ─────────────────────────────────────────────────────────────────
    // MAQUINARIA Y HERRAMIENTA (Dentro de cada concepto)
    // ─────────────────────────────────────────────────────────────────
    agregarMaquinaria: function(conceptoId) {
        const container = document.getElementById('maquinaria-' + conceptoId);
        if (!container) return;
        
        const concepto = this.datosCotizacion.conceptos.find(c => c.id === conceptoId);
        const id = Date.now();
        concepto.maquinaria.push({ id, concepto: '', unidad: 'h', cantidad: 1, precioUnitario: 0, importe: 0 });
        
        const div = document.createElement('div');
        div.className = 'maquinaria-subitem';
        div.dataset.id = id;
        div.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:10px;margin:10px 0;align-items:center;';
        div.innerHTML = `
            <input type="text" placeholder="Maquinaria/Herramienta" onchange="app.actualizarMaquinaria(${conceptoId}, ${id}, 'concepto', this.value)">
            <input type="text" placeholder="Unidad" value="h" onchange="app.actualizarMaquinaria(${conceptoId}, ${id}, 'unidad', this.value)">
            <input type="number" placeholder="Cant." value="1" min="0.01" step="0.01" onchange="app.actualizarMaquinaria(${conceptoId}, ${id}, 'cantidad', this.value)">
            <input type="number" placeholder="$ Unit" value="0" min="0" step="0.01" onchange="app.actualizarMaquinaria(${conceptoId}, ${id}, 'precioUnitario', this.value)">
            <button onclick="app.eliminarMaquinaria(${conceptoId}, ${id})" style="background:#f44336;color:white;border:none;padding:8px;border-radius:6px;cursor:pointer;">🗑️</button>
        `;
        container.appendChild(div);
        this.calcularCostoConcepto(conceptoId);
    },

    actualizarMaquinaria: function(conceptoId, maqId, campo, valor) {
        const concepto = this.datosCotizacion.conceptos.find(c => c.id === conceptoId);
        if (concepto) {
            const maq = concepto.maquinaria.find(m => m.id === maqId);
            if (maq) {
                maq[campo] = ['concepto', 'unidad'].includes(campo) ? valor : parseFloat(valor) || 0;
                maq.importe = maq.cantidad * maq.precioUnitario;
                this.calcularCostoConcepto(conceptoId);
            }
        }
    },

    eliminarMaquinaria: function(conceptoId, maqId) {
        const concepto = this.datosCotizacion.conceptos.find(c => c.id === conceptoId);
        if (concepto) {
            concepto.maquinaria = concepto.maquinaria.filter(m => m.id !== maqId);
            document.querySelector(`.maquinaria-subitem[data-id="${maqId}"]`).remove();
            this.calcularCostoConcepto(conceptoId);
        }
    },

    // ─────────────────────────────────────────────────────────────────
    // CÁLCULOS DE COSTOS
    // ─────────────────────────────────────────────────────────────────
    calcularCostoConcepto: function(conceptoId) {
        const concepto = this.datosCotizacion.conceptos.find(c => c.id === conceptoId);
        if (!concepto) return;
        
        // Costo directo = Materiales + Mano de Obra + Maquinaria
        const materialesTotal = concepto.materiales.reduce((sum, m) => sum + m.importe, 0);
        const manoObraTotal = concepto.manoObra.reduce((sum, m) => sum + m.importe, 0);
        const maquinariaTotal = concepto.maquinaria.reduce((sum, m) => sum + m.importe, 0);
        
        concepto.costoDirecto = materialesTotal + manoObraTotal + maquinariaTotal;
        
        // Sobrecostos (configurables, se calculan en calcularTotalGeneral)
        concepto.sobrecostos = 0;
        
        // Precio unitario = Costo directo + Sobrecostos
        concepto.precioUnitario = concepto.costoDirecto + concepto.sobrecostos;
        
        // Importe = Precio unitario × Cantidad
        concepto.importe = concepto.precioUnitario * concepto.cantidad;
        
        // Actualizar UI del concepto
        const div = document.querySelector(`.concepto-item[data-id="${conceptoId}"]`);
        if (div) {
            div.querySelector('.concepto-costo-directo').textContent = calculator.formatoMoneda(concepto.costoDirecto);
            div.querySelector('.concepto-sobrecostos').textContent = calculator.formatoMoneda(concepto.sobrecostos);
            div.querySelector('.concepto-precio-unitario').textContent = calculator.formatoMoneda(concepto.precioUnitario);
            div.querySelector('.concepto-importe').textContent = calculator.formatoMoneda(concepto.importe);
        }
        
        this.calcularTotalGeneral();
    },

    calcularTotalGeneral: function() {
        const conceptos = this.datosCotizacion.conceptos;
        
        // Suma de importes de todos los conceptos
        const subtotal = conceptos.reduce((sum, c) => sum + c.importe, 0);
        
        // Sobrecostos globales (porcentajes configurables)
        const indirectosPorcentaje = parseFloat(document.getElementById('sobrecostos-indirectos')?.value) || 15;
        const financiamientoPorcentaje = parseFloat(document.getElementById('sobrecostos-financiamiento')?.value) || 3;
        const utilidadPorcentaje = parseFloat(document.getElementById('sobrecostos-utilidad')?.value) || 10;
        const cargosAdicionales = parseFloat(document.getElementById('sobrecostos-cargos')?.value) || 0;
        
        const indirectos = subtotal * (indirectosPorcentaje / 100);
        const financiamiento = subtotal * (financiamientoPorcentaje / 100);
        const utilidad = subtotal * (utilidadPorcentaje / 100);
        
        const baseImponible = subtotal + indirectos + financiamiento + utilidad + cargosAdicionales;
        const ivaPorcentaje = parseFloat(document.getElementById('iva-porcentaje')?.value) || 16;
        const iva = baseImponible * (ivaPorcentaje / 100);
        const total = baseImponible + iva;
        
        // Actualizar UI de totales
        document.getElementById('total-subtotal').textContent = calculator.formatoMoneda(subtotal);
        document.getElementById('total-indirectos').textContent = calculator.formatoMoneda(indirectos) + ' (' + indirectosPorcentaje + '%)';
        document.getElementById('total-financiamiento').textContent = calculator.formatoMoneda(financiamiento) + ' (' + financiamientoPorcentaje + '%)';
        document.getElementById('total-utilidad').textContent = calculator.formatoMoneda(utilidad) + ' (' + utilidadPorcentaje + '%)';
        document.getElementById('total-cargos').textContent = calculator.formatoMoneda(cargosAdicionales);
        document.getElementById('total-iva').textContent = calculator.formatoMoneda(iva) + ' (' + ivaPorcentaje + '%)';
        document.getElementById('total-final').textContent = calculator.formatoMoneda(total);
        
        // SmartMargin warnings
        this.verificarSmartMargin({ subtotal, indirectos, utilidad, total, margenUtilidad: utilidadPorcentaje });
    },

    verificarSmartMargin: function(resultado) {
        const warning = document.getElementById('smartmargin-warning');
        if (!warning) return;
        
        const alertas = [];
        
        if (resultado.margenUtilidad < 10) {
            alertas.push('⚠️ Utilidad menor al 10% recomendado para industria.');
        }
        if (resultado.indirectos === 0) {
            alertas.push('⚠️ No se incluyeron costos indirectos.');
        }
        if (resultado.subtotal > 0 && (resultado.utilidad / resultado.subtotal) < 0.05) {
            alertas.push('⚠️ Margen de utilidad muy bajo (< 5%).');
        }
        
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
        const limite = await window.licencia.verificarLimite();
        if (!limite.permitido) {
            alert('⚠️ ' + limite.razon);
            return;
        }
        
        const clienteId = document.getElementById('cot-cliente').value;
        const descripcion = document.getElementById('cot-descripcion').value;
        const ubicacion = document.getElementById('cot-ubicacion').value;
        
        if (!clienteId || !descripcion) {
            alert('⚠️ Completa cliente y descripción del proyecto');
            return;
        }
        
        if (this.datosCotizacion.conceptos.length === 0) {
            alert('⚠️ Agrega al menos un concepto');
            return;
        }
        
        // Calcular totales finales
        const subtotal = this.datosCotizacion.conceptos.reduce((sum, c) => sum + c.importe, 0);
        const indirectosPorcentaje = parseFloat(document.getElementById('sobrecostos-indirectos')?.value) || 15;
        const financiamientoPorcentaje = parseFloat(document.getElementById('sobrecostos-financiamiento')?.value) || 3;
        const utilidadPorcentaje = parseFloat(document.getElementById('sobrecostos-utilidad')?.value) || 10;
        const cargosAdicionales = parseFloat(document.getElementById('sobrecostos-cargos')?.value) || 0;
        const ivaPorcentaje = parseFloat(document.getElementById('iva-porcentaje')?.value) || 16;
        
        const indirectos = subtotal * (indirectosPorcentaje / 100);
        const financiamiento = subtotal * (financiamientoPorcentaje / 100);
        const utilidad = subtotal * (utilidadPorcentaje / 100);
        const baseImponible = subtotal + indirectos + financiamiento + utilidad + cargosAdicionales;
        const iva = baseImponible * (ivaPorcentaje / 100);
        const total = baseImponible + iva;
        
        const cotizacion = {
            clienteId: clienteId,
            descripcion: descripcion,
            ubicacion: ubicacion,
            conceptos: this.datosCotizacion.conceptos,
            sobrecostos: {
                indirectosPorcentaje,
                financiamientoPorcentaje,
                utilidadPorcentaje,
                cargosAdicionales
            },
            ivaPorcentaje,
            subtotal,
            indirectos,
            financiamiento,
            utilidad,
            cargosAdicionales,
            baseImponible,
            iva,
            totalFinal: total,
            margenUtilidad: utilidadPorcentaje,
            fecha: new Date().toISOString(),
            estado: 'pendiente'
        };
        
        await dbCotizaciones.guardar(cotizacion);
        alert('✅ Cotización guardada exitosamente');
        
        // Resetear
        this.datosCotizacion = { conceptos: [], sobrecostos: [] };
        document.getElementById('conceptos-lista').innerHTML = '';
        this.agregarConcepto();
        this.calcularTotalGeneral();
        
        await this.cargarEstadisticas();
        this.mostrarPantalla('dashboard-screen');
    },

    // ─────────────────────────────────────────────────────────────────
    // CLIENTES (Modal Rápido)
    // ─────────────────────────────────────────────────────────────────
    mostrarModalCliente: function() {
        document.getElementById('modal-cliente').style.display = 'flex';
        document.getElementById('modal-cliente-nombre').focus();
    },

    cerrarModalCliente: function() {
        document.getElementById('modal-cliente').style.display = 'none';
        document.getElementById('modal-cliente-nombre').value = '';
        document.getElementById('modal-cliente-email').value = '';
        document.getElementById('modal-cliente-telefono').value = '';
        document.getElementById('modal-cliente-notas').value = '';
    },

    guardarClienteRapido: async function() {
        const nombre = document.getElementById('modal-cliente-nombre').value.trim();
        const email = document.getElementById('modal-cliente-email').value.trim();
        const telefono = document.getElementById('modal-cliente-telefono').value.trim();
        const notas = document.getElementById('modal-cliente-notas').value.trim();
        
        if (!nombre) {
            alert('⚠️ El nombre del cliente es obligatorio');
            return;
        }
        
        try {
            const clienteId = await dbClientes.guardar({ nombre, email, telefono, notas });
            await this.cargarClientesSelect();
            document.getElementById('cot-cliente').value = clienteId;
            this.cerrarModalCliente();
            alert('✅ Cliente guardado y seleccionado');
        } catch (error) {
            alert('❌ Error al guardar cliente: ' + error.message);
        }
    },

    verificarClientesDisponibles: async function() {
        const clientes = await dbClientes.obtenerTodos();
        const select = document.getElementById('cot-cliente');
        const mensaje = document.getElementById('sin-clientes-msg');
        
        if (clientes.length === 0) {
            if (mensaje) mensaje.style.display = 'block';
            select.disabled = true;
            
            if (!document.getElementById('alerta-sin-clientes')) {
                const alerta = document.createElement('div');
                alerta.className = 'alert alert-warning';
                alerta.id = 'alerta-sin-clientes';
                alerta.innerHTML = '<strong>⚠️ No hay clientes registrados</strong><br>Primero debes agregar al menos un cliente para crear una cotización.';
                select.parentElement.insertBefore(alerta, select);
            }
            
            setTimeout(() => {
                this.mostrarModalCliente();
            }, 1000);
        } else {
            if (mensaje) mensaje.style.display = 'none';
            select.disabled = false;
            const alertaExistente = document.getElementById('alerta-sin-clientes');
            if (alertaExistente) alertaExistente.remove();
        }
    },

    cargarClientesSelect: async function() {
        const clientes = await dbClientes.obtenerTodos();
        const select = document.getElementById('cot-cliente');
        if (select) {
            select.innerHTML = '<option value="">Seleccionar cliente...</option>' +
                clientes.map(c => '<option value="' + c.id + '">' + c.nombre + '</option>').join('');
        }
    },

    cargarHistorial: async function() {
        const cotizaciones = await dbCotizaciones.obtenerTodas();
        const clientes = await dbClientes.obtenerTodos();
        
        const tbody = document.getElementById('historial-tabla');
        if (!tbody) return;
        
        tbody.innerHTML = cotizaciones.map(c => {
            const cliente = clientes.find(cl => cl.id == c.clienteId);
            return '<tr>' +
                '<td>' + new Date(c.fecha).toLocaleDateString('es-MX') + '</td>' +
                '<td>' + (cliente ? cliente.nombre : 'N/A') + '</td>' +
                '<td>' + c.descripcion + '</td>' +
                '<td>' + calculator.formatoMoneda(c.totalFinal) + '</td>' +
                '<td>' + c.margenUtilidad.toFixed(1) + '%</td>' +
                '<td>' +
                '<button onclick="alert(\'Próximamente: Ver detalle\')" style="padding:5px 10px;border:none;border-radius:5px;cursor:pointer;">👁️</button>' +
                '</td>' +
                '</tr>';
        }).join('');
    },

    cargarClientesTabla: async function() {
        const clientes = await dbClientes.obtenerTodos();
        const tbody = document.getElementById('clientes-tabla');
        if (!tbody) return;
        
        tbody.innerHTML = clientes.map(c => '<tr>' +
            '<td>' + c.nombre + '</td>' +
            '<td>' + (c.email || 'N/A') + '</td>' +
            '<td>' + (c.telefono || 'N/A') + '</td>' +
            '<td>' +
            '<button onclick="alert(\'Próximamente: Editar\')" style="padding:5px 10px;border:none;border-radius:5px;cursor:pointer;">✏️</button>' +
            '<button onclick="app.eliminarCliente(' + c.id + ')" style="padding:5px 10px;border:none;border-radius:5px;background:#f44336;color:white;cursor:pointer;">🗑️</button>' +
            '</td>' +
            '</tr>').join('');
    },

    guardarCliente: async function() {
        const nombre = document.getElementById('cliente-nombre').value.trim();
        const email = document.getElementById('cliente-email').value.trim();
        const telefono = document.getElementById('cliente-telefono').value.trim();
        const notas = document.getElementById('cliente-notas').value.trim();
        
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
        alert('🚧 Próximamente: Generar PDF de Análisis de Precios Unitarios');
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
