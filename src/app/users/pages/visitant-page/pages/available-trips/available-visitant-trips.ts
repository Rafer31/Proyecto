import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TripCardComponent } from '../../../staff-page/pages/available-trips/components/trip-card/trip-card';
import { TripPlanningService } from '../../../admin-page/services/trip-planning.service';
import { UserDataService } from '../../../../../auth/services/userdata.service';
import { SupabaseService } from '../../../../../shared/services/supabase.service';
import { SeatsDialog } from '../../../admin-page/pages/trip-planning-page/components/seats-dialog/seats-dialog';
import { Emptystate } from '../../../../components/emptystate/emptystate';
import { UserStateService } from '../../../../../shared/services/user-state.service';

@Component({
  selector: 'app-available-visitant-trips',
  imports: [
    CommonModule,
    TripCardComponent,
    MatProgressSpinnerModule,
    Emptystate,
  ],
  templateUrl: './available-visitant-trips.html',
  styleUrl: './available-visitant-trips.scss',
})
export class AvailableVisitantTrips implements OnInit {
  viajes = signal<any[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  private dialog = inject(MatDialog);
  private tripService = inject(TripPlanningService);
  private userStateService = inject(UserStateService);
  private userDataService = inject(UserDataService);
  private supabaseService = inject(SupabaseService);

  currentUser = this.userStateService.currentUser;
  userName = this.userStateService.userName;
  reservasActivas = signal<Map<string, number>>(new Map());

  async ngOnInit() {
    await this.cargarUsuario();
    await this.cargarDatos();
  }
  private async cargarUsuario() {
    try {
      const supabase = this.supabaseService.supabase;
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        console.error('Error obteniendo usuario visitante:', error);
        this.error.set('Usuario no encontrado');
        return;
      }

      await this.userDataService.loadUserAndUpdateState(user.id);
    } catch (err) {
      console.error('Error cargando usuario visitante:', err);
      this.error.set('Error al cargar datos del usuario');
    }
  }
  async cargarDatos() {
    try {
      this.loading.set(true);
      this.error.set(null);

      const usuario = this.currentUser();
      if (!usuario) {
        this.error.set('Usuario no encontrado');
        return;
      }

      const { data: visitante, error: visitanteError } =
        await this.supabaseService.supabase
          .from('visitante')
          .select('idvisitante')
          .eq('idusuario', usuario.idusuario)
          .maybeSingle();

      if (!visitanteError && visitante) {
        const { data: reservas, error: reservasError } =
          await this.supabaseService.supabase
            .from('visitante_planificacionviaje')
            .select('idplanificacion, nroasiento')
            .eq('idvisitante', visitante.idvisitante)
            .eq('estado', 'reservado');

        if (!reservasError && reservas) {
          const reservasMap = new Map<string, number>();
          reservas.forEach((r: any) => {
            reservasMap.set(r.idplanificacion, r.nroasiento);
          });
          this.reservasActivas.set(reservasMap);
        }
      }

      const viajes = await this.tripService.getViajes();

      const viajesFiltrados = viajes.filter((v: any) => {
        const destinoViaje: any = v.destino;
        const nombreDestinoViaje = Array.isArray(destinoViaje)
          ? destinoViaje[0]?.nomdestino
          : destinoViaje?.nomdestino;

        return nombreDestinoViaje?.trim() !== 'Bolivar';
      });

      this.viajes.set(
        viajesFiltrados.map((v: any) => {
          const destinoViaje: any = v.destino;
          const nombreDestinoViaje = Array.isArray(destinoViaje)
            ? destinoViaje[0]?.nomdestino
            : destinoViaje?.nomdestino;

          return {
            idviaje: v.idplanificacion,
            fechaPartida: v.fechapartida,
            fechaLlegada: v.fechallegada,
            horaPartida: v.horapartida,
            destino: nombreDestinoViaje ?? 'Sin destino',
            asientosDisponibles:
              v.conductor_vehiculo_empresa?.cantdisponibleasientos ?? 0,
          };
        })
      );
    } catch (err) {
      console.error('Error cargando viajes:', err);
      this.error.set('Error al cargar los viajes disponibles');
    } finally {
      this.loading.set(false);
    }
  }

  abrirDialogoReserva(idviaje: string) {
    const dialogRef = this.dialog.open(SeatsDialog, {
      width: '700px',
      data: {
        idplanificacion: idviaje,
        isStaff: false,
        isAdmin: false,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.cambiosRealizados) {
        this.cargarDatos();
      }
    });
  }

  tieneReservaEnViaje(idviaje: string): boolean {
    return this.reservasActivas().has(idviaje);
  }

  getAsientoReservado(idviaje: string): number | null {
    return this.reservasActivas().get(idviaje) || null;
  }
}
