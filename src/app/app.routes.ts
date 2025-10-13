import { Routes } from '@angular/router';
import { noAuthGuard, authGuard } from './auth/guards/auth.guard';
import { changePasswordGuard } from './auth/guards/first-login.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/pages/login/login'),
    canActivate: [noAuthGuard],
  },
  {
    path: 'users',
    loadChildren: () => import('./users/users.routes'),
    canActivate: [authGuard],
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./auth/pages/auth-callback/auth-callback'),
  },
  {
    path: 'auth/change-password',
    loadComponent: () => import('./auth/pages/change-password/change-password'),
    canActivate: [authGuard, changePasswordGuard],
  },
  {
    path: 'register-user',
    loadComponent: () => import('./auth/pages/register-user/register-user'),
    canActivate: [noAuthGuard],
  },
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '/login',
    pathMatch: 'full',
  },
];
