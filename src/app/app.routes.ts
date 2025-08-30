import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/pages/login/login'),
  },
  {
    path: 'users',
    loadChildren: () => import('./users/users.routes'),
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./auth/pages/auth-callback/auth-callback'),
  },
  {
    path:'auth/change-password',
    loadComponent: () => import('./auth/pages/change-password/change-password'),
  },
    {
    path: 'register-user',
    loadComponent: () => import('./auth/pages/register-user/register-user'),
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
