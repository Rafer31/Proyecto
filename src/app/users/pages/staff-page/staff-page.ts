import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { NavItem } from '../../../shared/interfaces/nav-item';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';
import { UserSidenav } from '../../components/user-sidenav/user-sidenav';
import { UserToolbar } from '../../components/user-toolbar/user-toolbar';
import { SupabaseService } from '../../../shared/services/supabase.service';
import { UserDataService } from '../../../auth/services/userdata.service';
import { UserStateService } from '../../../shared/services/user-state.service';
import { PendingRatingsCheckerService } from '../../../shared/services/pending-ratings-checker.service';

@Component({
  selector: 'app-staff-page',
  imports: [
    UserToolbar,
    UserSidenav,
    MatButtonModule,
    MatIconModule,
    RouterOutlet,
  ],
  templateUrl: './staff-page.html',
  styleUrl: './staff-page.scss',
})
export class StaffPage implements OnInit, OnDestroy {
  private supabaseService = inject(SupabaseService);
  private userDataService = inject(UserDataService);
  private userStateService = inject(UserStateService);
  private pendingRatingsChecker = inject(PendingRatingsCheckerService);

  userName = this.userStateService.userName;
  isLoading = this.userStateService.isLoading;
  error = this.userStateService.error;

  private unsubscribeRatings?: () => void;

  menu: NavItem[] = [
    {
      icon: 'airport_shuttle',
      label: 'Viajes disponibles',
      route: '/users/staff/available-trips',
    },
    {
      icon: 'keyboard_return',
      label: 'Retornos disponibles',
      route: '/users/staff/available-returns',
    },
  ];

  async ngOnInit() {
    await this.cargarUsuario();
  }

  ngOnDestroy() {
    if (this.unsubscribeRatings) {
      this.unsubscribeRatings();
    }
  }

  private async cargarUsuario() {
    try {
      this.userStateService.setLoading(true);

      const {
        data: { user },
        error: authError,
      } = await this.supabaseService.supabase.auth.getUser();

      if (authError || !user) {
        console.error('Error obteniendo usuario autenticado:', authError);
        this.userStateService.setError('Error de autenticación');
        return;
      }

      await this.userDataService.loadUserAndUpdateState(user.id);

      const currentUser = this.userStateService.currentUser();
      if (currentUser?.idusuario) {
        setTimeout(() => {
          this.pendingRatingsChecker.checkAndShowPendingRatings(
            currentUser.idusuario
          );
        }, 1000);

        this.unsubscribeRatings =
          this.pendingRatingsChecker.subscribeToCompletedTrips(
            currentUser.idusuario
          );
      }
    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
      this.userStateService.setError('Error al cargar datos del usuario');
    } finally {
      this.userStateService.setLoading(false);
    }
  }
}
