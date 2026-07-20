
-- Flag status enum
DO $$ BEGIN
  CREATE TYPE public.cross_domain_flag_status AS ENUM ('Active','Resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- professional_advisors
CREATE TABLE public.professional_advisors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  specialty TEXT,
  contact_note TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_advisors TO authenticated;
GRANT ALL ON public.professional_advisors TO service_role;
ALTER TABLE public.professional_advisors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages advisors" ON public.professional_advisors
  FOR ALL TO authenticated
  USING (owner_participant_id IN (SELECT id FROM public.participants WHERE auth_user_id = auth.uid()))
  WITH CHECK (owner_participant_id IN (SELECT id FROM public.participants WHERE auth_user_id = auth.uid()));
CREATE TRIGGER trg_advisors_updated BEFORE UPDATE ON public.professional_advisors
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- cross_domain_flags
CREATE TABLE public.cross_domain_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  related_subject_id UUID REFERENCES public.continuity_subjects(id) ON DELETE SET NULL,
  status public.cross_domain_flag_status NOT NULL DEFAULT 'Active',
  raised_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cross_domain_flags TO authenticated;
GRANT ALL ON public.cross_domain_flags TO service_role;
ALTER TABLE public.cross_domain_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages flags" ON public.cross_domain_flags
  FOR ALL TO authenticated
  USING (owner_participant_id IN (SELECT id FROM public.participants WHERE auth_user_id = auth.uid()))
  WITH CHECK (owner_participant_id IN (SELECT id FROM public.participants WHERE auth_user_id = auth.uid()));
CREATE TRIGGER trg_flags_updated BEFORE UPDATE ON public.cross_domain_flags
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- coherence_reviews
CREATE TABLE public.coherence_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coherence_reviews TO authenticated;
GRANT ALL ON public.coherence_reviews TO service_role;
ALTER TABLE public.coherence_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages reviews" ON public.coherence_reviews
  FOR ALL TO authenticated
  USING (owner_participant_id IN (SELECT id FROM public.participants WHERE auth_user_id = auth.uid()))
  WITH CHECK (owner_participant_id IN (SELECT id FROM public.participants WHERE auth_user_id = auth.uid()));
