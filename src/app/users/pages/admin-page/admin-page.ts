import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { UserToolbar } from '../../components/user-toolbar/user-toolbar';
import { NavItem } from '../../../shared/interfaces/nav-item';
import { UserSidenav } from '../../components/user-sidenav/user-sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';
import { UserDataService } from '../../../auth/services/userdata.service';
import { UserStateService } from '../../../shared/services/user-state.service';
import { PendingRatingsCheckerService } from '../../../shared/services/pending-ratings-checker.service';

@Component({
  selector: 'app-admin-page',
  imports: [
    UserToolbar,
    UserSidenav,
    MatButtonModule,
    MatIconModule,
    RouterOutlet,
  ],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
})
export class AdminPage implements OnInit, OnDestroy {
  private userDataService = inject(UserDataService);
  private userStateService = inject(UserStateService);
  private pendingRatingsChecker = inject(PendingRatingsCheckerService);

  userName = this.userStateService.userName;
  isLoading = this.userStateService.isLoading;
  error = this.userStateService.error;

  private unsubscribeRatings?: () => void;

  menu: NavItem[] = [
    { icon: 'home', label: 'Inicio', route: '/users/admin/home' },
    { icon: 'bar_chart', label: 'Estadísticas', route: '/users/admin/charts' },
    {
      icon: 'airport_shuttle',
      label: 'Empresas & vehículos',
      route: '/users/admin/bus-company',
    },
    {
      icon: 'groups',
      label: 'Gestionar usuarios',
      route: '/users/admin/manage-users',
    },
    {
      icon: 'calendar_today',
      label: 'Planificar viajes',
      route: '/users/admin/trip-planning',
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
    const usuario = await this.userDataService.loadCurrentUserFromSession();

    if (usuario?.idusuario) {
      setTimeout(() => {
        this.pendingRatingsChecker.checkAndShowPendingRatings(
          usuario.idusuario
        );
      }, 1000);

      this.unsubscribeRatings =
        this.pendingRatingsChecker.subscribeToCompletedTrips(
          usuario.idusuario
        );
    }
  }
}
