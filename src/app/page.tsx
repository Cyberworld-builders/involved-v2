import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/navigation'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation Header */}
      <Header />

      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Involved Talent
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Modern talent assessment and development platform built for the future of work
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle>360° Assessments</CardTitle>
              <CardDescription>
                Comprehensive multi-rater feedback for complete talent insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Get 360-degree feedback from peers, managers, and direct reports to understand strengths and development areas.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leadership Development</CardTitle>
              <CardDescription>
                Identify and develop leadership potential across your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Assess leadership capabilities and create targeted development plans for emerging and current leaders.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Assessments</CardTitle>
              <CardDescription>
                Build tailored assessments for your specific organizational needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Create custom assessment tools that align with your company culture and strategic objectives.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Link href="/auth/signup">
            <Button size="lg" className="mr-4">
              Get Started
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button variant="outline" size="lg">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
