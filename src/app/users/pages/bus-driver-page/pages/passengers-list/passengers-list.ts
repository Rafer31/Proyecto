import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import {
  DriverService,
  PasajeroViaje,
  ViajeAsignado,
} from '../../services/driver.service';
import { PassengerDetailSheet } from './components/passenger-detail-sheet/passenger-detail-sheet';
import { ConfirmDialog } from '../../../../components/confirm-dialog/confirm-dialog';

interface AsientoInfo {
  numero: number;
  ocupado: boolean;
  pasajero?: PasajeroViaje;
}

@Component({
  selector: 'app-passengers-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDividerModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './passengers-list.html',
  styleUrl: './passengers-list.scss',
})
export class PassengersList implements OnInit {
  private driverService = inject(DriverService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private bottomSheet = inject(MatBottomSheet);
  private dialog = inject(MatDialog);

  idplanificacion = signal<string>('');
  pasajeros = signal<PasajeroViaje[]>([]);
  totalAsientos = signal<number>(0);
  cargando = signal<boolean>(true);
  pasajeroSeleccionado = signal<PasajeroViaje | null>(null);
  isMobile = signal<boolean>(false);

  @HostListener('window:resize')
  onResize() {
    this.checkIfMobile();
  }

  asientos = computed<AsientoInfo[]>(() => {
    const total = this.totalAsientos();
    const pasajerosList = this.pasajeros();
    const asientosMap: AsientoInfo[] = [];

    for (let i = 1; i <= total; i++) {
      const pasajero = pasajerosList.find((p) => p.asiento === i);
      asientosMap.push({
        numero: i,
        ocupado: !!pasajero,
        pasajero: pasajero,
      });
    }

    return asientosMap;
  });

  async ngOnInit() {
    this.checkIfMobile();

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/users/bus-driver/assigned-trips']);
      return;
    }

    this.idplanificacion.set(id);
    await this.cargarDatos();
  }

  private checkIfMobile() {
    this.isMobile.set(window.innerWidth < 1200);
  }

  private async cargarDatos() {
    try {
      this.cargando.set(true);

      const pasajeros = await this.driverService.getPasajerosViaje(
        this.idplanificacion()
      );
      this.pasajeros.set(pasajeros);

      const viaje = await this.driverService.getViajeByPlanificacion(
        this.idplanificacion()
      );

      if (viaje) {
        this.totalAsientos.set(viaje.vehiculo.nroasientos);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      this.snackBar.open('Error al cargar la información', 'Cerrar', {
        duration: 3000,
      });
    } finally {
      this.cargando.set(false);
    }
  }

  verDetallesPasajero(asiento: AsientoInfo) {
    if (asiento.ocupado && asiento.pasajero) {
      if (this.isMobile()) {
        this.bottomSheet.open(PassengerDetailSheet, {
          data: {
            pasajero: asiento.pasajero,
            onMarcarAsistencia: (asistio: boolean) => {
              this.marcarAsistencia(asiento.pasajero!, asistio);
            },
          },
        });
      } else {
        this.pasajeroSeleccionado.set(asiento.pasajero);
      }
    }
  }

  getNombreCorto(pasajero: PasajeroViaje): string {
    const partes = pasajero.nombre.split(' ');
    if (partes.length <= 2) {
      return pasajero.nombre;
    }

    return `${partes[0]} ${partes[partes.length - 2]}`;
  }

  cerrarDetalle() {
    this.pasajeroSeleccionado.set(null);
  }

  async marcarAsistencia(pasajero: PasajeroViaje, asistio: boolean) {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: asistio ? 'Confirmar Asistencia' : 'Confirmar Inasistencia',
        message: asistio
          ? `¿Está seguro que desea marcar a ${pasajero.nombre} como asistió?`
          : `¿Está seguro que desea marcar a ${pasajero.nombre} como inasistió?`,
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
      },
    });

    const confirmed = await dialogRef.afterClosed().toPromise();

    if (!confirmed) {
      return;
    }

    try {
      await this.driverService.marcarAsistencia(
        this.idplanificacion(),
        pasajero.idusuario,
        pasajero.tipo,
        asistio
      );

      const mensaje = asistio
        ? `${pasajero.nombre} marcado como asistió`
        : `${pasajero.nombre} marcado como inasistió`;

      this.snackBar.open(mensaje, 'Cerrar', { duration: 2000 });

      this.pasajeroSeleccionado.set(null);

      this.bottomSheet.dismiss();

      await this.cargarDatos();
    } catch (error) {
      console.error('Error marcando asistencia:', error);
      this.snackBar.open('Error al marcar asistencia', 'Cerrar', {
        duration: 3000,
      });
    }
  }

  volver() {
    this.router.navigate(['/users/bus-driver/assigned-trips']);
  }

  getColorEstado(estado: string): string {
    switch (estado) {
      case 'asistio':
        return 'primary';
      case 'inasistio':
        return 'warn';
      default:
        return 'accent';
    }
  }

  getTextoEstado(estado: string): string {
    switch (estado) {
      case 'asistio':
        return 'Asistió';
      case 'inasistio':
        return 'Inasistió';
      default:
        return 'Pendiente';
    }
  }

  getTextoEstadoCorto(estado: string): string {
    switch (estado) {
      case 'asistio':
        return 'Asistió';
      case 'inasistio':
        return 'No asistió';
      default:
        return 'Pendiente';
    }
  }

  getTipoBadge(tipo: string): string {
    return tipo === 'personal' ? 'Personal' : 'Visitante';
  }

  getClaseAsiento(asiento: AsientoInfo): string {
    if (!asiento.ocupado) return 'libre';
    if (!asiento.pasajero) return 'libre';

    switch (asiento.pasajero.estadoAsistencia) {
      case 'asistio':
        return 'asistio';
      case 'inasistio':
        return 'inasistio';
      default:
        return 'reservado';
    }
  }

  getIconoAsiento(asiento: AsientoInfo): string {
    if (!asiento.ocupado) return 'event_seat';
    if (!asiento.pasajero) return 'event_seat';

    switch (asiento.pasajero.estadoAsistencia) {
      case 'asistio':
        return 'check_circle';
      case 'inasistio':
        return 'cancel';
      default:
        return 'person';
    }
  }
}
