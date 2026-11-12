-- Preserve the provider's execution time as text: many CSVs omit a timezone.
-- Existing rows remain NULL; never infer an execution time from a trade date.
ALTER TABLE public.transactions ADD COLUMN source_executed_at text;
