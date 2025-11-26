import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    MAT_DIALOG_DATA,
    MatDialogModule,
    MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { DriverReportsService } from '../../services/driver-reports.service';
import { PdfReportService } from '../../../../../shared/services/pdf-report.service';
import { Emptystate } from '../../../../components/emptystate/emptystate';

export interface DriverReportDialogData {
    idconductor: string;
    nombre: string;
    ci: string;
}

@Component({
    selector: 'app-driver-reports-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatFormFieldModule,
        MatInputModule,
        MatTableModule,
        ReactiveFormsModule,
        Emptystate,
    ],
    providers: [
        provideNativeDateAdapter(),
    ],
    templateUrl: './driver-reports-dialog.html',
    styleUrl: './driver-reports-dialog.scss',
})
export class DriverReportsDialog implements OnInit {
    data: DriverReportDialogData = inject(MAT_DIALOG_DATA);
    private dialogRef = inject(MatDialogRef<DriverReportsDialog>);
    private driverReportsService = inject(DriverReportsService);
    private pdfReportService = inject(PdfReportService);
    private snackBar = inject(MatSnackBar);

    trips = signal<any[]>([]);
    loading = signal(false);

    rangeForm = new FormGroup({
        start: new FormControl<Date | null>(null),
        end: new FormControl<Date | null>(null),
    });

    displayedColumns: string[] = [
        'fecha',
        'destino',
        'vehiculo',
        'tipo',
        'empresa',
        'horaPartida',
        'horaLlegada',
    ];

    async ngOnInit() {
        await this.loadTrips();
    }

    async loadTrips() {
        try {
            this.loading.set(true);

            const startDate = this.rangeForm.value.start;
            const endDate = this.rangeForm.value.end;

            const fechaDesde = startDate
                ? startDate.toISOString().split('T')[0]
                : undefined;
            const fechaHasta = endDate
                ? endDate.toISOString().split('T')[0]
                : undefined;

            const viajes = await this.driverReportsService.getDriverTrips(
                this.data.idconductor,
                fechaDesde,
                fechaHasta
            );

            this.trips.set(viajes);
        } catch (error) {
            console.error('Error cargando viajes del conductor:', error);
            this.snackBar.open('Error al cargar viajes', 'Cerrar', {
                duration: 3000,
            });
        } finally {
            this.loading.set(false);
        }
    }

    async applyDateFilter() {
        await this.loadTrips();
    }

    clearFilters() {
        this.rangeForm.reset();
        this.loadTrips();
    }

    exportToPDF() {
        try {
            if (this.trips().length === 0) {
                this.snackBar.open('No hay viajes para exportar', 'Cerrar', {
                    duration: 3000,
                });
                return;
            }

            this.snackBar.open('Generando PDF...', 'Cerrar', { duration: 2000 });

            const dateRange =
                this.rangeForm.value.start && this.rangeForm.value.end
                    ? {
                        start: this.rangeForm.value.start
                            .toLocaleDateString('es-ES')
                            .toString(),
                        end: this.rangeForm.value.end
                            .toLocaleDateString('es-ES')
                            .toString(),
                    }
                    : undefined;

            this.pdfReportService.generateDriverReport(
                {
                    nombre: this.data.nombre,
                    ci: this.data.ci,
                },
                this.trips(),
                dateRange
            );

            this.snackBar.open('PDF generado exitosamente', 'Cerrar', {
                duration: 3000,
            });
        } catch (error) {
            console.error('Error al generar PDF:', error);
            this.snackBar.open('Error al generar el PDF', 'Cerrar', {
                duration: 3000,
            });
        }
    }

    formatHora(hora: string | null): string {
        if (!hora) return '-';
        return hora.substring(0, 5);
    }

    getDestinoNombre(destino: any): string {
        const dest = Array.isArray(destino) ? destino[0] : destino;
        return dest?.nomdestino || '-';
    }

    getVehiculoPlaca(cve: any): string {
        const conductorVehiculo = Array.isArray(cve) ? cve[0] : cve;
        const vehiculo = Array.isArray(conductorVehiculo?.vehiculo)
            ? conductorVehiculo?.vehiculo[0]
            : conductorVehiculo?.vehiculo;
        return vehiculo?.nroplaca || '-';
    }

    getVehiculoTipo(cve: any): string {
        const conductorVehiculo = Array.isArray(cve) ? cve[0] : cve;
        const vehiculo = Array.isArray(conductorVehiculo?.vehiculo)
            ? conductorVehiculo?.vehiculo[0]
            : conductorVehiculo?.vehiculo;
        return vehiculo?.tipovehiculo || '-';
    }

    getEmpresaNombre(cve: any): string {
        const conductorVehiculo = Array.isArray(cve) ? cve[0] : cve;
        const empresa = Array.isArray(conductorVehiculo?.empresa)
            ? conductorVehiculo?.empresa[0]
            : conductorVehiculo?.empresa;
        return empresa?.nomempresa || '-';
    }

    close() {
        this.dialogRef.close();
    }
}
