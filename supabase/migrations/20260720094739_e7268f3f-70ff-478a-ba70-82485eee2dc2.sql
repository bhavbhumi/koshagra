
-- Ownership helper for Family subjects (mirrors participant_owns_estate)
CREATE OR REPLACE FUNCTION public.participant_owns_family(_family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.continuity_subjects cs
    JOIN public.participants p ON p.id = cs.owner_participant_id
    WHERE cs.id = _family_id
      AND cs.subject_type = 'Family'
      AND p.auth_user_id = auth.uid()
  )
$$;

-- Enums
CREATE TYPE public.family_member_status AS ENUM ('Active', 'Suspended');
CREATE TYPE public.governance_document_type AS ENUM ('Constitution', 'Family Policy', 'Code of Conduct');
CREATE TYPE public.governance_document_status AS ENUM ('Draft', 'Active', 'Superseded');
CREATE TYPE public.governance_body AS ENUM ('Council', 'Assembly');

-- family_members
CREATE TABLE public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.continuity_subjects(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  branch text,
  status public.family_member_status NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages family_members"
  ON public.family_members FOR ALL TO authenticated
  USING (public.participant_owns_family(family_id))
  WITH CHECK (public.participant_owns_family(family_id));
CREATE TRIGGER family_members_updated_at BEFORE UPDATE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- governance_documents
CREATE TABLE public.governance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.continuity_subjects(id) ON DELETE CASCADE,
  document_type public.governance_document_type NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  status public.governance_document_status NOT NULL DEFAULT 'Draft',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.governance_documents TO authenticated;
GRANT ALL ON public.governance_documents TO service_role;
ALTER TABLE public.governance_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages governance_documents"
  ON public.governance_documents FOR ALL TO authenticated
  USING (public.participant_owns_family(family_id))
  WITH CHECK (public.participant_owns_family(family_id));
CREATE TRIGGER governance_documents_updated_at BEFORE UPDATE ON public.governance_documents
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- governance_body_members
CREATE TABLE public.governance_body_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.continuity_subjects(id) ON DELETE CASCADE,
  body public.governance_body NOT NULL,
  family_member_id uuid NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  seat_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, body, family_member_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.governance_body_members TO authenticated;
GRANT ALL ON public.governance_body_members TO service_role;
ALTER TABLE public.governance_body_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages governance_body_members"
  ON public.governance_body_members FOR ALL TO authenticated
  USING (public.participant_owns_family(family_id))
  WITH CHECK (public.participant_owns_family(family_id));
CREATE TRIGGER governance_body_members_updated_at BEFORE UPDATE ON public.governance_body_members
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();
