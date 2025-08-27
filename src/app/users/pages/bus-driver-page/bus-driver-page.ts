import { Component } from '@angular/core';
import { NavItem } from '../../../shared/interfaces/nav-item';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';
import { UserSidenav } from '../../components/user-sidenav/user-sidenav';
import { UserToolbar } from '../../components/user-toolbar/user-toolbar';

@Component({
  selector: 'app-bus-driver-page',
  imports: [UserToolbar, UserSidenav, MatButtonModule, MatIconModule, RouterOutlet],
  templateUrl: './bus-driver-page.html',
  styleUrl: './bus-driver-page.scss'
})
export class BusDriverPage {
 menu: NavItem[] = [
    { icon: 'bus_alert', label: 'Viajes asignados', route: '/users/bus-driver/assigned-trips' },

  ];
}
