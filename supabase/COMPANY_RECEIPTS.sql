-- COMPANY_RECEIPTS.sql
-- Shared receipt register. Run after COMPANY_TEAMS.sql.
-- Receipts are visible to their submitter and active company owners/admins only.

CREATE TABLE IF NOT EXISTS public.company_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  merchant_name text NOT NULL DEFAULT 'Receipt scan',
  receipt_date date NOT NULL DEFAULT CURRENT_DATE,
  total_amount numeric(12,2),
  tax_amount numeric(12,2),
  currency text NOT NULL DEFAULT 'USD',
  category text,
  notes text,
  image_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ocr_text text,
  ocr_provider text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_receipts_company_created
  ON public.company_receipts(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_receipts_submitter
  ON public.company_receipts(submitted_by, created_at DESC);

ALTER TABLE public.company_receipts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_company_receipts(target_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE company_id = target_company_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_company_receipts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_company_receipts(uuid) TO authenticated;

CREATE POLICY "Back office and submitters view receipts"
  ON public.company_receipts FOR SELECT TO authenticated
  USING (submitted_by = auth.uid() OR public.can_access_company_receipts(company_id));

CREATE POLICY "Company members submit receipts"
  ON public.company_receipts FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_id = company_receipts.company_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "Back office updates receipts"
  ON public.company_receipts FOR UPDATE TO authenticated
  USING (public.can_access_company_receipts(company_id))
  WITH CHECK (public.can_access_company_receipts(company_id));

-- Private bucket containing the original receipt images.
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-receipts', 'company-receipts', false)
ON CONFLICT (id) DO UPDATE SET public = false;

CREATE POLICY "Company members upload receipt files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text
      FROM public.company_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Receipt submitters and back office read files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'company-receipts'
    AND (
      owner_id = auth.uid()::text
      OR public.can_access_company_receipts(((storage.foldername(name))[1])::uuid)
    )
  );

COMMENT ON TABLE public.company_receipts IS
  'Shared company receipt register; mobile OCR fields are populated by the selected OCR provider.';
