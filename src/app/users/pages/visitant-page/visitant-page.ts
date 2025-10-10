import { Component, inject } from '@angular/core';
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
      route: '/users/visitant/available-visitant-trips',
    },
  ];

  async ngOnInit() {
    await this.cargarUsuario();
  }

  private async cargarUsuario() {
    try {
      this.userStateService.setLoading(true);

      const supabase = this.supabaseService.supabase;

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Error obteniendo sesión:', sessionError);
        this.userStateService.setError('Error al obtener sesión');
        return;
      }

      if (session?.user) {
        await this.userDataService.loadUserAndUpdateState(session.user.id);
        return;
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await this.userDataService.loadUserAndUpdateState(session!.user.id);
          subscription.unsubscribe();
        }
      });
    } catch (error) {
      console.error('Error cargando datos del usuario visitante:', error);
      this.userStateService.setError('Error al cargar datos del usuario');
    } finally {
      this.userStateService.setLoading(false);
    }
  }
}
