'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { 
  MessageSquare, 
  Send, 
  User, 
  Mail, 
  Phone, 
  Loader,
  CheckCircle,
  X
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Form validation schema
const messageSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(20, 'Message must be at least 20 characters'),
});

type MessageFormData = z.infer<typeof messageSchema>;

interface ContactCompanyFormProps {
  companyId: string;
  companyName: string;
  contextType?: 'service' | 'profile' | 'project' | 'general';
  contextId?: string;
  onSuccess?: () => void;
  buttonText?: string;
  triggerClassName?: string;
}

export default function ContactCompanyForm({
  companyId,
  companyName,
  contextType = 'general',
  contextId,
  onSuccess,
  buttonText = 'Contact Company',
  triggerClassName = ''
}: ContactCompanyFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
  });

  // Check authentication and prefill form
  const handleOpen = async () => {
    setIsOpen(true);
    
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      setIsAuthenticated(true);
      
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setCurrentUserName(profile.full_name || '');
        setCurrentUserEmail(profile.email || '');
        form.setValue('name', profile.full_name || '');
        form.setValue('email', profile.email || '');
      }
    } else {
      setIsAuthenticated(false);
    }
  };

  const onSubmit: SubmitHandler<MessageFormData> = async (data) => {
    setIsLoading(true);
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please sign in to contact this company.');
        return;
      }
      
      // Step 1: Resolve the company owner to open a direct conversation with.
      const { data: company, error: companyError } = await supabase
        .from('company_profiles')
        .select('owner_id, claimed_by')
        .eq('id', companyId)
        .maybeSingle();
      
      if (companyError) throw companyError;
      
      const recipientId = company?.owner_id || company?.claimed_by;
      if (!recipientId) {
        toast.error('This company has no owner to contact yet.');
        return;
      }
      
      // Step 2: Get or create the direct conversation.
      const { data: conversationId, error: convError } = await supabase.rpc(
        'get_or_create_conversation',
        { user_one_id: user.id, user_two_id: recipientId }
      );
      
      if (convError) throw convError;
      if (!conversationId) throw new Error('Could not open a conversation');
      
      // Step 3: Send the first message through the token-gated API.
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          content: `${data.subject}\n\n${data.message}`,
        }),
      });
      
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 402) {
          throw new Error('This conversation is locked. Unlock it to send your message.');
        }
        throw new Error(body.error || 'Failed to send message');
      }
      
      // Success!
      setIsSuccess(true);
      toast.success('Message sent successfully!');
      
      // Optional callback
      if (onSuccess) {
        onSuccess();
      }
      
      // Close after delay
      setTimeout(() => {
        setIsOpen(false);
        setIsSuccess(false);
        form.reset();
      }, 2000);
      
    } catch (error: any) {
      console.error('Message error:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={handleOpen}
        className={triggerClassName || "flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"}
      >
        <MessageSquare className="h-5 w-5 mr-2" />
        {buttonText}
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isLoading && setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Modal Content */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                {!isSuccess ? (
                  <>
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Contact {companyName}</h2>
                        <p className="text-sm text-gray-600 mt-1">
                          {isAuthenticated ? 'Send a message to this company' : 'Fill in your details to get started'}
                        </p>
                      </div>
                      <button
                        onClick={() => setIsOpen(false)}
                        disabled={isLoading}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="h-5 w-5 text-gray-500" />
                      </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
                      {/* Contact Information (if not authenticated) */}
                      {!isAuthenticated && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Your Name *
                              </label>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                  {...form.register('name')}
                                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="John Doe"
                                />
                              </div>
                              {form.formState.errors.name && (
                                <p className="mt-1 text-sm text-red-600">{form.formState.errors.name.message}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address *
                              </label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                  {...form.register('email')}
                                  type="email"
                                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="john@example.com"
                                />
                              </div>
                              {form.formState.errors.email && (
                                <p className="mt-1 text-sm text-red-600">{form.formState.errors.email.message}</p>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Phone Number (Optional)
                            </label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <input
                                {...form.register('phone')}
                                type="tel"
                                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="(555) 123-4567"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Message Information */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Subject *
                          </label>
                          <input
                            {...form.register('subject')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="What's your inquiry about?"
                          />
                          {form.formState.errors.subject && (
                            <p className="mt-1 text-sm text-red-600">{form.formState.errors.subject.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Message *
                          </label>
                          <textarea
                            {...form.register('message')}
                            rows={6}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Tell the company about your project, requirements, or questions..."
                          />
                          {form.formState.errors.message && (
                            <p className="mt-1 text-sm text-red-600">{form.formState.errors.message.message}</p>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => setIsOpen(false)}
                          disabled={isLoading}
                          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? (
                            <>
                              <Loader className="h-5 w-5 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-5 w-5 mr-2" />
                              Send Message
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  /* Success State */
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                    <p className="text-gray-600">
                      {companyName} will get back to you soon at {form.getValues('email')}
                    </p>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
