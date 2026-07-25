'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import {
  Building2, Globe, MapPin, Phone, Mail, Loader2,
  ArrowLeft, Tag, CheckCircle2, Users,
} from 'lucide-react';
import Link from 'next/link';

export default function CreateCompanyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [specialties, setSpecialties] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login?redirect=/companies/create'); return; }
      setUser(user);
      // Check if user already has a company
      supabase.from('company_profiles').select('id').eq('owner_id', user.id).maybeSingle().then(({ data }) => {
        if (data) { router.push(`/dashboard/company/${data.id}`); return; }
        setLoading(false);
      });
      // Pre-fill email
      supabase.from('profiles').select('email').eq('id', user.id).single().then(({ data }) => {
        if (data?.email) setEmail(data.email);
      });
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) { setError('Company name is required'); return; }
    setSubmitting(true);
    setError('');
    try {
      const supabase = createClient();
      const slug = companyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const { data: company, error: insertError } = await supabase
        .from('company_profiles')
        .insert({
          owner_id: user.id,
          company_name: companyName.trim(),
          slug,
          industry: industry || null,
          description: description || null,
          website: website || null,
          email: email || null,
          phone: phone || null,
          city: city || null,
          state: state || null,
          specialties: specialties ? specialties.split(',').map(s => s.trim()).filter(Boolean) : null,
          is_verified: false,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Add owner as company_member
      await supabase.from('company_members').insert({
        company_id: company.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
      });

      // Create the company's General channel
      await supabase.rpc('ensure_company_channel', {
        p_company_id: company.id,
        p_user_id: user.id,
      });

      setCreatedCompanyId(company.id);
      setSubmitted(true);
      toast.success('Company created! 🎉');
    } catch (err: any) {
      setError(err.message || 'Failed to create company');
      toast.error(err.message || 'Failed to create company');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#003D82]" />
        </div>
        <Footer />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md mx-auto">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Company Created!</h1>
            <p className="text-gray-500 mb-6 text-sm leading-relaxed">
              <strong>{companyName}</strong> is now live on Precision Project Flow. Your team channel is ready.
            </p>
            <div className="flex flex-col gap-3">
              <Link href={`/dashboard/company/${createdCompanyId}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#003D82] hover:bg-[#002960] text-white font-bold rounded-xl transition-all text-sm">
                <Building2 className="w-4 h-4" /> Go to Company Dashboard
              </Link>
              <Link href="/messages"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all text-sm">
                <Users className="w-4 h-4" /> Open Team Chat
              </Link>
            </div>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-14 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 41px)' }} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10">
          <Link href="/companies" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Directory
          </Link>
          <h1 className="text-3xl font-extrabold text-white mb-2">Create Your Company</h1>
          <p className="text-blue-200">Set up your business profile and start collaborating with your team</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Company Information</h2>
            <p className="text-sm text-gray-500 mt-0.5">This will be your public business profile on the marketplace.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Company Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input required value={companyName} onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Engineering Solutions"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D82]" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Industry</label>
              <select value={industry} onChange={e => setIndustry(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D82] bg-white">
                <option value="">Select industry...</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Electrical Engineering">Electrical Engineering</option>
                <option value="Structural Engineering">Structural Engineering</option>
                <option value="Software Engineering">Software Engineering</option>
                <option value="Consulting Services">Consulting Services</option>
                <option value="Analysis & Testing">Analysis & Testing</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Construction">Construction</option>
                <option value="Other Services">Other Services</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Website</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={website} onChange={e => setWebsite(e.target.value)}
                  placeholder="https://yourcompany.com"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D82]" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Brief description of what your company does..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D82] resize-none" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="contact@company.com"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D82]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D82]" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">City</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={city} onChange={e => setCity(e.target.value)}
                  placeholder="e.g. Buffalo"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D82]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">State</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={state} onChange={e => setState(e.target.value)}
                  placeholder="e.g. NY"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D82]" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Specialties <span className="text-gray-400 font-normal">(comma-separated)</span>
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={specialties} onChange={e => setSpecialties(e.target.value)}
                placeholder="e.g. CNC Machining, 3D Printing, Welding"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D82]" />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3 pt-1">
            <Link href="/companies"
              className="flex-1 text-center py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Cancel
            </Link>
            <button type="submit" disabled={submitting}
              className="flex-1 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><Building2 className="w-4 h-4" /> Create Company</>}
            </button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
}