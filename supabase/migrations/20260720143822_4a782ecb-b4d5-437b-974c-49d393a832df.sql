
-- PART A: generalize access_grants
ALTER TABLE public.access_grants
  ADD COLUMN IF NOT EXISTS subject_label text,
  ADD COLUMN IF NOT EXISTS requested_outcome text;

-- PART B: link real Participants as Checkers on each roster
ALTER TABLE public.digital_executors
  ADD COLUMN IF NOT EXISTS linked_participant_id uuid REFERENCES public.participants(id) ON DELETE SET NULL;
ALTER TABLE public.knowledge_stewards
  ADD COLUMN IF NOT EXISTS linked_participant_id uuid REFERENCES public.participants(id) ON DELETE SET NULL;
ALTER TABLE public.preparedness_stewards
  ADD COLUMN IF NOT EXISTS linked_participant_id uuid REFERENCES public.participants(id) ON DELETE SET NULL;
ALTER TABLE public.enforcers
  ADD COLUMN IF NOT EXISTS linked_participant_id uuid REFERENCES public.participants(id) ON DELETE SET NULL;

-- PART C: outcome columns on each target
ALTER TABLE public.representations
  ADD COLUMN IF NOT EXISTS disposition text
    CHECK (disposition IN ('Memorialized','Retired')),
  ADD COLUMN IF NOT EXISTS disposition_decided_at timestamptz;

ALTER TABLE public.institutional_memory_records
  ADD COLUMN IF NOT EXISTS retired_at timestamptz;

ALTER TABLE public.preparedness_records
  ADD COLUMN IF NOT EXISTS retired_at timestamptz;

ALTER TABLE public.dedications
  ADD COLUMN IF NOT EXISTS concluded_at timestamptz,
  ADD COLUMN IF NOT EXISTS conclusion_type text
    CHECK (conclusion_type IN ('Fulfilment','Failure'));

