import { decimalToNumber } from "@/lib/api";

export interface VendorRequestContext {
  id: string;
  businessName: string;
  contactPhone: string | null;
  tinNumber: string | null;
  paymentTerms: string[];
  paymentMethods: string[];
  paymentMethodOtherDetail: string | null;
  momoAccountName: string | null;
  momoNumber: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankSwiftCode: string | null;
  services: Array<{
    id: string;
    title: string;
    categoryId: string;
    categoryName: string;
    baseAmount: number | null;
    baseCurrency: string;
  }>;
}

type ProviderWithServices = {
  id: string;
  businessName: string;
  contactPhone: string | null;
  billingCapability: {
    vendorTinNumber: string | null;
    paymentTermsCsv: string | null;
    paymentMethodsCsv: string | null;
    paymentMethodOtherDetail: string | null;
    momoAccountName: string | null;
    momoNumber: string | null;
    bankName: string | null;
    bankAccountName: string | null;
    bankAccountNumber: string | null;
    bankSwiftCode: string | null;
  } | null;
  services: Array<{
    id: string;
    title: string;
    categoryId: string;
    category: { name: string };
    priceCards: Array<{ basePrice: unknown; currency: string }>;
  }>;
};

export function buildVendorRequestContext(provider: ProviderWithServices): VendorRequestContext {
  return {
    id: provider.id,
    businessName: provider.businessName,
    contactPhone: provider.contactPhone,
    tinNumber: provider.billingCapability?.vendorTinNumber ?? null,
    paymentTerms: provider.billingCapability?.paymentTermsCsv
      ? provider.billingCapability.paymentTermsCsv
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
    paymentMethods: provider.billingCapability?.paymentMethodsCsv
      ? provider.billingCapability.paymentMethodsCsv
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : ["bank_transfer", "momo", "cash", "card", "other"],
    paymentMethodOtherDetail: provider.billingCapability?.paymentMethodOtherDetail ?? null,
    momoAccountName: provider.billingCapability?.momoAccountName ?? null,
    momoNumber: provider.billingCapability?.momoNumber ?? null,
    bankName: provider.billingCapability?.bankName ?? null,
    bankAccountName: provider.billingCapability?.bankAccountName ?? null,
    bankAccountNumber: provider.billingCapability?.bankAccountNumber ?? null,
    bankSwiftCode: provider.billingCapability?.bankSwiftCode ?? null,
    services: provider.services.map((service) => ({
      id: service.id,
      title: service.title,
      categoryId: service.categoryId,
      categoryName: service.category.name,
      baseAmount:
        service.priceCards.length > 0 ? decimalToNumber(service.priceCards[0]?.basePrice) : null,
      baseCurrency: service.priceCards[0]?.currency ?? "RWF"
    }))
  };
}
