-- ============================================================================
-- HowWePlan - Seed Data for Local Development
-- ============================================================================
-- This script seeds the database with test data:
-- - 1 Admin user
-- - 2 Agents (1 star tier, 1 bench tier)
-- - 1 Regular user
-- - Sample travel request, itinerary, booking for E2E testing
-- ============================================================================

-- ============================================================================
-- USERS
-- ============================================================================

-- Admin User
INSERT INTO users (id, email, email_verified, first_name, last_name, role, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin@howweplan.com',
    TRUE,
    'Admin',
    'User',
    'admin',
    TRUE
);

-- Star Agent User Account
INSERT INTO users (id, email, email_verified, phone, first_name, last_name, role, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000002',
    'star.agent@howweplan.com',
    TRUE,
    '+91-98765-43210',
    'Priya',
    'Sharma',
    'agent',
    TRUE
);

-- Bench Agent User Account
INSERT INTO users (id, email, email_verified, phone, first_name, last_name, role, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000003',
    'bench.agent@howweplan.com',
    TRUE,
    '+91-87654-32109',
    'Rahul',
    'Verma',
    'agent',
    TRUE
);

-- Regular User
INSERT INTO users (id, email, email_verified, phone, first_name, last_name, role, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000004',
    'user@howweplan.com',
    TRUE,
    '+91-99887-76655',
    'Amit',
    'Patel',
    'user',
    TRUE
);

-- ============================================================================
-- AGENTS
-- ============================================================================

-- Star Agent Profile
INSERT INTO agents (
    id, 
    user_id, 
    bio, 
    specializations, 
    languages, 
    destinations, 
    years_of_experience, 
    agency_name, 
    tier, 
    commission_rate,
    rating,
    total_reviews,
    completed_bookings,
    response_time_minutes,
    is_verified,
    is_available
)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'Award-winning travel consultant with expertise in luxury and heritage travel across India. Former Tourism Board advisor with deep knowledge of Rajasthan, Kerala, and the Himalayas.',
    ARRAY['luxury travel', 'heritage tours', 'honeymoons', 'wildlife safaris'],
    ARRAY['English', 'Hindi', 'Marathi'],
    ARRAY['Rajasthan', 'Kerala', 'Himachal Pradesh', 'Uttarakhand', 'Goa'],
    12,
    'Incredible India Tours',
    'star',
    0.1200,
    4.85,
    127,
    89,
    45,
    TRUE,
    TRUE
);

-- Bench Agent Profile
INSERT INTO agents (
    id, 
    user_id, 
    bio, 
    specializations, 
    languages, 
    destinations, 
    years_of_experience, 
    agency_name, 
    tier, 
    commission_rate,
    rating,
    total_reviews,
    completed_bookings,
    response_time_minutes,
    is_verified,
    is_available
)
VALUES (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003',
    'Passionate about budget-friendly adventures and offbeat destinations in India. Specializing in backpacker routes and spiritual journeys.',
    ARRAY['budget travel', 'backpacking', 'spiritual tours', 'trekking'],
    ARRAY['English', 'Hindi', 'Tamil'],
    ARRAY['Varanasi', 'Rishikesh', 'Ladakh', 'Northeast India', 'Andaman Islands'],
    3,
    'Wanderlust India',
    'bench',
    0.0800,
    4.20,
    23,
    18,
    120,
    TRUE,
    TRUE
);

-- ============================================================================
-- SAMPLE TRAVEL REQUEST (for E2E testing)
-- ============================================================================

INSERT INTO travel_requests (
    id,
    user_id,
    title,
    description,
    destination,
    departure_location,
    departure_date,
    return_date,
    travelers,
    budget_min,
    budget_max,
    budget_currency,
    travel_style,
    preferences,
    notes,
    state
)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000004',
    'Dream Honeymoon in Rajasthan',
    'We are planning our honeymoon and have always dreamed of visiting Rajasthan. We want a romantic trip covering Jaipur, Udaipur, and Jodhpur. Interested in palace stays, desert experiences, and cultural heritage.',
    '{"country": "India", "regions": ["Jaipur", "Udaipur", "Jodhpur"], "flexibility": "somewhat_flexible"}',
    '{"city": "Mumbai", "country": "India", "airports": ["BOM"]}',
    (CURRENT_DATE + INTERVAL '60 days')::DATE,
    (CURRENT_DATE + INTERVAL '74 days')::DATE,
    '{"adults": 2, "children": 0, "infants": 0, "details": [{"type": "adult", "name": "Arjun Mehta"}, {"type": "adult", "name": "Neha Mehta"}]}',
    150000.00,
    300000.00,
    'INR',
    'luxury',
    '{"accommodation_type": "heritage_palace", "meal_preference": "local_cuisine", "activity_level": "moderate", "special_occasions": ["honeymoon"], "dietary_restrictions": ["vegetarian"]}',
    'This is our first big trip together. We would love suggestions for romantic restaurants and unique royal experiences.',
    'SUBMITTED'
);

-- ============================================================================
-- SAMPLE AGENT MATCH
-- ============================================================================

