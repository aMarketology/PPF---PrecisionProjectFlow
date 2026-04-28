'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { 
  User, 
  Mail, 
  Lock, 
  Briefcase, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  MapPin,
  Loader
} from 'lucide-react';
import Link from 'next/link';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Form validation schemas matching your profiles table
const accountSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  userType: z.enum(['client', 'engineer']),
  terms: z.boolean().refine(val => val === true, 'You must agree to the terms')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const professionalSchema = z.object({
  location: z.string().min(2, 'Location is required'),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
});

const companySchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  streetAddress: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().min(5, 'Zip code is required'),
  specialties: z.string().min(5, 'Please enter at least one specialty'),
});

type AccountFormData = z.infer<typeof accountSchema>;
type ProfessionalFormData = z.infer<typeof professionalSchema>;
type CompanyFormData = z.infer<typeof companySchema>;

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [accountData, setAccountData] = useState<AccountFormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const totalSteps = 3;

  // Get user type from URL parameter, default to 'engineer'
  const urlType = searchParams.get('type');
  const initialUserType = urlType === 'client' ? 'client' : 'engineer';

  const accountForm = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      userType: initialUserType,
      terms: false
    }
  });

  const professionalForm = useForm<ProfessionalFormData>({
    resolver: zodResolver(professionalSchema),
  });

  const companyForm = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
  });

  const onAccountSubmit: SubmitHandler<AccountFormData> = (data) => {
    setAccountData(data);
    // Engineers go straight to company form, clients go to professional info
    if (data.userType === 'engineer') {
      setCurrentStep(2); // Company form for engineers
    } else {
      setCurrentStep(2); // Professional form for clients
    }
  };

  const onProfessionalSubmit: SubmitHandler<ProfessionalFormData> = async (data) => {
    if (!accountData) return;
    
    // Client account creation (no company needed)
    await createAccount(data);
  };

  const onCompanySubmit: SubmitHandler<CompanyFormData> = async (data) => {
    if (!accountData) return;
    
    // Create engineer account with company
    await createAccount(undefined, data);
  };

  const createAccount = async (profileData?: ProfessionalFormData, companyData?: CompanyFormData) => {
    if (!accountData) return;
    
    setIsLoading(true);
    
    try {
      const supabase = createClient();
      
      // Step 1: Create auth user (email confirmation disabled)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: accountData.email,
        password: accountData.password,
        options: {
          data: {
            full_name: accountData.fullName,
            user_type: accountData.userType,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Step 2: Update profile with only columns that exist in the table
      const profileUpdate: any = {
        full_name: accountData.fullName,
        email: accountData.email,
        user_type: accountData.userType,
      };

      // Add bio if provided (for clients)
      if (profileData?.bio) {
        profileUpdate.bio = profileData.bio;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        // Non-fatal: the trigger already created the profile row,
        // so we continue even if the update fails
      }

      // Small delay to ensure profile is committed before creating company
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Create company profile if engineer with company data
      if (accountData.userType === 'engineer' && companyData) {
        const { error: companyError } = await supabase
          .from('company_profiles')
          .insert({
            owner_id: authData.user.id,
            company_name: companyData.companyName,
            description: companyData.description,
            email: companyData.email,
            phone: companyData.phone,
            website: companyData.website || null,
            street_address: companyData.streetAddress,
            city: companyData.city,
            state: companyData.state,
            zip_code: companyData.zipCode,
            specialties: companyData.specialties.split(',').map(s => s.trim()),
          });

        if (companyError) {
          console.error('Company creation error:', companyError);
          throw new Error('Failed to create company profile');
        }
      }

      toast.success('Account created successfully!');
      setCurrentStep(3);
      
      // Redirect based on user type
      setTimeout(() => {
        if (accountData.userType === 'engineer') {
          router.push('/products/create');
        } else {
          router.push('/marketplace');
        }
      }, 2000);
      
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 pt-24 pb-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Progress Indicator */}
          <div className="mb-12">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all
                    ${currentStep >= step 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-500'
                    }
                  `}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`
                      w-24 md:w-32 h-1 mx-2 transition-all
                      ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'}
                    `} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 text-sm">
              <span className={currentStep >= 1 ? 'text-blue-600 font-medium' : 'text-gray-500'}>Account</span>
              <span className={currentStep >= 2 ? 'text-blue-600 font-medium' : 'text-gray-500'}>Profile</span>
              <span className={currentStep >= 3 ? 'text-blue-600 font-medium' : 'text-gray-500'}>Complete</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Account Setup */}
            {currentStep === 1 && (
              <motion.div
                key="account"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg"
              >
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Your Account</h2>
                  <p className="text-gray-600">Join Precision Product Flow and start connecting with engineering talent</p>
                </div>

                <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        {...accountForm.register('fullName')}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                    {accountForm.formState.errors.fullName && (
                      <p className="mt-1 text-sm text-red-600">{accountForm.formState.errors.fullName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        {...accountForm.register('email')}
                        type="email"
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="you@example.com"
                      />
                    </div>
                    {accountForm.formState.errors.email && (
                      <p className="mt-1 text-sm text-red-600">{accountForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        {...accountForm.register('password')}
                        type="password"
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                    {accountForm.formState.errors.password && (
                      <p className="mt-1 text-sm text-red-600">{accountForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        {...accountForm.register('confirmPassword')}
                        type="password"
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                    {accountForm.formState.errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{accountForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      I want to
                    </label>
                    <select
                      {...accountForm.register('userType')}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="client">Find Engineering Services (Client)</option>
                      <option value="engineer">Offer Engineering Services (Engineer)</option>
                    </select>
                  </div>

                  <div className="flex items-start">
                    <input
                      {...accountForm.register('terms')}
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                    />
                    <label className="ml-3 text-sm text-gray-600">
                      I agree to the{' '}
                      <a 
                        href="/Terms%20of%20Service_joshgoto-7.pdf" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 font-medium underline"
                      >
                        Terms of Service
                      </a>
                      {' '}and{' '}
                      <a 
                        href="/Privacy%20Policy_joshgoto.pdf" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 font-medium underline"
                      >
                        Privacy Policy
                      </a>
                    </label>
                  </div>
                  {accountForm.formState.errors.terms && (
                    <p className="text-sm text-red-600">{accountForm.formState.errors.terms.message}</p>
                  )}

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
                    Sign in
                  </Link>
                </p>
              </motion.div>
            )}

            {/* Step 2: Professional Profile (Clients) OR Company Setup (Engineers) */}
            {currentStep === 2 && accountData && (
              <motion.div
                key={accountData.userType === 'engineer' ? 'company' : 'professional'}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg"
              >
                {accountData.userType === 'client' ? (
                  <>
                    <div className="mb-8">
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h2>
                      <p className="text-gray-600 mt-2">Tell us a bit more about yourself</p>
                    </div>

                    <form onSubmit={professionalForm.handleSubmit(onProfessionalSubmit)} className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Location *
                        </label>
                        <input
                          {...professionalForm.register('location')}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="City, State/Country"
                        />
                        {professionalForm.formState.errors.location && (
                          <p className="mt-1 text-sm text-red-600">{professionalForm.formState.errors.location.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Professional Bio *
                        </label>
                        <textarea
                          {...professionalForm.register('bio')}
                          rows={5}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Tell us about your experience and expertise... (minimum 10 characters)"
                        />
                        {professionalForm.formState.errors.bio && (
                          <p className="mt-1 text-sm text-red-600">{professionalForm.formState.errors.bio.message}</p>
                        )}
                      </div>

                      <div className="flex space-x-4">
                        <button
                          type="button"
                          onClick={prevStep}
                          className="flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <ArrowLeft className="mr-2 h-5 w-5" />
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="flex-1 flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? (
                            <>
                              <Loader className="mr-2 h-5 w-5 animate-spin" />
                              Creating Account...
                            </>
                          ) : (
                            <>
                              Create Account
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <>
                    {/* Engineer Company Form */}
                    <div className="mb-8">
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">Company Information</h2>
                      <p className="text-gray-600">Tell us about your engineering company</p>
                    </div>

                    <form onSubmit={companyForm.handleSubmit(onCompanySubmit)} className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name *
                    </label>
                    <input
                      {...companyForm.register('companyName')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Your Company Name"
                    />
                    {companyForm.formState.errors.companyName && (
                      <p className="mt-1 text-sm text-red-600">{companyForm.formState.errors.companyName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Description *
                    </label>
                    <textarea
                      {...companyForm.register('description')}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tell clients about your company, services, and expertise..."
                    />
                    {companyForm.formState.errors.description && (
                      <p className="mt-1 text-sm text-red-600">{companyForm.formState.errors.description.message}</p>
                    )}
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Email *
                      </label>
                      <input
                        {...companyForm.register('email')}
                        type="email"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="contact@company.com"
                      />
                      {companyForm.formState.errors.email && (
                        <p className="mt-1 text-sm text-red-600">{companyForm.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        {...companyForm.register('phone')}
                        type="tel"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="(555) 123-4567"
                      />
                      {companyForm.formState.errors.phone && (
                        <p className="mt-1 text-sm text-red-600">{companyForm.formState.errors.phone.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website (Optional)
                    </label>
                    <input
                      {...companyForm.register('website')}
                      type="url"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://www.yourcompany.com"
                    />
                    {companyForm.formState.errors.website && (
                      <p className="mt-1 text-sm text-red-600">{companyForm.formState.errors.website.message}</p>
                    )}
                  </div>

                  {/* Address Information */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address *
                    </label>
                    <input
                      {...companyForm.register('streetAddress')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="123 Main Street"
                    />
                    {companyForm.formState.errors.streetAddress && (
                      <p className="mt-1 text-sm text-red-600">{companyForm.formState.errors.streetAddress.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        {...companyForm.register('city')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Los Angeles"
                      />
                      {companyForm.formState.errors.city && (
                        <p className="mt-1 text-sm text-red-600">{companyForm.formState.errors.city.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State *
                      </label>
                      <input
                        {...companyForm.register('state')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="CA"
                      />
                      {companyForm.formState.errors.state && (
                        <p className="mt-1 text-sm text-red-600">{companyForm.formState.errors.state.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Zip Code *
                      </label>
                      <input
                        {...companyForm.register('zipCode')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="90001"
                      />
                      {companyForm.formState.errors.zipCode && (
                        <p className="mt-1 text-sm text-red-600">{companyForm.formState.errors.zipCode.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Specialties */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Engineering Specialties *
                    </label>
                    <input
                      {...companyForm.register('specialties')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Mechanical, Electrical, Civil (comma-separated)"
                    />
                    <p className="mt-1 text-xs text-gray-500">Enter your main engineering specialties, separated by commas</p>
                    {companyForm.formState.errors.specialties && (
                      <p className="mt-1 text-sm text-red-600">{companyForm.formState.errors.specialties.message}</p>
                    )}
                  </div>

                      <div className="flex space-x-4">
                        <button
                          type="button"
                          onClick={prevStep}
                          className="flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <ArrowLeft className="mr-2 h-5 w-5" />
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="flex-1 flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? (
                            <>
                              <Loader className="mr-2 h-5 w-5 animate-spin" />
                              Creating Company...
                            </>
                          ) : (
                            <>
                              Complete Setup
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </motion.div>
            )}

            {/* Step 3: Success */}
            {currentStep === 3 && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-lg"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Precision Product Flow!</h2>
                <p className="text-gray-600 mb-8">
                  Your account has been created successfully. You're now ready to {accountData?.userType === 'engineer' ? 'start offering your engineering services' : 'find amazing engineering services'}.
                </p>
                <button
                  onClick={() => router.push('/marketplace')}
                  className="w-full px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Get Started
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    }>
      <SignUpContent />
    </Suspense>
  );
}
