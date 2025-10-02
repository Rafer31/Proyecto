import { Component, signal, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TripCardComponent } from './components/trip-card/trip-card';
import { TripPlanningService } from '../../../admin-page/services/trip-planning.service';
import { UserDataService } from '../../../../../auth/services/userdata.service';
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

  private dialog = inject(MatDialog);
  private tripService = inject(TripPlanningService);
  private supabaseService = inject(SupabaseService);
  private userStateService = inject(UserStateService);

  currentUser = this.userStateService.currentUser;
  userName = this.userStateService.userName;

  constructor() {
    // Efecto que se ejecuta cuando currentUser cambia
    effect(() => {
      const usuario = this.currentUser();
      if (usuario && this.loading()) {
        // Esperar un tick para que Angular procese el cambio
        setTimeout(() => this.cargarDatos(), 0);
      }
    });
  }

  async ngOnInit() {
    // Si ya hay usuario, cargar datos inmediatamente
    if (this.currentUser()) {
      await this.cargarDatos();
    }
    // Si no hay usuario, el efecto se encargará de cargar cuando esté disponible
  }

  private async cargarDatos() {
    try {
      this.loading.set(true);
      this.error.set(null);

      const usuario = this.currentUser();

      if (!usuario) {
        console.log('Esperando datos del usuario...');
        return;
      }

      console.log('Usuario encontrado:', usuario);

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
        this.error.set('No se encontró información de personal para este usuario');
        return;
      }

      console.log('Personal encontrado:', personal);

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

      console.log('Asignación encontrada:', asignacion);

      const destinoInfo: any = asignacion.destino;
      const nombreDestino = Array.isArray(destinoInfo)
        ? destinoInfo[0]?.nomdestino
        : destinoInfo?.nomdestino;
      this.usuarioDestino.set(nombreDestino || asignacion.iddestino);

      const viajes = await this.tripService.getViajesDisponiblesPorDestino(
        asignacion.iddestino
      );

      console.log('Viajes obtenidos:', viajes);

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
            horaLlegada: v.horallegada,
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
        isStaff: true,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.cargarDatos();
      }
    });
  }
}
