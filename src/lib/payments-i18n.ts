import type { Lang } from "./i18n";

const en = { upgrade: "Upgrade to Pro", processing: "Activating Pro…", success: "Payment received — Pro is active.", failed: "Checkout could not open. Please try again.",
  testBanner: "Payments in the preview are in test mode — use card 4242 4242 4242 4242." };
type Copy = typeof en;
const bg: Copy = { upgrade: "Вземи Pro", processing: "Активиране на Pro…", success: "Плащането е получено — Pro е активен.", failed: "Плащането не можа да се отвори. Опитай отново.",
  testBanner: "Плащанията в прегледа са в тестов режим — използвай карта 4242 4242 4242 4242." };
const de: Copy = { upgrade: "Auf Pro upgraden", processing: "Pro wird aktiviert…", success: "Zahlung erhalten — Pro ist aktiv.", failed: "Checkout konnte nicht geöffnet werden.",
  testBanner: "Zahlungen in der Vorschau sind im Testmodus — Karte 4242 4242 4242 4242 verwenden." };
const es: Copy = { upgrade: "Pasar a Pro", processing: "Activando Pro…", success: "Pago recibido — Pro está activo.", failed: "No se pudo abrir el pago.",
  testBanner: "Los pagos en la vista previa están en modo de prueba — usa la tarjeta 4242 4242 4242 4242." };
const it: Copy = { upgrade: "Passa a Pro", processing: "Attivazione Pro…", success: "Pagamento ricevuto — Pro è attivo.", failed: "Impossibile aprire il pagamento.",
  testBanner: "I pagamenti nell'anteprima sono in modalità test — usa la carta 4242 4242 4242 4242." };
export const paymentsCopy: Record<Lang, Copy> = { en, bg, de, es, it };
