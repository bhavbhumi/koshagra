
-- Enums
CREATE TYPE public.representation_type AS ENUM ('Digital Identity', 'AI Agent', 'Cryptographic Key');
CREATE TYPE public.transition_trigger_type AS ENUM ('Incapacity', 'Death', 'Dormancy', 'Unauthorized Continuation', 'Other');
CREATE TYPE public.representation_concern_type AS ENUM ('Compromise', 'Authority Ambiguity', 'Other');
CREATE TYPE public.representation_concern_status AS ENUM ('Active', 'Resolved');

-- digital_executors: direct-owned roster
CREATE TABLE public.digital_executors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  source_of_authority_note TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.digital_executors TO authenticated;
GRANT ALL ON public.digital_executors TO service_role;
ALTER TABLE public.digital_executors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants manage their own Digital Executors" ON public.digital_executors
  FOR ALL TO authenticated
  USING (owner_participant_id IN (SELECT id FROM public.participants WHERE auth_user_id = auth.uid()))
  WITH CHECK (owner_participant_id IN (SELECT id FROM public.participants WHERE auth_user_id = auth.uid()));
CREATE TRIGGER trg_digital_executors_updated BEFORE UPDATE ON public.digital_executors
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- representations: direct-owned
CREATE TABLE public.representations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  representation_type public.representation_type NOT NULL,
  platform_or_custodian TEXT,
  authorized_scope TEXT NOT NULL,
  transition_triggered_at TIMESTAMPTZ,
  transition_trigger_type public.transition_trigger_type,
  transition_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.representations TO authenticated;
GRANT ALL ON public.representations TO service_role;
ALTER TABLE public.representations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants manage their own Representations" ON public.representations
  FOR ALL TO authenticated
  USING (owner_participant_id IN (SELECT id FROM public.participants WHERE auth_user_id = auth.uid()))
  WITH CHECK (owner_participant_id IN (SELECT id FROM public.participants WHERE auth_user_id = auth.uid()));
CREATE TRIGGER trg_representations_updated BEFORE UPDATE ON public.representations
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- Ownership helper (mirrors participant_owns_dedication)
CREATE OR REPLACE FUNCTION public.participant_owns_representation(_representation_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.representations r
    JOIN public.participants p ON p.id = r.owner_participant_id
    WHERE r.id = _representation_id
      AND p.auth_user_id = auth.uid()
  )
$$;

-- Immutability trigger: once transition_triggered_at is set,
-- authorized_scope and all transition_* fields become fixed.
CREATE OR REPLACE FUNCTION public.tg_representation_scope_lock()
RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.transition_triggered_at IS NOT NULL THEN
    IF NEW.authorized_scope IS DISTINCT FROM OLD.authorized_scope THEN
      RAISE EXCEPTION 'Authorized Scope is fixed once a Transition Trigger has been recorded (DM-0007 §4.2).';
    END IF;
    IF NEW.transition_triggered_at IS DISTINCT FROM OLD.transition_triggered_at
       OR NEW.transition_trigger_type IS DISTINCT FROM OLD.transition_trigger_type
       OR NEW.transition_note IS DISTINCT FROM OLD.transition_note THEN
      RAISE EXCEPTION 'A recorded Transition Trigger cannot be modified in this build.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_representation_scope_lock BEFORE UPDATE ON public.representations
  FOR EACH ROW EXECUTE FUNCTION public.tg_representation_scope_lock();

-- monitoring_checks
CREATE TABLE public.monitoring_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  representation_id UUID NOT NULL REFERENCES public.representations(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitoring_checks TO authenticated;
GRANT ALL ON public.monitoring_checks TO service_role;
ALTER TABLE public.monitoring_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants manage checks on their own Representations" ON public.monitoring_checks
  FOR ALL TO authenticated
  USING (public.participant_owns_representation(representation_id))
  WITH CHECK (public.participant_owns_representation(representation_id));

-- representation_concerns
CREATE TABLE public.representation_concerns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  representation_id UUID NOT NULL REFERENCES public.representations(id) ON DELETE CASCADE,
  concern_type public.representation_concern_type NOT NULL,
  description TEXT NOT NULL,
  status public.representation_concern_status NOT NULL DEFAULT 'Active',
  raised_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.representation_concerns TO authenticated;
GRANT ALL ON public.representation_concerns TO service_role;
ALTER TABLE public.representation_concerns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants manage concerns on their own Representations" ON public.representation_concerns
  FOR ALL TO authenticated
  USING (public.participant_owns_representation(representation_id))
  WITH CHECK (public.participant_owns_representation(representation_id));
