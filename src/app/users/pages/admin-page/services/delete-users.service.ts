import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../shared/services/supabase.service';

@Injectable({ providedIn: 'root' })
export class DeleteUserService {
  private supabaseClient = inject(SupabaseService).supabase;

  // ========= PÚBLICO =========
  async softDeleteUser(userId: string) {
    try {
      // 1) Traer usuario básico
      const { data: userData, error: userError } = await this.supabaseClient
        .from('usuario')
        .select('idusuario, estado, idrol')
        .eq('idusuario', userId)
        .maybeSingle();

      if (userError) throw new Error(userError.message);
      if (!userData) throw new Error('No se pudo obtener el usuario');

      // 2) Traer rol
      const { data: roleData, error: roleError } = await this.supabaseClient
        .from('roles')
        .select('idrol, nomrol')
        .eq('idrol', userData.idrol)
        .maybeSingle();

      if (roleError) throw new Error(roleError.message);
      const rol = roleData ? roleData.nomrol : undefined;

      // 3) Traer tablas hijas
      const { data: personal } = await this.supabaseClient
        .from('personal')
        .select('nroficha')
        .eq('idusuario', userId)
        .maybeSingle();

      const { data: visitante } = await this.supabaseClient
        .from('visitante')
        .select('idvisitante')
        .eq('idusuario', userId)
        .maybeSingle();

      const { data: conductor } = await this.supabaseClient
        .from('conductor')
        .select('idconductor')
        .eq('idusuario', userId)
        .maybeSingle();

      // 4) Cambiar estado a INACTIVO
      const { error: userUpdateError } = await this.supabaseClient
        .from('usuario')
        .update({ estado: 'Inactivo' })
        .eq('idusuario', userId);

      if (userUpdateError) throw new Error(userUpdateError.message);

      // 5) Borrar datos de tablas hijas según rol
      switch (rol) {
        case 'Personal':
        case 'Administrador':
          if (personal?.nroficha) {
            await this.closeDestinyAssignments(personal.nroficha);
          }
          await this.deleteIfExists('personal', { idusuario: userId });
          break;

        case 'Visitante':
          await this.deleteIfExists('visitante', { idusuario: userId });
          break;

        case 'Conductor':
          await this.deleteIfExists('conductor', { idusuario: userId });
          break;
      }

      return true;
    } catch (err: any) {
      console.error('Error al eliminar usuario:', err);
      throw new Error(err.message || 'Error eliminando usuario');
    }
  }

  // ========= UTILIDAD =========
  private async deleteIfExists(
    table: 'personal' | 'visitante' | 'conductor',
    where: Record<string, any>
  ) {
    const { error } = await this.supabaseClient
      .from(table)
      .delete()
      .match(where);
    if (error) throw new Error(`Error borrando en ${table}: ${error.message}`);
  }

  private async closeDestinyAssignments(nroficha: string) {
    const { error } = await this.supabaseClient
      .from('asignacion_destino')
      .update({ fechafin: new Date().toISOString() })
      .eq('nroficha', nroficha)
      .is('fechafin', null);

    if (error) throw new Error('Error cerrando asignaciones: ' + error.message);
  }
}
