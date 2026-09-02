# Graph Report - talkaris  (2026-08-24)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1704 nodes · 3091 edges · 115 communities (95 shown, 20 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 152 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7fbc44bc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- BotStudioComponent
- chat-api/src/main.ts
- PortalApiService
- models.ts
- TenantDashboardPageComponent
- chat-api/src/runtime-base.ts
- application/src/index.ts
- public-page.component.ts
- dependencies
- BotBuilderComponent
- types.ts
- Project
- PostgresTenantRepository
- projects
- SuperadminPageComponent
- public-site.ts
- AnalyticsComponent
- seo-utils.ts
- devDependencies
- chat-api/tsconfig.json
- dependencies
- ingest-worker/src/runtime-base.ts
- normalizeProjectRow
- AdminShellComponent
- SeoService
- replatform-glass.mjs
- tsconfig.app.json
- dependencies
- DevelopersComponent
- website-integration.ts
- WebhooksComponent
- compilerOptions
- app.config.ts
- scripts
- compilerOptions
- options
- blog-list-page.component.ts
- devDependencies
- SessionStore
- .tenantProjects
- BlogListPageComponent
- chat-api/package.json
- application/package.json
- HandoverQueueComponent
- ApiKeysComponent
- compilerOptions
- compilerOptions
- compilerOptions
- inferLanguage
- ops-cli/src/index.ts
- ops-cli/package.json
- ChannelsComponent
- .buildPreviewConfig
- MembersComponent
- devDependencies
- authenticateCookieUser
- portal
- bot-studio.component.ts
- ConversationItem
- dependencies
- buildWidgetAnswer
- ingest-worker/package.json
- normalizeDocumentText
- WidgetDemoComponent
- production
- development
- BotDeploymentsComponent
- KnowledgeDocumentsComponent
- NotificationsComponent
- MarketingFrameComponent
- core/package.json
- domain/package.json
- infrastructure/package.json
- devDependencies
- normalizeProject
- AdminTenantsComponent
- LeadsComponent
- widget/package.json
- authorizeTenant
- migrate.ts
- allowedHosts
- AdminOverview
- authenticateCookieUser
- normalizeFilename
- architect
- server.mjs
- cloudflare-cutover.sh
- composeAnswer
- seed-portal.ts
- design-governance.test.ts
- AdminUsersComponent
- canonical-runtime.test.ts
- api-base-url.token.ts
- claude-flow
- 004_blog_module.sql
- buildLooseTsQuery
- getRequestIp
- hashOpaqueToken
- hasPublisherBearer
- isAllowedPublicEmail
- .load
- .applyProject
- @tecnoria-chat/domain
- @google/generative-ai

## God Nodes (most connected - your core abstractions)
1. `PortalApiService` - 155 edges
2. `BotStudioComponent` - 57 edges
3. `CockpitStore` - 50 edges
4. `AnalyticsComponent` - 35 edges
5. `BotBuilderComponent` - 30 edges
6. `SeoService` - 28 edges
7. `Project` - 25 edges
8. `PortalSettings` - 24 edges
9. `TenantDashboardPageComponent` - 22 edges
10. `PublicLocale` - 21 edges

## Surprising Connections (you probably didn't know these)
- `composeAnswer()` --calls--> `scoreCommercialIntent()`  [EXTRACTED]
  apps/chat-api/src/runtime-base.ts → packages/core/src/ranking.ts
- `extractDocument()` --calls--> `inferLanguage()`  [EXTRACTED]
  apps/ingest-worker/src/runtime-base.ts → packages/core/src/normalization.ts
- `fetchYouTube()` --calls--> `inferLanguage()`  [EXTRACTED]
  apps/ingest-worker/src/runtime-base.ts → packages/core/src/normalization.ts
- `fetchYouTube()` --calls--> `normalizeDocumentText()`  [EXTRACTED]
  apps/ingest-worker/src/runtime-base.ts → packages/core/src/normalization.ts
- `extractPdfDocument()` --calls--> `normalizeDocumentText()`  [EXTRACTED]
  apps/ingest-worker/src/runtime-base.ts → packages/core/src/normalization.ts

## Import Cycles
- None detected.

## Communities (115 total, 20 thin omitted)

### Community 0 - "BotStudioComponent"
Cohesion: 0.10
Nodes (3): BotStudioComponent, Component, ViewChild

### Community 1 - "chat-api/src/main.ts"
Cohesion: 0.04
Nodes (44): AiConfig, assetsRoot, AssistantProfile, buildChannelReply(), buildLooseTsQuery(), channelCreateSchema, ChannelKind, CrawlSchema (+36 more)

