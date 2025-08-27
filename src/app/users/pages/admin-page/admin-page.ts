import { Component, signal } from '@angular/core';
import { UserToolbar } from '../../components/user-toolbar/user-toolbar';
import { NavItem } from '../../../shared/interfaces/nav-item';
import { UserSidenav } from '../../components/user-sidenav/user-sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';
import { Emptystate } from '../../components/emptystate/emptystate';

@Component({
  selector: 'app-admin-page',
  imports: [
    UserToolbar,
    UserSidenav,
    MatButtonModule,
    MatIconModule,
    RouterOutlet,
    Emptystate
  ],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
})
export class AdminPage {
  userName = signal('Rafael');
  data = signal<string | null>(null);
  menu: NavItem[] = [
    { icon: 'bar_chart', label: 'Estadísticas', route: '/users/admin/charts' },
    {
      icon: 'airport_shuttle',
      label: 'Empresas Contratistas',
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
}
