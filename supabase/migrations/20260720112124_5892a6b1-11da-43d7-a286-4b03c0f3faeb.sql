
CREATE OR REPLACE FUNCTION public.participant_owns_trust(_trust_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.continuity_subjects cs
    JOIN public.participants p ON p.id = cs.owner_participant_id
    WHERE cs.id = _trust_id
      AND cs.subject_type = 'Trust'
      AND p.auth_user_id = auth.uid()
  )
$$;

CREATE TYPE public.trustee_role AS ENUM ('Trustee', 'Successor Trustee');
CREATE TYPE public.beneficiary_type AS ENUM ('Named', 'Class');

-- settlors
CREATE TABLE public.settlors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id uuid NOT NULL REFERENCES public.continuity_subjects(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settlors TO authenticated;
GRANT ALL ON public.settlors TO service_role;
ALTER TABLE public.settlors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trust owner manages settlors" ON public.settlors FOR ALL TO authenticated
  USING (public.participant_owns_trust(trust_id))
  WITH CHECK (public.participant_owns_trust(trust_id));
CREATE TRIGGER settlors_updated_at BEFORE UPDATE ON public.settlors
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- trustees
CREATE TABLE public.trustees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id uuid NOT NULL REFERENCES public.continuity_subjects(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  trustee_role public.trustee_role NOT NULL DEFAULT 'Trustee',
  source_of_authority_note text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trustees TO authenticated;
GRANT ALL ON public.trustees TO service_role;
ALTER TABLE public.trustees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trust owner manages trustees" ON public.trustees FOR ALL TO authenticated
  USING (public.participant_owns_trust(trust_id))
  WITH CHECK (public.participant_owns_trust(trust_id));
CREATE TRIGGER trustees_updated_at BEFORE UPDATE ON public.trustees
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- protectors
CREATE TABLE public.protectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id uuid NOT NULL REFERENCES public.continuity_subjects(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  scope_note text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.protectors TO authenticated;
GRANT ALL ON public.protectors TO service_role;
ALTER TABLE public.protectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trust owner manages protectors" ON public.protectors FOR ALL TO authenticated
  USING (public.participant_owns_trust(trust_id))
  WITH CHECK (public.participant_owns_trust(trust_id));
CREATE TRIGGER protectors_updated_at BEFORE UPDATE ON public.protectors
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- beneficiaries
CREATE TABLE public.beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id uuid NOT NULL REFERENCES public.continuity_subjects(id) ON DELETE CASCADE,
  beneficiary_type public.beneficiary_type NOT NULL,
  name_or_description text NOT NULL,
  entitlement_note text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beneficiaries TO authenticated;
GRANT ALL ON public.beneficiaries TO service_role;
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trust owner manages beneficiaries" ON public.beneficiaries FOR ALL TO authenticated
  USING (public.participant_owns_trust(trust_id))
  WITH CHECK (public.participant_owns_trust(trust_id));
CREATE TRIGGER beneficiaries_updated_at BEFORE UPDATE ON public.beneficiaries
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- trust_property
CREATE TABLE public.trust_property (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id uuid NOT NULL REFERENCES public.continuity_subjects(id) ON DELETE CASCADE,
  property_description text NOT NULL,
  estimated_value numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trust_property TO authenticated;
GRANT ALL ON public.trust_property TO service_role;
ALTER TABLE public.trust_property ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trust owner manages trust property" ON public.trust_property FOR ALL TO authenticated
  USING (public.participant_owns_trust(trust_id))
  WITH CHECK (public.participant_owns_trust(trust_id));
CREATE TRIGGER trust_property_updated_at BEFORE UPDATE ON public.trust_property
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- trust_instruments (deliberately NO status column)
CREATE TABLE public.trust_instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id uuid NOT NULL REFERENCES public.continuity_subjects(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Trust Instrument',
  executed_date date,
  body text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trust_instruments TO authenticated;
GRANT ALL ON public.trust_instruments TO service_role;
ALTER TABLE public.trust_instruments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trust owner manages trust instruments" ON public.trust_instruments FOR ALL TO authenticated
  USING (public.participant_owns_trust(trust_id))
  WITH CHECK (public.participant_owns_trust(trust_id));
CREATE TRIGGER trust_instruments_updated_at BEFORE UPDATE ON public.trust_instruments
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();
