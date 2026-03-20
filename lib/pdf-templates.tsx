/**
 * Server-side PDF templates via @react-pdf/renderer.
 * Четыре шаблона: Классика, Минимализм (free — с водяным знаком),
 * Современный и ВИП (paid — без водяного знака).
 */
import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import type { ParsedKp } from "./parseKpResponse";

// ── Шрифт с поддержкой кириллицы (jsDelivr CDN, кэшируется react-pdf) ────────
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/npm/roboto-fontface@0.10.0/fonts/roboto/Roboto-Regular.woff",
    },
    {
      src: "https://cdn.jsdelivr.net/npm/roboto-fontface@0.10.0/fonts/roboto/Roboto-Bold.woff",
      fontWeight: 700,
    },
  ],
});

// Убираем переносы внутри слов (react-pdf иногда разрывает кириллицу)
Font.registerHyphenationCallback((word) => [word]);

// ── Цвета ─────────────────────────────────────────────────────────────────────
const C = {
  primary:    "#1e3a5f",
  accent:     "#f59e0b",
  text:       "#1e293b",
  textGray:   "#6b7280",
  textMuted:  "#9ca3af",
  border:     "#e2e8f0",
  bg:         "#f8fafc",
  white:      "#ffffff",
  blue300:    "#93c5fd",
  blue2:      "#2d6a9f",
  gold:       "#C8A84B",
  dark:       "#162038",
  darkLight:  "#1e3054",
  cardBg:     "#F9F6EE",
  cardBorder: "#EDE8DC",
  red:        "#ef4444",
};

const WATERMARK = "Создано с помощью КП за 30 сек · kp-za-30.vercel.app";

export type Template = "classic" | "modern" | "minimal" | "vip";

export interface KpDocumentProps {
  kp: ParsedKp;
  logo: string | null;
  template: Template;
}

interface TP { kp: ParsedKp; logo: string | null }

