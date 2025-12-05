import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 font-sans">
      <main className="flex w-full max-w-5xl flex-col gap-8 p-8">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold text-gray-900">
              Resource & Capacity Management
            </h1>
            <Link
              href="/login"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Sign In
            </Link>
          </div>
          <p className="text-lg text-gray-600">
            A centralized platform for resource management, activity assignments, and capacity planning.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Resource Management
            </h2>
            <p className="text-gray-600">
              Track and manage resources across your organization with centralized data.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Activity Assignments
            </h2>
            <p className="text-gray-600">
              Streamline workflows with efficient activity assignment tools.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Capacity Planning
            </h2>
            <p className="text-gray-600">
              Dynamic dashboards for real-time capacity insights and analytics.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Role-Based Access
            </h2>
            <p className="text-gray-600">
              Secure access control with customizable permissions for different user roles.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Analytics
            </h2>
            <p className="text-gray-600">
              Comprehensive analytics and reporting for data-driven decisions.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Collaboration
            </h2>
            <p className="text-gray-600">
              Inline comments, notifications, and team collaboration features.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-2 text-sm font-medium text-gray-500">
            Getting Started
          </h3>
          <p className="text-gray-600">
            Configure your database connection in <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">server.js</code> and start building your resource management solution.
          </p>
        </div>
      </main>
    </div>
  );
}