### Community 2 - "PortalApiService"
Cohesion: 0.06
Nodes (9): Inject, Inject, AiConfig, ChannelItem, PortalUser, UploadedAsset, PortalApiService, Inject (+1 more)

### Community 3 - "models.ts"
Cohesion: 0.11
Nodes (23): AnalyticsSummary, EVENT_LABELS, ChannelKind, CockpitStore, Injectable, ALL_EVENTS, AnalyticsTrends, CrawlResult (+15 more)

### Community 4 - "TenantDashboardPageComponent"
Cohesion: 0.12
Nodes (5): KnowledgeIngestionComponent, Component, IngestionItem, TenantDashboardPageComponent, Component

### Community 5 - "chat-api/src/runtime-base.ts"
Cohesion: 0.04
Nodes (33): accessRequestSchema, aiConfigSchema, allowedOrigins, answerI18n, app, blockedPublicEmailDomains, blogUpsertSchema, createProjectSchema (+25 more)

### Community 6 - "application/src/index.ts"
Cohesion: 0.06
Nodes (18): IAuthService, IUserRepository, IDataSourceProvider, IngestedDocument, ITenantRepository, CrawlWebsiteRequest, CrawlWebsiteResponse, CrawlWebsiteUseCase (+10 more)

### Community 7 - "public-page.component.ts"
Cohesion: 0.12
Nodes (18): PublicLocale, PublicPageDefinition, PublicPageSection, PortalSettings, CustomersPageComponent, Component, LegalPageComponent, Component (+10 more)

### Community 8 - "dependencies"
Cohesion: 0.05
Nodes (38): @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/platform-browser, @angular/platform-server, @angular/router, @angular/ssr (+30 more)

### Community 9 - "BotBuilderComponent"
Cohesion: 0.10
Nodes (6): BotBuilderComponent, DiscoveredPage, SiteProfile, Component, WizardStep, CrawlBrandSignals

### Community 10 - "types.ts"
Cohesion: 0.06
Nodes (33): scoreCommercialIntent(), AccessRequest, AccessRequestStatus, AiConfig, AnalyticsEventType, ChatAnswer, ChatUser, Citation (+25 more)

### Community 11 - "Project"
Cohesion: 0.06
Nodes (13): Project, ProjectProps, ProjectStatus, Tenant, TenantProps, TenantStatus, TenantContext, TenantSecurity (+5 more)

### Community 12 - "PostgresTenantRepository"
Cohesion: 0.07
Nodes (7): CheerioCrawler, ICrawlerResult, NotionProvider, OpenAIAdapter, YouTubeProvider, PostgresProjectRepository, PostgresTenantRepository

### Community 13 - "projects"
Cohesion: 0.13
Nodes (26): analytics_events, chunks, conversations, document_versions, documents, ingestion_jobs, lead_events, messages (+18 more)

### Community 14 - "SuperadminPageComponent"
Cohesion: 0.11
Nodes (7): AdminPlatformComponent, Component, AdminRequestsComponent, Component, AccessRequest, SuperadminPageComponent, Component

### Community 15 - "public-site.ts"
Cohesion: 0.07
Nodes (26): BLOG_EN, BLOG_ES, CUSTOMERS_EN, CUSTOMERS_ES, FAQ_EN, FAQ_ES, FaqEntry, FEATURES_EN (+18 more)

### Community 17 - "seo-utils.ts"
Cohesion: 0.13
Nodes (25): DEFAULT_PORTAL_SETTINGS, PUBLIC_PAGES, buildBlogArticleSeo(), buildBreadcrumbSchema(), buildNoIndexSeo(), buildOrganizationSchema(), buildPageSchemas(), buildRobotsTxt() (+17 more)

### Community 18 - "devDependencies"
Cohesion: 0.07
Nodes (27): @angular/build, @angular/cli, @angular/compiler-cli, devDependencies, @angular/build, @angular/cli, @angular/compiler-cli, eslint (+19 more)

### Community 19 - "chat-api/tsconfig.json"
Cohesion: 0.07
Nodes (23): compilerOptions, outDir, extends, include, src/**/*.ts, compilerOptions, outDir, extends (+15 more)

### Community 20 - "dependencies"
Cohesion: 0.08
Nodes (25): @anthropic-ai/sdk, dependencies, @anthropic-ai/sdk, bcryptjs, cookie-parser, cors, express, helmet (+17 more)

### Community 21 - "ingest-worker/src/runtime-base.ts"
Cohesion: 0.14
Nodes (24): claimNextJob(), compilePattern(), decodeHtml(), discoverUrls(), env, envSchema, extractCanonical(), extractDocument() (+16 more)

