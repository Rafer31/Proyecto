import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface TripRating {
  idcalificacion: string;
  idplanificacion: string;
  idusuario: string;
  calificacion: number;
  comentario?: string;
  fechacalificacion: string;
}

export interface RatingSummary {
  idplanificacion: string;
  fechapartida: string;
  horapartida: string;
  nomdestino: string;
  total_calificaciones: number;
  promedio_calificacion: number;
  calificacion_maxima: number;
  calificacion_minima: number;
  calificaciones_5_estrellas: number;
  calificaciones_4_estrellas: number;
  calificaciones_3_estrellas: number;
  calificaciones_2_estrellas: number;
  calificaciones_1_estrella: number;
}

export interface PendingRatingUser {
  idusuario: string;
  nombre_completo: string;
  tipo_usuario: 'personal' | 'visitante';
}

@Injectable({ providedIn: 'root' })
export class TripRatingService {
  private supabase = inject(SupabaseService).supabase;


  async isTripCompleted(idplanificacion: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('viaje_completado', {
      p_idplanificacion: idplanificacion,
    });

    if (error) {
      console.error('Error verificando si viaje está completado:', error);
      return false;
    }

    return data || false;
  }


  async getPendingRatingUsers(
    idplanificacion: string
  ): Promise<PendingRatingUser[]> {
    const { data, error } = await this.supabase.rpc(
      'usuarios_pendientes_calificacion',
      {
        p_idplanificacion: idplanificacion,
      }
    );

    if (error) {
      console.error('Error obteniendo usuarios pendientes:', error);
      throw error;
    }

    return data || [];
  }

  async canUserRateTrip(
    idplanificacion: string,
    idusuario: string
  ): Promise<boolean> {
    const isCompleted = await this.isTripCompleted(idplanificacion);
    if (!isCompleted) return false;

    const { data: existingRating } = await this.supabase
      .from('calificacion_viaje')
      .select('idcalificacion')
      .eq('idplanificacion', idplanificacion)
      .eq('idusuario', idusuario)
      .maybeSingle();

    if (existingRating) return false;

    const didAttend = await this.didUserAttend(idplanificacion, idusuario);
    return didAttend;
  }


  private async didUserAttend(
    idplanificacion: string,
    idusuario: string
  ): Promise<boolean> {
    const { data: personalData } = await this.supabase
      .from('personal')
      .select('nroficha')
      .eq('idusuario', idusuario)
      .maybeSingle();

    if (personalData) {
      const { data: asignacionData } = await this.supabase
        .from('asignacion_destino')
        .select('idasignaciondestino')
        .eq('nroficha', personalData.nroficha)
        .is('fechafin', null)
        .maybeSingle();

      if (asignacionData) {
        const { data: reservaData } = await this.supabase
          .from('asignaciondestino_planificacionviaje')
          .select('estado')
          .eq('idasignaciondestino', asignacionData.idasignaciondestino)
          .eq('idplanificacion', idplanificacion)
          .maybeSingle();

        if (reservaData && reservaData.estado === 'asistio') {
          return true;
        }
      }
    }

    const { data: visitanteData } = await this.supabase
      .from('visitante')
      .select('idvisitante')
      .eq('idusuario', idusuario)
      .maybeSingle();

    if (visitanteData) {
      const { data: reservaData } = await this.supabase
        .from('visitante_planificacionviaje')
        .select('estado')
        .eq('idvisitante', visitanteData.idvisitante)
        .eq('idplanificacion', idplanificacion)
        .maybeSingle();

      if (reservaData && reservaData.estado === 'asistio') {
        return true;
      }
    }

    return false;
  }


  async rateTrip(
    idplanificacion: string,
    idusuario: string,
    calificacion: number,
    comentario?: string
  ): Promise<TripRating> {
    if (calificacion < 1 || calificacion > 5) {
      throw new Error('La calificación debe estar entre 1 y 5');
    }

    const canRate = await this.canUserRateTrip(idplanificacion, idusuario);
    if (!canRate) {
      throw new Error(
        'No puede calificar este viaje. Debe haber asistido y no haberlo calificado previamente.'
      );
    }

    const { data, error } = await this.supabase
      .from('calificacion_viaje')
      .insert({
        idplanificacion,
        idusuario,
        calificacion,
        comentario,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creando calificación:', error);
      if (error.code === '23505') {
        throw new Error('Ya has calificado este viaje');
      }
      throw error;
    }

    return data;
  }


  async getUserRating(
    idplanificacion: string,
    idusuario: string
  ): Promise<TripRating | null> {
    const { data, error } = await this.supabase
      .from('calificacion_viaje')
      .select('*')
      .eq('idplanificacion', idplanificacion)
      .eq('idusuario', idusuario)
      .maybeSingle();

    if (error) {
      console.error('Error obteniendo calificación:', error);
      throw error;
    }

    return data;
  }


  async getTripRatings(idplanificacion: string): Promise<TripRating[]> {
    const { data, error } = await this.supabase
      .from('calificacion_viaje')
      .select('*')
      .eq('idplanificacion', idplanificacion)
      .order('fechacalificacion', { ascending: false });

    if (error) {
      console.error('Error obteniendo calificaciones:', error);
      throw error;
    }

    return data || [];
  }


  async getTripRatingSummary(
    idplanificacion: string
  ): Promise<RatingSummary | null> {
    const { data, error } = await this.supabase
      .from('resumen_calificaciones_viaje')
      .select('*')
      .eq('idplanificacion', idplanificacion)
      .maybeSingle();

    if (error) {
      console.error('Error obteniendo resumen de calificaciones:', error);
      throw error;
    }

    return data;
  }


  async getTopRatedTrips(): Promise<RatingSummary[]> {
    const { data, error } = await this.supabase
      .from('top_viajes_calificados')
      .select('*');

    if (error) {
      console.error('Error obteniendo top viajes:', error);
      throw error;
    }

    return data || [];
  }


  async updateRating(
    idcalificacion: string,
    calificacion: number,
    comentario?: string
  ): Promise<TripRating> {
    if (calificacion < 1 || calificacion > 5) {
      throw new Error('La calificación debe estar entre 1 y 5');
    }

    const { data, error } = await this.supabase
      .from('calificacion_viaje')
      .update({
        calificacion,
        comentario,
      })
      .eq('idcalificacion', idcalificacion)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando calificación:', error);
      throw error;
    }

    return data;
  }


  async deleteRating(idcalificacion: string): Promise<void> {
    const { error } = await this.supabase
      .from('calificacion_viaje')
      .delete()
      .eq('idcalificacion', idcalificacion);

    if (error) {
      console.error('Error eliminando calificación:', error);
      throw error;
    }
  }
}
