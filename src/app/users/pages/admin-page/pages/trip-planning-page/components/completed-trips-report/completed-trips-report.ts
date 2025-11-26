import { Component, signal, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { TripPlanningService } from '../../../../services/trip-planning.service';
import { ExcelReportService } from '../../../../../../../shared/services/excel-report.service';
import { Emptystate } from '../../../../../../components/emptystate/emptystate';
import { CompletedTripCardComponent } from '../completed-trip-card/completed-trip-card';

@Component({
    selector: 'app-completed-trips-report',
    imports: [
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatDatepickerModule,
        MatInputModule,
        MatFormFieldModule,
        MatNativeDateModule,
        FormsModule,
        Emptystate,
        CompletedTripCardComponent,
    ],
    templateUrl: './completed-trips-report.html',
    styleUrl: './completed-trips-report.scss',
})
export class CompletedTripsReportComponent implements OnInit {
    completedTrips = signal<any[]>([]);
    loading = signal(true);
    fechaDesde: Date | null = null;
    fechaHasta: Date | null = null;

    private tripService = inject(TripPlanningService);
    private excelReportService = inject(ExcelReportService);
    private snackBar = inject(MatSnackBar);

    async ngOnInit() {
        await this.cargarViajesCompletados();
    }

    async cargarViajesCompletados() {
        try {
            this.loading.set(true);

            const fechaDesdeStr = this.fechaDesde
                ? this.fechaDesde.toISOString().split('T')[0]
                : undefined;
            const fechaHastaStr = this.fechaHasta
                ? this.fechaHasta.toISOString().split('T')[0]
                : undefined;

            const viajes = await this.tripService.getCompletedTrips(
                fechaDesdeStr,
                fechaHastaStr
            );

            this.completedTrips.set(viajes);
        } catch (error) {
            console.error('Error cargando viajes completados:', error);
            this.snackBar.open('Error al cargar viajes completados', 'Cerrar', {
                duration: 3000,
            });
        } finally {
            this.loading.set(false);
        }
    }

    async aplicarFiltros() {
        await this.cargarViajesCompletados();
    }

    limpiarFiltros() {
        this.fechaDesde = null;
        this.fechaHasta = null;
        this.cargarViajesCompletados();
    }

    async exportarReporteViaje(idplanificacion: string) {
        try {
            const viaje = this.completedTrips().find(
                (t) => t.idplanificacion === idplanificacion
            );

            if (!viaje) {
                this.snackBar.open('Viaje no encontrado', 'Cerrar', { duration: 3000 });
                return;
            }

            this.snackBar.open('Generando reporte...', 'Cerrar', { duration: 2000 });

            // Generar reporte para un solo viaje usando el servicio existente
            await this.excelReportService.generateTripReport(idplanificacion);

            this.snackBar.open('Reporte generado exitosamente', 'Cerrar', {
                duration: 3000,
            });
        } catch (error) {
            console.error('Error al generar reporte:', error);
            this.snackBar.open('Error al generar el reporte', 'Cerrar', {
                duration: 3000,
            });
        }
    }

    getTotalPasajeros(): number {
        return this.completedTrips().reduce(
            (sum: number, trip: any) => sum + (trip.totalPasajeros || 0),
            0
        );
    }
}
