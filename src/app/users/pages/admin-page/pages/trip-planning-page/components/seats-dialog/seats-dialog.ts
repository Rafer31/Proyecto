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
import { RetornoService } from '../../../../services/retorno.service';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmDialog } from '../../../../../../components/confirm-dialog/confirm-dialog';
import { UserDataService } from '../../../../../../../auth/services/userdata.service';
import { SupabaseService } from '../../../../../../../shared/services/supabase.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface Asiento {
  num: number | null;
  ocupado: boolean;
  tipo: 'asiento' | 'pasillo' | 'conductor' | 'vacio';
  pasajero?: ReservaPasajero;
  label?: string;
}

interface Fila {
  tipo: 'normal' | 'conductor';
  asientos: Asiento[];
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
  filas = signal<Fila[]>([]);

  vistaActual = signal<'mapa' | 'detalle'>('mapa');
  pasajeroSeleccionado = signal<ReservaPasajero | null>(null);
  cargando = signal<boolean>(true);
  procesandoReserva = signal<boolean>(false);

  modoCambioAsiento = signal<boolean>(false);
  pasajeroCambiando = signal<ReservaPasajero | null>(null);

  usuarioActual = signal<any | null>(null);

  tieneRetorno = signal<boolean>(false);
  idRetorno = signal<string | null>(null);

  constructor(
    private dialog: MatDialog,
    private tripService: TripPlanningService,
    private reservaService: ReservaService,
    private retornoService: RetornoService,
    private dialogRef: MatDialogRef<SeatsDialog>,
    private snackBar: MatSnackBar,
    private userDataService: UserDataService,
    private supabaseService: SupabaseService,
    @Inject(MAT_DIALOG_DATA)
    public data: { idplanificacion: string; isStaff?: boolean }
  ) {}

  async ngOnInit() {
    await Promise.all([this.cargarUsuario(), this.cargarDatosViaje()]);
  }

  private async cargarUsuario() {
    try {
      const {
        data: { user },
        error,
      } = await this.supabaseService.supabase.auth.getUser();

      if (error || !user) {
        console.error('No hay usuario logeado');
        return;
      }

      const usuario = await this.userDataService.getActiveUserByAuthId(user.id);
      if (usuario) {
        this.usuarioActual.set(usuario);
      }
    } catch (error) {
      console.error('Error cargando usuario:', error);
    }
  }

  private async cargarDatosViaje() {
    try {
      this.cargando.set(true);

      const [viaje, infoRetorno] = await Promise.all([
        this.tripService.getViaje(this.data.idplanificacion),
        this.retornoService.tieneRetorno(this.data.idplanificacion),
      ]);

      this.tieneRetorno.set(infoRetorno.existe);
      this.idRetorno.set(infoRetorno.idplanificacionRetorno || null);

      const cve = Array.isArray(viaje.vehiculo)
        ? viaje.vehiculo[0]
        : viaje.vehiculo;
      const vehiculoData = Array.isArray(cve?.vehiculo)
        ? cve.vehiculo[0]
        : cve?.vehiculo;
      const totalAsientos = vehiculoData?.nroasientos ?? 0;

      const pasajeros = await this.reservaService.getPasajerosPorPlanificacion(
        this.data.idplanificacion
      );

      this.generarMapaAsientos(totalAsientos, pasajeros);
    } catch (error) {
      console.error('Error cargando datos del viaje:', error);
      this.snackBar.open('Error al cargar los datos del viaje', 'Cerrar', {
        duration: 3000,
      });
    } finally {
      this.cargando.set(false);
    }
  }

  private generarMapaAsientos(
    totalAsientos: number,
    pasajeros: ReservaPasajero[]
  ) {
    const ocupados = pasajeros.map((p) => p.asiento);
    let numero = 1;
    const filasTemp: Fila[] = [];

    filasTemp.push({
      tipo: 'conductor',
      asientos: [
        { num: null, label: 'CONDUCTOR', tipo: 'conductor', ocupado: false },
        { num: null, tipo: 'vacio', ocupado: false },
      ],
    });

    while (numero <= totalAsientos) {
      const restantes = totalAsientos - numero + 1;
      const asientosFila: Asiento[] = [];

      if (restantes === 5) {
        for (let i = 0; i < 2; i++) {
          asientosFila.push(this.crearAsiento(numero++, pasajeros, ocupados));
        }

        asientosFila.push(this.crearAsiento(numero++, pasajeros, ocupados));

        for (let i = 0; i < 2; i++) {
          asientosFila.push(this.crearAsiento(numero++, pasajeros, ocupados));
        }
      } else {
        const asientosEnFila = Math.min(restantes, 4);
        const leftSide = Math.ceil(asientosEnFila / 2);
        const rightSide = asientosEnFila - leftSide;

        for (let i = 0; i < leftSide; i++) {
          asientosFila.push(this.crearAsiento(numero++, pasajeros, ocupados));
        }

        asientosFila.push({ num: null, tipo: 'pasillo', ocupado: false });

        for (let i = 0; i < rightSide; i++) {
          asientosFila.push(this.crearAsiento(numero++, pasajeros, ocupados));
        }
      }

      filasTemp.push({ tipo: 'normal', asientos: asientosFila });
    }

    this.filas.set(filasTemp);
  }

