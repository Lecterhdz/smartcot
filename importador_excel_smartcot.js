// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - IMPORTADOR EXCEL (VERSIÓN CORREGIDA PARA TU ARCHIVO)
// Basado en estructura REAL: Relacion de Rendimientos de Insumos_ExplosiónXConceptoconimporte.xlsx
// ─────────────────────────────────────────────────────────────────────

console.log('📥 importador_excel_smartcot.js cargado - Versión Corregida');

window.importadorSmartCot = {
    
    estadisticas: {
        conceptos: 0,
        materiales: 0,
        manoObra: 0,
        equipos: 0,
        filasProcesadas: 0,
        filasSaltadas: 0,
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
                        
                        // Mostrar primeras 20 filas para debug
                        for (let i = 0; i < Math.min(20, json.length); i++) {
                            console.log(`Fila ${i}:`, json[i]);
                        }
                        
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
    // PROCESAR DATOS (ESTRUCTURA REAL DE TU EXCEL)
    // ─────────────────────────────────────────────────────────────────
    procesarDatos: function(rows) {
        const conceptos = new Map();
        const materiales = new Map();
        const manoObra = new Map();
        const equipos = new Map();
        
        let conceptoActual = null;
        let filasProcesadas = 0;
        let filasSaltadas = 0;
        
        console.log('🔄 Procesando', rows.length, 'filas...');
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            // Saltar filas vacías
            if (!row || row.length < 2) {
                filasSaltadas++;
                continue;
            }
            
            // Obtener código (Columna B - índice 1)
            let codigo = (row[1] || '').toString().trim();
            
            // Limpiar código de espacios y caracteres raros
            codigo = codigo.replace(/\s+/g, ' ').trim();
            
            // Saltar filas de encabezado/empresa
            if (!codigo || 
                codigo.includes('SU EMPRESA') || 
                codigo.includes('Cliente:') ||
                codigo.includes('Obra:') ||
                codigo.includes('Lugar:') ||
                codigo.includes('Ciudad:') ||
                codigo.includes('PROGRAMA') ||
                codigo.includes('Concurso') ||
                codigo.includes('Fecha:') ||
                codigo.includes('Duración') ||
                codigo.includes('Inicio') ||
                codigo.includes('Fin')) {
                filasSaltadas++;
                continue;
            }
            
            filasProcesadas++;
            
            // Detectar si es fila de CONCEPTO
            // Los conceptos tienen códigos como: 12209-787, 12507-098, 10502-090, etc.
            const esConcepto = this.esFilaConcepto(codigo);
            
            if (esConcepto) {
                // Guardar concepto anterior si existe
                if (conceptoActual) {
                    conceptos.set(conceptoActual.codigo, conceptoActual);
                    this.estadisticas.conceptos++;
                    console.log('✅ Concepto guardado:', conceptoActual.codigo, conceptoActual.descripcion_corta);
                }
                
                // Obtener descripción (Columna C - índice 2)
                const descripcion = (row[2] || '').toString().trim();
                
                // Obtener unidad (Columna A o D - índice 0 o 3)
                const unidad = (row[0] || row[3] || 'PZA').toString().trim();
                
                // Crear nuevo concepto
                conceptoActual = {
                    id: 'CONCEPTO-' + Date.now() + '-' + conceptos.size,
                    codigo: codigo,
                    categoria: this.detectarCategoria(codigo, descripcion),
                    subcategoria: this.detectarSubcategoria(codigo, descripcion),
                    descripcion_corta: this.extraerDescripcionCorta(descripcion),
                    descripcion_tecnica: descripcion,
                    unidad: unidad,
                    rendimiento_base: 100,
                    factores_aplicables: this.detectarFactores(codigo, descripcion),
                    riesgo_nivel: this.detectarRiesgo(codigo, descripcion),
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
                
            } else if (conceptoActual && codigo) {
                // Es subpartida del concepto actual
                // Obtener datos de la subpartida
                const descripcion = (row[2] || '').toString().trim();
                const unidad = (row[3] || '').toString().trim();
                const cantidad = parseFloat((row[4] || '0').toString().replace(',', '')) || 0;
                const precio = parseFloat((row[5] || '0').toString().replace(',', '')) || 0;
                const importe = parseFloat((row[6] || '0').toString().replace(',', '')) || 0;
                
                if (cantidad === 0 && precio === 0) {
                    filasSaltadas++;
                    continue;
                }
                
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
            this.estadisticas.conceptos++;
            console.log('✅ Último concepto guardado:', conceptoActual.codigo);
        }
        
        console.log('✅ Procesamiento completado:');
        console.log('   - Conceptos:', conceptos.size);
        console.log('   - Materiales:', materiales.size);
        console.log('   - Mano de Obra:', manoObra.size);
        console.log('   - Equipos:', equipos.size);
        console.log('   - Filas procesadas:', filasProcesadas);
        console.log('   - Filas saltadas:', filasSaltadas);
        
        this.estadisticas = {
            conceptos: conceptos.size,
            materiales: materiales.size,
            manoObra: manoObra.size,
            equipos: equipos.size,
            filasProcesadas: filasProcesadas,
            filasSaltadas: filasSaltadas,
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
    // FUNCIONES DE DETECCIÓN (CORREGIDAS)
    // ─────────────────────────────────────────────────────────────────
    
    esFilaConcepto: function(codigo) {
        if (!codigo) return false;
        
        // Los conceptos tienen códigos numéricos tipo 12209-787, 12507-098, 10502-090, etc.
        // Patrón: 5 dígitos - 3 dígitos
        const patronConcepto = /^\d{5}-\d{3}$/;
        
        // Las subpartidas tienen códigos como: MO031, 342-SQD-3518, %MO1, CFGRUA, etc.
        const patronSubpartida = /^(MO|LL|CF|%)/i;
        
        if (patronConcepto.test(codigo)) {
            console.log('📋 Concepto detectado:', codigo);
            return true;
        }
        
        if (patronSubpartida.test(codigo)) {
            return false;
        }
        
        // Si tiene guión pero no es patrón de concepto, probablemente es material
        if (codigo.includes('-')) {
            return false;
        }
        
        return false;
    },
    
    detectarTipoSubpartida: function(codigo) {
        if (!codigo) return 'desconocido';
        
        // Mano de obra: MO031, MO084, MO091, etc.
        if (/^MO\d+$/.test(codigo)) return 'mano_obra';
        
        // Herramienta/Equipos por porcentaje: %MO1, %MO2, %MO3, %MO5
        if (/^%MO\d+$/.test(codigo)) return 'herramienta';
        
        // Equipos: CFGRUA, CFECORTE, CFPLAN, etc.
        if (/^CF[A-Z]+$/.test(codigo)) return 'equipo';
        
        // Llantas/Equipos: LLGRUA, LLCAMION, etc.
        if (/^LL[A-Z]+$/.test(codigo)) return 'equipo';
        
        // Materiales: 342-SQD-3518, 347-VER-0177, etc.
        return 'material';
    },
    
    detectarCategoria: function(codigo, descripcion) {
        const desc = (descripcion || '').toLowerCase();
        
        if (desc.includes('eléctric') || desc.includes('cable') || desc.includes('conduit') || 
            desc.includes('tablero') || desc.includes('contacto') || desc.includes('ilumin') ||
            desc.includes('centro de carga')) {
            return 'Eléctrico';
        }
        if (desc.includes('ducto') || desc.includes('charola') || desc.includes('compuerta') ||
            desc.includes('codo circular') || desc.includes('lamina') || desc.includes('spiroducto')) {
            return 'HVAC';
        }
        if (desc.includes('soldad') || desc.includes('estructura') || desc.includes('montaje')) {
            return 'Estructuras';
        }
        if (desc.includes('limpiez') || desc.includes('desmont')) {
            return 'Limpieza';
        }
        if (desc.includes('pint')) {
            return 'Pintura';
        }
        
        return 'General';
    },
    
    detectarSubcategoria: function(codigo, descripcion) {
        const desc = (descripcion || '').toLowerCase();
        
        if (desc.includes('centro de carga') || desc.includes('tablero')) return 'Tableros';
        if (desc.includes('codo') || desc.includes('ducto')) return 'Ductos';
        if (desc.includes('compuerta')) return 'Compuertas';
        if (desc.includes('cable')) return 'Cableado';
        if (desc.includes('conduit')) return 'Canalización';
        if (desc.includes('charola')) return 'Soportería';
        if (desc.includes('ilumin') || desc.includes('luminaria')) return 'Iluminación';
        if (desc.includes('contacto') || desc.includes('caja')) return 'Contactos';
        if (desc.includes('gabinete')) return 'Gabinetes';
        if (desc.includes('tierra') || desc.includes('pararrayo')) return 'Tierra Física';
        if (desc.includes('soldad') || desc.includes('estructura')) return 'Soldadura';
        if (desc.includes('limpiez')) return 'Limpieza';
        if (desc.includes('cople')) return 'Accesorios';
        
        return 'General';
    },
    
    detectarEspecialidad: function(codigo, descripcion) {
        const desc = (descripcion || '').toLowerCase();
        
        if (desc.includes('eléctric')) return 'Eléctrico';
        if (desc.includes('instalacion')) return 'Instalaciones';
        if (desc.includes('soldad')) return 'Soldadura';
        if (desc.includes('operador')) return 'Operador';
        if (desc.includes('técnico')) return 'Técnico';
        if (desc.includes('oficial')) return 'Oficial';
        if (desc.includes('ayudante')) return 'Ayudante';
        if (desc.includes('sobrestante')) return 'Sobrestante';
        
        return 'General';
    },
    
    detectarCategoriaEquipo: function(codigo) {
        if (codigo.includes('GRUA')) return 'Izaje';
        if (codigo.includes('CORTE')) return 'Corte';
        if (codigo.includes('PLAN') || codigo.includes('SOLDAR')) return 'Soldadura';
        if (codigo.includes('HIAB')) return 'Grúa';
        
        return 'General';
    },
    
    requiereOperador: function(codigo) {
        return codigo.includes('GRUA') || codigo.includes('OPERADOR') || codigo.includes('PLAN');
    },
    
    detectarFactores: function(codigo, descripcion) {
        const factores = [];
        const desc = (descripcion || '').toLowerCase();
        
        if (desc.includes('altura') || desc.includes('elevacion')) factores.push('altura');
        if (desc.includes('andamio')) factores.push('andamios');
        if (desc.includes('grúa') || desc.includes('grua')) factores.push('izaje');
        if (desc.includes('soldad') || desc.includes('corte')) factores.push('soldadura');
        
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
                        <li>Abre la consola (F12) para ver el progreso detallado</li>
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
            <p style="margin-top:15px;color:#666;font-size:13px;">Filas procesadas: ${r.filasProcesadas} | Filas saltadas: ${r.filasSaltadas}</p>
            <button onclick="window.location.reload()" class="btn btn-primary" style="margin-top:20px;width:100%;padding:14px;">🔄 Recargar Página</button>
        `;
    }
};

console.log('✅ importador_excel_smartcot.js listo - Versión Corregida');
