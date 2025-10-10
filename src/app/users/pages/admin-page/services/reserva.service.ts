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
    esAlMismoDestino?: boolean | null; // NUEVO
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
        return {
          tieneReserva: true,
          idplanificacion: reservaExistente.idplanificacion,
          asiento: reservaExistente.nroasiento,
          destinoCorrecto: true,
          esAlMismoDestino: false,
        };
      }

      return { tieneReserva: false, destinoCorrecto: true };
    }

    // Para personal
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

    // Buscar reserva existente
    const { data: reservaExistente } = await this.supabase
      .from('asignaciondestino_planificacionviaje')
      .select('idplanificacion, nroasiento, estado')
      .eq('idasignaciondestino', asignacion.idasignaciondestino)
      .eq('estado', 'reservado')
      .maybeSingle();

    if (!reservaExistente) {
      return { tieneReserva: false, destinoCorrecto };
    }

    // Si la reserva es en el mismo viaje, no hay conflicto
    if (reservaExistente.idplanificacion === idplanificacionActual) {
      return {
        tieneReserva: true,
        idplanificacion: reservaExistente.idplanificacion,
        asiento: reservaExistente.nroasiento,
        destinoCorrecto,
        esAlMismoDestino: false, // No es problema porque es el mismo viaje
      };
    }

    // Verificar si la reserva existente es al mismo destino
    const { data: viajeReservado } = await this.supabase
      .from('planificacion_viaje')
      .select('iddestino')
      .eq('idplanificacion', reservaExistente.idplanificacion)
      .single();

    const esAlMismoDestino =
      viajeReservado &&
      viajeReservado.iddestino?.toString().toLowerCase() ===
        viajeActual?.iddestino?.toString().toLowerCase();

    return {
      tieneReserva: true,
      idplanificacion: reservaExistente.idplanificacion,
      asiento: reservaExistente.nroasiento,
      destinoCorrecto,
      esAlMismoDestino, // NUEVO: indica si es al mismo destino
    };
  }

  async reservarAsientoPersonal(
    idplanificacion: string,
    asiento: number,
    idusuario: string,
    reservarRetorno: boolean = false
  ): Promise<void> {
    // 🔹 1. Verificar si ya tiene el máximo de reservas activas (ida y retorno)
    const verificacion = await this.verificarReservasActivas(idusuario);

    if (verificacion.tieneMaximo) {
      throw new Error(
        `Ya tienes ${verificacion.total} reservas activas (ida y retorno). 
      Debes cancelar alguna antes de reservar en otro viaje.`
      );
    }

    // 🔹 2. Crear la reserva principal
    await this.crearReservaPersonal(idplanificacion, asiento, idusuario);

    // 🔹 3. Si el viaje tiene retorno y el usuario quiere reservar ambos
    if (reservarRetorno) {
      const { existe, idplanificacionRetorno } =
        await this.retornoService.tieneRetorno(idplanificacion);

      if (existe && idplanificacionRetorno) {
        // Antes de reservar el retorno, vuelve a validar el límite
        const verificacion2 = await this.verificarReservasActivas(idusuario);
        if (verificacion2.tieneMaximo) {
          throw new Error(
            `Ya alcanzaste el límite de reservas activas. No puedes reservar también el retorno.`
          );
        }

        await this.crearReservaPersonal(
          idplanificacionRetorno,
          asiento,
          idusuario
        );
      }
    }
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

  private async crearReservaPersonal(
    idplanificacion: string,
    asiento: number,
    idusuario: string
  ): Promise<void> {
    const idasignaciondestino = await this.getAsignacionActivaPersonal(
      idusuario
    );

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

    const { data: existenteCancelada } = await this.supabase
      .from('asignaciondestino_planificacionviaje')
      .select('*')
      .eq('idasignaciondestino', idasignaciondestino)
      .eq('idplanificacion', idplanificacion)
      .eq('estado', 'cancelado')
      .maybeSingle();

    if (existenteCancelada) {
      const { error } = await this.supabase
        .from('asignaciondestino_planificacionviaje')
        .update({
          estado: 'reservado',
          nroasiento: asiento,
        })
        .eq('idasignaciondestino', idasignaciondestino)
        .eq('idplanificacion', idplanificacion)
        .eq('estado', 'cancelado');

      if (error) throw error;
    } else {
      const { error } = await this.supabase
        .from('asignaciondestino_planificacionviaje')
        .insert({
          idplanificacion,
          nroasiento: asiento,
          idasignaciondestino,
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

  // Reemplaza el método cambiarReserva en reserva.service.ts

  async cambiarReserva(
    idusuario: string,
    idplanificacion: string,
    nuevoAsiento: number
  ): Promise<void> {
    // ✅ Obtener asignación activa del usuario (ficha)
    const idasignaciondestino = await this.getAsignacionActivaPersonal(
      idusuario
    );

    // ✅ Buscar reservas activas actuales (salida y retorno)
    const { data: reservasActuales, error: errorBuscar } = await this.supabase
      .from('asignaciondestino_planificacionviaje')
      .select('idasignaciondestino, idplanificacion, estado, nroasiento')
      .eq('idasignaciondestino', idasignaciondestino)
      .eq('estado', 'reservado');

    if (errorBuscar) throw errorBuscar;

    if (!reservasActuales || reservasActuales.length === 0) {
      throw new Error('No se encontraron reservas activas para actualizar.');
    }

    // ✅ Actualizar las reservas existentes (pueden ser salida y retorno)
    const { error: errorActualizar } = await this.supabase
      .from('asignaciondestino_planificacionviaje')
      .update({
        idplanificacion: idplanificacion,
        nroasiento: nuevoAsiento,
        estado: 'reservado',
      })
      .eq('idasignaciondestino', idasignaciondestino)
      .eq('estado', 'reservado');

    if (errorActualizar) throw errorActualizar;

    // ✅ Actualizar asientos disponibles del nuevo viaje
    await this.actualizarAsientosDisponibles(idplanificacion);
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
