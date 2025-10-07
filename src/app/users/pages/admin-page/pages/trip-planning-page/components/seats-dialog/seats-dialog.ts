import { Component, Inject, signal } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { TripPlanningService } from '../../../../services/trip-planning.service';
import {
  ReservaPasajero,
  ReservaService,
} from '../../../../services/reserva.service';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmDialog } from '../../../../../../components/confirm-dialog/confirm-dialog';
import { UserDataService } from '../../../../../../../auth/services/userdata.service';
import { SupabaseService } from '../../../../../../../shared/services/supabase.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface Pasajero {
  nombre: string;
  ci: string;
  telefono: string;
  asiento: number;
}

@Component({
  selector: 'app-seats-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './seats-dialog.html',
  styleUrls: ['./seats-dialog.scss'],
})
export class SeatsDialog {
  filas = signal<any[]>([]);
  vistaActual = signal<'mapa' | 'detalle'>('mapa');
  pasajeroSeleccionado = signal<ReservaPasajero | null>(null);
  cargando = signal<boolean>(true);
  usuarioActual = signal<any | null>(null);
  rolActual = signal<string | null>(null);

  constructor(
    private dialog: MatDialog,
    private tripService: TripPlanningService,
    private reservaService: ReservaService,
    private dialogRef: MatDialogRef<SeatsDialog>,
    private snackBar: MatSnackBar,
    private userDataService: UserDataService,
    private supabaseService: SupabaseService,
    @Inject(MAT_DIALOG_DATA)
    public data: { idplanificacion: string; isStaff?: boolean }
  ) {}

  async ngOnInit() {
    this.cargando.set(true);
    try {
      const {
        data: { user },
        error,
      } = await this.supabaseService.supabase.auth.getUser();
      if (error || !user) {
        console.error('No hay usuario logeado');
      } else {
        const authId = user.id;

        const usuario = await this.userDataService.getActiveUserByAuthId(
          authId
        );
        if (!usuario) {
          console.error('No se encontró usuario activo');
        } else {
          this.usuarioActual.set(usuario);
          this.rolActual.set('Personal');
        }
      }

      const viaje: any = await this.tripService.getViaje(
        this.data.idplanificacion
      );
      const totalAsientos = viaje.vehiculo.vehiculo?.nroasientos ?? 0;

      const pasajeros: Pasajero[] =
        await this.reservaService.getPasajerosPorPlanificacion(
          this.data.idplanificacion
        );

      const ocupados = pasajeros.map((p) => p.asiento);
      let numero = 1;
      const filasTemp: any[] = [];

      while (numero <= totalAsientos) {
        const restantes = totalAsientos - numero + 1;
        const asientosFila: any[] = [];

        if (restantes === 5) {
          for (let i = 0; i < 2; i++) {
            const asientoNum = numero++;
            const pasajero = pasajeros.find((p) => p.asiento === asientoNum);
            asientosFila.push({
              num: asientoNum,
              ocupado: ocupados.includes(asientoNum),
              tipo: 'asiento',
              pasajero,
            });
          }

          const asientoCentro = numero++;
          const pasajeroCentro = pasajeros.find(
            (p) => p.asiento === asientoCentro
          );
          asientosFila.push({
            num: asientoCentro,
            ocupado: ocupados.includes(asientoCentro),
            tipo: 'asiento',
            pasajero: pasajeroCentro,
          });

          for (let i = 0; i < 2; i++) {
            const asientoNum = numero++;
            const pasajero = pasajeros.find((p) => p.asiento === asientoNum);
            asientosFila.push({
              num: asientoNum,
              ocupado: ocupados.includes(asientoNum),
              tipo: 'asiento',
              pasajero,
            });
          }

          filasTemp.push({ tipo: 'normal', asientos: asientosFila });
        } else {
          const asientosEnFila = restantes >= 4 ? 4 : restantes;
          const leftSide = Math.ceil(asientosEnFila / 2);
          const rightSide = asientosEnFila - leftSide;

          for (let i = 0; i < leftSide; i++) {
            const asientoNum = numero++;
            const pasajero = pasajeros.find((p) => p.asiento === asientoNum);
            asientosFila.push({
              num: asientoNum,
              ocupado: ocupados.includes(asientoNum),
              tipo: 'asiento',
              pasajero,
            });
          }

          asientosFila.push({ num: null, tipo: 'pasillo' });

          for (let i = 0; i < rightSide; i++) {
            const asientoNum = numero++;
            const pasajero = pasajeros.find((p) => p.asiento === asientoNum);
            asientosFila.push({
              num: asientoNum,
              ocupado: ocupados.includes(asientoNum),
              tipo: 'asiento',
              pasajero,
            });
          }

          filasTemp.push({ tipo: 'normal', asientos: asientosFila });
        }
      }

      filasTemp.unshift({
        tipo: 'conductor',
        asientos: [
          { num: null, label: 'CONDUCTOR', tipo: 'conductor' },
          { num: null, tipo: 'vacio' },
        ],
      });

      this.filas.set(filasTemp);
    } catch (err) {
      console.error(err);
    } finally {
      this.cargando.set(false);
    }
  }

  verDetallePasajero(seat: any) {
    if (seat.tipo !== 'asiento' || !seat.ocupado || !seat.pasajero) {
      return;
    }

    if (this.data.isStaff) {
      const usuario = this.usuarioActual();
      if (usuario && seat.pasajero.idusuario === usuario.idusuario) {
        this.pasajeroSeleccionado.set(seat.pasajero);
        this.vistaActual.set('detalle');
      }

      return;
    }

    this.pasajeroSeleccionado.set(seat.pasajero);
    this.vistaActual.set('detalle');
  }

