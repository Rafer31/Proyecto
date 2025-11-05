import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { DriverService, ViajeAsignado } from '../../services/driver.service';
import { SupabaseService } from '../../../../../shared/services/supabase.service';
import { UserDataService } from '../../../../../auth/services/userdata.service';
import { Emptystate } from '../../../../components/emptystate/emptystate';

@Component({
  selector: 'app-assigned-trips',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
    Emptystate,
  ],
  templateUrl: './assigned-trips.html',
  styleUrl: './assigned-trips.scss',
})
export class AssignedTrips implements OnInit {
  private driverService = inject(DriverService);
  private supabaseService = inject(SupabaseService);
  private userDataService = inject(UserDataService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  viajes = signal<ViajeAsignado[]>([]);
  cargando = signal<boolean>(true);
  usuarioActual = signal<any | null>(null);
  verificandoAsistencia = signal<{ [key: string]: boolean }>({});
  estadoAsistencia = signal<{
    [key: string]: {
      todosVerificados: boolean;
      totalPasajeros: number;
      pasajerosVerificados: number;
      pendientes: number;
    };
  }>({});

  async ngOnInit() {
    await this.cargarUsuario();
    await this.cargarViajes();
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

  private async cargarViajes() {
    const usuario = this.usuarioActual();
    if (!usuario) {
      this.cargando.set(false);
      return;
    }

    try {
      this.cargando.set(true);
      const viajes = await this.driverService.getViajesAsignados(
        usuario.idusuario
      );

      // Filtrar solo viajes de IDA (los que NO son retornos)
      const viajesIda = await this.filtrarViajesIda(viajes);
      this.viajes.set(viajesIda);

      for (const viaje of viajesIda) {
        if (!viaje.horarealpartida) {
          await this.verificarEstadoAsistencia(viaje.idplanificacion);
        }
      }
    } catch (error) {
      console.error('Error cargando viajes:', error);
      this.snackBar.open('Error al cargar los viajes asignados', 'Cerrar', {
        duration: 3000,
      });
    } finally {
      this.cargando.set(false);
    }
  }

  private async filtrarViajesIda(viajes: ViajeAsignado[]): Promise<ViajeAsignado[]> {
    try {
      const idsViajes = viajes.map(v => v.idplanificacion);

      if (idsViajes.length === 0) return [];

      // Obtener todos los retornos para identificar cuáles NO son retornos
      const { data: retornos } = await this.supabaseService.supabase
        .from('retorno_viaje')
        .select('idplanificacion_retorno')
        .in('idplanificacion_retorno', idsViajes);

      const idsRetornos = new Set(retornos?.map(r => r.idplanificacion_retorno) || []);

      // Retornar solo los viajes que NO están en la tabla de retornos
      return viajes.filter(v => !idsRetornos.has(v.idplanificacion));
    } catch (error) {
      console.error('Error filtrando viajes de salida:', error);
      return viajes;
    }
  }

  private async verificarEstadoAsistencia(idplanificacion: string) {
    try {
      const estado = await this.driverService.verificarTodosPasajerosAsistencia(
        idplanificacion
      );
      const estadoActual = this.estadoAsistencia();
      estadoActual[idplanificacion] = estado;
      this.estadoAsistencia.set(estadoActual);
    } catch (error) {
      console.error('Error verificando asistencia:', error);
    }
  }

  verPasajeros(viaje: ViajeAsignado) {
    this.router.navigate([
      '/users/bus-driver/assigned-trips',
      viaje.idplanificacion,
      'passengers',
    ]);
  }

  async iniciarViaje(viaje: ViajeAsignado) {
    if (viaje.horarealpartida) {
      this.snackBar.open('El viaje ya ha iniciado', 'Cerrar', {
        duration: 2000,
      });
      return;
    }

    const estado = this.estadoAsistencia()[viaje.idplanificacion];
    if (!estado?.todosVerificados) {
      this.snackBar.open(
        `⚠️ Debes marcar la asistencia de todos los pasajeros (${estado?.pendientes} pendientes)`,
        'Cerrar',
        {
          duration: 4000,
          panelClass: ['snackbar-warning'],
        }
      );
      return;
    }

    try {
      await this.driverService.marcarHoraPartida(
        viaje.idplanificacion,
        viaje.idconductorvehiculoempresa
      );
      this.snackBar.open('Viaje iniciado correctamente', 'Cerrar', {
        duration: 2000,
      });
      await this.cargarViajes();
    } catch (error) {
      console.error('Error iniciando viaje:', error);
      this.snackBar.open('Error al iniciar el viaje', 'Cerrar', {
        duration: 3000,
      });
    }
  }

  async finalizarViaje(viaje: ViajeAsignado) {
    if (!viaje.horarealpartida) {
      this.snackBar.open(
        'Debes iniciar el viaje antes de finalizarlo',
        'Cerrar',
        { duration: 2000 }
      );
      return;
    }

    if (viaje.horarealllegada) {
      this.snackBar.open('El viaje ya ha sido finalizado', 'Cerrar', {
        duration: 2000,
      });
      return;
    }

    try {
      await this.driverService.marcarHoraLlegada(
        viaje.idplanificacion,
        viaje.idconductorvehiculoempresa
      );
      this.snackBar.open('Viaje finalizado correctamente', 'Cerrar', {
        duration: 2000,
      });
      await this.cargarViajes();
    } catch (error) {
      console.error('Error finalizando viaje:', error);
      this.snackBar.open('Error al finalizar el viaje', 'Cerrar', {
        duration: 3000,
      });
    }
  }

  getEstadoViaje(viaje: ViajeAsignado): string {
    if (viaje.horarealllegada) {
      return 'Finalizado';
    }
    if (viaje.horarealpartida) {
      return 'En curso';
    }
    return 'Pendiente';
  }

  getColorEstado(viaje: ViajeAsignado): string {
    if (viaje.horarealllegada) {
      return 'accent';
    }
    if (viaje.horarealpartida) {
      return 'primary';
    }
    return 'warn';
  }

  puedeiniciarViaje(viaje: ViajeAsignado): boolean {
    if (viaje.horarealpartida) {
      return false;
    }
    const estado = this.estadoAsistencia()[viaje.idplanificacion];
    return estado?.todosVerificados || false;
  }

  obtenerMensajeAsistencia(viaje: ViajeAsignado): string {
    const estado = this.estadoAsistencia()[viaje.idplanificacion];
    if (!estado) {
      return 'Verificando...';
    }
    if (estado.todosVerificados) {
      return `Listo: ${estado.totalPasajeros} pasajeros verificados`;
    }
    return `${estado.pendientes} pasajero(s) pendiente(s)`;
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return 'Fecha no disponible';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  formatearHora(hora: string): string {
    if (!hora) return '--:--';

    if (hora.includes(':') && !hora.includes('T')) {
      const partes = hora.split(':');
      return `${partes[0]}:${partes[1]}`;
    }

    try {
      const date = new Date(hora);
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return hora;
    }
  }
}
