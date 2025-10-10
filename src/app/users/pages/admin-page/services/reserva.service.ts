import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../../shared/services/supabase.service';
import { RetornoService } from './retorno.service';

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
  private retornoService = inject(RetornoService);

  async getPasajerosPorPlanificacion(
    idplanificacion: string
  ): Promise<ReservaPasajero[]> {
    const [personal, visitantes] = await Promise.all([
      this.getPasajerosPersonal(idplanificacion),
      this.getPasajerosVisitantes(idplanificacion),
    ]);

    return [...personal, ...visitantes];
  }

  private async getPasajerosPersonal(
    idplanificacion: string
  ): Promise<ReservaPasajero[]> {
    const { data, error } = await this.supabase
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

    if (error) throw error;

    const pasajeros: ReservaPasajero[] = [];

    (data || []).forEach((p: any) => {
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

    return pasajeros;
  }

  private async getPasajerosVisitantes(
    idplanificacion: string
  ): Promise<ReservaPasajero[]> {
    const { data, error } = await this.supabase
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

    if (error) throw error;

    const pasajeros: ReservaPasajero[] = [];

    (data || []).forEach((v: any) => {
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

  async verificarReservaExistente(
    idusuario: string,
    idplanificacionActual: string,
    isStaff: boolean = true
  ): Promise<{
    tieneReserva: boolean;
    idplanificacion?: string;
    asiento?: number;
    destinoCorrecto: boolean;
    esAlMismoDestino?: boolean | null;
    esMismoViaje?: boolean;
  }> {
    if (!isStaff) {
      const { data: visitante } = await this.supabase
        .from('visitante')
        .select('idvisitante')
        .eq('idusuario', idusuario)
        .maybeSingle();

      if (!visitante) {
        return { tieneReserva: false, destinoCorrecto: true };
      }

      const { data: reservaExistente } = await this.supabase
        .from('visitante_planificacionviaje')
        .select('idplanificacion, nroasiento, estado')
        .eq('idvisitante', visitante.idvisitante)
        .eq('estado', 'reservado')
        .maybeSingle();

      if (reservaExistente) {
        const esMismoViaje = reservaExistente.idplanificacion === idplanificacionActual;
        return {
          tieneReserva: true,
          idplanificacion: reservaExistente.idplanificacion,
          asiento: reservaExistente.nroasiento,
          destinoCorrecto: true,
          esAlMismoDestino: false,
          esMismoViaje,
        };
      }

      return { tieneReserva: false, destinoCorrecto: true };
    }

    // Para personal - buscar asignación activa
    const { data: personal, error: personalError } = await this.supabase
      .from('personal')
      .select('nroficha')
      .eq('idusuario', idusuario)
      .maybeSingle();

    if (personalError || !personal) {
      return { tieneReserva: false, destinoCorrecto: false };
    }

    const { data: asignacion, error: asignacionError } = await this.supabase
      .from('asignacion_destino')
      .select('idasignaciondestino, iddestino')
      .eq('nroficha', personal.nroficha)
      .is('fechafin', null)
      .maybeSingle();

    if (asignacionError || !asignacion) {
      return { tieneReserva: false, destinoCorrecto: false };
    }

    // Obtener destino del viaje actual
    const { data: viajeActual } = await this.supabase
      .from('planificacion_viaje')
      .select('iddestino')
      .eq('idplanificacion', idplanificacionActual)
      .single();

    const destinoCorrecto =
      viajeActual?.iddestino?.toString().toLowerCase() ===
      asignacion.iddestino?.toString().toLowerCase();

    // Buscar TODAS las reservas activas (no solo una)
    const { data: reservasActivas } = await this.supabase
      .from('asignaciondestino_planificacionviaje')
      .select('idplanificacion, nroasiento, estado')
      .eq('idasignaciondestino', asignacion.idasignaciondestino)
      .eq('estado', 'reservado');

    if (!reservasActivas || reservasActivas.length === 0) {
      return { tieneReserva: false, destinoCorrecto };
    }

    // Buscar si alguna reserva es en el mismo viaje
    const reservaMismoViaje = reservasActivas.find(
      (r) => r.idplanificacion === idplanificacionActual
    );

    if (reservaMismoViaje) {
      return {
        tieneReserva: true,
        idplanificacion: reservaMismoViaje.idplanificacion,
        asiento: reservaMismoViaje.nroasiento,
        destinoCorrecto,
        esAlMismoDestino: false,
        esMismoViaje: true,
      };
    }

    // Obtener destinos de todas las reservas activas
    const idsReservas = reservasActivas.map((r) => r.idplanificacion);
    const { data: viajesReservados } = await this.supabase
      .from('planificacion_viaje')
      .select('idplanificacion, iddestino')
      .in('idplanificacion', idsReservas);

    // Verificar si alguna reserva es al mismo destino que el viaje actual
    const reservaAlMismoDestino = viajesReservados?.find(
      (v) =>
        v.iddestino?.toString().toLowerCase() ===
        viajeActual?.iddestino?.toString().toLowerCase()
    );

    if (reservaAlMismoDestino) {
      const reserva = reservasActivas.find(
        (r) => r.idplanificacion === reservaAlMismoDestino.idplanificacion
      );
      return {
        tieneReserva: true,
        idplanificacion: reserva!.idplanificacion,
        asiento: reserva!.nroasiento,
        destinoCorrecto,
        esAlMismoDestino: true,
        esMismoViaje: false,
      };
    }

    // Tiene reserva pero en otro destino diferente
    return {
      tieneReserva: true,
      idplanificacion: reservasActivas[0].idplanificacion,
      asiento: reservasActivas[0].nroasiento,
      destinoCorrecto,
      esAlMismoDestino: false,
      esMismoViaje: false,
    };
  }

  async reservarAsientoPersonal(
    idplanificacion: string,
    nroAsiento: number,
    idusuario: string,
    reservarRetorno: boolean
  ) {
    const { data: personalData, error: errorPersonal } = await this.supabase
      .from('personal')
      .select('nroficha')
      .eq('idusuario', idusuario)
      .maybeSingle();

    if (errorPersonal || !personalData) {
      throw new Error('No se encontró la ficha del usuario');
    }

    const { data: asignacionData, error: errorAsignacion } = await this.supabase
      .from('asignacion_destino')
      .select('idasignaciondestino, iddestino')
      .eq('nroficha', personalData.nroficha)
      .is('fechafin', null)
      .maybeSingle();

    if (errorAsignacion || !asignacionData) {
      throw new Error('No se encontró asignación del usuario');
    }

    const idasignaciondestino = asignacionData.idasignaciondestino;

    // VALIDACIÓN CRÍTICA: Verificar que no exista otra reserva activa al mismo destino
    const { data: viajeActual } = await this.supabase
      .from('planificacion_viaje')
      .select('iddestino')
      .eq('idplanificacion', idplanificacion)
      .single();

    const { data: reservasActivas } = await this.supabase
      .from('asignaciondestino_planificacionviaje')
      .select('idplanificacion')
      .eq('idasignaciondestino', idasignaciondestino)
      .eq('estado', 'reservado');

    if (reservasActivas && reservasActivas.length > 0) {
      const idsReservas = reservasActivas.map((r) => r.idplanificacion);
      const { data: viajesReservados } = await this.supabase
        .from('planificacion_viaje')
        .select('idplanificacion, iddestino')
        .in('idplanificacion', idsReservas);

      // Verificar si ya tiene reserva al mismo destino en otro viaje
      const tieneReservaAlMismoDestino = viajesReservados?.some(
        (v) =>
          v.idplanificacion !== idplanificacion &&
          v.iddestino?.toString().toLowerCase() ===
            viajeActual?.iddestino?.toString().toLowerCase()
      );

      if (tieneReservaAlMismoDestino) {
        throw new Error(
          'Ya tienes una reserva activa en otro viaje al mismo destino. Debes cancelarla primero.'
        );
      }
    }

    // Buscar registros existentes al mismo destino (activos o cancelados)
    const { data: todasReservas } = await this.supabase
      .from('asignaciondestino_planificacionviaje')
      .select('idplanificacion, estado')
      .eq('idasignaciondestino', idasignaciondestino);

    const datosReserva = {
      idasignaciondestino,
      idplanificacion,
      nroasiento: nroAsiento,
      estado: 'reservado',
    };

    // Buscar si existe registro para este viaje específico
    const reservaEsteViaje = todasReservas?.find(
      (r) => r.idplanificacion === idplanificacion
    );

    if (reservaEsteViaje) {
      // Actualizar registro existente para este viaje
      await this.supabase
        .from('asignaciondestino_planificacionviaje')
        .update(datosReserva)
        .eq('idasignaciondestino', idasignaciondestino)
        .eq('idplanificacion', idplanificacion);
    } else {
      // Buscar si hay registros cancelados al mismo destino para reutilizar
      if (todasReservas && todasReservas.length > 0) {
        const idsTodasReservas = todasReservas.map((r) => r.idplanificacion);
        const { data: viajesExistentes } = await this.supabase
          .from('planificacion_viaje')
          .select('idplanificacion, iddestino')
          .in('idplanificacion', idsTodasReservas);

        // Buscar registro cancelado al mismo destino
        const registroCanceladoMismoDestino = viajesExistentes?.find(
          (v) =>
            v.iddestino?.toString().toLowerCase() ===
              viajeActual?.iddestino?.toString().toLowerCase() &&
            todasReservas.find(
              (r) =>
                r.idplanificacion === v.idplanificacion && r.estado === 'cancelado'
            )
        );

        if (registroCanceladoMismoDestino) {
          // Reutilizar registro cancelado actualizándolo
          await this.supabase
            .from('asignaciondestino_planificacionviaje')
            .update(datosReserva)
            .eq('idasignaciondestino', idasignaciondestino)
            .eq('idplanificacion', registroCanceladoMismoDestino.idplanificacion);
        } else {
          // Crear nuevo registro
          await this.supabase
            .from('asignaciondestino_planificacionviaje')
            .insert(datosReserva);
        }
      } else {
        // No hay registros previos, crear nuevo
        await this.supabase
          .from('asignaciondestino_planificacionviaje')
          .insert(datosReserva);
      }
    }

    // Manejo de retorno con la misma lógica de reutilización
    if (reservarRetorno) {
      const { data: retornoData } = await this.supabase
        .from('retorno_viaje')
        .select('idplanificacion_retorno')
        .eq('idplanificacion_ida', idplanificacion)
        .maybeSingle();

      if (retornoData?.idplanificacion_retorno) {
        const idPlanificacionRetorno = retornoData.idplanificacion_retorno;

        const datosRetorno = {
          idasignaciondestino,
          idplanificacion: idPlanificacionRetorno,
          nroasiento: nroAsiento,
          estado: 'reservado',
        };

        // Buscar si existe registro para este retorno específico
        const reservaRetornoEsteViaje = todasReservas?.find(
          (r) => r.idplanificacion === idPlanificacionRetorno
        );

        if (reservaRetornoEsteViaje) {
          // Actualizar registro existente para este retorno
          await this.supabase
            .from('asignaciondestino_planificacionviaje')
            .update(datosRetorno)
            .eq('idasignaciondestino', idasignaciondestino)
            .eq('idplanificacion', idPlanificacionRetorno);
        } else if (todasReservas && todasReservas.length > 0) {
          // Buscar registro cancelado de retorno al mismo destino
          const { data: viajeRetorno } = await this.supabase
            .from('planificacion_viaje')
            .select('iddestino')
            .eq('idplanificacion', idPlanificacionRetorno)
            .single();

          const idsTodasReservas = todasReservas.map((r) => r.idplanificacion);
          const { data: viajesExistentes } = await this.supabase
            .from('planificacion_viaje')
            .select('idplanificacion, iddestino')
            .in('idplanificacion', idsTodasReservas);

          const registroCanceladoRetorno = viajesExistentes?.find(
            (v) =>
              v.iddestino?.toString().toLowerCase() ===
                viajeRetorno?.iddestino?.toString().toLowerCase() &&
              todasReservas.find(
                (r) =>
                  r.idplanificacion === v.idplanificacion && r.estado === 'cancelado'
              )
          );

          if (registroCanceladoRetorno) {
            // Reutilizar registro cancelado de retorno
            await this.supabase
              .from('asignaciondestino_planificacionviaje')
              .update(datosRetorno)
              .eq('idasignaciondestino', idasignaciondestino)
              .eq('idplanificacion', registroCanceladoRetorno.idplanificacion);
          } else {
            // Crear nuevo registro de retorno
            await this.supabase
              .from('asignaciondestino_planificacionviaje')
              .insert(datosRetorno);
          }
        } else {
          // No hay registros previos, crear nuevo
          await this.supabase
            .from('asignaciondestino_planificacionviaje')
            .insert(datosRetorno);
        }
      }
    }

    await this.actualizarAsientosDisponibles(idplanificacion);
    return true;
  }

  async getPlanificacionRetorno(
    idplanificacionIda: string
  ): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('retorno_viaje')
      .select('idplanificacion_retorno')
      .eq('idplanificacion_ida', idplanificacionIda)
      .eq('estado', 'activo')
      .single();

    if (error) {
      console.error('Error al obtener planificacion de retorno:', error);
      return null;
    }

    return data?.idplanificacion_retorno || null;
  }
  async reservarAsientoVisitante(
    idplanificacion: string,
    asiento: number,
    idusuario: string
  ): Promise<void> {
    const idvisitante = await this.getVisitante(idusuario);

    const { data: existenteActiva } = await this.supabase
      .from('visitante_planificacionviaje')
      .select('*')
      .eq('idvisitante', idvisitante)
      .eq('idplanificacion', idplanificacion)
      .eq('estado', 'reservado')
      .maybeSingle();

    if (existenteActiva) {
      throw new Error('Ya tienes un asiento reservado en este viaje');
    }

    const { data: existenteCancelada } = await this.supabase
      .from('visitante_planificacionviaje')
      .select('*')
      .eq('idvisitante', idvisitante)
      .eq('idplanificacion', idplanificacion)
      .eq('estado', 'cancelado')
      .maybeSingle();

    if (existenteCancelada) {
      const { error } = await this.supabase
        .from('visitante_planificacionviaje')
        .update({
          estado: 'reservado',
          nroasiento: asiento,
        })
        .eq('idvisitante', idvisitante)
        .eq('idplanificacion', idplanificacion)
        .eq('estado', 'cancelado');

      if (error) throw error;
    } else {
      const { error } = await this.supabase
        .from('visitante_planificacionviaje')
        .insert({
          idplanificacion,
          nroasiento: asiento,
          idvisitante,
          estado: 'reservado',
        });

      if (error) throw error;
    }

    await this.actualizarAsientosDisponibles(idplanificacion);
  }

  async cancelarReserva(
    idplanificacion: string,
    asiento: number,
    tipo: 'personal' | 'visitante'
  ): Promise<void> {
    const table =
      tipo === 'personal'
        ? 'asignaciondestino_planificacionviaje'
        : 'visitante_planificacionviaje';

    const { error } = await this.supabase
      .from(table)
      .update({ estado: 'cancelado' })
      .eq('idplanificacion', idplanificacion)
      .eq('nroasiento', asiento);

    if (error) throw error;

    await this.actualizarAsientosDisponibles(idplanificacion);
  }

  async cancelarReservaConRetorno(
    idplanificacion: string,
    idusuario: string,
    cancelarRetorno: boolean = false
  ): Promise<void> {
    const idasignaciondestino = await this.getAsignacionActivaPersonal(
      idusuario
    );

    const { error } = await this.supabase
      .from('asignaciondestino_planificacionviaje')
      .update({ estado: 'cancelado' })
      .eq('idasignaciondestino', idasignaciondestino)
      .eq('idplanificacion', idplanificacion)
      .eq('estado', 'reservado');

    if (error) throw error;

    await this.actualizarAsientosDisponibles(idplanificacion);

    if (cancelarRetorno) {
      const { existe, idplanificacionRetorno } =
        await this.retornoService.tieneRetorno(idplanificacion);

      if (existe && idplanificacionRetorno) {
        const { error: errorRetorno } = await this.supabase
          .from('asignaciondestino_planificacionviaje')
          .update({ estado: 'cancelado' })
          .eq('idasignaciondestino', idasignaciondestino)
          .eq('idplanificacion', idplanificacionRetorno)
          .eq('estado', 'reservado');

        if (errorRetorno) throw errorRetorno;

        await this.actualizarAsientosDisponibles(idplanificacionRetorno);
      }
    }
  }

  async cambiarReserva(
    idusuario: string,
    idplanificacionNueva: string,
    nuevoAsiento: number
  ): Promise<void> {
    // Obtener asignación activa del usuario
    const idasignaciondestino = await this.getAsignacionActivaPersonal(
      idusuario
    );

    // Buscar todas las reservas activas del usuario
    const { data: reservasActuales, error: errorBuscar } = await this.supabase
      .from('asignaciondestino_planificacionviaje')
      .select('idasignaciondestino, idplanificacion, estado, nroasiento')
      .eq('idasignaciondestino', idasignaciondestino)
      .eq('estado', 'reservado');

    if (errorBuscar) throw errorBuscar;

    if (!reservasActuales || reservasActuales.length === 0) {
      throw new Error('No se encontraron reservas activas para actualizar.');
    }

    // Obtener destino de la nueva planificación
    const { data: viajeNuevo } = await this.supabase
      .from('planificacion_viaje')
      .select('iddestino')
      .eq('idplanificacion', idplanificacionNueva)
      .single();

    // Actualizar asientos disponibles de los viajes antiguos
    const viajesAntiguos = new Set(reservasActuales.map((r) => r.idplanificacion));
    for (const idplanificacionAntigua of viajesAntiguos) {
      await this.actualizarAsientosDisponibles(idplanificacionAntigua);
    }

    // Para cada reserva, verificar si es al mismo destino
    for (const reserva of reservasActuales) {
      const { data: viajeAntiguo } = await this.supabase
        .from('planificacion_viaje')
        .select('iddestino')
        .eq('idplanificacion', reserva.idplanificacion)
        .single();

      // Si es al mismo destino, actualizar el registro existente
      if (
        viajeAntiguo?.iddestino?.toString().toLowerCase() ===
        viajeNuevo?.iddestino?.toString().toLowerCase()
      ) {
        const { error } = await this.supabase
          .from('asignaciondestino_planificacionviaje')
          .update({
            idplanificacion: idplanificacionNueva,
            nroasiento: nuevoAsiento,
            estado: 'reservado',
          })
          .eq('idasignaciondestino', idasignaciondestino)
          .eq('idplanificacion', reserva.idplanificacion);

        if (error) throw error;
      }
    }

    // Actualizar asientos disponibles del nuevo viaje
    await this.actualizarAsientosDisponibles(idplanificacionNueva);
  }

  async getAsignacionActivaPersonal(idusuario: string): Promise<string> {
    const { data: personal, error: personalError } = await this.supabase
      .from('personal')
      .select('nroficha')
      .eq('idusuario', idusuario)
      .maybeSingle();

    if (personalError || !personal) {
      throw new Error('No se encontró la ficha del usuario');
    }

    const { data: asignacion, error: asignacionError } = await this.supabase
      .from('asignacion_destino')
      .select('idasignaciondestino')
      .eq('nroficha', personal.nroficha)
      .is('fechafin', null)
      .maybeSingle();

    if (asignacionError || !asignacion) {
      throw new Error('El usuario no tiene asignación de destino activa');
    }

    return asignacion.idasignaciondestino;
  }

  private async getVisitante(idusuario: string): Promise<string> {
    const { data: visitante, error } = await this.supabase
      .from('visitante')
      .select('idvisitante')
      .eq('idusuario', idusuario)
      .maybeSingle();

    if (error || !visitante) {
      throw new Error('No se encontró información de visitante');
    }

    return visitante.idvisitante;
  }

  private async actualizarAsientosDisponibles(
    idplanificacion: string
  ): Promise<void> {
    const { data: viaje } = await this.supabase
      .from('planificacion_viaje')
      .select('idconductorvehiculoempresa')
      .eq('idplanificacion', idplanificacion)
      .single();

    if (!viaje?.idconductorvehiculoempresa) return;

    const { data: cve } = await this.supabase
      .from('conductor_vehiculo_empresa')
      .select('vehiculo:vehiculo(nroasientos)')
      .eq('idconductorvehiculoempresa', viaje.idconductorvehiculoempresa)
      .single();

    const totalAsientos = (cve as any)?.vehiculo?.nroasientos || 0;

    const { count: reservadosPersonal } = await this.supabase
      .from('asignaciondestino_planificacionviaje')
      .select('*', { count: 'exact', head: true })
      .eq('idplanificacion', idplanificacion)
      .eq('estado', 'reservado');

    const { count: reservadosVisitante } = await this.supabase
      .from('visitante_planificacionviaje')
      .select('*', { count: 'exact', head: true })
      .eq('idplanificacion', idplanificacion)
      .eq('estado', 'reservado');

    const totalReservados =
      (reservadosPersonal || 0) + (reservadosVisitante || 0);
    const disponibles = totalAsientos - totalReservados;

    await this.supabase
      .from('conductor_vehiculo_empresa')
      .update({ cantdisponibleasientos: disponibles })
      .eq('idconductorvehiculoempresa', viaje.idconductorvehiculoempresa);
  }
  async cambiarReservaVisitante(
    idusuario: string,
    idplanificacion: string,
    nroasiento: number
  ): Promise<void> {
    const idvisitante = await this.getVisitante(idusuario);

    const { error } = await this.supabase
      .from('visitante_planificacionviaje')
      .update({ nroasiento })
      .eq('idvisitante', idvisitante)
      .eq('idplanificacion', idplanificacion)
      .eq('estado', 'reservado');

    if (error) throw error;

    await this.actualizarAsientosDisponibles(idplanificacion);
  }
  async verificarReservasActivas(idusuario: string): Promise<{
    tieneMaximo: boolean;
    total: number;
    reservas?: string[];
  }> {
    try {
      // 1️⃣ Obtener la asignación activa del usuario (empleado)
      const idasignaciondestino = await this.getAsignacionActivaPersonal(
        idusuario
      );

      // 2️⃣ Buscar todas las reservas activas (estado = 'reservado')
      const { data: reservas, error } = await this.supabase
        .from('asignaciondestino_planificacionviaje')
        .select('idplanificacion, estado')
        .eq('idasignaciondestino', idasignaciondestino)
        .eq('estado', 'reservado');

      if (error) throw error;

      if (!reservas?.length) {
        return { tieneMaximo: false, total: 0 };
      }

      // 3️⃣ Obtener los destinos de esas planificaciones
      const idsPlanificaciones = reservas.map((r) => r.idplanificacion);

      const { data: planificaciones, error: planError } = await this.supabase
        .from('planificacion_viaje')
        .select('idplanificacion, iddestino')
        .in('idplanificacion', idsPlanificaciones);

      if (planError) throw planError;

      // 4️⃣ Contar cuántos destinos únicos tiene reservados
      const destinosUnicos = new Set(planificaciones?.map((p) => p.iddestino));
      const totalReservas = planificaciones?.length || 0;

      // Si tiene 2 o más reservas activas, alcanza el máximo
      const tieneMaximo = totalReservas >= 2 || destinosUnicos.size >= 2;

      return {
        tieneMaximo,
        total: totalReservas,
        reservas: planificaciones?.map((p) => p.idplanificacion) ?? [],
      };
    } catch (err) {
      console.error('Error verificando reservas activas:', err);
      return { tieneMaximo: false, total: 0 };
    }
  }
}
