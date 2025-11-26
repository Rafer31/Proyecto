import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../../shared/services/supabase.service';
import { RetornoService } from './retorno.service';
import { NotificationService } from '../../../../shared/services/notification.service';

@Injectable({ providedIn: 'root' })
export class TripPlanningService {
  private supabase = inject(SupabaseService).supabase;
  private retornoService = inject(RetornoService);
  private notificationService = inject(NotificationService);

  async getVehiculos() {
    const { data, error } = await this.supabase.from('vehiculo').select('*');
    if (error) throw error;
    return data;
  }

  async getVehiculosDisponibles() {
    const { data: vehiculos, error: errorVehiculos } = await this.supabase
      .from('vehiculo')
      .select('*');

    if (errorVehiculos) throw errorVehiculos;

    const { data: vehiculosOcupados, error: errorOcupados } =
      await this.supabase
        .from('conductor_vehiculo_empresa')
        .select(
          `
        nroplaca,
        planificacion_viaje!inner (
          idplanificacion
        )
      `
        )
        .eq('estado', 'asignado');

    if (errorOcupados) throw errorOcupados;

    const placasOcupadas = new Set(
      (vehiculosOcupados || []).map((cve: any) => cve.nroplaca)
    );

    return (vehiculos || []).filter(
      (v: any) => !placasOcupadas.has(v.nroplaca)
    );
  }

  async getEmpresas() {
    const { data, error } = await this.supabase
      .from('empresa_contratista')
      .select('*');
    if (error) throw error;
    return data;
  }

  async getConductores() {
    const { data, error } = await this.supabase
      .from('conductor')
      .select(
        `idconductor, usuario:usuario(idusuario, nomusuario, patusuario, matusuario, ci, numcelular)`
      );
    if (error) throw error;
    return data || [];
  }

  async getDestinos() {
    const { data, error } = await this.supabase.from('destino').select('*');
    if (error) throw error;
    return data || [];
  }

  async getViaje(idplanificacion: string) {
    const { data, error } = await this.supabase
      .from('planificacion_viaje')
      .select(
        `
        idplanificacion,
        fechapartida,
        horapartida,
        fechallegada,
        destino:destino(iddestino, nomdestino),
        vehiculo:conductor_vehiculo_empresa(
          idconductorvehiculoempresa,
          idconductor,
          nroplaca,
          idempresa,
          cantdisponibleasientos,
          vehiculo:vehiculo(nroplaca, nroasientos, tipovehiculo, imageUrl),
          empresa:empresa_contratista(idempresa, nomempresa, nomcontacto, celcontacto, imageUrl),
          conductor:conductor(idconductor, usuario:usuario(idusuario, nomusuario, patusuario, matusuario, ci, numcelular))
        )
      `
      )
      .eq('idplanificacion', idplanificacion)
      .single();

    if (error) {
      console.error('Error obteniendo viaje:', error);
      throw error;
    }

    return data;
  }

  async getViajes() {
    const { data, error } = await this.supabase
      .from('planificacion_viaje')
      .select(
        `
        idplanificacion,
        fechapartida,
        horapartida,
        destino: destino(iddestino, nomdestino),
        conductor_vehiculo_empresa!inner(
          idconductorvehiculoempresa,
          cantdisponibleasientos
        )
      `
      )
      .is('horarealllegada', null)
      .order('fechapartida', { ascending: true });

    if (error) throw error;
    return data;
  }

  async getViajesDisponiblesPorDestino(iddestino: string) {
    return await this.retornoService.getViajesDisponiblesPorDestinoConRetorno(
      iddestino
    );
  }

