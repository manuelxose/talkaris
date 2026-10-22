import { CommonModule, DOCUMENT, isPlatformBrowser } from "@angular/common";
import { AfterViewInit, Component, ElementRef, inject, NgZone, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { DEFAULT_PORTAL_SETTINGS } from "../content/public-site";
import { SessionStore } from "../core/session.store";
import { PortalApiService } from "../core/portal-api.service";
import { SeoService } from "../services/seo.service";
import { buildNoIndexSeo } from "../services/seo-utils";

@Component({
  selector: "app-login-page",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="ck-surface--cockpit login-shell">
      <div class="login-panel">

        <div class="login-brand">
          <span class="login-brand__logo">Talkaris</span>
          <span class="login-brand__tag">Portal privado</span>
        </div>

        <div class="login-card">
          <div class="login-card__header">
            <h1>Acceder</h1>
            <p>Administra tenants, proyectos e integraciones desde el portal de Talkaris.</p>
          </div>

          <div class="ck-alert ck-alert--danger" role="alert" *ngIf="errorMessage">{{ errorMessage }}</div>

          <div #googleButton class="login-google" [attr.aria-busy]="loading"></div>

          <form class="ck-form-stack auth-form" (ngSubmit)="submit()">
            <div class="ck-field">
              <label class="ck-label" for="login-email">Email</label>
              <input
                id="login-email"
                class="ck-input"
                [(ngModel)]="email"
                name="email"
                type="email"
                required
                autocomplete="email"
                placeholder="tu@empresa.com"
              />
            </div>

            <div class="ck-field">
              <label class="ck-label" for="login-password">Contraseña</label>
              <input
                id="login-password"
                class="ck-input"
                [(ngModel)]="password"
                name="password"
                type="password"
                required
                autocomplete="current-password"
                placeholder="••••••••"
              />
            </div>

            <button class="ck-btn ck-btn--primary ck-btn--fill" type="submit" [disabled]="loading">
              {{ loading ? "Validando..." : "Entrar al portal" }}
            </button>
          </form>

          <div class="login-card__footer">
            <a class="plain-link" routerLink="/reset-password">¿Olvidaste la contraseña?</a>
            <span class="login-card__sep">·</span>
            <a class="plain-link" routerLink="/solicitar-demo">Solicitar acceso</a>
          </div>
        </div>

        <div class="login-proofs">
          <span>SSR-ready</span>
          <span>Multi-LLM</span>
          <span>GDPR-friendly</span>
          <span>Zero lock-in</span>
        </div>
      </div>

      <aside class="login-aside" aria-hidden="true">
        <div class="login-aside__inner">
          <div class="login-aside__label">
            <span class="eyebrow">Panel de operaciones</span>
            <p>Gestiona el conocimiento, los canales y la analítica de cada tenant desde un único lugar.</p>
          </div>
          <div class="login-mockup">
            <div class="login-mockup__bar">
              <span></span><span></span><span></span>
            </div>
            <div class="login-mockup__content">
              <div class="login-mockup__stat">
                <strong>98.7%</strong>
                <span>Uptime últimos 30 días</span>
              </div>
              <div class="login-mockup__stat">
                <strong>4 LLMs</strong>
                <span>Activos y enrutados</span>
              </div>
              <div class="login-mockup__stat">
                <strong>&lt; 5 min</strong>
                <span>Despliegue inicial</span>
              </div>
              <div class="login-mockup__divider"></div>
              <div class="login-mockup__row">
                <span class="login-mockup__dot login-mockup__dot--indigo"></span>
                <span>Widget activo en 3 dominios</span>
              </div>
              <div class="login-mockup__row">
                <span class="login-mockup__dot login-mockup__dot--violet"></span>
                <span>Ingest completado · hace 2 min</span>
              </div>
              <div class="login-mockup__row">
                <span class="login-mockup__dot login-mockup__dot--amber"></span>
                <span>Handover pendiente · 1 sesión</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  `})
export class LoginPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild("googleButton") googleButton!: ElementRef<HTMLElement>;
  private readonly api = inject(PortalApiService);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly zone = inject(NgZone);
  private destroyed = false;
  email = "";
  password = "";
  loading = false;
  errorMessage = "";

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const { clientId } = await this.api.googleConfig();
      if (!clientId || this.destroyed) return;
      await new Promise<void>((resolve, reject) => {
        if (this.googleIdentity()) { resolve(); return; }
        const script = this.document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.onload = () => { script.remove(); resolve(); };
        script.onerror = () => { script.remove(); reject(new Error("Google unavailable")); };
        this.document.head.appendChild(script);
      });
      if (this.destroyed) return;
      const identity = this.googleIdentity();
      if (!identity) throw new Error("Google unavailable");
      identity.initialize({
        client_id: clientId,
        callback: ({ credential }) => this.zone.run(() => void this.submitGoogle(credential)),
        auto_select: false,
      });
      identity.renderButton(this.googleButton.nativeElement, {
        type: "standard", theme: "outline", size: "large", text: "continue_with", locale: "es",
      });
    } catch {
      if (!this.destroyed) this.errorMessage = "Google no está disponible. Puedes entrar con email y contraseña.";
    }
  }

  private googleIdentity() {
    return (this.document.defaultView as (Window & {
      google?: { accounts: { id: {
        initialize(options: { client_id: string; callback: (response: { credential: string }) => void; auto_select: boolean }): void;
        renderButton(element: HTMLElement, options: Record<string, unknown>): void;
      } } };
    }) | null)?.google?.accounts.id;
  }

  ngOnDestroy(): void { this.destroyed = true; }

  async submitGoogle(credential: string): Promise<void> {
    if (this.loading || this.destroyed) return;
    this.loading = true;
    this.errorMessage = "";
    try {
      const user = await this.session.loginGoogle(credential);
      await this.router.navigate([user.platformRole === "superadmin" ? "/admin" : "/app"]);
    } catch {
      this.errorMessage = "No se pudo acceder con Google. Usa la cuenta asociada a un usuario activo de Talkaris.";
    } finally {
      this.loading = false;
    }
  }

  constructor(
    private readonly session: SessionStore,
    private readonly router: Router,
    private readonly seo: SeoService
  ) {}

  ngOnInit(): void {
    this.seo.update(
      buildNoIndexSeo(
        "Portal login",
        "Private login for the Talkaris tenant console and superadmin workspace.",
        "/login",
        "en",
        DEFAULT_PORTAL_SETTINGS,
        DEFAULT_PORTAL_SETTINGS.portalBaseUrl
      )
    );
  }

  async submit(): Promise<void> {
    this.loading = true;
    this.errorMessage = "";

    try {
      const user = await this.session.login(this.email, this.password);
      await this.router.navigate([user.platformRole === "superadmin" ? "/admin" : "/app"]);
    } catch {
      this.errorMessage = "No se pudo iniciar sesión. Revisa email y contraseña.";
    } finally {
      this.loading = false;
    }
  }
}
