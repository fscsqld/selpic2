/** Fired when an ATO lodgment snapshot is saved or finalized. */
export const LODGMENT_SNAPSHOT_SAVED_EVENT = 'lodgmentSnapshotSaved'

export function notifyLodgmentSnapshotSaved(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LODGMENT_SNAPSHOT_SAVED_EVENT))
  }
}
