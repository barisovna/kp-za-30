// Парсинг XML-ответа от DeepSeek

export interface BenefitCard {
  title: string;
  desc: string;
}

export interface PriceItem {
  name: string;
  desc: string;
  price: string;
}

export interface TimelineStep {
  title: string;
  duration: string;
  desc: string;
}

export interface ParsedKp {
  // Базовые поля (все шаблоны)
  title: string;
  greeting: string;
  about: string;
  offer: string;
  benefits: string[];
  price: string;
  deadline: string;
  cta: string;
  signature: string;

  // Расширенные поля (ВИП шаблон)
  benefitCards?: BenefitCard[];
  priceItems?: PriceItem[];
  priceTotal?: string;
  timeline?: TimelineStep[];
  conditions?: string[];
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].trim() : "";
}

/** Tries <primary> first, falls back to <fallback> */
function extractTagFallback(xml: string, primary: string, fallback: string): string {
  return extractTag(xml, primary) || extractTag(xml, fallback);
}

function extractItems(xml: string): string[] {
  const matches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  return matches.map((m) => m.replace(/<\/?item>/g, "").trim()).filter(Boolean);
}

function extractBenefitCards(xml: string): BenefitCard[] {
  const section = extractTag(xml, "benefitCards");
  if (!section) return [];
  const cards = section.match(/<card>([\s\S]*?)<\/card>/g) || [];
  return cards.map((card) => ({
    title: extractTag(card, "title"),
    desc: extractTagFallback(card, "desc", "description"),
  })).filter((c) => c.title);
}

function extractPriceItems(xml: string): PriceItem[] {
  const section = extractTag(xml, "priceItems");
  if (!section) return [];
  const items = section.match(/<item>([\s\S]*?)<\/item>/g) || [];
  return items.map((item) => ({
    name: extractTag(item, "name"),
    desc: extractTagFallback(item, "desc", "description"),
    price: extractTag(item, "price"),
  })).filter((i) => i.name);
}

function extractTimeline(xml: string): TimelineStep[] {
  const section = extractTag(xml, "timeline");
  if (!section) return [];
  // Try structured <step> tags first
  const steps = section.match(/<step>([\s\S]*?)<\/step>/g) || [];
  if (steps.length > 0) {
    return steps.map((step) => ({
      title: extractTag(step, "title"),
      duration: extractTag(step, "duration"),
      desc: extractTagFallback(step, "desc", "description"),
    })).filter((s) => s.title);
  }
  // Fallback: flat text — split by numbered items or sentences
  const text = section.trim();
  if (!text) return [];
  // Try to split by "1.", "2.", etc.
  const numbered = text.split(/\d+\.\s+/).filter(Boolean);
  if (numbered.length > 1) {
    return numbered.map((s, i) => ({
      title: `Этап ${i + 1}`,
      duration: "",
      desc: s.trim(),
    }));
  }
  // Last resort: single step with all text
  return [{ title: "Сроки выполнения", duration: "", desc: text }];
}

export function parseKpResponse(xml: string): ParsedKp {
  const kpContent = extractTag(xml, "kp");
  if (!kpContent) {
    throw new Error("Не удалось распарсить ответ: тег <kp> не найден");
  }

  const benefitsSection = extractTag(kpContent, "benefits");
  const benefits = benefitsSection ? extractItems(benefitsSection) : [];

  const conditionsSection = extractTag(kpContent, "conditions");
  const conditions = conditionsSection ? extractItems(conditionsSection) : undefined;

  const benefitCards = extractBenefitCards(kpContent);
  const priceItems = extractPriceItems(kpContent);
  const timeline = extractTimeline(kpContent);
  const priceTotal = extractTag(kpContent, "priceTotal") || undefined;

  return {
    title: extractTag(kpContent, "title"),
    greeting: extractTag(kpContent, "greeting"),
    about: extractTag(kpContent, "about"),
    offer: extractTag(kpContent, "offer"),
    benefits,
    price: extractTag(kpContent, "price"),
    deadline: extractTag(kpContent, "deadline"),
    cta: extractTag(kpContent, "cta"),
    signature: extractTag(kpContent, "signature"),
    benefitCards: benefitCards.length > 0 ? benefitCards : undefined,
    priceItems: priceItems.length > 0 ? priceItems : undefined,
    priceTotal,
    timeline: timeline.length > 0 ? timeline : undefined,
    conditions: conditions && conditions.length > 0 ? conditions : undefined,
  };
}
