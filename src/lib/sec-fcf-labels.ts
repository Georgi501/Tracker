import type { Lang } from "./i18n";
import type { SecFcfMethod } from "./sec-financials";

export const secFcfLabels: Record<Lang, Record<SecFcfMethod, string>> = {
  en: {
    "cash-ppe": "FCF = operating cash flow − cash purchases of property, plant and equipment.",
    "cash-productive-assets":
      "FCF = operating cash flow − cash purchases of productive assets, including software and intangibles.",
    "nvda-reconciled":
      "NVIDIA FCF = operating cash flow − productive-asset purchases − financed-asset principal payments.",
    "amzn-reconciled":
      "Amazon FCF = operating cash flow − productive-asset purchases + property and equipment sale proceeds and incentives.",
    "meta-reconciled":
      "Meta FCF = operating cash flow − property and equipment purchases − finance lease principal payments.",
  },
  bg: {
    "cash-ppe": "FCF = оперативен паричен поток − парични покупки на имоти, машини и оборудване.",
    "cash-productive-assets":
      "FCF = оперативен паричен поток − парични покупки на производствени активи, включително софтуер и нематериални активи.",
    "nvda-reconciled":
      "NVIDIA FCF = оперативен паричен поток − покупки на производствени активи − главници по финансирани активи.",
    "amzn-reconciled":
      "Amazon FCF = оперативен паричен поток − покупки на производствени активи + приходи от продажби на оборудване и стимули.",
    "meta-reconciled":
      "Meta FCF = оперативен паричен поток − покупки на имоти и оборудване − главници по финансов лизинг.",
  },
  de: {
    "cash-ppe": "FCF = operativer Cashflow − Barzahlungen für Sachanlagen.",
    "cash-productive-assets":
      "FCF = operativer Cashflow − Barzahlungen für produktive Vermögenswerte einschließlich Software und immaterieller Werte.",
    "nvda-reconciled":
      "NVIDIA FCF = operativer Cashflow − Käufe produktiver Vermögenswerte − Tilgungen finanzierter Vermögenswerte.",
    "amzn-reconciled":
      "Amazon FCF = operativer Cashflow − Käufe produktiver Vermögenswerte + Erlöse und Anreize aus Sachanlagenverkäufen.",
    "meta-reconciled":
      "Meta FCF = operativer Cashflow − Sachanlagenkäufe − Tilgungen aus Finanzierungsleasing.",
  },
  es: {
    "cash-ppe": "FCF = flujo operativo − compras en efectivo de inmovilizado material.",
    "cash-productive-assets":
      "FCF = flujo operativo − compras de activos productivos, incluidos software e intangibles.",
    "nvda-reconciled":
      "NVIDIA FCF = flujo operativo − compras de activos productivos − principal de activos financiados.",
    "amzn-reconciled":
      "Amazon FCF = flujo operativo − compras de activos productivos + ingresos por ventas de inmovilizado e incentivos.",
    "meta-reconciled":
      "Meta FCF = flujo operativo − compras de inmovilizado − principal de arrendamientos financieros.",
  },
  it: {
    "cash-ppe": "FCF = flusso operativo − acquisti in contanti di immobili, impianti e macchinari.",
    "cash-productive-assets":
      "FCF = flusso operativo − acquisti di attività produttive, inclusi software e attività immateriali.",
    "nvda-reconciled":
      "NVIDIA FCF = flusso operativo − acquisti di attività produttive − capitale rimborsato su attività finanziate.",
    "amzn-reconciled":
      "Amazon FCF = flusso operativo − acquisti di attività produttive + proventi da vendite di impianti e incentivi.",
    "meta-reconciled":
      "Meta FCF = flusso operativo − acquisti di immobili e impianti − capitale dei leasing finanziari.",
  },
};
