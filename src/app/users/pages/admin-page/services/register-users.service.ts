import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../shared/services/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class RegisterUserService {
  private supabaseClient = inject(SupabaseService).supabase;

  /**
   * Registra un usuario completo desde el panel de administración
   * @param userData - Datos del usuario a registrar
   * @returns Promise con los datos del usuario creado
   */
  async registerUserFromAdmin(userData: any) {
    try {
      // 1. Crear usuario en Auth con metadata especial para identificar que viene del admin
      const { data: authData, error: authError } = await this.supabaseClient.auth.signUp({
        email: userData.email,
        password: 'temporal1234', // Password temporal
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            needs_password_change: true,
            created_from_admin: true, // Flag especial para identificar origen
            admin_created: true
          },
        },
      });

      if (authError) {
        // Manejar errores comunes
        if (authError.message.includes('already registered')) {
          throw new Error('Este email ya está registrado en el sistema');
        }
        throw new Error(authError.message || 'Error al crear el usuario en autenticación');
      }

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario en la autenticación');
      }

      // 2. Buscar el id del rol
      const { data: rolData, error: rolError } = await this.supabaseClient
        .from('roles')
        .select('idrol')
        .eq('nomrol', userData.rol)
        .maybeSingle();

      if (rolError || !rolData) {
        throw new Error(`No se pudo obtener el rol ${userData.rol}`);
      }

      // 3. Insertar en tabla usuario
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

      // 4. Insertar en tabla hija según el rol
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

  /**
   * Inserta datos específicos según el rol del usuario
   * @param rol - Rol del usuario
   * @param idusuario - ID del usuario en la tabla usuario
   * @param userData - Datos adicionales del usuario
   */
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
        // Los administradores también van en la tabla personal
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
        // Solo insertar el registro básico en la tabla conductor
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

  /**
   * Obtiene los roles disponibles para el formulario
   * @returns Promise con array de roles
   */
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

  /**
   * Valida si un CI ya existe en el sistema
   * @param ci - Cédula de identidad a validar
   * @param excludeUserId - ID de usuario a excluir de la validación (para updates)
   * @returns Promise<boolean> - true si el CI ya existe
   */
  async checkCIExists(ci: string, excludeUserId?: string): Promise<boolean> {
    let query = this.supabaseClient
      .from('usuario')
      .select('idusuario')
      .eq('ci', ci);

    if (excludeUserId) {
      query = query.neq('idusuario', excludeUserId);
    }

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 es "no rows returned"
      throw new Error('Error validando CI: ' + error.message);
    }

    return data !== null;
  }

  /**
   * Valida formato de CI boliviano
   * @param ci - Cédula a validar
   * @returns boolean - true si el formato es válido
   */
  validateCIFormat(ci: string): boolean {
    // CI boliviano: entre 7 y 10 dígitos
    const ciPattern = /^\d{7,10}$/;
    return ciPattern.test(ci);
  }

  /**
   * Valida formato de número de celular boliviano
   * @param celular - Número de celular a validar
   * @returns boolean - true si el formato es válido
   */
  validateCelularFormat(celular: string): boolean {
    // Celular boliviano: 8 dígitos, generalmente empieza con 6 o 7
    const celularPattern = /^[67]\d{7}$/;
    return celularPattern.test(celular);
  }

  /**
   * Obtiene información de un usuario por su auth_id
   * @param authId - ID de autenticación del usuario
   * @returns Promise con datos del usuario o null
   */
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

  /**
   * Limpia datos de usuario incompletos en caso de error durante el registro
   * @param authId - ID de autenticación del usuario a limpiar
   */
  async cleanupIncompleteUser(authId: string) {
    try {
      // Obtener usuario por auth_id
      const usuario = await this.getUserByAuthId(authId);

      if (usuario) {
        // Eliminar de tablas hijas primero
        await this.deleteRoleSpecificData(usuario.idusuario);

        // Eliminar de tabla usuario
        await this.supabaseClient
          .from('usuario')
          .delete()
          .eq('auth_id', authId);
      }
    } catch (error) {
      console.warn('Error limpiando usuario incompleto:', error);
      // No lanzar error aquí para no interferir con el manejo principal
    }
  }

  /**
   * Elimina datos específicos de rol para un usuario
   * @param idusuario - ID del usuario
   */
  private async deleteRoleSpecificData(idusuario: string) {
    // Intentar eliminar de todas las tablas hijas
    const promises = [
      this.supabaseClient.from('personal').delete().eq('idusuario', idusuario),
      this.supabaseClient.from('visitante').delete().eq('idusuario', idusuario),
      this.supabaseClient.from('conductor').delete().eq('idusuario', idusuario),
    ];

    // Ejecutar todas las eliminaciones (algunas fallarán si no existen registros)
    await Promise.allSettled(promises);
  }
}
