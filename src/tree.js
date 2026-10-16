// Pure layout logic: turns a person in a GEDCOM file into positioned cards and lines.

export const CARD_W = 130
export const CARD_H = 86
export const CARD_GAP = 8
export const UNIT_W = CARD_W * 2 + CARD_GAP
export const BLOCK_GAP = 24
export const V_GAP = 64
export const ROW = CARD_H + V_GAP
export const MAX_LEVELS = 3 // generations of ancestors shown above the starting person

function first(selection) {
  return selection.arraySelect()[0] || null
}

// Pull a 3-4 digit year out of a GEDCOM date such as "28 Feb 1945" or "ABT 1850".
function yearFrom(text) {
  if (!text) return null
  const match = text.match(/\b(\d{3,4})\b/)
  if (!match) return null
  const approx = /^(abt|about|est|cal|bef|aft|bet|c\.?)/i.test(text.trim())
  return (approx ? 'c. ' : '') + match[1]
}

// Builds text like "1945–2013", "1978–present", "1850–", or "".
export function lifeSpan(record, thisYear = new Date().getFullYear()) {
  const birthText = record.getEventBirth().getDate().value()[0] || null
  const deathText = record.getEventDeath().getDate().value()[0] || null
  const hasDeathEvent = record.getEventDeath().length > 0
  const birth = yearFrom(birthText)
  const death = yearFrom(deathText)

  if (!birth && !death) return hasDeathEvent ? '–?' : ''
  if (death) return `${birth || ''}–${death}`
  if (hasDeathEvent) return `${birth || ''}–?`
  const birthNum = parseInt((birth || '').replace(/\D/g, ''), 10)
  if (birthNum && thisYear - birthNum <= 100) return `${birth}–present`
  return `${birth || ''}–`
}

export function toPerson(record) {
  if (!record) return null
  const parts = record.getName().valueAsParts()[0] || []
  return {
    id: record.pointer()[0],
    given: parts[0] || '',
    surname: parts[1] || '',
    sex: record.getSex().value()[0] || '',
    years: lifeSpan(record),
  }
}

// A "unit" is one couple (a person's father and mother) plus the units above them.
function buildUnit(record, level) {
  if (level > MAX_LEVELS) return null
  const family = first(record.getFamilyAsChild())
  if (!family) return null
  const fatherRec = first(family.getHusband().getIndividualRecord())
  const motherRec = first(family.getWife().getIndividualRecord())
  if (!fatherRec && !motherRec) return null
  return {
    level,
    father: toPerson(fatherRec),
    mother: toPerson(motherRec),
    fatherUnit: fatherRec ? buildUnit(fatherRec, level + 1) : null,
    motherUnit: motherRec ? buildUnit(motherRec, level + 1) : null,
  }
}

function kidsOf(unit) {
  return [unit.fatherUnit, unit.motherUnit].filter(Boolean)
}

function measure(unit) {
  const kids = kidsOf(unit)
  kids.forEach(measure)
  unit.kidsW =
    kids.reduce((sum, k) => sum + k.blockW, 0) +
    BLOCK_GAP * Math.max(0, kids.length - 1)
  unit.blockW = Math.max(UNIT_W, unit.kidsW)
}

function place(unit, left) {
  const kids = kidsOf(unit)
  let x = left + (unit.blockW - unit.kidsW) / 2
  kids.forEach((k) => {
    place(k, x)
    x += k.blockW + BLOCK_GAP
  })
  unit.cx = kids.length
    ? (kids[0].cx + kids[kids.length - 1].cx) / 2
    : left + unit.blockW / 2
}

function deepest(unit) {
  return Math.max(unit.level, ...kidsOf(unit).map(deepest))
}

export function buildTree(startRecord) {
  const person = toPerson(startRecord)
  const top = buildUnit(startRecord, 1)
  if (!top) {
    return {
      width: CARD_W,
      height: CARD_H,
      cards: [{ person, x: 0, y: 0 }],
      lines: [],
    }
  }

  measure(top)
  place(top, 0)
  const maxLevel = deepest(top)
  const rootY = maxLevel * ROW
  const cards = []
  const lines = []

  function walk(unit, targetX, targetY) {
    const y = (maxLevel - unit.level) * ROW
    const left = unit.cx - UNIT_W / 2
    const fatherX = left + CARD_W / 2
    const motherX = left + CARD_W + CARD_GAP + CARD_W / 2
    cards.push({ person: unit.father, x: left, y })
    cards.push({ person: unit.mother, x: left + CARD_W + CARD_GAP, y })

    const bottom = y + CARD_H
    const bracketY = bottom + 14
    const turnY = bracketY + (targetY - bracketY) / 2
    // bracket joining the couple, then a line down to the child's card
    lines.push(`M ${fatherX} ${bottom} V ${bracketY} H ${motherX} V ${bottom}`)
    lines.push(
      `M ${unit.cx} ${bracketY} V ${turnY} H ${targetX} V ${targetY}`
    )

    if (unit.fatherUnit) walk(unit.fatherUnit, fatherX, y)
    if (unit.motherUnit) walk(unit.motherUnit, motherX, y)
  }

  walk(top, top.cx, rootY)
  cards.push({ person, x: top.cx - CARD_W / 2, y: rootY })

  return { width: top.blockW, height: rootY + CARD_H, cards, lines }
}