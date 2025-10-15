import { Routes } from '@angular/router';
import { UsersLayout } from './layouts/users-layout/users-layout';
import { AdminPage } from './pages/admin-page/admin-page';
import { StaffPage } from './pages/staff-page/staff-page';
import { VisitantPage } from './pages/visitant-page/visitant-page';
import { BusDriverPage } from './pages/bus-driver-page/bus-driver-page';
import { UserToolbar } from './components/user-toolbar/user-toolbar';
import { ChartsPage } from './pages/admin-page/pages/charts-page/charts-page';
import { BusCompanyPage } from './pages/admin-page/pages/bus-company-page/bus-company-page';
import { TripPlanningPage } from './pages/admin-page/pages/trip-planning-page/trip-planning-page';
import { ManageUsersPage } from './pages/admin-page/pages/manage-users-page/manage-users-page';
import { AssignedTrips } from './pages/bus-driver-page/pages/assigned-trips/assigned-trips';
import { AssignedReturns } from './pages/bus-driver-page/pages/assigned-returns/assigned-returns';
import { PassengersList } from './pages/bus-driver-page/pages/passengers-list/passengers-list';
import { AvailableTrips } from './pages/staff-page/pages/available-trips/available-trips';
import { AvailableReturns } from './pages/staff-page/pages/available-returns/available-returns';
import { AvailableVisitantTrips } from './pages/visitant-page/pages/available-trips/available-visitant-trips';
import { roleGuard } from '../auth/guards/role.guard';
import { firstLoginGuard } from '../auth/guards/first-login.guard';

export const userRoutes: Routes = [
  {
    path: '',
    component: UsersLayout,
    canActivate: [firstLoginGuard],
    children: [
      {
        path: 'admin',
        component: AdminPage,
        canActivate: [roleGuard],
        data: { roles: ['administrador'] },
        children: [
          {
            path: 'charts',
            component: ChartsPage,
          },
          {
            path: 'bus-company',
            component: BusCompanyPage,
          },
          {
            path: 'trip-planning',
            component: TripPlanningPage,
          },
          {
            path: 'manage-users',
            component: ManageUsersPage,
          },
          {
            path: '',
            redirectTo: 'charts',
            pathMatch: 'full',
          },
        ],
      },
      {
        path: 'staff',
        component: StaffPage,
        canActivate: [roleGuard],
        data: { roles: ['personal'] },
        children: [
          {
            path: 'available-trips',
            component: AvailableTrips,
          },
          {
            path: 'available-returns',
            component: AvailableReturns,
          },
          {
            path: '',
            redirectTo: 'available-trips',
            pathMatch: 'full',
          },
        ],
      },
      {
        path: 'visitant',
        component: VisitantPage,
        canActivate: [roleGuard],
        data: { roles: ['visitante'] },
        children: [
          {
            path: 'available-visitant-trips',
            component: AvailableVisitantTrips,
          },
          {
            path: '',
            redirectTo: 'available-visitant-trips',
            pathMatch: 'full',
          },
        ],
      },
      {
        path: 'bus-driver',
        component: BusDriverPage,
        canActivate: [roleGuard],
        data: { roles: ['conductor'] },
        children: [
          {
            path: 'assigned-trips',
            component: AssignedTrips,
          },
          {
            path: 'assigned-trips/:id/passengers',
            component: PassengersList,
          },
          {
            path: 'assigned-returns',
            component: AssignedReturns,
          },
          {
            path: 'assigned-returns/:id/passengers',
            component: PassengersList,
          },
          {
            path: '',
            redirectTo: 'assigned-trips',
            pathMatch: 'full',
          },
        ],
      },
    ],
  },
];

export default userRoutes;