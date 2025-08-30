import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../shared/services/supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase = inject(SupabaseService).supabase;
  async signUp(email: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password: 'temporal1234',
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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
