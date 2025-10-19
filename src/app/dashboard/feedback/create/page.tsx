import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'

export default function CreateFeedbackPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/feedback">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Feedback
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Request Feedback</h1>
          <p className="text-gray-600 mt-2">
            Create a new feedback request for your organization
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feedback Request Creator</CardTitle>
          <CardDescription>
            Create targeted feedback requests to gather insights and drive improvement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Feedback Request Creator Coming Soon</h3>
            <p className="mt-2 text-gray-600 max-w-md mx-auto">
              The feedback request creator will allow you to create targeted feedback 
              requests, track responses, and analyze feedback data.
            </p>
            <div className="mt-6">
              <Button disabled>
                Create Feedback Request
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  )
}
