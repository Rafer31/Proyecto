import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TripCardComponent } from './components/trip-card/trip-card';
import { TripPlanningService } from '../../../admin-page/services/trip-planning.service';
import { UserDataService } from '../../../../../auth/services/userdata.service';
import { SupabaseService } from '../../../../../shared/services/supabase.service';
import { SeatsDialog } from '../../../admin-page/pages/trip-planning-page/components/seats-dialog/seats-dialog';
import { Emptystate } from '../../../../components/emptystate/emptystate';

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
  styleUrl: './available-trips.scss'
})
export class AvailableTrips implements OnInit {
  viajes = signal<any[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  usuarioDestino = signal<string | null>(null);

  private dialog = inject(MatDialog);
  private tripService = inject(TripPlanningService);
  private userDataService = inject(UserDataService);
  private supabaseService = inject(SupabaseService);

  async ngOnInit() {
    await this.cargarDatos();
  }

  private async cargarDatos() {
    try {
      this.loading.set(true);
      this.error.set(null);

      // Obtener usuario actual
      const { data: { user }, error: authError } = await this.supabaseService.supabase.auth.getUser();
      
      if (authError || !user) {
        this.error.set('No se pudo obtener la información del usuario');
        return;
      }

      // Obtener datos del usuario
      const usuario = await this.userDataService.getActiveUserByAuthId(user.id);
      
      if (!usuario) {
        this.error.set('Usuario no encontrado');
        return;
      }

      // Obtener destino asignado del usuario
      const { data: personal, error: personalError } = await this.supabaseService.supabase
        .from('personal')
        .select('nroficha')
        .eq('idusuario', usuario.idusuario)
        .maybeSingle();

      if (personalError || !personal) {
        this.error.set('No se encontró información de personal');
        return;
      }

      // Obtener asignación de destino activa
      const { data: asignacion, error: asignacionError } = await this.supabaseService.supabase
        .from('asignacion_destino')
        .select('iddestino, destino(nomdestino)')
        .eq('nroficha', personal.nroficha)
        .is('fechafin', null)
        .maybeSingle();

      if (asignacionError || !asignacion) {
        this.error.set('No tienes un destino asignado actualmente');
        return;
      }

      // Manejar destino como array o objeto
      const destinoInfo: any = asignacion.destino;
      const nombreDestino = Array.isArray(destinoInfo) 
        ? destinoInfo[0]?.nomdestino 
        : destinoInfo?.nomdestino;
      this.usuarioDestino.set(nombreDestino || asignacion.iddestino);

      // Obtener viajes disponibles para el destino del usuario
      const viajes = await this.tripService.getViajesDisponiblesPorDestino(asignacion.iddestino);
      
      this.viajes.set(viajes.map((v: any) => {
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
          asientosDisponibles: v.conductor_vehiculo_empresa?.cantdisponibleasientos ?? 0,
        };
      }));
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
        isStaff: true // Flag para indicar que es un usuario staff
      },
    });

    dialogRef.afterClosed().subscribe(() => {
      // Recargar viajes para actualizar asientos disponibles
      this.cargarDatos();
    });
  }
}
