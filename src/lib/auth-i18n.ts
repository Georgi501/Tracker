import type { Lang } from "@/lib/i18n";

type Copy = {
  passwordHint: string;
  weak: string;
  invalid: string;
  notConfirmed: string;
  exists: string;
  sent: (e: string) => string;
  back: string;
  resetNeedEmail: string;
  resetSentTo: (e: string) => string;
  noAccount: string;
  haveAccount: string;
  show: string;
  hide: string;
  resetDescription: string;
  confirmNewPassword: string;
  resetPassword: string;
  savingPassword: string;
  passwordMismatch: string;
  resetSessionExpired: string;
  googleLoading: string;
  googleFailed: string;
  googleLoadError: string;
};

export const authCopy: Record<Lang, Copy> = {
  en: {
    passwordHint: "At least 8 characters. Avoid common passwords like 12345678 or password.",
    weak: "This password is too common or easy to guess. Please choose a more unique one.",
    invalid: "Wrong email or password.",
    notConfirmed: "Please confirm your email first — check your inbox (and spam).",
    exists: "This email is already registered. Sign in instead.",
    sent: (e) => `We sent a confirmation link to ${e}. Open it, then sign in here.`,
    back: "Back to sign in",
    resetNeedEmail: "Enter your email address above, then click “Forgot password?” again.",
    resetSentTo: (e) =>
      `If an account exists for ${e}, we've sent a password reset link. Check your inbox (and spam).`,
    noAccount: "No account? Create one",
    haveAccount: "Already have an account? Sign in",
    show: "Show",
    hide: "Hide",
    resetDescription: "Choose a strong password of at least 8 characters.",
    confirmNewPassword: "Confirm new password",
    resetPassword: "Update password",
    savingPassword: "Updating password…",
    passwordMismatch: "The passwords do not match.",
    resetSessionExpired: "This reset link is invalid or expired. Request a new one and try again.",
    googleLoading: "Loading secure Google sign-in…",
    googleFailed: "Google sign-in couldn't be completed.",
    googleLoadError: "Google sign-in couldn't be loaded. Please try again or use email sign-in.",
  },
  bg: {
    passwordHint: "Поне 8 символа. Избягвайте често срещани пароли като 12345678 или password.",
    weak: "Тази парола е твърде често срещана или лесна за отгатване. Изберете по-уникална.",
    invalid: "Грешен имейл или парола.",
    notConfirmed: "Първо потвърдете имейла си — проверете пощата (и спам папката).",
    exists: "Този имейл вече е регистриран. Влезте в профила си.",
    sent: (e) => `Изпратихме линк за потвърждение на ${e}. Отворете го и после влезте тук.`,
    back: "Към вход",
    resetNeedEmail: "Въведете имейл адреса си по-горе и натиснете отново „Забравена парола“.",
    resetSentTo: (e) =>
      `Ако съществува акаунт за ${e}, изпратихме линк за нова парола. Проверете пощата си (и спама).`,
    noAccount: "Нямате профил? Регистрирайте се",
    haveAccount: "Имате профил? Влезте",
    show: "Покажи",
    hide: "Скрий",
    resetDescription: "Избери силна парола с поне 8 символа.",
    confirmNewPassword: "Потвърди новата парола",
    resetPassword: "Смени паролата",
    savingPassword: "Паролата се обновява…",
    passwordMismatch: "Паролите не съвпадат.",
    resetSessionExpired: "Линкът за смяна е невалиден или изтекъл. Поискай нов и опитай отново.",
    googleLoading: "Зареждане на защитения вход с Google…",
    googleFailed: "Входът с Google не беше завършен.",
    googleLoadError: "Google входът не се зареди. Опитай отново или използвай имейл.",
  },
  de: {
    passwordHint: "Mindestens 8 Zeichen. Vermeiden Sie gängige Passwörter wie 12345678.",
    weak: "Dieses Passwort ist zu häufig oder leicht zu erraten. Bitte wählen Sie ein anderes.",
    invalid: "Falsche E-Mail oder falsches Passwort.",
    notConfirmed: "Bitte bestätigen Sie zuerst Ihre E-Mail (auch Spam prüfen).",
    exists: "Diese E-Mail ist bereits registriert. Bitte anmelden.",
    sent: (e) => `Bestätigungslink an ${e} gesendet. Öffnen und dann hier anmelden.`,
    back: "Zur Anmeldung",
    resetNeedEmail:
      "Geben Sie oben Ihre E-Mail-Adresse ein und klicken Sie erneut auf „Passwort vergessen?“.",
    resetSentTo: (e) =>
      `Falls ein Konto für ${e} existiert, haben wir einen Link zum Zurücksetzen gesendet. Prüfen Sie Ihr Postfach (und Spam).`,
    noAccount: "Kein Konto? Registrieren",
    haveAccount: "Schon ein Konto? Anmelden",
    show: "Zeigen",
    hide: "Verbergen",
    resetDescription: "Wähle ein sicheres Passwort mit mindestens 8 Zeichen.",
    confirmNewPassword: "Neues Passwort bestätigen",
    resetPassword: "Passwort aktualisieren",
    savingPassword: "Passwort wird aktualisiert…",
    passwordMismatch: "Die Passwörter stimmen nicht überein.",
    resetSessionExpired:
      "Dieser Link ist ungültig oder abgelaufen. Fordere einen neuen an und versuche es erneut.",
    googleLoading: "Sichere Google-Anmeldung wird geladen…",
    googleFailed: "Die Google-Anmeldung konnte nicht abgeschlossen werden.",
    googleLoadError:
      "Google-Anmeldung konnte nicht geladen werden. Bitte erneut versuchen oder E-Mail nutzen.",
  },
  es: {
    passwordHint: "Al menos 8 caracteres. Evita contraseñas comunes como 12345678.",
    weak: "Esta contraseña es demasiado común o fácil de adivinar. Elige otra.",
    invalid: "Correo o contraseña incorrectos.",
    notConfirmed: "Confirma primero tu correo (revisa también spam).",
    exists: "Este correo ya está registrado. Inicia sesión.",
    sent: (e) => `Enviamos un enlace de confirmación a ${e}. Ábrelo y luego inicia sesión aquí.`,
    back: "Volver a iniciar sesión",
    resetNeedEmail: "Introduce tu correo arriba y vuelve a pulsar «¿Olvidaste tu contraseña?».",
    resetSentTo: (e) =>
      `Si existe una cuenta para ${e}, hemos enviado un enlace para restablecer la contraseña. Revisa tu bandeja (y el spam).`,
    noAccount: "¿Sin cuenta? Regístrate",
    haveAccount: "¿Ya tienes cuenta? Inicia sesión",
    show: "Mostrar",
    hide: "Ocultar",
    resetDescription: "Elige una contraseña segura de al menos 8 caracteres.",
    confirmNewPassword: "Confirmar nueva contraseña",
    resetPassword: "Actualizar contraseña",
    savingPassword: "Actualizando contraseña…",
    passwordMismatch: "Las contraseñas no coinciden.",
    resetSessionExpired:
      "Este enlace no es válido o ha caducado. Solicita uno nuevo e inténtalo de nuevo.",
    googleLoading: "Cargando el acceso seguro de Google…",
    googleFailed: "No se pudo completar el acceso con Google.",
    googleLoadError: "No se pudo cargar Google. Inténtalo de nuevo o usa el acceso por correo.",
  },
  it: {
    passwordHint: "Almeno 8 caratteri. Evita password comuni come 12345678.",
    weak: "Questa password è troppo comune o facile da indovinare. Scegline un'altra.",
    invalid: "Email o password errate.",
    notConfirmed: "Conferma prima la tua email (controlla anche lo spam).",
    exists: "Questa email è già registrata. Accedi.",
    sent: (e) => `Abbiamo inviato un link di conferma a ${e}. Aprilo e poi accedi qui.`,
    back: "Torna all'accesso",
    resetNeedEmail:
      "Inserisci la tua email qui sopra e clicca di nuovo su «Password dimenticata?».",
    resetSentTo: (e) =>
      `Se esiste un account per ${e}, abbiamo inviato un link per reimpostare la password. Controlla la posta (e lo spam).`,
    noAccount: "Nessun account? Registrati",
    haveAccount: "Hai già un account? Accedi",
    show: "Mostra",
    hide: "Nascondi",
    resetDescription: "Scegli una password sicura di almeno 8 caratteri.",
    confirmNewPassword: "Conferma la nuova password",
    resetPassword: "Aggiorna password",
    savingPassword: "Aggiornamento password…",
    passwordMismatch: "Le password non coincidono.",
    resetSessionExpired: "Questo link non è valido o è scaduto. Richiedine uno nuovo e riprova.",
    googleLoading: "Caricamento dell'accesso sicuro con Google…",
    googleFailed: "Non è stato possibile completare l'accesso con Google.",
    googleLoadError: "Impossibile caricare Google. Riprova o accedi con l'email.",
  },
};

export function authErrorKey(
  message: string,
): "weak" | "invalid" | "notConfirmed" | "exists" | null {
  const m = message.toLowerCase();
  if (m.includes("weak") || m.includes("easy to guess") || m.includes("pwned")) return "weak";
  if (m.includes("invalid login")) return "invalid";
  if (m.includes("not confirmed")) return "notConfirmed";
  if (m.includes("already registered") || m.includes("already exists")) return "exists";
  return null;
}
