-- Phase 2 Security Hardening — Stage C (Contract, apply ONLY AFTER Stage B frontend/Worker deploy):
-- Removes legacy cross-user SELECT access on public.profiles (which exposed referral_code, lang, currency).
-- Community, Wall, Messages, DMs, and Avatars all use public.public_profiles after Stage A + Stage B.

DROP POLICY IF EXISTS "public profiles visible to pro members" ON public.profiles;
