import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../../shared/services/supabase.service';

export interface RetornoViaje {
  idretorno: string;
  idplanificacion_ida: string;
  idplanificacion_retorno: string;
  estado: string;
  observaciones?: string;
}

export interface ViajeConRetorno {
  viaje: any;
  retorno?: any;
  tieneRetorno: boolean;
}

@Injectable({ providedIn: 'root' })
export class RetornoService {
  private supabase = inject(SupabaseService).supabase;

  async crearRetornoViaje(
    idplanificacionIda: string,
    idplanificacionRetorno: string,
    observaciones?: string
  ): Promise<RetornoViaje> {
    const { data, error } = await this.supabase
      .from('retorno_viaje')
      .insert({
        idplanificacion_ida: idplanificacionIda,
        idplanificacion_retorno: idplanificacionRetorno,
        estado: 'activo',
        observaciones,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Obtiene el retorno asociado a un viaje de ida
   */
  async getRetornoPorIda(idplanificacionIda: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('retorno_viaje')
      .select(
        `
        idretorno,
        estado,
        observaciones,
        retorno:planificacion_viaje!idplanificacion_retorno(
          idplanificacion,
          fechapartida,
          fechallegada,
          horapartida,
          destino:destino(iddestino, nomdestino),
          conductor_vehiculo_empresa!inner(
            idconductorvehiculoempresa,
            cantdisponibleasientos
          )
        )
      `
      )
      .eq('idplanificacion_ida', idplanificacionIda)
      .eq('estado', 'activo')
      .maybeSingle();

    if (error) {
      console.error('Error obteniendo retorno:', error);
      return null;
    }

    return data?.retorno || null;
  }

  /**
   * Obtiene la ida asociada a un viaje de retorno
   */
  async getIdaPorRetorno(idplanificacionRetorno: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('retorno_viaje')
      .select(
        `
        idretorno,
        estado,
        observaciones,
        ida:planificacion_viaje!idplanificacion_ida(
          idplanificacion,
          fechapartida,
          fechallegada,
          horapartida,
          destino:destino(iddestino, nomdestino),
          conductor_vehiculo_empresa!inner(
            idconductorvehiculoempresa,
            cantdisponibleasientos
          )
        )
      `
      )
      .eq('idplanificacion_retorno', idplanificacionRetorno)
      .eq('estado', 'activo')
      .maybeSingle();

    if (error) {
      console.error('Error obteniendo ida:', error);
      return null;
    }

    return data?.ida || null;
  }

  /**
   * Verifica si un viaje tiene retorno asociado
   */
  async tieneRetorno(idplanificacionIda: string): Promise<{
    existe: boolean;
    idplanificacionRetorno?: string;
  }> {
    const { data, error } = await this.supabase
      .from('retorno_viaje')
      .select('idplanificacion_retorno')
      .eq('idplanificacion_ida', idplanificacionIda)
      .eq('estado', 'activo')
      .maybeSingle();

    if (error) {
      console.error('Error verificando retorno:', error);
      return { existe: false };
    }

    return {
      existe: !!data,
      idplanificacionRetorno: data?.idplanificacion_retorno,
    };
  }

  /**
   * Cancela la relación de retorno (cambia estado a 'cancelado')
   */
  async cancelarRetorno(idplanificacionIda: string): Promise<void> {
    const { error } = await this.supabase
      .from('retorno_viaje')
      .update({ estado: 'cancelado' })
      .eq('idplanificacion_ida', idplanificacionIda)
      .eq('estado', 'activo');

    if (error) throw error;
  }

  /**
   * Elimina completamente la relación de retorno
   */
  async eliminarRetorno(idplanificacionIda: string): Promise<void> {
    const { error } = await this.supabase
      .from('retorno_viaje')
      .delete()
      .eq('idplanificacion_ida', idplanificacionIda);

    if (error) throw error;
  }

  /**
   * Obtiene todos los viajes de ida con sus retornos asociados
   */
  async getViajesConRetorno(): Promise<ViajeConRetorno[]> {
    // Obtener todos los viajes
    const { data: viajes, error: errorViajes } = await this.supabase
      .from('planificacion_viaje')
      .select(
        `
        idplanificacion,
        fechapartida,
        fechallegada,
        horapartida,
        destino:destino(iddestino, nomdestino),
        conductor_vehiculo_empresa!inner(
          idconductorvehiculoempresa,
          cantdisponibleasientos
        )
      `
      )
      .order('fechapartida', { ascending: true });

    if (errorViajes) throw errorViajes;

    // Obtener todas las relaciones de retorno
    const { data: retornos, error: errorRetornos } = await this.supabase
      .from('retorno_viaje')
      .select('idplanificacion_ida, idplanificacion_retorno')
      .eq('estado', 'activo');

    if (errorRetornos) throw errorRetornos;

    // Crear un mapa de retornos
    const retornoMap = new Map(
      (retornos || []).map((r: any) => [r.idplanificacion_ida, r.idplanificacion_retorno])
    );

    // Crear un set de IDs que son retornos (no deben aparecer como viajes principales)
    const idsRetornos = new Set((retornos || []).map((r: any) => r.idplanificacion_retorno));

    // Filtrar y mapear los viajes
    const viajesConRetorno: ViajeConRetorno[] = [];

    for (const viaje of viajes || []) {
      // Si este viaje es un retorno de otro, no lo incluimos como viaje principal
      if (idsRetornos.has(viaje.idplanificacion)) {
        continue;
      }

      const idRetorno = retornoMap.get(viaje.idplanificacion);
      let retorno = null;

      if (idRetorno) {
        retorno = viajes.find((v: any) => v.idplanificacion === idRetorno);
      }

      viajesConRetorno.push({
        viaje,
        retorno,
        tieneRetorno: !!retorno,
      });
    }

    return viajesConRetorno;
  }

  /**
   * Obtiene viajes disponibles por destino incluyendo información de retorno
   */
  async getViajesDisponiblesPorDestinoConRetorno(
    iddestino: string
  ): Promise<ViajeConRetorno[]> {
    const { data: viajes, error } = await this.supabase
      .from('planificacion_viaje')
      .select(
        `
        idplanificacion,
        fechapartida,
        fechallegada,
        horapartida,
        destino:destino(iddestino, nomdestino),
        conductor_vehiculo_empresa!inner(
          idconductorvehiculoempresa,
          cantdisponibleasientos
        )
      `
      )
      .eq('iddestino', iddestino)
      .gte('fechapartida', new Date().toISOString().split('T')[0])
      .order('fechapartida', { ascending: true });

    if (error) throw error;

    // Obtener retornos para estos viajes
    const idsViajes = (viajes || []).map((v: any) => v.idplanificacion);

    const { data: retornos } = await this.supabase
      .from('retorno_viaje')
      .select(
        `
        idplanificacion_ida,
        retorno:planificacion_viaje!idplanificacion_retorno(
          idplanificacion,
          fechapartida,
          fechallegada,
          horapartida,
          destino:destino(iddestino, nomdestino),
          conductor_vehiculo_empresa!inner(
            idconductorvehiculoempresa,
            cantdisponibleasientos
          )
        )
      `
      )
      .in('idplanificacion_ida', idsViajes)
      .eq('estado', 'activo');

    const retornoMap = new Map(
      (retornos || []).map((r: any) => [r.idplanificacion_ida, r.retorno])
    );

    return (viajes || []).map((viaje: any) => ({
      viaje,
      retorno: retornoMap.get(viaje.idplanificacion) || null,
      tieneRetorno: retornoMap.has(viaje.idplanificacion),
    }));
  }

  /**
   * Actualiza la observación de un retorno
   */
  async actualizarObservacion(
    idplanificacionIda: string,
    observaciones: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('retorno_viaje')
      .update({ observaciones })
      .eq('idplanificacion_ida', idplanificacionIda)
      .eq('estado', 'activo');

    if (error) throw error;
  }
}
