
-- ============ Enums ============
CREATE TYPE public.dedication_vehicle AS ENUM ('Foundation','Charitable Trust','Donor-Advised Fund','Informal');
CREATE TYPE public.concern_type AS ENUM ('Drift','Capture','Other');
CREATE TYPE public.concern_status AS ENUM ('Active','Resolved');

-- ============ dedications (root) ============
CREATE TABLE public.dedications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  philanthropic_purpose TEXT NOT NULL,
  vehicle public.dedication_vehicle,
  related_trust_id UUID REFERENCES public.continuity_subjects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dedications TO authenticated;
GRANT ALL ON public.dedications TO service_role;
ALTER TABLE public.dedications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants manage their own Dedications" ON public.dedications
FOR ALL TO authenticated
USING (owner_participant_id IN (SELECT id FROM public.participants WHERE auth_user_id = auth.uid()))
WITH CHECK (owner_participant_id IN (SELECT id FROM public.participants WHERE auth_user_id = auth.uid()));

CREATE TRIGGER update_dedications_updated_at BEFORE UPDATE ON public.dedications
FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- Purpose is fixed at Dedication — block any update to philanthropic_purpose.
CREATE OR REPLACE FUNCTION public.tg_dedication_purpose_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.philanthropic_purpose IS DISTINCT FROM OLD.philanthropic_purpose THEN
    RAISE EXCEPTION 'Philanthropic Purpose is fixed at Dedication and cannot be changed (DM-0006 §3.2).';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER dedication_purpose_immutable BEFORE UPDATE ON public.dedications
FOR EACH ROW EXECUTE FUNCTION public.tg_dedication_purpose_immutable();

-- Ownership helper mirroring participant_owns_trust.
CREATE OR REPLACE FUNCTION public.participant_owns_dedication(_dedication_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.dedications d
    JOIN public.participants p ON p.id = d.owner_participant_id
    WHERE d.id = _dedication_id
      AND p.auth_user_id = auth.uid()
  )
$$;

-- ============ Child tables ============
CREATE TABLE public.donors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dedication_id UUID NOT NULL REFERENCES public.dedications(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donors TO authenticated;
GRANT ALL ON public.donors TO service_role;
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages Donors" ON public.donors FOR ALL TO authenticated
USING (public.participant_owns_dedication(dedication_id))
WITH CHECK (public.participant_owns_dedication(dedication_id));

CREATE TABLE public.philanthropic_stewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dedication_id UUID NOT NULL REFERENCES public.dedications(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  source_of_authority_note TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.philanthropic_stewards TO authenticated;
GRANT ALL ON public.philanthropic_stewards TO service_role;
ALTER TABLE public.philanthropic_stewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages Philanthropic Stewards" ON public.philanthropic_stewards FOR ALL TO authenticated
USING (public.participant_owns_dedication(dedication_id))
WITH CHECK (public.participant_owns_dedication(dedication_id));

CREATE TABLE public.enforcers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dedication_id UUID NOT NULL REFERENCES public.dedications(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  scope_note TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enforcers TO authenticated;
GRANT ALL ON public.enforcers TO service_role;
ALTER TABLE public.enforcers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages Enforcers" ON public.enforcers FOR ALL TO authenticated
USING (public.participant_owns_dedication(dedication_id))
WITH CHECK (public.participant_owns_dedication(dedication_id));

CREATE TABLE public.grantees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dedication_id UUID NOT NULL REFERENCES public.dedications(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  purpose_alignment_note TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grantees TO authenticated;
GRANT ALL ON public.grantees TO service_role;
ALTER TABLE public.grantees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages Grantees" ON public.grantees FOR ALL TO authenticated
USING (public.participant_owns_dedication(dedication_id))
WITH CHECK (public.participant_owns_dedication(dedication_id));

CREATE TABLE public.distributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dedication_id UUID NOT NULL REFERENCES public.dedications(id) ON DELETE CASCADE,
  grantee_id UUID NOT NULL REFERENCES public.grantees(id) ON DELETE CASCADE,
  amount NUMERIC(18,2),
  distributed_date DATE,
  alignment_note TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributions TO authenticated;
GRANT ALL ON public.distributions TO service_role;
ALTER TABLE public.distributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages Distributions" ON public.distributions FOR ALL TO authenticated
USING (public.participant_owns_dedication(dedication_id))
WITH CHECK (public.participant_owns_dedication(dedication_id));

CREATE TABLE public.impact_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dedication_id UUID NOT NULL REFERENCES public.dedications(id) ON DELETE CASCADE,
  recorded_date DATE,
  description TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.impact_records TO authenticated;
GRANT ALL ON public.impact_records TO service_role;
ALTER TABLE public.impact_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages Impact Records" ON public.impact_records FOR ALL TO authenticated
USING (public.participant_owns_dedication(dedication_id))
WITH CHECK (public.participant_owns_dedication(dedication_id));

CREATE TABLE public.purpose_fidelity_concerns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dedication_id UUID NOT NULL REFERENCES public.dedications(id) ON DELETE CASCADE,
  concern_type public.concern_type NOT NULL,
  description TEXT NOT NULL,
  escalated_to_enforcer BOOLEAN NOT NULL DEFAULT false,
  status public.concern_status NOT NULL DEFAULT 'Active',
  raised_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purpose_fidelity_concerns TO authenticated;
GRANT ALL ON public.purpose_fidelity_concerns TO service_role;
ALTER TABLE public.purpose_fidelity_concerns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages Purpose Fidelity Concerns" ON public.purpose_fidelity_concerns FOR ALL TO authenticated
USING (public.participant_owns_dedication(dedication_id))
WITH CHECK (public.participant_owns_dedication(dedication_id));

CREATE TABLE public.purpose_fidelity_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dedication_id UUID NOT NULL REFERENCES public.dedications(id) ON DELETE CASCADE,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purpose_fidelity_reviews TO authenticated;
GRANT ALL ON public.purpose_fidelity_reviews TO service_role;
ALTER TABLE public.purpose_fidelity_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages Purpose Fidelity Reviews" ON public.purpose_fidelity_reviews FOR ALL TO authenticated
USING (public.participant_owns_dedication(dedication_id))
WITH CHECK (public.participant_owns_dedication(dedication_id));
