CREATE OR REPLACE FUNCTION public.enforce_broker_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lim int; cnt int;
BEGIN
  lim := CASE WHEN public.is_pro(NEW.user_id) THEN 5 ELSE 1 END;
  SELECT count(*) INTO cnt FROM public.brokers WHERE user_id = NEW.user_id;
  IF cnt >= lim THEN RAISE EXCEPTION 'BROKER_LIMIT:%', lim; END IF;
  RETURN NEW;
END $$;
