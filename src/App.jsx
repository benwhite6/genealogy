
import { useState } from 'react'
import { readGedcom } from 'read-gedcom'

function toPerson(record) {
  if (!record || record.length === 0) return null
  const parts = record.getName().valueAsParts()[0] || []
  return {
    id: record.pointer()[0],
    given: parts[0] || '',
    surname: parts[1] || '',
    sex: record.getSex().value()[0] || '',
  }
}

function getParents(record) {
  const family = record.getFamilyAsChild()
  return {
    father: toPerson(family.getHusband().getIndividualRecord()),
    mother: toPerson(family.getWife().getIndividualRecord()),
  }
}

function Card({ person }) {
  if (!person) {
    return (
      <div style={{ ...cardBase, border: '1px dashed #aaa', color: '#999' }}>
        Unknown
      </div>
    )
  }
  const color =
    person.sex === 'M' ? '#4aa3c8' : person.sex === 'F' ? '#d6336c' : '#999'
  return (
    <div style={{ ...cardBase, borderTop: `4px solid ${color}` }}>
      <div>{person.given}</div>
      <div>{person.surname}</div>
    </div>
  )
}

const cardBase = {
  width: 130,
  minHeight: 64,
  boxSizing: 'border-box',
  background: '#fff',
  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  borderRadius: 3,
  padding: 8,
  textAlign: 'center',
  fontSize: 14,
  fontWeight: 600,
  color: '#222',
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
      setTree({ person: toPerson(first), ...getParents(first) })
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 32,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <Card person={tree.father} />
            <Card person={tree.mother} />
          </div>
          <div style={{ width: 2, height: 30, background: '#888' }} />
          <Card person={tree.person} />
        </div>
      )}
    </div>
  )
}

export default App