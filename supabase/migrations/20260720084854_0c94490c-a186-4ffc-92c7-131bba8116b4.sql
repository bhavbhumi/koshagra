
CREATE TYPE public.subject_type AS ENUM ('Estate', 'Family', 'Enterprise', 'Trust', 'Digital Legacy');

CREATE TABLE public.continuity_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject_type public.subject_type NOT NULL,
  purpose_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce one Estate per Participant (DM-0001).
CREATE UNIQUE INDEX continuity_subjects_one_estate_per_owner
  ON public.continuity_subjects (owner_participant_id)
  WHERE subject_type = 'Estate';

CREATE INDEX continuity_subjects_owner_idx ON public.continuity_subjects (owner_participant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.continuity_subjects TO authenticated;
GRANT ALL ON public.continuity_subjects TO service_role;

ALTER TABLE public.continuity_subjects ENABLE ROW LEVEL SECURITY;

-- A Participant can only see/manage rows whose owner_participant_id is their own participants.id.
CREATE POLICY "Owners can view their continuity subjects"
  ON public.continuity_subjects FOR SELECT
  TO authenticated
  USING (owner_participant_id IN (SELECT id FROM public.participants WHERE auth_user_id = auth.uid()));

CREATE POLICY "Owners can insert their continuity subjects"
  ON public.continuity_subjects FOR INSERT
  TO authenticated
  WITH CHECK (owner_participant_id IN (SELECT id FROM public.participants WHERE auth_user_id = auth.uid()));

CREATE POLICY "Owners can update their continuity subjects"
  ON public.continuity_subjects FOR UPDATE
  TO authenticated
  USING (owner_participant_id IN (SELECT id FROM public.participants WHERE auth_user_id = auth.uid()))
  WITH CHECK (owner_participant_id IN (SELECT id FROM public.participants WHERE auth_user_id = auth.uid()));

CREATE POLICY "Owners can delete their continuity subjects"
  ON public.continuity_subjects FOR DELETE
  TO authenticated
  USING (owner_participant_id IN (SELECT id FROM public.participants WHERE auth_user_id = auth.uid()));

CREATE TRIGGER continuity_subjects_updated_at
  BEFORE UPDATE ON public.continuity_subjects
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();
