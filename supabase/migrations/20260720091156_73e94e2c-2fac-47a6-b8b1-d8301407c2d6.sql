
REVOKE ALL ON FUNCTION public.participant_owns_estate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.participant_owns_estate(uuid) TO authenticated, service_role;
