const SITE = "https://capispot.com";

export function articleJsonLd(title: string, description: string, path: string) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title.replace(/ — Capispot$/, ""),
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

export function softwareJsonLd(description: string) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "CapiSpot",
      url: SITE,
      description,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    }),
  };
}
