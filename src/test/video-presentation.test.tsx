import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VideoPresentation } from "@/components/VideoPresentation";

describe("localized product walkthrough", () => {
  it.each([
    ["en", "See Capispot in action.", "Capispot portfolio walkthrough"],
    ["bg", "Виж Capispot в действие.", "Представяне на портфейла в Capispot"],
    ["de", "Capispot in Aktion erleben.", "Capispot-Portfolio-Rundgang"],
    ["es", "Descubre Capispot en acción.", "Recorrido por la cartera de Capispot"],
    ["it", "Scopri Capispot in azione.", "Panoramica del portafoglio Capispot"],
  ] as const)(
    "uses the %s dictionary for visible and accessible text",
    (lang, title, frameTitle) => {
      render(<VideoPresentation mode="visitor" theme="dark" lang={lang} />);

      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      const frame = screen.getByTitle(frameTitle);
      expect(frame).toBeInTheDocument();
      expect(frame).toHaveAttribute("allow", "fullscreen");
      expect(frame).toHaveAttribute("allowfullscreen");
      expect(
        screen.getByRole("link", {
          name: /walkthrough|представяне|Rundgang|recorrido|panoramica/i,
        }),
      ).toBeInTheDocument();
    },
  );
});
