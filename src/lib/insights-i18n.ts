import type { Lang } from "./i18n";

const en = {
  signIn: "Sign in to save goals to your account.", invalid: "Fill in name, amount and a future date.", saveError: "Could not save. Try again.",
  byPosition: "Dividends by position (confirmed, last 12M)", position: "Position", income: "Income", yieldCol: "Yield", yoc: "Yield on cost",
  concentration: "Concentration risk", concHint: "Warnings when one position > 20%, sector > 40% or currency > 70% of value.",
  largest: "Largest", ok: "No concentration warnings.", position_: "Position", sector: "Sector", currency: "Currency", sortino: "Sortino ratio",
  goals: "Goals & projections", goalName: "Goal", target: "Target", date: "Target date", monthly: "Monthly", ret: "Return %/yr",
  add: "Add goal", progress: "progress", projected: "Projected", onTrack: "On track", offTrack: "Needs", perMonth: "/month",
  scenarios: "Scenarios (−3 / base / +3 pp)", noGoals: "No goals yet.", assumption: "Projection from your current value and your assumptions; not a forecast.",
};
type Copy = typeof en;
const bg: Copy = {
  signIn: "Влез, за да пазиш целите в профила си.", invalid: "Попълни име, сума и бъдеща дата.", saveError: "Неуспешно запазване. Опитай отново.",
  byPosition: "Дивиденти по позиции (потвърдени, 12 мес.)", position: "Позиция", income: "Доход", yieldCol: "Доходност", yoc: "Доходност спрямо цена",
  concentration: "Концентрационен риск", concHint: "Предупреждение при позиция > 20%, сектор > 40% или валута > 70% от стойността.",
  largest: "Най-голям дял", ok: "Няма предупреждения за концентрация.", position_: "Позиция", sector: "Сектор", currency: "Валута", sortino: "Коефициент на Сортино",
  goals: "Цели и прогнози", goalName: "Цел", target: "Сума", date: "Крайна дата", monthly: "Месечно", ret: "Доходност %/год.",
  add: "Добави цел", progress: "постигнато", projected: "Прогнозно", onTrack: "По план", offTrack: "Нужни", perMonth: "/месец",
  scenarios: "Сценарии (−3 / база / +3 п.п.)", noGoals: "Все още няма цели.", assumption: "Проекция от текущата стойност и твоите допускания; не е прогноза.",
};
const de: Copy = {
  signIn: "Melde dich an, um Ziele im Konto zu speichern.", invalid: "Name, Betrag und ein künftiges Datum angeben.", saveError: "Speichern fehlgeschlagen. Erneut versuchen.",
  byPosition: "Dividenden je Position (bestätigt, 12 M)", position: "Position", income: "Einkommen", yieldCol: "Rendite", yoc: "Yield on Cost",
  concentration: "Klumpenrisiko", concHint: "Warnung bei Position > 20 %, Sektor > 40 % oder Währung > 70 % des Werts.",
  largest: "Größter Anteil", ok: "Keine Klumpenrisiko-Warnungen.", position_: "Position", sector: "Sektor", currency: "Währung", sortino: "Sortino-Ratio",
  goals: "Ziele & Projektionen", goalName: "Ziel", target: "Betrag", date: "Zieldatum", monthly: "Monatlich", ret: "Rendite %/J.",
  add: "Ziel hinzufügen", progress: "erreicht", projected: "Projiziert", onTrack: "Im Plan", offTrack: "Benötigt", perMonth: "/Monat",
  scenarios: "Szenarien (−3 / Basis / +3 Pp.)", noGoals: "Noch keine Ziele.", assumption: "Projektion aus aktuellem Wert und deinen Annahmen; keine Prognose.",
};
const es: Copy = {
  signIn: "Inicia sesión para guardar objetivos en tu cuenta.", invalid: "Indica nombre, importe y una fecha futura.", saveError: "No se pudo guardar. Inténtalo de nuevo.",
  byPosition: "Dividendos por posición (confirmados, 12 M)", position: "Posición", income: "Ingresos", yieldCol: "Rentabilidad", yoc: "Rentab. sobre coste",
  concentration: "Riesgo de concentración", concHint: "Aviso si una posición > 20 %, un sector > 40 % o una divisa > 70 % del valor.",
  largest: "Mayor peso", ok: "Sin avisos de concentración.", position_: "Posición", sector: "Sector", currency: "Divisa", sortino: "Ratio de Sortino",
  goals: "Objetivos y proyecciones", goalName: "Objetivo", target: "Importe", date: "Fecha objetivo", monthly: "Mensual", ret: "Rentab. %/año",
  add: "Añadir objetivo", progress: "logrado", projected: "Proyectado", onTrack: "En camino", offTrack: "Necesitas", perMonth: "/mes",
  scenarios: "Escenarios (−3 / base / +3 pp)", noGoals: "Aún no hay objetivos.", assumption: "Proyección con tu valor actual y tus supuestos; no es un pronóstico.",
};
const it: Copy = {
  signIn: "Accedi per salvare gli obiettivi nel tuo account.", invalid: "Inserisci nome, importo e una data futura.", saveError: "Salvataggio non riuscito. Riprova.",
  byPosition: "Dividendi per posizione (confermati, 12 M)", position: "Posizione", income: "Reddito", yieldCol: "Rendimento", yoc: "Rendimento sul costo",
  concentration: "Rischio di concentrazione", concHint: "Avviso se una posizione > 20%, un settore > 40% o una valuta > 70% del valore.",
  largest: "Peso maggiore", ok: "Nessun avviso di concentrazione.", position_: "Posizione", sector: "Settore", currency: "Valuta", sortino: "Indice di Sortino",
  goals: "Obiettivi e proiezioni", goalName: "Obiettivo", target: "Importo", date: "Data obiettivo", monthly: "Mensile", ret: "Rendim. %/anno",
  add: "Aggiungi obiettivo", progress: "raggiunto", projected: "Proiettato", onTrack: "In linea", offTrack: "Servono", perMonth: "/mese",
  scenarios: "Scenari (−3 / base / +3 pp)", noGoals: "Nessun obiettivo.", assumption: "Proiezione dal valore attuale e dalle tue ipotesi; non è una previsione.",
};
export const insightsCopy: Record<Lang, Copy> = { en, bg, de, es, it };
