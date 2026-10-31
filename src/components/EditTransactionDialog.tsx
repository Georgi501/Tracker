import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePortfolio } from "@/lib/store";
import type { Transaction } from "@/lib/portfolio";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const COPY = {
  en: {
    title: "Edit transaction",
    description: "Changes affect holdings, performance and historical charts.",
    quantity: "Quantity",
    unitPrice: "Price per unit (USD)",
    dividend: "Dividend amount (USD)",
    fee: "Transaction fee (USD)",
    date: "Date",
    save: "Save changes",
    cancel: "Cancel",
    invalid: "Enter a valid positive amount and date.",
    future: "Date cannot be in the future.",
    saved: "Transaction updated.",
    undo: "Undo",
    reverted: "Previous transaction restored.",
  },
  bg: {
    title: "Редактирай сделка",
    description: "Промените влияят на позициите, доходността и историческите графики.",
    quantity: "Количество",
    unitPrice: "Цена за единица (USD)",
    dividend: "Сума на дивидента (USD)",
    fee: "Такса по сделката (USD)",
    date: "Дата",
    save: "Запази промените",
    cancel: "Отказ",
    invalid: "Въведи валидна положителна сума и дата.",
    future: "Датата не може да е в бъдещето.",
    saved: "Сделката е обновена.",
    undo: "Отмени",
    reverted: "Предишната сделка е възстановена.",
  },
  de: {
    title: "Transaktion bearbeiten",
    description: "Änderungen wirken sich auf Positionen, Rendite und historische Diagramme aus.",
    quantity: "Menge",
    unitPrice: "Preis pro Einheit (USD)",
    dividend: "Dividendenbetrag (USD)",
    fee: "Transaktionsgebühr (USD)",
    date: "Datum",
    save: "Änderungen speichern",
    cancel: "Abbrechen",
    invalid: "Gib einen gültigen positiven Betrag und ein Datum ein.",
    future: "Das Datum darf nicht in der Zukunft liegen.",
    saved: "Transaktion aktualisiert.",
    undo: "Rückgängig",
    reverted: "Vorherige Transaktion wiederhergestellt.",
  },
  es: {
    title: "Editar operación",
    description: "Los cambios afectan a las posiciones, la rentabilidad y los gráficos históricos.",
    quantity: "Cantidad",
    unitPrice: "Precio por unidad (USD)",
    dividend: "Importe del dividendo (USD)",
    fee: "Comisión de la operación (USD)",
    date: "Fecha",
    save: "Guardar cambios",
    cancel: "Cancelar",
    invalid: "Introduce un importe positivo y una fecha válidos.",
    future: "La fecha no puede estar en el futuro.",
    saved: "Operación actualizada.",
    undo: "Deshacer",
    reverted: "Se restauró la operación anterior.",
  },
  it: {
    title: "Modifica operazione",
    description: "Le modifiche influiscono su posizioni, rendimento e grafici storici.",
    quantity: "Quantità",
    unitPrice: "Prezzo per unità (USD)",
    dividend: "Importo del dividendo (USD)",
    fee: "Commissione della transazione (USD)",
    date: "Data",
    save: "Salva modifiche",
    cancel: "Annulla",
    invalid: "Inserisci un importo positivo e una data validi.",
    future: "La data non può essere futura.",
    saved: "Operazione aggiornata.",
    undo: "Annulla",
    reverted: "Operazione precedente ripristinata.",
  },
} as const;

const field =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

export function EditTransactionDialog({
  transaction,
  onClose,
}: {
  transaction: Transaction | null;
  onClose: () => void;
}) {
  const p = usePortfolio();
  const copy = COPY[p.lang];
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [fee, setFee] = useState("0");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setQuantity(transaction ? String(transaction.quantity) : "");
    setPrice(transaction ? String(transaction.price) : "");
    setFee(String(transaction?.fee ?? 0));
    setDate(transaction?.date ?? "");
  }, [transaction]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!transaction) return;
    const nextQuantity = Number(quantity);
    const nextPrice = Number(price);
    const nextFee = Number(fee);
    if (
      !Number.isFinite(nextPrice) ||
      nextPrice <= 0 ||
      !Number.isFinite(nextFee) ||
      nextFee < 0 ||
      (transaction.kind !== "dividend" && (!Number.isFinite(nextQuantity) || nextQuantity <= 0)) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) ||
      new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
    ) {
      toast.error(copy.invalid);
      return;
    }
    if (date > new Date().toISOString().slice(0, 10)) {
      toast.error(copy.future);
      return;
    }
    setSaving(true);
    try {
      await p.updateTransaction({
        ...transaction,
        quantity: transaction.kind === "dividend" ? transaction.quantity : nextQuantity,
        price: nextPrice,
        fee: nextFee,
        date,
      });
      toast.success(copy.saved, {
        duration: 10_000,
        action: {
          label: copy.undo,
          onClick: () => {
            void p
              .updateTransaction(transaction)
              .then(() => toast.success(copy.reverted))
              .catch((error: unknown) =>
                toast.error(error instanceof Error ? error.message : "Error"),
              );
          },
        },
      });
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!transaction} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form className="space-y-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.description}</DialogDescription>
          </DialogHeader>
          {transaction && (
            <p className="text-sm font-semibold">
              {p.assets.find((asset) => asset.id === transaction.assetId)?.symbol ?? p.t("asset")} ·{" "}
              {p.t(transaction.kind)}
            </p>
          )}
          {transaction?.kind !== "dividend" && (
            <label className="block space-y-1.5 text-sm">
              {copy.quantity}
              <input
                type="number"
                min="0.00000001"
                step="any"
                required
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className={field}
              />
            </label>
          )}
          {transaction?.kind !== "dividend" && (
            <label className="block space-y-1.5 text-sm">
              {copy.fee}
              <input
                type="number"
                min="0"
                step="any"
                value={fee}
                onChange={(event) => setFee(event.target.value)}
                className={field}
              />
            </label>
          )}
          <label className="block space-y-1.5 text-sm">
            {transaction?.kind === "dividend" ? copy.dividend : copy.unitPrice}
            <input
              type="number"
              min="0.00000001"
              step="any"
              required
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className={field}
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            {copy.date}
            <input
              type="date"
              required
              max={new Date().toISOString().slice(0, 10)}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={field}
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              {copy.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "…" : copy.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
