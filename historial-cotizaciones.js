// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - HISTORIAL DE COTIZACIONES
// ─────────────────────────────────────────────────────────────────────

console.log('📋 historial-cotizaciones.js cargado');

window.historialCotizaciones = {
    
    cotizaciones: [],
    
    // ─────────────────────────────────────────────────────────────────
    // CARGAR COTIZACIONES
    // ─────────────────────────────────────────────────────────────────
    cargar: async function() {
        try {
            if (!window.db) {
                console.error('❌ DB no disponible');
                return;
            }
            
            this.cotizaciones = await window.db.cotizaciones.reverse().limit(100).toArray();
            const clientes = await window.db.clientes.toArray();
            
            const tbody = document.getElementById('historial-cotizaciones-tabla');
            if (!tbody) return;
            
            if (this.cotizaciones.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="padding:40px;text-align:center;color:#999;">No hay cotizaciones guardadas</td></tr>';
                return;
            }
            
            tbody.innerHTML = this.cotizaciones.map(function(c) {
                const cliente = clientes.find(cl => cl.id == c.clienteId);
                const clienteNombre = cliente ? cliente.nombre : 'Sin cliente';
                const fecha = new Date(c.fecha).toLocaleDateString('es-MX');
                const total = calculator.formatoMoneda(c.totalFinal || 0);
                
                return '<tr style="transition:background 0.3s;border-bottom:1px solid #ddd;" onmouseover="this.style.background=\'#f5f7fa\'" onmouseout="this.style.background=\'white\'">' +
                    '<td style="padding:15px;font-weight:600;color:#1a1a1a;">#' + c.id + '</td>' +
                    '<td style="padding:15px;color:#666;">' + clienteNombre + '</td>' +
                    '<td style="padding:15px;color:#666;">' + (c.descripcion || 'Sin descripción') + '</td>' +
                    '<td style="padding:15px;color:#666;">' + fecha + '</td>' +
                    '<td style="padding:15px;text-align:right;font-weight:700;color:#4CAF50;">' + total + '</td>' +
                    '<td style="padding:15px;text-align:center;">' +
                    '<button onclick="historialCotizaciones.ver(' + c.id + ')" style="background:#2196F3;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;margin:2px;" title="Ver">👁️</button>' +
                    '<button onclick="historialCotizaciones.duplicar(' + c.id + ')" style="background:#FF9800;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;margin:2px;" title="Duplicar">📋</button>' +
                    '<button onclick="historialCotizaciones.exportarPDF(' + c.id + ')" style="background:#f44336;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;margin:2px;" title="Exportar PDF">📄</button>' +
                    '<button onclick="historialCotizaciones.eliminar(' + c.id + ')" style="background:#9E9E9E;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;margin:2px;" title="Eliminar">🗑️</button>' +
                    '</td>' +
                    '</tr>';
            }).join('');
            
            console.log('✅ Cotizaciones cargadas:', this.cotizaciones.length);
            
        } catch (error) {
            console.error('❌ Error cargando cotizaciones:', error);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // BUSCAR COTIZACIONES
    // ─────────────────────────────────────────────────────────────────
    buscar: async function() {
        const termino = document.getElementById('buscar-cotizacion')?.value.trim().toLowerCase();
        
        if (!termino || termino.length < 2) {
            await this.cargar();
            return;
        }
        
        const tbody = document.getElementById('historial-cotizaciones-tabla');
        if (!tbody) return;
        
        const filtradas = this.cotizaciones.filter(c => {
            return (c.id && c.id.toString().includes(termino)) ||
                   (c.descripcion && c.descripcion.toLowerCase().includes(termino)) ||
                   (c.clienteId && c.clienteId.toString().includes(termino));
        });
        
        if (filtradas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding:40px;text-align:center;color:#999;">No se encontraron cotizaciones</td></tr>';
            return;
        }
        
        // Reutilizar lógica de renderizado (simplificada para este ejemplo)
        await this.cargar();
    },
    
    // ─────────────────────────────────────────────────────────────────
    // VER COTIZACIÓN
    // ─────────────────────────────────────────────────────────────────
    ver: async function(id) {
        try {
            const cotizacion = await window.db.cotizaciones.get(id);
            if (!cotizacion) {
                alert('❌ Cotización no encontrada');
                return;
            }
            
            // Aquí podrías abrir un modal o navegar a una pantalla de detalle
            alert('📋 Cotización #' + id + '\n\nCliente: ' + cotizacion.clienteId + '\nTotal: ' + calculator.formatoMoneda(cotizacion.totalFinal));
            
        } catch (error) {
            console.error('❌ Error viendo cotización:', error);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // DUPLICAR COTIZACIÓN (PARA EDITAR)
    // ─────────────────────────────────────────────────────────────────
    duplicar: async function(id) {
        try {
            const cotizacionOriginal = await window.db.cotizaciones.get(id);
            if (!cotizacionOriginal) {
                alert('❌ Cotización no encontrada');
                return;
            }
            
            if (!confirm('¿Duplicar cotización #' + id + ' para editar?')) {
                return;
            }
            
            // Crear copia
            const cotizacionNueva = {
                ...cotizacionOriginal,
                id: undefined, // Para que Dexie genere nuevo ID
                fecha: new Date().toISOString(),
                estado: 'borrador',
                descripcion: cotizacionOriginal.descripcion + ' (Copia)'
            };
            
            const nuevoId = await window.db.cotizaciones.add(cotizacionNueva);
            
            alert('✅ Cotización duplicada: #' + nuevoId + '\n\nAhora puedes editarla en Nueva Cotización');
            
            // Recargar lista
            await this.cargar();
            
        } catch (error) {
            console.error('❌ Error duplicando cotización:', error);
            alert('❌ Error: ' + error.message);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // EXPORTAR PDF
    // ─────────────────────────────────────────────────────────────────
    exportarPDF: async function(id) {
        try {
            const cotizacion = await window.db.cotizaciones.get(id);
            if (!cotizacion) {
                alert('❌ Cotización no encontrada');
                return;
            }
            
            if (typeof window.jspdf === 'undefined') {
                alert('⚠️ jsPDF no está cargado. Verifica que el script esté incluido.');
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Encabezado
            doc.setFontSize(18);
            doc.text('COTIZACIÓN #' + cotizacion.id, 105, 20, { align: 'center' });
            
            // Información
            doc.setFontSize(12);
            doc.text('Fecha: ' + new Date(cotizacion.fecha).toLocaleDateString('es-MX'), 20, 40);
            doc.text('Cliente: ' + (cotizacion.clienteId || 'N/A'), 20, 50);
            doc.text('Descripción: ' + (cotizacion.descripcion || 'N/A'), 20, 60);
            
            // Conceptos
            doc.text('Conceptos:', 20, 80);
            let yPos = 90;
            
            if (cotizacion.conceptosCatalogo && cotizacion.conceptosCatalogo.length > 0) {
                cotizacion.conceptosCatalogo.forEach(function(c) {
                    doc.setFontSize(10);
                    doc.text(c.codigo + ' - ' + (c.descripcion_corta || 'Sin descripción'), 20, yPos);
                    doc.text(calculator.formatoMoneda((c.costos_base?.costo_directo_total || 0) * (c.cantidad || 1)), 180, yPos, { align: 'right' });
                    yPos += 7;
                });
            }
            
            // Totales
            yPos += 10;
            doc.setDrawColor(200);
            doc.line(20, yPos, 190, yPos);
            yPos += 10;
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Subtotal:', 140, yPos);
            doc.text(calculator.formatoMoneda(cotizacion.subtotal || 0), 190, yPos, { align: 'right' });
            yPos += 10;
            
            doc.text('IVA (16%):', 140, yPos);
            doc.text(calculator.formatoMoneda(cotizacion.iva || 0), 190, yPos, { align: 'right' });
            yPos += 10;
            
            doc.setFontSize(14);
            doc.text('TOTAL:', 140, yPos);
            doc.text(calculator.formatoMoneda(cotizacion.totalFinal || 0), 190, yPos, { align: 'right' });
            
            // Guardar
            doc.save('Cotizacion-' + cotizacion.id + '.pdf');
            
            console.log('✅ PDF exportado');
            
        } catch (error) {
            console.error('❌ Error exportando PDF:', error);
            alert('❌ Error: ' + error.message);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // ELIMINAR COTIZACIÓN
    // ─────────────────────────────────────────────────────────────────
    eliminar: async function(id) {
        try {
            if (!confirm('¿Eliminar cotización #' + id + '?\n\nEsta acción no se puede deshacer.')) {
                return;
            }
            
            await window.db.cotizaciones.delete(id);
            
            alert('✅ Cotización eliminada');
            
            // Recargar lista
            await this.cargar();
            
        } catch (error) {
            console.error('❌ Error eliminando cotización:', error);
            alert('❌ Error: ' + error.message);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────
    // EXPORTAR EXCEL
    // ─────────────────────────────────────────────────────────────────
    exportarExcel: async function() {
        try {
            if (typeof XLSX === 'undefined') {
                alert('⚠️ SheetJS no está cargado');
                return;
            }
            
            const datos = this.cotizaciones.map(c => ({
                'ID': c.id,
                'Cliente': c.clienteId,
                'Descripción': c.descripcion,
                'Fecha': new Date(c.fecha).toLocaleDateString('es-MX'),
                'Subtotal': c.subtotal || 0,
                'IVA': c.iva || 0,
                'Total': c.totalFinal || 0,
                'Estado': c.estado || 'pendiente'
            }));
            
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(datos);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Cotizaciones');
            
            XLSX.writeFile(workbook, 'Cotizaciones-SmartCot.xlsx');
            
            console.log('✅ Excel exportado');
            
        } catch (error) {
            console.error('❌ Error exportando Excel:', error);
            alert('❌ Error: ' + error.message);
        }
    }
};

console.log('✅ historial-cotizaciones.js listo');
