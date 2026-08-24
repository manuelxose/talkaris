import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PORTAL_SETTINGS,
  getAlternatePublicPage,
  getPublicNavigation,
  getPublicPage,
  PUBLIC_PAGES,
} from "./app/content/public-site";
import {
  buildBlogArticleSeo,
  buildPageSeo,
  buildRobotsTxt,
  buildSitemapXml,
} from "./app/services/seo-utils";

test("buildPageSeo emits canonical plus es/en/x-default hreflang links", () => {
  const page = getPublicPage("home", "es");
  const payload = buildPageSeo(page, DEFAULT_PORTAL_SETTINGS, "https://talkaris.com");

  assert.equal(payload.canonicalUrl, "https://talkaris.com");
  assert.equal(payload.locale, "es_ES");
  assert.equal(payload.robots, "index, follow");

  const alternates = payload.links.filter((link) => link.rel === "alternate");
  const hreflangs = new Map(alternates.map((link) => [link.hreflang, link.href]));
  assert.equal(hreflangs.get("es"), "https://talkaris.com");
  assert.equal(hreflangs.get("en"), "https://talkaris.com/en");
  assert.equal(hreflangs.get("x-default"), "https://talkaris.com");
  assert.equal(payload.links.some((link) => link.rel === "canonical"), true);
});

test("buildPageSeo treats legal pages as indexable with proper alternates", () => {
  const page = getPublicPage("privacy", "en");
  const payload = buildPageSeo(page, DEFAULT_PORTAL_SETTINGS, "https://talkaris.com");

  assert.equal(payload.canonicalUrl, "https://talkaris.com/en/privacy");
  assert.equal(payload.robots, "index, follow");
  const alternates = payload.links.filter((link) => link.rel === "alternate");
  assert.equal(alternates.find((link) => link.hreflang === "es")?.href, "https://talkaris.com/privacidad");
  assert.equal(alternates.find((link) => link.hreflang === "en")?.href, "https://talkaris.com/en/privacy");
});

test("buildBlogArticleSeo emits reciprocal hreflang alternates", () => {
  const es = buildBlogArticleSeo(
    {
      title: "Guía de implantación",
      description: "Resumen",
      path: "/blog/guia-de-implantacion",
      locale: "es",
    },
    DEFAULT_PORTAL_SETTINGS,
    "https://talkaris.com"
  );
  const en = buildBlogArticleSeo(
    {
      title: "Deployment guide",
      description: "Summary",
      path: "/en/blog/guia-de-implantacion",
      locale: "en",
    },
    DEFAULT_PORTAL_SETTINGS,
    "https://talkaris.com"
  );

  const esAlternates = new Map(es.links.filter((l) => l.rel === "alternate").map((l) => [l.hreflang, l.href]));
  const enAlternates = new Map(en.links.filter((l) => l.rel === "alternate").map((l) => [l.hreflang, l.href]));

  assert.equal(esAlternates.get("en"), "https://talkaris.com/en/blog/guia-de-implantacion");
  assert.equal(enAlternates.get("es"), "https://talkaris.com/blog/guia-de-implantacion");
  assert.equal(es.canonicalUrl, "https://talkaris.com/blog/guia-de-implantacion");
});

test("getPublicNavigation excludes legal pages", () => {
  const nav = getPublicNavigation("es");
  const keys = new Set(nav.map((page) => page.key));
  assert.equal(keys.has("privacy"), false);
  assert.equal(keys.has("terms"), false);
  assert.equal(keys.has("home"), true);
});

test("buildSitemapXml includes legal pages with locale alternates", () => {
  const xml = buildSitemapXml("https://talkaris.com", PUBLIC_PAGES, []);
  assert.match(xml, /<loc>https:\/\/talkaris\.com\/privacidad<\/loc>/);
  assert.match(xml, /<loc>https:\/\/talkaris\.com\/en\/privacy<\/loc>/);
  assert.match(xml, /<loc>https:\/\/talkaris\.com\/terminos<\/loc>/);
  assert.match(xml, /xmlns:xhtml/);
});

test("buildRobotsTxt disallows private surfaces and points to the sitemap", () => {
  const robots = buildRobotsTxt("https://talkaris.com");
  assert.match(robots, /Disallow: \/app/);
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, /Sitemap: https:\/\/talkaris\.com\/sitemap\.xml/);
});

test("alternate page resolution is symmetric across locales", () => {
  const es = getPublicPage("terms", "es");
  const en = getAlternatePublicPage(es, "en");
  assert.equal(en.path, "/en/terms");
  assert.equal(getAlternatePublicPage(en, "es").path, "/terminos");
});
