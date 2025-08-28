import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../shared/services/supabase.service';
import { Usuario } from '../../shared/interfaces/user';

@Injectable({ providedIn: 'root' })
export class UserDataService {
  private supabaseClient = inject(SupabaseService).supabase;

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
}
