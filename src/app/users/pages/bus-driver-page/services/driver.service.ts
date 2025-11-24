import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../../shared/services/supabase.service';
import { NotificationService } from '../../../../shared/services/notification.service';

export interface ViajeAsignado {
  idplanificacion: string;
  idconductorvehiculoempresa: string;
  horapartida: string;
  fechallegada: string;
  horarealpartida: string | null;
  horarealllegada: string | null;
  fechaplanificacion: string;
  estadoCVE: string;
  destino: {
    nomdestino: string;
  };
  vehiculo: {
    placa: string;
    nroasientos: number;
  };
  asientosOcupados: number;
}

export interface PasajeroViaje {
  idusuario: string;
  nombre: string;
  ci: string;
  telefono: string;
  asiento: number;
  tipo: 'personal' | 'visitante';
  estadoAsistencia: 'reservado' | 'asistio' | 'inasistio';
}

@Injectable({ providedIn: 'root' })
export class DriverService {
  private supabase = inject(SupabaseService).supabase;
  private notificationService = inject(NotificationService);

  async getViajesAsignados(idusuario: string): Promise<ViajeAsignado[]> {
    const { data: conductorData, error: conductorError } = await this.supabase
      .from('conductor')
      .select('idconductor')
      .eq('idusuario', idusuario)
      .maybeSingle();

    if (conductorError || !conductorData) {
      throw new Error('No se encontró información del conductor');
    }

    const { data: cveData, error: cveError } = await this.supabase
      .from('conductor_vehiculo_empresa')
      .select(
        `
        idconductorvehiculoempresa,
        estado,
        vehiculo (
          nroplaca,
          nroasientos
        )
      `
      )
      .eq('idconductor', conductorData.idconductor)
      .in('estado', ['asignado', 'viaje']);

    if (cveError) {
      throw new Error('Error al obtener asignaciones del conductor');
    }

    if (!cveData || cveData.length === 0) {
      return [];
    }

    const idsCVE = cveData.map((cve) => cve.idconductorvehiculoempresa);
    const { data: viajesData, error: viajesError } = await this.supabase
      .from('planificacion_viaje')
      .select(
        `
        idplanificacion,
        idconductorvehiculoempresa,
        horapartida,
        fechallegada,
        horarealpartida,
        horarealllegada,
        fechaplanificacion,
        destino (
          nomdestino
        )
      `
      )
      .in('idconductorvehiculoempresa', idsCVE)
      .order('fechaplanificacion', { ascending: true });

    if (viajesError) {
      throw new Error('Error al obtener planificaciones de viajes');
    }

    const viajes: ViajeAsignado[] = [];

    for (const viaje of viajesData || []) {
      const cve = cveData.find(
        (c) => c.idconductorvehiculoempresa === viaje.idconductorvehiculoempresa
      );

      if (!cve) continue;

      const vehiculoArray = Array.isArray(cve.vehiculo)
        ? cve.vehiculo[0]
        : cve.vehiculo;
      const destinoArray = Array.isArray(viaje.destino)
        ? viaje.destino[0]
        : viaje.destino;

      const asientosOcupados = await this.contarAsientosOcupados(
        viaje.idplanificacion
      );

      viajes.push({
        idplanificacion: viaje.idplanificacion,
        idconductorvehiculoempresa: viaje.idconductorvehiculoempresa,
        horapartida: viaje.horapartida,
        fechallegada: viaje.fechallegada,
        horarealpartida: viaje.horarealpartida,
        horarealllegada: viaje.horarealllegada,
        fechaplanificacion: viaje.fechaplanificacion,
        estadoCVE: cve.estado,
        destino: {
          nomdestino: destinoArray?.nomdestino || 'Desconocido',
        },
        vehiculo: {
          placa: vehiculoArray?.nroplaca || '',
          nroasientos: vehiculoArray?.nroasientos || 0,
        },
        asientosOcupados,
      });
    }

    return viajes;
  }

  async getPasajerosViaje(idplanificacion: string): Promise<PasajeroViaje[]> {
    const [personal, visitantes] = await Promise.all([
      this.getPasajerosPersonal(idplanificacion),
      this.getPasajerosVisitantes(idplanificacion),
    ]);

    return [...personal, ...visitantes].sort((a, b) => a.asiento - b.asiento);
  }

