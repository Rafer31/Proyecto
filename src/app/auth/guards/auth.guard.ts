import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../../shared/services/supabase.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const supabase = inject(SupabaseService).supabase;
  const router = inject(Router);

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.navigate(['/login']);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en authGuard:', error);
    router.navigate(['/login']);
    return false;
  }
};

export const noAuthGuard: CanActivateFn = async (route, state) => {
  const supabase = inject(SupabaseService).supabase;
  const router = inject(Router);

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      router.navigate(['/users']);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en noAuthGuard:', error);
    return true;
  }
};
