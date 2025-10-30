/**
 * Parses PHP serialized data from WordPress to extract evidence counts
 * Format examples:
 * - a:2:{i:0;s:1:"1";i:1;s:1:"3";} = array with 2 items (count = 2)
 * - a:3:{i:0;s:1:"1";i:1;s:1:"2";i:2;s:1:"3";} = array with 3 items (count = 3)
 * - Simple number like "3" or "2" = direct count
 * - Empty or null = 0
 */

export function parsePhpEvidenceCount(value: string | null | undefined): number {
  if (!value || value.trim() === '') {
    return 0;
  }

  const trimmed = value.trim();

  // If it's a simple number, return it
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  // Parse PHP serialized array format: a:N:{...}
  // The N after 'a:' represents the number of items in the array
  const arrayMatch = trimmed.match(/^a:(\d+):/);
  if (arrayMatch) {
    return parseInt(arrayMatch[1], 10);
  }

  // If we can't parse it, log warning and return 0
  console.warn(`Unable to parse PHP evidence count: "${value}"`);
  return 0;
}

/**
 * Sums evidence counts from multiple stage columns
 */
export function sumStageEvidence(
  stage1: string | null | undefined,
  stage2: string | null | undefined,
  stage3: string | null | undefined
): number {
  const count1 = parsePhpEvidenceCount(stage1);
  const count2 = parsePhpEvidenceCount(stage2);
  const count3 = parsePhpEvidenceCount(stage3);
  
  return count1 + count2 + count3;
}
