/** Public sale state, read the same way `/api/products` reads the catalogue. */
export default defineEventHandler(async () => {
  const { saleActive, salePercent } = await getSaleState()
  return { saleActive, salePercent }
})
