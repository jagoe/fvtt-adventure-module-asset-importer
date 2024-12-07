import { createRoot } from 'react-dom/client'
import Importer from './Importer'

const root = createRoot(document.body)

root.render(
  <>
    <h2>FVTT Module Asset Exporter</h2>
    <Importer />
  </>,
)
