import { Component, inject, signal } from '@angular/core';
import { LoginCard } from '../../components/login-card/login-card';
import { RegisterCard } from '../../components/register-card/register-card';
import { RightContent } from '../../components/right-content/right-content';

@Component({
  selector: 'app-login',
  imports: [LoginCard, RegisterCard, RightContent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export default class Login {
  isLoginMode = signal(true);

  changeMode() {
    this.isLoginMode.set(false);
  }
}
