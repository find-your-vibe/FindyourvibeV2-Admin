// app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http'; // <-- Add this line

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { EventsComponent } from './pages/events/events.component';
import { OffersComponent } from './pages/offers/offers.component';
import { TransactionsComponent } from './pages/transactions/transactions.component';
import { LoginComponent } from './components/login/login.component';
import { SignupComponent } from './components/signup/signup.component';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthInterceptor } from './core/inteceptors/auth/auth-interceptor';
import { UsersComponent } from './pages/users/users.component';
import { EditEventComponent } from './pages/edit-event/edit-event.component';
import { ToasterComponent } from './components/toaster/toaster.component';
import { EmailComponent } from './pages/email/email.component';
import { EventTransactionsComponent } from './pages/event-transactions/event-transactions.component';

@NgModule({
  declarations: [
    AppComponent,
    EventsComponent,
    OffersComponent,
    TransactionsComponent,
    LoginComponent,
    SignupComponent,
    UsersComponent,
    EditEventComponent,
    ToasterComponent,
    EmailComponent,
    EventTransactionsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    HttpClientModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
