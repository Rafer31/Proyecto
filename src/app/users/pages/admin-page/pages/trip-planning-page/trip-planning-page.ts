import { Component, signal, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { Emptystate } from '../../../../components/emptystate/emptystate';
import { TripPlanningService } from '../../services/trip-planning.service';
import { RetornoService } from '../../services/retorno.service';
import { PlanningCardComponent } from './components/planning-card/planning-card';
import { RegisterTripDialog } from './components/register-planning/register-planning';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EditTripDialog } from './components/edit-trip-dialog/edit-trip-dialog';
import { ConfirmDialog } from '../../../../components/confirm-dialog/confirm-dialog';

interface ViajeCard {
  idviaje: string;
  fechaViaje: string;
  destino: string;
  horapartida: string;
  cantdisponibleasientos?: number;
  tieneRetorno?: boolean;
}

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
  trips = signal<ViajeCard[]>([]);
  retornos = signal<ViajeCard[]>([]);
  loading = signal(true);
  selectedTabIndex = signal(0);

  private dialog = inject(MatDialog);
  private tripService = inject(TripPlanningService);
  private retornoService = inject(RetornoService);

  async ngOnInit() {
    await this.cargarDatos();
  }

  private async cargarDatos() {
    try {
      this.loading.set(true);

      // Obtener viajes con información de retorno
      const viajesConRetorno = await this.tripService.getViajesConRetorno();

      // Separar viajes (ida) y retornos
      const viajes: ViajeCard[] = [];
      const retornos: ViajeCard[] = [];

      viajesConRetorno.forEach((viajeData: any) => {
        // Agregar viaje de ida
        const cve = Array.isArray(viajeData.viaje.conductor_vehiculo_empresa)
          ? viajeData.viaje.conductor_vehiculo_empresa[0]
          : viajeData.viaje.conductor_vehiculo_empresa;

        viajes.push({
          idviaje: viajeData.viaje.idplanificacion,
          fechaViaje: viajeData.viaje.fechapartida,
          destino: viajeData.viaje.destino?.nomdestino ?? 'Sin destino',
          horapartida: viajeData.viaje.horapartida,
          cantdisponibleasientos: cve?.cantdisponibleasientos ?? 0,
          tieneRetorno: viajeData.tieneRetorno,
        });

        // Agregar retorno si existe
        if (viajeData.tieneRetorno && viajeData.retorno) {
          const cveRetorno = Array.isArray(viajeData.retorno.conductor_vehiculo_empresa)
            ? viajeData.retorno.conductor_vehiculo_empresa[0]
            : viajeData.retorno.conductor_vehiculo_empresa;

          retornos.push({
            idviaje: viajeData.retorno.idplanificacion,
            fechaViaje: viajeData.retorno.fechapartida,
            destino: viajeData.retorno.destino?.nomdestino ?? 'Sin destino',
            horapartida: viajeData.retorno.horapartida,
            cantdisponibleasientos: cveRetorno?.cantdisponibleasientos ?? 0,
          });
        }
      });

      this.trips.set(viajes);
      this.retornos.set(retornos);
    } catch (err) {
      console.error('Error cargando viajes:', err);
    } finally {
      this.loading.set(false);
    }
  }

  openRegisterDialog() {
    const dialogRef = this.dialog.open(RegisterTripDialog, { width: '700px' });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.viaje) {
        await this.cargarDatos(); // Recargar todo para mantener consistencia
      }
    });
  }

  async editarViaje(idviaje: string) {
    const viaje = await this.tripService.getViaje(idviaje);

    const dialogRef = this.dialog.open(EditTripDialog, {
      width: '600px',
      data: { viaje },
    });

    dialogRef.afterClosed().subscribe(async (updatedTrip) => {
      if (updatedTrip) {
        await this.cargarDatos(); // Recargar para mantener consistencia
      }
    });
  }

  async eliminarViaje(idviaje: string) {
    // Buscar el viaje en ambas listas
    const viaje = this.trips().find((t) => t.idviaje === idviaje);
    const esViajeSalida = !!viaje;

    const viajeAEliminar = viaje || this.retornos().find((r) => r.idviaje === idviaje);
    if (!viajeAEliminar) return;

    // Construir mensaje de confirmación
    let mensaje = `¿Seguro que deseas eliminar el ${esViajeSalida ? 'viaje' : 'retorno'} programado a "${viajeAEliminar.destino}" el día ${viajeAEliminar.fechaViaje}?`;

    if (esViajeSalida && viaje?.tieneRetorno) {
      mensaje += ' También se eliminará el retorno asociado.';
    }

    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: `Eliminar ${esViajeSalida ? 'viaje' : 'retorno'}`,
        message: mensaje,
      },
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          if (esViajeSalida) {
            // Eliminar viaje de salida (y retorno si tiene)
            await this.tripService.eliminarViajeConRetorno(idviaje);
          } else {
            // Eliminar solo retorno
            await this.tripService.eliminarViaje(idviaje);
          }

          // Recargar datos para mantener sincronización
          await this.cargarDatos();
        } catch (err) {
          console.error('Error eliminando viaje:', err);
          await this.cargarDatos();
        }
      }
    });
  }

  async actualizarAsientosDisponibles(idviaje: string) {
    try {
      // Obtener el viaje actualizado
      const viajeActualizado = await this.tripService.getViaje(idviaje);

      // Acceder correctamente a los asientos disponibles
      const cve = Array.isArray(viajeActualizado.vehiculo)
        ? viajeActualizado.vehiculo[0]
        : viajeActualizado.vehiculo;

      const asientosActualizados = cve?.cantdisponibleasientos ?? 0;

      // Determinar si es viaje de ida o retorno
      const esViajeSalida = this.trips().some((t) => t.idviaje === idviaje);

      if (esViajeSalida) {
        // Actualizar en la lista de viajes
        this.trips.update((list) =>
          list.map((t) =>
            t.idviaje === idviaje
              ? { ...t, cantdisponibleasientos: asientosActualizados }
              : t
          )
        );

        // Si tiene retorno, actualizar también el retorno
        const { existe, idplanificacionRetorno } = await this.retornoService.tieneRetorno(idviaje);
        if (existe && idplanificacionRetorno) {
          await this.actualizarAsientosRetorno(idplanificacionRetorno);
        }
      } else {
        // Actualizar en la lista de retornos
        this.retornos.update((list) =>
          list.map((r) =>
            r.idviaje === idviaje
              ? { ...r, cantdisponibleasientos: asientosActualizados }
              : r
          )
        );
      }
    } catch (err) {
      console.error('Error actualizando asientos disponibles:', err);
    }
  }

  private async actualizarAsientosRetorno(idRetorno: string) {
    try {
      const viajeRetorno = await this.tripService.getViaje(idRetorno);

      const cve = Array.isArray(viajeRetorno.vehiculo)
        ? viajeRetorno.vehiculo[0]
        : viajeRetorno.vehiculo;

      const asientosActualizados = cve?.cantdisponibleasientos ?? 0;

      this.retornos.update((list) =>
        list.map((r) =>
          r.idviaje === idRetorno
            ? { ...r, cantdisponibleasientos: asientosActualizados }
            : r
        )
      );
    } catch (err) {
      console.error('Error actualizando asientos del retorno:', err);
    }
  }

  onTabChange(index: number) {
    this.selectedTabIndex.set(index);
  }
}
