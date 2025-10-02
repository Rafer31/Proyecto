import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { UserToolbar } from '../../components/user-toolbar/user-toolbar';
import { NavItem } from '../../../shared/interfaces/nav-item';
import { UserSidenav } from '../../components/user-sidenav/user-sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';
import { SupabaseService } from '../../../shared/services/supabase.service';
import { UserDataService } from '../../../auth/services/userdata.service';
import { UserStateService } from '../../../shared/services/user-state.service';

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
export class AdminPage implements OnInit {
  private supabaseService = inject(SupabaseService);
  private userDataService = inject(UserDataService);
  private userStateService = inject(UserStateService);

  userName = this.userStateService.userName;
  isLoading = this.userStateService.isLoading;
  error = this.userStateService.error;

  menu: NavItem[] = [
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

  private async cargarUsuario() {
    try {
      const { data: { user }, error: authError } = await this.supabaseService.supabase.auth.getUser();

      if (authError || !user) {
        console.error('Error obteniendo usuario autenticado:', authError);
        this.userStateService.setError('Error de autenticación');
        return;
      }

      await this.userDataService.loadUserAndUpdateState(user.id);
    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
      this.userStateService.setError('Error al cargar datos del usuario');
    }
  }
}
