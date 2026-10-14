export default defineEventHandler((event): Promise<{ slug: string, title: string }[]> => {
  return getPublicApi<{ slug: string, title: string }[]>(event, '/pages')
})
