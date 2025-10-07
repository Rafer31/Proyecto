import { Injectable, signal, computed } from '@angular/core';
import { MatDrawer } from '@angular/material/sidenav';

@Injectable({ providedIn: 'root' })
export class NavStateService {
  private readonly _collapsed = signal(false);
  private readonly _overMode = signal(false);
  private _drawer?: MatDrawer;

  readonly collapsed = computed(() => this._collapsed());
  readonly drawerMode = computed<'side' | 'over'>(() =>
    this._overMode() ? 'over' : 'side'
  );
  readonly drawerWidth = computed(() => (this._collapsed() ? '72px' : '260px'));

  toggleCollapsed() {
    this._collapsed.update((v) => !v);
  }
  setCollapsed(v: boolean) {
    this._collapsed.set(v);
  }
  setOverMode(v: boolean) {
    this._overMode.set(v);
  }

  setDrawer(drawer: MatDrawer) {
    this._drawer = drawer;
  }

  toggleNav() {
    if (this._overMode()) {
      this._drawer?.toggle();
    } else {
      this.toggleCollapsed();
    }
  }
}
