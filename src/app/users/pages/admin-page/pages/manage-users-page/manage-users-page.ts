import { Component, signal } from '@angular/core';
import ListUsers from '../../components/list-users/list-users';

@Component({
  selector: 'app-manage-users-page',
  imports: [ ListUsers],
  templateUrl: './manage-users-page.html',
  styleUrl: './manage-users-page.scss',
  standalone: true,
})
export class ManageUsersPage {
  userCount = signal(0);
  isDataLoaded = signal(false);

  updateUserCount(count: number) {
    this.userCount.set(count);
    this.isDataLoaded.set(true);
  }
}
