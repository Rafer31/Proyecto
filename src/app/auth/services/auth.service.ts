import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../shared/services/supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase = inject(SupabaseService).supabase;
  async signUp(email: string) {
    // Usar la URL correcta dependiendo del entorno
    const redirectUrl = window.location.hostname === 'localhost'
      ? `${window.location.origin}/auth/callback`
      : 'https://transporte-illapa.web.app/auth/callback';

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password: 'temporal1234',
      options: {
        emailRedirectTo: redirectUrl,
        data: { needs_password_change: true },
      },
    });

    if (error) throw error;
    return data;
  }

  async updatePassword(newPassword: string) {
    const { data, error } = await this.supabase.auth.updateUser({
      password: newPassword,
      data: { needs_password_change: false },
    });

    if (error) throw error;
    return data;
  }

  async getSession() {
    return await this.supabase.auth.getSession();
  }
}
