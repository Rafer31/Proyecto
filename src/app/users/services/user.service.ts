import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../shared/services/supabase.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private supabaseClient = inject(SupabaseService).supabase;

  async getUsers(page: number, limit: number) {
    const from = (page - 1) * limit;
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
      roles!usuario_idrol_fkey ( idrol, nomrol ),
      personal ( nroficha, operacion, direccion ),
      visitante ( idvisitante, informacion ),
      conductor ( idconductor )
    `,
        { count: 'exact' }
      )
      .range(from, to);

    if (error) throw error;

    // Normalizar y agregar un campo extraInfo para la UI
    const usuarios = (data || []).map((u: any) => {
      let extraInfo = '-';
      let nroficha = '-';

      const rol = u.roles?.nomrol;

      switch (rol) {
        case 'Personal':
        case 'Administrador':
          extraInfo = '-';
          nroficha = u.personal ? u.personal.nroficha : '-';
          break;
        case 'Visitante':
          extraInfo = u.visitante?.informacion ?? '-';
          nroficha = '-';
          break;
        case 'Conductor':
          extraInfo = '-';
          nroficha = '-';
          break;
        default:
          extraInfo = '-';
          nroficha = '-';
      }

      return { ...u, roles: u.roles ? [u.roles] : [], extraInfo, nroficha };
    });

    return { data: usuarios, count };
  }

  async searchUsers(query: string) {
    const { data, error } = await this.supabaseClient
      .from('usuario')
      .select(
        'idusuario, nomusuario, patusuario, matusuario, numcelular, idrol'
      )
      .or(
        `nomusuario.ilike.%${query}%,patusuario.ilike.%${query}%,matusuario.ilike.%${query}%`
      );

    if (error) {
      console.error('Error al buscar usuarios:', error);
      throw error;
    }

    return data;
  }

  async filterUsersByRole(roleId: number) {
    const { data, error } = await this.supabaseClient
      .from('usuario')
      .select(
        'idusuario, nomusuario, patusuario, matusuario, numcelular, idrol'
      )
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
}
