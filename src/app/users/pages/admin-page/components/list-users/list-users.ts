import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  inject,
  EventEmitter,
  output,
  signal,
  ChangeDetectorRef,
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
import { AddUsers } from '../add-users/add-users';
import { EditUserData, EditUsers } from '../edit-users/edit-users';
import { DialogService } from '../../../../../shared/services/dialog.service';

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
  private dialogService = inject(DialogService); // 🔹 Inyectar DialogService
  private cdr = inject(ChangeDetectorRef);

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
    'extraInfo',
    'nroficha',
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
    // Usar setTimeout para evitar ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
        // Inicializar pageIndex en 0 para evitar el error -1
        this.paginator.pageIndex = 0;
        this.pageIndex = 0;

        this.paginator.page.subscribe((event: PageEvent) => {
          this.onPageChange(event);
        });
      }
      if (this.sort) {
        this.dataSource.sort = this.sort;
      }
      this.cdr.detectChanges();
    }, 0);
  }

  loadUsers(page: number = 1, limit: number = this.pageSize) {
    this.loading = true;
    this.cdr.detectChanges();

    this.userService
      .getUsers(page, limit)
      .then(({ data, count }) => {
        this.allUsers = data;
        this.dataSource.data = [...data];
        this.totalItems = count || data.length;

        this.applyCombinedFilter();

        // Usar setTimeout para evitar errores de cambio de expresión
        setTimeout(() => {
          if (this.paginator) {
            this.paginator.length = this.totalItems;
            this.paginator.pageIndex = Math.max(0, page - 1); // Asegurar que no sea -1
            this.pageIndex = Math.max(0, page - 1);
          }
          this.loading = false;
          this.cdr.detectChanges();
        }, 0);
      })
      .catch((err) => {
        console.error('Error cargando usuarios', err);
        this.loading = false;
        this.cdr.detectChanges();
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

  get safePageIndex(): number {
    return Math.max(0, this.pageIndex);
  }

  openAddUserDialog() {
    this.dialog
      .open(AddUsers)
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          // Recargar en la página actual
          const currentPage = Math.max(1, this.pageIndex + 1);
          this.loadUsers(currentPage, this.pageSize);
        }
      });
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

    // Usar setTimeout para evitar errores
    setTimeout(() => {
      this.loadUsers(this.pageIndex + 1, this.pageSize);
    }, 0);
  }

  // 🔹 MÉTODO CORREGIDO
  async editUser(user: Usuario) {


    try {
      // 1. Preparar los datos para el dialog de edición
      const editUserData: EditUserData = {
        idusuario: user.idusuario,
        ci: user.ci,
        nombre: user.nomusuario,
        paterno: user.patusuario,
        materno: user.matusuario || '',
        numcelular: user.numcelular,
        email: '', // 🔹 Email se obtendrá desde auth, por ahora vacío
        rol: user.roles && user.roles.length > 0 ? user.roles[0].nomrol : '', // 🔹 Obtener rol correctamente
        idrol: user.idrol, // 🔹 Usar idrol directo del usuario
        // Campos específicos por rol - extraer de las relaciones
        nroficha: user.personal?.nroficha || '',
        operacion: user.personal?.operacion || '',
        direccion: user.personal?.direccion || '',
        informacion: user.visitante?.informacion || '',
      };

      // 2. Abrir el dialog de edición
      const dialogRef = this.dialog.open(EditUsers, { // 🔹 Usar EditUsersComponent, no this.editUser
        width: '600px',
        maxWidth: '90vw',
        panelClass: 'rounded-xl',
        data: editUserData,
        disableClose: false,
      });

      // 3. Escuchar el resultado del dialog
      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          // El usuario fue actualizado exitosamente
          console.log('Usuario actualizado exitosamente');
          // Recargar la lista de usuarios
          const currentPage = Math.max(1, this.pageIndex + 1);
          this.loadUsers(currentPage, this.pageSize);
        }
      });

    } catch (error) {
      console.error('Error al abrir dialog de edición:', error);
      this.dialogService.showErrorDialog(
        'Error al abrir el formulario de edición',
        'Error'
      );
    }
  }

  deleteUser(user: Usuario) {
    console.log('Eliminar usuario', user);
  }
}