export function KpDocument({ kp, logo, template }: KpDocumentProps) {
  return (
    <Document>
      {template === "classic" && <ClassicPage kp={kp} logo={logo} />}
      {template === "modern"  && <ModernPage  kp={kp} logo={logo} />}
      {template === "minimal" && <MinimalPage kp={kp} logo={logo} />}
      {template === "vip"     && <VipPage     kp={kp} logo={logo} />}
    </Document>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ШАБЛОН 1: КЛАССИКА  (free — водяной знак)
// ═══════════════════════════════════════════════════════════════════════════════
const cs = StyleSheet.create({
  page:         { fontFamily: "Roboto", fontSize: 10, color: C.text, backgroundColor: C.white },
  header:       { backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 22, flexDirection: "row", alignItems: "center" },
  logoBox:      { backgroundColor: C.white, borderRadius: 6, padding: 4, marginRight: 14, flexShrink: 0 },
  logoImg:      { height: 36, maxWidth: 90 },
  hText:        { flex: 1 },
  hLabel:       { color: C.blue300, fontSize: 7, letterSpacing: 1.5, marginBottom: 4 },
  hTitle:       { color: C.white, fontSize: 17, fontWeight: 700, lineHeight: 1.3 },
  body:         { paddingHorizontal: 28, paddingVertical: 22 },
  greeting:     { fontSize: 10, lineHeight: 1.6, marginBottom: 14 },
  sectionWrap:  { marginBottom: 14 },
  sRowTitle:    { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  sStripe:      { width: 3, height: 14, backgroundColor: C.accent, marginRight: 6, borderRadius: 1 },
  sTitle:       { fontSize: 8, fontWeight: 700, color: C.primary, letterSpacing: 0.8 },
  sText:        { fontSize: 10, lineHeight: 1.6, color: C.text },
  benefitRow:   { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  bDot:         { width: 17, height: 17, borderRadius: 9, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", marginRight: 8, flexShrink: 0, marginTop: 1 },
  bDotNum:      { color: C.white, fontSize: 8, fontWeight: 700 },
  bText:        { flex: 1, fontSize: 10, lineHeight: 1.5 },
  priceRow:     { flexDirection: "row", marginBottom: 14, gap: 10 },
  priceCard:    { flex: 1, borderWidth: 2, borderColor: C.primary, borderRadius: 8, padding: 12 },
  pLabel:       { fontSize: 7, color: C.textMuted, marginBottom: 3, letterSpacing: 0.5 },
  pValue:       { fontSize: 14, fontWeight: 700, color: C.primary },
  ctaBox:       { backgroundColor: C.primary, borderRadius: 8, padding: 16, marginBottom: 14, alignItems: "center" },
  ctaText:      { color: C.white, fontSize: 11, fontWeight: 700, textAlign: "center", lineHeight: 1.4 },
  divider:      { borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 10 },
  sig:          { fontSize: 9, color: C.textGray, lineHeight: 1.5 },
  wm:           { marginTop: 14, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, alignItems: "center" },
  wmText:       { fontSize: 7, color: C.textMuted },
});

function ClassicPage({ kp, logo }: TP) {
  return (
    <Page size="A4" style={cs.page}>
      <View style={cs.header}>
        {logo && <View style={cs.logoBox}><Image src={logo} style={cs.logoImg} /></View>}
        <View style={cs.hText}>
          <Text style={cs.hLabel}>КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ</Text>
          <Text style={cs.hTitle}>{kp.title}</Text>
        </View>
      </View>

      <View style={cs.body}>
        <Text style={cs.greeting}>{kp.greeting}</Text>

        <View style={cs.sectionWrap} wrap={false}>
          <View style={cs.sRowTitle}><View style={cs.sStripe} /><Text style={cs.sTitle}>О НАС</Text></View>
          <Text style={cs.sText}>{kp.about}</Text>
        </View>

        <View style={cs.sectionWrap} wrap={false}>
          <View style={cs.sRowTitle}><View style={cs.sStripe} /><Text style={cs.sTitle}>НАШЕ ПРЕДЛОЖЕНИЕ</Text></View>
          <Text style={cs.sText}>{kp.offer}</Text>
        </View>

        <View style={cs.sectionWrap}>
          <View style={cs.sRowTitle}><View style={cs.sStripe} /><Text style={cs.sTitle}>ПОЧЕМУ МЫ?</Text></View>
          {kp.benefits.map((item, i) => (
            <View key={i} style={cs.benefitRow} wrap={false}>
              <View style={cs.bDot}><Text style={cs.bDotNum}>{i + 1}</Text></View>
              <Text style={cs.bText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={cs.priceRow} wrap={false}>
          <View style={cs.priceCard}>
            <Text style={cs.pLabel}>СТОИМОСТЬ</Text>
            <Text style={cs.pValue}>{kp.price}</Text>
          </View>
          <View style={cs.priceCard}>
            <Text style={cs.pLabel}>СРОК ВЫПОЛНЕНИЯ</Text>
            <Text style={cs.pValue}>{kp.deadline}</Text>
          </View>
        </View>

        <View style={cs.ctaBox} wrap={false}>
          <Text style={cs.ctaText}>{kp.cta}</Text>
        </View>

        <View style={cs.divider} />
        <Text style={cs.sig}>{kp.signature}</Text>

        <View style={cs.wm}>
          <Text style={cs.wmText}>{WATERMARK}</Text>
        </View>
      </View>
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ШАБЛОН 2: СОВРЕМЕННЫЙ  (paid)
// ═══════════════════════════════════════════════════════════════════════════════
const ms = StyleSheet.create({
  page:       { fontFamily: "Roboto", fontSize: 10, color: C.text, backgroundColor: C.white },
  header:     { backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 26, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  hLeft:      { flex: 1 },
  hAccent:    { color: C.accent, fontSize: 7, fontWeight: 700, letterSpacing: 1.5, marginBottom: 8 },
  hTitle:     { color: C.white, fontSize: 20, fontWeight: 700, lineHeight: 1.3 },
  hLogoBox:   { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, padding: 8, marginLeft: 14, flexShrink: 0 },
  hLogo:      { height: 40, maxWidth: 100 },
  stripe:     { height: 4, backgroundColor: C.accent },
  body:       { paddingHorizontal: 28, paddingVertical: 22 },
  greetBox:   { backgroundColor: C.bg, borderLeftWidth: 4, borderLeftColor: C.blue2, borderRadius: 8, padding: 14, marginBottom: 18 },
  greetText:  { fontSize: 10, lineHeight: 1.6 },
  secWrap:    { marginBottom: 16 },
  secHead:    { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  secBar:     { width: 3, height: 18, backgroundColor: C.accent, marginRight: 8, borderRadius: 1 },
  secTitle:   { fontSize: 10, fontWeight: 700 },
  secText:    { fontSize: 10, lineHeight: 1.6, color: "#374151", paddingLeft: 11 },
  divider:    { borderBottomWidth: 1, borderBottomColor: C.border, marginVertical: 10 },
  cardGrid:   { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingLeft: 11, marginTop: 4 },
  benefCard:  { width: "48%", flexDirection: "row", alignItems: "flex-start", backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 10 },
  bCardNum:   { width: 22, height: 22, borderRadius: 11, backgroundColor: C.blue2, alignItems: "center", justifyContent: "center", marginRight: 8, flexShrink: 0 },
  bCardNT:    { color: C.white, fontSize: 8, fontWeight: 700 },
  bCardText:  { flex: 1, fontSize: 9, lineHeight: 1.5, color: "#374151" },
  priceRow:   { flexDirection: "row", gap: 12, marginBottom: 16 },
  priceBlue:  { flex: 1, backgroundColor: C.primary, borderRadius: 10, padding: 16 },
  priceAmb:   { flex: 1, backgroundColor: C.accent, borderRadius: 10, padding: 16 },
  pLblW:      { color: "rgba(255,255,255,0.7)", fontSize: 7, letterSpacing: 1, marginBottom: 4 },
  pValW:      { color: C.white, fontSize: 18, fontWeight: 700 },
  ctaBox:     { backgroundColor: C.primary, borderRadius: 10, padding: 20, marginBottom: 16, alignItems: "center" },
  ctaText:    { color: C.white, fontSize: 11, fontWeight: 700, textAlign: "center", lineHeight: 1.4 },
  sig:        { fontSize: 9, color: C.textGray, lineHeight: 1.5 },
});

function ModernPage({ kp, logo }: TP) {
  return (
    <Page size="A4" style={ms.page}>
      <View style={ms.header}>
        <View style={ms.hLeft}>
          <Text style={ms.hAccent}>КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ</Text>
          <Text style={ms.hTitle}>{kp.title}</Text>
        </View>
        {logo && <View style={ms.hLogoBox}><Image src={logo} style={ms.hLogo} /></View>}
      </View>
      <View style={ms.stripe} />

      <View style={ms.body}>
        <View style={ms.greetBox} wrap={false}>
          <Text style={ms.greetText}>{kp.greeting}</Text>
        </View>

        <View style={ms.secWrap} wrap={false}>
          <View style={ms.secHead}><View style={ms.secBar} /><Text style={ms.secTitle}>О нас</Text></View>
          <Text style={ms.secText}>{kp.about}</Text>
        </View>

        <View style={ms.divider} />

        <View style={ms.secWrap} wrap={false}>
          <View style={ms.secHead}><View style={ms.secBar} /><Text style={ms.secTitle}>Наше предложение</Text></View>
          <Text style={ms.secText}>{kp.offer}</Text>
        </View>

        <View style={ms.divider} />

        <View style={ms.secWrap}>
          <View style={ms.secHead}><View style={ms.secBar} /><Text style={ms.secTitle}>Почему мы?</Text></View>
          <View style={ms.cardGrid}>
            {kp.benefits.map((item, i) => (
              <View key={i} style={ms.benefCard} wrap={false}>
                <View style={ms.bCardNum}><Text style={ms.bCardNT}>{i + 1}</Text></View>
                <Text style={ms.bCardText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={ms.divider} />

        <View style={ms.priceRow} wrap={false}>
          <View style={ms.priceBlue}>
            <Text style={ms.pLblW}>СТОИМОСТЬ</Text>
            <Text style={ms.pValW}>{kp.price}</Text>
          </View>
          <View style={ms.priceAmb}>
            <Text style={ms.pLblW}>СРОК ВЫПОЛНЕНИЯ</Text>
            <Text style={ms.pValW}>{kp.deadline}</Text>
          </View>
        </View>

        <View style={ms.ctaBox} wrap={false}>
          <Text style={ms.ctaText}>{kp.cta}</Text>
        </View>

        <Text style={ms.sig}>{kp.signature}</Text>
      </View>
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ШАБЛОН 3: МИНИМАЛИЗМ  (free — водяной знак)
// ═══════════════════════════════════════════════════════════════════════════════
const mns = StyleSheet.create({
  page:       { fontFamily: "Roboto", fontSize: 10, color: C.text, backgroundColor: C.white },
  body:       { paddingHorizontal: 36, paddingVertical: 32 },
  topRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: "#e5e7eb", paddingBottom: 18, marginBottom: 20 },
  topLeft:    { flex: 1 },
  tLabel:     { color: "#9ca3af", fontSize: 7, letterSpacing: 2, marginBottom: 8 },
  tTitle:     { fontSize: 22, fontWeight: 700, lineHeight: 1.3, color: "#111827" },
  tLogo:      { height: 36, maxWidth: 110, marginLeft: 16 },
  greeting:   { fontSize: 10, lineHeight: 1.6, color: "#4b5563", marginBottom: 18 },
  secWrap:    { marginBottom: 18 },
  secLabel:   { fontSize: 7, fontWeight: 700, color: "#9ca3af", letterSpacing: 1.5, marginBottom: 6 },
  secText:    { fontSize: 10, lineHeight: 1.6, color: "#1f2937" },
  benefitRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  bDash:      { fontSize: 12, fontWeight: 700, color: "#d1d5db", marginRight: 8, marginTop: -1 },
  bText:      { flex: 1, fontSize: 10, lineHeight: 1.5, color: "#1f2937" },
  priceRow:   { flexDirection: "row", gap: 20, marginBottom: 18 },
  priceBlock: { flex: 1 },
  pLabel:     { fontSize: 7, color: "#9ca3af", letterSpacing: 1.5, marginBottom: 4 },
  pValue:     { fontSize: 20, fontWeight: 700, color: "#111827" },
  ctaBox:     { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 18, marginBottom: 18, alignItems: "center" },
  ctaText:    { fontSize: 11, fontWeight: 700, color: "#374151", textAlign: "center", lineHeight: 1.4 },
  divider:    { borderBottomWidth: 1, borderBottomColor: "#f3f4f6", marginBottom: 14 },
  sig:        { fontSize: 9, color: "#9ca3af", lineHeight: 1.5 },
  wm:         { marginTop: 16, borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 8, alignItems: "center" },
  wmText:     { fontSize: 7, color: "#d1d5db" },
});

function MinimalPage({ kp, logo }: TP) {
  return (
    <Page size="A4" style={mns.page}>
      <View style={mns.body}>
        {/* Header */}
        <View style={mns.topRow} wrap={false}>
          <View style={mns.topLeft}>
            <Text style={mns.tLabel}>КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ</Text>
            <Text style={mns.tTitle}>{kp.title}</Text>
          </View>
          {logo && <Image src={logo} style={mns.tLogo} />}
        </View>

        <Text style={mns.greeting}>{kp.greeting}</Text>

        <View style={mns.secWrap} wrap={false}>
          <Text style={mns.secLabel}>О НАС</Text>
          <Text style={mns.secText}>{kp.about}</Text>
        </View>

        <View style={mns.secWrap} wrap={false}>
          <Text style={mns.secLabel}>ПРЕДЛОЖЕНИЕ</Text>
          <Text style={mns.secText}>{kp.offer}</Text>
        </View>

        <View style={mns.secWrap}>
          <Text style={mns.secLabel}>НАШИ ПРЕИМУЩЕСТВА</Text>
          {kp.benefits.map((item, i) => (
            <View key={i} style={mns.benefitRow} wrap={false}>
              <Text style={mns.bDash}>—</Text>
              <Text style={mns.bText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={mns.priceRow} wrap={false}>
          <View style={mns.priceBlock}>
            <Text style={mns.pLabel}>СТОИМОСТЬ</Text>
            <Text style={mns.pValue}>{kp.price}</Text>
          </View>
          <View style={mns.priceBlock}>
            <Text style={mns.pLabel}>СРОК</Text>
            <Text style={mns.pValue}>{kp.deadline}</Text>
          </View>
        </View>

        <View style={mns.ctaBox} wrap={false}>
          <Text style={mns.ctaText}>{kp.cta}</Text>
        </View>

        <View style={mns.divider} />
        <Text style={mns.sig}>{kp.signature}</Text>

        <View style={mns.wm}>
          <Text style={mns.wmText}>{WATERMARK}</Text>
        </View>
      </View>
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ШАБЛОН 4: ВИП  (paid)
// Цвета: тёмный #162038, золотой #C8A84B, фон карточек #F9F6EE
// ═══════════════════════════════════════════════════════════════════════════════
const vs = StyleSheet.create({
  page:         { fontFamily: "Roboto", fontSize: 10, color: C.text, backgroundColor: C.white },
  header:       { backgroundColor: C.dark, paddingHorizontal: 28, paddingVertical: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hLeft:        { flexDirection: "row", alignItems: "center" },
  hLogoBox:     { backgroundColor: C.white, borderRadius: 5, padding: 4, marginRight: 12, flexShrink: 0 },
  hLogoImg:     { height: 30, maxWidth: 80 },
  hInfo:        {},
  hBadge:       { color: C.white, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 },
  hSub:         { color: C.gold, fontSize: 7, fontWeight: 700, marginTop: 2 },
  hRight:       { alignItems: "flex-end" },
  hDate:        { color: C.gold, fontSize: 10, fontWeight: 700 },
  hConf:        { color: "#6b7280", fontSize: 7, marginTop: 2 },
  hLine:        { borderBottomWidth: 1, borderBottomColor: "rgba(200,168,75,0.4)", marginTop: 12 },
  goldStripe:   { height: 3, backgroundColor: C.gold },
  body:         { paddingHorizontal: 28, paddingVertical: 22 },
  titleBlock:   { marginBottom: 16 },
  kpBadge:      { fontSize: 7, fontWeight: 700, color: C.gold, letterSpacing: 2, marginBottom: 8 },
  kpTitle:      { fontSize: 22, fontWeight: 700, color: C.dark, lineHeight: 1.3, marginBottom: 8 },
  kpGreet:      { fontSize: 9, color: "#6b7280", lineHeight: 1.5 },
  divider:      { borderBottomWidth: 1, borderBottomColor: "#f1f0ec", marginVertical: 14 },
  secWrap:      { marginBottom: 14 },
  secHead:      { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  goldSquare:   { width: 8, height: 8, backgroundColor: C.gold, marginRight: 8, flexShrink: 0 },
  secTitle:     { fontSize: 9, fontWeight: 700, color: C.dark, letterSpacing: 0.8 },
  secText:      { fontSize: 9.5, color: "#374151", lineHeight: 1.6 },
  cardGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bCard:        { width: "48%", flexDirection: "row", backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 8, padding: 10 },
  bCardNumBox:  { width: 24, height: 24, borderRadius: 12, backgroundColor: C.gold, alignItems: "center", justifyContent: "center", marginRight: 8, flexShrink: 0 },
  bCardNum:     { color: C.white, fontSize: 8, fontWeight: 700 },
  bCardBody:    {},
  bCardTitle:   { fontSize: 9, fontWeight: 700, color: C.dark, marginBottom: 2 },
  bCardDesc:    { fontSize: 8, color: "#6b7280", lineHeight: 1.4 },
  // Таблица цен
  tableWrap:    { borderWidth: 1, borderColor: C.cardBorder, borderRadius: 8, overflow: "hidden", marginBottom: 4 },
  tableHead:    { flexDirection: "row", backgroundColor: C.dark, paddingHorizontal: 10, paddingVertical: 8 },
  thN:          { width: 22, color: C.white, fontSize: 8, fontWeight: 700 },
  thName:       { flex: 2, color: C.white, fontSize: 8, fontWeight: 700 },
  thDesc:       { flex: 3, color: "#6b7280", fontSize: 8 },
  thPrice:      { flex: 1, color: C.white, fontSize: 8, fontWeight: 700, textAlign: "right" },
  tableRow:     { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 8 },
  trN:          { width: 22, fontSize: 8, fontWeight: 700, color: C.gold },
  trName:       { flex: 2, fontSize: 9, fontWeight: 700, color: C.dark },
  trDesc:       { flex: 3, fontSize: 8, color: "#6b7280" },
  trPrice:      { flex: 1, fontSize: 9, fontWeight: 700, color: C.dark, textAlign: "right" },
  tableFoot:    { flexDirection: "row", backgroundColor: C.dark, paddingHorizontal: 10, paddingVertical: 10 },
  tfLabel:      { flex: 3, color: C.white, fontSize: 9, fontWeight: 700 },
  tfValue:      { flex: 1, color: C.gold, fontSize: 13, fontWeight: 700, textAlign: "right" },
  // Простой блок цен (без таблицы)
  priceSimple:  { flexDirection: "row", gap: 12, marginBottom: 4 },
  psBlue:       { flex: 1, backgroundColor: C.dark, borderRadius: 10, padding: 14 },
  psBorder:     { flex: 1, borderWidth: 2, borderColor: C.dark, borderRadius: 10, padding: 14 },
  psLblW:       { color: C.gold, fontSize: 7, fontWeight: 700, letterSpacing: 1, marginBottom: 4 },
  psValW:       { color: C.white, fontSize: 16, fontWeight: 700 },
  psLblD:       { color: C.dark, fontSize: 7, fontWeight: 700, letterSpacing: 1, marginBottom: 4 },
  psValD:       { color: C.dark, fontSize: 16, fontWeight: 700 },
  // Этапы
  tlRow:        { flexDirection: "row", marginBottom: 12 },
  tlNumBox:     { width: 26, height: 26, borderRadius: 13, backgroundColor: C.gold, alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0 },
  tlNum:        { color: C.white, fontSize: 9, fontWeight: 700 },
  tlBody:       { flex: 1 },
  tlTitle:      { fontSize: 9, fontWeight: 700, color: C.dark, marginBottom: 2 },
  tlDur:        { fontSize: 8, fontWeight: 700, color: C.gold, marginBottom: 3 },
  tlDesc:       { fontSize: 9, color: "#4b5563", lineHeight: 1.5 },
  // Условия
  condRow:      { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  condBullet:   { fontSize: 8, fontWeight: 700, color: C.gold, marginRight: 8, marginTop: 1, flexShrink: 0 },
  condText:     { flex: 1, fontSize: 9, color: "#374151", lineHeight: 1.5 },
  // CTA
  ctaBox:       { backgroundColor: C.dark, borderRadius: 12, padding: 24, alignItems: "center", marginBottom: 16 },
  ctaHead:      { color: C.white, fontSize: 14, fontWeight: 700, marginBottom: 6, textAlign: "center" },
  ctaGold:      { color: C.gold, fontSize: 10, textAlign: "center", lineHeight: 1.5, marginBottom: 10 },
  ctaLine:      { borderBottomWidth: 1, borderBottomColor: "rgba(200,168,75,0.3)", width: "100%", marginBottom: 10 },
  ctaSig:       { color: "#9ca3af", fontSize: 8, textAlign: "center" },
  // Footer
  footer:       { borderTopWidth: 1, borderTopColor: C.cardBorder, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 28, paddingVertical: 10 },
  footerL:      { fontSize: 8, color: "#9ca3af" },
  footerR:      { fontSize: 8, color: "#d1d5db" },
});

function VipPage({ kp, logo }: TP) {
  const today = new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hasPriceTable = kp.priceItems && kp.priceItems.length > 0;
  const hasTimeline = kp.timeline && kp.timeline.length > 0;
  const hasConditions = kp.conditions && kp.conditions.length > 0;
  const benefitSource = kp.benefitCards ?? kp.benefits.map((b) => ({ title: b, desc: "" }));

  return (
    <Page size="A4" style={vs.page}>
      {/* Header */}
      <View style={vs.header}>
        <View style={vs.hLeft}>
          {logo && <View style={vs.hLogoBox}><Image src={logo} style={vs.hLogoImg} /></View>}
          <View style={vs.hInfo}>
            <Text style={vs.hBadge}>Коммерческое предложение</Text>
            <Text style={vs.hSub}>Профессиональное предложение</Text>
          </View>
        </View>
        <View style={vs.hRight}>
          <Text style={vs.hDate}>{today}</Text>
          <Text style={vs.hConf}>Конфиденциально</Text>
        </View>
      </View>
      <View style={vs.goldStripe} />

      {/* Body */}
      <View style={vs.body}>

        {/* Заголовок + приветствие */}
        <View style={vs.titleBlock} wrap={false}>
          <Text style={vs.kpBadge}>КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ</Text>
          <Text style={vs.kpTitle}>{kp.title}</Text>
          <Text style={vs.kpGreet}>{kp.greeting}</Text>
        </View>

        <View style={vs.divider} />

        {/* О компании */}
        <View style={vs.secWrap} wrap={false}>
          <View style={vs.secHead}><View style={vs.goldSquare} /><Text style={vs.secTitle}>О КОМПАНИИ</Text></View>
          <Text style={vs.secText}>{kp.about}</Text>
        </View>

        {/* Предложение */}
        <View style={vs.secWrap} wrap={false}>
          <View style={vs.secHead}><View style={vs.goldSquare} /><Text style={vs.secTitle}>НАШЕ ПРЕДЛОЖЕНИЕ</Text></View>
          <Text style={vs.secText}>{kp.offer}</Text>
        </View>

        <View style={vs.divider} />

        {/* Преимущества */}
        <View style={vs.secWrap}>
          <View style={vs.secHead}><View style={vs.goldSquare} /><Text style={vs.secTitle}>ПОЧЕМУ ВЫБИРАЮТ НАС</Text></View>
          <View style={vs.cardGrid}>
            {benefitSource.map((b, i) => (
              <View key={i} style={vs.bCard} wrap={false}>
                <View style={vs.bCardNumBox}><Text style={vs.bCardNum}>{String(i + 1).padStart(2, "0")}</Text></View>
                <View style={vs.bCardBody}>
                  <Text style={vs.bCardTitle}>{"title" in b ? b.title : b}</Text>
                  {"desc" in b && b.desc ? <Text style={vs.bCardDesc}>{b.desc}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={vs.divider} />

        {/* Стоимость */}
        <View style={vs.secWrap}>
          <View style={vs.secHead}><View style={vs.goldSquare} /><Text style={vs.secTitle}>СОСТАВ РАБОТ И СТОИМОСТЬ</Text></View>

          {hasPriceTable ? (
            <View style={vs.tableWrap} wrap={false}>
              <View style={vs.tableHead}>
                <Text style={vs.thN}>№</Text>
                <Text style={vs.thName}>Услуга</Text>
                <Text style={vs.thDesc}>Описание</Text>
                <Text style={vs.thPrice}>Стоимость</Text>
              </View>
              {kp.priceItems!.map((item, i) => (
                <View key={i} style={[vs.tableRow, { backgroundColor: i % 2 === 0 ? C.white : C.cardBg }]} wrap={false}>
                  <Text style={vs.trN}>{String(i + 1).padStart(2, "0")}</Text>
                  <Text style={vs.trName}>{item.name}</Text>
                  <Text style={vs.trDesc}>{item.desc}</Text>
                  <Text style={vs.trPrice}>{item.price}</Text>
                </View>
              ))}
              <View style={vs.tableFoot} wrap={false}>
                <Text style={vs.tfLabel}>Итого по проекту</Text>
                <Text style={vs.tfValue}>{kp.priceTotal ?? kp.price}</Text>
              </View>
            </View>
          ) : (
            <View style={vs.priceSimple} wrap={false}>
              <View style={vs.psBlue}>
                <Text style={vs.psLblW}>СТОИМОСТЬ</Text>
                <Text style={vs.psValW}>{kp.price}</Text>
              </View>
              <View style={vs.psBorder}>
                <Text style={vs.psLblD}>СРОК</Text>
                <Text style={vs.psValD}>{kp.deadline}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Этапы работы */}
        {hasTimeline && (
          <>
            <View style={vs.divider} />
            <View style={vs.secWrap}>
              <View style={vs.secHead}><View style={vs.goldSquare} /><Text style={vs.secTitle}>ЭТАПЫ РАБОТЫ</Text></View>
              {kp.timeline!.map((step, i) => (
                <View key={i} style={vs.tlRow} wrap={false}>
                  <View style={vs.tlNumBox}><Text style={vs.tlNum}>{i + 1}</Text></View>
                  <View style={vs.tlBody}>
                    <Text style={vs.tlTitle}>{step.title}</Text>
                    {step.duration ? <Text style={vs.tlDur}>{step.duration}</Text> : null}
                    <Text style={vs.tlDesc}>{step.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Условия сотрудничества */}
        {hasConditions && (
          <>
            <View style={vs.divider} />
            <View style={vs.secWrap}>
              <View style={vs.secHead}><View style={vs.goldSquare} /><Text style={vs.secTitle}>УСЛОВИЯ СОТРУДНИЧЕСТВА</Text></View>
              {kp.conditions!.map((c, i) => (
                <View key={i} style={vs.condRow} wrap={false}>
                  <Text style={vs.condBullet}>■</Text>
                  <Text style={vs.condText}>{c}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* CTA */}
        <View style={vs.ctaBox} wrap={false}>
          <Text style={vs.ctaHead}>Готовы начать работу?</Text>
          <Text style={vs.ctaGold}>{kp.cta}</Text>
          <View style={vs.ctaLine} />
          <Text style={vs.ctaSig}>{kp.signature}</Text>
        </View>

      </View>

      {/* Footer */}
      <View style={vs.footer} fixed>
        <Text style={vs.footerL}>{kp.signature}</Text>
        <Text style={vs.footerR}>КП за 30 секунд</Text>
      </View>
    </Page>
  );
}
