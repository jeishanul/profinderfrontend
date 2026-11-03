/**
 * The merchandise Shop (storefront, cart, checkout, orders). Mirrors Laravel's `/v1/shop/**` and
 * `/v1/dashboard/shop/**` resources (camelCase). Amounts are in the site currency (`useSiteSettings().money`).
 */
import type { ListPageMeta } from './dashboard'

export interface ShopCategoryRef {
  slug: string
  name: string
}

export interface ShopCategory extends ShopCategoryRef {
  description: string | null
  imageUrl: string | null
  productCount: number
  children: ShopCategory[]
}

export type ShopProductType = 'single' | 'variable'

export type ShopSort = 'newest' | 'price_asc' | 'price_desc'

export interface ShopProductCard {
  slug: string
  name: string
  shortDescription: string | null
  imageUrl: string | null
  imageAlt: string | null
  priceMin: number
  priceMax: number
  compareAtPrice: number | null
  inStock: boolean
  type: ShopProductType
  category: ShopCategoryRef | null
}

export interface ShopProductListMeta extends ListPageMeta {
  category: (ShopCategoryRef & { breadcrumb: ShopCategoryRef[] }) | null
}

export interface ShopProductImage {
  id: number
  url: string
  alt: string | null
}

export interface ShopAttributeValue {
  id: number
  value: string
}

export interface ShopAttribute {
  slug: string
  name: string
  values: ShopAttributeValue[]
}

export type ShopStockMode = 'unlimited' | 'tracked'

export interface ShopVariant {
  sku: string
  price: number
  compareAtPrice: number | null
  valueIds: number[]
  label: string | null
  imageId: number | null
  inStock: boolean
  stockMode: ShopStockMode
  /** Units left; `null` = unlimited. */
  available: number | null
  minQty: number
  maxQty: number | null
}

export interface ShopProduct extends ShopProductCard {
  description: string | null
  seoTitle: string | null
  seoDescription: string | null
  images: ShopProductImage[]
  breadcrumb: ShopCategoryRef[]
  attributes: ShopAttribute[]
  variants: ShopVariant[]
}

/** A cart line as the browser stores it (guest cart) and sends it (quote, merge, buy now). */
export interface ShopCartItemInput {
  sku: string
  quantity: number
}

export type ShopCartIssue = 'unavailable' | 'out_of_stock' | 'below_min' | 'above_max' | 'insufficient_stock'

export interface ShopCartLine {
  sku: string
  productSlug: string | null
  productName: string
  variantLabel: string | null
  imageUrl: string | null
  unitPrice: number
  compareAtPrice: number | null
  quantity: number
  lineTotal: number
  minQty: number
  maxQty: number | null
  available: number | null
  issue: ShopCartIssue | null
}

export interface ShopCartView {
  items: ShopCartLine[]
  subtotal: number
  itemCount: number
  hasIssues: boolean
}

export interface ShopAddress {
  id: number
  label: string | null
  recipientName: string
  phone: string
  provinceCode: string
  provinceName: string
  cityCode: string
  cityName: string
  /** The barangay's name (the location dataset has no barangay codes). */
  barangay: string | null
  street: string
  postalCode: string | null
  isDefault: boolean
}

export interface ShopAddressInput {
  label?: string | null
  recipientName: string
  phone: string
  provinceCode: string
  cityCode: string
  barangay?: string | null
  street: string
  postalCode?: string | null
  isDefault?: boolean
}

/** A payment gateway's key: `cod`, `paypal`, or a manual gateway the admin added (`bank_transfer`, `gcash`…). */
export type ShopPaymentMethod = string

/** How a gateway takes the money: on delivery, through PayPal, or by hand (the customer follows instructions). */
export type ShopPaymentDriver = 'cod' | 'paypal' | 'manual'

export type ShopCheckoutSource = 'cart' | 'buy_now'

export interface ShopPaymentOption {
  key: ShopPaymentMethod
  driver: ShopPaymentDriver
  /** The admin's name for it (Administration → Payment gateways). */
  name: string
  description: string | null
  /** A manual gateway's instructions (bank, account name and number…); null for COD and PayPal. Plain text. */
  instructions: string | null
  available: boolean
  reason: null | 'amount_limit' | 'cod_area'
}

export interface ShopCheckoutPreview {
  items: ShopCartLine[]
  subtotal: number
  shippingFee: number | null
  total: number | null
  deliverable: boolean | null
  hasIssues: boolean
  paymentMethods: ShopPaymentOption[]
}

export type ShopOrderStatus
  = | 'pending_payment'
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'refunded'

export type ShopPaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'failed'

export type ShopOrderFilter = 'all' | 'active' | 'delivered' | 'cancelled'

export interface ShopOrderRow {
  number: string
  status: ShopOrderStatus
  paymentStatus: ShopPaymentStatus
  paymentMethod: ShopPaymentMethod
  /** The gateway's name when the order was placed. */
  paymentMethodName: string
  total: number
  itemCount: number
  firstItem: { name: string, imageUrl: string | null } | null
  placedAt: string
}

export interface ShopOrderListMeta extends ListPageMeta {
  counts: Record<ShopOrderFilter, number>
}

export interface ShopOrderItem {
  sku: string
  productName: string
  productSlug: string | null
  variantLabel: string | null
  imageUrl: string | null
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface ShopOrder extends ShopOrderRow {
  /** A manual gateway's instructions (bank details…), until the shop marks the order paid. */
  paymentInstructions: string | null
  subtotal: number
  shippingFee: number
  currency: string
  note: string | null
  courier: string | null
  trackingNumber: string | null
  address: {
    recipientName: string
    phone: string
    street: string
    barangayName: string | null
    cityName: string
    provinceName: string
    postalCode: string | null
  }
  items: ShopOrderItem[]
  history: { status: ShopOrderStatus, note: string | null, at: string }[]
  paymentExpiresAt: string | null
  can: { cancel: boolean, pay: boolean }
}

export interface ShopPlaceOrderResult {
  data: ShopOrder
  approveUrl: string | null
}
