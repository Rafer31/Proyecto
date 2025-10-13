import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../../shared/services/supabase.service';

export const firstLoginGuard: CanActivateFn = async (route, state) => {
  const supabase = inject(SupabaseService).supabase;
  const router = inject(Router);

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return true;
    }

    const needsPasswordChange =
      session.user?.user_metadata?.['needs_password_change'];

    if (needsPasswordChange === true) {
      console.log('Usuario necesita cambiar contraseña, redirigiendo...');
      router.navigate(['/auth/change-password']);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en firstLoginGuard:', error);
    return true;
  }
};

/**
 * Guard que permite acceso a la página de cambio de contraseña
 * solo si el usuario necesita cambiar su contraseña
 */
export const changePasswordGuard: CanActivateFn = async (route, state) => {
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

    const needsPasswordChange =
      session.user?.user_metadata?.['needs_password_change'];

    if (needsPasswordChange !== true) {
      router.navigate(['/users']);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en changePasswordGuard:', error);
    router.navigate(['/login']);
    return false;
  }
};
