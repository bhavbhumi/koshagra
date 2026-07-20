
-- Enums
CREATE TYPE public.will_status AS ENUM ('Drafted', 'Executed');
CREATE TYPE public.asset_type AS ENUM ('Asset', 'Digital Asset');
CREATE TYPE public.nomination_role AS ENUM ('Executor', 'Guardian', 'Beneficiary');

-- Helper: does the calling user own this Estate (Continuity Subject)?
CREATE OR REPLACE FUNCTION public.participant_owns_estate(_estate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.continuity_subjects cs
    JOIN public.participants p ON p.id = cs.owner_participant_id
    WHERE cs.id = _estate_id
      AND cs.subject_type = 'Estate'
      AND p.auth_user_id = auth.uid()
  )
$$;

-- wills
CREATE TABLE public.wills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL UNIQUE REFERENCES public.continuity_subjects(id) ON DELETE CASCADE,
  status public.will_status NOT NULL DEFAULT 'Drafted',
  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wills TO authenticated;
GRANT ALL ON public.wills TO service_role;
ALTER TABLE public.wills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage wills of their Estate" ON public.wills
  FOR ALL TO authenticated
  USING (public.participant_owns_estate(estate_id))
  WITH CHECK (public.participant_owns_estate(estate_id));
CREATE TRIGGER wills_updated_at BEFORE UPDATE ON public.wills
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- assets
CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES public.continuity_subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  asset_type public.asset_type NOT NULL DEFAULT 'Asset',
  estimated_value numeric(20,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage assets of their Estate" ON public.assets
  FOR ALL TO authenticated
  USING (public.participant_owns_estate(estate_id))
  WITH CHECK (public.participant_owns_estate(estate_id));
CREATE TRIGGER assets_updated_at BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- liabilities
CREATE TABLE public.liabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES public.continuity_subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric(20,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.liabilities TO authenticated;
GRANT ALL ON public.liabilities TO service_role;
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage liabilities of their Estate" ON public.liabilities
  FOR ALL TO authenticated
  USING (public.participant_owns_estate(estate_id))
  WITH CHECK (public.participant_owns_estate(estate_id));
CREATE TRIGGER liabilities_updated_at BEFORE UPDATE ON public.liabilities
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- nominations
CREATE TABLE public.nominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES public.continuity_subjects(id) ON DELETE CASCADE,
  role public.nomination_role NOT NULL,
  nominee_name text NOT NULL,
  relationship text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nominations TO authenticated;
GRANT ALL ON public.nominations TO service_role;
ALTER TABLE public.nominations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage nominations of their Estate" ON public.nominations
  FOR ALL TO authenticated
  USING (public.participant_owns_estate(estate_id))
  WITH CHECK (public.participant_owns_estate(estate_id));
CREATE TRIGGER nominations_updated_at BEFORE UPDATE ON public.nominations
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();
