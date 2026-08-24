import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, RouterModule } from "@angular/router";
import {
  DEFAULT_PORTAL_SETTINGS,
  getAlternatePublicPage,
  getPublicNavigation,
  getPublicPage,
  PublicLocale,
  PublicPageDefinition,
} from "../content/public-site";
import { PortalSettings, PlatformPublicResponse } from "../core/models";
import { PortalApiService } from "../core/portal-api.service";
import { SeoService } from "../services/seo.service";
import { buildPageSeo } from "../services/seo-utils";
import { MarketingFrameComponent } from "../shared/marketing-frame.component";

@Component({
  selector: "app-legal-page",
  standalone: true,
  imports: [CommonModule, RouterModule, MarketingFrameComponent],
  template: `
    <app-marketing-frame
      [locale]="locale"
      [platform]="platform"
      [navigation]="navigation"
      [alternatePath]="alternatePage.path"
      [ctaLabel]="page.primaryCtaLabel"
      [ctaPath]="page.primaryCtaPath"
    >
      <section class="page-hero page-hero--compact" id="main-content">
        <div class="site-shell">
          <nav class="breadcrumb-row" aria-label="Breadcrumb">
            <a [routerLink]="locale === 'es' ? '/' : '/en'">{{ locale === "es" ? "Inicio" : "Home" }}</a>
            <span aria-hidden="true">/</span>
            <span>{{ page.breadcrumbLabel }}</span>
          </nav>

          <div class="hero-surface">
            <div class="hero-copy-pane">
              <span class="eyebrow">{{ page.heroEyebrow }}</span>
              <h1>{{ page.heroTitle }}</h1>
              <p class="hero-copy">{{ page.heroCopy }}</p>
              <p class="hero-summary">{{ page.heroSummary }}</p>
              <div class="hero-actions">
                <a class="button button-primary" [routerLink]="page.primaryCtaPath">{{ page.primaryCtaLabel }}</a>
                <a class="button button-secondary" [routerLink]="page.secondaryCtaPath">{{ page.secondaryCtaLabel }}</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="lead-in-section" *ngIf="page.leadInTitle">
        <div class="site-shell lead-in-panel">
          <div>
            <span class="eyebrow">{{ locale === "es" ? "Resumen" : "Summary" }}</span>
            <h2>{{ page.leadInTitle }}</h2>
            <p>{{ page.leadInBody }}</p>
          </div>
          <div class="proof-list">
            <article class="proof-item" *ngFor="let proof of page.leadInProofs">
              <span class="proof-item__dot" aria-hidden="true"></span>
              <p>{{ proof }}</p>
            </article>
          </div>
        </div>
      </section>

      <section class="content-section" *ngFor="let section of page.sections" [attr.id]="section.id">
        <div class="site-shell">
          <div class="section-heading">
            <span class="eyebrow">{{ section.eyebrow }}</span>
            <h2>{{ section.title }}</h2>
            <p *ngIf="section.intro">{{ section.intro }}</p>
          </div>
          <div class="content-grid" [ngClass]="section.cards.length > 2 ? 'content-grid--three' : 'content-grid--two'">
            <article class="feature-card" *ngFor="let card of section.cards">
              <h3>{{ card.title }}</h3>
              <p>{{ card.body }}</p>
              <ul class="plain-list plain-list--tight" *ngIf="card.bullets?.length">
                <li *ngFor="let bullet of card.bullets">{{ bullet }}</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section class="cta-section">
        <div class="site-shell cta-panel">
          <div>
            <span class="eyebrow">{{ page.ctaPanel.eyebrow }}</span>
            <h2>{{ page.ctaPanel.title }}</h2>
            <p>{{ page.ctaPanel.body }}</p>
          </div>
          <div class="hero-actions">
            <a
              class="button button-primary"
              *ngIf="isMailto(page.ctaPanel.primaryPath); else primaryRouterLink"
              [href]="page.ctaPanel.primaryPath"
            >
              {{ page.ctaPanel.primaryLabel }}
            </a>
            <ng-template #primaryRouterLink>
              <a class="button button-primary" [routerLink]="page.ctaPanel.primaryPath">{{ page.ctaPanel.primaryLabel }}</a>
            </ng-template>
            <a class="button button-secondary" [routerLink]="page.ctaPanel.secondaryPath">
              {{ page.ctaPanel.secondaryLabel }}
            </a>
          </div>
        </div>
      </section>
    </app-marketing-frame>
  `,
})
export class LegalPageComponent implements OnInit {
  locale: PublicLocale = "es";
  page!: PublicPageDefinition;
  alternatePage!: PublicPageDefinition;
  navigation: PublicPageDefinition[] = [];
  platform: PortalSettings = DEFAULT_PORTAL_SETTINGS;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: PortalApiService,
    private readonly seo: SeoService
  ) {}

  async ngOnInit(): Promise<void> {
    this.locale = (this.route.snapshot.data["locale"] as PublicLocale) ?? "es";
    const legalKey = (this.route.snapshot.data["legalKey"] as "privacy" | "terms") ?? "privacy";
    this.page = getPublicPage(legalKey, this.locale);
    this.alternatePage = getAlternatePublicPage(this.page, this.locale === "es" ? "en" : "es");
    this.navigation = getPublicNavigation(this.locale);

    try {
      const publicData: PlatformPublicResponse = await this.api.publicPlatform();
      this.platform = publicData.platform;
    } catch {
      this.platform = DEFAULT_PORTAL_SETTINGS;
    }

    this.seo.update(buildPageSeo(this.page, this.platform, this.platform.portalBaseUrl));
  }

  isMailto(path: string): boolean {
    return path.startsWith("mailto:");
  }
}
