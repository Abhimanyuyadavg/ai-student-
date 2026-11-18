import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FileCheck2,
  KeyRound,
  Landmark,
  Lock,
  Phone,
  Printer,
  QrCode,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import {
  PaymentGatewayPublicConfig,
  PdfNoteItem,
  PdfPaymentMethod,
  PdfPaymentOrder,
} from '../types/index.ts';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function previewGstSplit(priceInr: number, config: PaymentGatewayPublicConfig | null) {
  const taxEnabled = config?.taxConfig?.taxEnabled ?? true;
  const gstRatePercent = taxEnabled ? Number(config?.taxConfig?.gstRatePercent ?? 5) : 0;
  const taxMode = config?.taxConfig?.taxMode || 'inclusive';

  if (!taxEnabled || gstRatePercent <= 0) {
    return {
      baseAmount: round2(priceInr),
      cgstAmount: 0,
      sgstAmount: 0,
      taxAmount: 0,
      totalAmount: round2(priceInr),
      gstRatePercent: 0,
      taxMode,
    };
  }
  if (taxMode === 'exclusive') {
    const baseAmount = round2(priceInr);
    const totalTax = round2((baseAmount * gstRatePercent) / 100);
    const cgstAmount = round2(totalTax / 2);
    const sgstAmount = round2(totalTax - cgstAmount);
    return {
      baseAmount,
      cgstAmount,
      sgstAmount,
      taxAmount: totalTax,
      totalAmount: round2(baseAmount + totalTax),
      gstRatePercent,
      taxMode,
    };
  }
  const totalAmount = round2(priceInr);
  const baseAmount = round2(totalAmount / (1 + gstRatePercent / 100));
  const totalTax = round2(totalAmount - baseAmount);
  const cgstAmount = round2(totalTax / 2);
  const sgstAmount = round2(totalTax - cgstAmount);
  return {
    baseAmount,
    cgstAmount,
    sgstAmount,
    taxAmount: totalTax,
    totalAmount,
    gstRatePercent,
    taxMode,
  };
}

interface PdfCheckoutModalProps {
  open: boolean;
  item: PdfNoteItem | null;
  gatewayConfig: PaymentGatewayPublicConfig | null;
  existingOrders: PdfPaymentOrder[];
  onClose: () => void;
  onOrdersUpdated: () => Promise<void>;
  onOpenInvoice: (order: PdfPaymentOrder) => void;
  onSwitchToPromoCode?: (item: PdfNoteItem) => void;
}

