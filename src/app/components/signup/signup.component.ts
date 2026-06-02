// signup.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {
  signupForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.signupForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      phone: ['', Validators.required],
      role: ['admin']
    });
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.register(
      this.signupForm.value.name,
      this.signupForm.value.email,
      this.signupForm.value.password,
      this.signupForm.value.phone,
      this.signupForm.value.role
    ).subscribe({
      next: () => {
        this.successMessage = 'Registration successful! Please login.';
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Registration failed';
        this.isLoading = false;
      }
    });
  }
}