INSERT INTO agent_matches (
    id,
    request_id,
    agent_id,
    match_score,
    tier,
    status,
    expires_at
)
VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    95.5,
    'star',
    'accepted',
    (CURRENT_TIMESTAMP + INTERVAL '48 hours')
);

INSERT INTO agent_matches (
    id,
    request_id,
    agent_id,
    match_score,
    tier,
    status,
    expires_at
)
VALUES (
    'd0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    72.0,
    'bench',
    'pending',
    (CURRENT_TIMESTAMP + INTERVAL '48 hours')
);

-- ============================================================================
-- SAMPLE ITINERARY (from star agent)
-- ============================================================================

INSERT INTO itineraries (
    id,
    request_id,
    agent_id,
    title,
    summary,
    highlights,
    total_days,
    disclosure_state,
    submission_format,
    pricing,
    is_selected,
    valid_until
)
VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Royal Rajasthan Odyssey - 14 Days',
    'An unforgettable honeymoon journey through Rajasthan''s most romantic destinations. Experience the pink city of Jaipur, the lake city of Udaipur, and the blue city of Jodhpur.',
    ARRAY[
        'Private tour of Amber Fort with elephant ride',
        'Romantic dinner at Lake Pichola',
        'Desert camping under the stars in Jaisalmer',
        'Private cooking class with a royal chef',
        'Sunset at Mehrangarh Fort'
    ],
    14,
    'OBFUSCATED',
    'structured',
    '{
        "base_price_cents": 22500000,
        "booking_fee_cents": 1125000,
        "taxes_cents": 1350000,
        "currency": "INR",
        "breakdown": {
            "flights": 5000000,
            "accommodation": 12000000,
            "activities": 4000000,
            "transfers": 1500000
        },
        "payment_schedule": {
            "deposit_percent": 30,
            "final_payment_days_before": 30
        }
    }',
    FALSE,
    (CURRENT_TIMESTAMP + INTERVAL '7 days')
);

-- ============================================================================
-- SAMPLE BOOKING (for messaging)
-- ============================================================================

INSERT INTO bookings (
    id,
    request_id,
    itinerary_id,
    user_id,
    agent_id,
    state,
    payment_state,
    base_price_cents,
    booking_fee_cents,
    platform_commission_cents,
    total_amount_cents,
    currency,
    travel_start_date,
    travel_end_date
)
VALUES (
    'ba000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001',
    'CONFIRMED',
    'CAPTURED',
    22500000,
    1125000,
    2700000,
    24975000,
    'INR',
    (CURRENT_DATE + INTERVAL '60 days')::DATE,
    (CURRENT_DATE + INTERVAL '74 days')::DATE
);

-- ============================================================================
-- SAMPLE CONVERSATION & MESSAGES (for chat feature testing)
-- ============================================================================

-- Conversation between User and Star Agent (Sarah)
INSERT INTO conversations (
    id,
    booking_id,
    user_id,
    agent_id,
    state,
    contacts_revealed,
    created_at,
    updated_at
)
VALUES (
    'c0000001-0000-0000-0000-000000000001',
    NULL,
    'a0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001',
    'ACTIVE',
    FALSE,
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '5 minutes'
);

