import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

// Temporary check: can the app reach the database, and is it locked?
function ConnectionStatus() {
  const [status, setStatus] = useState('Checking database connection...')

  useEffect(() => {
    async function check() {
      try {
        const { data, error } = await supabase.from('people').select('id').limit(1)
        if (error && error.code === '42501') {
          setStatus('Connected to the database. It is locked, as designed.')
        } else if (error) {
          setStatus('Could not connect: ' + error.message)
        } else {
          setStatus('Connected to the database (' + data.length + ' rows visible).')
        }
      } catch (e) {
        setStatus('Could not reach the database: ' + e.message)
      }
    }
    check()
  }, [])

  return <p style={{ fontSize: 13, color: '#555' }}>{status}</p>
}

export default ConnectionStatus