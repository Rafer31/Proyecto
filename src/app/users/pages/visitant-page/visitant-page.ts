import { Component, inject } from '@angular/core';
import { NavItem } from '../../../shared/interfaces/nav-item';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';
import { UserSidenav } from '../../components/user-sidenav/user-sidenav';
import { UserToolbar } from '../../components/user-toolbar/user-toolbar';
import { UserDataService } from '../../../auth/services/userdata.service';
import { UserStateService } from '../../../shared/services/user-state.service';

@Component({
  selector: 'app-visitant-page',
  imports: [
    UserToolbar,
    UserSidenav,
    MatButtonModule,
    MatIconModule,
    RouterOutlet,
  ],
  templateUrl: './visitant-page.html',
  styleUrl: './visitant-page.scss',
})
export class VisitantPage {
  private userDataService = inject(UserDataService);
  private userStateService = inject(UserStateService);
  userName = this.userStateService.userName;
  isLoading = this.userStateService.isLoading;
  error = this.userStateService.error;

  menu: NavItem[] = [
    {
      icon: 'home',
      label: 'Inicio',
      route: '/users/visitant/home',
    },
    {
      icon: 'airport_shuttle',
      label: 'Viajes disponibles',
      route: '/users/visitant/available-visitant-trips',
    },
  ];

  async ngOnInit() {
    await this.cargarUsuario();
  }

  private async cargarUsuario() {
    await this.userDataService.loadCurrentUserFromSession();
  }
}
