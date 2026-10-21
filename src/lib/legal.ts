import type { Lang } from "@/lib/i18n";

/** Contact email shown in the footer and legal pages; set before go-live. */
export const SUPPORT_EMAIL: string | null = null;

export type LegalKey = "terms" | "privacy" | "refund" | "disclaimer";
type Doc = { title: string; updated: string; sections: [string, string][] };
type Copy = Record<LegalKey, Doc> & { footer: { tagline: string; legal: string; product: string; contact: string; emailSoon: string; compare: string; rights: string; notAdvice: string } };

const en: Copy = {
  footer: { tagline: "Track your investments with real market data.", legal: "Legal", product: "Product", contact: "Contact", emailSoon: "Support email coming soon", compare: "Compare assets", rights: "All rights reserved.", notAdvice: "Analytics software only — not investment advice." },
  terms: { title: "Terms of Service", updated: "Last updated: October 2026", sections: [
    ["1. The service", "The app is portfolio tracking and analytics software. It is provided by a private individual operating the service. By creating an account you accept these terms."],
    ["2. Accounts", "You are responsible for your login details and for the accuracy of the transactions you enter or import. You must be at least 18 years old."],
    ["3. Subscriptions", "Pro is billed monthly or yearly through our payment provider, which acts as merchant of record. Subscriptions renew automatically until cancelled; after cancellation Pro stays active until the end of the paid period."],
    ["4. Market data", "Prices, fundamentals and news come from third-party providers and may be delayed, incomplete or unavailable. We never replace missing data with estimates, but cannot guarantee accuracy."],
    ["5. Acceptable use", "Do not misuse the service, attempt to access other users' data, scrape it automatically or send abusive messages in Community chat. We may suspend accounts that break these rules."],
    ["6. Liability", "The service is provided \"as is\". To the extent permitted by law we are not liable for investment losses or decisions taken based on the app."],
    ["7. Changes", "We may update these terms; material changes are announced in the app. Continued use means acceptance."],
    ["8. Referrals", "A new referred customer and the referring user each receive one month of Pro after the referred customer completes their first paid Pro subscription transaction. The reward extends an active paid period or starts immediately when no paid period is active. Rewards have no cash value, are not transferable and may be withheld for self-referrals or abuse."],
  ] },
  privacy: { title: "Privacy Policy", updated: "Last updated: October 2026", sections: [
    ["What we store", "Your email, profile (optional photo and bio), brokers, transactions, goals, journal notes, AI conversations and messages. Watchlist, alerts and display preferences stay in your browser."],
    ["Why", "Only to run the service for you: show your portfolio, sync it across devices and provide Pro features. We do not sell your data and show no ads."],
    ["Who can see it", "Your data is private to your account by database rules. Community shows only what you choose to publish; a portfolio showcase shares percentages only, never amounts."],
    ["Processors", "Hosting and database provider, payment provider (handles card data — we never see it), AI provider for Pro AI features (receives only the content needed for your request), market data providers (receive ticker symbols only)."],
    ["Your rights (GDPR)", "You may access, correct, export or delete your data at any time. Deleting your account removes your stored rows. Contact us using the support email."],
    ["Optional analytics", "If you opt in, we store event names with a random session-only identifier to understand sign-ups, first holdings and Pro checkout. We do not send portfolio details, email addresses or names to analytics providers. Events are retained for up to 90 days. You can change your choice below."],
    ["Cookies", "Essential sign-in and preference storage is used to provide the service. Optional first-party analytics are stored only after your consent; no third-party analytics provider is used."],
  ] },
  refund: { title: "Refund & Cancellation Policy", updated: "Last updated: October 2026", sections: [
    ["Cancel anytime", "You can cancel your Pro subscription at any time. Pro remains active until the end of the period you already paid for, and you will not be charged again."],
    ["30-day refund", "If you are not satisfied, request a full refund within 30 days of your first payment or of a yearly renewal. Requests are processed through our payment provider."],
    ["EU withdrawal right", "EU consumers have a 14-day withdrawal right for digital services; our 30-day refund window covers and extends it."],
    ["How to request", "Write to the support email with the address used at checkout. Refunds return to the original payment method, usually within 5–10 business days."],
  ] },
  disclaimer: { title: "Financial Disclaimer", updated: "Last updated: October 2026", sections: [
    ["Not investment advice", "The app provides analytics software and information only. Nothing in it — including DCF valuations, health scores, comparisons or AI-generated text — is a personal recommendation to buy, sell or hold any security."],
    ["No licence", "We are not a licensed investment firm, adviser or broker. Consult a qualified professional before making investment decisions."],
    ["Risk", "Investing involves risk, including loss of capital. Past performance does not guarantee future results. Models depend on assumptions that may prove wrong."],
    ["Data", "Third-party data may be delayed or incorrect. Always verify important figures with your broker."],
  ] },
};

