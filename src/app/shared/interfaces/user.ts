export interface Rol {
  idrol: string;
  nomrol: string;
}

export interface Usuario {
  idusuario: string;
  numcelular: string;
  nomusuario: string;
  patusuario: string;
  matusuario: string;
  ci: string;
  idrol: string;
  auth_id: string;
  roles: Rol[];
}
