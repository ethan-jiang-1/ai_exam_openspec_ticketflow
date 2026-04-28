import { APP_INFO } from '@ticketflow/shared'
import './App.css'

function App() {
  return (
    <div>
      <h1>{APP_INFO.name}</h1>
      <p>Version: {APP_INFO.version}</p>
    </div>
  )
}

export default App
