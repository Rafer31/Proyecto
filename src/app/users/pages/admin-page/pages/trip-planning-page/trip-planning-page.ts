import { Component, signal, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { Emptystate } from '../../../../components/emptystate/emptystate';
import { TripPlanningService } from '../../services/trip-planning.service';
import { PlanningCardComponent } from './components/planning-card/planning-card';
import { RegisterTripDialog } from './components/register-planning/register-planning';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EditTripDialog } from './components/edit-trip-dialog/edit-trip-dialog';
import { ConfirmDialog } from '../../../../components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-trip-planning-page',
  imports: [
    Emptystate,
    PlanningCardComponent,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './trip-planning-page.html',
  styleUrl: './trip-planning-page.scss',
})
export class TripPlanningPage implements OnInit {
  trips = signal<
    {
      idviaje: string;
      fechaViaje: string;
      destino: string;
      horallegada: string;
      horapartida: string;
      cantdisponibleasientos?: number;
    }[]
  >([]);

  loading = signal(true);

  private dialog = inject(MatDialog);
  private tripService = inject(TripPlanningService);

  async ngOnInit() {
    try {
      this.loading.set(true);
      const viajes = await this.tripService.getViajes();
      this.trips.set(
        viajes.map((v: any) => ({
          idviaje: v.idplanificacion,
          fechaViaje: v.fechapartida,
          destino: v.destino?.nomdestino ?? 'Sin destino',
          horallegada: v.horallegada,
          horapartida: v.horapartida,
          cantdisponibleasientos:
            v.conductor_vehiculo_empresa?.cantdisponibleasientos ?? 0,
        }))
      );
    } catch (err) {
      console.error('Error cargando viajes:', err);
    } finally {
      this.loading.set(false);
    }
  }

  openRegisterDialog() {
    const dialogRef = this.dialog.open(RegisterTripDialog, { width: '700px' });

    dialogRef.afterClosed().subscribe(async (newTrip) => {
      if (newTrip) {
        // Obtener el viaje completo con todos los datos incluyendo cantdisponibleasientos
        try {
          const viajeCompleto: any = await this.tripService.getViaje(newTrip.idplanificacion);
          
          this.trips.update((list) => [
            ...list,
            {
              idviaje: viajeCompleto.idplanificacion,
              fechaViaje: viajeCompleto.fechapartida,
              destino: viajeCompleto.destino?.nomdestino ?? 'Sin destino',
              horapartida: viajeCompleto.horapartida,
              horallegada: viajeCompleto.horallegada,
              cantdisponibleasientos: viajeCompleto.vehiculo?.cantdisponibleasientos ?? 0,
            },
          ]);
        } catch (err) {
          console.error('Error obteniendo viaje completo:', err);
          // Fallback: agregar sin cantdisponibleasientos
          this.trips.update((list) => [
            ...list,
            {
              idviaje: newTrip.idplanificacion,
              fechaViaje: newTrip.fechapartida,
              destino: newTrip.destino?.nomdestino ?? 'Sin destino',
              horapartida: newTrip.horapartida,
              horallegada: newTrip.horallegada,
              cantdisponibleasientos: 0,
            },
          ]);
        }
      }
    });
  }

  abrirDialog(idviaje: string) {
    console.log('Ver más viaje', idviaje);
  }

  async editarViaje(idviaje: string) {
    const viaje = await this.tripService.getViaje(idviaje);

    const dialogRef = this.dialog.open(EditTripDialog, {
      width: '600px',
      data: { viaje },
    });

    dialogRef.afterClosed().subscribe((updatedTrip) => {
      if (updatedTrip) {
        this.trips.update((list) =>
          list.map((t) =>
            t.idviaje === updatedTrip.idplanificacion
              ? {
                  idviaje: updatedTrip.idplanificacion,
                  fechaViaje: updatedTrip.fechapartida,
                  destino: updatedTrip.destino?.nomdestino ?? 'Sin destino',
                  horapartida: updatedTrip.horapartida,
                  horallegada: updatedTrip.horallegada,
                }
              : t
          )
        );
      }
    });
  }
  async eliminarViaje(idviaje: string) {
    const viaje = this.trips().find((t) => t.idviaje === idviaje);
    if (!viaje) return;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Eliminar viaje',
        message: `¿Seguro que deseas eliminar el viaje programado a "${viaje.destino}" el día ${viaje.fechaViaje}?`,
      },
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          await this.tripService.eliminarViaje(idviaje);
          this.trips.update((list) =>
            list.filter((t) => t.idviaje !== idviaje)
          );
        } catch (err) {
          console.error('Error eliminando viaje:', err);
        }
      }
    });
  }

  async actualizarAsientosDisponibles(idviaje: string) {
    try {
      // Cuando cambia una reserva de una planificación a otra,
      // necesitamos actualizar TODAS las planificaciones porque
      // los asientos disponibles cambian en ambas
      const viajes = await this.tripService.getViajes();
      
      // Actualizar toda la lista con los datos frescos de la BD
      this.trips.set(
        viajes.map((v: any) => ({
          idviaje: v.idplanificacion,
          fechaViaje: v.fechapartida,
          destino: v.destino?.nomdestino ?? 'Sin destino',
          horallegada: v.horallegada,
          horapartida: v.horapartida,
          cantdisponibleasientos:
            v.conductor_vehiculo_empresa?.cantdisponibleasientos ?? 0,
        }))
      );
    } catch (err) {
      console.error('Error actualizando asientos disponibles:', err);
    }
  }
}