### Community 22 - "normalizeProjectRow"
Cohesion: 0.15
Nodes (23): asRecord(), buildProjectSnippetResponse(), clampInteger(), compactObject(), deepMergeRecord(), defaultAssistantProfile(), defaultRuntimePolicy(), deriveBotCopy() (+15 more)

### Community 23 - "AdminShellComponent"
Cohesion: 0.10
Nodes (4): AdminShellComponent, Component, CockpitShellComponent, Component

### Community 24 - "SeoService"
Cohesion: 0.09
Nodes (12): ACCESS_REQUEST_COPY, AccessRequestCopy, AccessRequestPageComponent, Component, LoginPageComponent, Component, ResetPasswordPageComponent, Component (+4 more)

### Community 25 - "replatform-glass.mjs"
Cohesion: 0.12
Nodes (17): appDir, autoCss, baseCss, canonicalizeCss(), escapeRegExp(), extractedStyles, extractStyles(), files (+9 more)

### Community 26 - "tsconfig.app.json"
Cohesion: 0.10
Nodes (19): compilerOptions, outDir, types, extends, files, include, src/**/*.d.ts, ./tsconfig.json (+11 more)

### Community 27 - "dependencies"
Cohesion: 0.12
Nodes (17): @tecnoria-chat/core, @tecnoria-chat/infrastructure, @tecnoria-chat/core, @tecnoria-chat/infrastructure, dependencies, @notionhq/client, pdf-parse, pg (+9 more)

### Community 28 - "DevelopersComponent"
Cohesion: 0.13
Nodes (4): BotsListComponent, Component, DevelopersComponent, Component

### Community 29 - "website-integration.ts"
Cohesion: 0.22
Nodes (16): getProjectBySiteKey(), provisionWebsiteIntegration(), buildCanonicalWidgetSnippet(), canonicalWebsiteSourceKey(), discoverWebsiteEntry(), ensureTrailingSlash(), escapeForDoubleQuotedJs(), extractSitemapUrlsFromRobots() (+8 more)

### Community 30 - "WebhooksComponent"
Cohesion: 0.19
Nodes (4): Component, WebhooksComponent, Webhook, WebhookCreated

### Community 31 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, experimentalDecorators, forceConsistentCasingInFileNames, lib, module (+9 more)

### Community 32 - "app.config.ts"
Cohesion: 0.18
Nodes (8): AppComponent, appConfig, config, serverConfig, routes, serverRoutes, Component, ssrCookieInterceptor()

### Community 33 - "scripts"
Cohesion: 0.12
Nodes (16): description, name, private, scripts, build, cli, dev:api, dev:ingest (+8 more)

### Community 34 - "compilerOptions"
Cohesion: 0.12
Nodes (16): packages/core/src/index.ts, compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, esModuleInterop, forceConsistentCasingInFileNames, module (+8 more)

### Community 35 - "options"
Cohesion: 0.15
Nodes (16): options, assets, browser, outputMode, outputPath, polyfills, prerender, server (+8 more)

### Community 36 - "blog-list-page.component.ts"
Cohesion: 0.42
Nodes (5): getAlternatePublicPage(), getPublicNavigation(), getPublicPage(), PlatformPublicResponse, buildPageSeo()

### Community 37 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, tsx, @types/bcryptjs, @types/cookie-parser, @types/cors, @types/express, @types/jsonwebtoken, @types/morgan (+10 more)

### Community 38 - "SessionStore"
Cohesion: 0.09
Nodes (6): DashboardComponent, Component, SettingsComponent, Component, SessionStore, Injectable

### Community 39 - ".tenantProjects"
Cohesion: 0.11
Nodes (6): KnowledgeSchedulesComponent, Component, KnowledgeSourcesComponent, Component, IngestionSchedule, SourceItem

### Community 40 - "BlogListPageComponent"
Cohesion: 0.17
Nodes (6): BlogPostDetail, BlogPostSummary, BlogArticlePageComponent, Component, BlogListPageComponent, Component

### Community 41 - "chat-api/package.json"
Cohesion: 0.14
Nodes (13): main, name, private, scripts, build, dev, migrate, seed:portal (+5 more)

### Community 42 - "application/package.json"
Cohesion: 0.22
Nodes (8): main, name, private, scripts, build, type, types, version

### Community 43 - "HandoverQueueComponent"
Cohesion: 0.23
Nodes (3): HandoverQueueComponent, Component, HandoverQueueItem

### Community 44 - "ApiKeysComponent"
Cohesion: 0.21
Nodes (4): ApiKeysComponent, Component, ApiKey, ApiKeyCreated

