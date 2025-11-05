import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { NavItem } from '../../../shared/interfaces/nav-item';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';
import { UserSidenav } from '../../components/user-sidenav/user-sidenav';
import { UserToolbar } from '../../components/user-toolbar/user-toolbar';
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
  private userDataService = inject(UserDataService);
  private userStateService = inject(UserStateService);
  private pendingRatingsChecker = inject(PendingRatingsCheckerService);

  userName = this.userStateService.userName;
  isLoading = this.userStateService.isLoading;
  error = this.userStateService.error;

  private unsubscribeRatings?: () => void;

  menu: NavItem[] = [
    {
      icon: 'home',
      label: 'Inicio',
      route: '/users/staff/home',
    },
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