  async registrarViaje(step1: any, step2: any, vehiculo: any) {
    const now = new Date().toISOString();

    const { data: cve, error: errCve } = await this.supabase
      .from('conductor_vehiculo_empresa')
      .insert({
        idconductor: step1.idconductor,
        nroplaca: step1.nroplaca,
        idempresa: step1.idempresa,
        fechainicio: now,
        fechafin: null,
        cantdisponibleasientos: vehiculo?.nroasientos ?? 0,
        estado: 'asignado',
      })
      .select()
      .single();

    if (errCve) throw errCve;

    const { data: viaje, error: errPlan } = await this.supabase
      .from('planificacion_viaje')
      .insert({
        fechapartida: step2.fechapartida,
        fechallegada: step2.fechallegada,
        fechaplanificacion: now,
        horapartida: step2.horapartida,
        idconductorvehiculoempresa: cve.idconductorvehiculoempresa,
        iddestino: step2.iddestino,
      })
      .select(
        `
        idplanificacion,
        fechapartida,
        fechallegada,
        horapartida,
        destino:destino(iddestino, nomdestino)
      `
      )
      .single();

    if (errPlan) throw errPlan;


    return viaje;
  }

  async registrarViajeConRetorno(
    step1Ida: any,
    step2Ida: any,
    vehiculoIda: any,
    step1Retorno: any,
    step2Retorno: any,
    vehiculoRetorno: any,
    observaciones?: string
  ) {
    const viajeIda = await this.registrarViaje(step1Ida, step2Ida, vehiculoIda);

    const viajeRetorno = await this.registrarViaje(
      step1Retorno,
      step2Retorno,
      vehiculoRetorno
    );

    await this.retornoService.crearRetornoViaje(
      viajeIda.idplanificacion,
      viajeRetorno.idplanificacion,
      observaciones
    );

    return {
      viajeIda,
      viajeRetorno,
    };
  }

  async crearRelacionRetorno(
    idplanificacionIda: string,
    idplanificacionRetorno: string,
    observaciones?: string
  ) {
    return await this.retornoService.crearRetornoViaje(
      idplanificacionIda,
      idplanificacionRetorno,
      observaciones
    );
  }

  async actualizarPlanificacion(idplanificacion: string, data: any) {
    const { fechapartida, fechallegada, horapartida, iddestino } = data;

    const { data: updated, error } = await this.supabase
      .from('planificacion_viaje')
      .update({
        fechapartida,
        fechallegada,
        horapartida,
        iddestino,
      })
      .eq('idplanificacion', idplanificacion)
      .select(
        `idplanificacion, fechapartida, fechallegada, horapartida,
         destino:destino(iddestino, nomdestino)`
      )
      .single();

    if (error) {
      console.error('Error actualizando planificación:', error);
      throw error;
    }

    return updated;
  }

  async actualizarAsociacion(idplanificacion: string, data: any) {
    const { idconductor, nroplaca, idempresa } = data;

    const { data: viajeData, error: errorViaje } = await this.supabase
      .from('planificacion_viaje')
      .select('idconductorvehiculoempresa')
      .eq('idplanificacion', idplanificacion)
      .single();

    if (errorViaje) {
      console.error('Error buscando viaje:', errorViaje);
      throw errorViaje;
    }

    if (!viajeData?.idconductorvehiculoempresa) {
      throw new Error(
        'No se encontró la asociación conductor-vehículo-empresa'
      );
    }

    const { data: updated, error } = await this.supabase
      .from('conductor_vehiculo_empresa')
      .update({ idconductor, nroplaca, idempresa })
      .eq('idconductorvehiculoempresa', viajeData.idconductorvehiculoempresa)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando asociación:', error);
      throw error;
    }

