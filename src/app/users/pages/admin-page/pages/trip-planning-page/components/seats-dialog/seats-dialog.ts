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
import { LoadingDialog } from '../../../../../../../shared/components/loading-dialog/loading-dialog';

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

  vistaActual = signal<'mapa' | 'detalle' | 'seleccion-retorno'>('mapa');
  pasajeroSeleccionado = signal<ReservaPasajero | null>(null);
  cargando = signal<boolean>(true);
  loadingDialogRef: MatDialogRef<LoadingDialog> | null = null;

  modoCambioAsiento = signal<boolean>(false);
  pasajeroCambiando = signal<ReservaPasajero | null>(null);

  usuarioActual = signal<any | null>(null);

  tieneRetorno = signal<boolean>(false);
  idRetorno = signal<string | null>(null);

  reservandoConRetorno = signal<boolean>(false);
  asientoSalidaSeleccionado = signal<number | null>(null);
  filasRetorno = signal<Fila[]>([]);

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
    public data: {
      idplanificacion: string;
      isStaff?: boolean;
      isAdmin?: boolean;
      isRetorno?: boolean;
    }
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
    const filasTemp: Fila[] = [];

    // 🔹 Fila del conductor (sin asiento numerado)
    filasTemp.push({
      tipo: 'conductor',
      asientos: [
        { num: null, label: 'CONDUCTOR', tipo: 'conductor', ocupado: false },
        { num: null, tipo: 'vacio', ocupado: false },
      ],
    });

    // 🔹 Caso especial para 15 asientos
    if (totalAsientos === 15) {
      let numero = 1; // Empieza desde el asiento 1

      // 5 filas normales: 2 izquierda + pasillo + 1 derecha
      for (let fila = 0; fila < 5; fila++) {
        const asientosFila: Asiento[] = [];

        // Lado izquierdo (2)
        for (let i = 0; i < 2 && numero <= totalAsientos; i++) {
          asientosFila.push(this.crearAsiento(numero++, pasajeros, ocupados));
        }

        // Pasillo central
        asientosFila.push({ num: null, tipo: 'pasillo', ocupado: false });

        // Lado derecho (1)
        if (numero <= totalAsientos) {
          asientosFila.push(this.crearAsiento(numero++, pasajeros, ocupados));
        }

        filasTemp.push({ tipo: 'normal', asientos: asientosFila });
      }

      this.filas.set(filasTemp);
      return;
    }

    // 🔹 Lógica general para otros casos
    let numero = 1;
    while (numero <= totalAsientos) {
      const restantes = totalAsientos - numero + 1;
      const asientosFila: Asiento[] = [];

      if (restantes === 5) {
        for (let i = 0; i < 2; i++) {
          asientosFila.push(this.crearAsiento(numero++, pasajeros, ocupados));
        }
        asientosFila.push({ num: null, tipo: 'pasillo', ocupado: false });
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

    const usuario = this.usuarioActual();

    if (this.data.isAdmin) {
      this.pasajeroSeleccionado.set(seat.pasajero);
      this.vistaActual.set('detalle');
      return;
    }

    if (usuario && seat.pasajero.idusuario === usuario.idusuario) {
      this.pasajeroSeleccionado.set(seat.pasajero);
      this.vistaActual.set('detalle');
      return;
    }

    this.snackBar.open('Solo puedes ver tu propio asiento.', 'Cerrar', {
      duration: 2500,
    });
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
    if (this.loadingDialogRef) return;

    const usuario = this.usuarioActual();
    if (!usuario) {
      this.snackBar.open('No se encontró usuario logeado', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    if (this.modoCambioAsiento() && this.pasajeroCambiando()) {
      await this.procesarCambioAsiento(seat);
      return;
    }

    this.mostrarLoading('Procesando tu reserva...', 'Reservando asiento');

    try {
      const verificacion = await this.reservaService.verificarReservaExistente(
        usuario.idusuario,
        this.data.idplanificacion,
        this.data.isStaff ?? false,
        this.data.isRetorno ?? false
      );

      if (this.data.isStaff && !verificacion.destinoCorrecto) {
        this.cerrarLoading();
        this.snackBar.open(
          'No puedes reservar en este viaje. El destino no coincide con tu asignación.',
          'Cerrar',
          { duration: 4000 }
        );
        return;
      }

      if (verificacion.tieneReserva && verificacion.esMismoViaje) {
        this.cerrarLoading();
        this.snackBar.open(
          `Ya tienes reservado el asiento ${verificacion.asiento}. Usa la opción "Cambiar asiento" desde el detalle de tu reserva.`,
          'Cerrar',
          { duration: 4000 }
        );
        return;
      }

      if (
        verificacion.tieneReserva &&
        verificacion.esAlMismoDestino &&
        !verificacion.esMismoViaje
      ) {
        this.cerrarLoading();
        this.snackBar.open(
          'Ya tienes una reserva en otro viaje al mismo destino. Debes cancelar esa reserva antes de reservar en este viaje.',
          'Cerrar',
          { duration: 5000 }
        );
        return;
      }

      if (verificacion.tieneReserva && !verificacion.esAlMismoDestino) {
        if (!this.data.isStaff) {
          this.cerrarLoading();
          this.snackBar.open(
            'Ya tienes una reserva activa en otro viaje. Debes cancelar esa reserva antes de reservar en este viaje.',
            'Cerrar',
            { duration: 5000 }
          );
          return;
        }

        const { tieneMaximo } =
          await this.reservaService.verificarReservasActivas(usuario.idusuario);

        if (tieneMaximo) {
          this.cerrarLoading();
          this.snackBar.open(
            'Ya tienes el máximo de reservas activas (salida + retorno). Debes cancelar tus reservas actuales para poder reservar en otro destino.',
            'Cerrar',
            { duration: 5000 }
          );
          return;
        }
      }

      let reservarRetorno = false;
      if (this.data.isStaff && this.tieneRetorno()) {
        const dialogRef = this.dialog.open(ConfirmDialog, {
          data: {
            title: 'Reservar con retorno',
            message: `Este viaje tiene un retorno programado. ¿Deseas reservar también un asiento para el viaje de retorno?`,
            cancelText: 'No, solo salida',
            confirmText: 'Sí, elegir asiento de retorno',
          },
        });

        reservarRetorno = await dialogRef.afterClosed().toPromise();
      }

      if (reservarRetorno) {
        this.asientoSalidaSeleccionado.set(seat.num!);
        this.cerrarLoading();
        await this.cargarAsientosRetorno();
        return;
      }

      const confirmDialog = this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Confirmar reserva',
          message: `¿Desea reservar el asiento ${seat.num} para la salida?`,
        },
      });

      const confirmado = await confirmDialog.afterClosed().toPromise();
      if (!confirmado) {
        this.cerrarLoading();
        return;
      }

      if (this.data.isStaff) {
        await this.reservaService.reservarAsientoPersonal(
          this.data.idplanificacion,
          seat.num!,
          usuario.idusuario,
          false
        );
      } else {
        await this.reservaService.reservarAsientoVisitante(
          this.data.idplanificacion,
          seat.num!,
          usuario.idusuario
        );
      }

      this.cerrarLoading();
      this.snackBar.open(
        `Asiento ${seat.num} reservado correctamente`,
        'Cerrar',
        { duration: 3000 }
      );

      await this.recargarYCerrar();
    } catch (error) {
      console.error('Error en reserva:', error);
      this.cerrarLoading();
      this.snackBar.open(`Error: ${error}`, 'Cerrar', { duration: 4000 });
    }
  }

  async cambiarAsiento(pasajero: ReservaPasajero) {
    if (!pasajero) return;

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
      return;
    }

    this.modoCambioAsiento.set(true);
    this.pasajeroCambiando.set(pasajero);

    const mensajeSnack = this.tieneRetorno()
      ? 'Seleccione el nuevo asiento. El cambio se aplicará en salida y retorno.'
      : 'Ahora seleccione el nuevo asiento en el mapa';

    this.snackBar.open(mensajeSnack, 'Cerrar', { duration: 4000 });
    this.volverAlMapa();
  }

  private async procesarCambioAsiento(seat: Asiento) {
    const pasajero = this.pasajeroCambiando();

    if (!pasajero) {
      this.modoCambioAsiento.set(false);
      return;
    }

    const usuario = this.usuarioActual();

    if (!usuario) {
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
      return;
    }

    this.mostrarLoading('Cambiando asiento...', 'Procesando');

    try {
      if (this.data.isStaff) {
        await this.reservaService.cambiarReserva(
          usuario.idusuario,
          this.data.idplanificacion,
          seat.num!
        );

        if (this.tieneRetorno() && this.idRetorno()) {
          await this.reservaService.cambiarReserva(
            usuario.idusuario,
            this.idRetorno()!,
            seat.num!
          );
        }
      } else {
        await this.reservaService.cambiarReservaVisitante(
          usuario.idusuario,
          this.data.idplanificacion,
          seat.num!
        );
      }

      const mensajeExito =
        this.data.isStaff && this.tieneRetorno()
          ? `Asiento cambiado exitosamente al ${seat.num} en salida y retorno`
          : `Asiento cambiado exitosamente al ${seat.num}`;

      this.cerrarLoading();
      this.snackBar.open(mensajeExito, 'Cerrar', { duration: 3000 });

      this.modoCambioAsiento.set(false);
      this.pasajeroCambiando.set(null);

      await this.recargarYCerrar();
    } catch (error) {
      console.error(' Error cambiando asiento:', error);
      this.cerrarLoading();
      this.snackBar.open(`Error al cambiar asiento: ${error}`, 'Cerrar', {
        duration: 4000,
      });

      this.modoCambioAsiento.set(false);
      this.pasajeroCambiando.set(null);
    }
  }

  async cancelarReserva(pasajero: ReservaPasajero) {
    if (!pasajero) return;
    if (this.loadingDialogRef) return;

    const usuario = this.usuarioActual();
    if (!usuario) return;

    if (!this.data.isStaff) {
      const dialogRef = this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Confirmar cancelación',
          message: `¿Está seguro de cancelar la reserva del asiento ${pasajero.asiento}?`,
        },
      });

      const confirmado = await dialogRef.afterClosed().toPromise();
      if (!confirmado) return;

      this.mostrarLoading('Cancelando reserva...', 'Procesando');

      try {
        // ✅ PASAR idusuario para cancelar notificación
        await this.reservaService.cancelarReserva(
          this.data.idplanificacion,
          pasajero.asiento,
          'visitante',
          usuario.idusuario // 🔔 AGREGADO
        );

        this.cerrarLoading();
        this.snackBar.open(
          `Reserva del asiento ${pasajero.asiento} cancelada`,
          'Cerrar',
          {
            duration: 3000,
          }
        );
        this.volverAlMapa();
        await this.recargarYCerrar();
      } catch (error) {
        console.error('Error cancelando reserva:', error);
        this.cerrarLoading();
        this.snackBar.open(`Error: ${error}`, 'Cerrar', { duration: 3000 });
      }
      return;
    }

    // ... resto del código para staff permanece igual
    const { existe, idplanificacionRetorno } =
      await this.retornoService.tieneRetorno(this.data.idplanificacion);

    if (!existe || !idplanificacionRetorno) {
      const dialogRef = this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Confirmar cancelación',
          message: `¿Está seguro de cancelar la reserva del asiento ${pasajero.asiento} para la salida?`,
        },
      });

      const confirmado = await dialogRef.afterClosed().toPromise();
      if (!confirmado) return;

      this.mostrarLoading('Cancelando reserva...', 'Procesando');

      try {
        await this.reservaService.cancelarReservaConRetorno(
          this.data.idplanificacion,
          usuario.idusuario,
          false
        );

        this.cerrarLoading();
        this.snackBar.open(`Reserva cancelada correctamente`, 'Cerrar', {
          duration: 3000,
        });
        this.volverAlMapa();
        await this.recargarYCerrar();
      } catch (error) {
        console.error('Error cancelando reserva:', error);
        this.cerrarLoading();
        this.snackBar.open(`Error: ${error}`, 'Cerrar', { duration: 3000 });
      }
      return;
    }

    const pasajerosRetorno =
      await this.reservaService.getPasajerosPorPlanificacion(
        idplanificacionRetorno
      );
    const tieneReservaRetorno = pasajerosRetorno.some(
      (p) => p.idusuario === usuario.idusuario
    );

    if (!tieneReservaRetorno) {
      const dialogRef = this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Confirmar cancelación',
          message: `¿Está seguro de cancelar la reserva del asiento ${pasajero.asiento} para la salida?`,
        },
      });

      const confirmado = await dialogRef.afterClosed().toPromise();
      if (!confirmado) return;

      this.mostrarLoading('Cancelando reserva...', 'Procesando');

      try {
        await this.reservaService.cancelarReservaConRetorno(
          this.data.idplanificacion,
          usuario.idusuario,
          false
        );

        this.cerrarLoading();
        this.snackBar.open(
          `Reserva de salida cancelada correctamente`,
          'Cerrar',
          {
            duration: 3000,
          }
        );
        this.volverAlMapa();
        await this.recargarYCerrar();
      } catch (error) {
        console.error('Error cancelando reserva:', error);
        this.cerrarLoading();
        this.snackBar.open(`Error: ${error}`, 'Cerrar', { duration: 3000 });
      }
      return;
    }

    const pasajeroRetorno = pasajerosRetorno.find(
      (p) => p.idusuario === usuario.idusuario
    );

    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Cancelar reserva',
        message: `Tienes reservas en:\n- SALIDA: Asiento ${pasajero.asiento}\n- RETORNO: Asiento ${pasajeroRetorno?.asiento}\n\n¿Qué deseas cancelar?`,
        cancelText: 'Solo SALIDA',
        confirmText: 'Solo RETORNO',
        showExtraButton: true,
        extraButtonText: 'AMBAS',
      },
    });

    const resultado = await dialogRef.afterClosed().toPromise();

    if (resultado === null || resultado === undefined) return;

    this.mostrarLoading('Cancelando reserva(s)...', 'Procesando');

    try {
      if (resultado === 'extra') {
        await this.reservaService.cancelarReservaConRetorno(
          this.data.idplanificacion,
          usuario.idusuario,
          true
        );
        this.snackBar.open(
          'Reservas de salida y retorno canceladas',
          'Cerrar',
          {
            duration: 3000,
          }
        );
      } else if (resultado === false) {
        await this.reservaService.cancelarReservaConRetorno(
          this.data.idplanificacion,
          usuario.idusuario,
          false
        );
        this.snackBar.open('Reserva de salida cancelada', 'Cerrar', {
          duration: 3000,
        });
      } else if (resultado === true) {
        await this.reservaService.cancelarReservaConRetorno(
          idplanificacionRetorno,
          usuario.idusuario,
          false
        );
        this.snackBar.open('Reserva de retorno cancelada', 'Cerrar', {
          duration: 3000,
        });
      }

      this.cerrarLoading();
      this.volverAlMapa();
      await this.recargarYCerrar();
    } catch (error) {
      console.error('Error cancelando reserva:', error);
      this.cerrarLoading();
      this.snackBar.open(`Error: ${error}`, 'Cerrar', { duration: 3000 });
    }
  }

  private mostrarLoading(message: string, title: string = 'Procesando') {
    if (this.loadingDialogRef) {
      this.loadingDialogRef.componentInstance.data.message = message;
      this.loadingDialogRef.componentInstance.data.title = title;
      return;
    }

    this.loadingDialogRef = this.dialog.open(LoadingDialog, {
      data: { message, title },
      disableClose: true,
      panelClass: 'loading-dialog',
    });
  }

  private cerrarLoading() {
    if (this.loadingDialogRef) {
      this.loadingDialogRef.close();
      this.loadingDialogRef = null;
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

  private async cargarAsientosRetorno() {
    try {
      if (!this.idRetorno()) {
        this.snackBar.open('No se encontró el retorno asociado', 'Cerrar', {
          duration: 3000,
        });
        return;
      }

      this.cargando.set(true);

      const viajeRetorno = await this.tripService.getViaje(this.idRetorno()!);
      const cve = Array.isArray(viajeRetorno.vehiculo)
        ? viajeRetorno.vehiculo[0]
        : viajeRetorno.vehiculo;
      const vehiculoData = Array.isArray(cve?.vehiculo)
        ? cve.vehiculo[0]
        : cve?.vehiculo;
      const totalAsientos = vehiculoData?.nroasientos ?? 0;

      const pasajerosRetorno =
        await this.reservaService.getPasajerosPorPlanificacion(
          this.idRetorno()!
        );

      this.generarMapaAsientosRetorno(totalAsientos, pasajerosRetorno);
      this.vistaActual.set('seleccion-retorno');
      this.cargando.set(false);
    } catch (error) {
      console.error('Error cargando asientos del retorno:', error);
      this.cargando.set(false);
      this.snackBar.open('Error al cargar los asientos del retorno', 'Cerrar', {
        duration: 3000,
      });
    }
  }

  private generarMapaAsientosRetorno(
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

    this.filasRetorno.set(filasTemp);
  }

  async reservarAsientoRetorno(seat: Asiento) {
    if (!seat || seat.ocupado || seat.tipo !== 'asiento') return;

    const asientoSalida = this.asientoSalidaSeleccionado();
    if (!asientoSalida) {
      this.snackBar.open(
        'Error: No se encontró el asiento de salida',
        'Cerrar',
        {
          duration: 3000,
        }
      );
      return;
    }

    const usuario = this.usuarioActual();
    if (!usuario) {
      this.snackBar.open('No se encontró usuario logeado', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Confirmar reserva',
        message: `¿Confirmas reservar:\n- Asiento ${asientoSalida} para la SALIDA\n- Asiento ${seat.num} para el RETORNO?`,
      },
    });

    const confirmado = await dialogRef.afterClosed().toPromise();
    if (!confirmado) return;

    this.mostrarLoading('Reservando asientos...', 'Procesando');

    try {
      await this.reservaService.reservarAsientoPersonal(
        this.data.idplanificacion,
        asientoSalida,
        usuario.idusuario,
        false
      );

      await this.reservaService.reservarAsientoPersonal(
        this.idRetorno()!,
        seat.num!,
        usuario.idusuario,
        false
      );

      this.cerrarLoading();
      this.snackBar.open(
        `Reservas realizadas:\n- Asiento ${asientoSalida} (Salida)\n- Asiento ${seat.num} (Retorno)`,
        'Cerrar',
        { duration: 4000 }
      );

      this.asientoSalidaSeleccionado.set(null);
      await this.recargarYCerrar();
    } catch (error) {
      console.error('Error reservando asientos:', error);
      this.cerrarLoading();
      this.snackBar.open(`Error: ${error}`, 'Cerrar', { duration: 4000 });
    }
  }

  volverASeleccionSalida() {
    this.vistaActual.set('mapa');
    this.asientoSalidaSeleccionado.set(null);
  }
}
