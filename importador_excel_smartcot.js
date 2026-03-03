// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - IMPORTADOR EXCEL (ESTRUCTURA REAL)
// Basado en: Relacion de Rendimientos de Insumos_ExplosiónXConceptoconimporte.xlsx
// ─────────────────────────────────────────────────────────────────────

console.log('📥 importador_excel_smartcot.js cargado - ESTRUCTURA REAL');

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
                        console.log('📋 Fila 0:', json[0]);
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
    
    // ─────────────────────────────────────────────────────────────────────
    // PROCESAR DATOS (ESTRUCTURA REAL DE TU EXCEL - CORREGIDO)
    // ─────────────────────────────────────────────────────────────────────
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
        
            // Saltar filas vacías o con menos de 5 columnas
            if (!row || row.length < 5) {
                filasSaltadas++;
                continue;
            }
        
            // ─────────────────────────────────────────────────────────────
            // ESTRUCTURA REAL DE TU EXCEL (basado en tu archivo):
            // Columna A (0): Unidad del concepto (M2, KG, PZA, SAL, M, JGO, TON)
            // Columna B (1): Clave del concepto (10301-001) - XXXXX-XXX
            // Columna C (2): Descripción del concepto
            // Columna D (3): Unidad del concepto (repetida)
            // Columna E (4): Clave del insumo (301-ARE-0101, MO031, %MO1, CFGRUA)
            // Columna F (5): Descripción del insumo
            // Columna G (6): Unidad del insumo
            // Columna H (7): Rendimiento (cantidad)
            // Columna I (8): Costo (precio unitario)
            // Columna J (9): Importe (total)
            // ─────────────────────────────────────────────────────────────
        
            const claveConcepto = (row[0] || '').toString().trim();      // Columna A
            const descripcionConcepto = (row[1] || '').toString().trim(); // Columna B
            const unidadConcepto = (row[2] || '').toString().trim();      // Columna C
        
            const claveInsumo = (row[3] || '').toString().trim();         // Columna D
            const descripcionInsumo = (row[4] || '').toString().trim();   // Columna E
            const unidadInsumo = (row[5] || '').toString().trim();        // Columna F
            const cantidad = parseFloat(row[6]) || 0;                     // Columna G
            const precio = parseFloat((row[7] || '0').toString().replace(',', '')) || 0; // Columna H
            const importe = parseFloat((row[8] || '0').toString().replace(',', '')) || 0; // Columna I
   
        
            // DEBUG: Mostrar primeras 10 filas para verificar
            if (i < 12) {
                console.log(`Fila ${i}:`, {
                    claveConcepto,
                    descripcionConcepto: descripcionConcepto.substring(0, 30),
                    unidadConcepto,
                    claveInsumo,
                    descripcionInsumo: descripcionInsumo.substring(0, 30),
                    cantidad,
                    precio,
                    importe
                });
            }
        
            // Saltar filas de encabezado/empresa
            if (!claveConcepto && !claveInsumo) {
                filasSaltadas++;
                continue;
            }
        
            if (claveConcepto && (claveConcepto.includes('SU EMPRESA') || claveConcepto.includes('Cliente:'))) {
                filasSaltadas++;
                continue;
            }
        
            // ─────────────────────────────────────────────────────────────
            // DETECTAR SI ES NUEVO CONCEPTO (Formato: XXXXX-XXX)
            // Ej: 10301-001, 12209-927, 12507-029
            // ─────────────────────────────────────────────────────────────
            const esNuevoConcepto = claveConcepto && /^\d{5}-\d{3}$/.test(claveConcepto);
        
            if (esNuevoConcepto) {
                // Guardar concepto anterior si existe
                if (conceptoActual) {
                    conceptos.set(conceptoActual.codigo, conceptoActual);
                    conceptosDetectados++;
                    console.log('✅ Concepto guardado:', conceptoActual.codigo, conceptoActual.descripcion_corta.substring(0, 50));
                }
            
                // Crear NUEVO concepto
                conceptoActual = {
                    id: 'CONCEPTO-' + Date.now() + '-' + conceptos.size,
                    codigo: claveConcepto,
                    categoria: this.detectarCategoria(claveConcepto, descripcionConcepto),
                    subcategoria: this.detectarSubcategoria(claveConcepto, descripcionConcepto),
                    descripcion_corta: this.extraerDescripcionCorta(descripcionConcepto),
                    descripcion_tecnica: descripcionConcepto,
                    unidad: unidadConcepto || unidadConcepto2 || 'PZA',
                    rendimiento_base: 100,
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
                        costo_equipo: 0
                    },
                    meta: {
                        creado_por: 'Importación Excel',
                        version: '1.0',
                        fecha_creacion: new Date().toISOString(),
                        fila_original: i
                    }
                };
            
                console.log('📋 Nuevo concepto detectado:', claveConcepto, descripcionConcepto.substring(0, 50));
                filasProcesadas++;
            }
        
            // Si no hay concepto actual o no hay insumo, saltar
            if (!conceptoActual || !claveInsumo || cantidad === 0) {
                filasSaltadas++;
                continue;
            }
        
            // ─────────────────────────────────────────────────────────────
            // PROCESAR SUBPARTIDA (insumo del concepto actual)
            // ─────────────────────────────────────────────────────────────
            const tipoInsumo = this.detectarTipoInsumo(claveInsumo);
        
            if (tipoInsumo === 'material') {
                // Agregar a materiales
                if (!materiales.has(claveInsumo)) {
                    materiales.set(claveInsumo, {
                        id: 'MAT-' + claveInsumo,
                        codigo: claveInsumo,
                        nombre: descripcionInsumo,
                        descripcion_tecnica: descripcionInsumo,
                        categoria: conceptoActual.categoria,
                        unidad: unidadInsumo,
                        precio_base: precio,
                        moneda: 'MXN',
                        activo: true
                    });
                }
            
                conceptoActual.recursos.materiales.push({
                    material_codigo: claveInsumo,
                    nombre: descripcionInsumo,
                    cantidad: cantidad,
                    unidad: unidadInsumo,
                    precio_unitario: precio,
                    importe: importe,
                    desperdicio_porcentaje: 0
                });
            
                conceptoActual.costos_base.costo_material += importe;
            
            } else if (tipoInsumo === 'mano_obra') {
                // Agregar a mano de obra
                if (!manoObra.has(claveInsumo)) {
                    manoObra.set(claveInsumo, {
                        id: 'MO-' + claveInsumo,
                        codigo: claveInsumo,
                        puesto: descripcionInsumo,
                        especialidad: this.detectarEspecialidad(claveInsumo, descripcionInsumo),
                        salario_diario: precio,
                        salario_hora: precio / 8,
                        prestaciones_porcentaje: 35,
                        categoria: 'Eléctrico',
                        activo: true
                    });
                }
            
                conceptoActual.recursos.mano_obra.push({
                    mano_obra_codigo: claveInsumo,
                    puesto: descripcionInsumo,
                    horas_jornada: cantidad * 8,
                    salario_hora: precio / 8,
                    prestaciones_porcentaje: 35,
                    importe: importe
                });
            
                conceptoActual.costos_base.costo_mano_obra += importe;
            
            } else if (tipoInsumo === 'equipo') {
                // Agregar a equipos
                if (!equipos.has(claveInsumo)) {
                    equipos.set(claveInsumo, {
                        id: 'EQUIP-' + claveInsumo,
                        codigo: claveInsumo,
                        nombre: descripcionInsumo,
                        tipo: 'Equipo',
                        costo_renta_dia: precio,
                        costo_propiedad_dia: precio * 0.35,
                        operador_requerido: this.requiereOperador(claveInsumo),
                        categoria: this.detectarCategoriaEquipo(claveInsumo),
                        activo: true
                    });
                }
            
                conceptoActual.recursos.equipos.push({
                    equipo_codigo: claveInsumo,
                    nombre: descripcionInsumo,
                    horas: cantidad,
                    costo_unitario: precio,
                    importe: importe
                });
            
                conceptoActual.costos_base.costo_equipo += importe;
            
            } else if (tipoInsumo === 'herramienta') {
                // Herramienta menor (porcentaje)
                if (!herramienta.has(claveInsumo)) {
                    herramienta.set(claveInsumo, {
                        id: 'HERR-' + claveInsumo,
                        codigo: claveInsumo,
                        nombre: descripcionInsumo,
                        tipo: 'herramienta',
                        porcentaje: cantidad,
                        activo: true
                    });
                }
            
                conceptoActual.recursos.herramienta.push({
                    herramienta_codigo: claveInsumo,
                    nombre: descripcionInsumo,
                    porcentaje: cantidad,
                    importe: importe
                });
            
                conceptoActual.costos_base.costo_equipo += importe;
            }
        
            filasProcesadas++;
        }
    
        // Guardar último concepto
        if (conceptoActual) {
            conceptos.set(conceptoActual.codigo, conceptoActual);
            conceptosDetectados++;
            console.log('✅ Último concepto guardado:', conceptoActual.codigo);
        }
    
        console.log('✅ Procesamiento completado:');
        console.log('   - Conceptos detectados:', conceptosDetectados);
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
        
        // Mano de obra: MO031, MO084, MO091, MO094, MO021, MO082, MO085, MO111, etc.
        if (/^MO\d+$/.test(clave)) return 'mano_obra';
        
        // Herramienta: %MO1, %MO2, %MO3, %MO5
        if (/^%MO\d+$/.test(clave)) return 'herramienta';
        
        // Equipos: CFGRUA, CFECORTE, CFPLAN, CFDOBLA, CFREV, LLGRUA, LLCAMION, LLTORRE, etc.
        if (/^CF[A-Z]+$/.test(clave)) return 'equipo';
        if (/^LL[A-Z]+$/.test(clave)) return 'equipo';
        
        // Materiales: todo lo demás (347-VER-0177, 342-SQD-3519, 354-SCL-1204, etc.)
        return 'material';
    },
    
    detectarCategoria: function(clave, descripcion) {
        const desc = (descripcion || '').toLowerCase();
        
        if (desc.includes('eléctric') || desc.includes('cable') || desc.includes('conduit') || 
            desc.includes('tablero') || desc.includes('contacto') || desc.includes('ilumin') ||
            desc.includes('centro de carga') || desc.includes('caja') || desc.includes('chalupa')) {
            return 'Eléctrico';
        }
        if (desc.includes('ducto') || desc.includes('charola') || desc.includes('compuerta') ||
            desc.includes('codo circular') || desc.includes('lamina') || desc.includes('spiroducto') ||
            desc.includes('tee') || desc.includes('injerto')) {
            return 'HVAC';
        }
        if (desc.includes('soldad') || desc.includes('estructura') || desc.includes('montaje')) {
            return 'Estructuras';
        }
        if (desc.includes('limpiez') || desc.includes('desmont') || desc.includes('trazo')) {
            return 'Limpieza';
        }
        if (desc.includes('pint')) {
            return 'Pintura';
        }
        if (desc.includes('concreto') || desc.includes('colado') || desc.includes('acero') || desc.includes('albañil')) {
            return 'Concretos';
        }
        if (desc.includes('taquete') || desc.includes('pija') || desc.includes('tornillo')) {
            return 'Anclajes';
        }
        if (desc.includes('señalamient') || desc.includes('protección civil')) {
            return 'Señalamiento';
        }
        
        return 'General';
    },
    
    detectarSubcategoria: function(clave, descripcion) {
        const desc = (descripcion || '').toLowerCase();
        
        if (desc.includes('centro de carga') || desc.includes('tablero')) return 'Tableros';
        if (desc.includes('codo') || desc.includes('ducto')) return 'Ductos';
        if (desc.includes('compuerta')) return 'Compuertas';
        if (desc.includes('cable')) return 'Cableado';
        if (desc.includes('conduit')) return 'Canalización';
        if (desc.includes('charola')) return 'Soportería';
        if (desc.includes('ilumin') || desc.includes('luminaria')) return 'Iluminación';
        if (desc.includes('contacto') || desc.includes('caja') || desc.includes('chalupa')) return 'Contactos';
        if (desc.includes('gabinete')) return 'Gabinetes';
        if (desc.includes('tierra') || desc.includes('pararrayo')) return 'Tierra Física';
        if (desc.includes('soldad') || desc.includes('estructura')) return 'Soldadura';
        if (desc.includes('limpiez')) return 'Limpieza';
        if (desc.includes('trazo')) return 'Trazo';
        if (desc.includes('cople')) return 'Accesorios';
        if (desc.includes('tee') || desc.includes('injerto')) return 'Tees';
        if (desc.includes('taquete')) return 'Anclajes';
        if (desc.includes('señalamient')) return 'Señalamiento';
        
        return 'General';
    },
    
    detectarEspecialidad: function(clave, descripcion) {
        const desc = (descripcion || '').toLowerCase();
        
        if (desc.includes('eléctric')) return 'Eléctrico';
        if (desc.includes('instalacion')) return 'Instalaciones';
        if (desc.includes('soldad')) return 'Soldadura';
        if (desc.includes('operador')) return 'Operador';
        if (desc.includes('técnico')) return 'Técnico';
        if (desc.includes('oficial')) return 'Oficial';
        if (desc.includes('ayudante')) return 'Ayudante';
        if (desc.includes('sobrestante')) return 'Sobrestante';
        if (desc.includes('peón') || desc.includes('peon')) return 'Peón';
        if (desc.includes('albañil')) return 'Albañilería';
        if (desc.includes('carpintero')) return 'Carpintería';
        if (desc.includes('pintor')) return 'Pintura';
        if (desc.includes('herrero')) return 'Herrería';
        if (desc.includes('cabo')) return 'Cabo de Oficios';
        if (desc.includes('plom')) return 'Plomería';
        if (desc.includes('colocador')) return 'Colocación';
        
        return 'General';
    },
    
    detectarCategoriaEquipo: function(clave) {
        if (clave.includes('GRUA')) return 'Izaje';
        if (clave.includes('CORTE')) return 'Corte';
        if (clave.includes('PLAN') || clave.includes('SOLDAR')) return 'Soldadura';
        if (clave.includes('HIAB')) return 'Grúa';
        if (clave.includes('CAMION')) return 'Transporte';
        if (clave.includes('REV') || clave.includes('REVOLVEDOR')) return 'Concreto';
        if (clave.includes('DOBLA')) return 'Doblado';
        if (clave.includes('ASPIRAR')) return 'Limpieza';
        if (clave.includes('VIB')) return 'Compactación';
        if (clave.includes('TORRE') || clave.includes('ANDAMIO')) return 'Acceso';
        
        return 'General';
    },
    
    requiereOperador: function(clave) {
        return clave.includes('GRUA') || clave.includes('CAMION') || clave.includes('OPERADOR') || clave.includes('PLAN');
    },
    
    detectarFactores: function(clave, descripcion) {
        const factores = [];
        const desc = (descripcion || '').toLowerCase();
        
        if (desc.includes('altura') || desc.includes('elevacion')) factores.push('altura');
        if (desc.includes('andamio')) factores.push('andamios');
        if (desc.includes('grúa') || desc.includes('grua')) factores.push('izaje');
        if (desc.includes('soldad') || desc.includes('corte')) factores.push('soldadura');
        
        return factores.join(',');
    },
    
    detectarRiesgo: function(clave, descripcion) {
        const desc = (descripcion || '').toLowerCase();
        
        if (desc.includes('peligro') || desc.includes('alto voltaje') || desc.includes('tóxico')) return 'alto';
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
        
        // Verificar que db existe
        if (!window.db) {
            console.error('❌ ERROR: window.db no existe');
            alert('❌ Error: La base de datos no está inicializada. Recarga la página.');
            throw new Error('db no inicializada');
        }
        
        const reporte = {
            conceptos: { total: datos.conceptos.length, exitosos: 0, fallidos: 0 },
            materiales: { total: datos.materiales.length, exitosos: 0, fallidos: 0 },
            manoObra: { total: datos.manoObra.length, exitosos: 0, fallidos: 0 },
            equipos: { total: datos.equipos.length, exitosos: 0, fallidos: 0 },
            herramienta: { total: datos.herramienta.length, exitosos: 0, fallidos: 0 }
        };
        
        // Importar conceptos
        console.log('📋 Importando', datos.conceptos.length, 'conceptos...');
        for (const concepto of datos.conceptos) {
            try {
                const conceptoSimple = {
                    id: concepto.id,
                    codigo: concepto.codigo,
                    categoria: concepto.categoria,
                    subcategoria: concepto.subcategoria,
                    descripcion_corta: concepto.descripcion_corta,
                    descripcion_tecnica: concepto.descripcion_tecnica,
                    unidad: concepto.unidad,
                    rendimiento_base: concepto.rendimiento_base,
                    factores_aplicables: concepto.factores_aplicables,
                    riesgo_nivel: concepto.riesgo_nivel,
                    activo: concepto.activo !== undefined ? concepto.activo : true
                };
                
                await window.db.conceptos.put(conceptoSimple);
                reporte.conceptos.exitosos++;
                
            } catch (error) {
                console.error('❌ Error importando concepto:', concepto.codigo, error.message);
                reporte.conceptos.fallidos++;
            }
        }
        
        // Importar materiales
        console.log('📦 Importando', datos.materiales.length, 'materiales...');
        for (const material of datos.materiales) {
            try {
                await window.db.materiales.put(material);
                reporte.materiales.exitosos++;
            } catch (error) {
                console.error('❌ Error importando material:', material.codigo, error.message);
                reporte.materiales.fallidos++;
            }
        }
        
        // Importar mano de obra
        console.log('👷 Importando', datos.manoObra.length, 'mano de obra...');
        for (const mo of datos.manoObra) {
            try {
                await window.db.manoObra.put(mo);
                reporte.manoObra.exitosos++;
            } catch (error) {
                console.error('❌ Error importando MO:', mo.codigo, error.message);
                reporte.manoObra.fallidos++;
            }
        }
        
        // Importar equipos
        console.log('🏗️ Importando', datos.equipos.length, 'equipos...');
        for (const equipo of datos.equipos) {
            try {
                const equipoSimple = {
                    id: equipo.id,
                    codigo: equipo.codigo,
                    nombre: equipo.nombre,
                    tipo: equipo.tipo || 'Equipo',
                    categoria: equipo.categoria || 'General',
                    costo_renta_dia: equipo.costo_renta_dia || 0,
                    operador_requerido: equipo.operador_requerido || false,
                    activo: equipo.activo !== undefined ? equipo.activo : true
                };
                
                await window.db.equipos.put(equipoSimple);
                reporte.equipos.exitosos++;
                
            } catch (error) {
                console.error('❌ Error importando equipo:', equipo.codigo, error.message);
                reporte.equipos.fallidos++;
            }
        }
        
        // Importar herramienta
        console.log('🔧 Importando', datos.herramienta.length, 'herramienta...');
        for (const herr of datos.herramienta) {
            try {
                await window.db.herramienta.put(herr);
                reporte.herramienta.exitosos++;
            } catch (error) {
                console.error('❌ Error importando herramienta:', herr.codigo, error.message);
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
        const percentEl = document.getElementById('progress-percent');
        const barEl = document.getElementById('progress-bar');
        const statusEl = document.getElementById('progress-status');
    
        if (percentEl) percentEl.textContent = percent + '%';
        if (barEl) barEl.style.width = percent + '%';
        if (statusEl) statusEl.textContent = status;
    
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
                <div style="background:white;padding:15px;border-radius:8px;">
                    <div style="font-size:24px;font-weight:700;color:#1a1a1a;">${r.herramienta}</div>
                    <div style="font-size:13px;color:#666;">Herramienta</div>
                </div>
            </div>
            <p style="margin-top:15px;color:#666;font-size:13px;">Filas procesadas: ${r.filasProcesadas} | Filas saltadas: ${r.filasSaltadas}</p>
            <button onclick="window.location.reload()" class="btn btn-primary" style="margin-top:20px;width:100%;padding:14px;">🔄 Recargar Página</button>
        `;
    }
};

console.log('✅ importador_excel_smartcot.js listo - ESTRUCTURA REAL');



