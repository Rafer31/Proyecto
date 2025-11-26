import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
    providedIn: 'root',
})
export class PdfReportService {
    generateDriverReport(
        conductor: { nombre: string; ci: string },
        viajes: any[],
        dateRange?: { start: string; end: string }
    ) {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.setTextColor(25, 118, 210);
        doc.text('Informe de Viajes - Conductor', 14, 20);

        // Información del conductor
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Conductor: ${conductor.nombre}`, 14, 32);
        doc.text(`CI: ${conductor.ci}`, 14, 39);

        // Fecha de generación
        const fechaGeneracion = new Date().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generado: ${fechaGeneracion}`, 14, 46);

        // Filtro de fechas si existe
        let startY = 55;
        if (dateRange && dateRange.start && dateRange.end) {
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.text(`Período: ${dateRange.start} - ${dateRange.end}`, 14, startY);
            startY += 10;
        }

        // Preparar datos para la tabla
        const tableData = viajes.map((viaje) => {
            const cve = Array.isArray(viaje.conductor_vehiculo_empresa)
                ? viaje.conductor_vehiculo_empresa[0]
                : viaje.conductor_vehiculo_empresa;

            const vehiculo = Array.isArray(cve?.vehiculo)
                ? cve?.vehiculo[0]
                : cve?.vehiculo;

            const empresa = Array.isArray(cve?.empresa)
                ? cve?.empresa[0]
                : cve?.empresa;

            const destino = Array.isArray(viaje.destino)
                ? viaje.destino[0]
                : viaje.destino;

            return [
                viaje.fechapartida || '-',
                destino?.nomdestino || '-',
                vehiculo?.nroplaca || '-',
                vehiculo?.tipovehiculo || '-',
                empresa?.nomempresa || '-',
                viaje.horapartida?.substring(0, 5) || '-',
                viaje.horarealllegada?.substring(0, 5) || 'Por definir',
            ];
        });

        // Tabla de viajes
        autoTable(doc, {
            startY: startY + 5,
            head: [
                ['Fecha', 'Destino', 'Vehículo', 'Tipo', 'Empresa', 'H. Partida', 'H. Llegada'],
            ],
            body: tableData,
            theme: 'striped',
            headStyles: {
                fillColor: [25, 118, 210],
                textColor: 255,
                fontSize: 10,
                fontStyle: 'bold',
            },
            bodyStyles: {
                fontSize: 9,
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245],
            },
            margin: { top: 10, left: 14, right: 14 },
            didDrawPage: (data) => {
                const pageCount = (doc as any).internal.getNumberOfPages();
                const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;

                doc.setFontSize(9);
                doc.setTextColor(150);
                doc.text(
                    `Página ${pageNumber} de ${pageCount}`,
                    doc.internal.pageSize.width / 2,
                    doc.internal.pageSize.height - 10,
                    { align: 'center' }
                );
            },
        });

        // Total de viajes
        const finalY = (doc as any).lastAutoTable.finalY || startY + 50;
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total de viajes: ${viajes.length}`, 14, finalY + 10);

        // Descargar PDF
        const fileName = `Informe_Conductor_${conductor.ci}_${new Date().toISOString().split('T')[0]
            }.pdf`;
        doc.save(fileName);
    }
}
