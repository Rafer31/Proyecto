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
}
