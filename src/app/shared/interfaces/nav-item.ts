export interface NavItem {
  icon: string;
  label: string;
  route: string;
  badge?: string;   // opcional, por si luego agregas contadores
  disabled?: boolean;
}
