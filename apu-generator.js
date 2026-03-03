// ─────────────────────────────────────────────────────────────────────
// SMARTCOT - GENERADOR DE APU (Análisis de Precios Unitarios)
// Formato profesional para clientes
// ─────────────────────────────────────────────────────────────────────

window.apuGenerator = {
    
    // Generar APU para un concepto
    generarAPU: async function(conceptoId) {
        const concepto = await db.conceptos.get(conceptoId);
        
        if (!concepto) {
            throw new Error('Concepto no encontrado');
        }
        
        const costoDirecto = indirectosEngine.calcularCostoDirecto(concepto);
        const indirectos = indirectosEngine.calcularIndirectos(concepto);
        const equipos = equiposEngine.calcularEquipos(concepto);
        
        return {
            concepto: {
                codigo: concepto.codigo,
                descripcion: concepto.descripcion_corta,
                unidad: concepto.unidad,
                rendimiento: concepto.rendimiento_base
            },
            costos: {
                materiales: {
                    detalle: concepto.recursos.materiales,
                    subtotal: costoDirecto.materiales || 0
                },
                manoObra: {
                    detalle: concepto.recursos.mano_obra,
                    subtotal: costoDirecto.manoObra || 0
                },
                equipos: {
                    detalle: equipos.detalle,
                    subtotal: equipos.total
                },
                indirectos: {
                    detalle: indirectos.detalle,
                    subtotal: indirectos.total
                },
                costoDirectoTotal: costoDirecto,
                costoConIndirectos: indirectos.costoConIndirectos,
                costoUnitario: indirectos.costoConIndirectos / concepto.rendimiento_base
            },
            fecha: new Date().toISOString()
        };
    },
    
    // Exportar APU a PDF
    exportarPDF: async function(apu) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Encabezado
        doc.setFontSize(16);
        doc.text('ANÁLISIS DE PRECIOS UNITARIOS', 105, 20, { align: 'center' });
        
        // Datos del concepto
        doc.setFontSize(12);
        doc.text(`Código: ${apu.concepto.codigo}`, 20, 40);
        doc.text(`Descripción: ${apu.concepto.descripcion}`, 20, 50);
        doc.text(`Unidad: ${apu.concepto.unidad}`, 20, 60);
        doc.text(`Rendimiento: ${apu.concepto.rendimiento} ${apu.concepto.unidad}/jornada`, 20, 70);
        
        // Tabla de materiales
        let yPos = 90;
        doc.text('MATERIALES:', 20, yPos);
        yPos += 10;
        
        apu.costos.materiales.detalle.forEach((m, i) => {
            doc.text(`${i+1}. ${m.nombre} - ${m.cantidad} ${m.unidad} x $${m.precio_unitario} = $${m.importe}`, 25, yPos);
            yPos += 7;
        });
        
        // Tabla de mano de obra
        yPos += 10;
        doc.text('MANO DE OBRA:', 20, yPos);
        yPos += 10;
        
        apu.costos.manoObra.detalle.forEach((mo, i) => {
            doc.text(`${i+1}. ${mo.puesto} - ${mo.horas_jornada} hrs x $${mo.salario_hora} = $${mo.importe}`, 25, yPos);
            yPos += 7;
        });
        
        // Totales
        yPos += 20;
        doc.setFontSize(14);
        doc.text(`Costo Directo: $${apu.costos.costoDirectoTotal.toFixed(2)}`, 20, yPos);
        yPos += 10;
        doc.text(`Indirectos: $${apu.costos.indirectos.subtotal.toFixed(2)}`, 20, yPos);
        yPos += 10;
        doc.text(`Costo Total: $${apu.costos.costoConIndirectos.toFixed(2)}`, 20, yPos);
        yPos += 10;
        doc.text(`Costo Unitario: $${apu.costos.costoUnitario.toFixed(2)} por ${apu.concepto.unidad}`, 20, yPos);
        
        // Guardar PDF
        doc.save(`APU_${apu.concepto.codigo}.pdf`);
    }
};

console.log('✅ apu-generator.js listo');
