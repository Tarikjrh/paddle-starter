-- Insert sample courts
INSERT INTO public.courts (name, description, hourly_rate, image_url, amenities) VALUES
('Court 1', 'Premium indoor paddle court with professional lighting', 45.00, '/placeholder.svg?height=300&width=400', ARRAY['Air Conditioning', 'Professional Lighting', 'Sound System']),
('Court 2', 'Outdoor paddle court with natural grass surroundings', 35.00, '/placeholder.svg?height=300&width=400', ARRAY['Natural Setting', 'Parking Available', 'Changing Rooms']),
('Court 3', 'Indoor court perfect for tournaments and events', 50.00, '/placeholder.svg?height=300&width=400', ARRAY['Tournament Ready', 'Spectator Seating', 'Professional Equipment']);

-- Insert default settings
INSERT INTO public.settings (key, value, description) VALUES
('max_slots_per_booking', '2', 'Maximum number of time slots a user can book at once'),
('booking_advance_days', '30', 'How many days in advance users can book'),
('cancellation_hours', '24', 'Minimum hours before booking to allow cancellation'),
('operating_hours', '{"start": "06:00", "end": "23:00"}', 'Daily operating hours'),
('slot_duration', '60', 'Duration of each time slot in minutes'),
('email_notifications', 'true', 'Send email notifications for bookings'),
('auto_confirm_bookings', 'false', 'Automatically confirm bookings without manual approval'),
('allow_multiple_slots', 'true', 'Allow users to book multiple consecutive slots'),
('require_phone_number', 'false', 'Require phone number during user registration'),
('maintenance_mode', 'false', 'Enable maintenance mode to disable bookings');

-- Create function to handle user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
