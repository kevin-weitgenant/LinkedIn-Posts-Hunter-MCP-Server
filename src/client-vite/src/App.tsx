import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <header className="header">
        <h1>LinkedIn Vite Viewer</h1>
        <p className="subtitle">Proof of Concept - Vite + React Working!</p>
      </header>

      <main className="main">
        <div className="card">
          <h2>🎉 Success!</h2>
          <p>
            This proves we can launch a Vite dev server from an MCP tool.
          </p>
          
          <div className="features">
            <h3>What's Working:</h3>
            <ul>
              <li>✅ Vite dev server launched via MCP tool</li>
              <li>✅ React with TypeScript</li>
              <li>✅ Hot Module Replacement (edit this file to test!)</li>
              <li>✅ Browser auto-opens</li>
            </ul>
          </div>

          <div className="counter">
            <p>Test HMR by clicking the button:</p>
            <button onClick={() => setCount((count) => count + 1)}>
              Count is {count}
            </button>
          </div>

          <div className="next-steps">
            <h3>Next Steps:</h3>
            <ul>
              <li>Connect to existing API endpoints</li>
              <li>Migrate post viewer UI</li>
              <li>Add DB reactivity (polling or SSE)</li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>LinkedIn Playwright MCP - Vite Integration</p>
      </footer>
    </div>
  )
}

export default App

