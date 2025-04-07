import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmailService, EmailPayload } from '../../core/services/email/email.service';

@Component({
  selector: 'app-email',
  templateUrl: './email.component.html',
  styleUrls: ['./email.component.css']
})
export class EmailComponent implements OnInit {
  emailForm: FormGroup;
  isSubmitting = false;
  submitSuccess = false;
  submitError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private emailService: EmailService
  ) {
    this.emailForm = this.fb.group({
      subject: ['', [Validators.required]],
      template: ['', [Validators.required]],
      isSubscribed: [false]
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.emailForm.valid) {
      this.isSubmitting = true;
      this.submitSuccess = false;
      this.submitError = null;

      const payload: EmailPayload = {
        subject: this.emailForm.value.subject,
        template: this.emailForm.value.template,
        isSubscribed: this.emailForm.value.isSubscribed
      };

      this.emailService.sendAdminEmail(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = true;
          this.emailForm.reset({ isSubscribed: false });
        },
        error: (error:any) => {
          this.isSubmitting = false;
          this.submitError = error.message || 'Failed to send email. Please try again.';
        }
      });
    } else {
      // Mark all fields as touched to trigger validation visuals
      Object.keys(this.emailForm.controls).forEach(key => {
        this.emailForm.get(key)?.markAsTouched();
      });
    }
  }
}