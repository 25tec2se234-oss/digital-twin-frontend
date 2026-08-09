// @ts-nocheck
import React from 'react';
import { QrCode } from 'lucide-react';

// This acts as a highly styled CSS-based preview mimicking a printed A4 document.
// The real output uses React-PDF, but this looks amazing in the UI.

const LivePreview = ({ data }: { data: any }) => {
  const { candidate_details, position_details, compensation_details, responsibilities, clauses, issue_date } = data;

  const today = issue_date 
    ? new Date(issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) 
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const joinDate = position_details.joining_date 
    ? new Date(position_details.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '[Joining Date]';

  const enabledClauses = clauses.filter((c: any) => c.enabled);

  return (
    <div 
      className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] mx-auto overflow-hidden text-gray-800 transition-all duration-300 relative"
      style={{
        width: '210mm',
        minHeight: '297mm', // A4 minimum
        padding: '25mm',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Subtle watermark or texture could go here */}

      {/* Header */}
      <div className="flex justify-between items-end mb-12 border-b-2 border-slate-900 pb-6">
        <div className="flex items-center space-x-4">
           <img src="/img/dtv-logo.jpg" alt="DTV Logo" className="w-16 h-16 object-contain" />
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-white bg-slate-900 px-1.5 py-0.5 rounded-sm text-xl font-black tracking-tight leading-none uppercase">DIGITAL</span>
              <span className="text-orange-500 text-xl font-black tracking-tight leading-none uppercase">TWIN VERSE</span>
            </div>
            <p className="text-xs font-medium text-slate-500 tracking-widest uppercase">Offer of Employment</p>
          </div>
        </div>
        <div className="text-right text-[10px] text-slate-500 uppercase tracking-wider space-y-1 font-semibold">
          <p><a href="https://digitaltwinvrs.com/" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">https://digitaltwinvrs.com/</a></p>
          <p><a href="mailto:contactdigitaltwinverse@gmail.com" className="text-indigo-600 hover:underline">contactdigitaltwinverse@gmail.com</a></p>
          <p><a href="mailto:digitaltwinverse@gmail.com" className="text-indigo-600 hover:underline">digitaltwinverse@gmail.com</a></p>
          <p>India</p>
        </div>
      </div>

      {/* Meta Row */}
      <div className="flex justify-between text-xs mb-10 font-medium">
        <div>
          <p className="text-slate-400 uppercase tracking-wider mb-1">Offer ID</p>
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-slate-800" />
            <p className="text-slate-900 font-bold text-sm">DTV-OFR-{new Date().getFullYear()}-{Math.floor(1000 + Math.random() * 9000)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-slate-400 uppercase tracking-wider mb-1">Date Issued</p>
          <p className="text-slate-900 font-bold text-sm">{today}</p>
        </div>
      </div>

      {/* Content */}
      <div className="text-[13.5px] leading-relaxed text-slate-700 space-y-5 mb-10">
        <p>
          To,<br/>
          <strong className="text-slate-900 text-base">{candidate_details.name || '[Candidate Name]'}</strong><br/>
          {candidate_details.email || '[Email]'}
        </p>

        <p className="font-bold text-slate-900 text-lg border-l-4 border-slate-900 pl-4 py-1 my-8">
          Subject: Offer of Employment as {position_details.designation || '[Designation]'}
        </p>

        <p>
          Dear <strong className="text-slate-900">{candidate_details.name?.split(' ')[0] || '[First Name]'}</strong>,
        </p>
        
        <p>
          We are pleased to offer you the position of <strong className="text-slate-900">{position_details.designation || '[Designation]'}</strong> at Digital Twin Verse.
        </p>
        <p>
          Based on your profile, skills, experience, and interaction with our team, we believe you can contribute meaningfully to our mission and organization. The terms of your employment are outlined below.
        </p>
      </div>

      {/* Grid Details */}
      <div className="grid grid-cols-2 gap-8 mb-10">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Position Details</h3>
          <table className="w-full text-[13px]">
            <tbody>
              <tr><td className="py-2 text-slate-500 w-1/2">Role</td><td className="py-2 font-bold text-slate-900">{position_details.designation || '-'}</td></tr>
              <tr><td className="py-2 text-slate-500">Type</td><td className="py-2 font-bold text-slate-900">{position_details.employment_type || '-'}</td></tr>
              <tr><td className="py-2 text-slate-500">Mode</td><td className="py-2 font-bold text-slate-900">{position_details.work_mode || '-'}</td></tr>
              <tr><td className="py-2 text-slate-500">Joining Date</td><td className="py-2 font-bold text-slate-900">{joinDate}</td></tr>
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Compensation</h3>
          <table className="w-full text-[13px]">
            <tbody>
              <tr>
                <td className="py-2 text-slate-500 w-1/2">Type</td>
                <td className="py-2 font-bold text-slate-900">{compensation_details.salary_type || '-'}</td>
              </tr>
              {compensation_details.salary_type !== 'Unpaid' && compensation_details.salary_type !== 'Equity' && (
                <>
                  <tr><td className="py-2 text-slate-500">Currency</td><td className="py-2 font-bold text-slate-900">{compensation_details.currency || 'INR'}</td></tr>
                  <tr>
                    <td className="py-3 text-slate-900 font-bold">Total Amount</td>
                    <td className="py-3 font-black text-slate-900 text-base">{compensation_details.currency} {compensation_details.amount || '0'}</td>
                  </tr>
                </>
              )}
              {compensation_details.salary_type === 'Unpaid' && (
                <tr>
                  <td colSpan={2} className="py-3 text-slate-900 font-bold italic">This is an unpaid position.</td>
                </tr>
              )}
              {compensation_details.salary_type === 'Equity' && (
                <tr>
                  <td colSpan={2} className="py-3 text-slate-900 font-bold">Compensation will be provided as equity/stock options as per a separate agreement.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Responsibilities */}
      {responsibilities.length > 0 && (
        <div className="mb-10">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Key Responsibilities</h3>
          <ul className="list-disc pl-5 text-[13px] text-slate-700 space-y-2 marker:text-slate-400">
            {responsibilities.map((r: string, i: number) => (
              <li key={i} className="pl-1">{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Clauses */}
      {enabledClauses.length > 0 && (
        <div className="mb-12">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Terms & Conditions</h3>
          <div className="space-y-4">
            {enabledClauses.map((c: any) => (
              <div key={c.id}>
                <h4 className="text-[13px] font-bold text-slate-900 mb-1">{c.title}</h4>
                <p className="text-[12px] text-slate-600 leading-relaxed">{c.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signatures */}
      <div className="mt-16 flex justify-between pt-10">
         <div className="w-56">
            <div className="h-16 flex items-end pb-2">
              <span className="text-3xl text-slate-800" style={{ fontFamily: "'Brush Script MT', cursive" }}>Kumar Kartikey</span>
            </div>
            <div className="border-t border-slate-800 pt-2">
              <p className="font-bold text-slate-900 text-[13px]">Kumar Kartikey</p>
              <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">Founder & CEO</p>
            </div>
         </div>
         <div className="w-56">
            <div className="h-16 flex items-end pb-2"></div>
            <div className="border-t border-slate-300 pt-2">
              <p className="font-bold text-slate-900 text-[13px]">{candidate_details.name || 'Candidate Name'}</p>
              <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">Accepted & Signed</p>
            </div>
         </div>
      </div>

    </div>
  );
};

export default LivePreview;
