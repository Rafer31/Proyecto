import { Injectable, signal, computed, effect } from '@angular/core';
import { Usuario } from '../interfaces/user';

@Injectable({ providedIn: 'root' })
export class UserStateService {
  private readonly _currentUser = signal<Usuario | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly currentUser = computed(() => this._currentUser());
  readonly isLoading = computed(() => this._isLoading());
  readonly error = computed(() => this._error());
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly userName = computed(() => {
    const user = this._currentUser();
    if (!user) return 'Usuario';
    return (
      `${user.nomusuario || ''} ${user.patusuario || ''}`.trim() ||
      user.nomusuario ||
      'Usuario'
    );
  });

  setUser(user: Usuario | null) {
    this._currentUser.set(user);
    this._error.set(null);
  }

  setLoading(loading: boolean) {
    this._isLoading.set(loading);
  }

  setError(error: string | null) {
    this._error.set(error);
    this._isLoading.set(false);
  }

  clearUser() {
    this._currentUser.set(null);
    this._error.set(null);
    this._isLoading.set(false);
  }
}
