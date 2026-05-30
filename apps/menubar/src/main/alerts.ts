import { Notification } from "electron";
import type { MenubarConfig, Quote } from "@shared/types";
import { cFmtMoney } from "@shared/format";

const activeSides = new Map<string, "above" | "below">();

export function checkPriceAlerts(config: MenubarConfig, quotes: Quote[]): void {
  if (!config.notify || !Notification.isSupported()) return;
  const quoteByCode = new Map(quotes.map((quote) => [quote.code, quote]));

  for (const alert of config.alerts) {
    if (!alert.on) continue;
    const quote = quoteByCode.get(alert.code);
    if (!quote) continue;
    const crossed =
      alert.dir === "above" ? quote.price >= alert.price : quote.price <= alert.price;
    const currentSide = alert.dir;
    const key = alert.id;

    if (!crossed) {
      if (activeSides.get(key) === currentSide) activeSides.delete(key);
      continue;
    }
    if (activeSides.get(key) === currentSide) continue;
    activeSides.set(key, currentSide);

    const verb = alert.dir === "above" ? "涨破" : "跌破";
    new Notification({
      title: `${quote.name || alert.code} ${verb} ${cFmtMoney(alert.price)}`,
      body: `现价 ${cFmtMoney(quote.price)}，来自 Tidal 菜单栏价格提醒。`,
      silent: false,
    }).show();
  }
}