### Community 45 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, rootDir (+5 more)

### Community 46 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, rootDir (+5 more)

### Community 47 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, rootDir (+5 more)

### Community 48 - "inferLanguage"
Cohesion: 0.27
Nodes (12): blocksToText(), deriveTitleFromUrl(), extractMarkdownTitle(), extractNotionId(), extractPdfDocument(), extractTextDocument(), fetchApiEndpoint(), fetchGeminiFile() (+4 more)

### Community 49 - "ops-cli/src/index.ts"
Cohesion: 0.38
Nodes (12): adminFetch(), analyticsSummary(), createProject(), createTenant(), env, envSchema, main(), parseArgs() (+4 more)

### Community 50 - "ops-cli/package.json"
Cohesion: 0.17
Nodes (11): dependencies, zod, zod, main, name, private, scripts, build (+3 more)

### Community 53 - "MembersComponent"
Cohesion: 0.25
Nodes (3): MembersComponent, Component, WorkspaceMember

### Community 54 - "devDependencies"
Cohesion: 0.18
Nodes (11): @types/pg, typescript, @types/pg, devDependencies, tsx, @types/node, @types/pg, typescript (+3 more)

### Community 55 - "authenticateCookieUser"
Cohesion: 0.18
Nodes (11): authenticateCookieUser(), clearSessionCookie(), getCookieOptions(), hasOpsBearer(), loadPortalUserById(), normalizeMembership(), requireOpsOrSuperadmin, requirePortalAuth (+3 more)

### Community 56 - "portal"
Cohesion: 0.18
Nodes (10): cli, packageManager, prefix, projectType, root, sourceRoot, projects, portal (+2 more)

### Community 57 - "bot-studio.component.ts"
Cohesion: 0.18
Nodes (10): WidgetThemeOption, ButtonStyleOption, LauncherShapeOption, LogoUploadState, SiteProfile, StudioSection, WidgetThemeOption, WidgetButtonStyle (+2 more)

### Community 58 - "ConversationItem"
Cohesion: 0.12
Nodes (5): ConversationDetailComponent, Component, ConversationsComponent, Component, ConversationItem

### Community 59 - "dependencies"
Cohesion: 0.20
Nodes (10): @tecnoria-chat/application, @tecnoria-chat/application, @tecnoria-chat/application, cheerio, dependencies, cheerio, pg, @tecnoria-chat/application (+2 more)

### Community 60 - "buildWidgetAnswer"
Cohesion: 0.24
Nodes (10): buildSafeFallbackAnswer(), buildSuggestionPrompt(), buildSuggestions(), buildWidgetAnswer(), callLlm(), composeGroundedAnswer(), detectIntent(), scoreCommercialIntentLocal() (+2 more)

### Community 61 - "ingest-worker/package.json"
Cohesion: 0.20
Nodes (9): main, name, private, scripts, build, dev, start, type (+1 more)

### Community 62 - "normalizeDocumentText"
Cohesion: 0.33
Nodes (8): upsertDocument(), ChunkingOptions, splitIntoSemanticChunks(), normalizeDocumentText(), normalizeWhitespace(), sanitizePromptInjectionMarkers(), stripUnsafeControlChars(), ChunkRecordInput

### Community 63 - "WidgetDemoComponent"
Cohesion: 0.24
Nodes (5): Component, Inject, Input, WidgetConfigWindow, WidgetDemoComponent

### Community 64 - "production"
Cohesion: 0.22
Nodes (9): build, builder, configurations, defaultConfiguration, production, budgets, buildTarget, optimization (+1 more)

### Community 65 - "development"
Cohesion: 0.22
Nodes (9): serve, development, buildTarget, extractLicenses, optimization, sourceMap, builder, configurations (+1 more)

### Community 67 - "KnowledgeDocumentsComponent"
Cohesion: 0.33
Nodes (3): KnowledgeDocumentsComponent, Component, DocumentItem

### Community 68 - "NotificationsComponent"
Cohesion: 0.28
Nodes (3): NotificationsComponent, Component, NotificationPrefs

### Community 69 - "MarketingFrameComponent"
Cohesion: 0.18
Nodes (5): MarketingFrameComponent, Component, Inject, Input, HostListener

### Community 70 - "core/package.json"
Cohesion: 0.22
Nodes (8): main, name, private, scripts, build, type, types, version

### Community 71 - "domain/package.json"
Cohesion: 0.22
Nodes (8): main, name, private, scripts, build, type, types, version

### Community 72 - "infrastructure/package.json"
Cohesion: 0.22
Nodes (8): main, name, private, scripts, build, type, types, version

