export default defineEventHandler((event): Promise<string[]> => {
  return callApi<string[]>(event, '/dashboard/saved-providers/ids')
})
