import { useState } from 'react'
import { readGedcom } from 'read-gedcom'

function App() {
  const [people, setPeople] = useState([])
  const [error, setError] = useState('')

  async function handleFile(event) {
    const file = event.target.files[0]
    if (!file) return
    try {
      const buffer = await file.arrayBuffer()
      const gedcom = readGedcom(buffer)
      const list = gedcom
        .getIndividualRecord()
        .arraySelect()
        .map((person) => {
          const parts = person.getName().valueAsParts()[0] || []
          return {
            id: person.pointer()[0],
            given: parts[0] || '',
            surname: parts[1] || '',
            sex: person.getSex().value()[0] || '',
          }
        })
      setPeople(list)
      setError('')
    } catch (e) {
      setPeople([])
      setError('Could not read that file. Is it a .ged file?')
    }
  }

  return (
    <div style={{ padding: '1rem', textAlign: 'left' }}>
      <h1>Genealogy</h1>
      <input type="file" accept=".ged" onChange={handleFile} />
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {people.length > 0 && (
        <>
          <p>{people.length} people found</p>
          <ul>
            {people.map((p) => (
              <li key={p.id}>
                {p.given} {p.surname} ({p.sex || '?'})
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default App