-- Eligibility helpers, one per new entity type
CREATE OR REPLACE FUNCTION public.is_eligible_checker_representation(_grant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.access_grants ag
    JOIN public.representations r ON r.id = ag.subject_entity_id
    JOIN public.digital_executors de ON de.owner_participant_id = r.owner_participant_id
    JOIN public.participants p ON p.id = de.linked_participant_id
    WHERE ag.id = _grant_id
      AND ag.subject_entity_type = 'representation'
      AND p.auth_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_eligible_checker_memory(_grant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.access_grants ag
    JOIN public.institutional_memory_records m ON m.id = ag.subject_entity_id
    JOIN public.knowledge_stewards ks ON ks.owner_participant_id = m.owner_participant_id
    JOIN public.participants p ON p.id = ks.linked_participant_id
    WHERE ag.id = _grant_id
      AND ag.subject_entity_type = 'institutional_memory_record'
      AND p.auth_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_eligible_checker_preparedness(_grant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.access_grants ag
    JOIN public.preparedness_records pr ON pr.id = ag.subject_entity_id
    JOIN public.preparedness_stewards ps ON ps.owner_participant_id = pr.owner_participant_id
    JOIN public.participants p ON p.id = ps.linked_participant_id
    WHERE ag.id = _grant_id
      AND ag.subject_entity_type = 'preparedness_record'
      AND p.auth_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_eligible_checker_dedication(_grant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.access_grants ag
    JOIN public.dedications d ON d.id = ag.subject_entity_id
    JOIN public.enforcers e ON e.dedication_id = d.id
    JOIN public.participants p ON p.id = e.linked_participant_id
    WHERE ag.id = _grant_id
      AND ag.subject_entity_type = 'dedication'
      AND p.auth_user_id = auth.uid()
  );
$$;

-- RLS: allow Checkers to SEE the request rows they're eligible to decide on.
-- The existing Sprint 5 policy already covers governance_document Checkers.
-- Add four SELECT policies, one per new entity type.
DROP POLICY IF EXISTS "checkers see representation grants" ON public.access_grants;
CREATE POLICY "checkers see representation grants" ON public.access_grants
  FOR SELECT TO authenticated
  USING (subject_entity_type = 'representation' AND public.is_eligible_checker_representation(id));

DROP POLICY IF EXISTS "checkers see memory grants" ON public.access_grants;
CREATE POLICY "checkers see memory grants" ON public.access_grants
  FOR SELECT TO authenticated
  USING (subject_entity_type = 'institutional_memory_record' AND public.is_eligible_checker_memory(id));

DROP POLICY IF EXISTS "checkers see preparedness grants" ON public.access_grants;
CREATE POLICY "checkers see preparedness grants" ON public.access_grants
  FOR SELECT TO authenticated
  USING (subject_entity_type = 'preparedness_record' AND public.is_eligible_checker_preparedness(id));

DROP POLICY IF EXISTS "checkers see dedication grants" ON public.access_grants;
CREATE POLICY "checkers see dedication grants" ON public.access_grants
  FOR SELECT TO authenticated
  USING (subject_entity_type = 'dedication' AND public.is_eligible_checker_dedication(id));

-- Extend decide_access_grant with four new branches
CREATE OR REPLACE FUNCTION public.decide_access_grant(_grant_id uuid, _decision text, _reason text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_grant public.access_grants%ROWTYPE;
  v_caller_participant UUID;
  v_family UUID;
  v_doctype governance_document_type;
  v_eligible boolean;
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

  -- Eligibility depends on entity type
  IF v_grant.subject_entity_type = 'governance_document' THEN
    v_eligible := public.is_eligible_checker(_grant_id);
  ELSIF v_grant.subject_entity_type = 'representation' THEN
    v_eligible := public.is_eligible_checker_representation(_grant_id);
  ELSIF v_grant.subject_entity_type = 'institutional_memory_record' THEN
    v_eligible := public.is_eligible_checker_memory(_grant_id);
  ELSIF v_grant.subject_entity_type = 'preparedness_record' THEN
    v_eligible := public.is_eligible_checker_preparedness(_grant_id);
  ELSIF v_grant.subject_entity_type = 'dedication' THEN
    v_eligible := public.is_eligible_checker_dedication(_grant_id);
  ELSE
    v_eligible := false;
  END IF;

  IF NOT v_eligible THEN
    RAISE EXCEPTION 'Caller is not an eligible Checker for this Access Grant';
  END IF;

  UPDATE public.access_grants
  SET grant_status = _decision,
      checker_participant_id = v_caller_participant,
      decision_at = now(),
      denial_reason = CASE WHEN _decision = 'Denied' THEN _reason ELSE NULL END
  WHERE id = _grant_id;

  IF _decision <> 'Granted' THEN
    RETURN;
  END IF;

  -- Apply the outcome
  IF v_grant.subject_entity_type = 'governance_document'
     AND v_grant.requested_transition = 'Activate' THEN

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

  ELSIF v_grant.subject_entity_type = 'representation'
        AND v_grant.requested_transition = 'Disposition' THEN

    IF v_grant.requested_outcome NOT IN ('Memorialize','Retire') THEN
      RAISE EXCEPTION 'Disposition requires an outcome of Memorialize or Retire';
    END IF;

    UPDATE public.representations
    SET disposition = CASE WHEN v_grant.requested_outcome = 'Memorialize' THEN 'Memorialized' ELSE 'Retired' END,
        disposition_decided_at = now()
    WHERE id = v_grant.subject_entity_id;

  ELSIF v_grant.subject_entity_type = 'institutional_memory_record'
        AND v_grant.requested_transition = 'Retire Rationale' THEN

    UPDATE public.institutional_memory_records
    SET retired_at = now()
    WHERE id = v_grant.subject_entity_id;

  ELSIF v_grant.subject_entity_type = 'preparedness_record'
        AND v_grant.requested_transition = 'Retire Category' THEN

    UPDATE public.preparedness_records
    SET retired_at = now()
    WHERE id = v_grant.subject_entity_id;

  ELSIF v_grant.subject_entity_type = 'dedication'
        AND v_grant.requested_transition = 'Conclude Dedication' THEN

    IF v_grant.requested_outcome NOT IN ('Fulfilment','Failure') THEN
      RAISE EXCEPTION 'Conclude Dedication requires an outcome of Fulfilment or Failure';
    END IF;

    UPDATE public.dedications
    SET concluded_at = now(),
        conclusion_type = v_grant.requested_outcome
    WHERE id = v_grant.subject_entity_id;
  END IF;
END;
$function$;

-- Guard: disallow creating a Disposition request before a Transition Trigger,
-- and a Rationale Retirement before at least one Review exists.
CREATE OR REPLACE FUNCTION public.tg_access_grant_preconditions()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.subject_entity_type = 'representation' AND NEW.requested_transition = 'Disposition' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.representations
      WHERE id = NEW.subject_entity_id AND transition_triggered_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'A Disposition can only be requested after a Transition Trigger has been recorded (DM-0007).';
    END IF;
  ELSIF NEW.subject_entity_type = 'institutional_memory_record' AND NEW.requested_transition = 'Retire Rationale' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.memory_reviews WHERE institutional_memory_record_id = NEW.subject_entity_id
    ) THEN
      RAISE EXCEPTION 'Retirement of an Institutional Memory Record requires at least one Review (DM-0008 §6.3).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_access_grant_preconditions ON public.access_grants;
CREATE TRIGGER trg_access_grant_preconditions
  BEFORE INSERT ON public.access_grants
  FOR EACH ROW EXECUTE FUNCTION public.tg_access_grant_preconditions();
