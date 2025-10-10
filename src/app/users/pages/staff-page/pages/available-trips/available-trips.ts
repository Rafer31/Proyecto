import { Component, signal, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TripCardComponent } from './components/trip-card/trip-card';
import { TripPlanningService } from '../../../admin-page/services/trip-planning.service';
import { SupabaseService } from '../../../../../shared/services/supabase.service';
import { SeatsDialog } from '../../../admin-page/pages/trip-planning-page/components/seats-dialog/seats-dialog';
import { Emptystate } from '../../../../components/emptystate/emptystate';
import { UserStateService } from '../../../../../shared/services/user-state.service';

@Component({
  selector: 'app-available-trips',
  standalone: true,
  imports: [
    CommonModule,
    TripCardComponent,
    MatProgressSpinnerModule,
    Emptystate,
  ],
  templateUrl: './available-trips.html',
  styleUrl: './available-trips.scss',
})
export class AvailableTrips implements OnInit {
  viajes = signal<any[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  usuarioDestino = signal<string | null>(null);
  private datosYaCargados = false;

  private dialog = inject(MatDialog);
  private tripService = inject(TripPlanningService);
  private supabaseService = inject(SupabaseService);
  private userStateService = inject(UserStateService);

  currentUser = this.userStateService.currentUser;

  constructor() {
    effect(() => {
      const usuario = this.currentUser();
      const isLoading = this.userStateService.isLoading();

      if (usuario && !isLoading && !this.datosYaCargados) {
        this.datosYaCargados = true;
        setTimeout(() => this.cargarDatos(), 0);
      }
    });
  }

  async ngOnInit() {
    if (this.currentUser() && !this.userStateService.isLoading()) {
      await this.cargarDatos();
      this.datosYaCargados = true;
    }
  }

  private async cargarDatos() {
    try {
      this.loading.set(true);
      this.error.set(null);

      const usuario = this.currentUser();

      if (!usuario) {
        return;
      }

      const { data: personal, error: personalError } =
        await this.supabaseService.supabase
          .from('personal')
          .select('nroficha')
          .eq('idusuario', usuario.idusuario)
          .maybeSingle();

      if (personalError) {
        console.error('Error obteniendo personal:', personalError);
        this.error.set('Error al obtener información de personal');
        return;
      }

      if (!personal) {
        this.error.set(
          'No se encontró información de personal para este usuario'
        );
        return;
      }

      const { data: asignacion, error: asignacionError } =
        await this.supabaseService.supabase
          .from('asignacion_destino')
          .select('iddestino, destino(nomdestino)')
          .eq('nroficha', personal.nroficha)
          .is('fechafin', null)
          .maybeSingle();

      if (asignacionError) {
        console.error('Error obteniendo asignación:', asignacionError);
        this.error.set('Error al obtener asignación de destino');
        return;
      }

      if (!asignacion) {
        this.error.set('No tienes un destino asignado actualmente');
        return;
      }

      const destinoInfo: any = asignacion.destino;
      const nombreDestino = Array.isArray(destinoInfo)
        ? destinoInfo[0]?.nomdestino
        : destinoInfo?.nomdestino;
      this.usuarioDestino.set(nombreDestino || asignacion.iddestino);

      const viajesConRetorno =
        await this.tripService.getViajesDisponiblesPorDestino(
          asignacion.iddestino
        );

      this.viajes.set(
        viajesConRetorno.map((viajeData: any) => {
          const viaje = viajeData.viaje;
          const destinoViaje: any = viaje.destino;
          const nombreDestinoViaje = Array.isArray(destinoViaje)
            ? destinoViaje[0]?.nomdestino
            : destinoViaje?.nomdestino;

          const cve = Array.isArray(viaje.conductor_vehiculo_empresa)
            ? viaje.conductor_vehiculo_empresa[0]
            : viaje.conductor_vehiculo_empresa;

          return {
            idviaje: viaje.idplanificacion,
            fechaPartida: viaje.fechapartida,
            fechaLlegada: viaje.fechallegada,
            horaPartida: viaje.horapartida,
            destino: nombreDestinoViaje ?? 'Sin destino',
            asientosDisponibles: cve?.cantdisponibleasientos ?? 0,
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
        isStaff: true,
        isAdmin: false,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.cambiosRealizados) {
        this.cargarDatos();
      }
    });
  }
}