### Community 73 - "devDependencies"
Cohesion: 0.25
Nodes (8): @types/node, devDependencies, tsx, @types/node, typescript, tsx, @types/node, @types/node

### Community 74 - "normalizeProject"
Cohesion: 0.25
Nodes (8): getPlatformSettings(), getProjectByKey(), getProjectBySiteKey(), getProjectForTenant(), normalizePlatformSettings(), normalizeProject(), queueTalkarisBlogReingestion(), upsertProjectForTenant()

### Community 77 - "widget/package.json"
Cohesion: 0.25
Nodes (7): name, private, scripts, build, serve, type, version

### Community 78 - "authorizeTenant"
Cohesion: 0.33
Nodes (7): asyncHandler(), authorizeTenant(), getRouteParam(), getTenantById(), getTenantBySlug(), normalizeTenant(), resolveProjectTenant()

### Community 79 - "migrate.ts"
Cohesion: 0.33
Nodes (4): currentDir, env, envSchema, migrationsDir

### Community 80 - "allowedHosts"
Cohesion: 0.33
Nodes (6): security, allowedHosts, 127.0.0.1, localhost, talkaris.com, www.talkaris.com

### Community 81 - "AdminOverview"
Cohesion: 0.32
Nodes (3): AdminOverviewComponent, Component, AdminOverview

### Community 82 - "authenticateCookieUser"
Cohesion: 0.40
Nodes (5): authenticateCookieUser(), loadPortalUserById(), readSessionToken(), requireTenantRead(), requireTenantWrite()

### Community 83 - "normalizeFilename"
Cohesion: 0.50
Nodes (5): extensionFromMimeType(), normalizeFilename(), normalizeSourceKey(), persistUploadedAsset(), sanitizePathSegment()

### Community 84 - "architect"
Cohesion: 0.40
Nodes (5): extract-i18n, test, builder, architect, builder

### Community 85 - "server.mjs"
Cohesion: 0.40
Nodes (4): __dirname, mimeTypes, port, publicDir

### Community 86 - "cloudflare-cutover.sh"
Cohesion: 0.80
Nodes (4): cf_api(), require_env(), cloudflare-cutover.sh script, upsert_a_record()

### Community 87 - "composeAnswer"
Cohesion: 0.50
Nodes (4): composeAnswer(), summarizeText(), buildFallbackAnswer(), selectTopChunks()

### Community 113 - "@tecnoria-chat/domain"
Cohesion: 0.40
Nodes (5): @tecnoria-chat/domain, @tecnoria-chat/domain, @tecnoria-chat/domain, dependencies, @tecnoria-chat/domain

### Community 114 - "@google/generative-ai"
Cohesion: 0.67
Nodes (3): @google/generative-ai, @google/generative-ai, @google/generative-ai

## Knowledge Gaps
- **458 isolated node(s):** `LogoUploadState`, `SiteProfile`, `StudioSection`, `AiConfig`, `AssistantProfile` (+453 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PortalApiService` connect `PortalApiService` to `models.ts`, `TenantDashboardPageComponent`, `public-page.component.ts`, `BotBuilderComponent`, `SuperadminPageComponent`, `seo-utils.ts`, `SeoService`, `DevelopersComponent`, `WebhooksComponent`, `blog-list-page.component.ts`, `SessionStore`, `.tenantProjects`, `BlogListPageComponent`, `HandoverQueueComponent`, `ApiKeysComponent`, `ChannelsComponent`, `MembersComponent`, `bot-studio.component.ts`, `ConversationItem`, `BotDeploymentsComponent`, `KnowledgeDocumentsComponent`, `NotificationsComponent`, `AdminTenantsComponent`, `LeadsComponent`, `AdminOverview`, `AdminUsersComponent`, `.load`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `BotStudioComponent` connect `BotStudioComponent` to `PortalApiService`, `models.ts`, `.load`, `.applyProject`, `.buildPreviewConfig`, `bot-studio.component.ts`, `ConversationItem`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `dependencies`, `devDependencies`, `devDependencies`, `devDependencies`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `LogoUploadState`, `SiteProfile`, `StudioSection` to the rest of the system?**
  _458 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `BotStudioComponent` be split into smaller, more focused modules?**
  _Cohesion score 0.09782608695652174 - nodes in this community are weakly interconnected._
- **Should `chat-api/src/main.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.036297640653357534 - nodes in this community are weakly interconnected._
- **Should `PortalApiService` be split into smaller, more focused modules?**
  _Cohesion score 0.05913461538461538 - nodes in this community are weakly interconnected._