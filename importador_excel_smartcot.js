// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - IMPORTADOR EXCEL (VERSIÓN CORREGIDA)
// Basado en estructura REAL de tu archivo
// ─────────────────────────────────────────────────────────────────────

console.log('📥 importador_excel_smartcot.js cargado - Versión Corregida');

window.importadorSmartCot = {
    
    estadisticas: {
        conceptos: 0,
        materiales: 0,
        manoObra: 0,
        equipos: 0,
        errores: 0
    },
    
    // ─────────────────────────────────────────────────────────────────
    // IMPORTAR ARCHIVO
    // ─────────────────────────────────────────────────────────────────
    importarArchivo: async function(file) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('📥 Iniciando importación...', file.name);
                console.log('📊 Tamaño del archivo:', file.size, 'bytes');
                
                const reader = new FileReader();
                
                reader.onload = async (e) => {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        
                        console.log('📚 Hojas encontradas:', workbook.SheetNames);
                        
                        // Leer primera hoja
                        const sheet = workbook.Sheets[workbook.SheetNames[0]];
                        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                        
                        console.log('📊 Filas leídas:', json.length);
                        console.log('📋 Primera fila:', json[0]);
                        console.log('📋 Segunda fila:', json[1]);
                        console.log('📋 Tercera fila:', json[2]);
                        
                        // Procesar datos
                        const resultado = await this.procesarDatos(json);
                        
                        console.log('✅ Procesamiento completado:', resultado);
                        
                        // Importar a IndexedDB
                        await this.importarADB(resultado);
                        
                        resolve(resultado);
                        
                    } catch (error) {
                        console.error('❌ Error procesando Excel:', error);
                        console.error('Stack:', error.stack);
                        reject(error);
                    }
                };
                
                reader.onerror = () => {
                    console.error('❌ Error leyendo archivo');
                    reject(new Error('Error leyendo archivo'));
                };
                
                reader.readAsArrayBuffer(file);
                
            } catch (error) {
                console.error('❌ Error en importador:', error);
                reject(error);
            }
        });
    },
    
    // ─────────────────────────────────────────────────────────────────
    // PROCESAR DATOS (ESTRUCTURA REAL)
    // ─────────────────────────────────────────────────────────────────
    procesarDatos: function(rows) {
        const conceptos = new Map();
        const materiales = new Map();
        const manoObra = new Map();
        const equipos = new Map();
        
        let conceptoActual = null;
        let filaProcesada = 0;
        
        console.log('🔄 Procesando', rows.length, 'filas...');
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            // Saltar filas vacías
            if (!row || row.length < 3) continue;
            
            // Saltar encabezados y filas de empresa
            const celdaB = (row[1] || '').toString().trim();
            if (!celdaB || 
                celdaB.includes('SU EMPRESA') || 
                celdaB.includes('Cliente:') ||
                celdaB.includes('Obra:') ||
                celdaB.includes('Lugar:') ||
                celdaB.includes('PROGRAMA') ||
                celdaB.includes('Concurso')) {
                continue;
            }
            
            filaProcesada++;
            
            // Detectar si es fila de CONCEPTO
            // Los conceptos tienen códigos como: 12209-787, 10303-511, etc.
            const esConcepto = this.esFilaConcepto(celdaB);
            
            if (esConcepto) {
                // Guardar concepto anterior si existe
                if (conceptoActual) {
                    conceptos.set(conceptoActual.codigo, conceptoActual);
                }
                
                // Crear nuevo concepto
                // Estructura: Columna B = Código, Columna C = Descripción, Columna D = Unidad
                conceptoActual = {
                    id: 'CONCEPTO-' + Date.now() + '-' + conceptos.size,
                    codigo: celdaB,
                    categoria: this.detectarCategoria(celdaB, row[2]),
                    subcategoria: this.detectarSubcategoria(celdaB, row[2]),
                    descripcion_corta: this.extraerDescripcionCorta(row[2]),
                    descripcion_tecnica: row[2] || '',
                    unidad: row[3] || 'PZA',
                    rendimiento_base: 100, // Default, se calculará después
                    factores_aplicables: this.detectarFactores(celdaB, row[2]),
                    riesgo_nivel: this.detectarRiesgo(celdaB, row[2]),
                    activo: true,
                    recursos: {
                        materiales: [],
                        mano_obra: [],
                        equipos: [],
                        herramienta: []
                    },
                    costos_base: {
                        costo_material: 0,
                        costo_mano_obra: 0,
                        costo_equipo: 0
                    },
                    metadata: {
                        creado_por: 'Importación Excel',
                        version: '1.0',
                        fecha_creacion: new Date().toISOString(),
                        fila_original: i
                    }
                };
                
                console.log('✅ Concepto detectado:', conceptoActual.codigo, conceptoActual.descripcion_corta);
                
            } else if (conceptoActual) {
                // Es subpartida del concepto actual
                // Estructura: Columna B = Código, Columna C = Descripción, Columna D = Unidad, Columna E = Cantidad, Columna F = Precio, Columna G = Importe
                
                const codigo = (row[1] || '').toString().trim();
                const descripcion = (row[2] || '').toString().trim();
                const unidad = (row[3] || '').toString().trim();
                const cantidad = parseFloat(row[4]) || 0;
                const precio = parseFloat((row[5] || '0').toString().replace(',', '')) || 0;
                const importe = parseFloat((row[6] || '0').toString().replace(',', '')) || 0;
                
                if (!codigo || cantidad === 0) continue;
                
                const tipo = this.detectarTipoSubpartida(codigo);
                
                if (tipo === 'material') {
                    // Agregar a materiales
                    if (!materiales.has(codigo)) {
                        materiales.set(codigo, {
                            id: 'MAT-' + codigo,
                            codigo: codigo,
                            nombre: descripcion,
                            descripcion_tecnica: descripcion,
                            categoria: conceptoActual.categoria,
                            unidad: unidad,
                            precio_base: precio,
                            moneda: 'MXN',
                            activo: true
                        });
                    }
                    
                    conceptoActual.recursos.materiales.push({
                        material_codigo: codigo,
                        nombre: descripcion,
                        cantidad: cantidad,
                        unidad: unidad,
                        precio_unitario: precio,
                        importe: importe,
                        desperdicio_porcentaje: 5
                    });
                    
                    conceptoActual.costos_base.costo_material += importe;
                    
                } else if (tipo === 'mano_obra') {
                    // Agregar a mano de obra
                    if (!manoObra.has(codigo)) {
                        manoObra.set(codigo, {
                            id: 'MO-' + codigo,
                            codigo: codigo,
                            puesto: descripcion,
                            especialidad: this.detectarEspecialidad(codigo, descripcion),
                            salario_diario: precio,
                            salario_hora: precio / 8,
                            prestaciones_porcentaje: 35,
                            categoria: 'Eléctrico',
                            activo: true
                        });
                    }
                    
                    conceptoActual.recursos.mano_obra.push({
                        mano_obra_codigo: codigo,
                        puesto: descripcion,
                        horas_jornada: cantidad * 8,
                        salario_hora: precio / 8,
                        prestaciones_porcentaje: 35,
                        importe: importe
                    });
                    
                    conceptoActual.costos_base.costo_mano_obra += importe;
                    
                } else if (tipo === 'equipo') {
                    // Agregar a equipos
                    if (!equipos.has(codigo)) {
                        equipos.set(codigo, {
                            id: 'EQUIP-' + codigo,
                            codigo: codigo,
                            nombre: descripcion,
                            tipo: 'Equipo',
                            costo_renta_dia: precio,
                            costo_propiedad_dia: precio * 0.35,
                            operador_requerido: this.requiereOperador(codigo),
                            categoria: this.detectarCategoriaEquipo(codigo),
                            activo: true
                        });
                    }
                    
                    conceptoActual.recursos.equipos.push({
                        equipo_codigo: codigo,
                        nombre: descripcion,
                        horas: cantidad,
                        costo_unitario: precio,
                        importe: importe
                    });
                    
                    conceptoActual.costos_base.costo_equipo += importe;
                    
                } else if (tipo === 'herramienta') {
                    // Herramienta menor (porcentaje)
                    conceptoActual.recursos.herramienta.push({
                        nombre: descripcion,
                        tipo: 'herramienta',
                        porcentaje: cantidad,
                        importe: importe
                    });
                    
                    conceptoActual.costos_base.costo_equipo += importe;
                }
            }
        }
        
        // Guardar último concepto
        if (conceptoActual) {
            conceptos.set(conceptoActual.codigo, conceptoActual);
        }
        
        console.log('✅ Procesamiento completado:');
        console.log('   - Conceptos:', conceptos.size);
        console.log('   - Materiales:', materiales.size);
        console.log('   - Mano de Obra:', manoObra.size);
        console.log('   - Equipos:', equipos.size);
        console.log('   - Filas procesadas:', filaProcesada);
        
        this.estadisticas = {
            conceptos: conceptos.size,
            materiales: materiales.size,
            manoObra: manoObra.size,
            equipos: equipos.size,
            errores: 0
        };
        
        return {
            conceptos: Array.from(conceptos.values()),
            materiales: Array.from(materiales.values()),
            manoObra: Array.from(manoObra.values()),
            equipos: Array.from(equipos.values()),
            estadisticas: this.estadisticas
        };
    },
    
    // ─────────────────────────────────────────────────────────────────
    // FUNCIONES DE DETECCIÓN
    // ─────────────────────────────────────────────────────────────────
    
    esFilaConcepto: function(codigo) {
        // Los conceptos tienen códigos numéricos tipo 12209-787, 10303-511, etc.
        return /^\d{5}-\d{3}$/.test(codigo) || /^\d{5}-\d{4}$/.test(codigo);
    },
    
    detectarTipoSubpartida: function(codigo) {
        if (!codigo) return 'desconocido';
        
        if (codigo.startsWith('MO')) return 'mano_obra';
        if (codigo.startsWith('%MO')) return 'herramienta';
        if (codigo.startsWith('CF')) return 'equipo';
        if (codigo.startsWith('LL')) return 'equipo';
        
        return 'material';
    },
    
    detectarCategoria: function(codigo, descripcion) {
        const desc = (descripcion || '').toLowerCase();
        
        if (desc.includes('eléctric') || desc.includes('cable') || desc.includes('conduit') || 
            desc.includes('tablero') || desc.includes('contacto') || desc.includes('ilumin')) {
            return 'Eléctrico';
        }
        if (desc.includes('mecánic') || desc.includes('tubería') || desc.includes('válvula') ||
            desc.includes('bomba') || desc.includes('soldad') || desc.includes('estructura')) {
            return 'Mecánico';
        }
        if (desc.includes('ducto') || desc.includes('charola') || desc.includes('ventil')) {
            return 'HVAC';
        }
        if (desc.includes('pint') || desc.includes('limpiez') || desc.includes('acabado')) {
            return 'Acabados';
        }
        if (desc.includes('desmont') || desc.includes('demolic')) {
            return 'Desmontaje';
        }
        
        return 'General';
    },
    
    detectarSubcategoria: function(codigo, descripcion) {
        const desc = (descripcion || '').toLowerCase();
        
        if (desc.includes('conduit') || desc.includes('tubería')) return 'Canalización';
        if (desc.includes('cable')) return 'Cableado';
        if (desc.includes('tablero')) return 'Tableros';
        if (desc.includes('charola')) return 'Soportería';
        if (desc.includes('ducto')) return 'Ductos';
        if (desc.includes('válvula')) return 'Válvulas';
        if (desc.includes('bomba')) return 'Bombas';
        if (desc.includes('soldad')) return 'Soldadura';
        if (desc.includes('estructura')) return 'Estructuras';
        if (desc.includes('pint')) return 'Pintura';
        if (desc.includes('desmont')) return 'Desmontaje';
        if (desc.includes('contacto')) return 'Contactos';
        if (desc.includes('ilumin')) return 'Iluminación';
        
        return 'General';
    },
    
    detectarEspecialidad: function(codigo, descripcion) {
        const desc = (descripcion || '').toLowerCase();
        
        if (desc.includes('eléctric')) return 'Eléctrico';
        if (desc.includes('plom')) return 'Plomería';
        if (desc.includes('herr')) return 'Herrería';
        if (desc.includes('soldad')) return 'Soldadura';
        if (desc.includes('pint')) return 'Pintura';
        if (desc.includes('operador')) return 'Operador';
        
        return 'General';
    },
    
    detectarCategoriaEquipo: function(codigo) {
        if (codigo.includes('GRUA')) return 'Izaje';
        if (codigo.includes('CORTE')) return 'Corte';
        if (codigo.includes('PLAN') || codigo.includes('SOLDAR')) return 'Soldadura';
        if (codigo.includes('TORRE') || codigo.includes('ANDAMIO')) return 'Acceso';
        
        return 'General';
    },
    
    requiereOperador: function(codigo) {
        return codigo.includes('GRUA') || codigo.includes('OPERADOR');
    },
    
    detectarFactores: function(codigo, descripcion) {
        const factores = [];
        const desc = (descripcion || '').toLowerCase();
        
        if (desc.includes('altura') || desc.includes('elevacion')) factores.push('altura');
        if (desc.includes('andamio')) factores.push('andamios');
        if (desc.includes('grúa') || desc.includes('grua')) factores.push('izaje');
        
        return factores.join(',');
    },
    
    detectarRiesgo: function(codigo, descripcion) {
        const desc = (descripcion || '').toLowerCase();
        
        if (desc.includes('peligro') || desc.includes('alto voltaje')) return 'alto';
        if (desc.includes('riesgo') || desc.includes('precaución')) return 'medio';
        
        return 'bajo';
    },
    
    extraerDescripcionCorta: function(descripcion) {
        if (!descripcion) return '';
        const corta = descripcion.substring(0, 80);
        return corta;
    },
    
    // ─────────────────────────────────────────────────────────────────
    // IMPORTAR A INDEXEDDB
    // ─────────────────────────────────────────────────────────────────
    importarADB: async function(datos) {
        console.log('💾 Importando a IndexedDB...');
        
        const reporte = {
            conceptos: { total: datos.conceptos.length, exitosos: 0, fallidos: 0 },
            materiales: { total: datos.materiales.length, exitosos: 0, fallidos: 0 },
            manoObra: { total: datos.manoObra.length, exitosos: 0, fallidos: 0 },
            equipos: { total: datos.equipos.length, exitosos: 0, fallidos: 0 }
        };
        
        // Importar conceptos
        for (const concepto of datos.conceptos) {
            try {
                await db.conceptos.put(concepto);
                reporte.conceptos.exitosos++;
            } catch (error) {
                console.error('❌ Error importando concepto:', concepto.codigo, error);
                reporte.conceptos.fallidos++;
            }
        }
        
        // Importar materiales
        for (const material of datos.materiales) {
            try {
                await db.materiales.put(material);
                reporte.materiales.exitosos++;
            } catch (error) {
                console.error('❌ Error importando material:', material.codigo, error);
                reporte.materiales.fallidos++;
            }
        }
        
        // Importar mano de obra
        for (const mo of datos.manoObra) {
            try {
                await db.manoObra.put(mo);
                reporte.manoObra.exitosos++;
            } catch (error) {
                console.error('❌ Error importando MO:', mo.codigo, error);
                reporte.manoObra.fallidos++;
            }
        }
        
        // Importar equipos
        for (const equipo of datos.equipos) {
            try {
                await db.equipos.put(equipo);
                reporte.equipos.exitosos++;
            } catch (error) {
                console.error('❌ Error importando equipo:', equipo.codigo, error);
                reporte.equipos.fallidos++;
            }
        }
        
        console.log('✅ Importación completada:', reporte);
        return reporte;
    },
    
    // ─────────────────────────────────────────────────────────────────
    // INTERFAZ DE USUARIO
    // ─────────────────────────────────────────────────────────────────
    mostrarUI: function() {
        const html = `
            <div style="background:white;padding:30px;border-radius:15px;box-shadow:0 4px 20px rgba(0,0,0,0.1);max-width:700px;margin:50px auto;">
                <h2 style="color:#1a1a1a;margin:0 0 20px 0;">📥 Importar Catálogo desde Excel</h2>
                
                <div style="background:#E3F2FD;padding:20px;border-radius:10px;margin:20px 0;">
                    <h4 style="color:#1565C0;margin:0 0 10px 0;">📋 Instrucciones:</h4>
                    <ol style="color:#555;margin:0;padding-left:20px;">
                        <li>Selecciona tu archivo Excel de APU</li>
                        <li>El sistema detectará automáticamente conceptos y subpartidas</li>
                        <li>Se importarán: conceptos, materiales, mano de obra, equipos</li>
                        <li>Abre la consola (F12) para ver el progreso</li>
                    </ol>
                </div>
                
                <div class="form-group">
                    <label>Archivo Excel:</label>
                    <input type="file" id="excel-file" accept=".xlsx,.xls" style="width:100%;padding:14px;border:2px solid #ddd;border-radius:10px;">
                </div>
                
                <div id="import-progress" style="display:none;background:#f5f7fa;padding:20px;border-radius:10px;margin:20px 0;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
                        <span>Progreso:</span>
                        <span id="progress-percent">0%</span>
                    </div>
                    <div style="background:#ddd;height:10px;border-radius:5px;overflow:hidden;">
                        <div id="progress-bar" style="background:#4CAF50;height:100%;width:0%;transition:width 0.3s;"></div>
                    </div>
                    <div id="progress-status" style="margin-top:10px;color:#666;font-size:14px;"></div>
                    <div id="progress-log" style="margin-top:10px;color:#999;font-size:12px;max-height:150px;overflow-y:auto;"></div>
                </div>
                
                <div id="import-result" style="display:none;background:#E8F5E9;padding:20px;border-radius:10px;margin:20px 0;"></div>
                
                <div style="display:flex;gap:15px;flex-wrap:wrap;margin-top:20px;">
                    <button onclick="importadorSmartCot.iniciarImportacion()" class="btn btn-primary" style="flex:1;padding:16px;">🚀 Iniciar Importación</button>
                    <button onclick="document.getElementById('import-ui').remove()" class="btn btn-secondary" style="flex:1;padding:16px;">❌ Cancelar</button>
                </div>
            </div>
        `;
        
        const container = document.createElement('div');
        container.id = 'import-ui';
        container.innerHTML = html;
        document.body.appendChild(container);
        
        document.getElementById('excel-file').addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                console.log('📁 Archivo seleccionado:', e.target.files[0].name);
            }
        });
    },
    
    iniciarImportacion: async function() {
        const fileInput = document.getElementById('excel-file');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('⚠️ Por favor selecciona un archivo Excel');
            return;
        }
        
        document.getElementById('import-progress').style.display = 'block';
        this.log('📥 Leyendo archivo...');
        
        try {
            this.actualizarProgreso(10, 'Procesando datos...');
            
            const resultado = await this.importarArchivo(file);
            
            this.actualizarProgreso(90, 'Finalizando...');
            
            this.mostrarResultado(resultado);
            
            this.actualizarProgreso(100, '✅ Completado');
            
        } catch (error) {
            console.error('❌ Error en importación:', error);
            alert('❌ Error en importación: ' + error.message);
            this.log('❌ Error: ' + error.message);
        }
    },
    
    log: function(mensaje) {
        const logDiv = document.getElementById('progress-log');
        if (logDiv) {
            logDiv.innerHTML += '<div>' + mensaje + '</div>';
            logDiv.scrollTop = logDiv.scrollHeight;
        }
        console.log(mensaje);
    },
    
    actualizarProgreso: function(percent, status) {
        document.getElementById('progress-percent').textContent = percent + '%';
        document.getElementById('progress-bar').style.width = percent + '%';
        document.getElementById('progress-status').textContent = status;
        this.log(status);
    },
    
    mostrarResultado: function(reporte) {
        const resultDiv = document.getElementById('import-result');
        resultDiv.style.display = 'block';
        
        const r = reporte.estadisticas;
        resultDiv.innerHTML = `
            <h4 style="color:#2E7D32;margin:0 0 15px 0;">✅ Importación Completada</h4>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px;">
                <div style="background:white;padding:15px;border-radius:8px;">
                    <div style="font-size:24px;font-weight:700;color:#1a1a1a;">${r.conceptos}</div>
                    <div style="font-size:13px;color:#666;">Conceptos</div>
                </div>
                <div style="background:white;padding:15px;border-radius:8px;">
                    <div style="font-size:24px;font-weight:700;color:#1a1a1a;">${r.materiales}</div>
                    <div style="font-size:13px;color:#666;">Materiales</div>
                </div>
                <div style="background:white;padding:15px;border-radius:8px;">
                    <div style="font-size:24px;font-weight:700;color:#1a1a1a;">${r.manoObra}</div>
                    <div style="font-size:13px;color:#666;">Mano de Obra</div>
                </div>
                <div style="background:white;padding:15px;border-radius:8px;">
                    <div style="font-size:24px;font-weight:700;color:#1a1a1a;">${r.equipos}</div>
                    <div style="font-size:13px;color:#666;">Equipos</div>
                </div>
            </div>
            <button onclick="window.location.reload()" class="btn btn-primary" style="margin-top:20px;width:100%;padding:14px;">🔄 Recargar Página</button>
        `;
    }
};

console.log('✅ importador_excel_smartcot.js listo - Versión Corregida');
