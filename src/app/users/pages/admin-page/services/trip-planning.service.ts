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
          tipo,
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
      tipo,
      idviaje_relacionado,
      destino: destino(iddestino, nomdestino),
      conductor_vehiculo_empresa!inner(
        idconductorvehiculoempresa,
        cantdisponibleasientos,
        tipo
      )
    `
      )
      .eq('tipo', 'salida');

    if (error) throw error;
    return data;
  }

  async getRetornoAsociadoASalida(idplanificacionSalida: string) {
    const { data, error } = await this.supabase
      .from('planificacion_viaje')
      .select(
        `
        idplanificacion,
        fechapartida,
        horapartida,
        tipo,
        destino: destino(iddestino, nomdestino),
        conductor_vehiculo_empresa!inner(
          idconductorvehiculoempresa,
          cantdisponibleasientos,
          tipo
        )
      `
      )
      .eq('tipo', 'retorno')
      .eq('idviaje_relacionado', idplanificacionSalida)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getRetornos() {
    const { data, error } = await this.supabase
      .from('planificacion_viaje')
      .select(
        `
      idplanificacion,
      fechapartida,
      horapartida,
      tipo,
      idviaje_relacionado,
      destino: destino(iddestino, nomdestino),
      conductor_vehiculo_empresa!inner(
        idconductorvehiculoempresa,
        cantdisponibleasientos,
        tipo
      )
    `
      )
      .eq('tipo', 'retorno');

    if (error) throw error;
    return data;
  }

  async getViajesDisponiblesPorDestino(iddestino: string) {
    const { data, error } = await this.supabase
      .from('planificacion_viaje')
      .select(
        `
        idplanificacion,
        fechapartida,
        fechallegada,
        horapartida,
        tipo,
        destino: destino(iddestino, nomdestino),
        conductor_vehiculo_empresa!inner(
          idconductorvehiculoempresa,
          cantdisponibleasientos,
          tipo
        )
      `
      )
      .eq('iddestino', iddestino)
      .eq('tipo', 'salida')
      .gte('fechapartida', new Date().toISOString().split('T')[0])
      .order('fechapartida', { ascending: true });

    if (error) throw error;
    return data;
  }

  async registrarViaje(
    step1: any,
    step2: any,
    vehiculo: any,
    idviajeRelacionado?: string | null
  ) {
    const now = new Date().toISOString();
    const tipoViaje = step2.tipo || 'salida';

    let cve: any = null;
    try {
      // Siempre crear una nueva asociación para cada tipo de viaje
      const { data: cveInserted, error: errCve } = await this.supabase
        .from('conductor_vehiculo_empresa')
        .insert({
          idconductor: step1.idconductor,
          nroplaca: step1.nroplaca,
          idempresa: step1.idempresa,
          fechainicio: now,
          fechafin: null,
          cantdisponibleasientos: vehiculo?.nroasientos ?? 0,
          estado: 'asignado',
          tipo: tipoViaje, // Agregar el campo tipo
        })
        .select()
        .single();

      if (errCve) throw errCve;
      cve = cveInserted;
    } catch (err) {
      console.error('Error creando asociación CVE:', err);
      throw err;
    }

    try {
      const { data: viaje, error: errPlan } = await this.supabase
        .from('planificacion_viaje')
        .insert({
          fechapartida: step2.fechapartida,
          fechallegada: step2.fechallegada,
          fechaplanificacion: now,
          horapartida: step2.horapartida,
          tipo: tipoViaje,
          idconductorvehiculoempresa: cve.idconductorvehiculoempresa,
          iddestino: step2.iddestino,
          idviaje_relacionado: idviajeRelacionado ?? null,
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
    } catch (err) {
      console.error('Error creando planificacion_viaje:', err);
      throw err;
    }
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
    // Primero obtener el idconductorvehiculoempresa antes de eliminar
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

    // Eliminar la asociación CVE si existe
    if (viajeData?.idconductorvehiculoempresa) {
      await this.supabase
        .from('conductor_vehiculo_empresa')
        .delete()
        .eq('idconductorvehiculoempresa', viajeData.idconductorvehiculoempresa);
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

  async eliminarViajeConRetorno(idplanificacionSalida: string) {
    // Obtener los IDs de las asociaciones CVE antes de eliminar
    const { data: viajes } = await this.supabase
      .from('planificacion_viaje')
      .select('idplanificacion, idconductorvehiculoempresa, tipo')
      .or(`idplanificacion.eq.${idplanificacionSalida},idviaje_relacionado.eq.${idplanificacionSalida}`);

    // Obtener IDs de retornos para retornarlos
    const retornosIds = (viajes || [])
      .filter((v: any) => v.tipo === 'retorno')
      .map((v: any) => v.idplanificacion);

    // Eliminar retornos relacionados
    await this.supabase
      .from('planificacion_viaje')
      .delete()
      .eq('idviaje_relacionado', idplanificacionSalida);

    // Eliminar el viaje de salida
    const { error } = await this.supabase
      .from('planificacion_viaje')
      .delete()
      .eq('idplanificacion', idplanificacionSalida);

    if (error) throw error;

    // Eliminar las asociaciones CVE
    if (viajes && viajes.length > 0) {
      const cveIds = viajes
        .map((v: any) => v.idconductorvehiculoempresa)
        .filter((id: any) => id != null);

      if (cveIds.length > 0) {
        await this.supabase
          .from('conductor_vehiculo_empresa')
          .delete()
          .in('idconductorvehiculoempresa', cveIds);
      }
    }

    return { retornosEliminados: retornosIds };
  }
}
