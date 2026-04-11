import { Component, inject, HostListener, signal, AfterViewInit, OnDestroy, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- ══ NAVBAR ══ -->
    <nav class="navbar" [class.scrolled]="scrolled()">
      <div class="nav-inner">
        <a routerLink="/" class="nav-logo">
          <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="14" fill="url(#landGrad)"/>
            <path d="M15 33L24 15L33 33" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M18.5 27H29.5" stroke="white" stroke-width="3" stroke-linecap="round"/>
            <defs>
              <linearGradient id="landGrad" x1="0" y1="0" x2="48" y2="48">
                <stop offset="0%" stop-color="#944a00"/>
                <stop offset="100%" stop-color="#e87f24"/>
              </linearGradient>
            </defs>
          </svg>
          <span class="nav-brand">Aurelian</span>
        </a>

        <div class="nav-links">
          <button class="nav-link" (click)="scrollTo('features')">Features</button>
          <button class="nav-link" (click)="scrollTo('how')">How it works</button>
          <button class="nav-link" (click)="scrollTo('rewards')">Rewards</button>
        </div>

        <div class="nav-actions">
          @if (isLoggedIn()) {
            <a routerLink="/dashboard" class="btn btn-primary btn-sm">Go to Dashboard</a>
          } @else {
            <a routerLink="/auth/login" class="btn btn-ghost btn-sm">Sign in</a>
            <a routerLink="/auth/register" class="btn btn-primary btn-sm">Get started</a>
          }
        </div>
      </div>
    </nav>

    <!-- ══ HERO ══ -->
    <section class="hero">
      <div class="hero-bg">
        <div class="hero-blob hero-blob--1"></div>
        <div class="hero-blob hero-blob--2"></div>
        <div class="hero-blob hero-blob--3"></div>
        <div class="hero-grid"></div>
      </div>
      <div class="hero-content">
        <div class="hero-badge anim-fade-up" style="animation-delay:0.1s">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.67 3.39L12.5 5.05l-2.75 2.68.65 3.77L7 9.69l-3.4 1.81.65-3.77L1.5 5.05l3.83-.66z" fill="#f57f17"/></svg>
          Earn rewards on every transaction
        </div>
        <h1 class="hero-headline">
          <span class="anim-fade-up" style="animation-delay:0.22s;display:block;">Your money,</span>
          <span class="gradient-text anim-fade-up" style="animation-delay:0.38s;display:block;">smarter.</span>
        </h1>
        <p class="hero-sub anim-fade-up" style="animation-delay:0.5s">
          Aurelian is a modern digital wallet that lets you send money instantly,
          earn loyalty points, redeem real rewards — and stay in control of every rupee.
        </p>
        <div class="hero-cta anim-fade-up" style="animation-delay:0.62s">
          <a routerLink="/auth/register" class="btn btn-hero-primary">
            Open free account
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
          </a>
          <a routerLink="/auth/login" class="btn btn-hero-ghost">Sign in</a>
        </div>
        <div class="hero-trust anim-fade-up" style="animation-delay:0.74s">
          <div class="trust-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--success)" stroke-width="1.8" stroke-linecap="round"><path d="M13 4l-7 7-3-3"/></svg>
            Free to join
          </div>
          <div class="trust-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--success)" stroke-width="1.8" stroke-linecap="round"><path d="M13 4l-7 7-3-3"/></svg>
            KYC secured
          </div>
          <div class="trust-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--success)" stroke-width="1.8" stroke-linecap="round"><path d="M13 4l-7 7-3-3"/></svg>
            Instant transfers
          </div>
        </div>
      </div>

      <!-- Hero visual -->
      <div class="hero-visual">
        <div class="mockup-card">
          <div class="mockup-header">
            <div class="mockup-avatar">A</div>
            <div>
              <div class="mockup-name">Aurelian Wallet</div>
              <div class="mockup-sub">Personal Account</div>
            </div>
            <div class="mockup-badge">Active</div>
          </div>
          <div class="mockup-balance-label">Total Balance</div>
          <div class="mockup-balance">₹12,450.00</div>
          <div class="mockup-row">
            <div class="mockup-stat">
              <span class="mockup-stat-label">Points</span>
              <span class="mockup-stat-val">1,240 pts</span>
            </div>
            <div class="mockup-stat">
              <span class="mockup-stat-label">Tier</span>
              <span class="mockup-stat-val">🥈 Silver</span>
            </div>
          </div>
          <div class="mockup-txns">
            <div class="mockup-txn">
              <div class="mockup-txn-icon credit">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M7 2v10M2 7h10"/></svg>
              </div>
              <div class="mockup-txn-info">
                <span>Top Up</span><span class="muted">Today</span>
              </div>
              <span class="pos">+₹5,000</span>
            </div>
            <div class="mockup-txn">
              <div class="mockup-txn-icon debit">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M13 2L2 5.5l4 2.5 2.5 4L13 2z"/></svg>
              </div>
              <div class="mockup-txn-info">
                <span>Transfer</span><span class="muted">Yesterday</span>
              </div>
              <span class="neg">-₹1,200</span>
            </div>
            <div class="mockup-txn">
              <div class="mockup-txn-icon reward">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 1l1.67 3.39L12.5 5.05l-2.75 2.68.65 3.77L7 9.69l-3.4 1.81.65-3.77L1.5 5.05l3.83-.66z"/></svg>
              </div>
              <div class="mockup-txn-info">
                <span>Points Earned</span><span class="muted">Yesterday</span>
              </div>
              <span class="pos">+50 pts</span>
            </div>
          </div>
        </div>
        <!-- Floating chips -->
        <div class="float-chip float-chip--1">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round"><path d="M13 4l-7 7-3-3"/></svg>
          Transfer sent!
        </div>
        <div class="float-chip float-chip--2">
          ⭐ +50 bonus points
        </div>
        <div class="float-chip float-chip--3">
          🎁 Voucher redeemed
        </div>
      </div>
    </section>

    <!-- ══ STATS STRIP ══ -->
    <div class="stats-strip">
      <div class="strip-stat"><span class="strip-num">₹0</span><span class="strip-label">Joining fee</span></div>
      <div class="strip-divider"></div>
      <div class="strip-stat"><span class="strip-num">1 pt</span><span class="strip-label">Per ₹10 spent</span></div>
      <div class="strip-divider"></div>
      <div class="strip-stat"><span class="strip-num">12+</span><span class="strip-label">Catalog rewards</span></div>
      <div class="strip-divider"></div>
      <div class="strip-stat"><span class="strip-num">Instant</span><span class="strip-label">Transfers</span></div>
    </div>

    <!-- ══ FEATURES ══ -->
    <section class="section" id="features">
      <div class="section-inner">
        <p class="section-eyebrow reveal">Everything you need</p>
        <h2 class="section-title reveal">Built for real-world finance</h2>
        <p class="section-sub reveal">From wallet management to AI support — Aurelian has you covered.</p>

        <div class="features-grid">
          <div class="feature-card feature-card--accent reveal">
            <div class="feature-icon" style="background:#fff3e0;color:#e65100;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="16" cy="15" r="1.5" fill="currentColor" stroke="none"/></svg>
            </div>
            <h3>Digital Wallet</h3>
            <p>Top up, send, and receive money instantly. Full transaction history with PDF receipts.</p>
          </div>
          <div class="feature-card reveal" style="--reveal-delay:0.1s">
            <div class="feature-icon" style="background:#e8f5e9;color:#2e7d32;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
            </div>
            <h3>KYC Verification</h3>
            <p>Submit your identity documents in minutes. Admin-reviewed for full account access.</p>
          </div>
          <div class="feature-card reveal" style="--reveal-delay:0.2s">
            <div class="feature-icon" style="background:#fff8e1;color:#f57f17;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>
            </div>
            <h3>Loyalty Rewards</h3>
            <p>Earn points on every transaction. Milestones unlock bonus points — the more you use, the more you earn.</p>
          </div>
          <div class="feature-card reveal" style="--reveal-delay:0.3s">
            <div class="feature-icon" style="background:#f3e5f5;color:#6a1b9a;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
            </div>
            <h3>Reward Catalog</h3>
            <p>Redeem points for vouchers, cashback, food, travel, and entertainment — instantly delivered with a unique code.</p>
          </div>
          <div class="feature-card reveal" style="--reveal-delay:0.4s">
            <div class="feature-icon" style="background:#e3f2fd;color:#1565c0;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            </div>
            <h3>AI Chatbot</h3>
            <p>Ask WalletBot anything — rewards, transfers, KYC, or how to get started. Available 24/7.</p>
          </div>
          <div class="feature-card reveal" style="--reveal-delay:0.5s">
            <div class="feature-icon" style="background:#fce4ec;color:#c62828;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h3>Secure & Compliant</h3>
            <p>JWT-secured sessions, OTP email verification, and admin-controlled account management.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ HOW IT WORKS ══ -->
    <section class="section section--alt" id="how">
      <div class="section-inner">
        <p class="section-eyebrow reveal">Simple by design</p>
        <h2 class="section-title reveal">Up and running in minutes</h2>
        <div class="steps-row">
          <div class="step reveal" style="--reveal-delay:0.05s">
            <div class="step-num">1</div>
            <h3 class="step-title">Create account</h3>
            <p class="step-desc">Register with your email, verify with OTP. Takes under a minute.</p>
          </div>
          <div class="step-arrow">
            <svg width="32" height="16" viewBox="0 0 32 16" fill="none" stroke="var(--outline-variant)" stroke-width="1.5" stroke-linecap="round"><path d="M2 8h26M22 3l6 5-6 5"/></svg>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <h3 class="step-title">Complete KYC</h3>
            <p class="step-desc">Submit your documents. Admin approves within hours — unlocking full features.</p>
          </div>
          <div class="step-arrow">
            <svg width="32" height="16" viewBox="0 0 32 16" fill="none" stroke="var(--outline-variant)" stroke-width="1.5" stroke-linecap="round"><path d="M2 8h26M22 3l6 5-6 5"/></svg>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <h3 class="step-title">Top up & send</h3>
            <p class="step-desc">Add funds, transfer to anyone by email, and earn points automatically.</p>
          </div>
          <div class="step-arrow">
            <svg width="32" height="16" viewBox="0 0 32 16" fill="none" stroke="var(--outline-variant)" stroke-width="1.5" stroke-linecap="round"><path d="M2 8h26M22 3l6 5-6 5"/></svg>
          </div>
          <div class="step">
            <div class="step-num">4</div>
            <h3 class="step-title">Redeem rewards</h3>
            <p class="step-desc">Browse the catalog and redeem your points for vouchers, food, travel & more.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ REWARDS HIGHLIGHT ══ -->
    <section class="section" id="rewards">
      <div class="section-inner">
        <p class="section-eyebrow reveal">Loyalty program</p>
        <h2 class="section-title reveal">Earn more, every time</h2>
        <div class="rewards-highlight">
          <div class="rh-left">
            <div class="rh-item reveal" style="--reveal-delay:0.05s">
              <div class="rh-icon">🎉</div>
              <div>
                <div class="rh-title">Welcome Bonus</div>
                <div class="rh-desc">Get +10 points just for signing up</div>
              </div>
              <div class="rh-pts">+10 pts</div>
            </div>
            <div class="rh-item">
              <div class="rh-icon">💸</div>
              <div>
                <div class="rh-title">Every Transaction</div>
                <div class="rh-desc">1 point per ₹10 on every transfer</div>
              </div>
              <div class="rh-pts">1 pt / ₹10</div>
            </div>
            <div class="rh-item">
              <div class="rh-icon">🚀</div>
              <div>
                <div class="rh-title">Big Transfer Bonus</div>
                <div class="rh-desc">Send ₹1,000+ and earn extra points</div>
              </div>
              <div class="rh-pts">+50 pts</div>
            </div>
            <div class="rh-item">
              <div class="rh-icon">💎</div>
              <div>
                <div class="rh-title">High-Value Bonus</div>
                <div class="rh-desc">Send ₹5,000+ for maximum bonus</div>
              </div>
              <div class="rh-pts">+200 pts</div>
            </div>
          </div>
          <div class="rh-right">
            <div class="tier-cards">
              <div class="tier-card">
                <div class="tier-badge-icon">🥉</div>
                <div class="tier-name">Bronze</div>
                <div class="tier-range">0 – 499 pts</div>
              </div>
              <div class="tier-card tier-card--active">
                <div class="tier-badge-icon">🥈</div>
                <div class="tier-name">Silver</div>
                <div class="tier-range">500 – 1,999 pts</div>
              </div>
              <div class="tier-card">
                <div class="tier-badge-icon">🥇</div>
                <div class="tier-name">Gold</div>
                <div class="tier-range">2,000 – 4,999 pts</div>
              </div>
              <div class="tier-card">
                <div class="tier-badge-icon">💎</div>
                <div class="tier-name">Platinum</div>
                <div class="tier-range">5,000+ pts</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ CTA BANNER ══ -->
    <section class="cta-banner">
      <h2 class="cta-title">Ready to get started?</h2>
      <p class="cta-sub">Join Aurelian today — it's free, fast, and rewarding.</p>
      <div class="cta-actions">
        <a routerLink="/auth/register" class="btn btn-hero-primary">
          Create free account
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
        </a>
        <a routerLink="/auth/login" class="btn btn-hero-ghost" style="border-color:rgba(255,255,255,0.4);color:white;">
          Sign in
        </a>
      </div>
    </section>

    <!-- ══ FOOTER ══ -->
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="14" fill="url(#footGrad)"/>
            <path d="M15 33L24 15L33 33" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M18.5 27H29.5" stroke="white" stroke-width="3" stroke-linecap="round"/>
            <defs>
              <linearGradient id="footGrad" x1="0" y1="0" x2="48" y2="48">
                <stop offset="0%" stop-color="#944a00"/>
                <stop offset="100%" stop-color="#e87f24"/>
              </linearGradient>
            </defs>
          </svg>
          <span>Aurelian Finance</span>
        </div>
        <p class="footer-copy">© 2026 Aurelian. Built with WalletPlatform.</p>
      </div>
    </footer>
  `,
  styles: [`
    :host { display: block; font-family: var(--font-body, system-ui); }

    /* ── Navbar ─────────────────────────────────────────── */
    .navbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 100;
      transition: background 0.2s, box-shadow 0.2s;
      padding: 0 24px;

      &.scrolled {
        background: rgba(255,255,255,0.92);
        backdrop-filter: blur(12px);
        box-shadow: 0 1px 0 var(--outline-variant);
      }
    }

    .nav-inner {
      max-width: 1200px;
      margin: 0 auto;
      height: 64px;
      display: flex;
      align-items: center;
      gap: 32px;
    }

    .nav-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }

    .nav-brand {
      font-family: var(--font-display, Georgia);
      font-size: 20px;
      font-weight: 800;
      color: var(--on-surface);
      letter-spacing: -0.02em;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;

      @media (max-width: 640px) { display: none; }
    }

    .nav-link {
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      color: var(--on-surface-variant);
      text-decoration: none;
      background: none;
      border: none;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s, color 0.15s;
      &:hover { background: var(--surface-container-low); color: var(--on-surface); }
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
    }

    .btn-ghost {
      background: none;
      border: 1.5px solid var(--outline-variant);
      color: var(--on-surface);
      padding: 7px 18px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s;
      &:hover { background: var(--surface-container-low); }
    }

    .btn-sm { padding: 7px 18px !important; font-size: 13px !important; border-radius: 20px !important; }

    /* ── Hero ───────────────────────────────────────────── */
    .hero {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 80px;
      padding: 100px 48px 80px;
      max-width: 1200px;
      margin: 0 auto;
      position: relative;

      @media (max-width: 960px) {
        flex-direction: column;
        gap: 48px;
        padding: 100px 24px 60px;
      }
    }

    .hero-bg {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: -1;
    }

    /* ── Hero animations ──────────────────────────────────── */
    .anim-fade-up {
      animation: heroFadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes heroFadeUp {
      from { opacity: 0; transform: translateY(28px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Scroll reveal base ──────────────────────────────── */
    .reveal {
      opacity: 0;
      transform: translateY(30px);
      transition: opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1),
                  transform 0.65s cubic-bezier(0.16, 1, 0.3, 1);
      transition-delay: var(--reveal-delay, 0s);

      &.visible {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .hero-blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.18;

      &--1 {
        width: 600px; height: 600px;
        background: var(--primary);
        top: -200px; right: -200px;
        animation: blobDrift1 12s ease-in-out infinite;
      }
      &--2 {
        width: 400px; height: 400px;
        background: #f57f17;
        bottom: -100px; left: -100px;
        animation: blobDrift2 14s ease-in-out infinite;
      }
      &--3 {
        width: 280px; height: 280px;
        background: #6a1b9a;
        top: 40%; left: 30%;
        opacity: 0.06;
        animation: blobDrift3 18s ease-in-out infinite;
      }
    }

    @keyframes blobDrift1 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33%       { transform: translate(-30px, 20px) scale(1.05); }
      66%       { transform: translate(20px, -30px) scale(0.95); }
    }
    @keyframes blobDrift2 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      40%       { transform: translate(25px, -20px) scale(1.08); }
      70%       { transform: translate(-15px, 25px) scale(0.97); }
    }
    @keyframes blobDrift3 {
      0%, 100% { transform: translate(0, 0); }
      50%       { transform: translate(40px, -30px); }
    }

    /* ── Grid overlay on hero bg ─────────────────────────── */
    .hero-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(148, 74, 0, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(148, 74, 0, 0.04) 1px, transparent 1px);
      background-size: 48px 48px;
      mask-image: radial-gradient(ellipse at center, black 20%, transparent 80%);
    }

    .hero-content { flex: 1; max-width: 540px; }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #fff8e1;
      color: #e65100;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 24px;
    }

    .hero-headline {
      font-family: var(--font-display, Georgia);
      font-size: clamp(2.8rem, 5vw, 4rem);
      font-weight: 800;
      line-height: 1.05;
      letter-spacing: -0.03em;
      color: var(--on-surface);
      margin-bottom: 20px;
    }

    .gradient-text {
      background: linear-gradient(135deg, var(--primary) 0%, #f57f17 45%, var(--primary) 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: gradientShimmer 4s linear infinite;
    }

    @keyframes gradientShimmer {
      0%   { background-position: 0% center; }
      100% { background-position: 200% center; }
    }

    .hero-sub {
      font-size: 1.0625rem;
      line-height: 1.7;
      color: var(--on-surface-variant);
      margin-bottom: 32px;
      max-width: 480px;
    }

    .hero-cta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 28px;
      flex-wrap: wrap;
    }

    .btn-hero-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--primary);
      color: white;
      padding: 14px 28px;
      border-radius: 14px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      box-shadow: 0 8px 24px rgba(148,74,0,0.3);
      transition: transform 0.15s, box-shadow 0.15s;
      &:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(148,74,0,0.4); }
    }

    .btn-hero-ghost {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: none;
      color: var(--on-surface);
      padding: 14px 28px;
      border-radius: 14px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      border: 1.5px solid var(--outline-variant);
      transition: background 0.15s;
      &:hover { background: var(--surface-container-low); }
    }

    .hero-trust {
      display: flex;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }

    .trust-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--on-surface-variant);
      font-weight: 500;
    }

    /* ── Mockup card ────────────────────────────────────── */
    .hero-visual {
      flex-shrink: 0;
      position: relative;
      width: 520px;

      @media (max-width: 1100px) { width: 320px; }
      @media (max-width: 960px)  { width: 100%; max-width: 340px; }
    }

    .hero-visual .mockup-card {
      width: 320px;
      margin: 20px auto;
    }

    .mockup-card {
      background: var(--surface-container-lowest, white);
      border-radius: 28px;
      padding: 28px 24px;
      box-shadow: 0 32px 80px rgba(0,0,0,0.14);
      border: 1px solid var(--outline-variant, #e0e0e0);
      position: relative;
      z-index: 1;
      animation: mockupSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
    }

    @keyframes mockupSlideIn {
      from { opacity: 0; transform: translateX(40px) rotate(2deg); }
      to   { opacity: 1; transform: translateX(0) rotate(0deg); }
    }

    .mockup-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
    }

    .mockup-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), #f57f17);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
    }

    .mockup-name { font-size: 13px; font-weight: 700; }
    .mockup-sub { font-size: 11px; color: var(--on-surface-variant, #666); }

    .mockup-badge {
      margin-left: auto;
      background: #e8f5e9;
      color: #2e7d32;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
    }

    .mockup-balance-label {
      font-size: 12px;
      color: var(--on-surface-variant, #666);
      margin-bottom: 4px;
    }

    .mockup-balance {
      font-family: var(--font-display, Georgia);
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--on-surface);
      margin-bottom: 16px;
    }

    .mockup-row {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }

    .mockup-stat {
      flex: 1;
      background: var(--surface-container-low, #f5f5f5);
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .mockup-stat-label { font-size: 11px; color: var(--on-surface-variant, #666); }
    .mockup-stat-val { font-size: 13px; font-weight: 700; }

    .mockup-txns { display: flex; flex-direction: column; gap: 8px; }

    .mockup-txn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 0;
      border-top: 1px solid var(--outline-variant, #f0f0f0);
    }

    .mockup-txn-icon {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &.credit { background: #e8f5e9; color: #2e7d32; }
      &.debit  { background: #fce4ec; color: #c62828; }
      &.reward { background: #fff8e1; color: #f57f17; }
    }

    .mockup-txn-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      font-size: 12px;
      gap: 1px;
      font-weight: 500;
    }

    .muted { color: var(--on-surface-variant, #666); font-weight: 400; font-size: 11px; }
    .pos { font-size: 12px; font-weight: 700; color: #2e7d32; white-space: nowrap; }
    .neg { font-size: 12px; font-weight: 700; color: #c62828; white-space: nowrap; }

    /* Floating chips */
    .float-chip {
      position: absolute;
      background: white;
      border-radius: 28px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
      animation: floatBob 3.5s ease-in-out infinite, fadeSlideIn 0.6s ease both;
      z-index: 10;

      &--1 {
        top: 30px;
        right: 16px;
        background: linear-gradient(135deg, #e8f5e9, #f1f8e9);
        border: 1.5px solid #a5d6a7;
        box-shadow: 0 8px 28px rgba(46,125,50,0.18);
        color: #1b5e20;
        animation-delay: 0s, 0.2s;
      }
      &--2 {
        bottom: 120px;
        right: 4px;
        background: linear-gradient(135deg, #fff8e1, #fff3e0);
        border: 1.5px solid #ffcc02;
        box-shadow: 0 8px 28px rgba(245,127,23,0.2);
        color: #e65100;
        animation-delay: 1.2s, 0.5s;
      }
      &--3 {
        bottom: 24px;
        left: 16px;
        background: linear-gradient(135deg, #f3e5f5, #ede7f6);
        border: 1.5px solid #ce93d8;
        box-shadow: 0 8px 28px rgba(106,27,154,0.16);
        color: #4a148c;
        animation-delay: 2.2s, 0.8s;
      }

      @media (max-width: 1100px) { display: none; }
    }

    @keyframes floatBob {
      0%, 100% { transform: translateY(0px) rotate(-1deg); }
      50%       { transform: translateY(-10px) rotate(1deg); }
    }

    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(12px) scale(0.9); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ── Stats strip ────────────────────────────────────── */
    .stats-strip {
      background: var(--primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      padding: 24px 48px;
      flex-wrap: wrap;
    }

    .strip-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 48px;
    }

    .strip-num {
      font-family: var(--font-display, Georgia);
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .strip-label { font-size: 13px; color: rgba(255,255,255,0.75); }

    .strip-divider {
      width: 1px;
      height: 40px;
      background: rgba(255,255,255,0.25);
    }

    /* ── Sections ───────────────────────────────────────── */
    .section {
      padding: 96px 48px;
      background: var(--background);

      &--alt { background: var(--surface-container-lowest, #fafafa); }

      @media (max-width: 768px) { padding: 64px 24px; }
    }

    .section-inner { max-width: 1100px; margin: 0 auto; }

    .section-eyebrow {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--primary);
      margin-bottom: 12px;
    }

    .section-title {
      font-family: var(--font-display, Georgia);
      font-size: clamp(1.8rem, 3vw, 2.5rem);
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--on-surface);
      margin-bottom: 12px;
    }

    .section-sub {
      font-size: 1rem;
      color: var(--on-surface-variant);
      margin-bottom: 52px;
      max-width: 520px;
    }

    /* ── Features grid ──────────────────────────────────── */
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .feature-card {
      background: var(--surface-container-lowest, white);
      border-radius: 20px;
      padding: 28px;
      border: 1.5px solid var(--outline-variant, #e0e0e0);
      transition: transform 0.15s, box-shadow 0.15s;

      &:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.08); }

      h3 { font-size: 16px; font-weight: 700; margin: 16px 0 8px; }
      p  { font-size: 14px; line-height: 1.6; color: var(--on-surface-variant); margin: 0; }
    }

    .feature-icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* ── How it works ───────────────────────────────────── */
    .steps-row {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .step {
      flex: 1;
      min-width: 160px;
      max-width: 200px;
      text-align: center;
    }

    .step-num {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--primary);
      color: white;
      font-family: var(--font-display, Georgia);
      font-size: 20px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      box-shadow: 0 0 0 0 rgba(148,74,0,0.4);
      animation: stepPulse 2.5s ease-in-out infinite;
    }

    .step:nth-child(3)  .step-num { animation-delay: 0.4s; }
    .step:nth-child(5)  .step-num { animation-delay: 0.8s; }
    .step:nth-child(7)  .step-num { animation-delay: 1.2s; }

    @keyframes stepPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(148,74,0,0.35); }
      50%       { box-shadow: 0 0 0 8px rgba(148,74,0,0); }
    }

    .step-title { font-size: 15px; font-weight: 700; margin-bottom: 8px; }
    .step-desc  { font-size: 13px; line-height: 1.6; color: var(--on-surface-variant); }

    .step-arrow {
      margin-top: 24px;
      @media (max-width: 640px) { display: none; }
    }

    /* ── Rewards highlight ──────────────────────────────── */
    .rewards-highlight {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      align-items: center;

      @media (max-width: 768px) { grid-template-columns: 1fr; }
    }

    .rh-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 18px 20px;
      background: var(--surface-container-lowest, white);
      border-radius: 16px;
      border: 1px solid var(--outline-variant, #e0e0e0);
      margin-bottom: 12px;
      transition: transform 0.15s;
      &:hover { transform: translateX(4px); }
    }

    .rh-icon { font-size: 28px; flex-shrink: 0; }
    .rh-title { font-size: 14px; font-weight: 700; }
    .rh-desc  { font-size: 13px; color: var(--on-surface-variant); }
    .rh-pts   { margin-left: auto; font-weight: 800; color: var(--primary); font-size: 14px; white-space: nowrap; }

    .tier-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .tier-card {
      background: var(--surface-container-lowest, white);
      border: 1.5px solid var(--outline-variant, #e0e0e0);
      border-radius: 16px;
      padding: 20px 16px;
      text-align: center;
      transition: transform 0.15s;

      &--active {
        background: linear-gradient(135deg, #fff8e1, #fff3e0);
        border-color: #f57f17;
        transform: scale(1.04);
      }
    }

    .tier-badge-icon { font-size: 28px; margin-bottom: 8px; }
    .tier-name { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
    .tier-range { font-size: 12px; color: var(--on-surface-variant); }

    /* ── CTA Banner ─────────────────────────────────────── */
    .cta-banner {
      background: linear-gradient(135deg, #7a3900 0%, var(--primary) 50%, var(--primary-container) 100%);
      padding: 96px 48px;
      text-align: center;
      color: white;

      @media (max-width: 768px) { padding: 64px 24px; }
    }

    .cta-title {
      font-family: var(--font-display, Georgia);
      font-size: clamp(2rem, 4vw, 3rem);
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 12px;
    }

    .cta-sub {
      font-size: 1.0625rem;
      color: rgba(255,255,255,0.8);
      margin-bottom: 36px;
    }

    .cta-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    /* ── Footer ─────────────────────────────────────────── */
    .footer {
      background: var(--surface-container-lowest, white);
      border-top: 1px solid var(--outline-variant, #e0e0e0);
      padding: 32px 48px;
    }

    .footer-inner {
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .footer-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      font-size: 15px;
    }

    .footer-copy { font-size: 13px; color: var(--on-surface-variant); }
  `]
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  private auth = inject(AuthService);
  private el   = inject(ElementRef);

  scrolled   = signal(false);
  isLoggedIn = this.auth.isAuthenticated;

  private observer!: IntersectionObserver;

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 20);
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            this.observer.unobserve(entry.target); // fire once
          }
        });
      },
      { threshold: 0.12 }
    );

    this.el.nativeElement.querySelectorAll('.reveal').forEach((el: Element) => {
      this.observer.observe(el);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
