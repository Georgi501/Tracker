# UI/UX и completeness одит — 12.11.2026

## Обхват и метод

Преглед на src/, маршрутите, общите компоненти, състоянията, формите, графиките и локализацията. Първоначалният AST инвентар обхвана 333 файла (269 production), 45 UI маршрута и 21 таблици. След новите компоненти и тестове: 341 файла. Автоматичните сигнали бяха проверени ръчно: lucide LineChart/PieChart и базовите Input/Textarea не са дефекти. Изводите от първата фаза бяха предоставени преди промените.

## Потвърдени проблеми и направени поправки

- **Landing / demo:** статичен SVG, празна долна част, липсващи периоди, tooltip, разпределение и методология. Един споделен SamplePortfolioPreview вече съдържа работещи 1D/1W/1M/1Y/ALL, различни серии и доходности, crosshair и tooltip, разпределение, позиции и CSV badges. Unrealized P&L, dividend yield и годишен MWRR се извеждат от ясно обозначени примерни данни. Не се добавя измислен Cash дял. Първоначалният SVG използва същите точки и размери; Recharts се включва след mount, за да избегне SSR разминаване.
- **Локален QA екран:** постоянните Loading metric и празна Portfolio return карта бяха само демонстрационни състояния извън src/. Заменени са със същия реален preview компонент, за да не изглеждат като незавършен продукт.
- **Dashboard:** по-структурирани метрики, неутрално обозначаване на липсваща стойност, съответстващи skeleton структури, по-висока интерактивна графика, уникален gradient, клавиатурен слой и анимации с reduced-motion поддръжка. Липсващи реални данни не се заменят с примерни.
- **Глобално търсене:** Ctrl/Cmd+K, видим мобилен trigger, достъпно заглавие/затваряне, навигация, теми/езици, незабавни catalog резултати и кеширано debounced provider търсене със защита от стари отговори. Търсенето не изпраща портфейлни данни.
- **Community / Wall / Messages / Profile / публичен профил:** пет невидими pulse контейнера са заменени с видими skeleton редове. Празните directory, messages и wall екрани имат контекст и следващо действие. Търсенето се различава от липсата на членове. Wall филтрите могат да се изчистят; измисленият примерен пост е премахнат.
- **Holdings:** празният филтриран резултат има reset действие и обяснение. Съществуващите мобилни карти са запазени. Sort/direction контролите са локализирани.
- **Форми / Settings:** добавени видими етикети на account/auth полетата и достъпни имена на search/textarea контролите. Password идентификаторът е уникален при множество форми. Profile save/upload има pending състояние, забрана за повторна заявка, локализирани грешки, image validation и освобождаване на blob URL.
- **AppShell:** основният spinner е заменен с подреден skeleton. Невалидните числови промени не изглеждат като загуба.
- **Графики / форматиране:** добавен accessibilityLayer към потвърдените Cartesian графики; процентите в allocation/demo следват registry locale. Новите финансови стойности използват tabular цифри. Legacy hover повдигането спазва reduced motion.
- **Локализация:** новият текст е типизиран и пълен за EN/BG/DE/ES/IT; включително Google sign-in accessible label. Съществуващи административни двуезични текстове не са пренаписвани изцяло.

## Проверки и граници

- 417 автоматични теста; покриват съществуващите потоци, Command Palette, metric състоянията, петте примерни диапазона, локализацията и математическа проверка на MWRR.
- TypeScript и production build са проверени локално. Подробният финален резултат се записва в работната QA директория.
- Браузърна проверка на landing и /demo при 320, 390 и 1440 px, работещи периоди, видима графика и хоризонтален overflow; отделно light/reduced-motion изглед. Това не е измерване на реален Core Web Vitals CLS или пълен accessibility одит.
- Няма реални account записи, плащания, OAuth вход или private-community upload по време на QA. Автентикираните сценарии са прегледани по код и тестове; нужни са отделни staging E2E проверки с тестови роли за пълно runtime покритие.
- Валидните empty/unavailable състояния при липсващи provider данни и Pro gating остават. Премахването им би представило невярна финансова информация.
- Няма промени в Drizzle/Supabase схемите, RLS, entitlement проверките или финансовите provider правила. Няма commit, push или deploy.

## Инвентар на UI маршрутите

- `src/routes/__root.tsx`
- `src/routes/watchlist.tsx`
- `src/routes/wall.tsx`
- `src/routes/trading212-import.tsx`
- `src/routes/tools.tsx`
- `src/routes/timeline.tsx`
- `src/routes/terms.tsx`
- `src/routes/stock-tax-bg.tsx`
- `src/routes/revolut-import.tsx`
- `src/routes/reset-password.tsx`
- `src/routes/refund.tsx`
- `src/routes/README.md`
- `src/routes/profile.tsx`
- `src/routes/privacy.tsx`
- `src/routes/pricing.tsx`
- `src/routes/portfolio-in-eur.tsx`
- `src/routes/messages.tsx`
- `src/routes/markets.tsx`
- `src/routes/market.$slug.tsx`
- `src/routes/index.tsx`
- `src/routes/import-demo.tsx`
- `src/routes/ibkr-import.tsx`
- `src/routes/holdings.tsx`
- `src/routes/fifo-guide.tsx`
- `src/routes/features.tsx`
- `src/routes/etf-vs-stocks.tsx`
- `src/routes/earnings.tsx`
- `src/routes/dividends.tsx`
- `src/routes/dividend-tracker.tsx`
- `src/routes/disclaimer.tsx`
- `src/routes/demo.tsx`
- `src/routes/csv-import.tsx`
- `src/routes/compare.tsx`
- `src/routes/community.tsx`
- `src/routes/community.$userId.tsx`
- `src/routes/brokers.tsx`
- `src/routes/average-cost.tsx`
- `src/routes/auth.tsx`
- `src/routes/asset.$symbol.tsx`
- `src/routes/analytics.tsx`
- `src/routes/alerts.tsx`
- `src/routes/advisor.index.tsx`
- `src/routes/advisor.$threadId.tsx`
- `src/routes/admin.tsx`
- `src/routes/account.tsx`
