import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../../shared/services/supabase.service';

@Injectable({ providedIn: 'root' })
export class TripPlanningService {
  private supabase = inject(SupabaseService).supabase;

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

  async getViaje(idplanificacion: string) {
    const { data, error } = await this.supabase
      .from('planificacion_viaje')
      .select(
        `
        idplanificacion,
        fechapartida,
        horapartida,
        fechallegada,
        tipo,
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
    const { data, error } = await this.supabase.from('planificacion_viaje')
      .select(`
      idplanificacion,
      fechapartida,
      horapartida,
      tipo,
      destino: destino(iddestino, nomdestino),
      conductor_vehiculo_empresa!inner(
        idconductorvehiculoempresa,
        cantdisponibleasientos
      )
    `)
      .eq('tipo', 'salida'); // Solo viajes de salida

    if (error) throw error;
    return data;
  }

  async getRetornos() {
    const { data, error } = await this.supabase.from('planificacion_viaje')
      .select(`
      idplanificacion,
      fechapartida,
      horapartida,
      tipo,
      destino: destino(iddestino, nomdestino),
      conductor_vehiculo_empresa!inner(
        idconductorvehiculoempresa,
        cantdisponibleasientos
      )
    `)
      .eq('tipo', 'retorno'); // Solo retornos

    if (error) throw error;
    return data;
  }

  async getViajesDisponiblesPorDestino(iddestino: string) {
    const { data, error } = await this.supabase
      .from('planificacion_viaje')
      .select(`
        idplanificacion,
        fechapartida,
        fechallegada,
        horapartida,
        tipo,
        destino: destino(iddestino, nomdestino),
        conductor_vehiculo_empresa!inner(
          idconductorvehiculoempresa,
          cantdisponibleasientos
        )
      `)
      .eq('iddestino', iddestino)
      .eq('tipo', 'salida')
      .gte('fechapartida', new Date().toISOString().split('T')[0])
      .order('fechapartida', { ascending: true });

    if (error) throw error;
    return data;
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
        tipo: step2.tipo || 'salida', // Asegurar que siempre tenga tipo
        idconductorvehiculoempresa: cve.idconductorvehiculoempresa,
        iddestino: step2.iddestino,
      })
      .select(
        `
    idplanificacion,
    fechapartida,
    fechallegada,
    horapartida,
    tipo,
    destino:destino(iddestino, nomdestino)
  `
      )
      .single();
    if (errPlan) throw errPlan;
    return viaje;
  }

  async actualizarAsociacion(idplanificacion: string | number, data: any) {
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
    const { error } = await this.supabase
      .from('planificacion_viaje')
      .delete()
      .eq('idplanificacion', idplanificacion);

    if (error) {
      console.error('Error eliminando viaje:', error);
      throw error;
    }

    return true;
  }

  async actualizarPlanificacion(idplanificacion: string, data: any) {
    const { fechapartida, fechallegada, horapartida, iddestino, tipo } = data;

    const { data: updated, error } = await this.supabase
      .from('planificacion_viaje')
      .update({
        fechapartida,
        fechallegada,
        horapartida,
        tipo,
        iddestino,
      })
      .eq('idplanificacion', idplanificacion)
      .select(
        `idplanificacion, fechapartida, fechallegada, horapartida, tipo,
         destino:destino(iddestino, nomdestino)`
      )
      .single();

    if (error) {
      console.error('Error actualizando planificación:', error);
      throw error;
    }

    return updated;
  }
}
