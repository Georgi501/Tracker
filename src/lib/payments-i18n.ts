import type { Lang } from "./i18n";

const en = {
  upgrade: "Upgrade to Pro",
  processing: "Activating Pro…",
  success: "Payment received — Pro is active.",
  testSuccess: "Test payment received — test mode does not activate Pro access.",
  failed: "Checkout could not open. Please try again.",
  testBanner: "Creem is in test mode — no real payment will be taken.",
};
type Copy = typeof en;
const bg: Copy = {
  upgrade: "Вземи Pro",
  processing: "Активиране на Pro…",
  success: "Плащането е получено — Pro е активен.",
  testSuccess: "Тестовото плащане е получено — тестовият режим не активира Pro достъп.",
  failed: "Плащането не можа да се отвори. Опитай отново.",
  testBanner: "Creem е в тестов режим — няма да бъде направено реално плащане.",
};
const de: Copy = {
  upgrade: "Auf Pro upgraden",
  processing: "Pro wird aktiviert…",
  success: "Zahlung erhalten — Pro ist aktiv.",
  testSuccess: "Testzahlung erhalten — im Testmodus wird kein Pro-Zugriff aktiviert.",
  failed: "Checkout konnte nicht geöffnet werden.",
  testBanner: "Creem befindet sich im Testmodus — es wird keine echte Zahlung abgebucht.",
};
const es: Copy = {
  upgrade: "Pasar a Pro",
  processing: "Activando Pro…",
  success: "Pago recibido — Pro está activo.",
  testSuccess: "Pago de prueba recibido — el modo de prueba no activa el acceso Pro.",
  failed: "No se pudo abrir el pago.",
  testBanner: "Creem está en modo de prueba — no se realizará ningún pago real.",
};
const it: Copy = {
  upgrade: "Passa a Pro",
  processing: "Attivazione Pro…",
  success: "Pagamento ricevuto — Pro è attivo.",
  testSuccess: "Pagamento di prova ricevuto — la modalità test non attiva l'accesso Pro.",
  failed: "Impossibile aprire il pagamento.",
  testBanner: "Creem è in modalità test — non verrà effettuato alcun pagamento reale.",
};
export const paymentsCopy: Record<Lang, Copy> = { en, bg, de, es, it };
