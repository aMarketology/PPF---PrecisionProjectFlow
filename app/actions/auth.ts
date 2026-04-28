'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sendWelcomeEmail } from '@/lib/email'

// Sign up function matching simplified profiles table
export async function signUp(formData: {
  email: string
  password: string
  fullName: string
  userType: 'client' | 'engineer'
  companyName?: string
  bio?: string
  location?: string
}) {
  const supabase = await createClient()

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      data: {
        full_name: formData.fullName,
        user_type: formData.userType,
      },
    },
  })

  if (authError) {
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'Failed to create user' }
  }

  // Update profile with additional information
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: formData.fullName,
      email: formData.email,
      user_type: formData.userType,
      company_name: formData.companyName || null,
      bio: formData.bio || null,
      location: formData.location || null,
    })
    .eq('id', authData.user.id)

  if (profileError) {
    return { error: profileError.message }
  }

  // Fire-and-forget welcome email — never block signup on email failure
  sendWelcomeEmail({
    to: formData.email,
    name: formData.fullName,
    userType: formData.userType,
  }).catch(err => console.error('[email] welcome failed:', err))

  revalidatePath('/', 'layout')
  return { success: true, userId: authData.user.id }
}

export async function signIn(formData: { email: string; password: string }) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function getUser() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  // Get profile data from simplified profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    ...user,
    profile,
  }
}

export async function updateProfile(formData: {
  fullName?: string
  avatarUrl?: string
  companyName?: string
  bio?: string
  location?: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const updateData: any = {}
  if (formData.fullName !== undefined) updateData.full_name = formData.fullName
  if (formData.avatarUrl !== undefined) updateData.avatar_url = formData.avatarUrl
  if (formData.companyName !== undefined) updateData.company_name = formData.companyName
  if (formData.bio !== undefined) updateData.bio = formData.bio
  if (formData.location !== undefined) updateData.location = formData.location

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function getUserProfile(userId: string) {
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    return { error: error.message }
  }

  return { profile }
}