  private async getPasajerosPersonal(
    idplanificacion: string
  ): Promise<PasajeroViaje[]> {
    const { data, error } = await this.supabase
      .from('asignaciondestino_planificacionviaje')
      .select(
        `
        nroasiento,
        estado,
        asignacion_destino(
          personal(
            usuario(
              idusuario,
              nomusuario,
              patusuario,
              matusuario,
              ci,
              numcelular
            )
          )
        )
      `
      )
      .eq('idplanificacion', idplanificacion)
      .in('estado', ['reservado', 'asistio', 'inasistio']);

    if (error) throw error;

    const pasajeros: PasajeroViaje[] = [];

    (data || []).forEach((p: any) => {
      const u = p.asignacion_destino?.personal?.usuario;
      if (u) {
        pasajeros.push({
          idusuario: u.idusuario,
          nombre: `${u.nomusuario} ${u.patusuario ?? ''} ${
            u.matusuario ?? ''
          }`.trim(),
          ci: u.ci,
          telefono: u.numcelular,
          asiento: p.nroasiento,
          tipo: 'personal',
          estadoAsistencia: p.estado as 'reservado' | 'asistio' | 'inasistio',
        });
      }
    });

    return pasajeros;
  }

  private async getPasajerosVisitantes(
    idplanificacion: string
  ): Promise<PasajeroViaje[]> {
    const { data, error } = await this.supabase
      .from('visitante_planificacionviaje')
      .select(
        `
        nroasiento,
        estado,
        visitante(
          usuario(
            idusuario,
            nomusuario,
            patusuario,
            matusuario,
            ci,
            numcelular
          )
        )
      `
      )
      .eq('idplanificacion', idplanificacion)
      .in('estado', ['reservado', 'asistio', 'inasistio']);

    if (error) throw error;

    const pasajeros: PasajeroViaje[] = [];

    (data || []).forEach((v: any) => {
      const u = v.visitante?.usuario;
      if (u) {
        pasajeros.push({
          idusuario: u.idusuario,
          nombre: `${u.nomusuario} ${u.patusuario ?? ''} ${
            u.matusuario ?? ''
          }`.trim(),
          ci: u.ci,
          telefono: u.numcelular,
          asiento: v.nroasiento,
          tipo: 'visitante',
          estadoAsistencia: v.estado as 'reservado' | 'asistio' | 'inasistio',
        });
      }
    });

    return pasajeros;
  }

  async marcarHoraPartida(
    idplanificacion: string,
    idconductorvehiculoempresa: string
  ): Promise<void> {
    const ahora = new Date();
    const horaActual = ahora.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const { error: errorViaje } = await this.supabase
      .from('planificacion_viaje')
      .update({ horarealpartida: horaActual })
      .eq('idplanificacion', idplanificacion);

    if (errorViaje) {
      throw new Error('Error al actualizar hora de partida');
    }

    const { error: errorCVE } = await this.supabase
      .from('conductor_vehiculo_empresa')
      .update({ estado: 'viaje' })
      .eq('idconductorvehiculoempresa', idconductorvehiculoempresa);

    if (errorCVE) {
      throw new Error('Error al actualizar estado del vehículo');
    }
  }

  async marcarHoraLlegada(
    idplanificacion: string,
    idconductorvehiculoempresa: string
  ): Promise<void> {
    const { data: viajeData } = await this.supabase
      .from('planificacion_viaje')
      .select('destino(nomdestino)')
      .eq('idplanificacion', idplanificacion)
      .single();

    const destinoArray = viajeData?.destino
      ? Array.isArray(viajeData.destino)
        ? viajeData.destino[0]
        : viajeData.destino
      : null;
    const nombreDestino = destinoArray?.nomdestino || 'su destino';

    const ahora = new Date();
    const horaActual = ahora.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const { error: errorViaje } = await this.supabase
      .from('planificacion_viaje')
      .update({ horarealllegada: horaActual })
      .eq('idplanificacion', idplanificacion);

    if (errorViaje) {
      throw new Error('Error al actualizar hora de llegada');
    }

    const { error: errorCVE } = await this.supabase
      .from('conductor_vehiculo_empresa')
      .update({ estado: 'concluido' })
      .eq('idconductorvehiculoempresa', idconductorvehiculoempresa);

    if (errorCVE) {
      throw new Error('Error al finalizar el viaje');
    }

  }

