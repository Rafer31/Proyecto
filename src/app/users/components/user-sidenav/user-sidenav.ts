import { Component, computed, inject, input, OnInit, OnDestroy, ViewChild, AfterViewInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSidenavModule, MatDrawer } from '@angular/material/sidenav';
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
export class UserSidenav implements OnInit, OnDestroy, AfterViewInit {
  private readonly nav = inject(NavStateService);
  private resizeListener?: () => void;

  @ViewChild('drawer') drawer!: MatDrawer;

  appLogo    = input<string>('school');
  appName    = input<string>('Mi App');
  items      = input<NavItem[]>([]);
  routeBrand = input<string>('/');
  collapsed   = this.nav.collapsed;
  drawerMode  = this.nav.drawerMode;
  drawerWidth = this.nav.drawerWidth;

  showText = computed(() => !this.collapsed());
  isResizing = signal(false);

  toggleCollapsed() { this.nav.toggleCollapsed(); }

  ngOnInit() {
    this.checkScreenSize();
    this.resizeListener = () => this.checkScreenSize();
    window.addEventListener('resize', this.resizeListener);
  }

  ngAfterViewInit() {
    // Registrar el drawer en el servicio
    this.nav.setDrawer(this.drawer);
  }

  ngOnDestroy() {
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  private checkScreenSize() {
    this.isResizing.set(true);

    const isMobile = window.innerWidth <= 768;
    this.nav.setOverMode(isMobile);

    // En móvil, NO colapsar - el sidenav debe mostrarse completo cuando se abre
    if (isMobile) {
      this.nav.setCollapsed(false);
    }

    // Reset resizing state after a short delay
    setTimeout(() => this.isResizing.set(false), 100);
  }
}
