
-- Enums
CREATE TYPE public.enterprise_principal_role AS ENUM ('Founder', 'Principal');
CREATE TYPE public.successor_type AS ENUM ('Leadership', 'Ownership');
CREATE TYPE public.enterprise_document_type AS ENUM ('Enterprise Constitution', 'Buy-Sell Agreement');
CREATE TYPE public.enterprise_document_status AS ENUM ('Draft', 'Active', 'Superseded');

-- Ownership helper (mirrors participant_owns_family / participant_owns_estate)
CREATE OR REPLACE FUNCTION public.participant_owns_enterprise(_enterprise_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.continuity_subjects cs
    JOIN public.participants p ON p.id = cs.owner_participant_id
    WHERE cs.id = _enterprise_id
      AND cs.subject_type = 'Enterprise'
      AND p.auth_user_id = auth.uid()
  )
$$;

-- enterprise_principals
CREATE TABLE public.enterprise_principals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES public.continuity_subjects(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role public.enterprise_principal_role NOT NULL DEFAULT 'Principal',
  role_detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enterprise_principals TO authenticated;
GRANT ALL ON public.enterprise_principals TO service_role;
ALTER TABLE public.enterprise_principals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages enterprise principals" ON public.enterprise_principals
  FOR ALL TO authenticated
  USING (public.participant_owns_enterprise(enterprise_id))
  WITH CHECK (public.participant_owns_enterprise(enterprise_id));
CREATE TRIGGER enterprise_principals_updated_at BEFORE UPDATE ON public.enterprise_principals
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- ownership_interests
CREATE TABLE public.ownership_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES public.continuity_subjects(id) ON DELETE CASCADE,
  holder_name text NOT NULL,
  interest_description text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ownership_interests TO authenticated;
GRANT ALL ON public.ownership_interests TO service_role;
ALTER TABLE public.ownership_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages ownership interests" ON public.ownership_interests
  FOR ALL TO authenticated
  USING (public.participant_owns_enterprise(enterprise_id))
  WITH CHECK (public.participant_owns_enterprise(enterprise_id));
CREATE TRIGGER ownership_interests_updated_at BEFORE UPDATE ON public.ownership_interests
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- successors
CREATE TABLE public.successors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES public.continuity_subjects(id) ON DELETE CASCADE,
  successor_type public.successor_type NOT NULL,
  full_name text NOT NULL,
  relationship_to_enterprise text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.successors TO authenticated;
GRANT ALL ON public.successors TO service_role;
ALTER TABLE public.successors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages successors" ON public.successors
  FOR ALL TO authenticated
  USING (public.participant_owns_enterprise(enterprise_id))
  WITH CHECK (public.participant_owns_enterprise(enterprise_id));
CREATE TRIGGER successors_updated_at BEFORE UPDATE ON public.successors
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- key_persons
CREATE TABLE public.key_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES public.continuity_subjects(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  significance text NOT NULL DEFAULT '',
  mitigation_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.key_persons TO authenticated;
GRANT ALL ON public.key_persons TO service_role;
ALTER TABLE public.key_persons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages key persons" ON public.key_persons
  FOR ALL TO authenticated
  USING (public.participant_owns_enterprise(enterprise_id))
  WITH CHECK (public.participant_owns_enterprise(enterprise_id));
CREATE TRIGGER key_persons_updated_at BEFORE UPDATE ON public.key_persons
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- enterprise_documents
CREATE TABLE public.enterprise_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES public.continuity_subjects(id) ON DELETE CASCADE,
  document_type public.enterprise_document_type NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  status public.enterprise_document_status NOT NULL DEFAULT 'Draft',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enterprise_documents TO authenticated;
GRANT ALL ON public.enterprise_documents TO service_role;
ALTER TABLE public.enterprise_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages enterprise documents" ON public.enterprise_documents
  FOR ALL TO authenticated
  USING (public.participant_owns_enterprise(enterprise_id))
  WITH CHECK (public.participant_owns_enterprise(enterprise_id));
CREATE TRIGGER enterprise_documents_updated_at BEFORE UPDATE ON public.enterprise_documents
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- board_members (roster only)
CREATE TABLE public.board_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES public.continuity_subjects(id) ON DELETE CASCADE,
  principal_id uuid NOT NULL REFERENCES public.enterprise_principals(id) ON DELETE CASCADE,
  seat_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enterprise_id, principal_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_members TO authenticated;
GRANT ALL ON public.board_members TO service_role;
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages board members" ON public.board_members
  FOR ALL TO authenticated
  USING (public.participant_owns_enterprise(enterprise_id))
  WITH CHECK (public.participant_owns_enterprise(enterprise_id));
CREATE TRIGGER board_members_updated_at BEFORE UPDATE ON public.board_members
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();
