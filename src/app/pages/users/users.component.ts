import { Component, OnInit } from '@angular/core';
import {
  UserService,
  User,
  PaginatedUsersResponse,
} from '../../core/services/user/user.service';
@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css'],
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  isLoading = true;
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 1;
  searchQuery = '';

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService
      .getAllUsers(this.currentPage, this.itemsPerPage, this.searchQuery)
      .subscribe({
        next: (response) => {
          this.users = response.data;
          this.totalItems = response.pagination?.total || 0;
          this.totalPages = response.pagination?.totalPages || 1;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading users:', err);
          this.isLoading = false;
        },
      });
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadUsers();
  }

  onRoleChange(user: User, event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const newRole = selectElement.value;
    this.updateUserRole(user, newRole);
  }

  updateUserRole(user: User, newRole: string): void {
    if (!user._id) return;

    
    // add alert
    if (!confirm(`Are you sure you want to change the role to ${newRole}?`)) {
      return;
    }

    this.userService.updateUserRole(user._id, newRole).subscribe({
      next: () => {
        user.role = newRole;
      },
      error: (err) => {
        console.error('Error updating user role:', err);
      },
    });
  }

  deleteUser(userId: string): void {
    if (confirm('Are you sure you want to delete this user?')) {
      this.userService.deleteUser(userId).subscribe({
        next: () => {
          this.users = this.users.filter((u) => u._id !== userId);
          this.totalItems--;
          // Adjust page if we deleted the last item on the page
          if (this.users.length === 0 && this.currentPage > 1) {
            this.currentPage--;
            this.loadUsers();
          }
        },
        error: (err) => {
          console.error('Error deleting user:', err);
        },
      });
    }
  }

  searchUsers(): void {
    this.currentPage = 1; // Reset to first page when searching
    this.loadUsers(); // This will now include the searchQuery
  }

  // Helper method to calculate the minimum value
  getMinValue(a: number, b: number): number {
    return Math.min(a, b);
  }

  getPageNumbers(): number[] {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(
      1,
      this.currentPage - Math.floor(maxVisiblePages / 2)
    );
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > this.totalPages) {
      endPage = this.totalPages;
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }
}
