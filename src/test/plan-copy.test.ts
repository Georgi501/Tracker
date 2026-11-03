import { describe, expect, it } from "vitest";
import { languages } from "@/lib/i18n";
import { planCopy } from "@/lib/plan-i18n";

describe("company analysis plan copy", () => {
  it.each(languages)("$name clearly explains weekly Free and unlimited Pro access", ({ code }) => {
    const research = planCopy[code].groups.find((group) =>
      ["Research", "Проучване", "Investigación", "Ricerca"].includes(group.title),
    );

    expect(research).toBeDefined();
    expect(research?.free).toMatch(/2/);
    expect(research?.free).toMatch(/week|седмиц|woche|semana|settimana/i);
    expect(research?.free).toMatch(/DCF/i);
    expect(research?.free).toMatch(
      /same view|същия преглед|derselben Ansicht|esa misma vista|stessa visita/i,
    );
    expect(research?.free).toMatch(
      /no extra view|не изразходва допълнителен преглед|keinen zusätzlichen|no consume otra|non ne consuma un'altra/i,
    );
    expect(research?.pro).toMatch(/unlimited|неогранич|unbegrenz|ilimitad|illimitat/i);
    expect(research?.pro).toMatch(
      /standalone DCF|Самостоятелен DCF|eigenständiger DCF|DCF independiente|DCF autonomo/i,
    );
  });
});
