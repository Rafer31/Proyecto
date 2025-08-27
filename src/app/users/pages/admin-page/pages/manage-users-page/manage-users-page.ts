import { Component, signal } from '@angular/core';
import { Emptystate } from '../../../../components/emptystate/emptystate';

@Component({
  selector: 'app-manage-users-page',
  imports: [Emptystate],
  templateUrl: './manage-users-page.html',
  styleUrl: './manage-users-page.scss'
})
export class ManageUsersPage {
  data = signal<string|null>(null)
}
