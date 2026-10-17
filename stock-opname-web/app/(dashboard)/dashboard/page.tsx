export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900">Total Products</h2>
          <p className="text-3xl font-bold text-blue-600 mt-2">-</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900">Active Sessions</h2>
          <p className="text-3xl font-bold text-green-600 mt-2">-</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900">Scanned Items</h2>
          <p className="text-3xl font-bold text-purple-600 mt-2">-</p>
        </div>
      </div>
    </div>
  )
}
