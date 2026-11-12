import {
  readAlerts,
  readBondCouponDates,
  readEarningsReminders,
  readWatchlist,
  type PriceAlert,
} from "@/lib/watchlist";
import { useEffect, useState } from "react";
export function useWatchState() {
  const [list, setList] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [earningsReminders, setEarningsReminders] = useState<string[]>([]);
  const [bondCouponDates, setBondCouponDates] = useState<Record<string, string>>({});
  useEffect(() => {
    const sync = () => {
      setList(readWatchlist());
      setAlerts(readAlerts());
      setEarningsReminders(readEarningsReminders());
      setBondCouponDates(readBondCouponDates());
    };
    sync();
    window.addEventListener("folio-watch", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("folio-watch", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return { list, alerts, earningsReminders, bondCouponDates };
}
