'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, startOfMonth } from 'date-fns'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'

export function AddPaymentDialog({ open, onOpenChange, onSuccess }) {
  const [paidBy, setPaidBy] = useState('')
  const [amount, setAmount] = useState('20.00')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [customName, setCustomName] = useState('')
  const [showCustomName, setShowCustomName] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const finalPaidBy = showCustomName ? customName : paidBy

    if (!finalPaidBy || !amount) {
      alert('Please fill in all fields')
      setLoading(false)
      return
    }

    const monthStart = startOfMonth(selectedDate)

    const { error } = await supabase
      .from('payments')
      .insert([
        {
          month: format(monthStart, 'yyyy-MM-dd'),
          paid_by: finalPaidBy,
          amount: parseFloat(amount)
        }
      ])

    if (error) {
      console.error('Error adding payment:', error)
      alert('Failed to add payment')
    } else {
      setPaidBy('')
      setCustomName('')
      setAmount('20.00')
      setSelectedDate(new Date())
      setShowCustomName(false)
      onSuccess()
      onOpenChange(false)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
          <DialogDescription>
            Record who paid for the subscription this month
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="month">Month</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="paidBy">Paid By</Label>
              {!showCustomName ? (
                <>
                  <Select value={paidBy} onValueChange={setPaidBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select who paid" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Anuka">Anuka</SelectItem>
                      <SelectItem value="Yahampath">Yahampath</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm"
                    onClick={() => setShowCustomName(true)}
                  >
                    Use custom name
                  </Button>
                </>
              ) : (
                <>
                  <Input
                    id="customName"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Enter name"
                  />
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm"
                    onClick={() => setShowCustomName(false)}
                  >
                    Use dropdown instead
                  </Button>
                </>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="20.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}