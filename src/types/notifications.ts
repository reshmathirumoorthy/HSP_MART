export type NotificationType =
  | "ORDER_PLACED"
  | "ORDER_CONFIRMED"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED"
  | "PAYMENT_SUCCESSFUL"
  | "QUOTE_SUBMITTED"
  | "QUOTE_UPDATED"
  | "QUOTE_APPROVED"
  | "QUOTE_REJECTED"
  | "CUSTOMIZATION_SAVED"
  | "CUSTOMIZATION_UPDATED"
  | "WISHLIST_PRICE_UPDATE"
  | "PRODUCT_BACK_IN_STOCK"
  | "ACCOUNT_SECURITY";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  href?: string;
};
