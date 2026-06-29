'use client';

import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Phone,
  Coins,
  Clock,
  TrendingUp,
  PhoneCall,
  CreditCard,
  History,
  Download,
  Lock,
  LogOut,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

interface Stats {
  creditsRemaining: number;
  todayCalls: number;
  minutesUsedToday: number;
  totalCalls: number;
  activeCalls: number;
  todayCreditsUsed: number;
}

interface CallLog {
  id: string;
  call_id: string;
  customer_number: string;
  agent_name: string;
  duration: number;
  credits_used: number;
  status: string;
  recording_url: string | null;
  transcript: string | null;
  started_at: string;
}

interface ActiveCall {
  call_id: string;
  customer_number: string;
  agent_name: string;
  started_at: string;
  duration?: number;
  credits_used?: number;
  transcript_preview?: string;
  recording_url?: string | null;
}

interface PaymentLog {
  id: string;
  order_id: string;
  amount: number;
  gst: number;
  status: string;
  created_at: string;
}

export default function Home() {
  const [token, setToken] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [loggingIn, setLoggingIn] = useState<boolean>(false);
  const [stats, setStats] = useState<Stats>({
    creditsRemaining: 0,
    todayCalls: 0,
    minutesUsedToday: 0,
    totalCalls: 0,
    activeCalls: 0,
    todayCreditsUsed: 0,
  });
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [callHistory, setCallHistory] = useState<CallLog[]>([]);
  const [payments, setPayments] = useState<PaymentLog[]>([]);
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [error, setError] = useState<string>('');
  const [recharging, setRecharging] = useState<boolean>(false);
  const [rechargeAmount, setRechargeAmount] = useState<number>(1000);
  const [showRechargeModal, setShowRechargeModal] = useState<boolean>(false);

  // Call Trigger states
  const [showTriggerModal, setShowTriggerModal] = useState<boolean>(false);
  const [triggerPhone, setTriggerPhone] = useState<string>('');
  const [triggerAgentId, setTriggerAgentId] = useState<string>(process.env.NEXT_PUBLIC_DEFAULT_AGENT_ID || '45b42390-369b-49b5-9a26-21a099dc843e');
  const [workflows, setWorkflows] = useState<{ workflow_id: string; workflow_name: string }[]>([]);
  const [triggering, setTriggering] = useState<boolean>(false);

  // Toast notifications state
  interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001/api';
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

  // Load token from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('billing_auth_token');
    const savedEmail = localStorage.getItem('billing_user_email');
    if (savedToken) {
      setToken(savedToken);
      setIsLoggedIn(true);
      if (savedEmail) setUserEmail(savedEmail);
    }
  }, []);

  // Fetch Dashboard data
  const fetchData = async (authToken: string) => {
    try {
      const headers = { Authorization: `Bearer ${authToken}` };

      // Fetch stats
      const statsRes = await fetch(`${BACKEND_URL}/billing/stats`, { headers });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
      } else {
        throw new Error(statsData.error || 'Failed to fetch stats');
      }

      // Fetch active calls
      const activeRes = await fetch(`${BACKEND_URL}/billing/active-calls`, { headers });
      const activeData = await activeRes.json();
      if (activeData.success) {
        setActiveCalls(activeData.activeCalls);
      }

      // Fetch call history
      const historyRes = await fetch(`${BACKEND_URL}/billing/call-history?limit=20`, { headers });
      const historyData = await historyRes.json();
      if (historyData.success) {
        setCallHistory(historyData.calls);
      }

      // Fetch payments
      const paymentsRes = await fetch(`${BACKEND_URL}/billing/payment-history?limit=20`, { headers });
      const paymentsData = await paymentsRes.json();
      if (paymentsData.success) {
        setPayments(paymentsData.payments);
      }

      // Fetch user workflows
      try {
        const workflowsRes = await fetch(`${BACKEND_URL}/billing/workflows`, { headers });
        const workflowsData = await workflowsRes.json();
        if (workflowsData.success && workflowsData.workflows) {
          setWorkflows(workflowsData.workflows);
          // Auto-select the first workflow if available
          if (workflowsData.workflows.length > 0) {
            setTriggerAgentId(workflowsData.workflows[0].workflow_id);
          }
        }
      } catch (wfErr) {
        console.error('Failed to fetch user workflows:', wfErr);
      }

      setError('');
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard data');
    }
  };

  // Socket.io integration for live updates
  useEffect(() => {
    if (!isLoggedIn || !token) return;

    fetchData(token);

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Connected to socket server');
      // Requesting room join for our org. Since this is single client dashboard,
      // the backend will auto-assign the client org.
      fetch(`${BACKEND_URL}/billing/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.organization) {
            socket.emit('join_org', data.organization.id);
          }
        });
    });

    socket.on('live_call_update', (data) => {
      if (data.event === 'call_started') {
        setActiveCalls(prev => [data.call, ...prev]);
        setStats(prev => ({ ...prev, activeCalls: prev.activeCalls + 1 }));
      } else if (data.event === 'call_progress') {
        setActiveCalls(prev => prev.map(c => {
          if (c.call_id === data.call.call_id) {
            return {
              ...c,
              duration: data.call.duration,
              credits_used: data.call.credits_used,
              transcript_preview: data.call.transcript_preview ?? c.transcript_preview,
              recording_url: data.call.recording_url ?? c.recording_url
            };
          }
          return c;
        }));
        if (data.call.balance !== undefined) {
          setStats(prev => ({ ...prev, creditsRemaining: data.call.balance }));
        }
      } else if (data.event === 'call_ended') {
        setActiveCalls(prev => prev.filter(c => c.call_id !== data.call_id));
        if (data.call) {
          setCallHistory(prev => [data.call, ...prev]);
          setStats(prev => ({
            ...prev,
            activeCalls: Math.max(0, prev.activeCalls - 1),
            totalCalls: prev.totalCalls + 1,
            todayCalls: prev.todayCalls + 1,
            todayCreditsUsed: prev.todayCreditsUsed + (data.call?.credits_used || 0)
          }));
        } else {
          setStats(prev => ({
            ...prev,
            activeCalls: Math.max(0, prev.activeCalls - 1)
          }));
          fetchData(token);
        }
      }
    });

    socket.on('wallet_update', (data) => {
      setStats(prev => ({ ...prev, creditsRemaining: data.balance }));
    });

    return () => {
      socket.disconnect();
    };
  }, [isLoggedIn, token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }
    setLoggingIn(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('billing_auth_token', data.token);
        localStorage.setItem('billing_user_email', data.user?.email || email);
        setToken(data.token);
        setUserEmail(data.user?.email || email);
        setIsLoggedIn(true);
        setError('');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err: any) {
      setError('Login failed: ' + err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('billing_auth_token');
    localStorage.removeItem('billing_user_email');
    setIsLoggedIn(false);
    setToken('');
    setUserEmail('');
    setActiveCalls([]);
    setCallHistory([]);
    setPayments([]);
  };



  const handleRecharge = async () => {
    setRecharging(true);
    try {
      // 1. Create order on backend
      const res = await fetch(`${BACKEND_URL}/billing/razorpay/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: rechargeAmount
        })
      });

      const orderData = await res.json();
      if (!orderData.success) throw new Error(orderData.error);

      // 2. Open Razorpay Checkout modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Bitlance AI Billing',
        description: `Wallet Credits Recharge - ₹${rechargeAmount}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          // 3. Verify Payment
          const verifyRes = await fetch(`${BACKEND_URL}/billing/razorpay/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });

          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            showToast('Recharge Successful!', 'success');
            fetchData(token);
          } else {
            showToast('Verification Failed: ' + verifyData.error, 'error');
          }
        },
        prefill: {
          name: 'bitlanceai',
          email: 'bitlanceai@gmail.com'
        },
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: async function () {
            console.log('Payment modal closed');
            try {
              await fetch(`${BACKEND_URL}/billing/razorpay/fail`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  order_id: orderData.orderId
                })
              });
              fetchData(token);
              showToast('Payment cancelled / failed.', 'error');
            } catch (err) {
              console.error('Error reporting payment failure:', err);
            }
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      showToast('Recharge Error: ' + err.message, 'error');
    } finally {
      setRecharging(false);
    }
  };

  const downloadInvoice = async (payment: PaymentLog) => {
    const doc = new jsPDF();
    
    // Load logo
    const img = new Image();
    img.src = '/logo2.jpg';
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve; // proceed even if it fails
    });

    let textStartY = 20;
    
    if (img.complete && img.naturalWidth > 0) {
      // Adjust dimensions for the wider logo
      doc.addImage(img, 'JPEG', 14, 14, 45, 12);
      textStartY = 35; // Move text beneath the wide logo
    }

    // Header (Company Details)
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138); // Blue color
    doc.text("Bitlance Tech Hub", 14, textStartY);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Complete AI Solutions", 14, textStartY + 6);
    doc.text("Email: bitlanceai@gmail.com", 14, textStartY + 12);
    
    // Invoice Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("TAX INVOICE", 140, 20);
    
    // Invoice Details
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice No: INV-${payment.order_id.substring(6, 14)}`, 140, 30);
    doc.text(`Date: ${new Date(payment.created_at).toLocaleDateString()}`, 140, 36);
    doc.text(`Order ID: ${payment.order_id}`, 140, 42);
    
    // Line separator
    const lineY = Math.max(textStartY + 20, 55);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, lineY, 196, lineY);
    
    // Bill To
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 14, lineY + 10);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Customer Email: ${userEmail || 'Client'}`, 14, lineY + 16);
    doc.text("Bitlance Client", 14, lineY + 22);
    
    // Table
    const baseAmount = payment.amount;
    const taxAmount = Number((baseAmount * 0.18).toFixed(2));
    const totalAmount = baseAmount + taxAmount;
    
    autoTable(doc, {
      startY: lineY + 35,
      head: [['Description', 'Base Amount (INR)', 'GST (18%)', 'Total (INR)']],
      body: [
        ['Wallet Credits Recharge', `${baseAmount.toFixed(2)}`, `${taxAmount.toFixed(2)}`, `${totalAmount.toFixed(2)}`],
      ],
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 10,
        cellPadding: 6,
      },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
      theme: 'grid',
    });
    
    // Summary
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(10);
    doc.text("Total Base Amount:", 130, finalY);
    doc.text(`Rs. ${baseAmount.toFixed(2)}`, 196, finalY, { align: 'right' });
    
    doc.text("Total GST (18%):", 130, finalY + 8);
    doc.text(`Rs. ${taxAmount.toFixed(2)}`, 196, finalY + 8, { align: 'right' });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Total Amount:", 130, finalY + 18);
    doc.text(`Rs. ${totalAmount.toFixed(2)}`, 196, finalY + 18, { align: 'right' });
    
    // Footer
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for your business!", 105, 280, { align: 'center' });
    doc.text("This is a computer generated invoice and requires no signature.", 105, 286, { align: 'center' });
    
    // Save PDF
    doc.save(`Bitlance-Invoice-${payment.order_id}.pdf`);
  };

  const handleTriggerCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triggerPhone || !triggerAgentId) {
      showToast('Please fill in both the phone number and agent UUID.', 'error');
      return;
    }
    setTriggering(true);
    try {
      const res = await fetch(`${BACKEND_URL}/billing/trigger-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          phoneNumber: triggerPhone,
          agentId: triggerAgentId
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Call initiated successfully! Call ID: ' + (data.call?.call_id || 'initiated'), 'success');
        setShowTriggerModal(false);
        setTriggerPhone('');
        fetchData(token);
      } else {
        showToast('Failed to trigger call: ' + (data.message || data.error), 'error');
      }
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setTriggering(false);
    }
  };

  // Render Login Screen if not logged in
  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-4">
              <PhoneCall className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-center">Bitlance Voice Agent</h1>
            <p className="text-sm text-slate-400 mt-1">Single-Client Billing Dashboard</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-center gap-2 mb-6 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-lg py-3 px-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-lg py-3 px-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                />
                <Lock className="absolute right-4 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 py-3 rounded-lg font-semibold text-sm transition-colors shadow-lg shadow-blue-500/20"
            >
              {loggingIn ? 'Signing In...' : 'Sign In to Dashboard'}
            </button>
          </form>

          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-x-0 h-px bg-slate-800" />
            <span className="relative bg-slate-900 px-3 text-xs text-slate-500 font-semibold uppercase">Admin Access</span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              if (formData.get('adminEmail') === 'bitlanceai@gmail.com' && formData.get('adminPassword') === 'admin123') {
                const demoToken = 'dummy-token-for-dev';
                const demoEmail = 'bitlanceai@gmail.com';
                setToken(demoToken);
                setUserEmail(demoEmail);
                localStorage.setItem('billing_auth_token', demoToken);
                localStorage.setItem('billing_user_email', demoEmail);
                setIsLoggedIn(true);
                setError('');
              } else {
                setError('Invalid admin credentials');
              }
            }}
            className="space-y-3"
          >
            <input
              type="email"
              name="adminEmail"
              required
              placeholder="Admin Email"
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-lg py-2.5 px-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
            />
            <input
              type="password"
              name="adminPassword"
              required
              placeholder="Admin Password"
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-lg py-2.5 px-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-800 py-3 rounded-lg font-semibold text-sm transition-colors text-slate-300"
            >
              Access Admin Panel
            </button>
          </form>
        </div>
      </main>
    );
  }

  const isAdmin = userEmail === 'uttamrajsingh423@gmail.com' || token === 'dummy-token-for-dev';
  const displayCredits = stats.creditsRemaining !== undefined ? stats.creditsRemaining : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Load Razorpay SDK */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">

        {/* HEADER */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-900 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Client Billing Portal
            </h1>
            <p className="text-sm text-slate-400 mt-1">Real-time calls tracking & billing analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTriggerModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-500/20"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Trigger Call
            </button>
            <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-400 font-medium">Live Feed Connected</span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-2 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* STATS OVERVIEW */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
            <div className="flex justify-between items-start mb-4">
              <Coins className="w-6 h-6 text-blue-400" />
              <button
                onClick={() => setShowRechargeModal(true)}
                className="text-xs bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full font-semibold transition-colors"
              >
                Recharge
              </button>
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Available Credits</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-extrabold text-blue-50">
                {displayCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs font-semibold text-emerald-400" title="1 Credit = ₹1.00">
                ≈ ₹{displayCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
            <div className="flex justify-between items-start mb-4">
              <PhoneCall className="w-6 h-6 text-emerald-400" />
              {stats.activeCalls > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute right-6 top-6" />
              )}
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Calls</p>
            <p className="text-3xl font-extrabold mt-1 text-emerald-50">{stats.activeCalls}</p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
            <div className="flex justify-between items-start mb-4">
              <Clock className="w-6 h-6 text-purple-400" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Minutes Used Today</p>
            <p className="text-3xl font-extrabold mt-1 text-purple-50">{stats.minutesUsedToday} min</p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
            <div className="flex justify-between items-start mb-4">
              <TrendingUp className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Calls</p>
            <p className="text-3xl font-extrabold mt-1 text-indigo-50">{stats.totalCalls}</p>
          </div>
        </section>

        {/* PRICING & CREDIT INFO BANNER */}
        <section className="bg-gradient-to-r from-blue-950/20 via-slate-900/40 to-indigo-950/20 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20 flex-shrink-0 flex items-center justify-center">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm md:text-base">Credits & Billing Structure</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-2xl">
                1 Credit = ₹1.00 INR. Voice calls consume exactly <span className="font-semibold text-blue-400">5 credits per minute</span> (equivalent to ₹5.00/min), calculated proportionally based on seconds used. Balance is updated in real-time as calls start and finish.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="text-xs font-semibold px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-300">
              Rate: ₹5.00 / minute
            </span>
            <span className="text-xs font-semibold px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-300">
              Value: 1 Credit = ₹1.00
            </span>
          </div>
        </section>

        {/* ACTIVE / LIVE CALLS SECTION */}
        <section className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-6 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-6">
            <Phone className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold">Current Active Calls</h2>
          </div>

          {activeCalls.length === 0 ? (
            <div className="border border-dashed border-slate-800/80 rounded-xl p-8 text-center text-slate-500">
              <p className="text-sm">No calls are currently active.</p>
              <p className="text-xs mt-1">Live active calls will appear here automatically.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {activeCalls.map((call) => (
                <div
                  key={call.call_id}
                  className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between animate-pulse"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-200">{call.customer_number}</p>
                    <p className="text-xs text-slate-400">Agent: {call.agent_name}</p>
                    {call.duration !== undefined && (
                      <div className="flex gap-2 items-center mt-1 flex-wrap">
                        <span className="text-[10px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                          {Math.floor(call.duration / 60)}m {call.duration % 60}s
                        </span>
                        {call.credits_used !== undefined && (
                          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-medium">
                            {call.credits_used.toFixed(2)} cr
                          </span>
                        )}
                        {call.recording_url && (
                          <a
                            href={call.recording_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-medium"
                          >
                            Recording
                          </a>
                        )}
                      </div>
                    )}
                    {call.transcript_preview && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{call.transcript_preview}</p>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      In Progress
                    </span>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`${BACKEND_URL}/billing/force-terminate/${call.call_id}`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          const data = await res.json();
                          if (data.success) {
                            showToast('Call forcefully terminated.', 'success');
                            fetchData(token);
                          } else {
                            showToast('Error terminating: ' + data.error, 'error');
                          }
                        } catch (err: any) {
                          showToast('Request failed', 'error');
                        }
                      }}
                      className="text-[10px] bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 px-2 py-1 rounded font-medium transition-colors"
                    >
                      End Call
                    </button>
                    <p className="text-xs text-slate-500">Started: {new Date(call.started_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* CALL HISTORY TABLE */}
        <section className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-6 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold">Call History</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Credits Used</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {callHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No call records found.
                    </td>
                  </tr>
                ) : (
                  callHistory.map((call) => (
                    <tr key={call.id} className="hover:bg-slate-900/35 transition-colors">
                      <td className="py-4 px-4 text-xs text-slate-400">
                        {new Date(call.started_at).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 font-medium">{call.customer_number}</td>
                      <td className="py-4 px-4 text-slate-300">
                        {Math.floor(call.duration / 60)}m {call.duration % 60}s
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-200">
                        {call.credits_used}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${call.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                          }`}>
                          {call.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => setSelectedCall(call)}
                          className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                        >
                          View Transcript
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* PAYMENTS HISTORY */}
        <section className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-6 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold">Payments & Recharges</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">GST (18%)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No transaction records found.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-900/35 transition-colors">
                      <td className="py-4 px-4 font-mono text-xs text-slate-300">{p.order_id}</td>
                      <td className="py-4 px-4 text-xs text-slate-400">
                        {new Date(p.created_at).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-200">₹{p.amount}</td>
                      <td className="py-4 px-4 text-slate-400">₹{(p.amount * 0.18).toFixed(2)}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${p.status === 'PAID' || p.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-red-500/10 text-red-400'
                          }`}>
                          {p.status === 'PAID' || p.status === 'SUCCESS' ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Paid
                            </>
                          ) : (
                            'Pending'
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => {
                            showToast('Downloading Invoice for ' + p.order_id, 'info');
                            downloadInvoice(p);
                          }}
                          className="text-slate-400 hover:text-slate-200 transition-colors"
                          title="Download Invoice"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* CALL DETAIL MODAL */}
      {selectedCall && (() => {
        let parsedData = null;
        try {
          if (selectedCall.transcript && selectedCall.transcript.trim().startsWith('{')) {
            parsedData = JSON.parse(selectedCall.transcript);
          }
        } catch (e) {
          console.error(e);
        }

        const rawTranscript = parsedData ? parsedData.raw : selectedCall.transcript;
        const summary = parsedData ? parsedData.summary : null;
        const sentiment = parsedData ? parsedData.sentiment : null;
        const entities = parsedData ? parsedData.entities : null;

        // Split transcript lines into speakers
        const transcriptLines = (rawTranscript || '')
          .split('\n')
          .filter((line: string) => line.trim().length > 0)
          .map((line: string) => {
            const index = line.indexOf(':');
            if (index > -1) {
              return {
                speaker: line.substring(0, index).trim(),
                text: line.substring(index + 1).trim()
              };
            }
            return { speaker: 'System', text: line };
          });

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-6 border-b border-slate-800 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold">Call Details</h3>
                  <div className="flex gap-4 mt-1">
                    <p className="text-xs text-slate-400">Customer: <span className="text-slate-200 font-semibold">{selectedCall.customer_number}</span></p>
                    <p className="text-xs text-slate-400">Duration: <span className="text-slate-200 font-semibold">{Math.floor(selectedCall.duration / 60)}m {selectedCall.duration % 60}s</span></p>
                    <p className="text-xs text-slate-400 font-medium">Credits: <span className="text-slate-200 font-bold">{selectedCall.credits_used}</span></p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCall(null)}
                  className="text-slate-400 hover:text-slate-200 font-semibold text-sm transition-colors"
                >
                  Close
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-900/50">
                {/* Custom Audio Player with Speed Control */}
                {selectedCall.recording_url && (
                  <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Audio Recording</h4>
                    <div className="flex items-center gap-4">
                      <audio id="call-audio-player" controls src={selectedCall.recording_url} className="w-full flex-1" />
                      <div className="flex flex-col gap-1 shrink-0">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Speed</label>
                        <select
                          onChange={(e) => {
                            const audio = document.getElementById('call-audio-player') as HTMLAudioElement | null;
                            if (audio) audio.playbackRate = parseFloat(e.target.value);
                          }}
                          className="bg-slate-900 border border-slate-800 text-xs px-2 py-1.5 rounded-lg text-slate-200 focus:outline-none cursor-pointer"
                          defaultValue="1"
                        >
                          <option value="0.75">0.75x</option>
                          <option value="1">1.0x</option>
                          <option value="1.25">1.25x</option>
                          <option value="1.5">1.5x</option>
                          <option value="2">2.0x</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Grid for Transcript & AI Info */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Left: Transcript bubbles (3 columns) */}
                  <div className="lg:col-span-3 space-y-4">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Conversation Transcript</h4>
                    <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-xl text-sm max-h-[45vh] overflow-y-auto space-y-4 font-sans">
                      {transcriptLines.length > 0 ? (
                        transcriptLines.map((line: { speaker: string; text: string }, idx: number) => {
                          const isAI = line.speaker.toLowerCase() === 'ai' || line.speaker.toLowerCase() === 'system';
                          return (
                            <div key={idx} className={`flex flex-col ${isAI ? 'items-start' : 'items-end'}`}>
                              <span className="text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                                {line.speaker}
                              </span>
                              <div className={`p-3 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                                isAI 
                                  ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none' 
                                  : 'bg-indigo-600/90 text-white rounded-tr-none'
                              }`}>
                                {line.text}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-slate-500 text-center py-6">No transcript available for this call.</p>
                      )}
                    </div>
                  </div>

                  {/* Right: AI Insights (2 columns) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Summary */}
                    {summary && (
                      <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-2">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Summary</h4>
                        <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
                      </div>
                    )}

                    {/* Sentiment */}
                    {sentiment && (
                      <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-2">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sentiment & Response</h4>
                        <p className="text-sm text-slate-300 leading-relaxed">{sentiment}</p>
                      </div>
                    )}

                    {/* Extracted Entities */}
                    {entities && Object.values(entities).some(val => val !== null && val !== '') && (
                      <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-3">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Extracted Information</h4>
                        <div className="space-y-2.5">
                          {(entities.client_name || entities.patient_name) && (
                            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-805/40">
                              <span className="text-slate-400">Client Name</span>
                              <span className="text-slate-200 font-semibold">{entities.client_name || entities.patient_name}</span>
                            </div>
                          )}
                          {entities.department && (
                            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-805/40">
                              <span className="text-slate-400">Requested Department</span>
                              <span className="text-slate-200 font-semibold">{entities.department}</span>
                            </div>
                          )}
                          {entities.appointment_date && (
                            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-805/40">
                              <span className="text-slate-400">Appointment Date</span>
                              <span className="text-slate-200 font-semibold">{entities.appointment_date}</span>
                            </div>
                          )}
                          {entities.mobile && (
                            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-805/40">
                              <span className="text-slate-400">Mobile</span>
                              <span className="text-slate-200 font-semibold">{entities.mobile}</span>
                            </div>
                          )}
                          {entities.email && (
                            <div className="flex justify-between items-center text-xs py-1">
                              <span className="text-slate-400">Email</span>
                              <span className="text-slate-200 font-semibold">{entities.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TRIGGER OUTBOUND CALL MODAL */}
      {showTriggerModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold">Trigger Outbound Call</h3>
              <button
                onClick={() => setShowTriggerModal(false)}
                className="text-slate-400 hover:text-slate-200 font-semibold text-sm"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleTriggerCall} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Customer Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={triggerPhone}
                  onChange={(e) => setTriggerPhone(e.target.value)}
                  placeholder="e.g. +919876543210"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-lg py-2.5 px-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Voice Agent / Workflow
                </label>
                {workflows.length > 0 ? (
                  <>
                    <select
                      value={workflows.some(w => w.workflow_id === triggerAgentId) ? triggerAgentId : 'custom'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setTriggerAgentId('');
                        } else {
                          setTriggerAgentId(val);
                        }
                      }}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-lg py-2.5 px-3.5 text-sm text-slate-100 focus:outline-none transition-colors mb-3"
                    >
                      {workflows.map((wf) => (
                        <option key={wf.workflow_id} value={wf.workflow_id}>
                          {wf.workflow_name}
                        </option>
                      ))}
                      <option value="custom">-- Enter Custom Workflow ID --</option>
                    </select>

                    {/* Show custom input if they selected 'custom' or the ID is not in the list */}
                    {!workflows.some(w => w.workflow_id === triggerAgentId) && (
                      <input
                        type="text"
                        required
                        value={triggerAgentId}
                        onChange={(e) => setTriggerAgentId(e.target.value)}
                        placeholder="Enter your custom voice agent UUID"
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-lg py-2.5 px-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                      />
                    )}
                  </>
                ) : (
                  <input
                    type="text"
                    required
                    value={triggerAgentId}
                    onChange={(e) => setTriggerAgentId(e.target.value)}
                    placeholder="Enter your voice agent UUID"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-lg py-2.5 px-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={triggering}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 py-3 rounded-lg font-semibold text-sm transition-colors shadow-lg shadow-blue-500/20"
              >
                {triggering ? 'Initiating Call...' : 'Call Customer Now'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* RECHARGE MODAL */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold">Recharge Wallet Credits</h3>
              <button
                onClick={() => setShowRechargeModal(false)}
                className="text-slate-400 hover:text-slate-200 font-semibold text-sm"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              setShowRechargeModal(false);
              handleRecharge();
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Amount to Recharge (INR)
                </label>
                <input
                  type="number"
                  required
                  min="100"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(parseInt(e.target.value) || 0)}
                  placeholder="e.g. 1000"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-lg py-2.5 px-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                />
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Min amount is ₹100. Credits will be automatically synchronized with your main Supabase account upon successful payment.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                {[500, 1000, 2000, 5000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRechargeAmount(preset)}
                    className={`flex-1 py-1.5 text-xs font-semibold border rounded-lg transition-all ${rechargeAmount === preset
                        ? 'bg-blue-600/10 border-blue-500 text-blue-400 shadow-md shadow-blue-500/5'
                        : 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                  >
                    ₹{preset}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={recharging}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 py-3 rounded-lg font-semibold text-sm transition-colors shadow-lg shadow-blue-500/20 mt-4 flex items-center justify-center gap-1.5"
              >
                {recharging ? 'Processing Payment...' : 'Proceed with Razorpay'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-2 ${toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-800/50 text-emerald-300'
                : toast.type === 'error'
                  ? 'bg-rose-950/90 border-rose-800/50 text-rose-300'
                  : 'bg-slate-900/90 border-slate-800 text-slate-300'
              }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />}
            {toast.type === 'info' && <Info className="w-5 h-5 flex-shrink-0 text-blue-400" />}
            <span className="text-sm font-medium leading-relaxed">{toast.message}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
