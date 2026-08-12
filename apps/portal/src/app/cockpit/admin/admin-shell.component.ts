import { Component, OnInit, OnDestroy } from "@angular/core";
import { NavigationEnd, Router, RouterModule, RouterOutlet } from "@angular/router";
import { Subscription } from "rxjs";
import { filter } from "rxjs/operators";
import { SessionStore } from "../../core/session.store";

@Component({
  selector: "app-admin-shell",
  standalone: true,
  imports: [RouterOutlet, RouterModule],
  template: `
    <div class="ck-surface--cockpit ck-shell">

      <!-- ======================================================= -->
      <!-- TOPBAR — row 1, spans all 3 columns                      -->
      <!-- ======================================================= -->
      <header class="ck-appbar ck-appbar--admin">
        <a class="ck-brand" routerLink="/admin/overview">
          <span class="ck-brand__mark ck-auto-030">⬡</span>
          <span class="ck-brand__name">Superadmin</span>
        </a>

        <nav class="ck-topnav">
          <a class="ck-topnav__item"
             routerLink="/admin/overview"
             [class.is-active]="adminSection === 'overview'">
            <span class="ck-topnav__icon">⬡</span> Overview
          </a>
          <a class="ck-topnav__item"
             routerLink="/admin/requests"
             [class.is-active]="adminSection === 'platform'">
            <span class="ck-topnav__icon">◎</span> Platform
          </a>
          <a class="ck-topnav__item"
             routerLink="/admin/platform"
             [class.is-active]="adminSection === 'config'">
            <span class="ck-topnav__icon">⊙</span> Config
          </a>
          <a class="ck-topnav__item" routerLink="/app/dashboard">
            <span class="ck-topnav__icon">←</span> Workspace
          </a>
        </nav>

        <div class="ck-appbar__actions">
          <span class="ck-badge ck-badge--danger">Superadmin</span>
          <div class="ck-user-pill">
            <span class="ck-user-pill__avatar ck-auto-030">{{ userInitial }}</span>
            <div class="ck-user-pill__info">
              <div class="ck-user-pill__email">{{ session.user()?.email }}</div>
              <div class="ck-user-pill__role">superadmin</div>
            </div>
            <button class="ck-user-pill__btn" (click)="logout()" title="Sign out">⎋</button>
          </div>
        </div>
      </header>

      <!-- ======================================================= -->
      <!-- SIDEBAR LEFT — row 2 col 1 — dynamic sub-navigation      -->
      <!-- ======================================================= -->
      <aside class="ck-sidebar">
        <nav class="ck-nav">
          @switch (adminSection) {

            @case ('overview') {
              <div class="ck-nav__group">
                <div class="ck-nav__group-label">Platform</div>
                <a class="ck-nav__item" routerLink="/admin/overview" routerLinkActive="is-active">
                  <span class="ck-nav__icon">⬡</span> Overview
                </a>
              </div>
            }

            @case ('platform') {
              <div class="ck-nav__group">
                <div class="ck-nav__group-label">Platform</div>
                <a class="ck-nav__item" routerLink="/admin/requests" routerLinkActive="is-active">
                  <span class="ck-nav__icon">◎</span> Access Requests
                  @if (pendingCount > 0) {
                    <span class="ck-nav__badge">{{ pendingCount }}</span>
                  }
                </a>
                <a class="ck-nav__item" routerLink="/admin/tenants" routerLinkActive="is-active">
                  <span class="ck-nav__icon">◈</span> Tenants
                </a>
                <a class="ck-nav__item" routerLink="/admin/users" routerLinkActive="is-active">
                  <span class="ck-nav__icon">◉</span> Users
                </a>
              </div>
            }

            @case ('config') {
              <div class="ck-nav__group">
                <div class="ck-nav__group-label">Configuration</div>
                <a class="ck-nav__item" routerLink="/admin/platform" routerLinkActive="is-active">
                  <span class="ck-nav__icon">⊙</span> Platform Settings
                </a>
              </div>
            }

            @default {
              <div class="ck-nav__group">
                <a class="ck-nav__item" routerLink="/admin/overview" routerLinkActive="is-active">
                  <span class="ck-nav__icon">⬡</span> Overview
                </a>
              </div>
            }

          }

          <div class="ck-nav__group">
            <div class="ck-nav__group-label">Navigate</div>
            <a class="ck-nav__item" routerLink="/app/dashboard">
              <span class="ck-nav__icon">←</span> Back to Workspace
            </a>
          </div>
        </nav>
      </aside>

      <!-- ======================================================= -->
      <!-- CENTER CONTENT — row 2 col 2                             -->
      <!-- ======================================================= -->
      <main class="ck-main">
        <div class="ck-workbench">
          <div class="ck-route-host">
            <router-outlet />
          </div>
        </div>
      </main>

      <!-- ======================================================= -->
      <!-- SIDEBAR RIGHT — row 2 col 3 — contextual panel           -->
      <!-- ======================================================= -->
      <aside class="ck-panel-right">
        <div class="ck-panel-section">
          <p class="ck-panel-section__label">Mode</p>
          <p class="ck-panel-section__value">Platform Governance</p>
          <p class="ck-panel-section__sub">{{ session.user()?.email }}</p>
        </div>

        <div class="ck-panel-section">
          <p class="ck-panel-section__label">Current</p>
          <p class="ck-panel-section__value">{{ shellTitle }}</p>
          <p class="ck-panel-section__sub">{{ shellSection }}</p>
        </div>

        <div class="ck-panel-section">
          <p class="ck-panel-section__label">Quick Access</p>
          <div class="ck-panel-quick">
            <a class="ck-panel-quick__item" routerLink="/admin/requests">Access Requests</a>
            <a class="ck-panel-quick__item" routerLink="/admin/tenants">Tenants</a>
            <a class="ck-panel-quick__item" routerLink="/admin/users">Users</a>
            <a class="ck-panel-quick__item" routerLink="/admin/platform">Settings</a>
          </div>
        </div>
      </aside>

    </div>
  `,
})
export class AdminShellComponent implements OnInit, OnDestroy {
  pendingCount = 0;
  currentUrl = '';
  private navSub?: Subscription;

  get userInitial(): string {
    return (this.session.user()?.email ?? "A").charAt(0).toUpperCase();
  }

  get adminSection(): string {
    const url = this.currentUrl;
    if (url.includes('/admin/overview')) return 'overview';
    if (url.includes('/admin/requests') || url.includes('/admin/tenants') || url.includes('/admin/users')) return 'platform';
    if (url.includes('/admin/platform')) return 'config';
    return 'overview';
  }

  constructor(
    readonly session: SessionStore,
    private readonly router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.currentUrl = this.router.url;
    this.navSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      this.currentUrl = this.router.url;
    });

    await this.session.ensureLoaded();
    if (!this.session.user()) {
      await this.router.navigate(["/login"]);
      return;
    }
    if (this.session.user()?.platformRole !== "superadmin") {
      await this.router.navigate(["/app"]);
    }
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  async logout(): Promise<void> {
    await this.session.logout();
    window.location.href = "/login";
  }

  get shellSection(): string {
    return this.routeData("section", "Platform");
  }

  get shellTitle(): string {
    return this.routeData("title", "Overview");
  }

  private routeData(key: string, fallback: string): string {
    let snapshot = this.router.routerState.snapshot.root;
    while (snapshot.firstChild) {
      snapshot = snapshot.firstChild;
    }
    const value = snapshot.data[key];
    return typeof value === "string" && value.trim() ? value : fallback;
  }
}
