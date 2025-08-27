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
import { AvailableTrips } from './pages/staff-page/pages/available-trips/available-trips';

export const userRoutes: Routes = [
  {
    path: '',
    component: UsersLayout,
    children: [
      {
        path: 'toolbar',
        component: UserToolbar,
      },
      {
        path: 'admin',
        component: AdminPage,
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
        ],
      },
      {
        path: 'staff',
        component: StaffPage,
        children: [
          {
            path: 'available-trips',
            component: AvailableTrips,
          },
        ],
      },
      {
        path: 'visitant',
        component: VisitantPage,
          children: [
          {
            path: 'available-trips',
            component: AvailableTrips,
          },
        ],
      },
      {
        path: 'bus-driver',
        component: BusDriverPage,
        children: [
          {
            path: 'assigned-trips',
            component: AssignedTrips,
          },
        ],
      },
      {
        path: '**',
        redirectTo: '',
        pathMatch: 'full',
      },
    ],
  },
];

export default userRoutes;
