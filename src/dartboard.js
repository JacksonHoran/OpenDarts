// Standard dartboard geometry.
// Numbers in clockwise order, starting from the top (20 at 12 o'clock).
export const NUMBERS = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
  3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
]

const SECTORS = NUMBERS.length // 20
const SECTOR_DEG = 360 / SECTORS // 18°

// Radii on a 0..100 scale (viewBox is centered at 0,0 spanning -110..110).
// Proportions approximate a regulation board.
export const R = {
  doubleBullOuter: 3.5, // 50
  bullOuter: 8,         // 25
  tripleInner: 48,      // start of triple ring
  tripleOuter: 53,      // end of triple ring
  doubleInner: 80,      // start of double ring
  doubleOuter: 85,      // end of double ring (playable edge)
  boardEdge: 100,       // decorative outer ring
}

// Convert polar (degrees, radius) to a cartesian point.
// 0° points up (12 o'clock); angle increases clockwise.
function polar(angleDeg, radius) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: radius * Math.cos(rad),
    y: radius * Math.sin(rad),
  }
}

// Path for an annular sector (a ring slice) between two radii and two angles.
function annularSector(innerR, outerR, startDeg, endDeg) {
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  const oStart = polar(startDeg, outerR)
  const oEnd = polar(endDeg, outerR)
  const iEnd = polar(endDeg, innerR)
  const iStart = polar(startDeg, innerR)
  return [
    `M ${oStart.x.toFixed(3)} ${oStart.y.toFixed(3)}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${oEnd.x.toFixed(3)} ${oEnd.y.toFixed(3)}`,
    `L ${iEnd.x.toFixed(3)} ${iEnd.y.toFixed(3)}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${iStart.x.toFixed(3)} ${iStart.y.toFixed(3)}`,
    'Z',
  ].join(' ')
}

// Build every clickable segment on the board.
// Each segment: { id, path, value, multiplier, label, ring, alt }
// `ring` is used to alternate colors; `alt` marks the alternating pair per sector.
export function buildSegments() {
  const segments = []

  NUMBERS.forEach((num, i) => {
    // Center this sector so 20 sits at the top.
    const start = i * SECTOR_DEG - SECTOR_DEG / 2
    const end = start + SECTOR_DEG
    const alt = i % 2 === 0 // alternating base color

    // inner single (between bull and triple)
    segments.push({
      id: `s-${num}-inner`,
      path: annularSector(R.bullOuter, R.tripleInner, start, end),
      value: num, multiplier: 1, label: `${num}`, ring: 'single', alt,
    })
    // triple ring
    segments.push({
      id: `t-${num}`,
      path: annularSector(R.tripleInner, R.tripleOuter, start, end),
      value: num, multiplier: 3, label: `T${num}`, ring: 'triple', alt,
    })
    // outer single (between triple and double)
    segments.push({
      id: `s-${num}-outer`,
      path: annularSector(R.tripleOuter, R.doubleInner, start, end),
      value: num, multiplier: 1, label: `${num}`, ring: 'single', alt,
    })
    // double ring
    segments.push({
      id: `d-${num}`,
      path: annularSector(R.doubleInner, R.doubleOuter, start, end),
      value: num, multiplier: 2, label: `D${num}`, ring: 'double', alt,
    })
  })

  return segments
}

// Where to place the number label for a sector (just outside the double ring).
export function numberLabels() {
  return NUMBERS.map((num, i) => {
    const angle = i * SECTOR_DEG // sector center
    const p = polar(angle, (R.doubleOuter + R.boardEdge) / 2 + 1)
    return { num, x: p.x, y: p.y }
  })
}
