import { inject, Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from '../../shared/services/supabase.service';
import { UserStateService } from '../../shared/services/user-state.service';

@Injectable({ providedIn: 'root' })
export class UserDataService {
  private supabaseClient = inject(SupabaseService).supabase;
  private userStateService = inject(UserStateService);

  async getUserRole(authId: string): Promise<string | null> {
    const { data: usuario, error: errorUser } = await this.supabaseClient
      .from('usuario')
      .select('idrol')
      .eq('auth_id', authId)
      .maybeSingle();

    if (errorUser || !usuario) {
      console.error('Error al obtener usuario:', errorUser);
      return null;
    }

    const { data: rol, error: errorRol } = await this.supabaseClient
      .from('roles')
      .select('nomrol')
      .eq('idrol', usuario.idrol)
      .maybeSingle();

    if (errorRol || !rol) {
      console.error('Error al obtener rol:', errorRol);
      return null;
    }

    return rol.nomrol;
  }

  async getUserByAuthId(authId: string) {
    const { data, error } = await this.supabaseClient
      .from('usuario')
      .select('*')
      .eq('auth_id', authId)
      .maybeSingle();

    if (error) {
      console.error('Error buscando usuario:', error);
      throw error;
    }

    return data;
  }

  async registerUser(userData: any) {
    try {
      const { data: rolData, error: rolError } = await this.supabaseClient
        .from('roles')
        .select('idrol')
        .eq('nomrol', userData.rol)
        .maybeSingle();

      if (rolError || !rolData) {
        throw new Error('No se pudo obtener el rol para el usuario');
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
            auth_id: userData.authId,
            estado: 'Activo',
          },
        ])
        .select()
        .maybeSingle();

      if (userError || !usuarioData) {
        throw new Error('No se pudo insertar usuario');
      }

      if (userData.rol === 'Personal') {
        const { data: personalData, error: personalError } =
          await this.supabaseClient
            .from('personal')
            .insert([
              {
                nroficha: userData.nroficha,
                idusuario: usuarioData.idusuario,
                operacion: userData.operacion,
              },
            ])
            .select()
            .maybeSingle();

        if (personalError || !personalData) {
          throw new Error('No se pudo insertar datos de Personal');
        }

        const { error: asignacionError } = await this.supabaseClient
          .from('asignacion_destino')
          .insert([
            {
              nroficha: userData.nroficha,
              iddestino: userData.iddestino,
              fechainicio: new Date().toISOString(),
            },
          ]);

        if (asignacionError) {
          throw new Error('No se pudo insertar asignación de destino');
        }
      }

      if (userData.rol === 'Visitante') {
        const { error: visitanteError } = await this.supabaseClient
          .from('visitante')
          .insert([
            {
              idusuario: usuarioData.idusuario,
              informacion: userData.informacion,
            },
          ]);

        if (visitanteError) {
          throw new Error('No se pudo insertar datos de Visitante');
        }
      }

      return usuarioData;
    } catch (error) {
      console.error('Error registrando usuario:', error);
      throw error;
    }
  }
  async getActiveUserByAuthId(authId: string) {
    try {
      const { data: usuario, error } = await this.supabaseClient
        .from('usuario')
        .select('*')
        .eq('auth_id', authId)
        .maybeSingle();

      if (error) {
        console.error('Error buscando usuario:', error);
        throw error;
      }

      if (!usuario || usuario.estado !== 'Activo') {
        return null;
      }

      return usuario;
    } catch (error) {
      console.error('Error cargando usuario:', error);
      throw error;
    }
  }

  async loadUserAndUpdateState(authId: string) {
    this.userStateService.setLoading(true);
    this.userStateService.setError(null);

    try {
      const usuario = await this.getActiveUserByAuthId(authId);
      this.userStateService.setUser(usuario);
      return usuario;
    } catch (error) {
      this.userStateService.setError('Error al cargar usuario');
      throw error;
    } finally {
      this.userStateService.setLoading(false);
    }
  }
}
