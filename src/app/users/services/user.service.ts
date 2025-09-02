import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../shared/services/supabase.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private supabaseClient = inject(SupabaseService).supabase;

  // 🔹 CAMBIO PRINCIPAL: Traer TODOS los usuarios activos de una vez
  async getAllUsers() {
    const { data, count, error } = await this.supabaseClient
      .from('usuario')
      .select(
        `
        idusuario,
        numcelular,
        nomusuario,
        patusuario,
        matusuario,
        ci,
        idrol,
        auth_id,
        estado,
        roles!usuario_idrol_fkey ( idrol, nomrol ),
        personal ( nroficha, operacion ),
        visitante ( idvisitante, informacion ),
        conductor ( idconductor )
         asignacion_destino ( idasignacion, iddestino, observacion, fechainicio, fechafin, destino )
      `,
        { count: 'exact' }
      )
      .eq('estado', 'Activo')
      .order('idusuario', { ascending: true }); // Ordenar consistentemente

    if (error) throw error;

    const usuarios = (data || []).map((u: any) => {
      let extraInfo = '-';
      let nroficha = '-';

      const rol = u.roles?.nomrol;

      switch (rol) {
        case 'Personal':
        case 'Administrador':
          nroficha = u.personal ? u.personal.nroficha : '-';
          break;
        case 'Visitante':
          extraInfo = u.visitante?.informacion ?? '-';
          break;
      }

      return {
        ...u,
        roles: u.roles ? [u.roles] : [],
        extraInfo,
        nroficha,
      };
    });

    return { data: usuarios, count };
  }

  // 🔹 Mantener método legacy para compatibilidad (pero usar getAllUsers internamente)
  async getUsers(page: number, limit: number) {
    const from = page * limit;
    const to = from + limit - 1;

    const { data, count, error } = await this.supabaseClient
      .from('usuario')
      .select(
        `
      idusuario,
      numcelular,
      nomusuario,
      patusuario,
      matusuario,
      ci,
      idrol,
      auth_id,
      estado,
      roles!usuario_idrol_fkey ( idrol, nomrol ),
      personal ( nroficha, operacion ),
      visitante ( idvisitante, informacion ),
      conductor ( idconductor )
    `,
        { count: 'exact' }
      )
      .eq('estado', 'Activo')
      .order('idusuario', { ascending: true })
      .range(from, to); // 👈 aquí está la magia

    if (error) throw error;

    const usuarios = (data || []).map((u: any) => {
      let extraInfo = '-';
      let nroficha = '-';

      const rol = u.roles?.nomrol;

      switch (rol) {
        case 'Personal':
        case 'Administrador':
          nroficha = u.personal ? u.personal.nroficha : '-';
          break;
        case 'Visitante':
          extraInfo = u.visitante?.informacion ?? '-';
          break;
      }

      return {
        ...u,
        roles: u.roles ? [u.roles] : [],
        extraInfo,
        nroficha,
      };
    });

    return { data: usuarios, count };
  }

  async filterUsersByRole(roleId: number) {
    const { data, error } = await this.supabaseClient
      .from('usuario')
      .select(
        'idusuario, nomusuario, patusuario, matusuario, numcelular, idrol'
      )
      .eq('estado', 'Activo') // 🔹 Solo activos
      .eq('idrol', roleId);

    if (error) {
      console.error('Error al filtrar usuarios:', error);
      throw error;
    }
    return data;
  }

  async getRoles() {
    const { data, error } = await this.supabaseClient
      .from('roles')
      .select('idrol, nomrol');

    if (error) {
      console.error('Error al obtener roles:', error);
      throw error;
    }
    return data;
  }
  // ✅ Nuevo método en UserService
  async updateObservation(userId: string, observacion: string) {
    // Asumimos que un usuario solo tiene una asignación activa
    const { data, error } = await this.supabaseClient
      .from('asignacion_destino')
      .update({ observacion })
      .eq(
        'nroficha',
        (
          await this.supabaseClient
            .from('personal')
            .select('nroficha')
            .eq('idusuario', userId)
            .maybeSingle()
        ).data?.nroficha || null
      )
      .is('fechafin', null) // 👈 solo la asignación activa
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
