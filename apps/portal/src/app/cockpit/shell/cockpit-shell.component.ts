import { Component, OnInit, OnDestroy } from "@angular/core";
import { NavigationEnd, Router, RouterModule, RouterOutlet } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { Subscription } from "rxjs";
import { filter } from "rxjs/operators";
import { SessionStore } from "../../core/session.store";
import { PortalApiService } from "../../core/portal-api.service";
import { CockpitStore } from "../cockpit-store.service";

@Component({
  selector: "app-cockpit-shell",
  standalone: true,
  imports: [RouterOutlet, RouterModule, FormsModule],
  template: `
    <div class="ck-surface--cockpit ck-shell">

      <!-- ======================================================= -->
      <!-- TOPBAR — row 1, spans all 3 columns                      -->
      <!-- ======================================================= -->
      <header class="ck-appbar">
        <a class="ck-brand" routerLink="/app/dashboard">
          <span class="ck-brand__mark">T</span>
          <span class="ck-brand__name">Talkaris</span>
        </a>

        <nav class="ck-topnav">
          <a class="ck-topnav__item"
             routerLink="/app/dashboard"
             [class.is-active]="activeSection === 'dashboard'">
            <span class="ck-topnav__icon">⬡</span> Dashboard
          </a>
          <a class="ck-topnav__item"
             routerLink="/app/bots"
             [class.is-active]="activeSection === 'bots'">
            <span class="ck-topnav__icon">◈</span> Bots
          </a>
          <a class="ck-topnav__item"
             routerLink="/app/conversations"
             [class.is-active]="activeSection === 'conversations'">
            <span class="ck-topnav__icon">◎</span> Conversations
          </a>
          <a class="ck-topnav__item"
             routerLink="/app/knowledge"
             [class.is-active]="activeSection === 'knowledge'">
            <span class="ck-topnav__icon">◫</span> Knowledge
          </a>
          <a class="ck-topnav__item"
             routerLink="/app/analytics"
             [class.is-active]="activeSection === 'analytics'">
            <span class="ck-topnav__icon">▣</span> Analytics
          </a>
          <a class="ck-topnav__item"
             routerLink="/app/channels"
             [class.is-active]="activeSection === 'channels'">
            <span class="ck-topnav__icon">⇄</span> Channels
          </a>
          <a class="ck-topnav__item"
             routerLink="/app/settings"
             [class.is-active]="activeSection === 'settings'">
            <span class="ck-topnav__icon">⊙</span> Settings
          </a>
        </nav>

        <div class="ck-appbar__actions">
          @if (store.activeTenant()?.name) {
            <span class="ck-badge ck-badge--default">{{ store.activeTenant()?.name }}</span>
          }
          <div class="ck-user-pill">
            <span class="ck-user-pill__avatar">{{ userInitial }}</span>
            <div class="ck-user-pill__info">
              <div class="ck-user-pill__email">{{ session.user()?.email }}</div>
              <div class="ck-user-pill__role">{{ session.user()?.platformRole }}</div>
            </div>
            <button class="ck-user-pill__btn" (click)="logout()" title="Sign out">⎋</button>
          </div>
        </div>
      </header>

      <!-- ======================================================= -->
      <!-- SIDEBAR LEFT — row 2 col 1 — dynamic sub-navigation      -->
      <!-- ======================================================= -->
      <aside class="ck-sidebar">
        <div class="ck-workspace">
          <div class="ck-workspace__label">Workspace</div>
          <select
            class="ck-workspace__select"
            [ngModel]="store.activeTenantId()"
            (ngModelChange)="store.setActiveTenantId($event)"
          >
            @for (t of store.tenants(); track t.id) {
              <option [value]="t.id">{{ t.name }}</option>
            }
          </select>
        </div>

        <nav class="ck-nav">
          @switch (activeSection) {

            @case ('bots') {
              <div class="ck-nav__group">
                <div class="ck-nav__group-label">Bots</div>
                <a class="ck-nav__item" routerLink="/app/bots" routerLinkActive="is-active" [routerLinkActiveOptions]="{exact:true}">
                  <span class="ck-nav__icon">◈</span> All Bots
                </a>
                <a class="ck-nav__item" routerLink="/app/bots/new" routerLinkActive="is-active">
                  <span class="ck-nav__icon">+</span> Create Bot
                </a>
                <a class="ck-nav__item" routerLink="/app/deployments" routerLinkActive="is-active">
                  <span class="ck-nav__icon">▲</span> Deployments
                </a>
              </div>
            }

            @case ('conversations') {
              <div class="ck-nav__group">
                <div class="ck-nav__group-label">Conversations</div>
                <a class="ck-nav__item" routerLink="/app/conversations" routerLinkActive="is-active" [routerLinkActiveOptions]="{exact:true}">
                  <span class="ck-nav__icon">◎</span> History
                </a>
                <a class="ck-nav__item" routerLink="/app/conversations/live" routerLinkActive="is-active">
                  <span class="ck-nav__icon">●</span> Live Queue
                </a>
              </div>
            }

            @case ('knowledge') {
              <div class="ck-nav__group">
                <div class="ck-nav__group-label">Knowledge Base</div>
                <a class="ck-nav__item" routerLink="/app/knowledge" routerLinkActive="is-active" [routerLinkActiveOptions]="{exact:true}">
                  <span class="ck-nav__icon">◫</span> Sources
                </a>
                <a class="ck-nav__item" routerLink="/app/knowledge/documents" routerLinkActive="is-active">
                  <span class="ck-nav__icon">≡</span> Documents
                </a>
                <a class="ck-nav__item" routerLink="/app/knowledge/ingestions" routerLinkActive="is-active">
                  <span class="ck-nav__icon">↻</span> Ingestion Jobs
                </a>
                <a class="ck-nav__item" routerLink="/app/knowledge/schedules" routerLinkActive="is-active">
                  <span class="ck-nav__icon">⏱</span> Schedules
                </a>
              </div>
            }

            @case ('analytics') {
              <div class="ck-nav__group">
                <div class="ck-nav__group-label">Analytics & Data</div>
                <a class="ck-nav__item" routerLink="/app/analytics" routerLinkActive="is-active">
                  <span class="ck-nav__icon">▣</span> Overview
                </a>
                <a class="ck-nav__item" routerLink="/app/leads" routerLinkActive="is-active">
                  <span class="ck-nav__icon">◉</span> Leads
                </a>
              </div>
            }

            @case ('channels') {
              <div class="ck-nav__group">
                <div class="ck-nav__group-label">Channels</div>
                <a class="ck-nav__item" routerLink="/app/channels" routerLinkActive="is-active">
                  <span class="ck-nav__icon">⇄</span> All Channels
                </a>
              </div>
            }

            @case ('settings') {
              <div class="ck-nav__group">
                <div class="ck-nav__group-label">Settings</div>
                <a class="ck-nav__item" routerLink="/app/settings" routerLinkActive="is-active" [routerLinkActiveOptions]="{exact:true}">
                  <span class="ck-nav__icon">⊙</span> Workspace
                </a>
                <a class="ck-nav__item" routerLink="/app/settings/members" routerLinkActive="is-active">
                  <span class="ck-nav__icon">◎</span> Members
                </a>
                <a class="ck-nav__item" routerLink="/app/settings/notifications" routerLinkActive="is-active">
                  <span class="ck-nav__icon">◈</span> Notifications
                </a>
              </div>
              <div class="ck-nav__group">
                <div class="ck-nav__group-label">Developer</div>
                <a class="ck-nav__item" routerLink="/app/developers" routerLinkActive="is-active">
                  <span class="ck-nav__icon">⌗</span> API & Embed
                </a>
                <a class="ck-nav__item" routerLink="/app/settings/api-keys" routerLinkActive="is-active">
                  <span class="ck-nav__icon">⚿</span> API Keys
                </a>
                <a class="ck-nav__item" routerLink="/app/settings/webhooks" routerLinkActive="is-active">
                  <span class="ck-nav__icon">↗</span> Webhooks
                </a>
              </div>
            }

            @default {
              <div class="ck-nav__group">
                <div class="ck-nav__group-label">Overview</div>
                <a class="ck-nav__item" routerLink="/app/dashboard" routerLinkActive="is-active">
                  <span class="ck-nav__icon">⬡</span> Dashboard
                </a>
              </div>
            }

          }

          @if (session.user()?.platformRole === 'superadmin') {
            <div class="ck-nav__group">
              <div class="ck-nav__group-label">Admin</div>
              <a class="ck-nav__item" routerLink="/admin/overview">
                <span class="ck-nav__icon">⬡</span> Superadmin
              </a>
            </div>
          }
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
          <p class="ck-panel-section__label">Workspace</p>
          <p class="ck-panel-section__value">{{ store.activeTenant()?.name ?? '—' }}</p>
          <p class="ck-panel-section__sub">{{ session.user()?.platformRole }}</p>
        </div>

        <div class="ck-panel-section">
          <p class="ck-panel-section__label">Current</p>
          <p class="ck-panel-section__value">{{ shellTitle }}</p>
          <p class="ck-panel-section__sub">{{ shellSection }}</p>
        </div>

        <div class="ck-panel-section">
          <p class="ck-panel-section__label">Quick Access</p>
          <div class="ck-panel-quick">
            <a class="ck-panel-quick__item" routerLink="/app/bots/new">+ New Bot</a>
            <a class="ck-panel-quick__item" routerLink="/app/conversations">Conversations</a>
            <a class="ck-panel-quick__item" routerLink="/app/knowledge">Knowledge</a>
            <a class="ck-panel-quick__item" routerLink="/app/analytics">Analytics</a>
            <a class="ck-panel-quick__item" routerLink="/app/leads">Leads</a>
          </div>
        </div>
      </aside>

    </div>
  `,
})
export class CockpitShellComponent implements OnInit, OnDestroy {
  currentUrl = '';
  private navSub?: Subscription;

  get userInitial(): string {
    const email = this.session.user()?.email ?? "?";
    return email.charAt(0).toUpperCase();
  }

  get activeSection(): string {
    const url = this.currentUrl;
    if (url.includes('/app/bots') || url.includes('/app/deployments')) return 'bots';
    if (url.includes('/app/conversations')) return 'conversations';
    if (url.includes('/app/knowledge')) return 'knowledge';
    if (url.includes('/app/analytics') || url.includes('/app/leads')) return 'analytics';
    if (url.includes('/app/channels')) return 'channels';
    if (url.includes('/app/settings') || url.includes('/app/developers')) return 'settings';
    return 'dashboard';
  }

  constructor(
    readonly session: SessionStore,
    readonly store: CockpitStore,
    private readonly api: PortalApiService,
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
    const tenants = await this.api.listTenants();
    this.store.setTenants(tenants);
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  async logout(): Promise<void> {
    await this.session.logout();
    window.location.href = "/login";
  }

  get shellSection(): string {
    return this.routeData("section", "Workspace");
  }

  get shellTitle(): string {
    return this.routeData("title", "Dashboard");
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
