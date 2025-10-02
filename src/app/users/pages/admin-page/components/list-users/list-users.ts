import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  inject,
  ChangeDetectorRef,
  Output,
  EventEmitter,
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
import { ObservationDialog } from '../observation-dialog/observation-dialog';
import { DeleteUsers } from '../delete-users/delete-users';
import { Emptystate } from '../../../../components/emptystate/emptystate';

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
    Emptystate,
  ],
  templateUrl: './list-users.html',
  styleUrls: ['./list-users.scss'],
})
export default class ListUsers implements OnInit, AfterViewInit {
  private userService = inject(UserService);
  private dialog = inject(MatDialog);
  private dialogService = inject(DialogService);
  private cdr = inject(ChangeDetectorRef);

  @Output() totalChange = new EventEmitter<number>();

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
  loading = false;
  initialLoad = true;

  private searchValue = '';
  roleControlValue = '';

  totalItems = 0;
  allUsers: Usuario[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  roles: Array<{ idrol: string; nomrol: string }> = [];

  ngOnInit(): void {
    this.loadRoles();
  }

  ngAfterViewInit(): void {
    this.loadAllUsers().then(() => {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;

      this.cdr.detectChanges();
    });
  }


  async loadAllUsers() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const { data, count } = await this.userService.getAllUsers();
      this.allUsers = data || [];
      this.totalItems = count || 0;

      this.applyFilters();

      this.loading = false;
      this.initialLoad = false;
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error cargando usuarios', err);
      this.loading = false;
      this.initialLoad = false;
      this.dataSource.data = [];
      this.cdr.detectChanges();
      this.totalChange.emit(0);
    }
  }


  private applyFilters() {
    let usuarios = [...this.allUsers];

    if (this.searchValue) {
      const s = this.searchValue.toLowerCase();
      usuarios = usuarios.filter(
        (u) =>
          `${u.nomusuario} ${u.patusuario} ${u.matusuario}`
            .toLowerCase()
            .includes(s) ||
          (u.ci || '').toLowerCase().includes(s) ||
          (u.numcelular || '').toLowerCase().includes(s)
      );
    }

    if (this.roleControlValue) {
      usuarios = usuarios.filter(
        (u) =>
          u.roles &&
          u.roles.length > 0 &&
          u.roles[0].nomrol === this.roleControlValue
      );
    }

    this.dataSource.data = usuarios;

    if (this.paginator) {
      this.paginator.firstPage();
    }

    this.totalChange.emit(usuarios.length);
  }


  private async loadRoles() {
    try {
      this.roles = await this.userService.getRoles();
    } catch (err) {
      console.error('Error cargando roles', err);
    }
  }

  onSearchChange(search: string) {
    this.searchValue = search;
    this.applyFilters();
  }

  onRoleChange(role: string) {
    this.roleControlValue = role;
    this.applyFilters();
  }

  openAddUserDialog() {
    this.dialog
      .open(AddUsers)
      .afterClosed()
      .subscribe((result) => {
        if (result) this.loadAllUsers();
      });
  }

  async editUser(user: Usuario) {
    try {
      const editUserData: EditUserData = {
        idusuario: user.idusuario,
        ci: user.ci,
        nombre: user.nomusuario,
        paterno: user.patusuario,
        materno: user.matusuario || '',
        numcelular: user.numcelular,
        email: '',
        rol: user.roles && user.roles.length > 0 ? user.roles[0].nomrol : '',
        idrol: user.idrol,
        nroficha: user.personal?.nroficha || '',
        operacion: user.personal?.operacion || '',
        informacion: user.visitante?.informacion || '',
      };

      const dialogRef = this.dialog.open(EditUsers, {
        width: '600px',
        maxWidth: '90vw',
        panelClass: 'rounded-xl',
        data: editUserData,
        disableClose: false,
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          this.loadAllUsers();
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

  async addObservation(user: Usuario) {
    try {
      const asignacion = user.personal?.asignacion_destino?.[0];
      const dialogRef = this.dialog.open(ObservationDialog, {
        width: '500px',
        data: {
          idusuario: user.idusuario,
          nroficha: user.personal?.nroficha || null,
          destino: asignacion?.destino?.nomdestino || '',
          observacion: asignacion?.observacion || '',
        },
      });

      dialogRef.afterClosed().subscribe(async (result) => {
        if (result) {
          try {
            await this.userService.updateObservation(
              user.idusuario,
              result.observacion
            );
            this.loadAllUsers();
          } catch (err) {
            console.error('Error guardando observación', err);
            this.dialogService.showErrorDialog(
              'No se pudo guardar la observación',
              'Error'
            );
          }
        }
      });
    } catch (error) {
      console.error('Error abriendo dialog observación:', error);
    }
  }

  deleteUser(user: Usuario) {
    const dialogRef = this.dialog.open(DeleteUsers, {
      width: '400px',
      data: { idusuario: user.idusuario, nomusuario: user.nomusuario },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadAllUsers();
      }
    });
  }
}
