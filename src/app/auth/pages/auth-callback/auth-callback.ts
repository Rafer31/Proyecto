import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserDataService } from '../../services/userdata.service';

@Component({
  selector: 'app-auth-callback',
  templateUrl: './auth-callback.html',
  styleUrl: './auth-callback.scss',
})
export default class AuthCallback {
  private authService = inject(AuthService);
  private userDataService = inject(UserDataService);
  private router = inject(Router);

  async ngOnInit() {
    const {
      data: { session },
    } = await this.authService.getSession();

    if (!session) {
      this.router.navigate(['/login']);
      return;
    }

    const user = session.user;

    const createdFromAdmin =
      user.user_metadata?.['created_from_admin'] ||
      user.user_metadata?.['admin_created'];

    if (user.user_metadata?.['needs_password_change'] && createdFromAdmin) {
      this.router.navigate(['/auth/change-password']);
      return;
    }

    if (user.user_metadata?.['needs_password_change']) {
      this.router.navigate(['/auth/change-password']);
      return;
    }

    const authId = user.id;
    const usuario = await this.userDataService.getUserByAuthId(authId);

    if (!usuario) {
      this.router.navigate(['/register-user']);
    } else {

      const userRoleObj = Array.isArray(usuario.roles)
        ? usuario.roles[0]
        : usuario.roles;

      const userRole = userRoleObj?.nomrol;

      switch (userRole) {
        case 'Administrador':
          this.router.navigate(['/users/admin']);
          break;
        case 'Conductor':
          this.router.navigate(['/users/bus-driver']);
          break;
        case 'Personal':
          this.router.navigate(['/users/staff']);
          break;
        case 'Visitante':
          this.router.navigate(['/users/visitant']);
          break;
        default:
          this.router.navigate(['/login']);
      }
    }
  }
}
