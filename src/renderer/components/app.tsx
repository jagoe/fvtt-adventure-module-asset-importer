import { createRoot } from 'react-dom/client'
import Exporter from './Exporter'

const root = createRoot(document.body)

root.render(
  <>
    <h2>FVTT Module Asset Exporter</h2>
    <Exporter />
  </>,
)
