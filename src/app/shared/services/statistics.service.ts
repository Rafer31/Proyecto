import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface DestinationStats {
  iddestino: string;
  nomdestino: string;

  total_viajes: number;
  viajes_completados: number;
  viajes_pendientes: number;
  promedio_pasajeros_por_viaje: number;
  promedio_calificacion: number;
}

export interface UserAbsenceStats {
  idusuario: string;
  nombre_completo: string;
  ci: string;
  numcelular: string;
  rol: string;
  inasistencias_personal: number;
  inasistencias_visitante: number;
  total_inasistencias: number;
  total_viajes: number;
  porcentaje_inasistencias: number;
}

export interface GeneralStats {
  total_viajes: number;
  viajes_completados: number;
  viajes_en_curso: number;
  viajes_pendientes: number;
  usuarios_activos: number;
  total_conductores: number;
  total_personal: number;
  total_visitantes: number;
  total_vehiculos: number;
  vehiculos_asignados: number;
  vehiculos_en_viaje: number;
  total_destinos: number;
  destino_mas_popular: string;
  total_calificaciones: number;
  promedio_calificaciones_general: number;
  total_inasistencias_sistema: number;
}

export interface DriverPerformanceStats {
  idconductor: string;
  nombre_completo: string;
  ci: string;
  numcelular: string;
  total_viajes_realizados: number;
  total_calificaciones_recibidas: number;
  promedio_calificacion: number;
  tasa_asistencia_pasajeros: number;
}

export interface BestRatedDestination {
  iddestino: string;
  nomdestino: string;
  total_viajes: number;
  total_calificaciones: number;
  promedio_calificacion: number;
}

@Injectable({ providedIn: 'root' })
export class StatisticsService {
  private supabase = inject(SupabaseService).supabase;


  async getMostUsedDestinations(limit?: number): Promise<DestinationStats[]> {
    let query = this.supabase
      .from('estadistica_destinos_mas_utilizados')
      .select('*')
      .order('total_viajes', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error obteniendo destinos más utilizados:', error);
      throw error;
    }

    return data || [];
  }


  async getUsersWithMostAbsences(limit?: number): Promise<UserAbsenceStats[]> {
    let query = this.supabase
      .from('estadistica_usuarios_inasistencias')
      .select('*')
      .order('total_inasistencias', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error obteniendo usuarios con más inasistencias:', error);
      throw error;
    }

    return data || [];
  }


  async getGeneralStatistics(): Promise<GeneralStats | null> {
    const { data, error } = await this.supabase
      .from('estadistica_resumen_general')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error obteniendo estadísticas generales:', error);
      throw error;
    }

    return data;
  }


  async getBestPerformingDrivers(
    limit?: number
  ): Promise<DriverPerformanceStats[]> {
    let query = this.supabase
      .from('estadistica_conductores_mejor_desempeno')
      .select('*')
      .order('promedio_calificacion', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error obteniendo conductores con mejor desempeño:', error);
      throw error;
    }

    return data || [];
  }


  async getBestRatedDestinations(
    limit?: number
  ): Promise<BestRatedDestination[]> {
    let query = this.supabase
      .from('destinos_mejor_calificados')
      .select('*')
      .order('promedio_calificacion', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error obteniendo destinos mejor calificados:', error);
      throw error;
    }

    return data || [];
  }


  async getUserAbsenceStats(
    idusuario: string
  ): Promise<UserAbsenceStats | null> {
    const { data, error } = await this.supabase
      .from('estadistica_usuarios_inasistencias')
      .select('*')
      .eq('idusuario', idusuario)
      .maybeSingle();

    if (error) {
      console.error(
        'Error obteniendo estadísticas de inasistencias del usuario:',
        error
      );
      throw error;
    }

    return data;
  }


  async getDestinationStats(
    iddestino: string
  ): Promise<DestinationStats | null> {
    const { data, error } = await this.supabase
      .from('estadistica_destinos_mas_utilizados')
      .select('*')
      .eq('iddestino', iddestino)
      .maybeSingle();

    if (error) {
      console.error('Error obteniendo estadísticas del destino:', error);
      throw error;
    }

    return data;
  }


  async getDriverPerformanceStats(
    idconductor: string
  ): Promise<DriverPerformanceStats | null> {
    const { data, error } = await this.supabase
      .from('estadistica_conductores_mejor_desempeno')
      .select('*')
      .eq('idconductor', idconductor)
      .maybeSingle();

    if (error) {
      console.error('Error obteniendo estadísticas del conductor:', error);
      throw error;
    }

    return data;
  }
  async getStatsInDateRange(
    startDate: string,
    endDate: string
  ): Promise<{
    total_viajes: number;
    viajes_completados: number;
    promedio_calificacion: number;
  }> {
    const { count: totalViajes } = await this.supabase
      .from('planificacion_viaje')
      .select('*', { count: 'exact', head: true })
      .gte('fechapartida', startDate)
      .lte('fechapartida', endDate);

    const { count: viajesCompletados } = await this.supabase
      .from('planificacion_viaje')
      .select('*', { count: 'exact', head: true })
      .gte('fechapartida', startDate)
      .lte('fechapartida', endDate)
      .not('horarealllegada', 'is', null);

    const { data: planificaciones } = await this.supabase
      .from('planificacion_viaje')
      .select('idplanificacion')
      .gte('fechapartida', startDate)
      .lte('fechapartida', endDate);

    let promedioCalificacion = 0;
    if (planificaciones && planificaciones.length > 0) {
      const ids = planificaciones.map((p) => p.idplanificacion);

      const { data: calificaciones } = await this.supabase
        .from('calificacion_viaje')
        .select('calificacion')
        .in('idplanificacion', ids);

      if (calificaciones && calificaciones.length > 0) {
        const sum = calificaciones.reduce((acc, c) => acc + c.calificacion, 0);
        promedioCalificacion = sum / calificaciones.length;
      }
    }

    return {
      total_viajes: totalViajes || 0,
      viajes_completados: viajesCompletados || 0,
      promedio_calificacion: Number(promedioCalificacion.toFixed(2)),
    };
  }


  async getTripTrendByMonth(): Promise<
    Array<{ mes: string; total_viajes: number; viajes_completados: number }>
  > {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    const { data, error } = await this.supabase
      .from('planificacion_viaje')
      .select('fechapartida, horarealllegada')
      .gte('fechapartida', startDate.toISOString().split('T')[0])
      .lte('fechapartida', endDate.toISOString().split('T')[0])
      .order('fechapartida', { ascending: true });

    if (error) {
      console.error('Error obteniendo tendencia de viajes:', error);
      throw error;
    }

    const monthlyStats = new Map<
      string,
      { total_viajes: number; viajes_completados: number }
    >();

    (data || []).forEach((viaje) => {
      const fecha = new Date(viaje.fechapartida);
      const mesKey = `${fecha.getFullYear()}-${String(
        fecha.getMonth() + 1
      ).padStart(2, '0')}`;

      if (!monthlyStats.has(mesKey)) {
        monthlyStats.set(mesKey, { total_viajes: 0, viajes_completados: 0 });
      }

      const stats = monthlyStats.get(mesKey)!;
      stats.total_viajes++;
      if (viaje.horarealllegada) {
        stats.viajes_completados++;
      }
    });

    return Array.from(monthlyStats.entries()).map(([mes, stats]) => ({
      mes,
      ...stats,
    }));
  }
}
