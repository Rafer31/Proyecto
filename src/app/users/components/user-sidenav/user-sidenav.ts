import { Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';
import { NavItem } from '../../../shared/interfaces/nav-item';
import { NavStateService } from '../../../shared/services/nav-state.service';

@Component({
  selector: 'app-user-sidenav',
  imports: [
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
  ],
  templateUrl: './user-sidenav.html',
  styleUrl: './user-sidenav.scss',
})
export class UserSidenav {
  private readonly nav = inject(NavStateService);

  appLogo    = input<string>('school');
  appName    = input<string>('Mi App');
  items      = input<NavItem[]>([]);
  routeBrand = input<string>('/');
  collapsed   = this.nav.collapsed;
  drawerMode  = this.nav.drawerMode;
  drawerWidth = this.nav.drawerWidth;


  showText = computed(() => !this.collapsed());
  toggleCollapsed() { this.nav.toggleCollapsed(); }
}
