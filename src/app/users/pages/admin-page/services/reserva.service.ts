import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../../shared/services/supabase.service';

export interface ReservaPasajero {
  asiento: number;
  nombre: string;
  ci: string;
  telefono: string;
  tipo: 'personal' | 'visitante';
  idusuario?: string;
}

@Injectable({ providedIn: 'root' })
export class ReservaService {
  private supabase = inject(SupabaseService).supabase;

  /**
   * Devuelve todos los pasajeros (personal y visitantes) de un viaje
   */
  async getPasajerosPorPlanificacion(
    idplanificacion: string
  ): Promise<ReservaPasajero[]> {
    // 1. Consultar PERSONAL asignado
    const { data: personal, error: errorPersonal } = await this.supabase
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
      .neq('estado', 'cancelado');

    if (errorPersonal) throw errorPersonal;

    // 2. Consultar VISITANTES asignados
    const { data: visitantes, error: errorVisitante } = await this.supabase
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
      .neq('estado', 'cancelado');

    if (errorVisitante) throw errorVisitante;

    // 3. Normalizar ambos resultados al mismo formato
    const pasajeros: ReservaPasajero[] = [];

    personal?.forEach((p: any) => {
      const u = p.asignacion_destino?.personal?.usuario;
      if (u) {
        pasajeros.push({
          asiento: p.nroasiento,
          nombre: `${u.nomusuario} ${u.patusuario ?? ''} ${
            u.matusuario ?? ''
          }`.trim(),
          ci: u.ci,
          telefono: u.numcelular,
          tipo: 'personal',
          idusuario: u.idusuario,
        });
      }
    });

    visitantes?.forEach((v: any) => {
      const u = v.visitante?.usuario;
      if (u) {
        pasajeros.push({
          asiento: v.nroasiento,
          nombre: `${u.nomusuario} ${u.patusuario ?? ''} ${
            u.matusuario ?? ''
          }`.trim(),
          ci: u.ci,
          telefono: u.numcelular,
          tipo: 'visitante',
          idusuario: u.idusuario,
        });
      }
    });

    return pasajeros;
  }

  async cancelarReserva(
    idplanificacion: string,
    asiento: number,
    tipo: 'personal' | 'visitante'
  ): Promise<void> {
    let table = '';
    let asientoColumn = 'nroasiento';

    if (tipo === 'personal') {
      table = 'asignaciondestino_planificacionviaje';
    } else if (tipo === 'visitante') {
      table = 'visitante_planificacionviaje';
    }

    const { error } = await this.supabase
      .from(table)
      .update({ estado: 'cancelado' })
      .eq('idplanificacion', idplanificacion)
      .eq(asientoColumn, asiento);

    if (error) throw error;
  }

  /**
   * Verifica si el usuario ya tiene una reserva en algún viaje
   * Retorna { tieneReserva, idplanificacion, asiento, destinoCorrecto }
   */
  async verificarReservaExistente(
    idusuario: string,
    idplanificacionActual: string
  ): Promise<{
    tieneReserva: boolean;
    idplanificacion?: string;
    asiento?: number;
    destinoCorrecto: boolean;
  }> {
    // 1. Buscar la ficha del usuario
    const { data: personal, error: personalError } = await this.supabase
      .from('personal')
      .select('nroficha')
      .eq('idusuario', idusuario)
      .maybeSingle();

    if (personalError || !personal) {
      return { tieneReserva: false, destinoCorrecto: false };
    }

    const nroficha = personal.nroficha;

    // 2. Buscar la asignación de destino activa
    const { data: asignacion, error: asignacionError } = await this.supabase
      .from('asignacion_destino')
      .select('idasignaciondestino, iddestino')
      .eq('nroficha', nroficha)
      .maybeSingle();

    if (asignacionError || !asignacion) {
      return { tieneReserva: false, destinoCorrecto: false };
    }

    // 3. Verificar el destino del viaje actual
    const { data: viajeActual } = await this.supabase
      .from('planificacion_viaje')
      .select('iddestino')
      .eq('idplanificacion', idplanificacionActual)
      .single();

    const destinoCorrecto = viajeActual?.iddestino === asignacion.iddestino;

    // 4. Buscar si ya tiene una reserva en algún viaje
    const { data: reservaExistente } = await this.supabase
      .from('asignaciondestino_planificacionviaje')
      .select('idplanificacion, nroasiento')
      .eq('idasignaciondestino', asignacion.idasignaciondestino)
      .neq('estado', 'cancelado')
      .maybeSingle();

    if (reservaExistente) {
      return {
        tieneReserva: true,
        idplanificacion: reservaExistente.idplanificacion,
        asiento: reservaExistente.nroasiento,
        destinoCorrecto,
      };
    }

    return { tieneReserva: false, destinoCorrecto };
  }

