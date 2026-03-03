// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - IMPORTADOR EXCEL (CORREGIDO PARA TU ESTRUCTURA)
// ─────────────────────────────────────────────────────────────────────

console.log('📥 importador_excel_smartcot.js cargado');

window.importadorSmartCot = {
    
    estadisticas: {
        conceptos: 0,
        materiales: 0,
        manoObra: 0,
        equipos: 0,
        herramienta: 0,
        filasProcesadas: 0,
        filasSaltadas: 0
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
                        
                        const sheet = workbook.Sheets[workbook.SheetNames[0]];
                        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                        
                        console.log('📊 Filas leídas:', json.length);
                        console.log('📋 Fila 0 (headers):', json[0]);
                        console.log('📋 Fila 1:', json[1]);
                        console.log('📋 Fila 2:', json[2]);
                        
                        const resultado = await this.procesarDatos(json);
                        console.log('✅ Procesamiento completado:', resultado);
                        
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
    // PROCESAR DATOS (CORREGIDO - COLUMNAS CORRECTAS)
    // ─────────────────────────────────────────────────────────────────
    procesarDatos: function(rows) {
        const conceptos = new Map();
        const materiales = new Map();
        const manoObra = new Map();
        const equipos = new Map();
        const herramienta = new Map();
        
        let conceptoActual = null;
        let filasProcesadas = 0;
        let filasSaltadas = 0;
        let conceptosDetectados = 0;
        
        console.log('🔄 Procesando', rows.length, 'filas...');
        
        // Empezar desde fila 2 (índice 2) - después de headers
        for (let i = 2; i < rows.length; i++) {
            const row = rows[i];
            
            // Saltar filas vacías o con menos de 4 columnas
            if (!row || row.length < 4) {
                filasSaltadas++;
                continue;
            }
            
            // ─────────────────────────────────────────────────────────
            // MAPEO CORRECTO DE COLUMNAS (SEGÚN TUS HEADERS):
            // Columna A (0): Clave del concepto (10301-001) o VACÍO
            // Columna B (1): Descripción del concepto
            // Columna C (2): Unidad del concepto (M2, M, PZA, etc.)
            // Columna D (3): Clave del insumo (301-ARE-0101, MO011, %MO1)
            // Columna E (4): Descripción del insumo
            // Columna F (5): Unidad del insumo
            // Columna G (6): Rendimiento/Cantidad
            // Columna H (7): Costo
            // Columna I (8): Importe
            // ─────────────────────────────────────────────────────────
            
            const claveConcepto = (row[0] || '').toString().trim();      // Columna A
            const descripcionConcepto = (row[1] || '').toString().trim(); // Columna B
            const unidadConcepto = (row[2] || '').toString().trim();      // Columna C
            
            const claveInsumo = (row[3] || '').toString().trim();         // Columna D
            const descripcionInsumo = (row[4] || '').toString().trim();   // Columna E
            const unidadInsumo = (row[5] || '').toString().trim();        // Columna F
            const rendimiento = parseFloat(row[6]) || 0;                  // Columna G
            const costo = parseFloat((row[7] || '0').toString().replace(',', '')) || 0; // Columna H
            const importe = parseFloat((row[8] || '0').toString().replace(',', '')) || 0; // Columna I
            
            // DEBUG: Mostrar primeras 25 filas
            if (i < 25) {
                console.log(`Fila ${i}:`, {
                    claveConcepto,
                    descripcionConcepto: descripcionConcepto ? descripcionConcepto.substring(0, 30) : '',
                    unidadConcepto,
                    claveInsumo,
                    descripcionInsumo: descripcionInsumo ? descripcionInsumo.substring(0, 30) : '',
                    unidadInsumo,
                    rendimiento,
                    costo,
                    importe
                });
            }
            
            // Saltar filas de encabezado/empresa
            if (claveConcepto === 'Clave del concepto' || claveConcepto.includes('SU EMPRESA')) {
                filasSaltadas++;
                continue;
            }
            
            // ─────────────────────────────────────────────────────────
            // DETECTAR NUEVO CONCEPTO
            // Si Columna A tiene código (XXXXX-XXX), es NUEVO concepto
            // Si Columna A está vacía, es continuación del concepto anterior
            // ─────────────────────────────────────────────────────────
            const esNuevoConcepto = claveConcepto && /^\d{5}-\d{3}$/.test(claveConcepto);
            
            if (esNuevoConcepto) {
                // Guardar concepto anterior si existe
                if (conceptoActual) {
                    conceptoActual.costos_base.costo_directo_total = 
                        conceptoActual.costos_base.costo_material +
                        conceptoActual.costos_base.costo_mano_obra +
                        conceptoActual.costos_base.costo_equipo;
                    
                    conceptos.set(conceptoActual.codigo, conceptoActual);
                    conceptosDetectados++;
                    console.log('✅ Concepto guardado:', conceptoActual.codigo, 
                        '| Mat:', conceptoActual.recursos.materiales.length,
                        '| MO:', conceptoActual.recursos.mano_obra.length,
                        '| Eq:', conceptoActual.recursos.equipos.length,
                        '| Herr:', conceptoActual.recursos.herramienta.length);
                }
                
                // Crear NUEVO concepto
                conceptoActual = {
                    id: 'CONCEPTO-' + Date.now() + '-' + conceptos.size,
                    codigo: claveConcepto,
                    categoria: this.detectarCategoria(claveConcepto, descripcionConcepto),
                    subcategoria: this.detectarSubcategoria(claveConcepto, descripcionConcepto),
                    descripcion_corta: this.extraerDescripcionCorta(descripcionConcepto),
                    descripcion_tecnica: descripcionConcepto,
                    unidad: unidadConcepto || 'PZA',
                    rendimiento_base: 1,
                    factores_aplicables: this.detectarFactores(claveConcepto, descripcionConcepto),
                    riesgo_nivel: this.detectarRiesgo(claveConcepto, descripcionConcepto),
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
                        costo_equipo: 0,
                        costo_directo_total: 0
                    },
                    meta: {
                        creado_por: 'Importación Excel',
                        version: '1.0',
                        fecha_creacion: new Date().toISOString(),
                        fila_original: i
                    }
                };
                
                console.log('📋 Nuevo concepto:', claveConcepto, descripcionConcepto.substring(0, 40));
                filasProcesadas++;
            }
            
            // Si no hay concepto actual o no hay insumo, saltar
            if (!conceptoActual || !claveInsumo || rendimiento === 0) {
                filasSaltadas++;
                continue;
            }
            
            // ─────────────────────────────────────────────────────────
            // PROCESAR INSUMO
            // ─────────────────────────────────────────────────────────
            const tipoInsumo = this.detectarTipoInsumo(claveInsumo);
            
            if (tipoInsumo === 'material') {
                // Agregar a materiales globales
                if (!materiales.has(claveInsumo)) {
                    materiales.set(claveInsumo, {
                        id: 'MAT-' + claveInsumo,
                        codigo: claveInsumo,
                        nombre: descripcionInsumo,
                        descripcion_tecnica: descripcionInsumo,
                        categoria: conceptoActual.categoria,
                        unidad: unidadInsumo,
                        precio_base: costo,
                        moneda: 'MXN',
                        activo: true
                    });
                }
                
                // Agregar al concepto actual
                conceptoActual.recursos.materiales.push({
                    material_codigo: claveInsumo,
                    nombre: descripcionInsumo,
                    cantidad: rendimiento,
                    unidad: unidadInsumo,
                    precio_unitario: costo,
                    importe: importe,
                    desperdicio_porcentaje: 0
                });
                
                conceptoActual.costos_base.costo_material += importe;
                
            } else if (tipoInsumo === 'mano_obra') {
                // Agregar a mano de obra global
                if (!manoObra.has(claveInsumo)) {
                    manoObra.set(claveInsumo, {
                        id: 'MO-' + claveInsumo,
                        codigo: claveInsumo,
                        puesto: descripcionInsumo,
                        especialidad: this.detectarEspecialidad(claveInsumo, descripcionInsumo),
                        salario_diario: costo,
                        salario_hora: costo / 8,
                        prestaciones_porcentaje: 35,
                        categoria: 'General',
                        activo: true
                    });
                }
                
                // Agregar al concepto actual
                conceptoActual.recursos.mano_obra.push({
                    mano_obra_codigo: claveInsumo,
                    puesto: descripcionInsumo,
                    horas_jornada: rendimiento,
                    salario_hora: costo / 8,
                    prestaciones_porcentaje: 35,
                    importe: importe,
                    unidad: unidadInsumo
                });
                
                conceptoActual.costos_base.costo_mano_obra += importe;
                
            } else if (tipoInsumo === 'equipo') {
                // Agregar a equipos globales
                if (!equipos.has(claveInsumo)) {
                    equipos.set(claveInsumo, {
                        id: 'EQUIP-' + claveInsumo,
                        codigo: claveInsumo,
                        nombre: descripcionInsumo,
                        tipo: 'Equipo',
                        costo_renta_dia: costo,
                        costo_propiedad_dia: costo * 0.35,
                        operador_requerido: this.requiereOperador(claveInsumo),
                        categoria: this.detectarCategoriaEquipo(claveInsumo),
                        activo: true
                    });
                }
                
                // Agregar al concepto actual
                conceptoActual.recursos.equipos.push({
                    equipo_codigo: claveInsumo,
                    nombre: descripcionInsumo,
                    horas: rendimiento,
                    costo_unitario: costo,
                    importe: importe,
                    unidad: unidadInsumo
                });
                
                conceptoActual.costos_base.costo_equipo += importe;
                
            } else if (tipoInsumo === 'herramienta') {
                // Agregar a herramienta global
                if (!herramienta.has(claveInsumo)) {
                    herramienta.set(claveInsumo, {
                        id: 'HERR-' + claveInsumo,
                        codigo: claveInsumo,
                        nombre: descripcionInsumo,
                        tipo: 'herramienta',
                        porcentaje: rendimiento,
                        activo: true
                    });
                }
                
                // Agregar al concepto actual
                conceptoActual.recursos.herramienta.push({
                    herramienta_codigo: claveInsumo,
                    nombre: descripcionInsumo,
                    porcentaje: rendimiento,
                    importe: importe,
                    unidad: unidadInsumo
                });
                
                conceptoActual.costos_base.costo_equipo += importe;
            }
            
            filasProcesadas++;
        }
        
        // Guardar último concepto
        if (conceptoActual) {
            conceptoActual.costos_base.costo_directo_total = 
                conceptoActual.costos_base.costo_material +
                conceptoActual.costos_base.costo_mano_obra +
                conceptoActual.costos_base.costo_equipo;
            
            // Calcular rendimiento base
            const totalHorasMO = conceptoActual.recursos.mano_obra.reduce(function(sum, mo) {
                return sum + (mo.horas_jornada || 0);
            }, 0);
            
            if (totalHorasMO > 0) {
                conceptoActual.rendimiento_base = Math.round(1 / totalHorasMO);
            }
            
            conceptos.set(conceptoActual.codigo, conceptoActual);
            conceptosDetectados++;
            console.log('✅ Último concepto:', conceptoActual.codigo);
        }
        
        console.log('✅ Procesamiento completado:');
        console.log('   - Conceptos:', conceptos.size);
        console.log('   - Materiales:', materiales.size);
        console.log('   - Mano de Obra:', manoObra.size);
        console.log('   - Equipos:', equipos.size);
        console.log('   - Herramienta:', herramienta.size);
        console.log('   - Filas procesadas:', filasProcesadas);
        console.log('   - Filas saltadas:', filasSaltadas);
        
        this.estadisticas = {
            conceptos: conceptos.size,
            materiales: materiales.size,
            manoObra: manoObra.size,
            equipos: equipos.size,
            herramienta: herramienta.size,
            filasProcesadas: filasProcesadas,
            filasSaltadas: filasSaltadas,
            errores: 0
        };
        
        return {
            conceptos: Array.from(conceptos.values()),
            materiales: Array.from(materiales.values()),
            manoObra: Array.from(manoObra.values()),
            equipos: Array.from(equipos.values()),
            herramienta: Array.from(herramienta.values()),
            estadisticas: this.estadisticas
        };
    },
    
    // ─────────────────────────────────────────────────────────────────
    // FUNCIONES DE DETECCIÓN
    // ─────────────────────────────────────────────────────────────────
    
    detectarTipoInsumo: function(clave) {
        if (!clave) return 'desconocido';
        if (/^MO\d+$/.test(clave)) return 'mano_obra';
        if (/^%MO\d+$/.test(clave)) return 'herramienta';
        if (/^CF[A-Z]+$/.test(clave)) return 'equipo';
        if (/^LL[A-Z]+$/.test(clave)) return 'equipo';
        return 'material';
    },
    
    detectarCategoria: function(clave, descripcion) {
        const desc = (descripcion || '').toLowerCase();
        if (desc.includes('eléctric') || desc.includes('cable') || desc.includes('conduit') || desc.includes('tablero') || desc.includes('contacto')) return 'Eléctrico';
        if (desc.includes('ducto') || desc.includes('charola') || desc.includes('compuerta')) return 'HVAC';
        if (desc.includes('soldad') || desc.includes('estructura')) return 'Estructuras';
        if (desc.includes('limpiez') || desc.includes('desmont')) return 'Limpieza';
        if (desc.includes('pint')) return 'Pintura';
        if (desc.includes('tapial') || desc.includes('carpa') || desc.includes('cortina') || desc.includes('protección')) return 'Provisionales';
        if (desc.includes('sanitario')) return 'Sanitarios';
        if (desc.includes('rotulo') || desc.includes('señal')) return 'Señalamiento';
        if (desc.includes('trazo') || desc.includes('nivelación')) return 'Trazo';
        return 'General';
    },
    
    detectarSubcategoria: function(clave, descripcion) {
        const desc = (descripcion || '').toLowerCase();
        if (desc.includes('tapial')) return 'Tapiales';
        if (desc.includes('carpa') || desc.includes('cortina')) return 'Protecciones';
        if (desc.includes('limpiez')) return 'Limpieza';
        if (desc.includes('trazo')) return 'Trazo';
        if (desc.includes('sanitario')) return 'Sanitarios';
        return 'General';
    },
    
    detectarEspecialidad: function(clave, descripcion) {
        const desc = (descripcion || '').toLowerCase();
        if (desc.includes('albañil')) return 'Albañilería';
        if (desc.includes('colocador')) return 'Colocación';
        if (desc.includes('herrero')) return 'Herrería';
        if (desc.includes('carpintero')) return 'Carpintería';
        if (desc.includes('pintor')) return 'Pintura';
        if (desc.includes('operador')) return 'Operador';
        if (desc.includes('cabo')) return 'Cabo de Oficios';
        if (desc.includes('peón') || desc.includes('peon')) return 'Peón';
        if (desc.includes('ayudante')) return 'Ayudante';
        if (desc.includes('oficial')) return 'Oficial';
        if (desc.includes('soldador')) return 'Soldadura';
        return 'General';
    },
    
    detectarCategoriaEquipo: function(clave) {
        if (clave.includes('REV')) return 'Concreto';
        if (clave.includes('GRUA')) return 'Izaje';
        if (clave.includes('CORTE')) return 'Corte';
        if (clave.includes('LL')) return 'Refacciones';
        return 'General';
    },
    
    requiereOperador: function(clave) {
        return clave.includes('GRUA') || clave.includes('CAMION');
    },
    
    detectarFactores: function(clave, descripcion) {
        const factores = [];
        const desc = (descripcion || '').toLowerCase();
        if (desc.includes('altura')) factores.push('altura');
        if (desc.includes('andamio')) factores.push('andamios');
        return factores.join(',');
    },
    
    detectarRiesgo: function(clave, descripcion) {
        const desc = (descripcion || '').toLowerCase();
        if (desc.includes('peligro') || desc.includes('alto voltaje')) return 'alto';
        if (desc.includes('riesgo')) return 'medio';
        return 'bajo';
    },
    
    extraerDescripcionCorta: function(descripcion) {
        if (!descripcion) return '';
        return descripcion.substring(0, 80);
    },
    
    // ─────────────────────────────────────────────────────────────────
    // IMPORTAR A INDEXEDDB
    // ─────────────────────────────────────────────────────────────────
    importarADB: async function(datos) {
        console.log('💾 Importando a IndexedDB...');
        
        if (!window.db) {
            console.error('❌ ERROR: window.db no existe');
            throw new Error('db no inicializada');
        }
        
        const reporte = {
            conceptos: { total: datos.conceptos.length, exitosos: 0, fallidos: 0 },
            materiales: { total: datos.materiales.length, exitosos: 0, fallidos: 0 },
            manoObra: { total: datos.manoObra.length, exitosos: 0, fallidos: 0 },
            equipos: { total: datos.equipos.length, exitosos: 0, fallidos: 0 },
            herramienta: { total: datos.herramienta.length, exitosos: 0, fallidos: 0 }
        };
        
        // Importar conceptos (CON recursos y costos_base)
        for (const concepto of datos.conceptos) {
            try {
                await window.db.conceptos.put(concepto);
                reporte.conceptos.exitosos++;
            } catch (error) {
                console.error('❌ Error concepto:', concepto.codigo, error.message);
                reporte.conceptos.fallidos++;
            }
        }
        
        // Importar materiales
        for (const material of datos.materiales) {
            try {
                await window.db.materiales.put(material);
                reporte.materiales.exitosos++;
            } catch (error) {
                console.error('❌ Error material:', material.codigo, error.message);
                reporte.materiales.fallidos++;
            }
        }
        
        // Importar mano de obra
        for (const mo of datos.manoObra) {
            try {
                await window.db.manoObra.put(mo);
                reporte.manoObra.exitosos++;
            } catch (error) {
                console.error('❌ Error MO:', mo.codigo, error.message);
                reporte.manoObra.fallidos++;
            }
        }
        
        // Importar equipos
        for (const equipo of datos.equipos) {
            try {
                await window.db.equipos.put(equipo);
                reporte.equipos.exitosos++;
            } catch (error) {
                console.error('❌ Error equipo:', equipo.codigo, error.message);
                reporte.equipos.fallidos++;
            }
        }
        
        // Importar herramienta
        for (const herr of datos.herramienta) {
            try {
                await window.db.herramienta.put(herr);
                reporte.herramienta.exitosos++;
            } catch (error) {
                console.error('❌ Error herramienta:', herr.codigo, error.message);
                reporte.herramienta.fallidos++;
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
                        <li>Se importarán: conceptos, materiales, mano de obra, equipos, herramienta</li>
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
                    <div id="progress-log" style="margin-top:15px;color:#666;font-size:13px;max-height:150px;overflow-y:auto;"></div>
                </div>
                <div id="import-result" style="display:none;background:#E8F5E9;padding:20px;border-radius:10px;margin:20px 0;"></div>
                <div style="display:flex;gap:15px;margin-top:20px;">
                    <button onclick="importadorSmartCot.iniciarImportacion()" class="btn btn-primary" style="flex:1;padding:16px;">🚀 Iniciar Importación</button>
                    <button onclick="document.getElementById('import-ui').remove()" class="btn btn-secondary" style="flex:1;padding:16px;">❌ Cancelar</button>
                </div>
            </div>
        `;
        
        const container = document.createElement('div');
        container.id = 'import-ui';
        container.innerHTML = html;
        document.body.appendChild(container);
    },
    
    iniciarImportacion: async function() {
        const file = document.getElementById('excel-file')?.files[0];
        if (!file) {
            alert('⚠️ Selecciona un archivo Excel');
            return;
        }
        
        const progressDiv = document.getElementById('import-progress');
        if (progressDiv) progressDiv.style.display = 'block';
        
        this.log('📥 Leyendo archivo...');
        
        try {
            this.actualizarProgreso(10, 'Procesando datos...');
            const resultado = await this.importarArchivo(file);
            this.actualizarProgreso(90, 'Finalizando...');
            this.mostrarResultado(resultado);
            this.actualizarProgreso(100, '✅ Completado');
        } catch (error) {
            console.error('❌ Error:', error);
            alert('❌ Error: ' + error.message);
            this.actualizarProgreso(0, '❌ Error');
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
        const el = document.getElementById('progress-percent');
        const bar = document.getElementById('progress-bar');
        const statusEl = document.getElementById('progress-status');
        if (el) el.textContent = percent + '%';
        if (bar) bar.style.width = percent + '%';
        if (statusEl) statusEl.textContent = status;
        this.log(status);
    },
    
    mostrarResultado: function(reporte) {
        const r = reporte.estadisticas;
        const div = document.getElementById('import-result');
        if (!div) return;
        
        div.style.display = 'block';
        div.innerHTML = `
            <h4 style="color:#2E7D32;margin:0 0 15px 0;">✅ Importación Completada</h4>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:15px;">
                <div style="background:white;padding:15px;border-radius:8px;text-align:center;">
                    <div style="font-size:24px;font-weight:700;color:#1a1a1a;">${r.conceptos}</div>
                    <div style="font-size:12px;color:#666;">Conceptos</div>
                </div>
                <div style="background:white;padding:15px;border-radius:8px;text-align:center;">
                    <div style="font-size:24px;font-weight:700;color:#1a1a1a;">${r.materiales}</div>
                    <div style="font-size:12px;color:#666;">Materiales</div>
                </div>
                <div style="background:white;padding:15px;border-radius:8px;text-align:center;">
                    <div style="font-size:24px;font-weight:700;color:#1a1a1a;">${r.manoObra}</div>
                    <div style="font-size:12px;color:#666;">Mano de Obra</div>
                </div>
                <div style="background:white;padding:15px;border-radius:8px;text-align:center;">
                    <div style="font-size:24px;font-weight:700;color:#1a1a1a;">${r.equipos}</div>
                    <div style="font-size:12px;color:#666;">Equipos</div>
                </div>
                <div style="background:white;padding:15px;border-radius:8px;text-align:center;">
                    <div style="font-size:24px;font-weight:700;color:#1a1a1a;">${r.herramienta}</div>
                    <div style="font-size:12px;color:#666;">Herramienta</div>
                </div>
            </div>
            <button onclick="window.location.reload()" class="btn btn-primary" style="margin-top:20px;width:100%;padding:14px;">🔄 Recargar Página</button>
        `;
    }
};

console.log('✅ importador_excel_smartcot.js listo');
