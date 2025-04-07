import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { SignupComponent } from './components/signup/signup.component';
import { EventsComponent } from './pages/events/events.component';
import { OffersComponent } from './pages/offers/offers.component';
import { TransactionsComponent } from './pages/transactions/transactions.component';
import { AdminGuard } from './core/guard/admin/admin.guard';
import { UsersComponent } from './pages/users/users.component';
import { AppComponent } from './app.component';
import { EditEventComponent } from './pages/edit-event/edit-event.component';
import { EmailComponent } from './pages/email/email.component';

const routes: Routes = [
  { path: '', component: EventsComponent, canActivate: [AdminGuard] },
  {path: "login" , component: LoginComponent},
  // {path: 'signup', component: SignupComponent},
  {path: 'events', component: EventsComponent, canActivate: [AdminGuard]},
  {path: 'offers', component: OffersComponent, canActivate: [AdminGuard]},
  {path: 'transactions', component: TransactionsComponent, canActivate: [AdminGuard]},
  {path: 'users', component: UsersComponent, canActivate: [AdminGuard]},
  {path: 'events/:id', component: EditEventComponent, canActivate: [AdminGuard]},
  {path: 'emails', component: EmailComponent, canActivate: [AdminGuard]},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
