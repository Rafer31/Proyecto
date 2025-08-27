import { Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavStateService } from '../../../shared/services/nav-state.service';

@Component({
  selector: 'app-user-toolbar',
  imports: [
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './user-toolbar.html',
  styleUrl: './user-toolbar.scss',
})
export class UserToolbar {
  private readonly nav = inject(NavStateService);

  appTitle = input<string>('Mi App');
  userName = input<string>('Usuario');
  showNavBtn = input<boolean>(true);

  collapsed = this.nav.collapsed;

  toggleNav() {
    this.nav.toggleCollapsed();
  }
}
