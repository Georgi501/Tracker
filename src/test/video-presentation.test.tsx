import { VideoPresentation } from "@/components/VideoPresentation";
import { fireEvent, render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("localized product walkthrough", () => {
  it.each([
    ["en", "See CapiSpot in action.", "CapiSpot portfolio walkthrough"],
    ["bg", "Виж CapiSpot в действие.", "Представяне на портфейла в CapiSpot"],
    ["de", "CapiSpot in Aktion erleben.", "CapiSpot-Portfolio-Rundgang"],
    ["es", "Descubre CapiSpot en acción.", "Recorrido por la cartera de CapiSpot"],
    ["it", "Scopri CapiSpot in azione.", "Panoramica del portafoglio CapiSpot"],
  ] as const)(
    "uses the %s dictionary for visible and accessible text",
    (lang, title, frameTitle) => {
      render(<VideoPresentation mode="visitor" theme="dark" lang={lang} />);

      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      const frame = screen.getByTitle(frameTitle);
      expect(frame).toBeInTheDocument();
      expect(frame).not.toHaveAttribute("allow");
      expect(frame).toHaveAttribute("allowfullscreen");
      expect(
        screen.getByRole("link", {
          name: /walkthrough|представяне|Rundgang|recorrido|panoramica/i,
        }),
      ).toBeInTheDocument();
    },
  );

  it("passes the selected language to the embedded presentation when it changes", () => {
    const { rerender } = render(<VideoPresentation mode="visitor" theme="dark" lang="en" />);
    expect(screen.getByTitle("CapiSpot portfolio walkthrough")).toHaveAttribute(
      "src",
      "/video-preview/?embed=1&mode=visitor&theme=dark&lang=en",
    );

    rerender(<VideoPresentation mode="visitor" theme="dark" lang="bg" />);
    expect(screen.getByTitle("Представяне на портфейла в CapiSpot")).toHaveAttribute(
      "src",
      "/video-preview/?embed=1&mode=visitor&theme=dark&lang=bg",
    );
  });

  it("switches between Portfolio tour and Pro tools and syncs the standalone link", () => {
    render(<VideoPresentation mode="visitor" theme="light" lang="en" />);
    const proBtn = screen.getByRole("button", { name: "Pro tools" });
    expect(proBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(proBtn);
    expect(proBtn).toHaveAttribute("aria-pressed", "true");
    const frame = screen.getByTitle("CapiSpot Pro tools walkthrough");
    expect(frame).toHaveAttribute(
      "src",
      "/video-preview/?embed=1&mode=pro&theme=light&lang=en",
    );
    expect(screen.getByRole("link", { name: /Open the full walkthrough/i })).toHaveAttribute(
      "href",
      "/video-preview/?mode=pro&theme=light&lang=en",
    );
  });

  it("hides duplicate internal section-heading in embedded mode while keeping controls visible", () => {
    const htmlPath = path.resolve(process.cwd(), "public/video-preview/index.html");
    const html = fs.readFileSync(htmlPath, "utf8");
    expect(html).toContain("body.embedded .section-heading");
    expect(html).not.toMatch(/body\.embedded\s+\.clip-controls\s*\{\s*display:\s*none/);
    expect(html).toContain('capispot-video-preview:request-height');
  });
});