  private crearAsiento(
    num: number,
    pasajeros: ReservaPasajero[],
    ocupados: number[]
  ): Asiento {
    const pasajero = pasajeros.find((p) => p.asiento === num);
    return {
      num,
      ocupado: ocupados.includes(num),
      tipo: 'asiento',
      pasajero,
    };
  }

  verDetallePasajero(seat: Asiento) {
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

  esUsuarioActual(pasajero: ReservaPasajero): boolean {
    const usuario = this.usuarioActual();
    return !!usuario && pasajero.idusuario === usuario.idusuario;
  }

  async reservarAsiento(seat: Asiento) {
    if (!seat || seat.ocupado || seat.tipo !== 'asiento') return;

    console.log('=== RESERVAR ASIENTO ===');
    console.log('Modo cambio:', this.modoCambioAsiento());
    console.log('Pasajero cambiando:', this.pasajeroCambiando());

    const usuario = this.usuarioActual();
    if (!usuario) {
      this.snackBar.open('No se encontró usuario logeado', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    try {
      if (this.modoCambioAsiento() && this.pasajeroCambiando()) {
        console.log('Entrando a procesarCambioAsiento');
        await this.procesarCambioAsiento(seat);
        return;
      }

      console.log('Modo normal - verificando reserva existente');

      const verificacion = await this.reservaService.verificarReservaExistente(
        usuario.idusuario,
        this.data.idplanificacion,
        this.data.isStaff!
      );

      if (this.data.isStaff && !verificacion.destinoCorrecto) {
        this.snackBar.open(
          'No puedes reservar en este viaje. El destino no coincide con tu asignación.',
          'Cerrar',
          { duration: 4000 }
        );
        return;
      }

      if (verificacion.tieneReserva) {
        await this.procesarCambioReserva(verificacion, seat, usuario);
        return;
      }

      await this.procesarNuevaReserva(seat, usuario);
    } catch (error) {
      console.error('Error en reserva:', error);
      this.snackBar.open(`Error: ${error}`, 'Cerrar', { duration: 3000 });
    }
  }

  private async procesarNuevaReserva(seat: Asiento, usuario: any) {
    let reservarRetorno = false;

    if (this.tieneRetorno()) {
      const dialogRef = this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Reservar con retorno',
          message: `Este viaje tiene un retorno programado. ¿Deseas reservar el asiento ${seat.num} también para el viaje de retorno?`,
        },
      });

      reservarRetorno = await dialogRef.afterClosed().toPromise();
    }

    const mensaje = reservarRetorno
      ? `¿Confirmas reservar el asiento ${seat.num} para la salida y el retorno?`
      : `¿Desea reservar el asiento ${seat.num}?`;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Confirmar reserva',
        message: mensaje,
      },
    });

    const confirmado = await dialogRef.afterClosed().toPromise();
    if (!confirmado) return;

    await this.reservaService.reservarAsientoPersonal(
      this.data.idplanificacion,
      seat.num!,
      usuario.idusuario,
      reservarRetorno
    );

    const mensajeExito = reservarRetorno
      ? `Asiento ${seat.num} reservado correctamente para salida y retorno`
      : `Asiento ${seat.num} reservado correctamente`;

    this.snackBar.open(mensajeExito, 'Cerrar', { duration: 3000 });
    await this.recargarYCerrar();
  }

  private async procesarCambioReserva(
    verificacion: any,
    seat: Asiento,
    usuario: any
  ) {
    const esElMismoViaje =
      verificacion.idplanificacion === this.data.idplanificacion;

    const mensaje = esElMismoViaje
      ? `Ya tienes reservado el asiento ${verificacion.asiento} en este viaje. ¿Deseas cambiar al asiento ${seat.num}?`
      : `Ya tienes una reserva en otro viaje (asiento ${verificacion.asiento}). ¿Deseas cambiar tu reserva a este viaje en el asiento ${seat.num}?`;

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
      seat.num!
    );

    this.snackBar.open(
      `Reserva cambiada exitosamente al asiento ${seat.num}`,
      'Cerrar',
      { duration: 3000 }
    );

    await this.recargarYCerrar();
  }

  async cambiarAsiento(pasajero: ReservaPasajero) {
    if (!pasajero) return;

    console.log('=== CAMBIAR ASIENTO ===');
    console.log('Pasajero:', pasajero);

    const mensaje = this.tieneRetorno()
      ? `¿Desea cambiar el asiento ${pasajero.asiento} por otro? El cambio se aplicará tanto en la salida como en el retorno. Seleccione un asiento disponible después de confirmar.`
      : `¿Desea cambiar el asiento ${pasajero.asiento} por otro? Seleccione un asiento disponible después de confirmar.`;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Cambiar asiento',
        message: mensaje,
      },
    });

    const confirmado = await dialogRef.afterClosed().toPromise();
    if (!confirmado) {
      console.log('Usuario canceló el cambio');
      return;
    }

    console.log('Activando modo cambio');
    this.modoCambioAsiento.set(true);
    this.pasajeroCambiando.set(pasajero);

    console.log('Estado después de activar:');
    console.log('modoCambioAsiento:', this.modoCambioAsiento());
    console.log('pasajeroCambiando:', this.pasajeroCambiando());

    const mensajeSnack = this.tieneRetorno()
      ? 'Seleccione el nuevo asiento. El cambio se aplicará en salida y retorno.'
      : 'Ahora seleccione el nuevo asiento en el mapa';

    this.snackBar.open(mensajeSnack, 'Cerrar', { duration: 4000 });
    this.volverAlMapa();
  }

  private async procesarCambioAsiento(seat: Asiento) {
    console.log('=== PROCESANDO CAMBIO ASIENTO ===');

    const pasajero = this.pasajeroCambiando();
    console.log('Pasajero cambiando:', pasajero);

    if (!pasajero) {
      console.log('No hay pasajero cambiando, saliendo...');
      this.modoCambioAsiento.set(false);
      return;
    }

    const usuario = this.usuarioActual();
    console.log('Usuario actual:', usuario);

    if (!usuario) {
      console.log('No hay usuario, saliendo...');
      this.modoCambioAsiento.set(false);
      return;
    }

    const mensaje = this.tieneRetorno()
      ? `¿Confirma cambiar del asiento ${pasajero.asiento} al asiento ${seat.num}? El cambio se aplicará en salida y retorno.`
      : `¿Confirma cambiar del asiento ${pasajero.asiento} al asiento ${seat.num}?`;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Confirmar cambio de asiento',
        message: mensaje,
      },
    });

    const confirmado = await dialogRef.afterClosed().toPromise();

    if (!confirmado) {
      console.log('Usuario canceló la confirmación');

      return;
    }

    console.log('Usuario confirmó, procediendo con el cambio...');

    try {
      console.log(
        'Cambiando asiento en viaje:',
        this.data.idplanificacion,
        'al asiento:',
        seat.num
      );

      await this.reservaService.cambiarReserva(
        usuario.idusuario,
        this.data.idplanificacion,
        seat.num!
      );

      console.log('Cambio en viaje principal exitoso');

      if (this.tieneRetorno() && this.idRetorno()) {
        console.log('Cambiando también en retorno:', this.idRetorno());

        await this.reservaService.cambiarReserva(
          usuario.idusuario,
          this.idRetorno()!,
          seat.num!
        );

        console.log('Cambio en retorno exitoso');
      }

      const mensajeExito = this.tieneRetorno()
        ? `Asiento cambiado exitosamente al ${seat.num} en salida y retorno`
        : `Asiento cambiado exitosamente al ${seat.num}`;

      this.snackBar.open(mensajeExito, 'Cerrar', { duration: 3000 });

      this.modoCambioAsiento.set(false);
      this.pasajeroCambiando.set(null);

      console.log('Recargando datos...');

      await this.recargarYCerrar();
    } catch (error) {
      console.error('❌ Error cambiando asiento:', error);
      this.snackBar.open(`Error al cambiar asiento: ${error}`, 'Cerrar', {
        duration: 4000,
      });

      this.modoCambioAsiento.set(false);
      this.pasajeroCambiando.set(null);
    }
  }

  async cancelarReserva(pasajero: ReservaPasajero) {
    if (!pasajero) return;

    const mensaje = this.tieneRetorno()
      ? `¿Está seguro de cancelar la reserva del asiento ${pasajero.asiento}? También se cancelará la reserva en el retorno asociado.`
      : `¿Está seguro de cancelar la reserva del asiento ${pasajero.asiento}?`;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Confirmar cancelación',
        message: mensaje,
      },
    });

    const confirmado = dialogRef.afterClosed();
    if (!confirmado) return;

    try {
      const usuario = this.usuarioActual();
      if (!usuario) return;

      await this.reservaService.cancelarReservaConRetorno(
        this.data.idplanificacion,
        usuario.idusuario,
        this.tieneRetorno()
      );

      const mensajeExito = this.tieneRetorno()
        ? `Reserva del asiento ${pasajero.asiento} cancelada en salida y retorno`
        : `Reserva del asiento ${pasajero.asiento} cancelada`;

      this.snackBar.open(mensajeExito, 'Cerrar', { duration: 3000 });
      this.volverAlMapa();
      await this.recargarYCerrar();
    } catch (error) {
      console.error('Error cancelando reserva:', error);
      this.snackBar.open(`Error: ${error}`, 'Cerrar', { duration: 3000 });
    }
  }

  private async recargarYCerrar() {
    await this.cargarDatosViaje();
    if (this.tieneRetorno() && this.idRetorno()) {
      this.dialogRef.close({
        cambiosRealizados: true,
        idplanificacion: this.data.idplanificacion,
        idRetorno: this.idRetorno(),
      });
    } else {
      this.dialogRef.close({
        cambiosRealizados: true,
        idplanificacion: this.data.idplanificacion,
      });
    }
  }
}
