import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../../shared/services/supabase.service';
import { UserDataService } from '../../auth/services/userdata.service';
import { withTimeout } from '../../shared/utils/timeout.util';

export const firstLoginGuard: CanActivateFn = async (route, state) => {
  const supabase = inject(SupabaseService).supabase;
  const router = inject(Router);
  try {
    const {
      data: { session },
    } = await withTimeout(
      supabase.auth.getSession(),
      10000,
      'Verificación de sesión excedió el tiempo límite'
    );
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

export const changePasswordGuard: CanActivateFn = async (route, state) => {
  const supabase = inject(SupabaseService).supabase;
  const router = inject(Router);
  try {
    const {
      data: { session },
    } = await withTimeout(
      supabase.auth.getSession(),
      10000,
      'Verificación de sesión excedió el tiempo límite'
    );
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

export const registrationStatusGuard: CanActivateFn = async (route, state) => {
  const supabase = inject(SupabaseService).supabase;
  const userDataService = inject(UserDataService);
  const router = inject(Router);

  try {
    const {
      data: { session },
    } = await withTimeout(
      supabase.auth.getSession(),
      10000,
      'Verificación de sesión excedió el tiempo límite'
    );

    if (!session) {
      router.navigate(['/login']);
      return false;
    }

    const authId = session.user.id;

    try {
      const usuario = await withTimeout(
        userDataService.getUserByAuthId(authId),
        10000,
        'No se pudo cargar la información del usuario'
      );

      if (usuario) {
        const userRoleObj = Array.isArray(usuario.roles)
          ? usuario.roles[0]
          : usuario.roles;
        const userRole = userRoleObj?.nomrol;

        switch (userRole) {
          case 'Administrador':
            router.navigate(['/users/admin']);
            break;
          case 'Conductor':
            router.navigate(['/users/bus-driver']);
            break;
          case 'Personal':
            router.navigate(['/users/staff']);
            break;
          case 'Visitante':
            router.navigate(['/users/visitant']);
            break;
          default:
            router.navigate(['/users']);
        }

        return false;
      }

      return true;
    } catch (userError) {
      console.error('Error verificando usuario:', userError);

      return true;
    }
  } catch (error) {
    console.error('Error en registrationStatusGuard:', error);
    router.navigate(['/login']);
    return false;
  }
};
