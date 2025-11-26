import { Component, signal, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Emptystate } from '../../../../components/emptystate/emptystate';
import { TripPlanningService } from '../../services/trip-planning.service';
import { RetornoService } from '../../services/retorno.service';
import { ExcelReportService } from '../../../../../shared/services/excel-report.service';
import { PlanningCardComponent } from './components/planning-card/planning-card';
import { RegisterTripDialog } from './components/register-planning/register-planning';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EditTripDialog } from './components/edit-trip-dialog/edit-trip-dialog';
import { ConfirmDialog } from '../../../../components/confirm-dialog/confirm-dialog';
import { SeatsDialog } from './components/seats-dialog/seats-dialog';
import { SaveTemplateDialog } from './components/save-template-dialog/save-template-dialog';
import { CreateFromTemplateDialog } from './components/create-from-template-dialog/create-from-template-dialog';
import { CompletedTripsReportComponent } from './components/completed-trips-report/completed-trips-report';

interface ViajeCard {
  idviaje: string;
  fechaViaje: string;
  destino: string;
  horapartida: string;
  cantdisponibleasientos?: number;
  tieneRetorno?: boolean;
  esRetorno?: boolean;
  viajeIdaDestino?: string;
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
    CompletedTripsReportComponent,
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
  private excelReportService = inject(ExcelReportService);
  private snackBar = inject(MatSnackBar);

  async ngOnInit() {
    await this.cargarDatos();
  }

  private async cargarDatos() {
    try {
      this.loading.set(true);

      const viajesConRetorno = await this.tripService.getViajesConRetorno();

      const viajes: ViajeCard[] = [];
      const retornos: ViajeCard[] = [];

      viajesConRetorno.forEach((viajeData: any) => {
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

        if (viajeData.tieneRetorno && viajeData.retorno) {
          const cveRetorno = Array.isArray(
            viajeData.retorno.conductor_vehiculo_empresa
          )
            ? viajeData.retorno.conductor_vehiculo_empresa[0]
            : viajeData.retorno.conductor_vehiculo_empresa;

          retornos.push({
            idviaje: viajeData.retorno.idplanificacion,
            fechaViaje: viajeData.retorno.fechapartida,
            destino: viajeData.retorno.destino?.nomdestino ?? 'Sin destino',
            horapartida: viajeData.retorno.horapartida,
            cantdisponibleasientos: cveRetorno?.cantdisponibleasientos ?? 0,
            esRetorno: true,
            viajeIdaDestino:
              viajeData.viaje.destino?.nomdestino ?? 'Sin destino',
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
        await this.cargarDatos();
      }
    });
  }

  openCreateFromTemplateDialog() {
    const dialogRef = this.dialog.open(CreateFromTemplateDialog, {
      width: '800px',
      maxHeight: '90vh',
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.viaje) {
        await this.cargarDatos();
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
        await this.cargarDatos();
      }
    });
  }

  async eliminarViaje(idviaje: string) {
    const viaje = this.trips().find((t) => t.idviaje === idviaje);
    const esViajeSalida = !!viaje;

    const viajeAEliminar =
      viaje || this.retornos().find((r) => r.idviaje === idviaje);
    if (!viajeAEliminar) return;

    let mensaje = `¿Seguro que deseas eliminar el ${esViajeSalida ? 'viaje' : 'retorno'
      } programado a "${viajeAEliminar.destino}" el día ${viajeAEliminar.fechaViaje
      }?`;

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
            await this.tripService.eliminarViajeConRetorno(idviaje);
          } else {
            await this.tripService.eliminarViaje(idviaje);
          }

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
      const viajeActualizado = await this.tripService.getViaje(idviaje);

      const cve = Array.isArray(viajeActualizado.vehiculo)
        ? viajeActualizado.vehiculo[0]
        : viajeActualizado.vehiculo;

      const asientosActualizados = cve?.cantdisponibleasientos ?? 0;

      const esViajeSalida = this.trips().some((t) => t.idviaje === idviaje);

      if (esViajeSalida) {
        this.trips.update((list) =>
          list.map((t) =>
            t.idviaje === idviaje
              ? { ...t, cantdisponibleasientos: asientosActualizados }
              : t
          )
        );

        const { existe, idplanificacionRetorno } =
          await this.retornoService.tieneRetorno(idviaje);
        if (existe && idplanificacionRetorno) {
          await this.actualizarAsientosRetorno(idplanificacionRetorno);
        }
      } else {
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

  abrirDialogoAsientos(idviaje: string) {
    const dialogRef = this.dialog.open(SeatsDialog, {
      width: '700px',
      data: {
        idplanificacion: idviaje,
        isStaff: true,
        isAdmin: true,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.cambiosRealizados) {
        this.actualizarAsientosDisponibles(idviaje);
      }
    });
  }

  async guardarComoPlantilla(idviaje: string) {
    try {
      const viaje = await this.tripService.getViaje(idviaje);

      if (!viaje) {
        this.snackBar.open(
          'Error: No se pudo obtener los datos del viaje',
          'Cerrar',
          {
            duration: 3000,
          }
        );
        return;
      }

      const cve = Array.isArray(viaje.vehiculo)
        ? viaje.vehiculo[0]
        : viaje.vehiculo;

      const destino = Array.isArray(viaje.destino)
        ? viaje.destino[0]
        : viaje.destino;

      const dialogRef = this.dialog.open(SaveTemplateDialog, {
        width: '600px',
        data: {
          idplanificacion: idviaje,
          destino: destino?.iddestino,
          conductor: cve?.conductor,
          vehiculo: cve?.vehiculo,
          empresa: cve?.empresa,
          horapartida: viaje.horapartida,
        },
      });

      dialogRef.afterClosed().subscribe((saved) => {
        if (saved) {
        }
      });
    } catch (error) {
      console.error('Error al preparar datos para plantilla:', error);
      this.snackBar.open('Error al obtener datos del viaje', 'Cerrar', {
        duration: 3000,
      });
    }
  }

  async exportarReporteViaje(idviaje: string) {
    try {
      this.snackBar.open('Generando reporte...', 'Cerrar', {
        duration: 2000,
      });

      await this.excelReportService.generateTripReport(idviaje);

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
}
