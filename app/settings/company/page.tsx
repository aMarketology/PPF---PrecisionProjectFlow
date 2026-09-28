'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Save,
  Loader,
  AlertCircle,
  Briefcase
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';

const companySchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().min(5, 'Zip code is required'),
  specialties: z.string().min(5, 'Please enter at least one specialty'),
});

type CompanyFormData = z.infer<typeof companySchema>;

export default function CompanySettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
  });

  useEffect(() => {
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user is an engineer
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (profile?.user_type !== 'engineer') {
        toast.error('Only engineers can access company settings');
        router.push('/admin');
        return;
      }

      // Resolve the user's company via company_members (authoritative),
      // falling back to direct ownership on company_profiles.
      const { data: membership } = await supabase
        .from('company_members')
        .select('company_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      let company: any = null;

      if (membership?.company_id) {
        const { data, error } = await supabase
          .from('company_profiles')
          .select('*')
          .eq('id', membership.company_id)
          .maybeSingle();
        if (error) throw error;
        company = data;
      } else {
        const { data, error } = await supabase
          .from('company_profiles')
          .select('*')
          .eq('owner_id', user.id)
          .maybeSingle();
        if (error) throw error;
        company = data;
      }

      if (!company) {
        toast.error('No company profile found. Please complete signup.');
        router.push('/signup');
        return;
      }

      setCompanyId(company.id);
      setCanEdit(true);

      // Populate form with company data
      form.reset({
        name: company.company_name,
        description: company.description,
        email: company.email,
        phone: company.phone,
        website: company.website || '',
        address: company.street_address || company.address || '',
        city: company.city,
        state: company.state,
        zipCode: company.zip_code,
        specialties: (company.specialties || []).join(', '),
      });

    } catch (error: any) {
      console.error('Error loading company:', error);
      toast.error('Failed to load company information');
    } finally {
      setIsLoadingData(false);
    }
  };

  const onSubmit: SubmitHandler<CompanyFormData> = async (data) => {
    if (!companyId) return;
    
    setIsLoading(true);
    
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('company_profiles')
        .update({
          company_name: data.name,
          description: data.description,
          email: data.email,
          phone: data.phone,
          website: data.website || null,
          street_address: data.address,
          city: data.city,
          state: data.state,
          zip_code: data.zipCode,
          specialties: data.specialties.split(',').map(s => s.trim()),
          updated_at: new Date().toISOString(),
        })
        .eq('id', companyId);

      if (error) throw error;

      toast.success('Company settings updated successfully!');
      
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.message || 'Failed to update company settings');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 pt-24 pb-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-20">
              <Loader className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Company Settings</h1>
            <p className="text-gray-600">Manage your company profile and information</p>
          </motion.div>

          {/* Settings Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg"
          >
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Basic Information */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                  Basic Information
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name *
                    </label>
                    <input
                      {...form.register('name')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Your Company Name"
                    />
                    {form.formState.errors.name && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Description *
                    </label>
                    <textarea
                      {...form.register('description')}
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tell clients about your company, services, and expertise..."
                    />
                    {form.formState.errors.description && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {form.formState.errors.description.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200" />

              {/* Contact Information */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-blue-600" />
                  Contact Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Email *
                    </label>
                    <input
                      {...form.register('email')}
                      type="email"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="contact@company.com"
                    />
                    {form.formState.errors.email && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      {...form.register('phone')}
                      type="tel"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="(555) 123-4567"
                    />
                    {form.formState.errors.phone && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {form.formState.errors.phone.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website (Optional)
                  </label>
                  <input
                    {...form.register('website')}
                    type="url"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://www.yourcompany.com"
                  />
                  {form.formState.errors.website && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {form.formState.errors.website.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200" />

              {/* Address Information */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                  Business Address
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address *
                    </label>
                    <input
                      {...form.register('address')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="123 Main Street"
                    />
                    {form.formState.errors.address && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {form.formState.errors.address.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        {...form.register('city')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Los Angeles"
                      />
                      {form.formState.errors.city && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {form.formState.errors.city.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State *
                      </label>
                      <input
                        {...form.register('state')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="CA"
                      />
                      {form.formState.errors.state && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {form.formState.errors.state.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Zip Code *
                      </label>
                      <input
                        {...form.register('zipCode')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="90001"
                      />
                      {form.formState.errors.zipCode && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {form.formState.errors.zipCode.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200" />

              {/* Specialties */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Briefcase className="h-5 w-5 mr-2 text-blue-600" />
                  Engineering Specialties
                </h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specialties *
                  </label>
                  <input
                    {...form.register('specialties')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Mechanical, Electrical, Civil (comma-separated)"
                  />
                  <p className="mt-1 text-xs text-gray-500">Enter your main engineering specialties, separated by commas</p>
                  {form.formState.errors.specialties && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {form.formState.errors.specialties.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={isLoading || !canEdit}
                  className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isLoading ? (
                    <>
                      <Loader className="mr-2 h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  );
}
