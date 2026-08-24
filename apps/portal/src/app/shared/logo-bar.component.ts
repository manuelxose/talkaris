import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import { PublicLocale } from "../content/public-site";

@Component({
  selector: "app-logo-bar",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="logo-bar">
      <p class="logo-bar__caption">
        {{ locale === "es" ? "Modelos e integraciones compatibles" : "Compatible models and integrations" }}
      </p>
      <div class="logo-bar__track" aria-hidden="true">
        <span class="logo-bar__item">OpenAI</span>
        <span class="logo-bar__item">Anthropic</span>
        <span class="logo-bar__item">Google</span>
        <span class="logo-bar__item">Telegram</span>
        <span class="logo-bar__item">Notion</span>
        <span class="logo-bar__item">YouTube</span>
        <span class="logo-bar__item">HubSpot</span>
        <span class="logo-bar__item">Zendesk</span>
        <span class="logo-bar__item">DeepSeek</span>
      </div>
    </div>
  `,
})
export class LogoBarComponent {
  @Input() locale: PublicLocale = "es";
}
