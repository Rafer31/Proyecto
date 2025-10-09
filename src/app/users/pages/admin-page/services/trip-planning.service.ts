import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../../shared/services/supabase.service';
import { RetornoService } from './retorno.service';

@Injectable({ providedIn: 'root' })
export class TripPlanningService {
  private supabase = inject(SupabaseService).supabase;
  private retornoService = inject(RetornoService);

  // ========== CONSULTAS DE VEHÍCULOS ==========

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

  // ========== CONSULTAS DE EMPRESAS Y CONDUCTORES ==========

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

  // ========== CONSULTAS DE VIAJES ==========

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
      .order('fechapartida', { ascending: true });

    if (error) throw error;
    return data;
  }

  /**
   * Obtiene viajes disponibles por destino con información de retorno
   */
  async getViajesDisponiblesPorDestino(iddestino: string) {
    return await this.retornoService.getViajesDisponiblesPorDestinoConRetorno(
      iddestino
    );
  }

  // ========== CREACIÓN DE VIAJES ==========

  /**
   * Registra un viaje simple (sin retorno)
   */
  async registrarViaje(step1: any, step2: any, vehiculo: any) {
    const now = new Date().toISOString();

    // Crear asociación conductor-vehículo-empresa
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

    // Crear planificación de viaje
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

  /**
   * Registra un viaje con su retorno
   */
  async registrarViajeConRetorno(
    step1Ida: any,
    step2Ida: any,
    vehiculoIda: any,
    step1Retorno: any,
    step2Retorno: any,
    vehiculoRetorno: any,
    observaciones?: string
  ) {
    // Registrar viaje de ida
    const viajeIda = await this.registrarViaje(step1Ida, step2Ida, vehiculoIda);

    // Registrar viaje de retorno
    const viajeRetorno = await this.registrarViaje(
      step1Retorno,
      step2Retorno,
      vehiculoRetorno
    );

    // Crear la relación de retorno
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

  /**
   * Crea una relación de retorno entre dos viajes existentes
   */
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

  // ========== ACTUALIZACIÓN DE VIAJES ==========

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

  // ========== ELIMINACIÓN DE VIAJES ==========

  /**
   * Elimina un viaje simple (sin retorno)
   */
  async eliminarViaje(idplanificacion: string) {
    // Verificar si tiene retorno asociado
    const { existe } = await this.retornoService.tieneRetorno(idplanificacion);

    if (existe) {
      throw new Error(
        'Este viaje tiene un retorno asociado. Use eliminarViajeConRetorno() en su lugar.'
      );
    }

    // Obtener el CVE antes de eliminar
    const { data: viajeData } = await this.supabase
      .from('planificacion_viaje')
      .select('idconductorvehiculoempresa')
      .eq('idplanificacion', idplanificacion)
      .single();

    // Eliminar el viaje
    const { error } = await this.supabase
      .from('planificacion_viaje')
      .delete()
      .eq('idplanificacion', idplanificacion);

    if (error) {
      console.error('Error eliminando viaje:', error);
      throw error;
    }

    // Eliminar la asociación CVE
    if (viajeData?.idconductorvehiculoempresa) {
      await this.supabase
        .from('conductor_vehiculo_empresa')
        .delete()
        .eq('idconductorvehiculoempresa', viajeData.idconductorvehiculoempresa);
    }

    return true;
  }

  /**
   * Elimina un viaje con su retorno asociado
   */
  async eliminarViajeConRetorno(idplanificacionIda: string) {
    // Obtener el retorno asociado
    const { existe, idplanificacionRetorno } =
      await this.retornoService.tieneRetorno(idplanificacionIda);

    // Obtener los CVEs de ambos viajes
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

    // Eliminar la relación de retorno (esto eliminará ambos viajes por CASCADE)
    if (existe) {
      await this.retornoService.eliminarRetorno(idplanificacionIda);
    }

    // Eliminar el viaje de ida
    const { error: errorIda } = await this.supabase
      .from('planificacion_viaje')
      .delete()
      .eq('idplanificacion', idplanificacionIda);

    if (errorIda) throw errorIda;

    // Eliminar el viaje de retorno si existe
    if (existe && idplanificacionRetorno) {
      const { error: errorRetorno } = await this.supabase
        .from('planificacion_viaje')
        .delete()
        .eq('idplanificacion', idplanificacionRetorno);

      if (errorRetorno) throw errorRetorno;
    }

    // Eliminar las asociaciones CVE
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

  /**
   * Obtiene todos los viajes con sus retornos asociados (para listados)
   */
  async getViajesConRetorno() {
    return await this.retornoService.getViajesConRetorno();
  }
}
