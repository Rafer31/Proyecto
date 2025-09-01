import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../shared/services/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class RegisterUserService {
  private supabaseClient = inject(SupabaseService).supabase;

  async registerUserFromAdmin(userData: any) {
    try {

      const { data: authData, error: authError } = await this.supabaseClient.auth.signUp({
        email: userData.email,
        password: 'temporal1234',
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            needs_password_change: true,
            created_from_admin: true,
            admin_created: true
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('Este email ya está registrado en el sistema');
        }
        throw new Error(authError.message || 'Error al crear el usuario en autenticación');
      }

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario en la autenticación');
      }
      const { data: rolData, error: rolError } = await this.supabaseClient
        .from('roles')
        .select('idrol')
        .eq('nomrol', userData.rol)
        .maybeSingle();

      if (rolError || !rolData) {
        throw new Error(`No se pudo obtener el rol ${userData.rol}`);
      }

      const { data: usuarioData, error: userError } = await this.supabaseClient
        .from('usuario')
        .insert([
          {
            nomusuario: userData.nombre,
            patusuario: userData.paterno,
            matusuario: userData.materno,
            numcelular: userData.numcelular,
            ci: userData.ci,
            idrol: rolData.idrol,
            auth_id: authData.user.id,
          },
        ])
        .select()
        .maybeSingle();

      if (userError || !usuarioData) {
        throw new Error('No se pudo insertar el usuario en la base de datos');
      }

      await this.insertRoleSpecificData(userData.rol, usuarioData.idusuario, userData);

      return {
        usuario: usuarioData,
        authUser: authData.user
      };

    } catch (error: any) {
      console.error('Error registrando usuario desde admin:', error);
      throw new Error(error.message || 'Error al registrar el usuario');
    }
  }
  private async insertRoleSpecificData(rol: string, idusuario: string, userData: any) {
    switch (rol) {
      case 'Personal':
        const { error: personalError } = await this.supabaseClient
          .from('personal')
          .insert([
            {
              nroficha: userData.nroficha,
              idusuario: idusuario,
              operacion: userData.operacion,
              direccion: userData.direccion,
            },
          ]);

        if (personalError) {
          throw new Error(`Error insertando datos de Personal: ${personalError.message}`);
        }
        break;

      case 'Administrador':

        const { error: adminError } = await this.supabaseClient
          .from('personal')
          .insert([
            {
              nroficha: userData.nroficha,
              idusuario: idusuario,
              operacion: userData.operacion,
              direccion: userData.direccion,
            },
          ]);

        if (adminError) {
          throw new Error(`Error insertando datos de Administrador: ${adminError.message}`);
        }
        break;

      case 'Visitante':
        const { error: visitanteError } = await this.supabaseClient
          .from('visitante')
          .insert([
            {
              idusuario: idusuario,
              informacion: userData.informacion,
            },
          ]);

        if (visitanteError) {
          throw new Error(`Error insertando datos de Visitante: ${visitanteError.message}`);
        }
        break;

      case 'Conductor':

        const { error: conductorError } = await this.supabaseClient
          .from('conductor')
          .insert([
            {
              idusuario: idusuario,
            },
          ]);

        if (conductorError) {
          throw new Error(`Error insertando datos de Conductor: ${conductorError.message}`);
        }
        break;

      default:
        throw new Error(`Rol ${rol} no soportado para registro automático`);
    }
  }

  async getRoles() {
    const { data, error } = await this.supabaseClient
      .from('roles')
      .select('idrol, nomrol')
      .order('nomrol');

    if (error) {
      throw new Error('Error al obtener los roles: ' + error.message);
    }

    return data || [];
  }

  async checkCIExists(ci: string, excludeUserId?: string): Promise<boolean> {
    let query = this.supabaseClient
      .from('usuario')
      .select('idusuario')
      .eq('ci', ci);

    if (excludeUserId) {
      query = query.neq('idusuario', excludeUserId);
    }

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error('Error validando CI: ' + error.message);
    }

    return data !== null;
  }

  validateCIFormat(ci: string): boolean {
    const ciPattern = /^\d{7,10}$/;
    return ciPattern.test(ci);
  }

  validateCelularFormat(celular: string): boolean {
    const celularPattern = /^[67]\d{7}$/;
    return celularPattern.test(celular);
  }

  async getUserByAuthId(authId: string) {
    const { data, error } = await this.supabaseClient
      .from('usuario')
      .select(`
        *,
        roles(idrol, nomrol),
        personal(nroficha, operacion, direccion),
        visitante(informacion),
        conductor(idconductor)
      `)
      .eq('auth_id', authId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error('Error obteniendo usuario: ' + error.message);
    }

    return data;
  }

  async cleanupIncompleteUser(authId: string) {
    try {
      const usuario = await this.getUserByAuthId(authId);

      if (usuario) {
        await this.deleteRoleSpecificData(usuario.idusuario);
        await this.supabaseClient
          .from('usuario')
          .delete()
          .eq('auth_id', authId);
      }
    } catch (error) {
      console.warn('Error limpiando usuario incompleto:', error);

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
