
-- Enums
CREATE TYPE public.preparedness_affected_domain AS ENUM (
  'Estate Planning','Family Governance','Business Succession','Trust Administration',
  'Philanthropy','Digital Legacy','Institutional Memory','Cross-Domain / Other'
);

CREATE TYPE public.preparedness_confidence AS ENUM (
  'Verified Preparedness','Partially Verified Preparedness','Reported Preparedness',
  'Inferred Preparedness','Unknown Preparedness'
);

CREATE TYPE public.gap_scope AS ENUM ('Full','Partial');
CREATE TYPE public.gap_status AS ENUM ('Active','Resolved');
CREATE TYPE public.currency_review_finding AS ENUM ('Still Adequate','No Longer Adequate');
CREATE TYPE public.preparedness_concern_type AS ENUM ('Preparedness Theater','Manufactured Urgency','Other');
CREATE TYPE public.preparedness_concern_status AS ENUM ('Active','Resolved');

-- preparedness_stewards
CREATE TABLE public.preparedness_stewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  source_of_authority_note TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preparedness_stewards TO authenticated;
GRANT ALL ON public.preparedness_stewards TO service_role;
ALTER TABLE public.preparedness_stewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages their preparedness stewards"
  ON public.preparedness_stewards FOR ALL
  USING (EXISTS (SELECT 1 FROM public.participants p WHERE p.id = owner_participant_id AND p.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.participants p WHERE p.id = owner_participant_id AND p.auth_user_id = auth.uid()));
CREATE TRIGGER trg_preparedness_stewards_updated_at BEFORE UPDATE ON public.preparedness_stewards
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- preparedness_records
CREATE TABLE public.preparedness_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  category_description TEXT,
  affected_domain public.preparedness_affected_domain NOT NULL,
  contingency_reference_note TEXT,
  confidence_classification public.preparedness_confidence,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preparedness_records TO authenticated;
GRANT ALL ON public.preparedness_records TO service_role;
ALTER TABLE public.preparedness_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages their preparedness records"
  ON public.preparedness_records FOR ALL
  USING (EXISTS (SELECT 1 FROM public.participants p WHERE p.id = owner_participant_id AND p.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.participants p WHERE p.id = owner_participant_id AND p.auth_user_id = auth.uid()));
CREATE TRIGGER trg_preparedness_records_updated_at BEFORE UPDATE ON public.preparedness_records
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- Ownership helper (mirrors participant_owns_memory_record)
CREATE OR REPLACE FUNCTION public.participant_owns_preparedness_record(_record_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.preparedness_records r
    JOIN public.participants p ON p.id = r.owner_participant_id
    WHERE r.id = _record_id AND p.auth_user_id = auth.uid()
  )
$$;

-- preparedness_gap_flags
CREATE TABLE public.preparedness_gap_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preparedness_record_id UUID NOT NULL REFERENCES public.preparedness_records(id) ON DELETE CASCADE,
  scope public.gap_scope NOT NULL,
  description TEXT NOT NULL,
  status public.gap_status NOT NULL DEFAULT 'Active',
  raised_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preparedness_gap_flags TO authenticated;
GRANT ALL ON public.preparedness_gap_flags TO service_role;
ALTER TABLE public.preparedness_gap_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages gap flags on their records"
  ON public.preparedness_gap_flags FOR ALL
  USING (public.participant_owns_preparedness_record(preparedness_record_id))
  WITH CHECK (public.participant_owns_preparedness_record(preparedness_record_id));

-- currency_reviews
CREATE TABLE public.currency_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preparedness_record_id UUID NOT NULL REFERENCES public.preparedness_records(id) ON DELETE CASCADE,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finding public.currency_review_finding NOT NULL,
  note TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.currency_reviews TO authenticated;
GRANT ALL ON public.currency_reviews TO service_role;
ALTER TABLE public.currency_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages currency reviews on their records"
  ON public.currency_reviews FOR ALL
  USING (public.participant_owns_preparedness_record(preparedness_record_id))
  WITH CHECK (public.participant_owns_preparedness_record(preparedness_record_id));

-- preparedness_concerns
CREATE TABLE public.preparedness_concerns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preparedness_record_id UUID NOT NULL REFERENCES public.preparedness_records(id) ON DELETE CASCADE,
  concern_type public.preparedness_concern_type NOT NULL,
  description TEXT NOT NULL,
  status public.preparedness_concern_status NOT NULL DEFAULT 'Active',
  raised_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preparedness_concerns TO authenticated;
GRANT ALL ON public.preparedness_concerns TO service_role;
ALTER TABLE public.preparedness_concerns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages concerns on their records"
  ON public.preparedness_concerns FOR ALL
  USING (public.participant_owns_preparedness_record(preparedness_record_id))
  WITH CHECK (public.participant_owns_preparedness_record(preparedness_record_id));
