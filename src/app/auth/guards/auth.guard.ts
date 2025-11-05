import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../../shared/services/supabase.service';
import { withTimeout, isTimeoutError, isNetworkError } from '../../shared/utils/timeout.util';

export const authGuard: CanActivateFn = async (route, state) => {
  const supabase = inject(SupabaseService).supabase;
  const router = inject(Router);

  try {
    const {
      data: { session },
    } = await withTimeout(
      supabase.auth.getSession(),
      5000,
      'Verificación de sesión excedió el tiempo límite'
    );

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

  setTimeout(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.navigate(['/users']);
      }
    } catch (error) {
      console.error('Error verificando sesión en background:', error);
    }
  }, 0);

  return true;
};
