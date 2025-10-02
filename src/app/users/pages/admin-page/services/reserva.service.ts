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

  async getPasajerosPorPlanificacion(
    idplanificacion: string
  ): Promise<ReservaPasajero[]> {
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
      .eq('estado', 'reservado');

    if (errorPersonal) throw errorPersonal;

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
      .eq('estado', 'reservado');

    if (errorVisitante) throw errorVisitante;

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

  async verificarReservaExistente(
    idusuario: string,
    idplanificacionActual: string
  ): Promise<{
    tieneReserva: boolean;
    idplanificacion?: string;
    asiento?: number;
    destinoCorrecto: boolean;
  }> {
    const { data: personal, error: personalError } = await this.supabase
      .from('personal')
      .select('nroficha')
      .eq('idusuario', idusuario)
      .maybeSingle();

    if (personalError || !personal) {
      return { tieneReserva: false, destinoCorrecto: false };
    }

    const nroficha = personal.nroficha;

    const { data: asignacion, error: asignacionError } = await this.supabase
      .from('asignacion_destino')
      .select('idasignaciondestino, iddestino')
      .eq('nroficha', nroficha)
      .maybeSingle();

    if (asignacionError || !asignacion) {
      return { tieneReserva: false, destinoCorrecto: false };
    }

    const { data: viajeActual } = await this.supabase
      .from('planificacion_viaje')
      .select('iddestino')
      .eq('idplanificacion', idplanificacionActual)
      .single();

    const destinoCorrecto = viajeActual?.iddestino === asignacion.iddestino;

    // Buscar reserva activa (estado 'reservado')
    const { data: reservaExistente } = await this.supabase
      .from('asignaciondestino_planificacionviaje')
      .select('idplanificacion, nroasiento, estado')
      .eq('idasignaciondestino', asignacion.idasignaciondestino)
      .eq('estado', 'reservado')
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

  async cambiarReserva(
    idusuario: string,
    idplanificacionNueva: string,
    asientoNuevo: number
  ): Promise<void> {
    const { data: personal, error: personalError } = await this.supabase
      .from('personal')
      .select('nroficha')
      .eq('idusuario', idusuario)
      .maybeSingle();

    if (personalError || !personal) {
      throw new Error('No se encontró la ficha del usuario');
    }

    const nroficha = personal.nroficha;

    const { data: asignacion, error: asignacionError } = await this.supabase
      .from('asignacion_destino')
      .select('idasignaciondestino')
      .eq('nroficha', nroficha)
      .maybeSingle();

    if (asignacionError || !asignacion) {
      throw new Error('El usuario no tiene asignación de destino activa');
    }

    const idasignaciondestino = asignacion.idasignaciondestino;

    // Buscar reserva activa (solo estado 'reservado')
    const { data: reservaActual } = await this.supabase
      .from('asignaciondestino_planificacionviaje')
      .select('idplanificacion, nroasiento')
      .eq('idasignaciondestino', idasignaciondestino)
      .eq('estado', 'reservado')
      .maybeSingle();

    const esElMismoViaje =
      reservaActual?.idplanificacion === idplanificacionNueva;

    if (esElMismoViaje) {
      // Cambiar asiento en el mismo viaje
      const { error: updateError } = await this.supabase
        .from('asignaciondestino_planificacionviaje')
        .update({ nroasiento: asientoNuevo })
        .eq('idasignaciondestino', idasignaciondestino)
        .eq('idplanificacion', idplanificacionNueva)
        .eq('estado', 'reservado');

      if (updateError) throw updateError;
    } else {
      // Cancelar reserva anterior
      const { error: cancelError } = await this.supabase
        .from('asignaciondestino_planificacionviaje')
        .update({ estado: 'cancelado' })
        .eq('idasignaciondestino', idasignaciondestino)
        .eq('estado', 'reservado');

      if (cancelError) throw cancelError;

      // Crear nueva reserva
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
  async reservarAsiento(
    idplanificacion: string,
    asiento: number,
    tipo: 'personal',
    idusuario: string
  ) {
    if (tipo !== 'personal') return;

    const { data: personal, error: personalError } = await this.supabase
      .from('personal')
      .select('nroficha')
      .eq('idusuario', idusuario)
      .maybeSingle();

    if (personalError || !personal) {
      throw new Error('No se encontró la ficha del usuario');
    }

    const nroficha = personal.nroficha;

    const { data: asignacion, error: asignacionError } = await this.supabase
      .from('asignacion_destino')
      .select('idasignaciondestino')
      .eq('nroficha', nroficha)
      .maybeSingle();

    if (asignacionError || !asignacion) {
      throw new Error('El usuario no tiene asignación de destino activa');
    }

    const idasignaciondestino = asignacion.idasignaciondestino;

    // Verificar si existe una reserva ACTIVA (estado 'reservado')
    const { data: existenteActiva } = await this.supabase
      .from('asignaciondestino_planificacionviaje')
      .select('*')
      .eq('idasignaciondestino', idasignaciondestino)
      .eq('idplanificacion', idplanificacion)
      .eq('estado', 'reservado')
      .maybeSingle();

    if (existenteActiva) {
      throw new Error('Ya tienes un asiento reservado en este viaje');
    }

    // Verificar si existe una reserva CANCELADA para reutilizarla
    const { data: existenteCancelada } = await this.supabase
      .from('asignaciondestino_planificacionviaje')
      .select('*')
      .eq('idasignaciondestino', idasignaciondestino)
      .eq('idplanificacion', idplanificacion)
      .eq('estado', 'cancelado')
      .maybeSingle();

    if (existenteCancelada) {
      // Si existe una reserva cancelada, actualizarla a 'reservado'
      const { error: updateError } = await this.supabase
        .from('asignaciondestino_planificacionviaje')
        .update({ 
          estado: 'reservado',
          nroasiento: asiento 
        })
        .eq('idasignaciondestino', idasignaciondestino)
        .eq('idplanificacion', idplanificacion)
        .eq('estado', 'cancelado');

      if (updateError) throw updateError;
    } else {
      // Si no existe ningún registro, crear uno nuevo
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
}
