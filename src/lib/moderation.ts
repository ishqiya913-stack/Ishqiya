const digitWords = "zero one two three four five six seven eight nine".split(" ");

export type ModerationResult = {
  allowed: boolean;
  reason?: string;
  confidence?: number;
};

export function moderateContactSharing(input: string): ModerationResult {
  const normalized = input.toLowerCase().replace(/[o]/g, "0").replace(/[il]/g, "1");
  const compact = normalized.replace(/[^a-z0-9]/g, "");
  const digits = compact.replace(/\D/g, "");
  const wordDigits = digitWords.map((word, index) => [word, String(index)] as const);
  let spelled = normalized;
  for (const [word, digit] of wordDigits) spelled = spelled.replaceAll(word, digit);
  const spelledDigits = spelled.replace(/\D/g, "");
  const hasPhonePattern = digits.length >= 8 || spelledDigits.length >= 8;
  const hasContactWords = /whats?app|telegram|snap(chat)?|call\s*me|contact|number|phone|\+\d/.test(normalized);
  if (hasPhonePattern || hasContactWords) {
    return { allowed: false, reason: "Possible contact sharing", confidence: hasPhonePattern ? 0.98 : 0.86 };
  }
  return { allowed: true };
}
