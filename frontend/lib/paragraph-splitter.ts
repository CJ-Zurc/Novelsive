/**
 * Split chapter content into paragraph blocks of ≤ 200 words at sentence boundaries.
 * Returns an array of paragraph blocks with their content and word count.
 */
export function splitIntoParagraphBlocks(
  content: string,
  maxWordsPerBlock: number = 200
): Array<{ content: string; wordCount: number }> {
  if (!content || content.trim().length === 0) {
    return [];
  }

  // Split by sentence boundaries (. ! ? followed by space or end)
  const sentences = content.match(/[^.!?]+[.!?]+\s?/g) || [content];
  const blocks: Array<{ content: string; wordCount: number }> = [];

  let currentBlock = "";
  let currentWordCount = 0;

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    const wordCount = trimmed.split(/\s+/).length;

    // If adding this sentence would exceed limit and we already have content, start a new block
    if (currentWordCount + wordCount > maxWordsPerBlock && currentBlock.length > 0) {
      blocks.push({
        content: currentBlock.trim(),
        wordCount: currentWordCount,
      });
      currentBlock = trimmed;
      currentWordCount = wordCount;
    } else {
      // Add sentence to current block
      if (currentBlock.length > 0) {
        currentBlock += " " + trimmed;
      } else {
        currentBlock = trimmed;
      }
      currentWordCount += wordCount;
    }
  }

  // Add final block if not empty
  if (currentBlock.length > 0) {
    blocks.push({
      content: currentBlock.trim(),
      wordCount: currentWordCount,
    });
  }

  return blocks.length > 0 ? blocks : [{ content, wordCount: content.split(/\s+/).length }];
}
