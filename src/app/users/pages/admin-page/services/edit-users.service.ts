import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../shared/services/supabase.service';

@Injectable({ providedIn: 'root' })
export class EditUsersService {
  private supabaseClient = inject(SupabaseService).supabase;

  // ========= PÚBLICO =========
  async updateUser(userId: string, userData: any) {
    try {
      // 1) Actualizar tabla USUARIO
      const { error: userError } = await this.supabaseClient
        .from('usuario')
        .update({
          nomusuario: userData.nombre,
          patusuario: userData.paterno,
          matusuario: userData.materno,
          numcelular: userData.numcelular,
          ci: userData.ci,
          idrol: userData.idrol,
        })
        .eq('idusuario', userId);

      if (userError) {
        throw new Error('Error actualizando usuario: ' + userError.message);
      }

      // 2) Manipular datos por ROL
      switch (userData.rol) {
        case 'Personal':
        case 'Administrador':
          await this.upsertPersonal(userId, userData.nroficha, userData.operacion);
          await this.ensureDestinyAssignment(userData.nroficha, userData.iddestino);
          break;

        case 'Visitante':
          await this.deleteIfExists('personal', { idusuario: userId });
          await this.upsertVisitante(userId, userData.informacion);
          break;

        case 'Conductor':
          await this.deleteIfExists('personal', { idusuario: userId });
          await this.upsertConductor(userId);
          break;

        default:
          throw new Error(`Rol ${userData.rol} no soportado`);
      }

      return true;
    } catch (err: any) {
      throw new Error(err.message || 'Error al editar usuario');
    }
  }

  // ========= UPSERTS POR ROL =========
  private async upsertPersonal(idusuario: string, nroficha: string, operacion: string) {
    const { data: exists, error } = await this.supabaseClient
      .from('personal')
      .select('idusuario')
      .eq('idusuario', idusuario)
      .maybeSingle();

    if (error) throw new Error('Error verificando personal: ' + error.message);

    if (exists) {
      const { error: updErr } = await this.supabaseClient
        .from('personal')
        .update({ nroficha, operacion })
        .eq('idusuario', idusuario);
      if (updErr) throw new Error('Error actualizando personal: ' + updErr.message);
    } else {
      const { error: insErr } = await this.supabaseClient
        .from('personal')
        .insert([{ idusuario, nroficha, operacion }]);
      if (insErr) throw new Error('Error insertando personal: ' + insErr.message);
    }
  }

  private async upsertVisitante(idusuario: string, informacion: string) {
    const { data: exists, error } = await this.supabaseClient
      .from('visitante')
      .select('idusuario')
      .eq('idusuario', idusuario)
      .maybeSingle();

    if (error) throw new Error('Error verificando visitante: ' + error.message);

    if (exists) {
      const { error: updErr } = await this.supabaseClient
        .from('visitante')
        .update({ informacion })
        .eq('idusuario', idusuario);
      if (updErr) throw new Error('Error actualizando visitante: ' + updErr.message);
    } else {
      const { error: insErr } = await this.supabaseClient
        .from('visitante')
        .insert([{ idusuario, informacion }]);
      if (insErr) throw new Error('Error insertando visitante: ' + insErr.message);
    }
  }

  private async upsertConductor(idusuario: string) {
    const { data: exists, error } = await this.supabaseClient
      .from('conductor')
      .select('idusuario')
      .eq('idusuario', idusuario)
      .maybeSingle();

    if (error) throw new Error('Error verificando conductor: ' + error.message);

    if (!exists) {
      const { error: insErr } = await this.supabaseClient
        .from('conductor')
        .insert([{ idusuario }]);
      if (insErr) throw new Error('Error insertando conductor: ' + insErr.message);
    }
  }

  private async deleteIfExists(table: 'personal' | 'visitante' | 'conductor', where: Record<string, any>) {
    const { error } = await this.supabaseClient.from(table).delete().match(where);
    if (error) throw new Error(`Error borrando en ${table}: ${error.message}`);
  }

  // ========= ASIGNACIÓN DE DESTINO =========
  private async ensureDestinyAssignment(nroficha: string, newDestinyId: string) {
    if (!nroficha || !newDestinyId) return;

    // 1) Buscar asignación activa
    const { data: current, error } = await this.supabaseClient
      .from('asignacion_destino')
      .select('idasignaciondestino, iddestino')
      .eq('nroficha', nroficha)
      .is('fechafin', null)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error('Error buscando asignación activa: ' + error.message);
    }

    // 2) Si ya está asignado al mismo destino, no hacer nada
    if (current && current.iddestino === newDestinyId) return;

    // 3) Cerrar asignación activa
    if (current) {
      const { error: closeErr } = await this.supabaseClient
        .from('asignacion_destino')
        .update({ fechafin: new Date().toISOString() })
        .eq('idasignaciondestino', current.idasignaciondestino)
        .is('fechafin', null);

      if (closeErr) throw new Error('Error cerrando asignación activa: ' + closeErr.message);
    } else {
      await this.supabaseClient
        .from('asignacion_destino')
        .update({ fechafin: new Date().toISOString() })
        .eq('nroficha', nroficha)
        .is('fechafin', null);
    }

    // 4) Crear nueva asignación
    const { error: insErr } = await this.supabaseClient
      .from('asignacion_destino')
      .insert([{ nroficha, iddestino: newDestinyId, fechainicio: new Date().toISOString() }]);

    if (insErr) throw new Error('Error creando nueva asignación: ' + insErr.message);
  }

  // ========= UTILIDAD =========
  async getUserAssignedDestiny(nroficha: string) {
    const { data, error } = await this.supabaseClient
      .from('asignacion_destino')
      .select('iddestino, fechainicio, fechafin')
      .eq('nroficha', nroficha)
      .is('fechafin', null)
      .order('fechainicio', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error('Error obteniendo asignación de destino: ' + error.message);
    }
    return data;
  }
}
