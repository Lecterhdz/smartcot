// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - IMPORTADOR DE EXCEL (APU - Análisis de Precios Unitarios)
// Compatible con tu archivo: Relacion de Rendimientos de Insumos_ExplosiónXConceptoconimporte.xlsx
// ─────────────────────────────────────────────────────────────────────

console.log('📥 importador_excel_smartcot.js cargado');

window.importadorSmartCot = {
    
    // Configuración
    config: {
        hojaNombre: 'Hoja1',
        columnaCodigo: 1,      // Columna B (0-indexed)
        columnaDescripcion: 2,  // Columna C
        columnaUnidad: 3,       // Columna D
        columnaCantidad: 4,     // Columna E
        columnaPrecio: 5,       // Columna F
        columnaImporte: 6,      // Columna G
    },
    
    // ─────────────────────────────────────────────────────────────────
    // IMPORTAR ARCHIVO EXCEL
    // ─────────────────────────────────────────────────────────────────
    importarArchivo: async function(file) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('📥 Iniciando importación...', file.name);
                
                // Leer archivo con SheetJS
                const reader = new FileReader();
                
                reader.onload = async (e) => {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        
                        // Leer primera hoja
                        const sheet = workbook.Sheets[workbook.SheetNames[0]];
                        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                        
                        console.log('📊 Filas leídas:', json.length);
                        
                        // Procesar datos
                        const resultado = await this.procesarDatos(json);
                        
                        // Importar a IndexedDB
                        await this.importarADB(resultado);
                        
                        resolve(resultado);
                        
                    } catch (error) {
                        console.error('❌ Error procesando Excel:', error);
                        reject(error);
                    }
                };
                
                reader.onerror = () => reject(new Error('Error leyendo archivo'));
                reader.readAsArrayBuffer(file);
                
            } catch (error) {
                reject(error);
            }
        });
    },
    
    // ─────────────────────────────────────────────────────────────────
    // PROCESAR DATOS DEL EXCEL
    // ─────────────────────────────────────────────────────────────────
    procesarDatos: function(rows) {
        const conceptos = [];
        const materiales = new Map();
        const manoObra = new Map();
        const equipos = new Map();
        const factores = new Map();
        
        let conceptoActual = null;
        let filaActual = 0;
        let conceptosProcesados = 0;
        let subpartidasProcesadas = 0;
        
        console.log('🔄 Procesando', rows.length, 'filas...');
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            // Saltar filas vacías o de encabezado
            if (!row || row.length < 3 || !row[1]) continue;
            if (row[1].toString().includes('SU EMPRESA') || 
                row[1].toString().includes('Cliente:') ||
                row[1].toString().includes('Concurso') ||
                row[1].toString().includes('Obra:') ||
                row[1].toString().includes('Lugar:') ||
                row[1].toString().includes('Ciudad:') ||
                row[1].toString().includes('PROGRAMA')) continue;
            
            filaActual++;
            
            // Detectar si es fila de CONCEPTO (código numérico tipo 12209-787)
            const codigo = row[1]?.toString().trim();
            const esConcepto = this.esFilaConcepto(codigo);
            
            if (esConcepto) {
                // Guardar concepto anterior si existe
                if (conceptoActual) {
                    conceptos.push(conceptoActual);
                    conceptosProcesados++;
                }
                
                // Crear nuevo concepto
                conceptoActual = {
                    id: 'CONCEPTO-' + Date.now() + '-' + conceptosProcesados,
                    codigo: codigo,
                    categoria: this.detectarCategoria(codigo, row[2]),
                    subcategoria: this.detectarSubcategoria(codigo, row[2]),
                    descripcion_corta: this.extraerDescripcionCorta(row[2]),
                    descripcion_tecnica: row[2] || '',
                    unidad: row[3] || 'PZA',
                    rendimiento_base: this.calcularRendimientoBase(conceptoActual),
                    factores_aplicables: this.detectarFactores(codigo, row[2]),
                    riesgo_nivel: this.detectarRiesgo(codigo, row[2]),
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
                
            } else if (conceptoActual) {
                // Es subpartida del concepto actual
                subpartidasProcesadas++;
                
                const tipo = this.detectarTipoSubpartida(codigo);
                const cantidad = parseFloat(row[4]) || 0;
                const precio = parseFloat(row[5]?.toString().replace(',', '')) || 0;
                const importe = parseFloat(row[6]?.toString().replace(',', '')) || 0;
                
                if (tipo === 'material') {
                    // Agregar a materiales
                    if (!materiales.has(codigo)) {
                        materiales.set(codigo, {
                            id: 'MAT-' + codigo,
                            codigo: codigo,
                            nombre: row[2] || '',
                            descripcion_tecnica: row[2] || '',
                            categoria: conceptoActual.categoria,
                            unidad: row[3] || 'PZA',
                            precio_base: precio,
                            moneda: 'MXN',
                            activo: true
                        });
                    }
                    
                    conceptoActual.recursos.materiales.push({
                        material_codigo: codigo,
                        nombre: row[2] || '',
                        cantidad: cantidad,
                        unidad: row[3] || 'PZA',
                        precio_unitario: precio,
                        importe: importe,
                        desperdicio_porcentaje: this.calcularDesperdicio(codigo, cantidad)
                    });
                    
                    conceptoActual.costos_base.costo_material += importe;
                    
                } else if (tipo === 'mano_obra') {
                    // Agregar a mano de obra
                    if (!manoObra.has(codigo)) {
                        const salarioDiario = precio;
                        manoObra.set(codigo, {
                            id: 'MO-' + codigo,
                            codigo: codigo,
                            puesto: row[2] || '',
                            especialidad: this.detectarEspecialidad(codigo, row[2]),
                            salario_diario: salarioDiario,
                            salario_hora: salarioDiario / 8,
                            prestaciones_porcentaje: 35,
                            categoria: 'Eléctrico',
                            activo: true
                        });
                    }
                    
                    conceptoActual.recursos.mano_obra.push({
                        mano_obra_codigo: codigo,
                        puesto: row[2] || '',
                        horas_jornada: cantidad * 8, // Convertir jornadas a horas
                        salario_hora: precio / 8,
                        prestaciones_porcentaje: 35,
                        importe: importe
                    });
                    
                    conceptoActual.costos_base.costo_mano_obra += importe;
                    
                } else if (tipo === 'factor') {
                    // Agregar a factores (herramienta, andamios, seguridad)
                    const factorTipo = this.detectarTipoFactor(codigo);
                    
                    if (!factores.has(codigo)) {
                        factores.set(codigo, {
                            id: 'FACT-' + codigo,
                            codigo: codigo,
                            tipo: factorTipo,
                            nombre: row[2] || '',
                            valor: cantidad / 100, // Convertir porcentaje a factor
                            descripcion: row[2] || '',
                            activo: true
                        });
                    }
                    
                    conceptoActual.recursos.herramienta.push({
                        nombre: row[2] || '',
                        tipo: factorTipo,
                        porcentaje: cantidad,
                        importe: importe
                    });
                    
                    conceptoActual.costos_base.costo_equipo += importe;
                    
                } else if (tipo === 'equipo') {
                    // Agregar a equipos (grúas, plantas, etc.)
                    if (!equipos.has(codigo)) {
                        equipos.set(codigo, {
                            id: 'EQUIP-' + codigo,
                            codigo: codigo,
                            nombre: row[2] || '',
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
                        nombre: row[2] || '',
                        horas: cantidad,
                        costo_unitario: precio,
                        importe: importe
                    });
                    
                    conceptoActual.costos_base.costo_equipo += importe;
                }
            }
        }
        
        // Guardar último concepto
        if (conceptoActual) {
            conceptos.push(conceptoActual);
            conceptosProcesados++;
        }
        
        console.log('✅ Procesamiento completado:');
        console.log('   - Conceptos:', conceptosProcesados);
        console.log('   - Subpartidas:', subpartidasProcesadas);
        console.log('   - Materiales únicos:', materiales.size);
        console.log('   - Mano de obra única:', manoObra.size);
        console.log('   - Equipos únicos:', equipos.size);
        console.log('   - Factores únicos:', factores.size);
        
        return {
            conceptos,
            materiales: Array.from(materiales.values()),
            manoObra: Array.from(manoObra.values()),
            equipos: Array.from(equipos.values()),
            factores: Array.from(factores.values()),
            estadisticas: {
                conceptos: conceptosProcesados,
                subpartidas: subpartidasProcesadas,
                materiales: materiales.size,
                manoObra: manoObra.size,
                equipos: equipos.size,
                factores: factores.size
            }
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
        if (codigo.startsWith('%MO')) return 'factor';
        if (codigo.startsWith('CF')) return 'equipo';
        if (codigo.startsWith('LL')) return 'equipo';
        
        // Materiales tienen códigos alfanuméricos tipo 342-BTC-2007
        return 'material';
    },
    
    detectarTipoFactor: function(codigo) {
        if (codigo.includes('MO1') || codigo.includes('HERRAMIENTA')) return 'herramienta';
        if (codigo.includes('MO2') || codigo.includes('ANDAMIOS')) return 'andamios';
        if (codigo.includes('MO5') || codigo.includes('SEGURIDAD')) return 'seguridad';
        if (codigo.includes('MO3') || codigo.includes('MATERIALES MENORES')) return 'materiales_menores';
        return 'otros';
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
        if (desc.includes('señalamient') || desc.includes('protección civil')) {
            return 'Señalamiento';
        }
        
        return 'General';
    },
    
    detectarSubcategoria: function(codigo, descripcion) {
        const desc = (descripcion || '').toLowerCase();
        
        if (desc.includes('conduit') || desc.includes('tubería')) return 'Canalización';
        if (desc.includes('cable')) return 'Cableado';
        if (desc.includes('tablero') || desc.includes('interruptor') || desc.includes('centro de carga')) return 'Tableros';
        if (desc.includes('charola')) return 'Soportería';
        if (desc.includes('ducto')) return 'Ductos';
        if (desc.includes('válvula')) return 'Válvulas';
        if (desc.includes('bomba')) return 'Bombas';
        if (desc.includes('soldad')) return 'Soldadura';
        if (desc.includes('estructura')) return 'Estructuras';
        if (desc.includes('pint')) return 'Pintura';
        if (desc.includes('desmont')) return 'Desmontaje';
        if (desc.includes('señalamient')) return 'Señalamiento';
        if (desc.includes('condulet')) return 'Condulets';
        if (desc.includes('tierra')) return 'Tierra Física';
        if (desc.includes('contacto')) return 'Contactos';
        if (desc.includes('ilumin') || desc.includes('luminaria')) return 'Iluminación';
        
        return 'General';
    },
    
    detectarEspecialidad: function(codigo, descripcion) {
        const desc = (descripcion || '').toLowerCase();
        
        if (desc.includes('eléctric')) return 'Eléctrico';
        if (desc.includes('plom')) return 'Plomería';
        if (desc.includes('herr')) return 'Herrería';
        if (desc.includes('soldad')) return 'Soldadura';
        if (desc.includes('pint')) return 'Pintura';
        if (desc.includes('coloc')) return 'Colocación';
        if (desc.includes('instalacion')) return 'Instalaciones';
        if (desc.includes('técnico')) return 'Técnico';
        if (desc.includes('operador')) return 'Operador';
        
        return 'General';
    },
    
    detectarCategoriaEquipo: function(codigo) {
        if (codigo.includes('GRUA') || codigo.includes('LLGRUA')) return 'Izaje';
        if (codigo.includes('CORTE') || codigo.includes('OXI')) return 'Corte';
        if (codigo.includes('PLAN') || codigo.includes('SOLDAR')) return 'Soldadura';
        if (codigo.includes('TORRE') || codigo.includes('ANDAMIO')) return 'Acceso';
        if (codigo.includes('GEN') || codigo.includes('ENERGIA')) return 'Energía';
        
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
        if (desc.includes('peligro') || desc.includes('riesgo')) factores.push('riesgo');
        
        return factores.join(',');
    },
    
    detectarRiesgo: function(codigo, descripcion) {
        const desc = (descripcion || '').toLowerCase();
        
        if (desc.includes('peligro') || desc.includes('alto voltaje') || desc.includes('tóxico')) return 'alto';
        if (desc.includes('riesgo') || desc.includes('precaución')) return 'medio';
        
        return 'bajo';
    },
    
    calcularDesperdicio: function(codigo, cantidad) {
        // Desperdicio estándar por tipo de material
        if (codigo.includes('TUB') || codigo.includes('CONDUIT')) return 5;
        if (codigo.includes('CABLE')) return 3;
        if (codigo.includes('CHAROLA')) return 2;
        if (codigo.includes('TORNIL') || codigo.includes('TAQUETE')) return 10;
        
        return 5; // Default
    },
    
    calcularRendimientoBase: function(concepto) {
        // Calcular rendimiento basado en el tiempo total de mano de obra
        if (!concepto || !concepto.recursos) return 100;
        
        const totalHorasMO = concepto.recursos.mano_obra.reduce((sum, mo) => sum + (mo.horas_jornada || 0), 0);
        
        if (totalHorasMO > 0) {
            // Rendimiento = 8 horas / horas totales por unidad
            return Math.round(8 / totalHorasMO);
        }
        
        return 100; // Default
    },
    
    extraerDescripcionCorta: function(descripcion) {
        if (!descripcion) return '';
        
        // Extraer primeros 60 caracteres o hasta el primer punto
        const corta = descripcion.substring(0, 60);
        const punto = corta.indexOf('.');
        
        return punto > 0 ? corta.substring(0, punto) : corta;
    },
    
    // ─────────────────────────────────────────────────────────────────
    // IMPORTAR A INDEXEDDB
    // ─────────────────────────────────────────────────────────────────
    importarADB: async function(datos) {
        console.log('💾 Importando a IndexedDB...');
        
        const reporte = {
            conceptos: { total: 0, exitosos: 0, fallidos: 0 },
            materiales: { total: 0, exitosos: 0, fallidos: 0 },
            manoObra: { total: 0, exitosos: 0, fallidos: 0 },
            equipos: { total: 0, exitosos: 0, fallidos: 0 },
            factores: { total: 0, exitosos: 0, fallidos: 0 }
        };
        
        // Importar conceptos
        reporte.conceptos.total = datos.conceptos.length;
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
        reporte.materiales.total = datos.materiales.length;
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
        reporte.manoObra.total = datos.manoObra.length;
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
        reporte.equipos.total = datos.equipos.length;
        for (const equipo of datos.equipos) {
            try {
                await db.equipos.put(equipo);
                reporte.equipos.exitosos++;
            } catch (error) {
                console.error('❌ Error importando equipo:', equipo.codigo, error);
                reporte.equipos.fallidos++;
            }
        }
        
        // Importar factores
        reporte.factores.total = datos.factores.length;
        for (const factor of datos.factores) {
            try {
                await db.factores.put(factor);
                reporte.factores.exitosos++;
            } catch (error) {
                console.error('❌ Error importando factor:', factor.codigo, error);
                reporte.factores.fallidos++;
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
            <div style="background:white;padding:30px;border-radius:15px;box-shadow:0 4px 20px rgba(0,0,0,0.1);max-width:600px;margin:50px auto;">
                <h2 style="color:#1a1a1a;margin:0 0 20px 0;">📥 Importar Catálogo desde Excel</h2>
                
                <div style="background:#E3F2FD;padding:20px;border-radius:10px;margin:20px 0;">
                    <h4 style="color:#1565C0;margin:0 0 10px 0;">📋 Instrucciones:</h4>
                    <ol style="color:#555;margin:0;padding-left:20px;">
                        <li>Selecciona tu archivo Excel de APU</li>
                        <li>El sistema detectará automáticamente conceptos y subpartidas</li>
                        <li>Se importarán: conceptos, materiales, mano de obra, equipos y factores</li>
                        <li>El proceso puede tomar varios minutos dependiendo del tamaño</li>
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
                </div>
                
                <div id="import-result" style="display:none;background:#E8F5E9;padding:20px;border-radius:10px;margin:20px 0;"></div>
                
                <div style="display:flex;gap:15px;flex-wrap:wrap;margin-top:20px;">
                    <button onclick="importadorSmartCot.iniciarImportacion()" class="btn btn-primary" style="flex:1;padding:16px;">🚀 Iniciar Importación</button>
                    <button onclick="document.getElementById('import-ui').remove()" class="btn btn-secondary" style="flex:1;padding:16px;">❌ Cancelar</button>
                </div>
            </div>
        `;
        
        // Crear contenedor
        const container = document.createElement('div');
        container.id = 'import-ui';
        container.innerHTML = html;
        document.body.appendChild(container);
        
        // Event listener para archivo
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
        
        // Mostrar progreso
        document.getElementById('import-progress').style.display = 'block';
        document.getElementById('progress-status').textContent = '📥 Leyendo archivo...';
        
        try {
            // Actualizar progreso
            this.actualizarProgreso(10, 'Procesando datos...');
            
            // Importar
            const resultado = await this.importarArchivo(file);
            
            // Actualizar progreso
            this.actualizarProgreso(90, 'Finalizando...');
            
            // Mostrar resultado
            this.mostrarResultado(resultado);
            
            this.actualizarProgreso(100, '✅ Completado');
            
        } catch (error) {
            console.error('❌ Error en importación:', error);
            alert('❌ Error en importación: ' + error.message);
            this.actualizarProgreso(0, '❌ Error');
        }
    },
    
    actualizarProgreso: function(percent, status) {
        document.getElementById('progress-percent').textContent = percent + '%';
        document.getElementById('progress-bar').style.width = percent + '%';
        document.getElementById('progress-status').textContent = status;
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
                <div style="background:white;padding:15px;border-radius:8px;">
                    <div style="font-size:24px;font-weight:700;color:#1a1a1a;">${r.factores}</div>
                    <div style="font-size:13px;color:#666;">Factores</div>
                </div>
            </div>
            <button onclick="window.location.reload()" class="btn btn-primary" style="margin-top:20px;width:100%;padding:14px;">🔄 Recargar Página</button>
        `;
    }
};

console.log('✅ importador_excel_smartcot.js listo');