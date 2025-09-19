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

  async getEmpresas() {
    const { data, error } = await this.supabase
      .from('empresa_contratista')
      .select('*');
    if (error) throw error;
    return data;
  }

  async getDestinos() {
    const { data, error } = await this.supabase.from('destino').select('*');
    if (error) throw error;
    return data;
  }

  // Nuevo método para obtener conductores
  async getConductores() {
    const { data, error } = await this.supabase
      .from('conductor')
      .select(`idconductor, usuario:usuario(idusuario, nomusuario, patusuario, matusuario, ci, numcelular)`);
    if (error) throw error;
    return data || [];
  }

  // Método mejorado para obtener un viaje específico
  async getViaje(idplanificacion: string) {
    console.log('Obteniendo viaje con ID:', idplanificacion);

    const { data, error } = await this.supabase
      .from('planificacion_viaje')
      .select(`
        idplanificacion,
        fechapartida,
        horapartida,
        horallegada,
        destino:destino(nomdestino),
        vehiculo:conductor_vehiculo_empresa(
          idconductorvehiculoempresa,
          idconductor,
          nroplaca,
          idempresa,
          vehiculo:vehiculo(nroplaca, nroasientos, tipovehiculo, imageUrl),
          empresa:empresa_contratista(idempresa, nomempresa, nomcontacto, celcontacto, imageUrl),
          conductor:conductor(idconductor, usuario:usuario(idusuario, nomusuario, patusuario, matusuario, ci, numcelular))
        )
      `)
      .eq('idplanificacion', idplanificacion)
      .single();

    if (error) {
      console.error('Error obteniendo viaje:', error);
      throw error;
    }

    console.log('Viaje obtenido:', data);
    return data;
  }

  async getViajes() {
    const { data, error } = await this.supabase.from('planificacion_viaje')
      .select(`
      idplanificacion,
      fechapartida,
      horallegada,
      horapartida,
      destino: destino(iddestino, nomdestino)
    `);
    if (error) throw error;
    return data;
  }

  async registrarViaje(step1: any, step2: any, vehiculo: any) {
    const now = new Date().toISOString();
    // Insert en conductor_vehiculo_empresa
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

    // Insert en planificacion_viaje
    const { data: viaje, error: errPlan } = await this.supabase
      .from('planificacion_viaje')
      .insert({
        fechapartida: step2.fechapartida,
        fechallegada: step2.fechallegada,
        fechaplanificacion: now,
        horapartida: step2.horapartida,
        horallegada: step2.horallegada,
        idconductorvehiculoempresa: cve.idconductorvehiculoempresa,
        iddestino: step2.iddestino,
      })
      .select(
        `
    idplanificacion,
    fechapartida,
    fechallegada,
    horapartida,
    horallegada,
    destino:destino(iddestino, nomdestino)
  `
      )
      .single();
    if (errPlan) throw errPlan;
    return viaje;
  }

  async actualizarAsociacion(idplanificacion: string | number, data: any) {
    const { idconductor, nroplaca, idempresa } = data;

    console.log('Actualizando asociación para:', { idplanificacion, data });

    // Primero buscamos el idconductorvehiculoempresa actual del viaje
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
      throw new Error('No se encontró la asociación conductor-vehículo-empresa');
    }

    console.log('Actualizando asociación ID:', viajeData.idconductorvehiculoempresa);

    // Actualizamos solo la asociación en conductor_vehiculo_empresa
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

    console.log('Asociación actualizada:', updated);
    return updated;
  }
}