  async marcarAsistencia(
    idplanificacion: string,
    idusuario: string,
    tipo: 'personal' | 'visitante',
    asistio: boolean
  ): Promise<void> {
    const nuevoEstado = asistio ? 'asistio' : 'inasistio';

    if (tipo === 'personal') {
      const { data: personalData } = await this.supabase
        .from('personal')
        .select('nroficha')
        .eq('idusuario', idusuario)
        .maybeSingle();

      if (!personalData) {
        throw new Error('No se encontró información del personal');
      }

      const { data: asignacionData } = await this.supabase
        .from('asignacion_destino')
        .select('idasignaciondestino')
        .eq('nroficha', personalData.nroficha)
        .is('fechafin', null)
        .maybeSingle();

      if (!asignacionData) {
        throw new Error('No se encontró asignación activa');
      }

      const { error } = await this.supabase
        .from('asignaciondestino_planificacionviaje')
        .update({ estado: nuevoEstado })
        .eq('idasignaciondestino', asignacionData.idasignaciondestino)
        .eq('idplanificacion', idplanificacion);

      if (error) throw error;
    } else {
      const { data: visitanteData } = await this.supabase
        .from('visitante')
        .select('idvisitante')
        .eq('idusuario', idusuario)
        .maybeSingle();

      if (!visitanteData) {
        throw new Error('No se encontró información del visitante');
      }

      const { error } = await this.supabase
        .from('visitante_planificacionviaje')
        .update({ estado: nuevoEstado })
        .eq('idvisitante', visitanteData.idvisitante)
        .eq('idplanificacion', idplanificacion);

      if (error) throw error;
    }
  }

  async getViajeByPlanificacion(
    idplanificacion: string
  ): Promise<ViajeAsignado | null> {
    const { data: viajeData, error: viajeError } = await this.supabase
      .from('planificacion_viaje')
      .select(
        `
        idplanificacion,
        idconductorvehiculoempresa,
        horapartida,
        fechallegada,
        horarealpartida,
        horarealllegada,
        fechaplanificacion,
        destino (
          nomdestino
        ),
        conductor_vehiculo_empresa (
          estado,
          vehiculo (
            nroplaca,
            nroasientos
          )
        )
      `
      )
      .eq('idplanificacion', idplanificacion)
      .maybeSingle();

    if (viajeError || !viajeData) {
      return null;
    }

    const cveArray = Array.isArray(viajeData.conductor_vehiculo_empresa)
      ? viajeData.conductor_vehiculo_empresa[0]
      : viajeData.conductor_vehiculo_empresa;

    const vehiculoArray = cveArray?.vehiculo
      ? Array.isArray(cveArray.vehiculo)
        ? cveArray.vehiculo[0]
        : cveArray.vehiculo
      : null;

    const destinoArray = Array.isArray(viajeData.destino)
      ? viajeData.destino[0]
      : viajeData.destino;

    const asientosOcupados = await this.contarAsientosOcupados(idplanificacion);

    return {
      idplanificacion: viajeData.idplanificacion,
      idconductorvehiculoempresa: viajeData.idconductorvehiculoempresa,
      horapartida: viajeData.horapartida,
      fechallegada: viajeData.fechallegada,
      horarealpartida: viajeData.horarealpartida,
      horarealllegada: viajeData.horarealllegada,
      fechaplanificacion: viajeData.fechaplanificacion,
      estadoCVE: cveArray?.estado || '',
      destino: {
        nomdestino: destinoArray?.nomdestino || 'Desconocido',
      },
      vehiculo: {
        placa: vehiculoArray?.nroplaca || '',
        nroasientos: vehiculoArray?.nroasientos || 0,
      },
      asientosOcupados,
    };
  }

  private async contarAsientosOcupados(
    idplanificacion: string
  ): Promise<number> {
    const { count: personalCount } = await this.supabase
      .from('asignaciondestino_planificacionviaje')
      .select('*', { count: 'exact', head: true })
      .eq('idplanificacion', idplanificacion)
      .eq('estado', 'reservado');

    const { count: visitanteCount } = await this.supabase
      .from('visitante_planificacionviaje')
      .select('*', { count: 'exact', head: true })
      .eq('idplanificacion', idplanificacion)
      .eq('estado', 'reservado');

    return (personalCount || 0) + (visitanteCount || 0);
  }

  async verificarTodosPasajerosAsistencia(idplanificacion: string): Promise<{
    todosVerificados: boolean;
    totalPasajeros: number;
    pasajerosVerificados: number;
    pendientes: number;
  }> {
    try {
      const pasajeros = await this.getPasajerosViaje(idplanificacion);

      if (pasajeros.length === 0) {
        return {
          todosVerificados: true,
          totalPasajeros: 0,
          pasajerosVerificados: 0,
          pendientes: 0,
        };
      }

      const pasajerosVerificados = pasajeros.filter(
        (p) =>
          p.estadoAsistencia === 'asistio' || p.estadoAsistencia === 'inasistio'
      ).length;

      const pendientes = pasajeros.filter(
        (p) => p.estadoAsistencia === 'reservado'
      ).length;

      return {
        todosVerificados: pendientes === 0,
        totalPasajeros: pasajeros.length,
        pasajerosVerificados,
        pendientes,
      };
    } catch (error) {
      console.error('Error verificando asistencia de pasajeros:', error);
      throw error;
    }
  }
}
