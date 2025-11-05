import { Component, inject, OnInit, ApplicationRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationService } from './shared/services/notification.service';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private notificationService = inject(NotificationService);
  private appRef = inject(ApplicationRef);

  ngOnInit() {
    this.appRef.isStable
      .pipe(first(stable => stable === true))
      .subscribe(() => {
        setTimeout(() => {
          this.notificationService.initializeNotifications().catch((error) => {
            console.error('Error inicializando notificaciones:', error);
          });
        }, 2000);
      });
  }
}
