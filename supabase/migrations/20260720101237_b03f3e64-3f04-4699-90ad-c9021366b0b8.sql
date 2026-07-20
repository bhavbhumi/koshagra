
-- Part A: Link Participant to a Family Member seat
ALTER TABLE public.family_members
  ADD COLUMN linked_participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL;

-- Exact-email lookup, returning only id + display_name.
CREATE OR REPLACE FUNCTION public.find_participant_by_email(_email TEXT)
RETURNS TABLE(id UUID, display_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.display_name
  FROM public.participants p
  WHERE lower(p.email) = lower(trim(_email))
  LIMIT 1;
$$;

-- Part B: access_grants
CREATE TABLE public.access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_entity_type TEXT NOT NULL,
  subject_entity_id UUID NOT NULL,
  requested_transition TEXT NOT NULL,
  required_scope_tier TEXT NOT NULL DEFAULT 'Approve',
  maker_participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  checker_participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
  grant_status TEXT NOT NULL DEFAULT 'Requested',
  decision_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT access_grants_status_check CHECK (grant_status IN ('Requested','Granted','Denied'))
);

CREATE INDEX access_grants_subject_idx ON public.access_grants(subject_entity_type, subject_entity_id);
CREATE INDEX access_grants_maker_idx ON public.access_grants(maker_participant_id);
CREATE INDEX access_grants_status_idx ON public.access_grants(grant_status);

GRANT SELECT, INSERT ON public.access_grants TO authenticated;
GRANT ALL ON public.access_grants TO service_role;

ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;

-- Eligible-Checker helper: joins governance_document → family → governance_body_members → family_members → participants.
CREATE OR REPLACE FUNCTION public.is_eligible_checker(_grant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.access_grants ag
    JOIN public.governance_documents gd ON gd.id = ag.subject_entity_id
    JOIN public.governance_body_members gbm ON gbm.family_id = gd.family_id
    JOIN public.family_members fm ON fm.id = gbm.family_member_id
    JOIN public.participants p ON p.id = fm.linked_participant_id
    WHERE ag.id = _grant_id
      AND ag.subject_entity_type = 'governance_document'
      AND p.auth_user_id = auth.uid()
  );
$$;

-- Maker sees own grants
CREATE POLICY "Maker sees own access grants" ON public.access_grants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participants p
      WHERE p.id = maker_participant_id AND p.auth_user_id = auth.uid()
    )
  );

-- Maker inserts as self
CREATE POLICY "Maker inserts own access grants" ON public.access_grants
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participants p
      WHERE p.id = maker_participant_id AND p.auth_user_id = auth.uid()
    )
  );

-- Checker sees grants they are eligible to decide
CREATE POLICY "Eligible Checker sees pending grants" ON public.access_grants
  FOR SELECT TO authenticated
  USING (public.is_eligible_checker(id));

-- decide_access_grant: single-transaction decision with supersession
CREATE OR REPLACE FUNCTION public.decide_access_grant(
  _grant_id UUID,
  _decision TEXT,
  _reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_grant public.access_grants%ROWTYPE;
  v_caller_participant UUID;
  v_family UUID;
  v_doctype governance_document_type;
BEGIN
  SELECT id INTO v_caller_participant
  FROM public.participants
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  IF v_caller_participant IS NULL THEN
    RAISE EXCEPTION 'No Participant record found for caller';
  END IF;

  SELECT * INTO v_grant FROM public.access_grants WHERE id = _grant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Access Grant not found';
  END IF;
  IF v_grant.grant_status <> 'Requested' THEN
    RAISE EXCEPTION 'This Access Grant has already been decided';
  END IF;
  IF v_grant.maker_participant_id = v_caller_participant THEN
    RAISE EXCEPTION 'Maker and Checker cannot be the same Participant';
  END IF;
  IF _decision NOT IN ('Granted','Denied') THEN
    RAISE EXCEPTION 'Decision must be Granted or Denied';
  END IF;
  IF NOT public.is_eligible_checker(_grant_id) THEN
    RAISE EXCEPTION 'Caller is not an eligible Checker for this Access Grant';
  END IF;

  UPDATE public.access_grants
  SET grant_status = _decision,
      checker_participant_id = v_caller_participant,
      decision_at = now(),
      denial_reason = CASE WHEN _decision = 'Denied' THEN _reason ELSE NULL END
  WHERE id = _grant_id;

  IF _decision = 'Granted'
     AND v_grant.requested_transition = 'Activate'
     AND v_grant.subject_entity_type = 'governance_document' THEN

    SELECT family_id, document_type INTO v_family, v_doctype
    FROM public.governance_documents
    WHERE id = v_grant.subject_entity_id;

    UPDATE public.governance_documents
    SET status = 'Superseded'
    WHERE family_id = v_family
      AND document_type = v_doctype
      AND status = 'Active'
      AND id <> v_grant.subject_entity_id;

    UPDATE public.governance_documents
    SET status = 'Active'
    WHERE id = v_grant.subject_entity_id;
  END IF;
END;
$$;
