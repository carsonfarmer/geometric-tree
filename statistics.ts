import { BZipTree, Node } from "./b_zip_tree.ts";

// TODO: This is just a temp constant placeholder.
const K = 32;

/**
 * Compute various statistics about the tree.
 * @param tree The tree to compute statistics for.
 */
export function treeStatistics<K, R extends number = number>(
  tree: BZipTree<K, R>,
) {
  const stats = statistics(tree.root);
  const spaceUtilization = stats.usedSlots / stats.totalSlots;
  const averageHeight = stats.sumOfAllEntryHeights / stats.usedSlots;
  return { spaceUtilization, averageHeight };
}

export function statistics<K, R extends number = number>(node?: Node<K, R>) {
  const stats = {
    maxEntryHeight: 1,
    sumOfAllEntryHeights: 0,
    totalSlots: K,
    usedSlots: 0,
  };
  if (node === undefined) {
    return stats;
  }
  const { children, keys } = node;
  for (const _key of keys) {
    stats.usedSlots += 1;
    stats.sumOfAllEntryHeights += 1;
  }
  for (const child of children) {
    const childStats = statistics(child);
    stats.maxEntryHeight = Math.max(
      stats.maxEntryHeight,
      childStats.maxEntryHeight + 1,
    );
    stats.sumOfAllEntryHeights += childStats.sumOfAllEntryHeights +
      childStats.usedSlots;
    stats.totalSlots += childStats.totalSlots;
    stats.usedSlots += childStats.usedSlots;
  }
  return stats;
}
