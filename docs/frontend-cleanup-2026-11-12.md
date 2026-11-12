# Frontend cleanup — Fast Refresh и CSS, 12.11.2026

Това е допълнение към release-candidate-qa-2026-11-12.md. Разрешава описаните там 17 Fast Refresh предупреждения и production CSS sourcemap предупреждението. Всички поправки от предишната QA фаза са запазени. Промените са локални, без нов commit/push/deploy.

## Fast Refresh: 17 → 0 предупреждения

Не са добавяни eslint-disable, allowExportNames изключения или потискане на приложни предупреждения. Потребителите на изнесените символи вече ги импортират директно от новите модули; компонентните boundaries не ги re-export-ват.

| Предишен смесен модул | Разделяне |
| --- | --- |
| AddTransactionDialog.tsx | nativeCurrency и resolveAsset → lib/transaction-entry.ts |
| AdvisorLayout.tsx | useThreads → hooks/use-threads.ts |
| AssetExtras.tsx | useWatchState → hooks/use-watch-state.ts |
| Motion.tsx | useCountUp → hooks/use-count-up.ts |
| DcfCalculator.tsx | речник и типове → lib/dcf-copy.ts |
| ProTools.tsx | речници → lib/pro-tools-copy.ts |
| ThesisCheck.tsx | речник → lib/thesis-copy.ts |
| ui/button.tsx | CVA варианти → ui/button-variants.ts |
| ui/badge.tsx | CVA варианти → ui/badge-variants.ts |
| ui/toggle.tsx | CVA варианти → ui/toggle-variants.ts |
| ui/navigation-menu.tsx | trigger стил → ui/navigation-menu-variants.ts |
| ui/form.tsx | contexts и useFormField → ui/form-state.ts |
| ui/sidebar.tsx | context и useSidebar → ui/sidebar-state.ts |
| lib/store.tsx | PortfolioProvider → lib/PortfolioProvider.tsx; чистият context, договори и helpers → lib/store.ts |

PortfolioProvider запазва съществуващия singleton context и mount/SSR поведението. Тялото на функцията е сравнено с публикуваната версия чрез TypeScript AST и е непроменено. Няма промяна в RLS, предпочитанията или финансовите изчисления.

## CSS/Tailwind

Прегледан е единственият CSS файл в src: styles.css — 193 правила и 58 custom class имена преди cleanup. Всички 58 имат текстови референции в src/public, затова не са изтривани предполагаемо неизползвани класове; това е статична проверка, не runtime coverage доказателство.

- Премахнати са две изцяло презаписани background-image декларации на body::before.
- Премахнати са безкрайното hero-float движение и вече ненужните keyframes. Графиката остава неподвижна при взаимодействие; запазена е еднократната входяща анимация и reduced-motion поддръжката.
- Hover бордерът на analytics surface е ограничен до устройства с hover, за да не остава sticky на touch.
- Main използва минимум 1rem страничен gutter и env(safe-area-inset-left/right). Съществуващите долни safe areas за навигация/footer са запазени.
- Timeframe бутоните са с минимум 44px височина.
- Запазени са семантичните цветови/типографски токени и tabular-nums. Няма масово пренаписване на отстоянията или динамичните Tailwind класове.

## Sourcemap политика

Vite 8 CSS URL render hook пренаписва CSS URL адреси, без да връща пълна карта. Cloudflare по подразбиране включва Worker production source maps, което водеше до SOURCEMAP_BROKEN.

vite.config.ts изрично задава environments.ssr.build.sourcemap = false. Това премахва генерирането на неточните production Worker карти; не заглушава warning handler. Development картите не са изключвани. Практическият компромис е, че production Worker stack traces вече нямат mapping към оригиналните TypeScript редове. Ако тези карти са необходими за production debugging, трябва да се върнат след upstream корекция, с повторна build проверка.

## Финални проверки

- npm run lint -- --max-warnings 0: PASS, 0 errors / 0 warnings.
- npm run typecheck: PASS.
- Vitest: 66/66 файла, 422/422 теста; без React/Recharts или config-loader предупреждения.
- Свеж client/server production build: PASS, без warning/error диагностика. Не са изключвани bundler warning checks.
- Chrome върху финалния локален production Worker: landing, demo и tools × EN/BG × 320/390/768/3840px = 24 проверки; без overflow, console warning/error или uncaught exceptions. Проверени периодите, tooltip, tabular-nums, мобилният Command Palette и Escape. Превключени light и reduced-motion настройки.
- Няма staging E2E с автентикирани Free/Pro/admin роли, OAuth или плащания. Този cleanup не разширява предишното runtime покритие на частните потоци.
