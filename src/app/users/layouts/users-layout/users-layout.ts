import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { UserStateService } from '../../../shared/services/user-state.service';
import { SupabaseService } from '../../../shared/services/supabase.service';
import { UserDataService } from '../../../auth/services/userdata.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { filter } from 'rxjs';

@Component({
  selector: 'app-users-layout',
  imports: [RouterOutlet, MatProgressSpinnerModule],
  templateUrl: './users-layout.html',
  styleUrl: './users-layout.scss',
})
export class UsersLayout implements OnInit {
  private router = inject(Router);
  private userState = inject(UserStateService);
  private supabase = inject(SupabaseService).supabase;
  private userDataService = inject(UserDataService);

  isRedirecting = signal(false);

  async ngOnInit() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        if (url === '/users' || url === '/users/') {
          this.redirectToUserRole();
        }
      });

    if (this.router.url === '/users' || this.router.url === '/users/') {
      await this.redirectToUserRole();
    }
  }

  private async redirectToUserRole() {
    if (this.isRedirecting()) return;

    this.isRedirecting.set(true);

    try {
      let currentUser = this.userState.currentUser();

      if (!currentUser) {
        const {
          data: { session },
          error: sessionError,
        } = await this.supabase.auth.getSession();

        if (sessionError) {
          console.error('Error obteniendo sesión:', sessionError);
          this.router.navigate(['/login'], { replaceUrl: true });
          return;
        }

        if (!session) {
          console.log('No hay sesión activa, redirigiendo a login');
          this.router.navigate(['/login'], { replaceUrl: true });
          return;
        }

        try {
          currentUser = await this.userDataService.getUserByAuthId(
            session.user.id
          );
          if (currentUser) {
            this.userState.setUser(currentUser);
          }
        } catch (userError) {
          console.error('Error cargando datos de usuario:', userError);

          await this.supabase.auth.signOut();
          this.router.navigate(['/login'], { replaceUrl: true });
          return;
        }
      }

      if (!currentUser) {
        console.log('Usuario no encontrado, redirigiendo a login');
        this.router.navigate(['/login'], { replaceUrl: true });
        return;
      }

      const userRoleObj = Array.isArray(currentUser.roles)
        ? currentUser.roles[0]
        : currentUser.roles;

      const userRole = userRoleObj?.nomrol;

      if (!userRole) {
        console.error('Usuario sin rol definido:', currentUser);
        await this.supabase.auth.signOut();
        this.router.navigate(['/login'], { replaceUrl: true });
        return;
      }

      console.log('Redirigiendo usuario con rol:', userRole);

      switch (userRole) {
        case 'Administrador':
          await this.router.navigate(['/users/admin'], { replaceUrl: true });
          break;
        case 'Conductor':
          await this.router.navigate(['/users/bus-driver'], {
            replaceUrl: true,
          });
          break;
        case 'Personal':
          await this.router.navigate(['/users/staff'], { replaceUrl: true });
          break;
        case 'Visitante':
          await this.router.navigate(['/users/visitant'], { replaceUrl: true });
          break;
        default:
          console.error('Rol no reconocido:', userRole);
          await this.supabase.auth.signOut();
          await this.router.navigate(['/login'], { replaceUrl: true });
      }
    } catch (error) {
      console.error('Error inesperado redirigiendo usuario:', error);
      await this.supabase.auth.signOut();
      await this.router.navigate(['/login'], { replaceUrl: true });
    } finally {
      this.isRedirecting.set(false);
    }
  }
}
