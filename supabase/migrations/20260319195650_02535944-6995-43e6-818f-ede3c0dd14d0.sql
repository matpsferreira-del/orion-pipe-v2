
-- Strategy groups for commercial mapping
CREATE TABLE public.commercial_strategy_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Link parties to strategy groups
CREATE TABLE public.commercial_strategy_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.commercial_strategy_groups(id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES public.party(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, party_id)
);

-- RLS
ALTER TABLE public.commercial_strategy_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_strategy_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view strategy groups" ON public.commercial_strategy_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert strategy groups" ON public.commercial_strategy_groups FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update strategy groups" ON public.commercial_strategy_groups FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete strategy groups" ON public.commercial_strategy_groups FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view strategy members" ON public.commercial_strategy_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert strategy members" ON public.commercial_strategy_members FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update strategy members" ON public.commercial_strategy_members FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete strategy members" ON public.commercial_strategy_members FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
