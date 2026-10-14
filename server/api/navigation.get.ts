import type { NavigationData } from '#shared/types/navigation'

// Header, footer and mobile-menu links, resolved by the backend.
export default defineEventHandler((event): Promise<NavigationData> => callApi<NavigationData>(event, '/navigation'))
