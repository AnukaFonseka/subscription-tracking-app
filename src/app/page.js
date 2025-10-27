'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, startOfMonth } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AddPaymentDialog } from '@/components/AddPaymentDialog'
import { Calendar, DollarSign, Users } from 'lucide-react'

export default function Home() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('month', { ascending: false })

    if (error) {
      console.error('Error fetching payments:', error)
    } else {
      setPayments(data || [])
    }
    setLoading(false)
  }

  const deletePayment = async (id) => {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting payment:', error)
      alert('Failed to delete payment')
    } else {
      fetchPayments()
    }
  }

  const calculateStats = () => {
    const paymentsByPerson = payments.reduce((acc, payment) => {
      acc[payment.paid_by] = (acc[payment.paid_by] || 0) + 1
      return acc
    }, {})

    const totalAmount = payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0)

    return { paymentsByPerson, totalAmount }
  }

  const { paymentsByPerson, totalAmount } = calculateStats()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Claude Subscription Tracker</h1>
          <p className="text-gray-600">Keep track of who paid for Claude Premium each month</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payments.length}</div>
              <p className="text-xs text-muted-foreground">Months tracked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Combined total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Distribution</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(paymentsByPerson).map(([person, count]) => (
                  <div key={person} className="flex justify-between text-sm">
                    <span className="font-medium">{person}:</span>
                    <span className="text-muted-foreground">{count} months</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>View and manage subscription payments</CardDescription>
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                Add Payment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No payments recorded yet. Click "Add Payment" to get started!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Paid By</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {format(new Date(payment.month), 'MMMM yyyy')}
                      </TableCell>
                      <TableCell>{payment.paid_by}</TableCell>
                      <TableCell>${parseFloat(payment.amount || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this payment?')) {
                              deletePayment(payment.id)
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AddPaymentDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        onSuccess={fetchPayments}
      />
    </div>
  )
}