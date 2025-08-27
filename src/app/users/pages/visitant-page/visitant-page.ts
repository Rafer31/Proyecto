import { Component } from '@angular/core';
import { NavItem } from '../../../shared/interfaces/nav-item';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';
import { UserSidenav } from '../../components/user-sidenav/user-sidenav';
import { UserToolbar } from '../../components/user-toolbar/user-toolbar';

@Component({
  selector: 'app-visitant-page',
   imports: [UserToolbar, UserSidenav, MatButtonModule, MatIconModule, RouterOutlet],
  templateUrl: './visitant-page.html',
  styleUrl: './visitant-page.scss'
})
export class VisitantPage {
 menu: NavItem[] = [
    {
      icon: 'airport_shuttle',
      label: 'Viajes disponibles',
      route: '/users/staff/available-trips',
    },
  ];
}
