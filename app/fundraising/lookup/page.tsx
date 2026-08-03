import { Suspense } from 'react'
import FundraisingLookupClient from './LookupClient'

export default function FundraisingLookupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-600">Loading partner portal…</div>}>
      <FundraisingLookupClient />
    </Suspense>
  )
}
