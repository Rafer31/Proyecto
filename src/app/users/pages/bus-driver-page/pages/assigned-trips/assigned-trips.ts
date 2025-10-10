import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DriverService, ViajeAsignado } from '../../services/driver.service';
import { SupabaseService } from '../../../../../shared/services/supabase.service';
import { UserDataService } from '../../../../../auth/services/userdata.service';

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
      this.viajes.set(viajes);
    } catch (error) {
      console.error('Error cargando viajes:', error);
      this.snackBar.open('Error al cargar los viajes asignados', 'Cerrar', {
        duration: 3000,
      });
    } finally {
      this.cargando.set(false);
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
    
    // Si viene en formato HH:MM:SS, extraer solo HH:MM
    if (hora.includes(':') && !hora.includes('T')) {
      const partes = hora.split(':');
      return `${partes[0]}:${partes[1]}`;
    }
    
    // Si viene en formato ISO (con fecha), convertir
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