const bg: Copy = {
  footer: { tagline: "Следи инвестициите си с реални пазарни данни.", legal: "Правна информация", product: "Продукт", contact: "Контакт", emailSoon: "Имейлът за поддръжка идва скоро", compare: "Сравни активи", rights: "Всички права запазени.", notAdvice: "Само аналитичен софтуер — не е инвестиционен съвет." },
  terms: { title: "Общи условия", updated: "Последна актуализация: октомври 2026", sections: [
    ["1. Услугата", "Приложението е софтуер за следене и анализ на портфолио, предоставян от физическо лице. Със създаването на профил приемаш тези условия."],
    ["2. Профили", "Отговаряш за данните си за вход и за точността на въведените или импортирани сделки. Трябва да си навършил 18 години."],
    ["3. Абонаменти", "Pro се таксува месечно или годишно чрез платежния ни доставчик (merchant of record). Абонаментът се подновява автоматично до отказ; след отказ Pro остава активен до края на платения период."],
    ["4. Пазарни данни", "Цените, финансовите показатели и новините идват от външни доставчици и може да са забавени, непълни или недостъпни. Никога не заменяме липсващи данни с оценки, но не гарантираме точност."],
    ["5. Допустима употреба", "Забранено е злоупотребата с услугата, опитите за достъп до чужди данни, автоматичното извличане и обидните съобщения в чата. Можем да спрем профили, които нарушават правилата."],
    ["6. Отговорност", "Услугата се предоставя „както е“. Доколкото законът позволява, не носим отговорност за инвестиционни загуби или решения, взети на база приложението."],
    ["7. Промени", "Можем да обновяваме условията; съществените промени се обявяват в приложението."],
    ["8. Покани", "Новият поканен клиент и поканилият го потребител получават по един месец Pro, след като поканеният завърши първата си платена Pro транзакция. Наградата удължава активния платен период или започва веднага, ако няма такъв. Няма парична стойност, не може да се прехвърля и може да бъде отказана при самопокани или злоупотреба."],
  ] },
  privacy: { title: "Политика за поверителност", updated: "Последна актуализация: октомври 2026", sections: [
    ["Какво пазим", "Имейл, профил (по желание снимка и описание), брокери, сделки, цели, бележки в дневника, AI разговори и съобщения. Watchlist, известията и настройките остават в браузъра ти."],
    ["Защо", "Само за да работи услугата: да виждаш портфолиото си, да се синхронизира между устройства и за Pro функциите. Не продаваме данни и няма реклами."],
    ["Кой ги вижда", "Данните ти са достъпни само за твоя профил чрез правила в базата. В Общността се вижда само каквото решиш да публикуваш; витрината на портфолиото показва само проценти, никога суми."],
    ["Обработващи", "Доставчик на хостинг и база данни, платежен доставчик (обработва картата — ние не я виждаме), AI доставчик за Pro функциите (получава само нужното за заявката), доставчици на пазарни данни (получават само тикери)."],
    ["Твоите права (GDPR)", "Можеш по всяко време да достъпиш, коригираш, изтеглиш или изтриеш данните си. Свържи се с нас на имейла за поддръжка."],
    ["Аналитика по избор", "Ако дадеш съгласие, пазим само имена на събития и случаен временен идентификатор на сесията, за да разбираме регистрациите, първите позиции и Pro плащанията. Не изпращаме портфейл, имейл или име към аналитичен доставчик. Събитията се пазят до 90 дни. Можеш да промениш избора си по-долу."],
    ["Бисквитки", "Използваме необходимо хранилище за вход и настройки. Аналитиката от първа страна е по избор и се записва само след съгласие; не използваме външен доставчик за аналитика."],
  ] },
  refund: { title: "Политика за отказ и възстановяване", updated: "Последна актуализация: октомври 2026", sections: [
    ["Откажи по всяко време", "Можеш да откажеш Pro абонамента по всяко време. Pro остава активен до края на вече платения период и няма да бъдеш таксуван повторно."],
    ["30 дни връщане на парите", "Ако не си доволен, поискай пълно възстановяване до 30 дни след първото плащане или годишно подновяване. Връщането се обработва от платежния доставчик."],
    ["Право на отказ в ЕС", "Потребителите в ЕС имат 14-дневно право на отказ за дигитални услуги; нашите 30 дни го покриват и разширяват."],
    ["Как да поискаш", "Пиши на имейла за поддръжка от адреса, с който си платил. Сумата се връща по същия начин на плащане, обикновено до 5–10 работни дни."],
  ] },
  disclaimer: { title: "Финансов отказ от отговорност", updated: "Последна актуализация: октомври 2026", sections: [
    ["Не е инвестиционен съвет", "Приложението предоставя само аналитичен софтуер и информация. Нищо в него — включително DCF оценки, здравен индекс, сравнения и AI текстове — не е лична препоръка за покупка, продажба или задържане."],
    ["Без лиценз", "Не сме лицензиран инвестиционен посредник или консултант. Консултирай се с квалифициран специалист преди решения."],
    ["Риск", "Инвестирането носи риск, включително загуба на капитал. Миналите резултати не гарантират бъдещи. Моделите зависят от допускания, които може да се окажат грешни."],
    ["Данни", "Външните данни може да са забавени или неточни. Проверявай важните числа при брокера си."],
  ] },
};

const all: Partial<Record<Lang, Copy>> = { en, bg };
export const legalCopy = (lang: Lang): Copy => all[lang] ?? en;
