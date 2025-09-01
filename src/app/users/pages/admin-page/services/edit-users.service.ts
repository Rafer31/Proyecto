import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../shared/services/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class EditUsersService {
  private supabaseClient = inject(SupabaseService).supabase;

  async updateUser(userId: string, userData: any) {
    try {
      // 1. Actualizar tabla usuario (datos generales)
      // NOTA: NO incluimos email porque está en auth.users, no en nuestra tabla usuario
      const { error: userError } = await this.supabaseClient
        .from('usuario')
        .update({
          nomusuario: userData.nombre,
          patusuario: userData.paterno,
          matusuario: userData.materno,
          numcelular: userData.numcelular,
          ci: userData.ci,
          idrol: userData.idrol, // lo recibes resuelto desde el front
        })
        .eq('idusuario', userId);

      if (userError) {
        throw new Error('Error actualizando usuario: ' + userError.message);
      }

      // 2. Borrar datos anteriores de rol específico (para evitar basura)
      await this.deleteRoleSpecificData(userId);

      // 3. Insertar datos del rol actual
      await this.insertRoleSpecificData(userData.rol, userId, userData);

      return true;
    } catch (error: any) {
      console.error('Error editando usuario:', error);
      throw new Error(error.message || 'Error al editar usuario');
    }
  }

  private async insertRoleSpecificData(rol: string, idusuario: string, userData: any) {
    switch (rol) {
      case 'Personal':
      case 'Administrador':
        const { error: personalError } = await this.supabaseClient
          .from('personal')
          .insert([
            {
              nroficha: userData.nroficha,
              idusuario,
              operacion: userData.operacion,
              direccion: userData.direccion,
            },
          ]);
        if (personalError) {
          throw new Error(`Error insertando datos de ${rol}: ${personalError.message}`);
        }
        break;

      case 'Visitante':
        const { error: visitanteError } = await this.supabaseClient
          .from('visitante')
          .insert([{ idusuario, informacion: userData.informacion }]);
        if (visitanteError) {
          throw new Error(`Error insertando datos de Visitante: ${visitanteError.message}`);
        }
        break;

      case 'Conductor':
        const { error: conductorError } = await this.supabaseClient
          .from('conductor')
          .insert([{ idusuario }]);
        if (conductorError) {
          throw new Error(`Error insertando datos de Conductor: ${conductorError.message}`);
        }
        break;

      default:
        throw new Error(`Rol ${rol} no soportado para edición`);
    }
  }

  private async deleteRoleSpecificData(idusuario: string) {
    const promises = [
      this.supabaseClient.from('personal').delete().eq('idusuario', idusuario),
      this.supabaseClient.from('visitante').delete().eq('idusuario', idusuario),
      this.supabaseClient.from('conductor').delete().eq('idusuario', idusuario),
    ];
    await Promise.allSettled(promises);
  }

}
