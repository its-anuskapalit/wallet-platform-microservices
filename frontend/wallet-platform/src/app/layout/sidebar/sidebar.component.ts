import { Component, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed()">
      <!-- Brand -->
      <div class="sidebar-brand">
        <div class="brand-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="10" fill="url(#brandGrad)"/>
            <path d="M10 22L16 10L22 22" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12.5 18H19.5" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
            <defs>
              <linearGradient id="brandGrad" x1="0" y1="0" x2="32" y2="32">
                <stop offset="0%" stop-color="#944a00"/>
                <stop offset="100%" stop-color="#e87f24"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        @if (!collapsed()) {
          <div class="brand-text">
            <span class="brand-name">Aurelian</span>
            <span class="brand-subtitle">Finance</span>
          </div>
        }
        <button class="collapse-btn" (click)="toggle()" [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path [attr.d]="collapsed() ? 'M6 3l5 5-5 5' : 'M10 3L5 8l5 5'" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav">
        @for (item of visibleItems(); track item.route) {
          <a
            class="nav-item"
            [routerLink]="item.route"
            routerLinkActive="active"
            [title]="collapsed() ? item.label : ''"
          >
            <span class="nav-icon" [innerHTML]="item.icon"></span>
            @if (!collapsed()) {
              <span class="nav-label">{{ item.label }}</span>
            }
          </a>
        }
      </nav>

      <!-- User section -->
      <div class="sidebar-footer">
        @if (currentUser()) {
          <div class="user-info" [class.compact]="collapsed()">
            <div class="user-avatar">
              {{ userInitials() }}
            </div>
            @if (!collapsed()) {
              <div class="user-details">
                <span class="user-name">{{ currentUser()?.fullName }}</span>
                <span class="user-role">{{ currentUser()?.role }}</span>
              </div>
            }
          </div>
        }
        <button class="logout-btn" (click)="logout()" [title]="collapsed() ? 'Logout' : ''">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6.75 15.75H3.75C3.35218 15.75 2.97064 15.592 2.68934 15.3107C2.40804 15.0294 2.25 14.6478 2.25 14.25V3.75C2.25 3.35218 2.40804 2.97064 2.68934 2.68934C2.97064 2.40804 3.35218 2.25 3.75 2.25H6.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 12.75L15.75 9L12 5.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M15.75 9H6.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          @if (!collapsed()) {
            <span>Logout</span>
          }
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      display: flex;
      flex-direction: column;
      width: 240px;
      min-height: 100vh;
      background: var(--surface-container-lowest);
      box-shadow: var(--shadow-ambient);
      transition: width 0.25s ease;
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      z-index: 100;
      overflow: hidden;

      &.collapsed {
        width: 72px;
      }
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 16px;
      border-bottom: none;
      min-height: 72px;
    }

    .brand-logo {
      flex-shrink: 0;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .brand-name {
      font-family: var(--font-display);
      font-size: 15px;
      font-weight: 700;
      color: var(--on-surface);
      white-space: nowrap;
    }

    .brand-subtitle {
      font-size: 11px;
      font-weight: 500;
      color: var(--on-surface-variant);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .collapse-btn {
      margin-left: auto;
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border: none;
      background: var(--surface-container-low);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--on-surface-variant);
      transition: all 0.2s;

      &:hover {
        background: var(--surface-container);
        color: var(--on-surface);
      }
    }

    .sidebar-nav {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 12px 8px;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: var(--radius-md);
      text-decoration: none;
      color: var(--on-surface-variant);
      font-size: 14px;
      font-weight: 500;
      transition: all 0.15s ease;
      white-space: nowrap;
      overflow: hidden;

      &:hover {
        background: var(--surface-container-low);
        color: var(--on-surface);
      }

      &.active {
        background: var(--primary-fixed);
        color: var(--primary);

        .nav-icon ::ng-deep svg path,
        .nav-icon ::ng-deep svg circle,
        .nav-icon ::ng-deep svg rect {
          stroke: var(--primary);
        }
      }
    }

    .nav-icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;

      ::ng-deep svg {
        width: 20px;
        height: 20px;
      }
    }

    .nav-label {
      font-family: var(--font-body);
    }

    .sidebar-footer {
      padding: 12px 8px;
      border-top: 1px solid rgba(200, 197, 192, 0.3);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: var(--radius-md);
      background: var(--surface-container-low);

      &.compact {
        justify-content: center;
        padding: 8px;
      }
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--primary-container));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .user-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--on-surface);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: 11px;
      color: var(--on-surface-variant);
      letter-spacing: 0.03em;
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: var(--radius-md);
      border: none;
      background: transparent;
      color: var(--on-surface-variant);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      width: 100%;
      transition: all 0.15s;

      &:hover {
        background: var(--error-container);
        color: var(--error);
      }
    }
  `]
})
export class SidebarComponent {
  private auth = inject(AuthService);

  collapsed = signal(false);
  currentUser = this.auth.currentUser;

  userInitials = computed(() => {
    const name = this.currentUser()?.fullName ?? '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  });

  private readonly navItems: NavItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="7" height="7" rx="1.5"/><rect x="11" y="2" width="7" height="7" rx="1.5"/><rect x="2" y="11" width="7" height="7" rx="1.5"/><rect x="11" y="11" width="7" height="7" rx="1.5"/></svg>`
    },
    {
      label: 'Wallet',
      route: '/wallet',
      icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="16" height="12" rx="2"/><path d="M2 8h16"/><circle cx="14" cy="13" r="1.5" fill="currentColor" stroke="none"/></svg>`
    },
    {
      label: 'Transactions',
      route: '/transactions',
      icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h12M4 10h8M4 14h5"/><path d="M15 12l3 3-3 3"/></svg>`
    },
    {
      label: 'Rewards',
      route: '/rewards',
      icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2l2.39 4.84L18 7.64l-4 3.9.94 5.46L10 14.27 5.06 17l.94-5.46-4-3.9 5.61-.8z"/></svg>`
    },
    {
      label: 'Profile',
      route: '/profile',
      icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3.31 2.69-6 6-6s6 2.69 6 6"/></svg>`
    },
    {
      label: 'Admin',
      route: '/admin',
      icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2l1.5 4.5H16l-3.75 2.73 1.43 4.39L10 11.18l-3.68 2.44 1.43-4.39L4 6.5h4.5z"/><circle cx="10" cy="17" r="1.5"/></svg>`,
      adminOnly: true
    }
  ];

  visibleItems = computed(() =>
    this.navItems.filter(item => !item.adminOnly || this.auth.isAdmin())
  );

  toggle(): void {
    this.collapsed.update(c => !c);
  }

  logout(): void {
    this.auth.logout();
  }
}
