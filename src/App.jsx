import { useState } from 'react'
import { readGedcom } from 'read-gedcom'
import { buildTree, CARD_W, CARD_H } from './tree.js'

function Card({ person, x, y }) {
  const position = { position: 'absolute', left: x, top: y }
  if (!person) {
    return (
      <div style={{ ...cardBase, ...position, border: '1px dashed #aaa', color: '#999' }}>
        Unknown
      </div>
    )
  }
  const color =
    person.sex === 'M' ? '#4aa3c8' : person.sex === 'F' ? '#d6336c' : '#999'
  return (
    <div style={{ ...cardBase, ...position, borderTop: `4px solid ${color}` }}>
      <div>{person.given}</div>
      <div>{person.surname}</div>
    </div>
  )
}

const cardBase = {
  width: CARD_W,
  height: CARD_H,
  boxSizing: 'border-box',
  background: '#fff',
  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  borderRadius: 3,
  padding: 8,
  textAlign: 'center',
  fontSize: 13,
  fontWeight: 600,
  color: '#222',
  overflow: 'hidden',
}

function App() {
  const [tree, setTree] = useState(null)
  const [error, setError] = useState('')

  async function handleFile(event) {
    const file = event.target.files[0]
    if (!file) return
    try {
      const buffer = await file.arrayBuffer()
      const gedcom = readGedcom(buffer)
      const first = gedcom.getIndividualRecord().arraySelect()[0]
      setTree(buildTree(first))
      setError('')
    } catch (e) {
      setTree(null)
      setError('Could not read that file. Is it a .ged file?')
    }
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Genealogy</h1>
      <input type="file" accept=".ged" onChange={handleFile} />
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {tree && (
        <div style={{ overflowX: 'auto', marginTop: 32, paddingBottom: 16 }}>
          <div
            style={{
              position: 'relative',
              width: tree.width,
              height: tree.height,
              margin: '0 auto',
            }}
          >
            <svg
              width={tree.width}
              height={tree.height}
              style={{ position: 'absolute', left: 0, top: 0 }}
            >
              {tree.lines.map((d, i) => (
                <path key={i} d={d} fill="none" stroke="#888" strokeWidth="2" />
              ))}
            </svg>
            {tree.cards.map((c, i) => (
              <Card key={i} person={c.person} x={c.x} y={c.y} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App