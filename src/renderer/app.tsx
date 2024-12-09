import { createRoot } from 'react-dom/client'
import Importer from './components/Importer'

const root = createRoot(document.body)

root.render(
  <>
    <h2>FVTT Module Asset Importer</h2>
    <Importer />
  </>,
)
