import { PrismaClient } from "@prisma/client";

export {};

declare global {
  var prisma: PrismaClient;
  interface Window {
    getDigitalGoodsService: (serviceProvider: string) => Promise<DigitalGoodsService>;
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
