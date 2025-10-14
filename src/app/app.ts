import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationService } from './shared/services/notification.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private notificationService = inject(NotificationService);

  ngOnInit() {
    this.notificationService.initializeNotifications().catch((error) => {
      console.error('Error inicializando notificaciones:', error);
    });
  }
}
