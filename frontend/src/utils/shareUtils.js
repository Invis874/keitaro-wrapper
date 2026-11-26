/**
 * Пересчитывает share для офферов.
 * @param {Array} offers - Массив офферов { offer_id, share, pinned, is_orphaned }
 * @param {number} total - Общая сумма (обычно 100)
 * @returns {Array} Новый массив с пересчитанными share
 */
export function recalculateShare(offers, total = 100) {
  const pinnedSum = offers
    .filter((o) => o.pinned && !o.is_orphaned)
    .reduce((sum, o) => sum + o.share, 0)

  const unpinned = offers.filter((o) => !o.pinned && !o.is_orphaned)

  const remaining = Math.max(0, total - pinnedSum)
  const sharePerUnpinned = unpinned.length > 0 ? Math.floor(remaining / unpinned.length) : 0
  let remainder = remaining - sharePerUnpinned * unpinned.length

  return offers.map((o) => {
    if (o.is_orphaned || o.pinned) return o
    const extra = remainder > 0 ? 1 : 0
    if (extra) remainder--
    return { ...o, share: sharePerUnpinned + extra }
  })
}