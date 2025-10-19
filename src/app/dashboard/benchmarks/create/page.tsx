import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Target } from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'

export default function CreateBenchmarkPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/benchmarks">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Benchmarks
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Benchmark</h1>
          <p className="text-gray-600 mt-2">
            Define a new performance benchmark for your organization
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Benchmark Creator</CardTitle>
          <CardDescription>
            Set performance benchmarks and track progress against industry standards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Target className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Benchmark Creator Coming Soon</h3>
            <p className="mt-2 text-gray-600 max-w-md mx-auto">
              The benchmark creator will allow you to define performance standards, 
              set targets, and track progress against industry benchmarks.
            </p>
            <div className="mt-6">
              <Button disabled>
                Create Benchmark
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  )
}
