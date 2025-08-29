import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  inject,
  EventEmitter,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserService } from '../../../../services/user.service';
import { Usuario } from '../../../../../shared/interfaces/user';
import { SearchUsers } from '../search-users/search-users';
import { FilterUsers } from '../filter-users/filter-users';

@Component({
  selector: 'app-list-users',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    SearchUsers,
    FilterUsers,
  ],
  templateUrl: './list-users.html',
  styleUrls: ['./list-users.scss'],
})
export default class ListUsers implements OnInit, AfterViewInit {
  private userService = inject(UserService);
  private dialog = inject(MatDialog);
  totalChange = output<number>();

  users = signal<any[]>([]);
  totalItems = 0;
  pageSize = 10;
  pageIndex = 0;
  displayedColumns: string[] = [
    'ci',
    'nomusuario',
    'patusuario',
    'matusuario',
    'numcelular',
    'rol',
    'extraInfo', // información visitante
    'nroficha', // ficha personal/admin
    'acciones',
  ];

  dataSource = new MatTableDataSource<Usuario>([]);
  allUsers: Usuario[] = []; // Para filtrado local

  roles: Array<{ idrol: string; nomrol: string }> = [];
  loading = false;

  private searchValue = '';
  roleControlValue = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.loadRoles();
    this.setupFilterPredicate();
    this.loadUsers(1, this.pageSize);
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
      this.paginator.page.subscribe((event: PageEvent) =>
        this.onPageChange(event)
      );
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  loadUsers(page: number = 1, limit: number = this.pageSize) {
    this.loading = true;
    this.userService
      .getUsers(page, limit)
      .then(({ data, count }) => {
        this.allUsers = data;
        this.dataSource.data = [...data];
        this.totalItems = count || data.length;

        this.applyCombinedFilter();

        if (this.paginator) {
          this.paginator.length = this.totalItems;
          this.paginator.pageIndex = page - 1;
        }
        this.loading = false;
      })
      .catch((err) => {
        console.error('Error cargando usuarios', err);
        this.loading = false;
      });
  }

  private async loadRoles() {
    try {
      this.roles = await this.userService.getRoles();
    } catch (err) {
      console.error('Error cargando roles', err);
    }
  }

  private setupFilterPredicate() {
    this.dataSource.filterPredicate = (data: Usuario, filter: string) => {
      let parsed = { search: '', role: '' };
      try {
        parsed = JSON.parse(filter);
      } catch {
        parsed.search = (filter || '').toString().toLowerCase();
      }

      const search = parsed.search.trim().toLowerCase();
      const role = parsed.role;

      const fullName = `${data.nomusuario || ''} ${data.patusuario || ''} ${
        data.matusuario || ''
      }`
        .toLowerCase()
        .trim();

      const ci = (data.ci || '').toString().toLowerCase();
      const celular = (data.numcelular || '').toString().toLowerCase();

      const rolNombre =
        data.roles && data.roles.length > 0
          ? (data.roles[0].nomrol || '').toString()
          : '';

      const matchesSearch =
        !search ||
        fullName.includes(search) ||
        ci.includes(search) ||
        celular.includes(search);

      const matchesRole = !role || rolNombre === role;

      return matchesSearch && matchesRole;
    };
  }

  private applyCombinedFilter() {
    const filterValue = JSON.stringify({
      search: this.searchValue.trim().toLowerCase(),
      role: this.roleControlValue,
    });
    this.dataSource.filter = filterValue;

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // 🔹 Eventos de hijos
  onSearchChange(search: string) {
    this.searchValue = search;
    this.applyCombinedFilter();
  }

  onRoleChange(role: string) {
    this.roleControlValue = role;
    this.applyCombinedFilter();
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadUsers(this.pageIndex + 1, this.pageSize);
  }

  addUser() {
    console.log('Abrir diálogo para agregar usuario');
  }

  editUser(user: Usuario) {
    console.log('Editar usuario', user);
  }

  deleteUser(user: Usuario) {
    console.log('Eliminar usuario', user);
  }
}
