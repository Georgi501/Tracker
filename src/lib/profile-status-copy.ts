import type { Lang } from "./i18n";
export const profileStatusCopy: Record<
  Lang,
  { saving: string; uploading: string; saveError: string; uploadError: string; imageLimit: string }
> = {
  en: {
    saving: "Saving…",
    uploading: "Uploading photo…",
    saveError: "Your changes could not be saved. Please try again.",
    uploadError: "The photo could not be uploaded. Please try again.",
    imageLimit: "Choose an image up to 5 MB.",
  },
  bg: {
    saving: "Запазване…",
    uploading: "Качване на снимката…",
    saveError: "Промените не бяха запазени. Опитай отново.",
    uploadError: "Снимката не беше качена. Опитай отново.",
    imageLimit: "Избери изображение до 5 MB.",
  },
  de: {
    saving: "Wird gespeichert…",
    uploading: "Foto wird hochgeladen…",
    saveError: "Änderungen konnten nicht gespeichert werden. Bitte erneut versuchen.",
    uploadError: "Foto konnte nicht hochgeladen werden. Bitte erneut versuchen.",
    imageLimit: "Wähle ein Bild bis 5 MB.",
  },
  es: {
    saving: "Guardando…",
    uploading: "Subiendo foto…",
    saveError: "No se pudieron guardar los cambios. Inténtalo de nuevo.",
    uploadError: "No se pudo subir la foto. Inténtalo de nuevo.",
    imageLimit: "Elige una imagen de hasta 5 MB.",
  },
  it: {
    saving: "Salvataggio…",
    uploading: "Caricamento foto…",
    saveError: "Impossibile salvare le modifiche. Riprova.",
    uploadError: "Impossibile caricare la foto. Riprova.",
    imageLimit: "Scegli un'immagine fino a 5 MB.",
  },
};
