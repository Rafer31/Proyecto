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
  selector: 'app-assigned-returns',
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
  templateUrl: './assigned-returns.html',
  styleUrl: './assigned-returns.scss',
})
export class AssignedReturns implements OnInit {
  private driverService = inject(DriverService);
  private supabaseService = inject(SupabaseService);
  private userDataService = inject(UserDataService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  retornos = signal<ViajeAsignado[]>([]);
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
    await this.cargarRetornos();
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

  private async cargarRetornos() {
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
      
      // Filtrar solo RETORNOS
      const viajesRetorno = await this.filtrarRetornos(viajes);
      this.retornos.set(viajesRetorno);

      for (const retorno of viajesRetorno) {
        if (!retorno.horarealpartida) {
          await this.verificarEstadoAsistencia(retorno.idplanificacion);
        }
      }
    } catch (error) {
      console.error('Error cargando retornos:', error);
      this.snackBar.open('Error al cargar los retornos asignados', 'Cerrar', {
        duration: 3000,
      });
    } finally {
      this.cargando.set(false);
    }
  }

  private async filtrarRetornos(viajes: ViajeAsignado[]): Promise<ViajeAsignado[]> {
    try {
      const idsViajes = viajes.map(v => v.idplanificacion);
      
      if (idsViajes.length === 0) return [];

      // Obtener solo los retornos
      const { data: retornos } = await this.supabaseService.supabase
        .from('retorno_viaje')
        .select('idplanificacion_retorno')
        .in('idplanificacion_retorno', idsViajes);

      const idsRetornos = new Set(retornos?.map(r => r.idplanificacion_retorno) || []);

      // Retornar solo los viajes que SÍ están en la tabla de retornos
      return viajes.filter(v => idsRetornos.has(v.idplanificacion));
    } catch (error) {
      console.error('Error filtrando retornos:', error);
      return [];
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

  verPasajeros(retorno: ViajeAsignado) {
    this.router.navigate([
      '/users/bus-driver/assigned-returns',
      retorno.idplanificacion,
      'passengers',
    ]);
  }

  async iniciarRetorno(retorno: ViajeAsignado) {
    if (retorno.horarealpartida) {
      this.snackBar.open('El retorno ya ha iniciado', 'Cerrar', {
        duration: 2000,
      });
      return;
    }

    const estado = this.estadoAsistencia()[retorno.idplanificacion];
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
        retorno.idplanificacion,
        retorno.idconductorvehiculoempresa
      );
      this.snackBar.open('Retorno iniciado correctamente', 'Cerrar', {
        duration: 2000,
      });
      await this.cargarRetornos();
    } catch (error) {
      console.error('Error iniciando retorno:', error);
      this.snackBar.open('Error al iniciar el retorno', 'Cerrar', {
        duration: 3000,
      });
    }
  }

  async finalizarRetorno(retorno: ViajeAsignado) {
    if (!retorno.horarealpartida) {
      this.snackBar.open(
        'Debes iniciar el retorno antes de finalizarlo',
        'Cerrar',
        { duration: 2000 }
      );
      return;
    }

    if (retorno.horarealllegada) {
      this.snackBar.open('El retorno ya ha sido finalizado', 'Cerrar', {
        duration: 2000,
      });
      return;
    }

    try {
      await this.driverService.marcarHoraLlegada(
        retorno.idplanificacion,
        retorno.idconductorvehiculoempresa
      );
      this.snackBar.open('Retorno finalizado correctamente', 'Cerrar', {
        duration: 2000,
      });
      await this.cargarRetornos();
    } catch (error) {
      console.error('Error finalizando retorno:', error);
      this.snackBar.open('Error al finalizar el retorno', 'Cerrar', {
        duration: 3000,
      });
    }
  }

  getEstadoViaje(retorno: ViajeAsignado): string {
    if (retorno.horarealllegada) {
      return 'Finalizado';
    }
    if (retorno.horarealpartida) {
      return 'En curso';
    }
    return 'Pendiente';
  }

  getColorEstado(retorno: ViajeAsignado): string {
    if (retorno.horarealllegada) {
      return 'accent';
    }
    if (retorno.horarealpartida) {
      return 'primary';
    }
    return 'warn';
  }

  puedeiniciarRetorno(retorno: ViajeAsignado): boolean {
    if (retorno.horarealpartida) {
      return false;
    }
    const estado = this.estadoAsistencia()[retorno.idplanificacion];
    return estado?.todosVerificados || false;
  }

  obtenerMensajeAsistencia(retorno: ViajeAsignado): string {
    const estado = this.estadoAsistencia()[retorno.idplanificacion];
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