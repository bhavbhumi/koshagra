
CREATE TYPE public.participant_type AS ENUM ('Individual', 'Family', 'Institution', 'Professional', 'AI Agent');

CREATE TABLE public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_type public.participant_type NOT NULL DEFAULT 'Individual',
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  capacity_name TEXT NOT NULL DEFAULT 'Principal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.participants TO authenticated;
GRANT ALL ON public.participants TO service_role;

ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their own record"
  ON public.participants FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Participants can update their own record"
  ON public.participants FOR UPDATE TO authenticated
  USING (auth.uid() = auth_user_id) WITH CHECK (auth.uid() = auth_user_id);

CREATE OR REPLACE FUNCTION public.handle_new_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.participants (auth_user_id, participant_type, display_name, email, capacity_name)
  VALUES (
    NEW.id,
    'Individual',
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'Principal'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_participant();

CREATE OR REPLACE FUNCTION public.tg_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER participants_updated_at BEFORE UPDATE ON public.participants
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();
