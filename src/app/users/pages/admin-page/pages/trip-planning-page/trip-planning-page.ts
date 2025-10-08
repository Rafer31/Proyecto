import { Component, signal, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
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
    MatTabsModule,
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
      horapartida: string;
      cantdisponibleasientos?: number;
      idviaje_relacionado?: string;
    }[]
  >([]);

  retornos = signal<
    {
      idviaje: string;
      fechaViaje: string;
      destino: string;
      horapartida: string;
      cantdisponibleasientos?: number;
      idviaje_relacionado?: string;
    }[]
  >([]);

  loading = signal(true);
  selectedTabIndex = signal(0);

  private dialog = inject(MatDialog);
  private tripService = inject(TripPlanningService);

  async ngOnInit() {
    await this.cargarDatos();
  }

  private async cargarDatos() {
    try {
      this.loading.set(true);

      const viajes = await this.tripService.getViajes();
      this.trips.set(
        viajes.map((v: any) => ({
          idviaje: v.idplanificacion,
          fechaViaje: v.fechapartida,
          destino: v.destino?.nomdestino ?? 'Sin destino',
          horapartida: v.horapartida,
          cantdisponibleasientos:
            v.conductor_vehiculo_empresa?.cantdisponibleasientos ?? 0,
          idviaje_relacionado: v.idviaje_relacionado,
        }))
      );

      const retornos = await this.tripService.getRetornos();
      this.retornos.set(
        retornos.map((r: any) => ({
          idviaje: r.idplanificacion,
          fechaViaje: r.fechapartida,
          destino: r.destino?.nomdestino ?? 'Sin destino',
          horapartida: r.horapartida,
          cantdisponibleasientos:
            r.conductor_vehiculo_empresa?.cantdisponibleasientos ?? 0,
          idviaje_relacionado: r.idviaje_relacionado,
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

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          if (result.viaje) {
            const viajeCompleto: any = await this.tripService.getViaje(
              result.viaje.idplanificacion
            );

            this.trips.update((list) => [
              ...list,
              {
                idviaje: viajeCompleto.idplanificacion,
                fechaViaje: viajeCompleto.fechapartida,
                destino: viajeCompleto.destino?.nomdestino ?? 'Sin destino',
                horapartida: viajeCompleto.horapartida,
                cantdisponibleasientos:
                  viajeCompleto.vehiculo?.cantdisponibleasientos ?? 0,
              },
            ]);
          }

          if (result.retorno) {
            const retornoCompleto: any = await this.tripService.getViaje(
              result.retorno.idplanificacion
            );

            this.retornos.update((list) => [
              ...list,
              {
                idviaje: retornoCompleto.idplanificacion,
                fechaViaje: retornoCompleto.fechapartida,
                destino: retornoCompleto.destino?.nomdestino ?? 'Sin destino',
                horapartida: retornoCompleto.horapartida,
                cantdisponibleasientos:
                  retornoCompleto.vehiculo?.cantdisponibleasientos ?? 0,
                idviaje_relacionado: result.viaje.idplanificacion,
              },
            ]);
          }
        } catch (err) {
          console.error('Error obteniendo viaje completo:', err);
          await this.cargarDatos();
        }
      }
    });
  }

  async editarViaje(idviaje: string) {
    const viaje = await this.tripService.getViaje(idviaje);

    const dialogRef = this.dialog.open(EditTripDialog, {
      width: '600px',
      data: { viaje },
    });

    dialogRef.afterClosed().subscribe((updatedTrip) => {
      if (updatedTrip) {
        const esSalida = updatedTrip.tipo === 'salida';

        if (esSalida) {
          this.trips.update((list) =>
            list.map((t) =>
              t.idviaje === updatedTrip.idplanificacion
                ? {
                    idviaje: updatedTrip.idplanificacion,
                    fechaViaje: updatedTrip.fechapartida,
                    destino: updatedTrip.destino?.nomdestino ?? 'Sin destino',
                    horapartida: updatedTrip.horapartida,
                  }
                : t
            )
          );
        } else {
          this.retornos.update((list) =>
            list.map((t) =>
              t.idviaje === updatedTrip.idplanificacion
                ? {
                    idviaje: updatedTrip.idplanificacion,
                    fechaViaje: updatedTrip.fechapartida,
                    destino: updatedTrip.destino?.nomdestino ?? 'Sin destino',
                    horapartida: updatedTrip.horapartida,
                  }
                : t
            )
          );
        }
      }
    });
  }

  async eliminarViaje(idviaje: string) {
    const viaje =
      this.trips().find((t) => t.idviaje === idviaje) ||
      this.retornos().find((t) => t.idviaje === idviaje);

    if (!viaje) return;

    const esRetorno = this.retornos().some((r) => r.idviaje === idviaje);
    const tipoViaje = esRetorno ? 'retorno' : 'viaje';

    // Si es un viaje de salida, verificar si tiene retorno asociado
    let mensajeAdicional = '';
    if (!esRetorno) {
      const retornoAsociado = this.retornos().find(
        (r) => r.idviaje_relacionado === idviaje
      );
      if (retornoAsociado) {
        mensajeAdicional = ' (también se eliminará el retorno asociado)';
      }
    }

    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: `Eliminar ${tipoViaje}`,
        message: `¿Seguro que deseas eliminar el ${tipoViaje} programado a "${viaje.destino}" el día ${viaje.fechaViaje}?${mensajeAdicional}`,
      },
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          if (!esRetorno) {
            // Eliminar viaje de salida y retorno asociado
            const result = await this.tripService.eliminarViajeConRetorno(idviaje);

            // Actualizar UI inmediatamente
            this.trips.update((list) =>
              list.filter((t) => t.idviaje !== idviaje)
            );

            // Eliminar retornos asociados de la UI
            if (result?.retornosEliminados && result.retornosEliminados.length > 0) {
              this.retornos.update((list) =>
                list.filter((r) => !result.retornosEliminados.includes(r.idviaje))
              );
            }
          } else {
            // Eliminar solo el retorno
            await this.tripService.eliminarViaje(idviaje);

            // Actualizar UI inmediatamente
            this.retornos.update((list) =>
              list.filter((t) => t.idviaje !== idviaje)
            );
          }
        } catch (err) {
          console.error('Error eliminando viaje:', err);
          // En caso de error, recargar datos
          await this.cargarDatos();
        }
      }
    });
  }

  async actualizarAsientosDisponibles(idviaje: string) {
    try {
      // Obtener el viaje actualizado desde la base de datos
      const viajeActualizado = await this.tripService.getViaje(idviaje);

      // Corregir la forma de acceder al contador de asientos
      const asientosActualizados = viajeActualizado?.vehiculo[0]?.cantdisponibleasientos ?? 0;

      // Determinar si es salida o retorno
      const esRetorno = this.retornos().some((r) => r.idviaje === idviaje);

      if (esRetorno) {
        // Actualizar en la lista de retornos
        this.retornos.update((list) =>
          list.map((r) =>
            r.idviaje === idviaje
              ? { ...r, cantdisponibleasientos: asientosActualizados }
              : r
          )
        );
      } else {
        // Actualizar en la lista de viajes
        this.trips.update((list) =>
          list.map((t) =>
            t.idviaje === idviaje
              ? { ...t, cantdisponibleasientos: asientosActualizados }
              : t
          )
        );
      }
    } catch (err) {
      console.error('Error actualizando asientos disponibles:', err);
    }
  }

  onTabChange(index: number) {
    this.selectedTabIndex.set(index);
  }
}
