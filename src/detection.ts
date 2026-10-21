export type Risk = "None" | "Low" | "Medium" | "High" | "Critical";

export type FindingType = "email" | "ukPhone" | "ukNino" | "paymentCard";

export interface Finding {
  type: FindingType;
  risk: Exclude<Risk, "None">;
  count: number;
  maskedExample: string;
}

export interface ScanResult {
  classification: Risk;
  totalCount: number;
  findings: Finding[];
}

interface Match {
  start: number;
  end: number;
  value: string;
}

interface Detector {
  type: FindingType;
  risk: Exclude<Risk, "None">;
  detect: (input: string) => Match[];
  mask: (value: string) => string;
}

interface CandidateMatch extends Match {
  detector: Detector;
  detectorIndex: number;
}

const riskRank: Record<Risk, number> = {
  None: 0,
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
};

const emailPattern =
  /\b[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+\b/giu;

const phonePattern =
  /(?:\+44\s?(?:\(0\)\s?)?|0)(?:7|1|2)(?:[\s()-]?\d){9}/gu;

const ninoPattern =
  /[ABCEGHJKLMNOPRSTWXYZ][ABCEGHJKLMNPRSTWXYZ](?:\s?\d{2}){3}\s?[A-D]?/giu;

const cardCandidatePattern = /\d(?:[ -]?\d){12,}/gu;

const invalidNinoPrefixes = new Set(["BG", "GB", "KN", "NK", "NT", "TN", "ZZ"]);

function regexMatches(
  input: string,
  pattern: RegExp,
  isValid: (value: string, start: number, end: number) => boolean = () => true,
): Match[] {
  const matches: Match[] = [];

  for (const match of input.matchAll(pattern)) {
    const value = match[0];
    const start = match.index;
    const end = start + value.length;

    if (isValid(value, start, end)) {
      matches.push({ start, end, value });
    }
  }

  return matches;
}

function hasAlphaNumericBoundary(input: string, start: number, end: number): boolean {
  const previous = input[start - 1];
  const next = input[end];

  return (!previous || !/[\p{L}\p{N}]/u.test(previous))
    && (!next || !/[\p{L}\p{N}]/u.test(next));
}

function detectEmails(input: string): Match[] {
  return regexMatches(input, emailPattern);
}

function detectPhones(input: string): Match[] {
  return regexMatches(input, phonePattern, (value, start, end) => {
    if (!hasAlphaNumericBoundary(input, start, end)) {
      return false;
    }

    const digits = value.replace(/\D/gu, "");
    const normalizedDigits = digits.startsWith("440") ? `44${digits.slice(3)}` : digits;
    const nationalDigits = normalizedDigits.startsWith("44")
      ? normalizedDigits.slice(2)
      : normalizedDigits.slice(1);

    return nationalDigits.length === 10 && /^[127]/u.test(nationalDigits);
  });
}

function detectNinos(input: string): Match[] {
  return regexMatches(input, ninoPattern, (value, start, end) => {
    if (!hasAlphaNumericBoundary(input, start, end)) {
      return false;
    }

    const compact = value.replace(/\s/gu, "").toUpperCase();
    return !invalidNinoPrefixes.has(compact.slice(0, 2));
  });
}

function passesLuhn(digits: string): boolean {
  let sum = 0;
  let shouldDouble = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function detectCards(input: string): Match[] {
  return regexMatches(input, cardCandidatePattern, (value, start, end) => {
    if (!hasAlphaNumericBoundary(input, start, end)) {
      return false;
    }

    const digits = value.replace(/\D/gu, "");
    return digits.length >= 13 && digits.length <= 19 && passesLuhn(digits);
  });
}

function maskEmail(value: string): string {
  const separator = value.indexOf("@");
  return `${value[0]}***${value.slice(separator)}`;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/gu, "");
  return `${digits.slice(0, 2)}${"*".repeat(Math.max(0, digits.length - 5))}${digits.slice(-3)}`;
}

function maskNino(value: string): string {
  const compact = value.replace(/\s/gu, "").toUpperCase();
  const suffix = /[A-D]$/u.test(compact) ? compact.slice(-1) : "";
  return `${compact.slice(0, 2)}******${suffix}`;
}

function maskCard(value: string): string {
  const digits = value.replace(/\D/gu, "");
  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

const detectors: Detector[] = [
  { type: "email", risk: "Low", detect: detectEmails, mask: maskEmail },
  { type: "ukPhone", risk: "Medium", detect: detectPhones, mask: maskPhone },
  { type: "ukNino", risk: "High", detect: detectNinos, mask: maskNino },
  { type: "paymentCard", risk: "Critical", detect: detectCards, mask: maskCard },
];

function resolveOverlaps(input: string): Map<FindingType, Match[]> {
  const candidates = detectors.flatMap((detector, detectorIndex) =>
    detector.detect(input).map((match) => ({ ...match, detector, detectorIndex }))
  );

  candidates.sort((left, right) =>
    riskRank[right.detector.risk] - riskRank[left.detector.risk]
    || left.start - right.start
    || (right.end - right.start) - (left.end - left.start)
    || left.detectorIndex - right.detectorIndex
  );

  const accepted: CandidateMatch[] = [];

  for (const candidate of candidates) {
    const overlapsAccepted = accepted.some((match) =>
      candidate.start < match.end && match.start < candidate.end
    );

    if (!overlapsAccepted) {
      accepted.push(candidate);
    }
  }

  accepted.sort((left, right) => left.start - right.start);

  const matchesByType = new Map<FindingType, Match[]>();
  for (const match of accepted) {
    const matches = matchesByType.get(match.detector.type) ?? [];
    matches.push(match);
    matchesByType.set(match.detector.type, matches);
  }

  return matchesByType;
}

export function scanText(input: string): ScanResult {
  const findings: Finding[] = [];
  const matchesByType = resolveOverlaps(input);

  for (const detector of detectors) {
    const matches = matchesByType.get(detector.type) ?? [];

    if (matches.length > 0) {
      findings.push({
        type: detector.type,
        risk: detector.risk,
        count: matches.length,
        maskedExample: detector.mask(matches[0].value),
      });
    }
  }

  const classification = findings.reduce<Risk>(
    (highest, finding) => riskRank[finding.risk] > riskRank[highest] ? finding.risk : highest,
    "None",
  );

  return {
    classification,
    totalCount: findings.reduce((total, finding) => total + finding.count, 0),
    findings,
  };
}
