import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_TYPES = [
  ...IMAGE_TYPES,
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/octet-stream', // DXF, DWG, etc.
];

function getAttachmentType(mimeType: string): 'image' | 'pdf' | 'file' {
  if (IMAGE_TYPES.includes(mimeType)) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'file';
}

// POST /api/messages/upload
// Accepts multipart/form-data with:
//   file:           the file blob
//   conversationId: the conversation this file belongs to
// Returns: { url, signedUrl, name, type, size }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file           = formData.get('file') as File | null;
    const conversationId = formData.get('conversationId') as string | null;

    if (!file || !conversationId) {
      return NextResponse.json({ error: 'file and conversationId are required' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 25 MB)' }, { status: 413 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 415 }
      );
    }

    // Verify user is a participant in the conversation
    const { data: conv } = await supabase
      .from('user_conversations')
      .select('id')
      .eq('id', conversationId)
      .or(`participant_one_id.eq.${user.id},participant_two_id.eq.${user.id}`)
      .single();

    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Build a unique storage path: {userId}/{conversationId}/{timestamp}-{filename}
    const timestamp  = Date.now();
    const safeName   = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${user.id}/${conversationId}/${timestamp}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer      = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('message-attachments')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Generate a signed URL valid for 7 days (for display in the UI)
    const { data: signedData, error: signError } = await supabase.storage
      .from('message-attachments')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 days

    if (signError) throw signError;

    return NextResponse.json({
      url:        storagePath,          // persistent path stored in DB
      signedUrl:  signedData.signedUrl, // time-limited URL for display
      name:       file.name,
      type:       getAttachmentType(file.type),
      mimeType:   file.type,
      size:       file.size,
    });

  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
