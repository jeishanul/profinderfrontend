import type { HomeData } from '#shared/types/cms'

// The landing page's layout: sections in the admin's order, with their text, images and settings.
export default defineEventHandler((event): Promise<HomeData> => callApi<HomeData>(event, '/home'))
