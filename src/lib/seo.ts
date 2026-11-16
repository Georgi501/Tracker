import { languages } from "./i18n";

const SITE = "https://capispot.com";
const ORGANIZATION_ID = SITE + "/#organization";
const WEBSITE_ID = SITE + "/#website";

/** Home-page identity: only verified first-party brand information. */
export function siteIdentityJsonLd() {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": ORGANIZATION_ID,
          name: "CapiSpot",
          url: SITE + "/",
          description: "Investment portfolio tracking software for stocks, ETFs and crypto.",
          logo: { "@type": "ImageObject", url: SITE + "/icon-512.png" },
        },
        {
          "@type": "WebSite",
          "@id": WEBSITE_ID,
          name: "CapiSpot",
          alternateName: "capispot.com",
          url: SITE + "/",
          description: "Track investment portfolios across broker accounts with CapiSpot.",
          publisher: { "@id": ORGANIZATION_ID },
        },
      ],
    }),
  };
}

export function articleJsonLd(title: string, description: string, path: string) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title.replace(/ — capispot$/i, ""),
      description,
      url: `${SITE}${path}`,
      mainEntityOfPage: `${SITE}${path}`,
      image: `${SITE}/og.png`,
      inLanguage: "en",
      publisher: {
        "@type": "Organization",
        name: "CapiSpot",
        url: SITE,
        logo: { "@type": "ImageObject", url: `${SITE}/icon-512.png` },
      },
    }),
  };
}

export function canonicalLink(path: string) {
  return {
    rel: "canonical",
    href: `${SITE}${path}`,
  };
}

export function hreflangLinks(pathname = "/") {
  const cleanPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  const baseUrl = `${SITE}${cleanPath}`;
  return [
    ...languages.map(({ code }) => ({
      rel: "alternate",
      hrefLang: code,
      href: `${baseUrl}?lang=${code}`,
    })),
    {
      rel: "alternate",
      hrefLang: "x-default",
      href: baseUrl,
    },
  ];
}

export function breadcrumbJsonLd(items: readonly { name: string; path: string }[]) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: `${SITE}${item.path}`,
      })),
    }),
  };
}

export function assetEntityJsonLd(params: { symbol: string; name: string; type: "stock" | "etf" }) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": params.type === "etf" ? "InvestmentFund" : "Corporation",
      name: params.name,
      tickerSymbol: params.symbol,
      url: `${SITE}/asset/${encodeURIComponent(params.symbol)}`,
    }),
  };
}

export function faqJsonLd(questions: readonly (readonly [string, string])[]) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: questions.map(([question, answer]) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer,
        },
      })),
    }),
  };
}

export function softwareJsonLd(description: string) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": SITE + "/#application",
      publisher: { "@id": ORGANIZATION_ID },
      isPartOf: { "@id": WEBSITE_ID },
      name: "CapiSpot",
      url: SITE,
      description,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    }),
  };
}
