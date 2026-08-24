import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import { PublicLocale } from "../content/public-site";

/**
 * Honest capability proof strip — product facts, not fabricated testimonials.
 */
@Component({
  selector: "app-testimonial-strip",
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="testimonial-strip">
      <div class="site-shell">
        <div class="section-heading">
          <span class="eyebrow">{{ locale === "es" ? "Pruebas de producto" : "Product proof" }}</span>
          <h2>{{ locale === "es" ? "Diseñado para pasar de demo a producción sin improvisar." : "Built to go from demo to production without improvisation." }}</h2>
          <p>
            {{
              locale === "es"
                ? "Capacidades verificables de la plataforma, sin cifras inventadas ni casos ficticios."
                : "Verifiable platform capabilities — no invented figures, no fictional cases."
            }}
          </p>
        </div>
        <div class="testimonial-strip__grid">
          <article class="testimonial-strip__card" *ngFor="let item of proof">
            <span class="testimonial-strip__metric">{{ locale === "es" ? item.metricEs : item.metricEn }}</span>
            <h3 class="testimonial-strip__title">{{ locale === "es" ? item.titleEs : item.titleEn }}</h3>
            <p class="testimonial-strip__quote">{{ locale === "es" ? item.bodyEs : item.bodyEn }}</p>
          </article>
        </div>
      </div>
    </section>
  `})
export class TestimonialStripComponent {
  @Input() locale: PublicLocale = "es";

  proof = [
    {
      metricEs: "< 5 min",
      metricEn: "< 5 min",
      titleEs: "Widget en producción sin dependencias de build",
      titleEn: "Widget live without build dependencies",
      bodyEs:
        "Un snippet de una línea y una site key despliegan el widget en cualquier web. No hay que tocar tu stack.",
      bodyEn:
        "A one-line snippet and a site key deploy the widget on any site. Your stack stays untouched.",
    },
    {
      metricEs: "Multi-fuente",
      metricEn: "Multi-source",
      titleEs: "Conocimiento gobernado por proyecto",
      titleEn: "Knowledge governed per project",
      bodyEs:
        "Sitemap, HTML, PDF, YouTube, Notion y Gemini File bajo una política de fuentes auditable y reindexable.",
      bodyEn:
        "Sitemap, HTML, PDF, YouTube, Notion and Gemini File under an auditable, re-indexable source policy.",
    },
    {
      metricEs: "Multi-tenant",
      metricEn: "Multi-tenant",
      titleEs: "Aislamiento por tenant con visión global",
      titleEn: "Tenant isolation with global visibility",
      bodyEs:
        "Branding, conocimiento, dominios y analítica separados por tenant, con gobierno central desde superadmin.",
      bodyEn:
        "Branding, knowledge, domains and analytics isolated per tenant, with central governance from superadmin.",
    },
  ];
}
