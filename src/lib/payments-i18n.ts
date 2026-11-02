import type { Lang } from "./i18n";

const en = {
  upgrade: "Upgrade to Pro",
  processing: "Activating Pro…",
  stillProcessing: "Your payment is confirmed, but Pro access is taking longer than expected.",
  checkStatus: "Check status again",
  success: "Payment received — Pro is active.",
  testSuccess: "Test payment received — test mode does not activate Pro access.",
  failed: "Checkout could not open. Please try again.",
  testBanner: "Creem is in test mode — no real payment will be taken.",
};
type Copy = typeof en;
const bg: Copy = {
  upgrade: "Вземи Pro",
  processing: "Активиране на Pro…",
  stillProcessing: "Плащането е потвърдено, но активирането на Pro се забавя.",
  checkStatus: "Провери отново",
  success: "Плащането е получено — Pro е активен.",
  testSuccess: "Тестовото плащане е получено — тестовият режим не активира Pro достъп.",
  failed: "Плащането не можа да се отвори. Опитай отново.",
  testBanner: "Creem е в тестов режим — няма да бъде направено реално плащане.",
};
const de: Copy = {
  upgrade: "Auf Pro upgraden",
  processing: "Pro wird aktiviert…",
  stillProcessing:
    "Deine Zahlung ist bestätigt, aber die Pro-Aktivierung dauert länger als erwartet.",
  checkStatus: "Status erneut prüfen",
  success: "Zahlung erhalten — Pro ist aktiv.",
  testSuccess: "Testzahlung erhalten — im Testmodus wird kein Pro-Zugriff aktiviert.",
  failed: "Checkout konnte nicht geöffnet werden.",
  testBanner: "Creem befindet sich im Testmodus — es wird keine echte Zahlung abgebucht.",
};
const es: Copy = {
  upgrade: "Pasar a Pro",
  processing: "Activando Pro…",
  stillProcessing:
    "El pago está confirmado, pero la activación de Pro está tardando más de lo esperado.",
  checkStatus: "Comprobar de nuevo",
  success: "Pago recibido — Pro está activo.",
  testSuccess: "Pago de prueba recibido — el modo de prueba no activa el acceso Pro.",
  failed: "No se pudo abrir el pago.",
  testBanner: "Creem está en modo de prueba — no se realizará ningún pago real.",
};
const it: Copy = {
  upgrade: "Passa a Pro",
  processing: "Attivazione Pro…",
  stillProcessing:
    "Il pagamento è confermato, ma l'attivazione Pro sta richiedendo più tempo del previsto.",
  checkStatus: "Verifica di nuovo",
  success: "Pagamento ricevuto — Pro è attivo.",
  testSuccess: "Pagamento di prova ricevuto — la modalità test non attiva l'accesso Pro.",
  failed: "Impossibile aprire il pagamento.",
  testBanner: "Creem è in modalità test — non verrà effettuato alcun pagamento reale.",
};
export const paymentsCopy: Record<Lang, Copy> = { en, bg, de, es, it };