-- Sample messages in the conversation with Priya
INSERT INTO messages (id, conversation_id, sender_id, sender_type, content, content_type, is_read, created_at)
VALUES 
    ('d0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'user', 'Hi Priya! We are so excited about the Rajasthan trip. Can you tell us more about the Udaipur accommodations?', 'text', TRUE, CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('d0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'agent', 'Hello! I am thrilled to help with your honeymoon! For Udaipur, I have selected a beautiful heritage palace hotel overlooking Lake Pichola with stunning sunset views and a private terrace.', 'text', TRUE, CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '30 minutes'),
    ('d0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'user', 'That sounds perfect! We love the idea of lake views. Is the hotel close to the City Palace?', 'text', TRUE, CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('d0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'agent', 'Yes, it is right on the lake! The City Palace is just a short boat ride away. I can also arrange a private dinner on a rooftop with lake views if you prefer a romantic evening under the stars.', 'text', TRUE, CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '1 hour'),
    ('d0000001-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'user', 'A private rooftop dinner sounds amazing! Please add that to our itinerary. Also, any recommendations for the best day to visit Amber Fort?', 'text', FALSE, CURRENT_TIMESTAMP - INTERVAL '5 minutes');

-- ============================================================================
-- SECOND CONVERSATION WITH BENCH AGENT (for testing conversation switching)
-- ============================================================================

-- Conversation between User and Bench Agent (Ben)
INSERT INTO conversations (
    id,
    booking_id,
    user_id,
    agent_id,
    state,
    contacts_revealed,
    created_at,
    updated_at
)
VALUES (
    'c0000001-0000-0000-0000-000000000002',
    NULL,
    'a0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000002',
    'ACTIVE',
    FALSE,
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '30 minutes'
);

-- Sample messages in the conversation with Rahul
INSERT INTO messages (id, conversation_id, sender_id, sender_type, content, content_type, is_read, created_at)
VALUES 
    ('d0000002-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'user', 'Hi Rahul! I saw your profile and your backpacking expertise looks perfect for our Ladakh adventure trip.', 'text', TRUE, CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('d0000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'agent', 'Hey there! Thanks for reaching out! Ladakh is my favorite region - I have trekked there many times over the years. What kind of experience are you looking for?', 'text', TRUE, CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '15 minutes'),
    ('d0000002-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'user', 'We want to do Leh, Nubra Valley, and Pangong Lake over 10 days. Budget is around ₹50,000 per person including flights from Delhi.', 'text', TRUE, CURRENT_TIMESTAMP - INTERVAL '23 hours'),
    ('d0000002-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'agent', 'That is a great budget for 10 days! I can definitely work with that. For Ladakh, I recommend starting in Leh with acclimatization days, then heading to Nubra Valley for the sand dunes and double-humped camels. We can then go to Pangong Lake for the stunning blue waters. The monasteries along the way are incredible!', 'text', TRUE, CURRENT_TIMESTAMP - INTERVAL '22 hours'),
    ('d0000002-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'user', 'That sounds incredible! Can you also suggest some good guesthouses that are comfortable but authentic?', 'text', FALSE, CURRENT_TIMESTAMP - INTERVAL '30 minutes');

-- ============================================================================
-- SAMPLE AUDIT EVENT
-- ============================================================================

INSERT INTO audit_events (
    id,
    event_id,
    event_type,
    event_version,
    occurred_at,
    source_service,
    correlation_id,
    actor_type,
    actor_id,
    resource_type,
    resource_id,
    action,
    description,
    metadata
)
VALUES (
    'f0000000-0000-0000-0000-000000000001',
    'evt_seed_001',
    'request.submitted',
    '1.0.0',
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    'requests',
    'corr_seed_001',
    'user',
    'a0000000-0000-0000-0000-000000000004',
    'travel_request',
    'c0000000-0000-0000-0000-000000000001',
    'SUBMIT_REQUEST',
    'User submitted a new travel request for honeymoon in Rajasthan',
    '{"ip_address": "127.0.0.1", "user_agent": "Seed Script"}'
);

-- ============================================================================
-- EXTENDED SEED DATA (India-only, INR) - for testing all features
-- ============================================================================

-- Additional Users (clients + agent accounts)
INSERT INTO users (id, email, email_verified, phone, first_name, last_name, role, is_active)
VALUES
    ('a0000000-0000-0000-0000-000000000005', 'arjun.kumar+local@howweplan.com', TRUE, '+91-98765-11111', 'Arjun', 'Kumar', 'user', TRUE),
    ('a0000000-0000-0000-0000-000000000006', 'sneha.gupta+local@howweplan.com', TRUE, '+91-98765-22222', 'Sneha', 'Gupta', 'user', TRUE),
    ('a0000000-0000-0000-0000-000000000007', 'vikram.singh+local@howweplan.com', TRUE, '+91-98765-33333', 'Vikram', 'Singh', 'user', TRUE),
    ('a0000000-0000-0000-0000-000000000008', 'ananya.reddy+local@howweplan.com', TRUE, '+91-98765-44444', 'Ananya', 'Reddy', 'agent', TRUE),
    ('a0000000-0000-0000-0000-000000000009', 'karthik.nair+local@howweplan.com', TRUE, '+91-98765-55555', 'Karthik', 'Nair', 'agent', TRUE),
    ('a0000000-0000-0000-0000-000000000010', 'meera.joshi+local@howweplan.com', TRUE, '+91-98765-66666', 'Meera', 'Joshi', 'user', TRUE);

-- Additional Agents
INSERT INTO agents (
    id,
    user_id,
    bio,
    specializations,
    languages,
    destinations,
    years_of_experience,
    agency_name,
    agency_license_number,
    tier,
    commission_rate,
    rating,
    total_reviews,
    completed_bookings,
    response_time_minutes,
    is_verified,
    is_available
)
VALUES
    (
        'b0000000-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000008',
        'Luxury South India specialist focused on Kerala backwaters, wellness retreats, and premium beach stays. Deep local vendor network across Kerala and Goa.',
        ARRAY['luxury travel', 'kerala backwaters', 'ayurveda retreats', 'beach holidays'],
        ARRAY['English', 'Hindi', 'Telugu', 'Malayalam'],
        ARRAY['Kerala', 'Goa', 'Karnataka', 'Tamil Nadu', 'Andaman Islands'],
        10,
        'South India Signature Journeys',
        'SISJ-2015-041',
        'star',
        0.1100,
        4.78,
        98,
        74,
        60,
        TRUE,
        TRUE
    ),
    (
        'b0000000-0000-0000-0000-000000000004',
        'a0000000-0000-0000-0000-000000000009',
        'Budget + adventure planner with strong Himalayas and spiritual circuits experience. Great for short lead-time trips and flexible itineraries.',
        ARRAY['budget travel', 'trekking', 'spiritual tours', 'weekend getaways'],
        ARRAY['English', 'Hindi', 'Malayalam'],
        ARRAY['Ladakh', 'Uttarakhand', 'Varanasi', 'Rishikesh', 'Himachal Pradesh'],
        4,
        'Himalaya & Heritage',
        'HH-2021-112',
        'bench',
        0.0800,
        4.30,
        31,
        22,
        90,
        TRUE,
        TRUE
    );

-- Additional Travel Requests (varied states)
INSERT INTO travel_requests (
    id,
    user_id,
    title,
    description,
    destination,
    departure_location,
    departure_date,
    return_date,
    travelers,
    budget_min,
    budget_max,
    budget_currency,
    travel_style,
    preferences,
    notes,
    state,
    expires_at,
    created_at
)
VALUES
    (
        'c0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000005',
        'Family Trip to Kerala',
        '10-day family vacation covering Kochi, Munnar, Alleppey, and Kovalam. Backwaters, tea plantations, and beaches.',
        '{"country": "India", "regions": ["Kochi", "Munnar", "Alleppey", "Kovalam"], "flexibility": "somewhat_flexible"}',
        '{"city": "Delhi", "country": "India", "airports": ["DEL"]}',
        (CURRENT_DATE + INTERVAL '45 days')::DATE,
        (CURRENT_DATE + INTERVAL '55 days')::DATE,
        '{"adults": 2, "children": 2, "infants": 0}',
        120000.00,
        220000.00,
        'INR',
        'family',
        '{"interests": ["backwaters", "beaches", "tea plantations"], "dietary_restrictions": ["vegetarian"]}',
        'Prefer a child-friendly houseboat and a relaxed pace.',
        'SUBMITTED',
        (CURRENT_TIMESTAMP + INTERVAL '7 days'),
        (CURRENT_TIMESTAMP - INTERVAL '2 hours')
    ),
    (
        'c0000000-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000006',
        'Romantic Udaipur Anniversary',
        'Anniversary trip to Udaipur. Lakeside dining, a sunset boat ride, and palace visits.',
        '{"country": "India", "regions": ["Udaipur"], "flexibility": "flexible"}',
        '{"city": "Mumbai", "country": "India", "airports": ["BOM"]}',
        (CURRENT_DATE + INTERVAL '30 days')::DATE,
        (CURRENT_DATE + INTERVAL '36 days')::DATE,
        '{"adults": 2, "children": 0, "infants": 0}',
        100000.00,
        180000.00,
        'INR',
        'luxury',
        '{"interests": ["heritage", "romantic dining", "boat rides"], "dietary_restrictions": ["vegetarian"]}',
        'Would love one special surprise dinner experience.',
        'AGENTS_MATCHED',
        (CURRENT_TIMESTAMP + INTERVAL '5 days'),
        (CURRENT_TIMESTAMP - INTERVAL '1 day')
    ),
    (
        'c0000000-0000-0000-0000-000000000004',
        'a0000000-0000-0000-0000-000000000007',
        'Ladakh Adventure (Friends)',
        'High-altitude lakes and monasteries with a couple of moderate treks. 4 adults.',
        '{"country": "India", "regions": ["Leh", "Nubra Valley", "Pangong Lake"], "flexibility": "somewhat_flexible"}',
        '{"city": "Delhi", "country": "India", "airports": ["DEL"]}',
        (CURRENT_DATE + INTERVAL '90 days')::DATE,
        (CURRENT_DATE + INTERVAL '100 days')::DATE,
        '{"adults": 4, "children": 0, "infants": 0}',
        220000.00,
        360000.00,
        'INR',
        'adventure',
        '{"interests": ["trekking", "photography", "camping"], "activity_level": "high"}',
        'Need acclimatization days and comfortable stays.',
        'ITINERARIES_RECEIVED',
        (CURRENT_TIMESTAMP + INTERVAL '10 days'),
        (CURRENT_TIMESTAMP - INTERVAL '3 days')
    ),
    (
        'c0000000-0000-0000-0000-000000000005',
        'a0000000-0000-0000-0000-000000000010',
        'Varanasi Spiritual Weekend',
        'A short spiritual trip: Ganga aarti, old city walk, and temple visits.',
        '{"country": "India", "regions": ["Varanasi"], "flexibility": "fixed"}',
        '{"city": "Bengaluru", "country": "India", "airports": ["BLR"]}',
        (CURRENT_DATE + INTERVAL '20 days')::DATE,
        (CURRENT_DATE + INTERVAL '23 days')::DATE,
        '{"adults": 2, "children": 0, "infants": 0}',
        35000.00,
        70000.00,
        'INR',
        'budget',
        '{"interests": ["temples", "heritage", "food"], "activity_level": "moderate"}',
        'Prefer early morning boat ride and local vegetarian food suggestions.',
        'READY_FOR_PAYMENT',
        (CURRENT_TIMESTAMP + INTERVAL '3 days'),
        (CURRENT_TIMESTAMP - INTERVAL '6 hours')
    ),
    (
        'c0000000-0000-0000-0000-000000000006',
        'a0000000-0000-0000-0000-000000000005',
        'Andaman Islands Snorkel Trip',
        'Beach + snorkeling + one scuba session. Looking for a relaxed itinerary with good stays.',
        '{"country": "India", "regions": ["Havelock Island", "Neil Island"], "flexibility": "somewhat_flexible"}',
        '{"city": "Kolkata", "country": "India", "airports": ["CCU"]}',
        (CURRENT_DATE + INTERVAL '75 days')::DATE,
        (CURRENT_DATE + INTERVAL '83 days')::DATE,
        '{"adults": 2, "children": 0, "infants": 0}',
        90000.00,
        160000.00,
        'INR',
        'relaxation',
        '{"interests": ["beach", "snorkeling", "scuba"], "activity_level": "moderate"}',
        'One day should be fully free for beach time.',
        'BOOKED',
        (CURRENT_TIMESTAMP + INTERVAL '14 days'),
        (CURRENT_TIMESTAMP - INTERVAL '10 days')
    ),
    (
        'c0000000-0000-0000-0000-000000000007',
        'a0000000-0000-0000-0000-000000000006',
        'Ooty + Coorg Road Trip Draft',
        'Draft request to plan later.',
        '{"country": "India", "regions": ["Ooty", "Coorg"], "flexibility": "flexible"}',
        '{"city": "Chennai", "country": "India", "airports": ["MAA"]}',
        (CURRENT_DATE + INTERVAL '120 days')::DATE,
        (CURRENT_DATE + INTERVAL '128 days')::DATE,
        '{"adults": 2, "children": 0, "infants": 0}',
        60000.00,
        120000.00,
        'INR',
        'leisure',
        '{"interests": ["nature", "coffee plantations"], "activity_level": "low"}',
        NULL,
        'DRAFT',
        NULL,
        (CURRENT_TIMESTAMP - INTERVAL '30 minutes')
    );

-- Agent Matches (varied statuses)
INSERT INTO agent_matches (id, request_id, agent_id, match_score, tier, status, matched_at, responded_at, expires_at, decline_reason)
VALUES
    ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 93.2, 'star', 'pending', CURRENT_TIMESTAMP - INTERVAL '2 hours', NULL, CURRENT_TIMESTAMP + INTERVAL '46 hours', NULL),
    ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 88.5, 'star', 'pending', CURRENT_TIMESTAMP - INTERVAL '2 hours', NULL, CURRENT_TIMESTAMP + INTERVAL '46 hours', NULL),
    ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 96.1, 'star', 'accepted', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '20 hours', CURRENT_TIMESTAMP + INTERVAL '24 hours', NULL),
    ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004', 74.0, 'bench', 'declined', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '22 hours', CURRENT_TIMESTAMP + INTERVAL '24 hours', 'Too short notice for the requested dates'),
    ('d0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 86.0, 'bench', 'accepted', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '24 hours', NULL),
    ('d0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 81.5, 'bench', 'expired', CURRENT_TIMESTAMP - INTERVAL '3 days', NULL, CURRENT_TIMESTAMP - INTERVAL '1 hour', NULL),
    ('d0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 79.0, 'bench', 'accepted', CURRENT_TIMESTAMP - INTERVAL '8 hours', CURRENT_TIMESTAMP - INTERVAL '7 hours', CURRENT_TIMESTAMP + INTERVAL '40 hours', NULL),
    ('d0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003', 90.0, 'star', 'accepted', CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '9 days', CURRENT_TIMESTAMP + INTERVAL '1 day', NULL);

-- Itineraries (mix of formats + disclosure states)
INSERT INTO itineraries (
    id,
    request_id,
    agent_id,
    title,
    summary,
    highlights,
    total_days,
    disclosure_state,
    submission_format,
    pdf_url,
    external_links,
    free_text_content,
    pricing,
    is_selected,
    valid_until,
    created_at,
    updated_at
)
VALUES
    (
        'e0000000-0000-0000-0000-000000000002',
        'c0000000-0000-0000-0000-000000000004',
        'b0000000-0000-0000-0000-000000000002',
        'Ladakh Adventure (Value Plan) - 11 Days',
        'A value-focused Ladakh plan with acclimatization, monasteries, and iconic lakes.',
        ARRAY['Leh acclimatization', 'Nubra Valley dunes', 'Pangong Lake sunrise', 'Khardung La pass'],
        11,
        'OBFUSCATED',
        'free_text',
        NULL,
        ARRAY['https://example.com/ladakh-value-plan'],
        'Day 1-2: Leh acclimatization. Day 3-4: Nubra. Day 5-6: Pangong. Day 7-9: Monasteries + local markets. Day 10-11: Buffer + departure.',
        '{"base_price_cents": 26000000, "booking_fee_cents": 1300000, "taxes_cents": 1560000, "currency": "INR"}',
        FALSE,
        (CURRENT_TIMESTAMP + INTERVAL '14 days'),
        (CURRENT_TIMESTAMP - INTERVAL '2 days'),
        (CURRENT_TIMESTAMP - INTERVAL '2 days')
    ),
    (
        'e0000000-0000-0000-0000-000000000003',
        'c0000000-0000-0000-0000-000000000004',
        'b0000000-0000-0000-0000-000000000002',
        'Ladakh Adventure (PDF) - 10 Days',
        'A clean PDF itinerary with day-by-day plan and hotel options.',
        ARRAY['Thiksey Monastery', 'Nubra Valley', 'Pangong Lake', 'Local food stops'],
        10,
        'OBFUSCATED',
        'pdf',
        'https://example.com/itineraries/ladakh.pdf',
        ARRAY[]::TEXT[],
        NULL,
        '{"base_price_cents": 24000000, "booking_fee_cents": 1200000, "taxes_cents": 1440000, "currency": "INR"}',
        FALSE,
        (CURRENT_TIMESTAMP + INTERVAL '14 days'),
        (CURRENT_TIMESTAMP - INTERVAL '2 days'),
        (CURRENT_TIMESTAMP - INTERVAL '2 days')
    ),
    (
        'e0000000-0000-0000-0000-000000000004',
        'c0000000-0000-0000-0000-000000000005',
        'b0000000-0000-0000-0000-000000000002',
        'Varanasi Spiritual Weekend - 4 Days',
        'A short itinerary focused on heritage, aarti, and food with comfortable stays.',
        ARRAY['Evening Ganga aarti', 'Sunrise boat ride', 'Old city walk', 'Temple darshan'],
        4,
        'REVEALED',
        'structured',
        NULL,
        ARRAY[]::TEXT[],
        NULL,
        '{"base_price_cents": 4800000, "booking_fee_cents": 240000, "taxes_cents": 288000, "currency": "INR"}',
        TRUE,
        (CURRENT_TIMESTAMP + INTERVAL '5 days'),
        (CURRENT_TIMESTAMP - INTERVAL '6 hours'),
        (CURRENT_TIMESTAMP - INTERVAL '6 hours')
    ),
    (
        'e0000000-0000-0000-0000-000000000005',
        'c0000000-0000-0000-0000-000000000006',
        'b0000000-0000-0000-0000-000000000003',
        'Andaman Beach + Snorkel - 8 Days',
        'A relaxed Andaman plan with premium beach stays and snorkeling days.',
        ARRAY['Radhanagar Beach', 'Snorkeling day', 'Neil Island day trip', 'Scuba add-on'],
        8,
        'REVEALED',
        'link',
        NULL,
        ARRAY['https://example.com/andaman-plan'],
        NULL,
        '{"base_price_cents": 12500000, "booking_fee_cents": 625000, "taxes_cents": 750000, "currency": "INR"}',
        TRUE,
        (CURRENT_TIMESTAMP + INTERVAL '20 days'),
        (CURRENT_TIMESTAMP - INTERVAL '9 days'),
        (CURRENT_TIMESTAMP - INTERVAL '9 days')
    );

-- Bookings + Payments + Refunds (exercise booking/payment/refund/dispute flows)
INSERT INTO bookings (
    id,
    request_id,
    itinerary_id,
    user_id,
    agent_id,
    state,
    payment_state,
    base_price_cents,
    booking_fee_cents,
    platform_commission_cents,
    total_amount_cents,
    currency,
    travel_start_date,
    travel_end_date,
    chat_requirement_met,
    contacts_revealed,
    contacts_revealed_at,
    confirmed_at,
    completed_at,
    created_at,
    updated_at
)
VALUES
    (
        'ba000000-0000-0000-0000-000000000002',
        'c0000000-0000-0000-0000-000000000005',
        'e0000000-0000-0000-0000-000000000004',
        'a0000000-0000-0000-0000-000000000010',
        'b0000000-0000-0000-0000-000000000002',
        'PENDING_PAYMENT',
        'INITIATED',
        4800000,
        240000,
        576000,
        5328000,
        'INR',
        (CURRENT_DATE + INTERVAL '20 days')::DATE,
        (CURRENT_DATE + INTERVAL '23 days')::DATE,
        FALSE,
        FALSE,
        NULL,
        NULL,
        NULL,
        (CURRENT_TIMESTAMP - INTERVAL '4 hours'),
        (CURRENT_TIMESTAMP - INTERVAL '4 hours')
    ),
    (
        'ba000000-0000-0000-0000-000000000003',
        'c0000000-0000-0000-0000-000000000006',
        'e0000000-0000-0000-0000-000000000005',
        'a0000000-0000-0000-0000-000000000005',
        'b0000000-0000-0000-0000-000000000003',
        'CONFIRMED',
        'CAPTURED',
        12500000,
        625000,
        1500000,
        14375000,
        'INR',
        (CURRENT_DATE + INTERVAL '75 days')::DATE,
        (CURRENT_DATE + INTERVAL '83 days')::DATE,
        TRUE,
        TRUE,
        (CURRENT_TIMESTAMP - INTERVAL '8 days'),
        (CURRENT_TIMESTAMP - INTERVAL '8 days'),
        NULL,
        (CURRENT_TIMESTAMP - INTERVAL '9 days'),
        (CURRENT_TIMESTAMP - INTERVAL '8 days')
    );

INSERT INTO payments (
    id,
    booking_id,
    user_id,
    state,
    amount_cents,
    currency,
    stripe_payment_intent_id,
    stripe_checkout_session_id,
    idempotency_key,
    authorized_at,
    captured_at,
    failed_at,
    failure_code,
    failure_message,
    created_at,
    updated_at
)
VALUES
    (
        '11000000-0000-0000-0000-000000000001',
        'ba000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000010',
        'INITIATED',
        5328000,
        'INR',
        'pi_varanasi_001',
        'cs_varanasi_001',
        'idem_varanasi_001',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        (CURRENT_TIMESTAMP - INTERVAL '4 hours'),
        (CURRENT_TIMESTAMP - INTERVAL '4 hours')
    ),
    (
        '11000000-0000-0000-0000-000000000002',
        'ba000000-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000005',
        'CAPTURED',
        14375000,
        'INR',
        'pi_andaman_001',
        'cs_andaman_001',
        'idem_andaman_001',
        (CURRENT_TIMESTAMP - INTERVAL '9 days'),
        (CURRENT_TIMESTAMP - INTERVAL '9 days'),
        NULL,
        NULL,
        NULL,
        (CURRENT_TIMESTAMP - INTERVAL '9 days'),
        (CURRENT_TIMESTAMP - INTERVAL '9 days')
    );

INSERT INTO refunds (
    id,
    payment_id,
    booking_id,
    amount_cents,
    currency,
    refund_type,
    reason,
    initiated_by,
    stripe_refund_id,
    status,
    created_at,
    processed_at
)
VALUES
    (
        '21000000-0000-0000-0000-000000000001',
        '11000000-0000-0000-0000-000000000002',
        'ba000000-0000-0000-0000-000000000003',
        250000,
        'INR',
        'partial',
        'Minor schedule change - refunded one optional activity',
        'platform',
        're_andaman_001',
        'succeeded',
        (CURRENT_TIMESTAMP - INTERVAL '2 days'),
        (CURRENT_TIMESTAMP - INTERVAL '2 days')
    );

-- Dispute + Evidence (open flow)
INSERT INTO disputes (
    id,
    booking_id,
    user_id,
    agent_id,
    category,
    state,
    title,
    description,
    is_subjective_complaint,
    booking_amount,
    requested_refund_amount,
    currency,
    agent_response_deadline,
    created_at,
    updated_at
)
VALUES (
    '51000000-0000-0000-0000-000000000001',
    'ba000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000003',
    'SERVICE_QUALITY',
    'AWAITING_AGENT_RESPONSE',
    'Hotel room category mismatch',
    'The hotel room category listed in the itinerary did not match the room provided at check-in. Requesting partial compensation.',
    TRUE,
    14375000,
    500000,
    'INR',
    (CURRENT_TIMESTAMP + INTERVAL '3 days'),
    (CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (CURRENT_TIMESTAMP - INTERVAL '1 day')
);

INSERT INTO dispute_evidence (
    id,
    dispute_id,
    submitted_by,
    submitted_by_type,
    evidence_type,
    title,
    description,
    file_url,
    created_at
)
VALUES
    (
        '61000000-0000-0000-0000-000000000001',
        '51000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000005',
        'user',
        'image',
        'Room photo',
        'Photo taken at check-in showing the room type provided.',
        '/uploads/disputes/andaman-room-photo.jpg',
        (CURRENT_TIMESTAMP - INTERVAL '1 day')
    ),
    (
        '61000000-0000-0000-0000-000000000002',
        '51000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000005',
        'user',
        'screenshot',
        'Itinerary excerpt',
        'Screenshot showing the room category promised in the itinerary.',
        '/uploads/disputes/itinerary-room-category.png',
        (CURRENT_TIMESTAMP - INTERVAL '1 day')
    );

-- Review (completed/confirmed style feedback)
INSERT INTO reviews (
    id,
    booking_id,
    user_id,
    agent_id,
    rating,
    title,
    content,
    is_verified,
    is_hidden,
    created_at,
    updated_at
)
VALUES (
    '71000000-0000-0000-0000-000000000001',
    'ba000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000003',
    5,
    'Fantastic Andaman Plan',
    'Great pacing and excellent beach stays. Smooth coordination for transfers and snorkeling days.',
    TRUE,
    FALSE,
    (CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (CURRENT_TIMESTAMP - INTERVAL '1 day')
);

-- Notifications (user + agent + admin)
INSERT INTO notifications (id, user_id, type, title, body, data, is_read, created_at)
VALUES
    ('81000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'REQUEST_SUBMITTED', 'Request submitted', 'Your Kerala family trip request has been submitted.', '{"request_id": "c0000000-0000-0000-0000-000000000002"}', FALSE, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
    ('81000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000006', 'AGENTS_MATCHED', 'Agents matched', 'Agents have been matched for your Udaipur anniversary trip.', '{"request_id": "c0000000-0000-0000-0000-000000000003"}', FALSE, CURRENT_TIMESTAMP - INTERVAL '22 hours'),
    ('81000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000007', 'ITINERARY_RECEIVED', 'Itineraries received', 'New itinerary options are available for Ladakh.', '{"request_id": "c0000000-0000-0000-0000-000000000004"}', FALSE, CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('81000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000010', 'PAYMENT_REMINDER', 'Payment pending', 'Complete payment to confirm your Varanasi weekend booking.', '{"booking_id": "ba000000-0000-0000-0000-000000000002"}', FALSE, CURRENT_TIMESTAMP - INTERVAL '3 hours'),
    ('81000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'NEW_MATCH', 'New match', 'You have a new request match: Romantic Udaipur Anniversary.', '{"request_id": "c0000000-0000-0000-0000-000000000003"}', FALSE, CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('81000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'NEW_MATCH', 'New match', 'You have a new request match: Ladakh Adventure (Friends).', '{"request_id": "c0000000-0000-0000-0000-000000000004"}', FALSE, CURRENT_TIMESTAMP - INTERVAL '3 days'),
    ('81000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'DISPUTE_OPENED', 'New dispute opened', 'A dispute has been opened for an Andaman booking.', '{"dispute_id": "51000000-0000-0000-0000-000000000001"}', FALSE, CURRENT_TIMESTAMP - INTERVAL '1 day');

-- Additional Conversations tied to bookings (to exercise chat UI)
INSERT INTO conversations (id, booking_id, user_id, agent_id, state, contacts_revealed, booking_state, created_at, updated_at)
VALUES
    (
        'c0000001-0000-0000-0000-000000000003',
        'ba000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000010',
        'b0000000-0000-0000-0000-000000000002',
        'ACTIVE',
        FALSE,
        'PENDING_PAYMENT',
        CURRENT_TIMESTAMP - INTERVAL '4 hours',
        CURRENT_TIMESTAMP - INTERVAL '2 hours'
    ),
    (
        'c0000001-0000-0000-0000-000000000004',
        'ba000000-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000005',
        'b0000000-0000-0000-0000-000000000003',
        'ACTIVE',
        TRUE,
        'CONFIRMED',
        CURRENT_TIMESTAMP - INTERVAL '9 days',
        CURRENT_TIMESTAMP - INTERVAL '1 day'
    );

INSERT INTO messages (id, conversation_id, sender_id, sender_type, content, content_type, is_read, created_at)
VALUES
    (
        'd0000003-0000-0000-0000-000000000001',
        'c0000001-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000010',
        'user',
        'Hi! Before I pay, can you confirm hotel check-in times and the sunrise boat ride slot?',
        'text',
        TRUE,
        CURRENT_TIMESTAMP - INTERVAL '3 hours'
    ),
    (
        'd0000003-0000-0000-0000-000000000002',
        'c0000001-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000003',
        'agent',
        'Yes — hotel check-in is 2:00 PM. I can reserve the sunrise boat ride slot (typically 5:30–6:00 AM) once payment is completed; I’ll share pickup details right after.',
        'text',
        FALSE,
        CURRENT_TIMESTAMP - INTERVAL '2 hours'
    ),
    (
        'd0000003-0000-0000-0000-000000000003',
        'c0000001-0000-0000-0000-000000000004',
        'a0000000-0000-0000-0000-000000000008',
        'agent',
        'Your resort has confirmed the room upgrade. Also sharing snorkeling timings for tomorrow morning.',
        'text',
        TRUE,
        CURRENT_TIMESTAMP - INTERVAL '1 day'
    );

-- Additional Audit Events
INSERT INTO audit_events (
    id,
    event_id,
    event_type,
    event_version,
    occurred_at,
    source_service,
    correlation_id,
    actor_type,
    actor_id,
    resource_type,
    resource_id,
    action,
    description,
    metadata
)
VALUES
    (
        'f0000000-0000-0000-0000-000000000002',
        'evt_seed_002',
        'booking.created',
        '1.0.0',
        CURRENT_TIMESTAMP - INTERVAL '4 hours',
        'booking-payments',
        'corr_seed_002',
        'user',
        'a0000000-0000-0000-0000-000000000010',
        'booking',
        'ba000000-0000-0000-0000-000000000002',
        'CREATE_BOOKING',
        'User initiated a booking for Varanasi weekend',
        '{"amount_cents": 5328000, "currency": "INR"}'
    ),
    (
        'f0000000-0000-0000-0000-000000000003',
        'evt_seed_003',
        'dispute.opened',
        '1.0.0',
        CURRENT_TIMESTAMP - INTERVAL '1 day',
        'disputes',
        'corr_seed_003',
        'user',
        'a0000000-0000-0000-0000-000000000005',
        'dispute',
        '51000000-0000-0000-0000-000000000001',
        'OPEN_DISPUTE',
        'User opened a dispute for Andaman booking',
        '{"requested_refund_amount": 500000, "currency": "INR"}'
    );

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify seed data)
-- ============================================================================

-- Uncomment to verify:
-- SELECT 'Users' as entity, COUNT(*) as count FROM users;
-- SELECT 'Agents' as entity, COUNT(*) as count FROM agents;
-- SELECT 'Travel Requests' as entity, COUNT(*) as count FROM travel_requests;
-- SELECT 'Agent Matches' as entity, COUNT(*) as count FROM agent_matches;
-- SELECT 'Itineraries' as entity, COUNT(*) as count FROM itineraries;
-- SELECT 'Audit Events' as entity, COUNT(*) as count FROM audit_events;

