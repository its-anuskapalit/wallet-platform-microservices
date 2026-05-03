import { Component, computed, signal, inject, OnInit } from '@angular/core';
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
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  private auth = inject(AuthService);

  collapsed   = signal(false);
  darkMode    = signal(false);
  currentUser = this.auth.currentUser;

  ngOnInit(): void {
    const stored = localStorage.getItem('aurelian-theme') === 'dark';
    this.darkMode.set(stored);
    document.documentElement.setAttribute('data-theme', stored ? 'dark' : 'light');
  }

  toggleDark(): void {
    this.darkMode.update(v => !v);
    const isDark = this.darkMode();
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('aurelian-theme', isDark ? 'dark' : 'light');
  }

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
      label: 'Bill Split',
      route: '/bill-split',
      icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="16" height="12" rx="2"/><path d="M10 5V3M6 9h8M6 13h5"/><path d="M14 11l2 2-2 2"/></svg>`
    },
    {
      label: 'Admin',
      route: '/admin',
      icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2l1.5 4.5H16l-3.75 2.73 1.43 4.39L10 11.18l-3.68 2.44 1.43-4.39L4 6.5h4.5z"/><circle cx="10" cy="17" r="1.5"/></svg>`,
      adminOnly: true
    },
    {
      label: 'Investigation AI',
      route: '/investigation',
      icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2a3 3 0 013 3v1h4v11a2 2 0 01-2 2H5a2 2 0 01-2-2V6h4V5a3 3 0 013-3z"/><path d="M7 10h6M7 14h4"/></svg>`,
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
