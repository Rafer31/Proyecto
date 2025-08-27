import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/pages/login/login'),
  },
  {
    path: 'users',
    loadChildren: () => import('./users/users.routes')
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
