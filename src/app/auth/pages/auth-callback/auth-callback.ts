import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../shared/services/supabase.service';
import { UserDataService } from '../../services/userdata.service';

@Component({
  selector: 'app-auth-callback',
  imports: [],
  templateUrl: './auth-callback.html',
  styleUrl: './auth-callback.scss',
})
export default class AuthCallback {
  private supabase = inject(SupabaseService).supabase;
  private userDataService = inject(UserDataService);
  private router = inject(Router);

  async ngOnInit() {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    if (!session) {
      this.router.navigate(['/login']);
      return;
    }

    const authId = session.user.id;
    const user = await this.userDataService.getUserByAuthId(authId);

    if (!user) {
      this.router.navigate(['/register-user']);
    } else {
      switch (user.rol) {
        case 'Administrador':
          this.router.navigate(['/users/admin']);
          break;
        case 'Conductor':
          this.router.navigate(['/users/bus-driver']);
          break;
        case 'Personal':
          this.router.navigate(['/users/staff']);
          break;
        case 'Visitante':
          this.router.navigate(['/users/visitant']);
          break;
        default:
          this.router.navigate(['/login']);
      }
    }
  }
}