  /**
   * Cambia la reserva de un viaje a otro (o cambia de asiento en el mismo viaje)
   */
  async cambiarReserva(
    idusuario: string,
    idplanificacionNueva: string,
    asientoNuevo: number
  ): Promise<void> {
    // 1. Buscar la ficha del usuario
    const { data: personal, error: personalError } = await this.supabase
      .from('personal')
      .select('nroficha')
      .eq('idusuario', idusuario)
      .maybeSingle();

    if (personalError || !personal) {
      throw new Error('No se encontró la ficha del usuario');
    }

    const nroficha = personal.nroficha;

    // 2. Buscar la asignación de destino activa
    const { data: asignacion, error: asignacionError } = await this.supabase
      .from('asignacion_destino')
      .select('idasignaciondestino')
      .eq('nroficha', nroficha)
      .maybeSingle();

    if (asignacionError || !asignacion) {
      throw new Error('El usuario no tiene asignación de destino activa');
    }

    const idasignaciondestino = asignacion.idasignaciondestino;

    // 3. Verificar si la reserva actual es del mismo viaje
    const { data: reservaActual } = await this.supabase
      .from('asignaciondestino_planificacionviaje')
      .select('idplanificacion, nroasiento')
      .eq('idasignaciondestino', idasignaciondestino)
      .neq('estado', 'cancelado')
      .maybeSingle();

    const esElMismoViaje = reservaActual?.idplanificacion === idplanificacionNueva;

    if (esElMismoViaje) {
      // Si es el mismo viaje, solo actualizamos el número de asiento
      const { error: updateError } = await this.supabase
        .from('asignaciondestino_planificacionviaje')
        .update({ nroasiento: asientoNuevo })
        .eq('idasignaciondestino', idasignaciondestino)
        .eq('idplanificacion', idplanificacionNueva);

      if (updateError) throw updateError;
    } else {
      // Si es diferente viaje, cancelamos la anterior y creamos una nueva
      // 4. Cancelar la reserva anterior
      const { error: cancelError } = await this.supabase
        .from('asignaciondestino_planificacionviaje')
        .update({ estado: 'cancelado' })
        .eq('idasignaciondestino', idasignaciondestino)
        .neq('estado', 'cancelado');

      if (cancelError) throw cancelError;

      // 5. Crear la nueva reserva
      const { error: reservaError } = await this.supabase
        .from('asignaciondestino_planificacionviaje')
        .insert([
          {
            idplanificacion: idplanificacionNueva,
            nroasiento: asientoNuevo,
            idasignaciondestino,
            estado: 'reservado',
          },
        ]);

      if (reservaError) throw reservaError;
    }
  }

  /**
   * Reserva un asiento para personal
   */
  async reservarAsiento(
    idplanificacion: string,
    asiento: number,
    tipo: 'personal',
    idusuario: string
  ) {
    if (tipo !== 'personal') return;

    // 1. Buscar la ficha del usuario
    const { data: personal, error: personalError } = await this.supabase
      .from('personal')
      .select('nroficha')
      .eq('idusuario', idusuario)
      .maybeSingle();

    if (personalError || !personal) {
      throw new Error('No se encontró la ficha del usuario');
    }

    const nroficha = personal.nroficha;

    // 2. Buscar la asignación de destino activa
    const { data: asignacion, error: asignacionError } = await this.supabase
      .from('asignacion_destino')
      .select('idasignaciondestino')
      .eq('nroficha', nroficha)
      .maybeSingle();

    if (asignacionError || !asignacion) {
      throw new Error('El usuario no tiene asignación de destino activa');
    }

    const idasignaciondestino = asignacion.idasignaciondestino;

    // 3. Verificar si ya existe reserva
    const { data: existente } = await this.supabase
      .from('asignaciondestino_planificacionviaje')
      .select('*')
      .eq('idasignaciondestino', idasignaciondestino)
      .eq('idplanificacion', idplanificacion)
      .maybeSingle();

    if (existente) {
      throw new Error('Ya tienes un asiento reservado en este viaje');
    }

    // 4. Insertar la reserva
    const { error: reservaError } = await this.supabase
      .from('asignaciondestino_planificacionviaje')
      .insert([
        {
          idplanificacion,
          nroasiento: asiento,
          idasignaciondestino,
          estado: 'reservado',
        },
      ]);

    if (reservaError) throw reservaError;
  }
}