export const PdfCheckoutModal: React.FC<PdfCheckoutModalProps> = ({
  open,
  item,
  gatewayConfig,
  existingOrders,
  onClose,
  onOrdersUpdated,
  onOpenInvoice,
  onSwitchToPromoCode,
}) => {
  const { appUser, getApiHeaders, showToast } = useApp();

  const [method, setMethod] = useState<PdfPaymentMethod>('upi_qr');
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [activeOrder, setActiveOrder] = useState<PdfPaymentOrder | null>(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [payerName, setPayerName] = useState(appUser?.displayName || '');
  const [guardianConfirmed, setGuardianConfirmed] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const relatedOrder = useMemo(() => {
    if (!item) return null;
    if (activeOrder && activeOrder.pdfId === item.id) return activeOrder;
    return existingOrders.find((o) => o.pdfId === item.id) || null;
  }, [item, activeOrder, existingOrders]);

  if (!open || !item) return null;

  const upiId = gatewayConfig?.upiId || '7492996601@naviaxis';
  const supportPhone = gatewayConfig?.supportPhone || '7492996601';
  const qrImgUrl =
    gatewayConfig?.upiQrImageUrl || '/assets/aistudio/Screenshot_20261107_145547_2_a29f4013.jpg';
  const razorpayReady = Boolean(gatewayConfig?.razorpayConfigured && gatewayConfig?.razorpayKeyId);

  const previewTax = previewGstSplit(item.priceInr, gatewayConfig);
  const displayBreakdown = relatedOrder
    ? {
        baseAmount: relatedOrder.baseAmount,
        cgstAmount: relatedOrder.cgstAmount,
        sgstAmount: relatedOrder.sgstAmount,
        taxAmount: relatedOrder.taxAmount,
        totalAmount: relatedOrder.totalAmount,
        gstRatePercent: relatedOrder.taxRatePercent,
        taxMode: relatedOrder.taxMode,
      }
    : previewTax;

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied: ${text}`, 'success');
    } catch {
      showToast(`${label}: ${text}`, 'info');
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleStartOrder = async (chosenMethod: PdfPaymentMethod = method) => {
    setErrorMsg('');
    setCreatingOrder(true);
    try {
      const headers = await getApiHeaders();
      const res = await fetch('/api/pdf-payments/create-order', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          pdfId: item.id,
          paymentMethod: chosenMethod,
          studentName: appUser?.displayName || 'Student',
          studentContact: appUser?.email || appUser?.phone || appUser?.uid || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not initialize payment order.');
      }
      if (data.alreadyUnlocked) {
        await onOrdersUpdated();
        showToast('This PDF is already unlocked in your account!', 'success');
        onClose();
        return;
      }
      const createdOrder = data.order as PdfPaymentOrder;
      setActiveOrder(createdOrder);

      // If Razorpay online gateway is configured on server and chosen
      if (chosenMethod.startsWith('razorpay_') && createdOrder.gatewayOrderId && gatewayConfig?.razorpayKeyId) {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          throw new Error('Could not load online payment checkout SDK. Please use UPI QR below.');
        }
        const options = {
          key: gatewayConfig.razorpayKeyId,
          amount: Math.round(createdOrder.totalAmount * 100),
          currency: 'INR',
          name: 'AI STUDENTS',
          description: `${item.subjectNameEn} Ch ${item.chapterNumber} Study PDF`,
          order_id: createdOrder.gatewayOrderId,
          prefill: {
            name: appUser?.displayName || '',
            email: appUser?.email || '',
            contact: appUser?.phone || '',
          },
          handler: async (response: any) => {
            try {
              const vHeaders = await getApiHeaders();
              const vRes = await fetch('/api/pdf-payments/verify-gateway', {
                method: 'POST',
                headers: vHeaders,
                body: JSON.stringify({
                  orderId: createdOrder.id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              });
              const vData = await vRes.json();
              if (!vRes.ok) {
                throw new Error(vData.error || 'Gateway signature verification failed.');
              }
              setActiveOrder(vData.order);
              await onOrdersUpdated();
              showToast('Payment verified! Lifetime access unlocked.', 'success');
            } catch (err: any) {
              setErrorMsg(err?.message || 'Payment verification failed; PDF remains locked.');
            }
          },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        await onOrdersUpdated();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to start payment order.');
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleSubmitUpiProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relatedOrder) {
      setErrorMsg('Please generate a Payment Order Reference first.');
      return;
    }
    setErrorMsg('');
    setSubmittingProof(true);
    try {
      const headers = await getApiHeaders();
      const res = await fetch('/api/pdf-payments/submit-upi-proof', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          orderId: relatedOrder.id,
          utrNumber: utrNumber.trim(),
          payerName: payerName.trim(),
          guardianConfirmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not submit UPI UTR reference.');
      }
      setActiveOrder(data.order);
      await onOrdersUpdated();
      showToast('UTR submitted! PDF unlocks automatically once verified by Guardian/Admin.', 'info');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit UPI reference.');
    } finally {
      setSubmittingProof(false);
    }
  };

  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    gatewayConfig?.guardianMerchantName || 'ABHIMANYU OFFICIAL HACKER'
  )}&am=${displayBreakdown.totalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
    `${relatedOrder?.orderNumber || item.id} AI STUDENTS PDF`
  )}`;

  const isVerified = relatedOrder?.paymentStatus === 'verified';
  const isAwaiting = relatedOrder?.paymentStatus === 'awaiting_verification';
  const isFailed = relatedOrder?.paymentStatus === 'failed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl my-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Server-Verified Premium Notes Checkout · Lifetime Unlock</span>
            </div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Ch {item.chapterNumber}: {item.chapterTitleEn}
            </h2>
            <p className="text-xs text-slate-500">
              {item.subjectNameEn} ({item.subjectNameHi}) · {item.chapterTitleHi}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Status Banner for Verified / Awaiting / Failed */}
          {isVerified && relatedOrder && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div>
                  <p className="text-sm font-bold">Payment Verified — Lifetime PDF Unlocked!</p>
                  <p className="text-xs">Invoice: {relatedOrder.invoiceNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenInvoice(relatedOrder)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>View / Download Tax Invoice</span>
              </button>
            </div>
          )}

          {isAwaiting && relatedOrder && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Awaiting Guardian / Server Verification (PDF Remains Locked)</span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Order <span className="font-mono font-semibold">{relatedOrder.orderNumber}</span> · UTR:{' '}
                <span className="font-mono font-semibold">{relatedOrder.utrNumber}</span>. PDF access unlocks automatically once Guardian/Admin verifies this transaction. Need help? Support Phone: <span className="font-mono font-semibold">{supportPhone}</span>
              </p>
            </div>
          )}

          {isFailed && relatedOrder && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-1.5">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-sm">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Previous Payment Failed — PDF Remains Locked</span>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                Reason: {relatedOrder.failureReason || 'Transaction could not be verified.'} You can generate a fresh order and retry payment below.
              </p>
            </div>
          )}

          {/* Statutory Tax & Price Summary (No arbitrary tax!) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Fee &amp; Statutory GST Breakdown ({displayBreakdown.taxMode === 'inclusive' ? 'GST Inclusive' : 'GST Exclusive'})</span>
              <span className="font-mono">HSN/SAC: {gatewayConfig?.taxConfig?.sacHsnCode || '998431'}</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 pt-1">
              <div className="flex justify-between">
                <span>Taxable Study Material Fee</span>
                <span className="font-mono tabular-nums">₹{displayBreakdown.baseAmount.toFixed(2)}</span>
              </div>
              {displayBreakdown.gstRatePercent > 0 ? (
                <>
                  <div className="flex justify-between text-slate-500">
                    <span>CGST ({(displayBreakdown.gstRatePercent / 2).toFixed(1)}%)</span>
                    <span className="font-mono tabular-nums">₹{displayBreakdown.cgstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>SGST ({(displayBreakdown.gstRatePercent / 2).toFixed(1)}%)</span>
                    <span className="font-mono tabular-nums">₹{displayBreakdown.sgstAmount.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-500">
                  <span>Tax (GST 0% Exempt)</span>
                  <span className="font-mono tabular-nums">₹0.00</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-sm font-bold text-slate-900 dark:text-white">
                <span>Total Payable (One-Time Lifetime Access)</span>
                <span className="font-mono text-indigo-700 dark:text-indigo-400 tabular-nums">
                  ₹{displayBreakdown.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {!isVerified && (
            <>
              {onSwitchToPromoCode && gatewayConfig?.promoCodeEnabled !== false && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-emerald-900 dark:text-emerald-200">
                    <p className="font-bold">Have an authorized Free Access Code?</p>
                    <p className="text-[11px] opacity-90">Unlock this PDF instantly at ₹0 with backend verification.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSwitchToPromoCode(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Enter Free Access Code</span>
                  </button>
                </div>
              )}

              {/* Payment Method Tabs */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Choose Payment Method
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'upi_qr', label: 'UPI QR Scan', icon: QrCode },
                      { id: 'upi_id', label: 'UPI ID Pay', icon: Smartphone },
                      { id: 'upi_phone', label: 'Phone Number UPI', icon: Phone },
                      { id: 'razorpay_card', label: 'Debit / Credit Card', icon: CreditCard },
                      { id: 'razorpay_netbanking', label: 'Net Banking', icon: Landmark },
                      { id: 'razorpay_upi', label: 'Online UPI Gateway', icon: ShieldCheck },
                    ] as const
                  ).map((opt) => {
                    const Icon = opt.icon;
                    const active = method === opt.id;
                    const isRp = opt.id.startsWith('razorpay_');
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setMethod(opt.id);
                          setErrorMsg('');
                        }}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left text-xs font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate">{opt.label}</p>
                          {isRp && !razorpayReady && (
                            <p className="text-[10px] font-normal text-amber-600 dark:text-amber-400 truncate">
                              Needs gateway keys
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Razorpay Panel */}
              {method.startsWith('razorpay_') ? (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Online Card / Net Banking / Gateway Checkout
                  </h3>
                  {razorpayReady ? (
                    <>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Pay securely via Razorpay using Debit Card, Credit Card, Net Banking, or UPI. Verification happens via HMAC-SHA256 on our backend server and unlocks your PDF immediately.
                      </p>
                      <button
                        type="button"
                        disabled={creatingOrder}
                        onClick={() => handleStartOrder(method)}
                        className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-60"
                      >
                        {creatingOrder
                          ? 'Connecting to Gateway...'
                          : `Pay ₹${displayBreakdown.totalAmount.toFixed(2)} Online Now`}
                      </button>
                    </>
                  ) : (
                    <div className="space-y-2.5">
                      <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                        Automated Card &amp; Net Banking checkout requires Razorpay merchant credentials (
                        <span className="font-mono">RAZORPAY_KEY_ID</span> /{' '}
                        <span className="font-mono">RAZORPAY_KEY_SECRET</span>) in the backend environment. Please switch to{' '}
                        <strong>UPI QR Scan</strong>, <strong>UPI ID</strong> (<span className="font-mono">{upiId}</span>), or{' '}
                        <strong>Phone UPI</strong> (<span className="font-mono">{supportPhone}</span>) right now.
                      </p>
                      <button
                        type="button"
                        onClick={() => setMethod('upi_qr')}
                        className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
                      >
                        Switch to Guardian-Verified UPI QR
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Guardian-Operated UPI QR / UPI ID / Phone Payment Panel */
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  <div className="md:col-span-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col items-center text-center space-y-3">
                    <div className="w-44 h-44 bg-white rounded-xl border border-slate-200 p-2 flex items-center justify-center overflow-hidden">
                      <img
                        src={qrImgUrl}
                        alt="Official AI STUDENTS UPI QR Code"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="w-full space-y-1.5 text-xs">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {gatewayConfig?.guardianMerchantName || 'ABHIMANYU OFFICIAL HACKER'}
                      </p>
                      <button
                        type="button"
                        onClick={() => copyText(upiId, 'UPI ID')}
                        className="w-full inline-flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[11px] cursor-pointer"
                      >
                        <span className="truncate">{upiId}</span>
                        <Copy className="w-3.5 h-3.5 shrink-0 text-indigo-700 dark:text-indigo-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(supportPhone, 'UPI / Support Phone')}
                        className="w-full inline-flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[11px] cursor-pointer"
                      >
                        <span>Phone: {supportPhone}</span>
                        <Copy className="w-3.5 h-3.5 shrink-0 text-indigo-700 dark:text-indigo-400" />
                      </button>
                      <a
                        href={upiDeepLink}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg hover:bg-indigo-100"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in UPI App (₹{displayBreakdown.totalAmount})</span>
                      </a>
                    </div>
                  </div>

                  <div className="md:col-span-7 space-y-3">
                    {(!relatedOrder || isFailed) && (
                      <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/30 space-y-2.5">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          Step 1: Create Your Server Payment Order
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          Generate a tracked Order Reference before transferring ₹{displayBreakdown.totalAmount.toFixed(2)}. Guardian verification unlocks lifetime access with a Tax Invoice.
                        </p>
                        <button
                          type="button"
                          disabled={creatingOrder}
                          onClick={() => handleStartOrder(method)}
                          className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-60"
                        >
                          {creatingOrder ? 'Generating Order...' : 'Generate Order & Continue'}
                        </button>
                      </div>
                    )}

                    {relatedOrder && !isFailed && (
                      <form
                        onSubmit={handleSubmitUpiProof}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900 dark:text-white">
                            Step 2: Submit UPI UTR After Paying ₹{relatedOrder.totalAmount.toFixed(2)}
                          </span>
                          <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-400">
                            {relatedOrder.orderNumber}
                          </span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                            UPI UTR / Reference Number (12 digits / min 8 chars) *
                          </label>
                          <input
                            type="text"
                            required
                            minLength={8}
                            value={utrNumber}
                            onChange={(e) => setUtrNumber(e.target.value)}
                            placeholder="e.g. 632189401257"
                            className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                            Payer Name (as on UPI Account)
                          </label>
                          <input
                            type="text"
                            value={payerName}
                            onChange={(e) => setPayerName(e.target.value)}
                            placeholder="Student or Guardian Name"
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                          />
                        </div>

                        <label className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            required
                            checked={guardianConfirmed}
                            onChange={(e) => setGuardianConfirmed(e.target.checked)}
                            className="mt-0.5 rounded border-slate-300 accent-indigo-700"
                          />
                          <span>
                            I confirm this ₹{relatedOrder.totalAmount.toFixed(2)} UPI payment was completed under Guardian consent. I understand the PDF remains locked until server verification succeeds.
                          </span>
                        </label>

                        <button
                          type="submit"
                          disabled={submittingProof}
                          className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-60"
                        >
                          {submittingProof
                            ? 'Submitting Reference...'
                            : isAwaiting
                            ? 'Update UTR Reference'
                            : 'Submit Payment Reference for Verification'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// TAX INVOICE / PAYMENT RECEIPT MODAL
// ---------------------------------------------------------------------------
interface PdfInvoiceModalProps {
  open: boolean;
  order: PdfPaymentOrder | null;
  gatewayConfig: PaymentGatewayPublicConfig | null;
  onClose: () => void;
}

export const PdfInvoiceModal: React.FC<PdfInvoiceModalProps> = ({
  open,
  order,
  gatewayConfig,
  onClose,
}) => {
  const { getApiHeaders, showToast } = useApp();
  const [downloading, setDownloading] = useState(false);

  if (!open || !order) return null;

  const handleDownloadInvoicePdf = async () => {
    setDownloading(true);
    try {
      const headers = await getApiHeaders();
      const reqHeaders: Record<string, string> = {};
      if (headers['Authorization']) reqHeaders['Authorization'] = headers['Authorization'];
      const res = await fetch(`/api/pdf-payments/invoice/${encodeURIComponent(order.id)}/pdf`, {
        headers: reqHeaders,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Could not download tax invoice.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${order.invoiceNumber || order.orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Tax Invoice PDF downloaded.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Invoice download failed.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrintInvoice = () => {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (!doc) {
      printFrame.remove();
      return;
    }

    const sellerName = gatewayConfig?.taxConfig?.sellerLegalName || 'AI STUDENTS · ABHIMANYU OFFICIAL HACKER';
    const gstin = gatewayConfig?.taxConfig?.sellerGstin || 'Unregistered / Small Supplier';
    const sac = gatewayConfig?.taxConfig?.sacHsnCode || '998431';

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><title>Tax Invoice ${order.invoiceNumber || order.orderNumber}</title>
      <style>
        body { font-family: system-ui, sans-serif; color: #0f172a; padding: 32px; max-width: 720px; margin: 0 auto; }
        .head { display: flex; justify-content: space-between; border-bottom: 2px solid #4338ca; padding-bottom: 16px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border-bottom: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-size: 13px; }
        th { background: #f8fafc; }
        .right { text-align: right; }
        .total { font-weight: 700; font-size: 15px; color: #312e81; }
      </style></head><body>
      <div class="head">
        <div>
          <h1 style="margin:0;color:#312e81;font-size:20px;">AI STUDENTS — TAX INVOICE</h1>
          <p style="margin:4px 0 0;font-size:12px;color:#475569;">Supplier: ${sellerName}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#475569;">GSTIN: ${gstin}</p>
        </div>
        <div style="text-align:right;font-size:12px;">
          <p style="margin:0;"><strong>Invoice No:</strong> ${order.invoiceNumber || 'Issued'}</p>
          <p style="margin:3px 0 0;"><strong>Order No:</strong> ${order.orderNumber}</p>
          <p style="margin:3px 0 0;"><strong>Date:</strong> ${new Date(order.verifiedAt || order.createdAt).toLocaleString()}</p>
        </div>
      </div>
      <p style="font-size:13px;"><strong>Billed To:</strong> ${order.studentName} (${order.studentContact})</p>
      <p style="font-size:13px;"><strong>Payment Ref / UTR:</strong> ${order.gatewayPaymentId || order.utrNumber || 'Verified'} · <strong>Provider:</strong> ${order.paymentProvider}</p>
      <table>
        <thead><tr><th>Description</th><th>HSN/SAC</th><th class="right">Amount (INR)</th></tr></thead>
        <tbody>
          <tr><td>${order.pdfTitle} (${order.subjectName} — Lifetime PDF)</td><td>${sac}</td><td class="right">${order.baseAmount.toFixed(2)}</td></tr>
          <tr><td>CGST (${(order.taxRatePercent / 2).toFixed(1)}%)</td><td>-</td><td class="right">${order.cgstAmount.toFixed(2)}</td></tr>
          <tr><td>SGST (${(order.taxRatePercent / 2).toFixed(1)}%)</td><td>-</td><td class="right">${order.sgstAmount.toFixed(2)}</td></tr>
          <tr><td class="total" colspan="2">Total Paid (Server Verified)</td><td class="right total">INR ${order.totalAmount.toFixed(2)}</td></tr>
        </tbody>
      </table>
      <p style="margin-top:24px;font-size:11px;color:#64748b;">Computer-generated Tax Invoice for AI STUDENTS Digital Study Notes. Official Support: 7492996601</p>
      </body></html>`);
    doc.close();
    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } finally {
        setTimeout(() => printFrame.remove(), 1500);
      }
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden my-auto">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              Verified Official Payment Receipt
            </p>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Tax Invoice · {order.invoiceNumber || order.orderNumber}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close invoice"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-slate-400">Billed To</p>
              <p className="font-bold text-slate-900 dark:text-white">{order.studentName}</p>
              <p className="text-slate-500">{order.studentContact}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400">Verified On</p>
              <p className="font-semibold text-slate-900 dark:text-white">
                {new Date(order.verifiedAt || order.updatedAt).toLocaleString()}
              </p>
              <p className="font-mono text-indigo-700 dark:text-indigo-400">{order.orderNumber}</p>
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <tr>
                  <th className="py-2.5 px-3 text-left font-semibold">Item</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="py-2.5 px-3">
                    <p className="font-semibold text-slate-900 dark:text-white">{order.pdfTitle}</p>
                    <p className="text-slate-500">
                      {order.subjectName} · SAC {gatewayConfig?.taxConfig?.sacHsnCode || '998431'}
                    </p>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    ₹{order.baseAmount.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-500">CGST ({(order.taxRatePercent / 2).toFixed(1)}%)</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">₹{order.cgstAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-500">SGST ({(order.taxRatePercent / 2).toFixed(1)}%)</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">₹{order.sgstAmount.toFixed(2)}</td>
                </tr>
                <tr className="bg-indigo-50/70 dark:bg-indigo-950/40 font-bold text-slate-900 dark:text-white">
                  <td className="py-3 px-3">Total Paid (INR)</td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-indigo-700 dark:text-indigo-400 tabular-nums">
                    ₹{order.totalAmount.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-[11px] text-slate-500 space-y-0.5">
            <p>
              <strong>Payment Method:</strong> {order.paymentProvider} ·{' '}
              <strong>UTR / Transaction ID:</strong>{' '}
              <span className="font-mono">{order.gatewayPaymentId || order.utrNumber || 'Verified'}</span>
            </p>
            <p>
              <strong>Supplier:</strong>{' '}
              {gatewayConfig?.taxConfig?.sellerLegalName || 'AI STUDENTS · ABHIMANYU OFFICIAL HACKER'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handlePrintInvoice}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              type="button"
              disabled={downloading}
              onClick={handleDownloadInvoicePdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Downloading...' : 'Download Official Invoice PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
