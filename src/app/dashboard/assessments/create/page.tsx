import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'

export default function CreateAssessmentPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/assessments">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assessments
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Assessment</h1>
          <p className="text-gray-600 mt-2">
            Build a new talent assessment for your organization
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assessment Builder</CardTitle>
          <CardDescription>
            Create comprehensive talent assessments to evaluate and develop your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Assessment Builder Coming Soon</h3>
            <p className="mt-2 text-gray-600 max-w-md mx-auto">
              The assessment builder will allow you to create custom talent assessments 
              with multiple question types, scoring systems, and reporting capabilities.
            </p>
            <div className="mt-6">
              <Button disabled>
                Start Building Assessment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  )
}
