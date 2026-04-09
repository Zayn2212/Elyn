import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { DashboardData, DateRange } from '@/hooks/useAdminDashboard';
import elynLogo from '@/assets/elyn-logo.png';

interface PrintableReportProps {
  data: DashboardData;
  dateRange: DateRange;
}

const PrintableReport = forwardRef<HTMLDivElement, PrintableReportProps>(
  ({ data, dateRange }, ref) => {
    const maxSpecialtyRvu = Math.max(...data.bySpecialty.map(s => s.total_rvu), 1);
    const maxFacilityRvu = Math.max(...data.byFacility.map(f => f.total_rvu), 1);
    const maxActivityRvu = Math.max(...data.dailyActivity.map(a => a.rvu), 1);

    return (
      <div ref={ref} className="print-report bg-white text-slate-900 p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <img src={elynLogo} alt="elyn" className="w-12 h-12 rounded-xl print:grayscale-0" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Billing Report Summary</h1>
              <p className="text-sm text-slate-500">Generated {format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-slate-700">Report Period</div>
            <div className="text-lg font-semibold text-slate-900">
              {format(dateRange.from, 'MMM d')} – {format(dateRange.to, 'MMM d, yyyy')}
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-cyan-500 rounded-full"></span>
            Executive Summary
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="text-2xl font-bold text-slate-900">{data.summary.total_bills}</div>
              <div className="text-sm text-slate-600">Total Encounters</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="text-2xl font-bold text-cyan-600">{data.summary.total_rvu.toFixed(1)}</div>
              <div className="text-sm text-slate-600">Total RVU</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="text-2xl font-bold text-emerald-600">${(data.summary.total_value).toLocaleString()}</div>
              <div className="text-sm text-slate-600">Total Revenue</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="text-2xl font-bold text-purple-600">{data.topProviders.length}</div>
              <div className="text-sm text-slate-600">Active Providers</div>
            </div>
          </div>
        </div>

        {/* RVU Breakdown */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-emerald-500 rounded-full"></span>
            RVU Status Breakdown
          </h2>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-sm text-slate-600">Submitted: {data.summary.submitted_rvu.toFixed(1)} RVU</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-sm text-slate-600">Pending: {data.summary.pending_rvu.toFixed(1)} RVU</span>
              </div>
            </div>
            <div className="h-6 bg-slate-200 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-emerald-500" 
                style={{ width: `${(data.summary.submitted_rvu / data.summary.total_rvu) * 100}%` }}
              />
              <div 
                className="h-full bg-amber-500" 
                style={{ width: `${(data.summary.pending_rvu / data.summary.total_rvu) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>{((data.summary.submitted_rvu / data.summary.total_rvu) * 100).toFixed(0)}% submitted</span>
              <span>{((data.summary.pending_rvu / data.summary.total_rvu) * 100).toFixed(0)}% pending</span>
            </div>
          </div>
        </div>

        {/* 7-Day Activity Chart */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-500 rounded-full"></span>
            7-Day Activity
          </h2>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-end gap-2 h-32">
              {data.dailyActivity.slice(-7).map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs text-slate-600 mb-1">{day.rvu.toFixed(1)}</div>
                  <div 
                    className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t"
                    style={{ height: `${(day.rvu / maxActivityRvu) * 100}px`, minHeight: day.rvu > 0 ? '8px' : '2px' }}
                  />
                  <span className="text-xs text-slate-600 mt-1">
                    {format(new Date(day.date), 'EEE')}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {day.bills} bills
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between text-sm">
              <span className="text-slate-600">Weekly Total: <strong>{data.dailyActivity.slice(-7).reduce((sum, d) => sum + d.bills, 0)} bills</strong></span>
              <span className="text-cyan-600 font-semibold">{data.dailyActivity.slice(-7).reduce((sum, d) => sum + d.rvu, 0).toFixed(1)} RVU</span>
            </div>
          </div>
        </div>

        {/* Performance by Specialty */}
        <div className="mb-8 break-inside-avoid">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
            Performance by Specialty
          </h2>
          <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-700">Specialty</th>
                  <th className="text-center p-3 font-semibold text-slate-700">Providers</th>
                  <th className="text-center p-3 font-semibold text-slate-700">Bills</th>
                  <th className="text-right p-3 font-semibold text-slate-700">RVU</th>
                  <th className="p-3 font-semibold text-slate-700 w-32">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {data.bySpecialty.map((specialty, idx) => (
                  <tr key={specialty.specialty} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-3 font-medium text-slate-800">{specialty.specialty}</td>
                    <td className="p-3 text-center text-slate-600">{specialty.provider_count}</td>
                    <td className="p-3 text-center text-slate-600">{specialty.bill_count}</td>
                    <td className="p-3 text-right font-semibold text-cyan-600">{specialty.total_rvu.toFixed(1)}</td>
                    <td className="p-3">
                      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                          style={{ width: `${(specialty.total_rvu / maxSpecialtyRvu) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance by Facility */}
        <div className="mb-8 break-inside-avoid">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-amber-500 rounded-full"></span>
            Performance by Facility
          </h2>
          <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-700">Facility</th>
                  <th className="text-center p-3 font-semibold text-slate-700">Providers</th>
                  <th className="text-center p-3 font-semibold text-slate-700">Bills</th>
                  <th className="text-right p-3 font-semibold text-slate-700">RVU</th>
                  <th className="p-3 font-semibold text-slate-700 w-32">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {data.byFacility.map((facility, idx) => (
                  <tr key={facility.facility} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-3 font-medium text-slate-800">{facility.facility}</td>
                    <td className="p-3 text-center text-slate-600">{facility.provider_count}</td>
                    <td className="p-3 text-center text-slate-600">{facility.bill_count}</td>
                    <td className="p-3 text-right font-semibold text-cyan-600">{facility.total_rvu.toFixed(1)}</td>
                    <td className="p-3">
                      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                          style={{ width: `${(facility.total_rvu / maxFacilityRvu) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Providers Leaderboard */}
        <div className="mb-8 break-inside-avoid">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-rose-500 rounded-full"></span>
            Top Providers by RVU
          </h2>
          <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="text-center p-3 font-semibold text-slate-700 w-12">Rank</th>
                  <th className="text-left p-3 font-semibold text-slate-700">Provider</th>
                  <th className="text-left p-3 font-semibold text-slate-700">Specialty</th>
                  <th className="text-center p-3 font-semibold text-slate-700">Bills</th>
                  <th className="text-right p-3 font-semibold text-slate-700">RVU</th>
                </tr>
              </thead>
              <tbody>
                {data.topProviders.slice(0, 10).map((provider, idx) => (
                  <tr key={provider.user_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                        idx === 1 ? 'bg-slate-200 text-slate-600' :
                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-800">{provider.full_name}</td>
                    <td className="p-3 text-slate-600">{provider.specialty}</td>
                    <td className="p-3 text-center text-slate-600">{provider.bill_count}</td>
                    <td className="p-3 text-right font-semibold text-cyan-600">{provider.total_rvu.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-slate-200 pt-4 mt-8 flex justify-between text-xs text-slate-400">
          <span>ELYN Billing System • Confidential</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    );
  }
);

PrintableReport.displayName = 'PrintableReport';

export default PrintableReport;
