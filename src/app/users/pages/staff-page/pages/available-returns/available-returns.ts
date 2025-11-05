import { Component, signal, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TripCardComponent } from '../available-trips/components/trip-card/trip-card';
import { TripPlanningService } from '../../../admin-page/services/trip-planning.service';
import { SupabaseService } from '../../../../../shared/services/supabase.service';
import { SeatsDialog } from '../../../admin-page/pages/trip-planning-page/components/seats-dialog/seats-dialog';
import { Emptystate } from '../../../../components/emptystate/emptystate';
import { UserStateService } from '../../../../../shared/services/user-state.service';

@Component({
  selector: 'app-available-returns',
  standalone: true,
  imports: [
    CommonModule,
    TripCardComponent,
    MatProgressSpinnerModule,
    Emptystate,
  ],
  templateUrl: './available-returns.html',
  styleUrl: './available-returns.scss',
})
export class AvailableReturns implements OnInit {
  retornos = signal<any[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  usuarioDestino = signal<string | null>(null);
  private datosYaCargados = false;

  private dialog = inject(MatDialog);
  private tripService = inject(TripPlanningService);
  private supabaseService = inject(SupabaseService);
  private userStateService = inject(UserStateService);

  currentUser = this.userStateService.currentUser;
  reservasActivas = signal<Map<string, number>>(new Map());

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

      const { data: asignacionDestino, error: asignacionDestinoError } =
        await this.supabaseService.supabase
          .from('asignacion_destino')
          .select('idasignaciondestino')
          .eq('nroficha', personal.nroficha)
          .is('fechafin', null)
          .maybeSingle();

      if (asignacionDestinoError || !asignacionDestino) {
        this.error.set('No se encontró asignación de destino activa');
        return;
      }

      const { data: reservasActivas, error: reservasError } =
        await this.supabaseService.supabase
          .from('asignaciondestino_planificacionviaje')
          .select('idplanificacion, nroasiento')
          .eq('idasignaciondestino', asignacionDestino.idasignaciondestino)
          .eq('estado', 'reservado');

      if (reservasError) {
        console.error('Error obteniendo reservas:', reservasError);
        this.error.set('Error al obtener tus reservas');
        return;
      }

      if (!reservasActivas || reservasActivas.length === 0) {
        this.retornos.set([]);
        return;
      }

      const idsViajesConReserva = reservasActivas.map((r) => r.idplanificacion);

      // Obtener IDs de los retornos con sus asientos reservados
      const { data: retornosConReserva, error: retornosReservaError } =
        await this.supabaseService.supabase
          .from('retorno_viaje')
          .select('idplanificacion_retorno, idplanificacion_ida')
          .in('idplanificacion_ida', idsViajesConReserva)
          .eq('estado', 'activo');

      if (!retornosReservaError && retornosConReserva) {
        // Buscar reservas en los retornos
        const idsRetornos = retornosConReserva.map((r: any) => r.idplanificacion_retorno);

        if (idsRetornos.length > 0) {
          const { data: reservasRetorno, error: reservasRetornoError } =
            await this.supabaseService.supabase
              .from('asignaciondestino_planificacionviaje')
              .select('idplanificacion, nroasiento')
              .eq('idasignaciondestino', asignacionDestino.idasignaciondestino)
              .in('idplanificacion', idsRetornos)
              .eq('estado', 'reservado');

          if (!reservasRetornoError && reservasRetorno) {
            const reservasMap = new Map<string, number>();
            reservasRetorno.forEach((r: any) => {
              reservasMap.set(r.idplanificacion, r.nroasiento);
            });
            this.reservasActivas.set(reservasMap);
          }
        }
      }

      const { data: retornosData, error: retornosError } =
        await this.supabaseService.supabase
          .from('retorno_viaje')
          .select(
            `
            idplanificacion_retorno,
            planificacion_viaje!retorno_idplanificacion_retorno_fkey(
              idplanificacion,
              fechapartida,
              fechallegada,
              horapartida,
              destino(nomdestino),
              conductor_vehiculo_empresa(
                cantdisponibleasientos,
                vehiculo(nroasientos)
              )
            )
          `
          )
          .in('idplanificacion_ida', idsViajesConReserva)
          .eq('estado', 'activo');

      if (retornosError) {
        console.error('Error obteniendo retornos:', retornosError);
        this.error.set('Error al cargar los retornos');
        return;
      }

      const retornosFiltrados = (retornosData || [])
        .filter((item: any) => item.planificacion_viaje)
        .map((item: any) => {
          const retorno = item.planificacion_viaje;
          const destinoRetorno: any = retorno.destino;
          const nombreDestinoRetorno = Array.isArray(destinoRetorno)
            ? destinoRetorno[0]?.nomdestino
            : destinoRetorno?.nomdestino;

          const cve = Array.isArray(retorno.conductor_vehiculo_empresa)
            ? retorno.conductor_vehiculo_empresa[0]
            : retorno.conductor_vehiculo_empresa;

          return {
            idviaje: retorno.idplanificacion,
            fechaPartida: retorno.fechapartida,
            fechaLlegada: retorno.fechallegada,
            horaPartida: retorno.horapartida,
            destino: nombreDestinoRetorno ?? 'Sin destino',
            asientosDisponibles: cve?.cantdisponibleasientos ?? 0,
          };
        });

      this.retornos.set(retornosFiltrados);
    } catch (err) {
      console.error('Error cargando retornos:', err);
      this.error.set('Error al cargar los retornos disponibles');
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
        isRetorno: true,
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
