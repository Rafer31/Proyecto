import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { UserStateService } from '../../shared/services/user-state.service';

export const roleGuard: CanActivateFn = async (route, state) => {
  const userState = inject(UserStateService);
  const router = inject(Router);

  const currentUser = userState.currentUser();

  if (!currentUser) {
    router.navigate(['/login']);
    return false;
  }

  const allowedRoles = route.data['roles'] as string[] | undefined;

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  const userRoleObj = Array.isArray(currentUser.roles)
    ? currentUser.roles[0]
    : currentUser.roles;

  const userRole = userRoleObj?.nomrol?.toLowerCase();

  if (!userRole) {
    console.error('Usuario sin rol definido');
    router.navigate(['/users']);
    return false;
  }

  const hasRole = allowedRoles.some((role) => role.toLowerCase() === userRole);

  if (!hasRole) {
    console.warn(
      `Usuario con rol "${userRole}" intentó acceder a ruta que requiere roles:`,
      allowedRoles
    );

    switch (userRole) {
      case 'administrador':
        router.navigate(['/users/admin']);
        break;
      case 'personal':
        router.navigate(['/users/staff']);
        break;
      case 'visitante':
        router.navigate(['/users/visitant']);
        break;
      case 'conductor':
        router.navigate(['/users/bus-driver']);
        break;
      default:
        router.navigate(['/users']);
    }

    return false;
  }

  return true;
};
