/**
 * Static mockup page for Google Ads API access application.
 * This page demonstrates the intended UI of the reporting dashboard.
 */

export default function MockupPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">Heaviside PPC</h1>
            <nav className="hidden md:flex gap-6 ml-8">
              <a href="#" className="text-gray-900 font-medium">Dashboard</a>
              <a href="#" className="text-gray-500 hover:text-gray-900">Campaigns</a>
              <a href="#" className="text-gray-500 hover:text-gray-900">Reports</a>
              <a href="#" className="text-gray-500 hover:text-gray-900">Settings</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">john@heavisideppc.com</span>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              J
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            {/* Client Selector */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Client</label>
              <select className="border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-900 min-w-[200px]">
                <option>ABC Garage Doors</option>
                <option>Premier Door Co</option>
                <option>Metro HVAC Services</option>
                <option>All Clients</option>
              </select>
            </div>
            {/* Account Selector */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ad Account</label>
              <select className="border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-900 min-w-[200px]">
                <option>ABC Garage Doors - Google Ads</option>
                <option>ABC Garage Doors - Meta</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date Range</label>
              <select className="border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-900">
                <option>Last 30 Days</option>
                <option>Last 7 Days</option>
                <option>This Month</option>
                <option>Last Month</option>
                <option>Custom Range</option>
              </select>
            </div>
            {/* Sync Button */}
            <button className="mt-5 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync Data
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KPICard
            label="Impressions"
            value="847,293"
            change="+12.4%"
            positive={true}
          />
          <KPICard
            label="Clicks"
            value="24,891"
            change="+8.2%"
            positive={true}
          />
          <KPICard
            label="Spend"
            value="$18,432.50"
            change="+5.1%"
            positive={false}
          />
          <KPICard
            label="Conversions"
            value="1,247"
            change="+18.7%"
            positive={true}
          />
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KPICard
            label="CTR"
            value="2.94%"
            change="+0.3%"
            positive={true}
            secondary
          />
          <KPICard
            label="Avg CPC"
            value="$0.74"
            change="-2.1%"
            positive={true}
            secondary
          />
          <KPICard
            label="Cost/Conv"
            value="$14.78"
            change="-8.4%"
            positive={true}
            secondary
          />
          <KPICard
            label="Conv Rate"
            value="5.01%"
            change="+1.2%"
            positive={true}
            secondary
          />
        </div>

        {/* Campaign Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Campaign Performance</h2>
            <button className="text-sm text-blue-600 hover:text-blue-800">Export CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">CTR</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Spend</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Conv</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Cost/Conv</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <CampaignRow
                  name="Garage Door Repair - Phoenix"
                  status="Active"
                  impressions="234,521"
                  clicks="7,892"
                  ctr="3.36%"
                  spend="$5,234.12"
                  conversions="412"
                  costPerConv="$12.70"
                />
                <CampaignRow
                  name="Emergency Services - Brand"
                  status="Active"
                  impressions="189,432"
                  clicks="6,234"
                  ctr="3.29%"
                  spend="$4,123.45"
                  conversions="387"
                  costPerConv="$10.66"
                />
                <CampaignRow
                  name="New Installation - Phoenix Metro"
                  status="Active"
                  impressions="156,789"
                  clicks="4,567"
                  ctr="2.91%"
                  spend="$3,892.33"
                  conversions="234"
                  costPerConv="$16.63"
                />
                <CampaignRow
                  name="Spring Repair Promo"
                  status="Paused"
                  impressions="98,234"
                  clicks="2,891"
                  ctr="2.94%"
                  spend="$2,345.67"
                  conversions="123"
                  costPerConv="$19.07"
                />
                <CampaignRow
                  name="Opener Installation"
                  status="Active"
                  impressions="87,654"
                  clicks="2,134"
                  ctr="2.44%"
                  spend="$1,678.90"
                  conversions="67"
                  costPerConv="$25.06"
                />
                <CampaignRow
                  name="Commercial Services"
                  status="Active"
                  impressions="80,663"
                  clicks="1,173"
                  ctr="1.45%"
                  spend="$1,158.03"
                  conversions="24"
                  costPerConv="$48.25"
                />
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
            <span>Showing 6 of 12 campaigns</span>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Previous</button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Next</button>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-gray-400 mt-8">
          Last synced: Dec 23, 2025 at 3:45 PM
        </p>
      </main>
    </div>
  )
}

function KPICard({
  label,
  value,
  change,
  positive,
  secondary = false,
}: {
  label: string
  value: string
  change: string
  positive: boolean
  secondary?: boolean
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${secondary ? 'py-4' : ''}`}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`font-bold text-gray-900 ${secondary ? 'text-xl' : 'text-2xl'}`}>{value}</p>
      <p className={`text-sm mt-1 ${positive ? 'text-green-600' : 'text-red-600'}`}>
        {change} vs prev period
      </p>
    </div>
  )
}

function CampaignRow({
  name,
  status,
  impressions,
  clicks,
  ctr,
  spend,
  conversions,
  costPerConv,
}: {
  name: string
  status: string
  impressions: string
  clicks: string
  ctr: string
  spend: string
  conversions: string
  costPerConv: string
}) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4">
        <span className="font-medium text-gray-900">{name}</span>
      </td>
      <td className="px-6 py-4 text-right">
        <span
          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            status === 'Active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {status}
        </span>
      </td>
      <td className="px-6 py-4 text-right text-gray-700">{impressions}</td>
      <td className="px-6 py-4 text-right text-gray-700">{clicks}</td>
      <td className="px-6 py-4 text-right text-gray-700">{ctr}</td>
      <td className="px-6 py-4 text-right text-gray-700">{spend}</td>
      <td className="px-6 py-4 text-right text-gray-700">{conversions}</td>
      <td className="px-6 py-4 text-right text-gray-700">{costPerConv}</td>
    </tr>
  )
}
