import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TripRatingService } from './trip-rating.service';
import { TripRatingDialog } from '../components/trip-rating-dialog/trip-rating-dialog';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class PendingRatingsCheckerService {
  private supabase = inject(SupabaseService).supabase;
  private ratingService = inject(TripRatingService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  private isCheckingRatings = false;

  async checkAndShowPendingRatings(idusuario: string): Promise<void> {
    if (this.isCheckingRatings) return;

    this.isCheckingRatings = true;

    try {
      const pendingTrips = await this.getPendingTripsForUser(idusuario);

      if (pendingTrips.length > 0) {
        const trip = pendingTrips[0];
        this.showRatingDialog(trip, idusuario);
      }
    } catch (error) {
      console.error('Error verificando calificaciones pendientes:', error);
    } finally {
      this.isCheckingRatings = false;
    }
  }


  private async getPendingTripsForUser(idusuario: string): Promise<
    Array<{
      idplanificacion: string;
      destino: string;
      fecha: string;
    }>
  > {
    const { data: personalTrips } = await this.supabase
      .from('asignaciondestino_planificacionviaje')
      .select(
        `
        idplanificacion,
        estado,
        planificacion_viaje!inner (
          idplanificacion,
          fechapartida,
          horarealllegada,
          destino (
            nomdestino
          )
        ),
        asignacion_destino!inner (
          personal!inner (
            idusuario
          )
        )
      `
      )
      .eq('asignacion_destino.personal.idusuario', idusuario)
      .eq('estado', 'asistio')
      .not('planificacion_viaje.horarealllegada', 'is', null);

    const { data: visitantTrips } = await this.supabase
      .from('visitante_planificacionviaje')
      .select(
        `
        idplanificacion,
        estado,
        planificacion_viaje!inner (
          idplanificacion,
          fechapartida,
          horarealllegada,
          destino (
            nomdestino
          )
        ),
        visitante!inner (
          idusuario
        )
      `
      )
      .eq('visitante.idusuario', idusuario)
      .eq('estado', 'asistio')
      .not('planificacion_viaje.horarealllegada', 'is', null);

    const allTrips = [...(personalTrips || []), ...(visitantTrips || [])];

    const pendingTrips = [];

    for (const trip of allTrips) {
      const planificacion = Array.isArray(trip.planificacion_viaje)
        ? trip.planificacion_viaje[0]
        : trip.planificacion_viaje;

      if (!planificacion) continue;

      const existingRating = await this.ratingService.getUserRating(
        planificacion.idplanificacion,
        idusuario
      );

      if (!existingRating) {
        const destino = Array.isArray(planificacion.destino)
          ? planificacion.destino[0]
          : planificacion.destino;

        pendingTrips.push({
          idplanificacion: planificacion.idplanificacion,
          destino: destino?.nomdestino || 'Destino desconocido',
          fecha: planificacion.fechapartida,
        });
      }
    }

    return pendingTrips;
  }


  private showRatingDialog(
    trip: {
      idplanificacion: string;
      destino: string;
      fecha: string;
    },
    idusuario: string
  ): void {
    const dialogRef = this.dialog.open(TripRatingDialog, {
      data: {
        idplanificacion: trip.idplanificacion,
        destino: trip.destino,
        fecha: this.formatDate(trip.fecha),
      },
      disableClose: false,
      width: '500px',
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.ratingService.rateTrip(
            trip.idplanificacion,
            idusuario,
            result.calificacion,
            result.comentario
          );

          this.snackBar.open('Gracias por tu calificación', 'Cerrar', {
            duration: 3000,
          });

          setTimeout(() => {
            this.checkAndShowPendingRatings(idusuario);
          }, 500);
        } catch (error) {
          console.error('Error guardando calificación:', error);
          this.snackBar.open('Error al guardar la calificación', 'Cerrar', {
            duration: 3000,
          });
        }
      }
    });
  }


  private formatDate(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }


  subscribeToCompletedTrips(idusuario: string): () => void {
    const subscription = this.supabase
      .channel('completed-trips')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'planificacion_viaje',
          filter: 'horarealllegada=not.null',
        },
        async (payload) => {
          console.log('Viaje completado detectado:', payload);

          setTimeout(() => {
            this.checkAndShowPendingRatings(idusuario);
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
}
