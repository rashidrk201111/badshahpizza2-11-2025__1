import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Printer, X as XIcon, FileText, Receipt } from 'lucide-react';
import { formatINR } from '../../lib/currency';

interface InvoiceViewProps {
  invoiceId: string;
  onClose: () => void;
}

interface CompanyProfile {
  company_name: string;
  gst_number: string;
  pan_number: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  terms_conditions: string;
  logo_url: string;
  tax_name?: string;
  default_tax_rate?: number;
}

export function InvoiceView({ invoiceId, onClose }: InvoiceViewProps) {
  const [loading, setLoading] = useState(true);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');

  useEffect(() => {
    loadInvoiceData();
  }, [invoiceId]);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page {
          size: 80mm auto;
          margin: 5mm;
        }
        body * {
          visibility: hidden;
        }
        #invoice-content, #invoice-content * {
          visibility: visible;
        }
        #invoice-content {
          position: absolute;
          left: 0;
          top: 0;
          width: 80mm;
          padding: 0;
          margin: 0;
          font-weight: 700;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .print\\:hidden {
          display: none !important;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        ${printFormat === 'thermal' ? `
          @page {
            size: 80mm auto;
            margin: 5mm;
          }
        ` : `
          @page {
            size: A4;
            margin: 20mm;
          }
        `}
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [printFormat]);

  const loadInvoiceData = async () => {
    try {
      const invoiceRes = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          items:invoice_items(
            *,
            product:products(*)
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (invoiceRes.error) throw invoiceRes.error;

      const profileRes = await supabase
        .from('company_profile')
        .select('*')
        .maybeSingle();

      setInvoiceData(invoiceRes.data);
      setCompanyProfile(profileRes.data);
    } catch (error) {
      console.error('Error loading invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="text-center">Loading invoice...</div>
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    return null;
  }

  const { customer, items } = invoiceData;
  const taxName = companyProfile?.tax_name || 'GST';
  const taxRate = companyProfile?.default_tax_rate || 5;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8">
        <div className="p-6 border-b-4 border-blue-600 print:hidden bg-gradient-to-r from-blue-50 to-slate-50">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Invoice Preview</h2>
              <p className="text-sm text-slate-600">Choose your print format below</p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition shadow-lg hover:shadow-xl"
            >
              <XIcon className="w-4 h-4 flex-shrink-0" />
              <span>Close</span>
            </button>
          </div>

          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setPrintFormat('thermal')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-semibold rounded-lg transition ${
                printFormat === 'thermal'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-blue-400'
              }`}
            >
              <Receipt className="w-5 h-5" />
              Thermal (80mm)
            </button>
            <button
              onClick={() => setPrintFormat('a4')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-semibold rounded-lg transition ${
                printFormat === 'a4'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-blue-400'
              }`}
            >
              <FileText className="w-5 h-5" />
              A4 Format
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-lg transition shadow-lg hover:shadow-xl"
          >
            <Printer className="w-5 h-5" />
            Print Invoice
          </button>
        </div>

        <div className="overflow-auto max-h-[70vh] print:max-h-none print:overflow-visible">
          <div
            id="invoice-content"
            className="p-8 print:p-0 bg-white"
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              maxWidth: '80mm',
              margin: '0 auto',
              fontSize: '13px',
              lineHeight: '1.6',
              fontWeight: '700',
              color: '#000',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale'
            }}
          >
            {/* Header */}
            <div style={{
              textAlign: 'center',
              marginBottom: '10px',
              paddingBottom: '10px',
              borderBottom: '3px solid #000'
            }}>
              {companyProfile?.logo_url && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                  <img
                    src={companyProfile.logo_url}
                    alt="Company Logo"
                    style={{ height: '48px', width: '48px', objectFit: 'contain' }}
                  />
                </div>
              )}
              <h1 style={{ fontSize: '20px', marginBottom: '8px', fontWeight: '800', letterSpacing: '0.5px' }}>
                {companyProfile?.company_name || 'Company Name'}
              </h1>
              {companyProfile && (
                <div style={{ fontSize: '11px', fontWeight: '700', lineHeight: '1.5' }}>
                  {companyProfile.address_line1 && <div>{companyProfile.address_line1}</div>}
                  {companyProfile.phone && <div>Tel: {companyProfile.phone}</div>}
                  {companyProfile.gst_number && <div>GST: {companyProfile.gst_number}</div>}
                </div>
              )}
              <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '8px', letterSpacing: '1px' }}>INVOICE</div>
            </div>

            {/* Invoice Info */}
            <div style={{
              marginBottom: '10px',
              paddingBottom: '10px',
              borderBottom: '1px solid #ddd',
              fontSize: '12px',
              fontWeight: '700'
            }}>
              <div style={{ marginBottom: '5px' }}>
                <span style={{ fontWeight: '700', display: 'inline-block', width: '90px' }}>Invoice:</span>
                {invoiceData.invoice_number || 'N/A'}
              </div>
              <div style={{ marginBottom: '5px' }}>
                <span style={{ fontWeight: '700', display: 'inline-block', width: '90px' }}>Date:</span>
                {new Date(invoiceData.created_at).toLocaleDateString('en-IN')}
              </div>
              <div style={{ marginBottom: '5px' }}>
                <span style={{ fontWeight: '700', display: 'inline-block', width: '90px' }}>Time:</span>
                {new Date(invoiceData.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </div>
              {customer?.name && (
                <div style={{ marginBottom: '5px' }}>
                  <span style={{ fontWeight: '700', display: 'inline-block', width: '90px' }}>Customer:</span>
                  {customer.name}
                </div>
              )}
              {customer?.phone && (
                <div style={{ marginBottom: '5px' }}>
                  <span style={{ fontWeight: '700', display: 'inline-block', width: '90px' }}>Phone:</span>
                  {customer.phone}
                </div>
              )}
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', marginBottom: '10px', borderCollapse: 'collapse', fontWeight: '700' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0', fontSize: '12px', fontWeight: '700' }}>Item</th>
                  <th style={{ textAlign: 'center', padding: '6px 0', fontSize: '12px', width: '40px', fontWeight: '700' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', fontSize: '12px', width: '70px', fontWeight: '700' }}>Price</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', fontSize: '12px', width: '70px', fontWeight: '700' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, index: number) => (
                  <tr key={index} style={{ borderBottom: '1px dashed #ddd' }}>
                    <td style={{ padding: '6px 0', fontSize: '13px', fontWeight: '700' }}>
                      {item.menu_item_name || item.product_name || item.product?.description || item.product?.name || 'N/A'}
                    </td>
                    <td style={{ padding: '6px 0', fontSize: '13px', textAlign: 'center', fontWeight: '700' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '6px 0', fontSize: '13px', textAlign: 'right', fontWeight: '700' }}>
                      ₹{parseFloat(String(item.unit_price || 0)).toFixed(2)}
                    </td>
                    <td style={{ padding: '6px 0', fontSize: '13px', textAlign: 'right', fontWeight: '700' }}>
                      ₹{parseFloat(String(item.total || 0)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{
              marginTop: '10px',
              paddingTop: '10px',
              borderTop: '1px solid #000',
              fontWeight: '700'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '13px',
                fontWeight: '700'
              }}>
                <span>Subtotal:</span>
                <span>₹{invoiceData.subtotal.toFixed(2)}</span>
              </div>
              {Number(invoiceData.discount || 0) > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#10b981'
                }}>
                  <span>Discount{invoiceData.discount_reason ? ` (${invoiceData.discount_reason})` : ''}:</span>
                  <span>-₹{Number(invoiceData.discount).toFixed(2)}</span>
                </div>
              )}
              {invoiceData.tax > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: '700'
                }}>
                  <span>{taxName} ({taxRate}%):</span>
                  <span>₹{invoiceData.tax.toFixed(2)}</span>
                </div>
              )}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '16px',
                fontWeight: '800',
                paddingTop: '8px',
                borderTop: '2px double #000'
              }}>
                <span>TOTAL:</span>
                <span>₹{invoiceData.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              textAlign: 'center',
              marginTop: '15px',
              paddingTop: '15px',
              borderTop: '1px dashed #000',
              fontSize: '14px',
              fontWeight: '700'
            }}>
              Thank you!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
