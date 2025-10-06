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

  // Usar estado global para el usuario
  currentUser = this.userStateService.currentUser;
  userName = this.userStateService.userName;

  async ngOnInit() {
    await this.cargarDatos();
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

      // Obtener todos los viajes disponibles (visitantes pueden ver todos)
      const viajes = await this.tripService.getViajes();

      this.viajes.set(
        viajes.map((v: any) => {
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
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.cargarDatos();
      }
    });
  }
}
