
-- Enums
CREATE TYPE public.memory_originating_domain AS ENUM (
  'Estate Planning','Family Governance','Business Succession','Trust Administration',
  'Philanthropy','Digital Legacy','Cross-Domain / Other'
);
CREATE TYPE public.memory_confidence AS ENUM (
  'Verified Memory','Reported Memory','Inferred Memory','Unknown Memory'
);
CREATE TYPE public.memory_applicability AS ENUM ('Still Applies','No Longer Applies');
CREATE TYPE public.memory_concern_type AS ENUM ('Fossilization','Selective Memory','Other');
CREATE TYPE public.memory_concern_status AS ENUM ('Active','Resolved');

-- knowledge_stewards (direct Participant scope)
CREATE TABLE public.knowledge_stewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  source_of_authority_note TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_stewards TO authenticated;
GRANT ALL ON public.knowledge_stewards TO service_role;
ALTER TABLE public.knowledge_stewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages knowledge stewards" ON public.knowledge_stewards
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.participants p WHERE p.id = owner_participant_id AND p.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.participants p WHERE p.id = owner_participant_id AND p.auth_user_id = auth.uid()));
CREATE TRIGGER trg_knowledge_stewards_updated_at BEFORE UPDATE ON public.knowledge_stewards
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- institutional_memory_records
CREATE TABLE public.institutional_memory_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  originating_domain public.memory_originating_domain NOT NULL,
  originating_steward_note TEXT,
  decision_summary TEXT NOT NULL,
  rationale_text TEXT,
  alternatives_considered TEXT,
  confidence_classification public.memory_confidence,
  applicability_signal public.memory_applicability NOT NULL DEFAULT 'Still Applies',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institutional_memory_records TO authenticated;
GRANT ALL ON public.institutional_memory_records TO service_role;
ALTER TABLE public.institutional_memory_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages memory records" ON public.institutional_memory_records
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.participants p WHERE p.id = owner_participant_id AND p.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.participants p WHERE p.id = owner_participant_id AND p.auth_user_id = auth.uid()));
CREATE TRIGGER trg_memory_records_updated_at BEFORE UPDATE ON public.institutional_memory_records
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- Ownership helper
CREATE OR REPLACE FUNCTION public.participant_owns_memory_record(_record_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.institutional_memory_records r
    JOIN public.participants p ON p.id = r.owner_participant_id
    WHERE r.id = _record_id AND p.auth_user_id = auth.uid()
  )
$$;

-- Curation-lock trigger: once rationale_text AND confidence_classification are BOTH set,
-- decision_summary, originating_domain, rationale_text, alternatives_considered,
-- and confidence_classification become permanently immutable.
CREATE OR REPLACE FUNCTION public.tg_memory_record_curation_lock()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.rationale_text IS NOT NULL AND OLD.confidence_classification IS NOT NULL THEN
    IF NEW.decision_summary IS DISTINCT FROM OLD.decision_summary
       OR NEW.originating_domain IS DISTINCT FROM OLD.originating_domain
       OR NEW.rationale_text IS DISTINCT FROM OLD.rationale_text
       OR NEW.alternatives_considered IS DISTINCT FROM OLD.alternatives_considered
       OR NEW.confidence_classification IS DISTINCT FROM OLD.confidence_classification THEN
      RAISE EXCEPTION 'Curation is complete; the historical record cannot be rewritten. Record a Review entry instead (DM-0008 §4.4).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_memory_record_curation_lock BEFORE UPDATE ON public.institutional_memory_records
  FOR EACH ROW EXECUTE FUNCTION public.tg_memory_record_curation_lock();

-- memory_retrievals
CREATE TABLE public.memory_retrievals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institutional_memory_record_id UUID NOT NULL REFERENCES public.institutional_memory_records(id) ON DELETE CASCADE,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_retrievals TO authenticated;
GRANT ALL ON public.memory_retrievals TO service_role;
ALTER TABLE public.memory_retrievals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages memory retrievals" ON public.memory_retrievals
  FOR ALL TO authenticated
  USING (public.participant_owns_memory_record(institutional_memory_record_id))
  WITH CHECK (public.participant_owns_memory_record(institutional_memory_record_id));

-- memory_reviews
CREATE TABLE public.memory_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institutional_memory_record_id UUID NOT NULL REFERENCES public.institutional_memory_records(id) ON DELETE CASCADE,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finding public.memory_applicability NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_reviews TO authenticated;
GRANT ALL ON public.memory_reviews TO service_role;
ALTER TABLE public.memory_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages memory reviews" ON public.memory_reviews
  FOR ALL TO authenticated
  USING (public.participant_owns_memory_record(institutional_memory_record_id))
  WITH CHECK (public.participant_owns_memory_record(institutional_memory_record_id));

-- On review insert, apply the finding to the parent record's applicability_signal.
-- This is a SECURITY DEFINER path so it can update applicability_signal even though
-- the row-level update path is otherwise fine; keep it simple and narrow.
CREATE OR REPLACE FUNCTION public.tg_memory_review_apply_signal()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.institutional_memory_records
    SET applicability_signal = NEW.finding
  WHERE id = NEW.institutional_memory_record_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_memory_review_apply_signal AFTER INSERT ON public.memory_reviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_memory_review_apply_signal();

-- memory_concerns
CREATE TABLE public.memory_concerns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institutional_memory_record_id UUID NOT NULL REFERENCES public.institutional_memory_records(id) ON DELETE CASCADE,
  concern_type public.memory_concern_type NOT NULL,
  description TEXT NOT NULL,
  status public.memory_concern_status NOT NULL DEFAULT 'Active',
  raised_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_concerns TO authenticated;
GRANT ALL ON public.memory_concerns TO service_role;
ALTER TABLE public.memory_concerns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages memory concerns" ON public.memory_concerns
  FOR ALL TO authenticated
  USING (public.participant_owns_memory_record(institutional_memory_record_id))
  WITH CHECK (public.participant_owns_memory_record(institutional_memory_record_id));

CREATE INDEX idx_memory_records_owner ON public.institutional_memory_records(owner_participant_id);
CREATE INDEX idx_memory_retrievals_record ON public.memory_retrievals(institutional_memory_record_id, retrieved_at DESC);
CREATE INDEX idx_memory_reviews_record ON public.memory_reviews(institutional_memory_record_id, reviewed_at DESC);
CREATE INDEX idx_memory_concerns_record ON public.memory_concerns(institutional_memory_record_id, raised_at DESC);
CREATE INDEX idx_knowledge_stewards_owner ON public.knowledge_stewards(owner_participant_id);
