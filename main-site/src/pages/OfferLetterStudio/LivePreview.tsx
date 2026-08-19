// @ts-nocheck
import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
// PDF Engine: html2pdf.js (HTML to Canvas via html2canvas)

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

  const enabledClauses = clauses?.filter((c: any) => c.enabled) || [];
  
  // Phase 1 Design Tokens applied inline where necessary, but mostly using custom colors via style or Tailwind arbitrary values
  const theme = {
    ink: '#15171F',
    gold: '#B8863A',
    paper: '#FFFFFF',
    paperWarm: '#FBFAF7',
    text: '#23252E',
    textMuted: '#767A87',
    hairline: '#E7E5DF'
  };

  // The human-readable Offer ID (generated during creation)
  const offerId = data.offer_id || `DTV-OFR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  // Real Verification URL that actually works when scanned!
  // It points to the /offer/verify/:id route of this exact application.
  let verifyUrl = 'https://digitaltwinvrs.com';
  if (data.verification_token) {
    const baseUrl = window.location.origin + window.location.pathname;
    verifyUrl = `${baseUrl}#/offer/verify/${data.verification_token}`;
  } else if (data.id) {
    const baseUrl = window.location.origin + window.location.pathname;
    verifyUrl = `${baseUrl}#/offer/verify/${data.id}`;
  }

  return (
    <>
      <div 
        className="mx-auto overflow-hidden relative"
        style={{
          width: '210mm',
          minHeight: '297mm', // A4 minimum
          backgroundColor: theme.paper,
          color: theme.text,
          fontFamily: "'Inter', sans-serif",
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }}
      >
        {/* 9. Watermark (new, quiet) */}
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
          style={{ opacity: 0.04 }}
        >
          <span 
            className="font-black tracking-tighter"
            style={{ fontSize: '200px', transform: 'rotate(-45deg)', color: theme.ink }}
          >
            DTV
          </span>
        </div>

        <div className="relative z-10" style={{ padding: '25mm' }}>
          
          {/* 1. Header band */}
          <div 
            className="absolute top-0 left-0 right-0 px-[25mm] pt-[15mm] pb-[10mm]"
            style={{ backgroundColor: theme.ink, borderBottom: `2px solid ${theme.gold}` }}
          >
            <div className="flex justify-between items-end">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 flex items-center justify-center bg-white rounded-md">
                  <img src="/img/dtv-logo.jpg" alt="DTV Logo" className="w-10 h-10 object-contain" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-0.5">
                    <span className="text-white text-xl font-black tracking-tight leading-none uppercase">DIGITAL</span>
                    <span className="text-xl font-black tracking-tight leading-none uppercase" style={{ color: theme.gold }}>TWIN VERSE</span>
                  </div>
                  <p 
                    className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                    style={{ color: '#8b6932' /* Muted gold */ }}
                  >
                    Offer of Employment
                  </p>
                </div>
              </div>
              <div className="text-right text-[9px] uppercase tracking-wider space-y-1 font-medium" style={{ color: '#9CA3AF' /* light gray */ }}>
                <p><a href="https://digitaltwinvrs.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>https://digitaltwinvrs.com/</a></p>
                <p><a href="mailto:contactdigitaltwinverse@gmail.com" style={{ color: 'inherit', textDecoration: 'none' }}>contactdigitaltwinverse@gmail.com</a></p>
                <p><a href="mailto:digitaltwinverse@gmail.com" style={{ color: 'inherit', textDecoration: 'none' }}>digitaltwinverse@gmail.com</a></p>
                <p>India</p>
              </div>
            </div>
          </div>

          {/* Content starts below the absolute header band. The header band height is roughly 15mm + 12px + 10mm ~ 35mm. We add margin top to offset it */}
          <div style={{ marginTop: '20mm' }}>
            
            {/* 2. Meta row (Offer ID / Date Issued) */}
            <div className="flex justify-between text-xs mb-10 avoid-break">
              <div>
                <p className="uppercase tracking-[0.08em] mb-1 font-medium" style={{ color: theme.textMuted }}>Offer ID</p>
                <p className="font-medium text-sm" style={{ color: theme.text }}>{offerId}</p>
              </div>
              <div className="text-right">
                <p className="uppercase tracking-[0.08em] mb-1 font-medium" style={{ color: theme.textMuted }}>Date Issued</p>
                <p className="font-medium text-sm" style={{ color: theme.text }}>{today}</p>
              </div>
            </div>

            <div className="text-[13px] leading-relaxed space-y-6 mb-12">
              <p>
                To,<br/>
                <strong className="text-base font-medium" style={{ color: theme.ink }}>{candidate_details?.name || '[Candidate Name]'}</strong><br/>
                <span style={{ color: theme.textMuted }}>{candidate_details?.email || '[Email]'}</span>
              </p>

              <p className="font-medium">
                Subject: Offer of Employment
              </p>

              <p>
                Dear <strong>{candidate_details?.name?.split(' ')[0] || '[First Name]'}</strong>,
              </p>
              
              {/* 3. The hero moment */}
              <div className="p-6 rounded-md my-8" style={{ backgroundColor: theme.paperWarm }}>
                <p className="text-[14px] leading-relaxed">
                  We are pleased to offer you the position of
                </p>
                <p 
                  className="text-[32px] font-semibold tracking-tight leading-tight my-2"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", color: theme.gold }}
                >
                  {position_details?.designation || '[Designation]'}
                </p>
                <p className="text-[14px] leading-relaxed">
                  at Digital Twin Verse.
                </p>
              </div>
              
              <p>
                Based on your profile, skills, experience, and interaction with our team, we believe you can contribute meaningfully to our mission and organization. The terms of your employment are outlined below.
              </p>
            </div>

            {/* 4. Position Details + Compensation */}
            <div className="grid grid-cols-2 gap-6 mb-12 avoid-break" style={{ pageBreakInside: 'avoid' }}>
              <div className="p-6 rounded-lg" style={{ border: `1px solid ${theme.hairline}` }}>
                <h3 className="text-[10px] uppercase tracking-widest font-semibold mb-5" style={{ color: theme.textMuted }}>Position Details</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: theme.hairline }}>
                    <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: theme.textMuted }}>Role</span>
                    <span className="text-[13px] font-medium">{position_details?.designation || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: theme.hairline }}>
                    <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: theme.textMuted }}>Type</span>
                    <span className="text-[13px] font-medium">{position_details?.employment_type || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: theme.hairline }}>
                    <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: theme.textMuted }}>Mode</span>
                    <span className="text-[13px] font-medium">{position_details?.work_mode || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: theme.textMuted }}>Joining Date</span>
                    <span className="text-[13px] font-medium">{joinDate}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg" style={{ border: `1px solid ${theme.hairline}` }}>
                <h3 className="text-[10px] uppercase tracking-widest font-semibold mb-5" style={{ color: theme.textMuted }}>Compensation</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: theme.hairline }}>
                    <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: theme.textMuted }}>Type</span>
                    <span className="text-[13px] font-medium">{compensation_details?.salary_type || '-'}</span>
                  </div>
                  
                  {compensation_details?.salary_type !== 'Unpaid' && compensation_details?.salary_type !== 'Equity' && (
                    <>
                      <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: theme.hairline }}>
                        <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: theme.textMuted }}>Currency</span>
                        <span className="text-[13px] font-medium">{compensation_details?.currency || 'INR'}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[12px] uppercase tracking-wider font-medium" style={{ color: theme.ink }}>Total Amount</span>
                        <span className="text-[15px] font-semibold" style={{ color: theme.ink }}>
                          {compensation_details?.currency} {compensation_details?.amount || '0'}
                        </span>
                      </div>
                    </>
                  )}

                  {compensation_details?.salary_type === 'Unpaid' && (
                    <div className="pt-2 text-center">
                      <span 
                        className="inline-block px-3 py-1 text-[11px] font-medium rounded-full"
                        style={{ border: `1px solid ${theme.hairline}`, color: theme.text }}
                      >
                        This is an unpaid position.
                      </span>
                    </div>
                  )}
                  
                  {compensation_details?.salary_type === 'Equity' && (
                    <div className="pt-2">
                      <span className="text-[12px] font-medium leading-relaxed">
                        Compensation will be provided as equity/stock options as per a separate agreement.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 5. Key Responsibilities */}
            {responsibilities?.length > 0 && (
              <div className="mb-12 avoid-break" style={{ pageBreakInside: 'avoid' }}>
                <h3 className="text-[11px] uppercase tracking-widest font-semibold mb-5" style={{ color: theme.ink, fontFamily: "'Space Grotesk', sans-serif" }}>Key Responsibilities</h3>
                <ul className="text-[13px] space-y-3">
                  {responsibilities.map((r: string, i: number) => (
                    <li key={i} className="flex items-start">
                      <span className="mr-3 font-bold" style={{ color: theme.gold }}>—</span>
                      <span style={{ color: theme.text }}>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 6. Terms & Conditions */}
            {enabledClauses.length > 0 && (
              <div className="mb-12">
                <div className="w-full mb-8" style={{ borderTop: `1px solid ${theme.hairline}` }}></div>
                <h3 className="text-[11px] uppercase tracking-widest font-semibold mb-6" style={{ color: theme.ink, fontFamily: "'Space Grotesk', sans-serif" }}>Terms & Conditions</h3>
                <div className="space-y-8">
                  {enabledClauses.map((c: any) => (
                    <div key={c.id} className="pl-4 avoid-break" style={{ borderLeft: `1px solid ${theme.hairline}`, pageBreakInside: 'avoid' }}>
                      <h4 className="text-[11px] uppercase tracking-[0.05em] font-medium mb-2" style={{ color: theme.text }}>{c.title}</h4>
                      <p className="text-[13px] leading-relaxed" style={{ color: theme.textMuted }}>{c.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. Signature block and Footer wrapped to avoid page break */}
            <div className="avoid-break" style={{ pageBreakInside: 'avoid' }}>
              <div className="mt-16 flex justify-between items-end pt-10">
                 <div className="w-56 relative">
                    {/* Seal */}
                    <div 
                      className="absolute left-10 -top-8 w-24 h-24 rounded-full flex items-center justify-center"
                      style={{ border: `2px solid ${theme.gold}`, opacity: 0.45, zIndex: 0 }}
                    >
                      <div className="w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center text-[11px] font-bold uppercase tracking-widest text-center" style={{ borderColor: theme.gold, color: theme.gold }}>
                        DTV<br/>Seal
                      </div>
                    </div>

                    <div className="h-16 flex items-end pb-2 relative z-10">
                      <span className="text-[36px]" style={{ fontFamily: "'Brush Script MT', cursive", color: theme.ink }}>Kumar Kartikey</span>
                    </div>
                    <div className="pt-3" style={{ borderTop: `1px solid ${theme.hairline}` }}>
                      <p className="font-medium text-[13px]" style={{ color: theme.text }}>Kumar Kartikey</p>
                      <p className="text-[10px] uppercase tracking-widest font-medium mt-1" style={{ color: theme.textMuted }}>Founder & CEO</p>
                    </div>
                 </div>

                 {/* QR Code in the middle */}
                 <div className="flex flex-col items-center justify-end pb-2">
                    <p className="text-[9px] uppercase tracking-widest font-medium text-gray-400 mb-2">Scan to Verify</p>
                    <div className="p-1.5 rounded-sm" style={{ backgroundColor: theme.paper, border: `1px solid ${theme.hairline}` }}>
                      <QRCodeCanvas value={verifyUrl} size={64} level="M" fgColor={theme.ink} />
                    </div>
                 </div>

                 <div className="w-56">
                    <div className="h-16 flex items-end pb-2"></div>
                    <div className="pt-3" style={{ borderTop: `1px dashed ${theme.hairline}` }}>
                      <p className="font-medium text-[13px]" style={{ color: theme.text }}>{candidate_details?.name || 'Candidate Name'}</p>
                      <p className="text-[10px] uppercase tracking-widest font-medium mt-1" style={{ color: theme.textMuted }}>Accepted & Signed</p>
                    </div>
                 </div>
              </div>

              <div className="mt-8 mb-4"></div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default LivePreview;
