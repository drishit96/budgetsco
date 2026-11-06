import type { PrismaClient } from "~/generated/prisma/client";

type JsonPrimitive = string | number | boolean | null | undefined;
type NonJsonPrimitive = undefined | Function | symbol;
type IsAny<T> = 0 extends 1 & T ? true : false;

export type Serialize<T> =
  IsAny<T> extends true ? any :
  T extends { toJSON(): infer U } ? (U extends JsonPrimitive ? U : Serialize<U>) :
  T extends Map<any, any> | Set<any> ? {} :
  T extends NonJsonPrimitive ? never :
  T extends JsonPrimitive ? T :
  T extends Array<infer U> ? Array<Serialize<U>> :
  T extends Promise<any> ? never :
  T extends object ? { [k in keyof T as T[k] extends NonJsonPrimitive ? never : k]: Serialize<T[k]> } :
  never;

declare global {
  var prisma: PrismaClient;
  interface Window {
    getDigitalGoodsService: (serviceProvider: string) => Promise<DigitalGoodsService>;
    turnstile: any;
    turnstileWidgetId: string;
    onloadTurnstileCallback: () => void;
    __remixManifest?: any;
    __reactRouterManifest?: any;
  }

  namespace JSX {
    interface IntrinsicElements {
      "stripe-pricing-table": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

interface DigitalGoodsService {
  getDetails: (itemIds: string[]) => Promise<ItemDetails[]>;
  listPurchases: () => Promise<PurchaseDetails[]>;
}

interface ItemDetails {
  itemId: string;
  title: string;
  price: { currency: string; value: number };
  description: string;
  subscriptionPeriod: string;
  freeTrialPeriod: string;
  type: "product" | "subscription";
}

interface PurchaseDetails {
  itemId: string;
  purchaseToken: string;
}
