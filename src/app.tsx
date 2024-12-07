import { createRoot } from 'react-dom/client'

const root = createRoot(document.body)

const ping = async () => {
  const response = await messages.ping()
  console.log(response)
}

root.render(
  <>
    <h2>Hello from React!</h2>
    <button onClick={ping}>Ping</button>
    <section>
      This app is using Chrome (v{versions.chrome()}), Node.js (v{versions.node()}), and Electron (v
      {versions.electron()}).
    </section>
  </>,
)