    return updated;
  }

  async eliminarViaje(idplanificacion: string) {
    const { existe } = await this.retornoService.tieneRetorno(idplanificacion);

    if (existe) {
      throw new Error(
        'Este viaje tiene un retorno asociado. Use eliminarViajeConRetorno() en su lugar.'
      );
    }

    const { data: viajeData } = await this.supabase
      .from('planificacion_viaje')
      .select('idconductorvehiculoempresa')
      .eq('idplanificacion', idplanificacion)
      .single();

    const { error } = await this.supabase
      .from('planificacion_viaje')
      .delete()
      .eq('idplanificacion', idplanificacion);

    if (error) {
      console.error('Error eliminando viaje:', error);
      throw error;
    }

    if (viajeData?.idconductorvehiculoempresa) {
      await this.supabase
        .from('conductor_vehiculo_empresa')
        .delete()
        .eq('idconductorvehiculoempresa', viajeData.idconductorvehiculoempresa);
    }

    return true;
  }

  async eliminarViajeConRetorno(idplanificacionIda: string) {
    const { existe, idplanificacionRetorno } =
      await this.retornoService.tieneRetorno(idplanificacionIda);

    const viajes = [];

    const { data: viajeIda } = await this.supabase
      .from('planificacion_viaje')
      .select('idconductorvehiculoempresa')
      .eq('idplanificacion', idplanificacionIda)
      .single();

    if (viajeIda) viajes.push(viajeIda);

    if (existe && idplanificacionRetorno) {
      const { data: viajeRetorno } = await this.supabase
        .from('planificacion_viaje')
        .select('idconductorvehiculoempresa')
        .eq('idplanificacion', idplanificacionRetorno)
        .single();

      if (viajeRetorno) viajes.push(viajeRetorno);
    }

    if (existe) {
      await this.retornoService.eliminarRetorno(idplanificacionIda);
    }

    const { error: errorIda } = await this.supabase
      .from('planificacion_viaje')
      .delete()
      .eq('idplanificacion', idplanificacionIda);

    if (errorIda) throw errorIda;

    if (existe && idplanificacionRetorno) {
      const { error: errorRetorno } = await this.supabase
        .from('planificacion_viaje')
        .delete()
        .eq('idplanificacion', idplanificacionRetorno);

      if (errorRetorno) throw errorRetorno;
    }

    const cveIds = viajes
      .map((v) => v.idconductorvehiculoempresa)
      .filter((id) => id != null);

    if (cveIds.length > 0) {
      await this.supabase
        .from('conductor_vehiculo_empresa')
        .delete()
        .in('idconductorvehiculoempresa', cveIds);
    }

    return {
      viajeIda: idplanificacionIda,
      viajeRetorno: idplanificacionRetorno || null,
    };
  }

  async getViajesConRetorno() {
    return await this.retornoService.getViajesConRetorno();
  }

  async getCompletedTrips(fechaDesde?: string, fechaHasta?: string) {
    let query = this.supabase
      .from('planificacion_viaje')
      .select(
        `
        idplanificacion,
        fechapartida,
        fechallegada,
        horapartida,
        horarealpartida,
        horarealllegada,
        destino:destino(iddestino, nomdestino),
        conductor_vehiculo_empresa!inner(
          idconductorvehiculoempresa,
          cantdisponibleasientos,
          vehiculo:vehiculo(nroplaca, tipovehiculo, nroasientos),
          empresa:empresa_contratista(nomempresa),
          conductor:conductor(
            idconductor,
            usuario:usuario(nomusuario, patusuario, matusuario, ci, numcelular)
          )
        )
      `
      )
      .not('horarealllegada', 'is', null)
      .order('fechapartida', { ascending: false });

    if (fechaDesde) {
      query = query.gte('fechapartida', fechaDesde);
    }

    if (fechaHasta) {
      query = query.lte('fechapartida', fechaHasta);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error obteniendo viajes completados:', error);
      throw error;
    }

    // Obtener conteo de pasajeros para cada viaje
    const viajesConConteo = await Promise.all(
      (data || []).map(async (viaje: any) => {
        const { count: countPersonal } = await this.supabase
          .from('asignaciondestino_planificacionviaje')
          .select('*', { count: 'exact', head: true })
          .eq('idplanificacion', viaje.idplanificacion);

        const { count: countVisitantes } = await this.supabase
          .from('visitante_planificacionviaje')
          .select('*', { count: 'exact', head: true })
          .eq('idplanificacion', viaje.idplanificacion);

        return {
          ...viaje,
          totalPasajeros: (countPersonal || 0) + (countVisitantes || 0),
        };
      })
    );

    return viajesConConteo;
  }
}
