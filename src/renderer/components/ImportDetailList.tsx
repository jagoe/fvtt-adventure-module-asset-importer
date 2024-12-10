import { ImportDetails } from '@shared/models'

export type ImportDetailListParams = {
  details: ImportDetails[]
}

export default function ImportDetailList({ details }: ImportDetailListParams) {
  return (
    <ul>
      {details.map(({ from, to }) => (
        <li key={from}>
          Copied <code>{from}</code> to <code>{to}</code>
        </li>
      ))}
    </ul>
  )
}
