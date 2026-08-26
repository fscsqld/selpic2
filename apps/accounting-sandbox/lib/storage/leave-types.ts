/**
 * Employee leave record types (IndexedDB leaveRecords store).
 */

export type LeaveType = 'annual' | 'sick' | 'personal' | 'unpaid'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export interface LeaveRecord {
  id: string
  employeeId: string
  type: LeaveType
  startDate: string
  endDate: string
  hours: number
  status: LeaveStatus
  reason?: string
  createdAt: string
  updatedAt: string
  approvedAt?: string
  approvedBy?: string
}
