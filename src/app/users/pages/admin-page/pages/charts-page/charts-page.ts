import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { Emptystate } from '../../../../components/emptystate/emptystate';
import {
  StatisticsService,
  DestinationStats,
  UserAbsenceStats,
  GeneralStats,
  DriverPerformanceStats,
} from '../../../../../shared/services/statistics.service';
import {
  TripRatingService,
  RatingSummary,
} from '../../../../../shared/services/trip-rating.service';

@Component({
  selector: 'app-charts-page',
  standalone: true,
  imports: [
    CommonModule,
    Emptystate,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatChipsModule,
    MatDividerModule,
    MatTabsModule,
  ],
  templateUrl: './charts-page.html',
  styleUrl: './charts-page.scss',
})
export class ChartsPage implements OnInit {
  private statsService = inject(StatisticsService);
  private ratingService = inject(TripRatingService);

  generalStats = signal<GeneralStats | null>(null);
  topDestinations = signal<DestinationStats[]>([]);
  topAbsences = signal<UserAbsenceStats[]>([]);
  topDrivers = signal<DriverPerformanceStats[]>([]);
  topRatedTrips = signal<RatingSummary[]>([]);

  isLoading = signal(true);
  error = signal<string | null>(null);

  destinationsColumns = [
    'nomdestino',
    'total_viajes',
    'viajes_completados',
    'promedio_calificacion',
  ];
  absencesColumns = [
    'nombre_completo',
    'rol',
    'total_inasistencias',
    'total_viajes',
    'porcentaje_inasistencias',
  ];
  driversColumns = [
    'nombre_completo',
    'total_viajes_realizados',
    'promedio_calificacion',
    'tasa_asistencia_pasajeros',
  ];
  tripsColumns = [
    'nomdestino',
    'fechapartida',
    'total_calificaciones',
    'promedio_calificacion',
  ];

  async ngOnInit() {
    await this.loadStatistics();
  }

  private async loadStatistics() {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const [general, destinations, absences, drivers, trips] =
        await Promise.all([
          this.statsService.getGeneralStatistics(),
          this.statsService.getMostUsedDestinations(5),
          this.statsService.getUsersWithMostAbsences(10),
          this.statsService.getBestPerformingDrivers(5),
          this.ratingService.getTopRatedTrips(),
        ]);

      this.generalStats.set(general);
      this.topDestinations.set(destinations);
      this.topAbsences.set(absences);
      this.topDrivers.set(drivers);
      this.topRatedTrips.set(trips.slice(0, 5));
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      this.error.set('Error al cargar las estadísticas');
    } finally {
      this.isLoading.set(false);
    }
  }

  formatPercentage(value: number | null | undefined): string {
    if (value === null || value === undefined) return '0%';
    return `${value.toFixed(1)}%`;
  }

  formatRating(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(2)} ⭐`;
  }

  formatDate(date: string): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  getAbsenceColor(percentage: number): string {
    if (percentage >= 50) return 'warn';
    if (percentage >= 25) return 'accent';
    return 'primary';
  }

  getRatingColor(rating: number): string {
    if (rating >= 4.5) return 'primary';
    if (rating >= 3.5) return 'accent';
    return 'warn';
  }
}
