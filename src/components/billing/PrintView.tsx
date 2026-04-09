import React from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UnifiedBill } from '@/hooks/useBilling';

interface PrintViewProps {
  bills: UnifiedBill[];
  startDate?: Date;
  endDate?: Date;
  onClose: () => void;
}

export const PrintView = ({ bills, startDate, endDate, onClose }: PrintViewProps) => {
  const totalRVU = bills.reduce((sum, b) => sum + (b.rvu || 0), 0);
  const pendingRVU = bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + (b.rvu || 0), 0);

  return (
    <div className="fixed inset-0 z-[100] bg-white overflow-auto print:static">
      <div className="fixed top-4 right-4 print:hidden">
        <Button onClick={onClose} variant="outline" className="bg-white">
          <X className="w-4 h-4 mr-2" />
          Close Preview
        </Button>
      </div>

      <div className="max-w-4xl mx-auto p-8 text-black">
        <div className="border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold">elyn™ Billing Report</h1>
          <div className="text-sm text-gray-600 mt-1">
            Generated: {format(new Date(), 'MMMM d, yyyy h:mm a')}
            {(startDate || endDate) && (
              <span className="ml-4">
                Period: {startDate ? format(startDate, 'MMM d, yyyy') : 'Start'} - {endDate ? format(endDate, 'MMM d, yyyy') : 'End'}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-gray-100 rounded">
          <div>
            <div className="text-xs text-gray-500 uppercase">Total Bills</div>
            <div className="text-xl font-bold">{bills.length}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase">Total RVU</div>
            <div className="text-xl font-bold">{totalRVU.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase">Pending RVU</div>
            <div className="text-xl font-bold text-orange-600">{pendingRVU.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase">Total Value</div>
            <div className="text-xl font-bold text-green-600">${(totalRVU * 40).toFixed(2)}</div>
          </div>
        </div>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-2 px-1">Patient</th>
              <th className="text-left py-2 px-1">MRN</th>
              <th className="text-left py-2 px-1">Date</th>
              <th className="text-left py-2 px-1">CPT</th>
              <th className="text-left py-2 px-1">Mod</th>
              <th className="text-left py-2 px-1">Dx</th>
              <th className="text-right py-2 px-1">RVU</th>
              <th className="text-right py-2 px-1">Value</th>
              <th className="text-center py-2 px-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {bills.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((bill, idx) => (
              <tr key={bill.id} className={cn("border-b border-gray-300", idx % 2 === 0 ? "bg-gray-50" : "")}>
                <td className="py-2 px-1 font-medium">{bill.patient_name}</td>
                <td className="py-2 px-1 text-gray-600">{bill.patient_mrn || '-'}</td>
                <td className="py-2 px-1">{format(new Date(bill.created_at), 'MM/dd/yy')}</td>
                <td className="py-2 px-1 font-mono">{bill.cpt_codes[0]}</td>
                <td className="py-2 px-1 text-gray-600">{bill.modifiers?.join(', ') || '-'}</td>
                <td className="py-2 px-1 font-mono text-gray-600">{bill.diagnosis || '-'}</td>
                <td className="py-2 px-1 text-right font-bold">{bill.rvu?.toFixed(2)}</td>
                <td className="py-2 px-1 text-right text-green-700">${((bill.rvu || 0) * 40).toFixed(2)}</td>
                <td className="py-2 px-1 text-center">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    bill.status === 'submitted' ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                  )}>
                    {bill.status === 'submitted' ? '✓' : '○'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black font-bold">
              <td colSpan={6} className="py-2 px-1 text-right">TOTALS:</td>
              <td className="py-2 px-1 text-right">{totalRVU.toFixed(2)}</td>
              <td className="py-2 px-1 text-right text-green-700">${(totalRVU * 40).toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
          <p>elyn™ • AI-Powered Billing Agent</p>
          <p className="mt-1">This report is for internal use only. Please verify all information before submission.</p>
        </div>
      </div>
    </div>
  );
};

export default PrintView;