  volverAlMapa() {
    this.vistaActual.set('mapa');
    this.pasajeroSeleccionado.set(null);
  }

  cerrar() {
    this.dialogRef.close();
  }

  async cancelarReserva(pasajero: ReservaPasajero) {
    if (!pasajero) return;
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Confirmar cancelación',
        message: `¿Está seguro de cancelar la reserva del asiento ${pasajero.asiento}?`,
      },
    });

    const confirmado = await dialogRef.afterClosed().toPromise();
    if (!confirmado) return;

    try {
      await this.reservaService.cancelarReserva(
        this.data.idplanificacion,
        pasajero.asiento,
        pasajero.tipo
      );
      await this.ngOnInit();
      this.snackBar.open(
        `Reserva del asiento ${pasajero.asiento} cancelada`,
        'Cerrar',
        { duration: 3000 }
      );
      this.volverAlMapa();

      this.dialogRef.close({ cambiosRealizados: true });
    } catch (error) {
      this.snackBar.open(`${error}`, 'Cerrar', { duration: 3000 });
    }
  }

  async cambiarAsiento(pasajero: ReservaPasajero) {
    if (!pasajero) return;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Cambiar asiento',
        message: `¿Desea cambiar el asiento ${pasajero.asiento} por otro? Seleccione un asiento disponible después de confirmar.`,
      },
    });

    const confirmado = await dialogRef.afterClosed().toPromise();
    if (!confirmado) return;

    this.snackBar.open(
      'Ahora seleccione el nuevo asiento en el mapa',
      'Cerrar',
      { duration: 4000 }
    );
    this.volverAlMapa();
  }

  async reservarAsiento(seat: any) {
    if (!seat || seat.ocupado || seat.tipo !== 'asiento') return;

    const usuario = this.usuarioActual();
    if (!usuario) {
      this.snackBar.open(`No se encontró usuario logeado`, 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    try {
      const verificacion = await this.reservaService.verificarReservaExistente(
        usuario.idusuario,
        this.data.idplanificacion
      );

      if (!verificacion.destinoCorrecto) {
        this.snackBar.open(
          'No puedes reservar en este viaje. El destino no coincide con tu destino origen.',
          'Cerrar',
          { duration: 4000 }
        );
        return;
      }

      if (verificacion.tieneReserva) {
        const esElMismoViaje =
          verificacion.idplanificacion === this.data.idplanificacion;

        let mensaje = '';
        if (esElMismoViaje) {
          mensaje = `Ya tienes reservado el asiento ${verificacion.asiento} en este viaje. ¿Deseas cambiar al asiento ${seat.num}?`;
        } else {
          mensaje = `Ya tienes una reserva en otro viaje (asiento ${verificacion.asiento}). ¿Deseas cambiar tu reserva a este viaje en el asiento ${seat.num}?`;
        }

        const dialogRef = this.dialog.open(ConfirmDialog, {
          data: {
            title: 'Cambiar reserva',
            message: mensaje,
          },
        });

        const confirmado = await dialogRef.afterClosed().toPromise();
        if (!confirmado) return;

        await this.reservaService.cambiarReserva(
          usuario.idusuario,
          this.data.idplanificacion,
          seat.num
        );

        await this.ngOnInit();

        this.snackBar.open(
          `Reserva cambiada exitosamente al asiento ${seat.num}`,
          'Cerrar',
          { duration: 3000 }
        );

        this.dialogRef.close({ cambiosRealizados: true });
        return;
      }

      const { existeRetorno, idplanificacionRetorno } =
        await this.reservaService.verificarRetornoAsociado(
          this.data.idplanificacion
        );

      let reservarRetorno = false;

      if (existeRetorno) {
        const dialogRef = this.dialog.open(ConfirmDialog, {
          data: {
            title: 'Reservar con retorno',
            message: `Este viaje tiene un retorno programado. ¿Deseas reservar el asiento ${seat.num} también para el viaje de retorno?`,
          },
        });

        reservarRetorno = await dialogRef.afterClosed().toPromise();
      }

      const dialogRef = this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Confirmar reserva',
          message:
            existeRetorno && reservarRetorno
              ? `¿Confirmas reservar el asiento ${seat.num} para la salida y el retorno?`
              : `¿Desea reservar el asiento ${seat.num}?`,
        },
      });

      const confirmado = await dialogRef.afterClosed().toPromise();
      if (!confirmado) return;

      await this.reservaService.reservarAsientoConRetorno(
        this.data.idplanificacion,
        seat.num,
        usuario.idusuario,
        reservarRetorno
      );

      await this.ngOnInit();

      const mensaje =
        existeRetorno && reservarRetorno
          ? `Asientos ${seat.num} reservados correctamente para salida y retorno`
          : `Asiento ${seat.num} reservado correctamente`;

      this.snackBar.open(mensaje, 'Cerrar', { duration: 3000 });

      this.dialogRef.close({ cambiosRealizados: true });
    } catch (error) {
      this.snackBar.open(`Error: ${error}`, 'Cerrar', {
        duration: 3000,
      });
    }
  }

  esUsuarioActual(pasajero: ReservaPasajero): boolean {
    const usuario = this.usuarioActual();
    return usuario && pasajero.idusuario === usuario.idusuario;
  }
}
