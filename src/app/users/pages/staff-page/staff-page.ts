import { Component, inject, OnInit } from '@angular/core';
import { NavItem } from '../../../shared/interfaces/nav-item';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';
import { UserSidenav } from '../../components/user-sidenav/user-sidenav';
import { UserToolbar } from '../../components/user-toolbar/user-toolbar';
import { SupabaseService } from '../../../shared/services/supabase.service';
import { UserDataService } from '../../../auth/services/userdata.service';
import { UserStateService } from '../../../shared/services/user-state.service';

@Component({
  selector: 'app-staff-page',
  imports: [UserToolbar, UserSidenav, MatButtonModule, MatIconModule, RouterOutlet],
  templateUrl: './staff-page.html',
  styleUrl: './staff-page.scss',
})
export class StaffPage implements OnInit {
  private supabaseService = inject(SupabaseService);
  private userDataService = inject(UserDataService);
  private userStateService = inject(UserStateService);

  userName = this.userStateService.userName;
  isLoading = this.userStateService.isLoading;
  error = this.userStateService.error;

  menu: NavItem[] = [
    {
      icon: 'airport_shuttle',
      label: 'Viajes disponibles',
      route: '/users/staff/available-trips',
    },
  ];

  async ngOnInit() {
    // Siempre recargar el usuario al iniciar
    await this.cargarUsuario();
  }

  private async cargarUsuario() {
    try {
      this.userStateService.setLoading(true);

      const { data: { user }, error: authError } =
        await this.supabaseService.supabase.auth.getUser();

      if (authError || !user) {
        console.error('Error obteniendo usuario autenticado:', authError);
        this.userStateService.setError('Error de autenticación');
        return;
      }

      // Forzar recarga del usuario desde la base de datos
      await this.userDataService.loadUserAndUpdateState(user.id);
    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
      this.userStateService.setError('Error al cargar datos del usuario');
    } finally {
      this.userStateService.setLoading(false);
    }
  }
}
