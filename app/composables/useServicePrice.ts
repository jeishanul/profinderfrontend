/** "₱150 flat" / "₱45/hr" in the site currency — formatted here, never by the API. */
export function useServicePrice() {
  const { money } = useSiteSettings()
  const { t } = useI18n()

  return (service: { priceType: 'flat' | 'hourly', priceAmount: number }): string =>
    t(`dashboard.services.price.${service.priceType}`, { amount: money(service.priceAmount) })
}
