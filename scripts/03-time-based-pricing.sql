-- Create time-based pricing schedule table
CREATE TABLE public.pricing_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    court_id UUID REFERENCES public.courts(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., 'Peak Hours', 'Off Peak', 'Prime Time'
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    rate DECIMAL(10,2) NOT NULL,
    days_of_week INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7], -- 1=Monday, 7=Sunday, default all days
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (start_time < end_time),
    CONSTRAINT valid_rate CHECK (rate > 0)
);

-- Add index for better query performance
CREATE INDEX idx_pricing_schedules_court_time ON public.pricing_schedules(court_id, start_time, end_time);

-- Enable RLS
ALTER TABLE public.pricing_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pricing_schedules
CREATE POLICY "Anyone can view active pricing schedules" ON public.pricing_schedules
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage pricing schedules" ON public.pricing_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Moderators can view all pricing schedules" ON public.pricing_schedules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'moderator')
        )
    );

-- Function to get the price for a specific court at a specific time
CREATE OR REPLACE FUNCTION public.get_court_price_at_time(
    p_court_id UUID,
    p_booking_date DATE,
    p_start_time TIME
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
    v_rate DECIMAL(10,2);
    v_day_of_week INTEGER;
    v_default_rate DECIMAL(10,2);
BEGIN
    -- Get day of week (1=Monday, 7=Sunday)
    v_day_of_week := EXTRACT(DOW FROM p_booking_date);
    -- Convert PostgreSQL DOW (0=Sunday) to our format (7=Sunday, 1=Monday)
    IF v_day_of_week = 0 THEN
        v_day_of_week := 7;
    END IF;
    
    -- Try to find a matching pricing schedule
    SELECT rate INTO v_rate
    FROM public.pricing_schedules
    WHERE court_id = p_court_id
        AND is_active = true
        AND p_start_time >= start_time
        AND p_start_time < end_time
        AND v_day_of_week = ANY(days_of_week)
    ORDER BY rate DESC -- Use highest rate if multiple schedules match
    LIMIT 1;
    
    -- If no pricing schedule found, use the court's default hourly rate
    IF v_rate IS NULL THEN
        SELECT hourly_rate INTO v_default_rate
        FROM public.courts
        WHERE id = p_court_id;
        
        RETURN COALESCE(v_default_rate, 0);
    END IF;
    
    RETURN v_rate;
END;
$$;

-- Insert sample pricing schedules for existing courts
INSERT INTO public.pricing_schedules (court_id, name, start_time, end_time, rate, days_of_week)
SELECT 
    id as court_id,
    'Peak Hours' as name,
    '17:00'::TIME as start_time,
    '21:00'::TIME as end_time,
    hourly_rate * 1.5 as rate, -- 50% premium for peak hours
    ARRAY[1,2,3,4,5] as days_of_week -- Weekdays only
FROM public.courts
WHERE is_active = true;

INSERT INTO public.pricing_schedules (court_id, name, start_time, end_time, rate, days_of_week)
SELECT 
    id as court_id,
    'Weekend Premium' as name,
    '09:00'::TIME as start_time,
    '18:00'::TIME as end_time,
    hourly_rate * 1.3 as rate, -- 30% premium for weekends
    ARRAY[6,7] as days_of_week -- Saturday and Sunday
FROM public.courts
WHERE is_active = true;

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pricing_schedules_updated_at
    BEFORE UPDATE ON public.pricing_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
