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

    // 🔑 NUEVO: Verificar si fue creado desde el admin
    const createdFromAdmin = user.user_metadata?.['created_from_admin'] ||
                           user.user_metadata?.['admin_created'];

    // Si tiene flag de cambiar contraseña Y fue creado desde admin,
    // lo mandamos directo a change-password
    if (user.user_metadata?.['needs_password_change'] && createdFromAdmin) {
      this.router.navigate(['/auth/change-password']);
      return;
    }

    // 🔑 Si tiene flag de cambiar contraseña pero NO fue creado desde admin,
    // lo mandamos a change-password (flujo normal de registro público)
    if (user.user_metadata?.['needs_password_change']) {
      this.router.navigate(['/auth/change-password']);
      return;
    }

    // Caso normal: verificamos rol en la DB (usuarios ya existentes)
    const authId = user.id;
    const usuario = await this.userDataService.getUserByAuthId(authId);

    if (!usuario) {
      // Si no existe usuario en BD, redirigir a registro
      this.router.navigate(['/register-user']);
    } else {
      // Redirigir según el rol del usuario
      switch (usuario.rol) {
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
