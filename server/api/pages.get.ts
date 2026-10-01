export default defineEventHandler((event): Promise<{ slug: string, title: string }[]> => {
  return callApi<{ slug: string, title: string }[]>(event, '/pages')
})
