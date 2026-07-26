const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Check service-images bucket exists
  const { data: buckets } = await s.storage.listBuckets();
  const bucketNames = (buckets || []).map(b => b.id);
  console.log('Buckets:', bucketNames.join(', '));

  const needed = ['service-images', 'post-media', 'avatars', 'message-attachments'];
  for (const name of needed) {
    if (bucketNames.includes(name)) {
      console.log('OK', name);
    } else {
      console.log('MISSING', name);
      const { error } = await s.storage.createBucket(name, { public: true, fileSizeLimit: 52428800 });
      console.log('  created:', error ? error.message : 'ok');
    }
  }

  // Test upload
  const buf = Buffer.from([1, 2, 3, 4]);
  const path = 'test/test-' + Date.now() + '.png';
  const { data: uploadData, error: uploadErr } = await s.storage.from('service-images').upload(path, buf, {
    contentType: 'image/png',
    upsert: true,
  });
  if (uploadErr) {
    console.log('Upload error:', uploadErr.message);
  } else {
    console.log('Upload OK, path:', uploadData?.path);
    // Clean up test file
    await s.storage.from('service-images').remove([path]);
  }

  process.exit(0);
})();