import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NavStateService {
  private readonly _collapsed = signal(false);        // rail (72px) cuando true
  private readonly _overMode  = signal(false);        // si quisieras modo 'over' en mobile

  readonly collapsed  = computed(() => this._collapsed());
  readonly drawerMode = computed<'side' | 'over'>(() => this._overMode() ? 'over' : 'side');
  readonly drawerWidth = computed(() => this._collapsed() ? '72px' : '260px');

  toggleCollapsed() { this._collapsed.update(v => !v); }
  setCollapsed(v: boolean) { this._collapsed.set(v); }

  // Si más adelante quieres responsive:
  setOverMode(v: boolean) { this._overMode.set(v); }
}
