-- CSV imports for any number of brokers are free; only direct sync is Pro.
DROP TRIGGER IF EXISTS broker_limit ON public.brokers;
DROP FUNCTION IF EXISTS public.enforce_broker_limit();
