CREATE TABLE IF NOT EXISTS admins (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ideas (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    description VARCHAR(500) NOT NULL,
    long_description TEXT NOT NULL DEFAULT '',
    category VARCHAR(100) NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    image_description VARCHAR(300) NOT NULL DEFAULT '',
    video_url TEXT NOT NULL DEFAULT '',
    video_description VARCHAR(300) NOT NULL DEFAULT '',
    startup_capital TEXT NOT NULL DEFAULT '',
    expected_cost TEXT NOT NULL DEFAULT '',
    expected_revenue TEXT NOT NULL DEFAULT '',
    requirements TEXT NOT NULL DEFAULT '',
    equipment TEXT NOT NULL DEFAULT '',
    target_customers TEXT NOT NULL DEFAULT '',
    steps TEXT NOT NULL DEFAULT '',
    profitability_notes TEXT NOT NULL DEFAULT '',
    risks TEXT NOT NULL DEFAULT '',
    tips TEXT NOT NULL DEFAULT '',
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS opportunities (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    description VARCHAR(500) NOT NULL,
    long_description TEXT NOT NULL DEFAULT '',
    category VARCHAR(100) NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    image_description VARCHAR(300) NOT NULL DEFAULT '',
    video_url TEXT NOT NULL DEFAULT '',
    video_description VARCHAR(300) NOT NULL DEFAULT '',
    startup_capital TEXT NOT NULL DEFAULT '',
    expected_cost TEXT NOT NULL DEFAULT '',
    expected_revenue TEXT NOT NULL DEFAULT '',
    requirements TEXT NOT NULL DEFAULT '',
    equipment TEXT NOT NULL DEFAULT '',
    target_customers TEXT NOT NULL DEFAULT '',
    steps TEXT NOT NULL DEFAULT '',
    profitability_notes TEXT NOT NULL DEFAULT '',
    risks TEXT NOT NULL DEFAULT '',
    tips TEXT NOT NULL DEFAULT '',
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skills (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    description VARCHAR(500) NOT NULL,
    long_description TEXT NOT NULL DEFAULT '',
    category VARCHAR(100) NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    image_description VARCHAR(300) NOT NULL DEFAULT '',
    video_url TEXT NOT NULL DEFAULT '',
    video_description VARCHAR(300) NOT NULL DEFAULT '',
    startup_capital TEXT NOT NULL DEFAULT '',
    expected_cost TEXT NOT NULL DEFAULT '',
    expected_revenue TEXT NOT NULL DEFAULT '',
    requirements TEXT NOT NULL DEFAULT '',
    equipment TEXT NOT NULL DEFAULT '',
    target_customers TEXT NOT NULL DEFAULT '',
    steps TEXT NOT NULL DEFAULT '',
    profitability_notes TEXT NOT NULL DEFAULT '',
    risks TEXT NOT NULL DEFAULT '',
    tips TEXT NOT NULL DEFAULT '',
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ideas DROP CONSTRAINT IF EXISTS ideas_startup_capital_check;
ALTER TABLE ideas DROP CONSTRAINT IF EXISTS ideas_expected_cost_check;
ALTER TABLE ideas DROP CONSTRAINT IF EXISTS ideas_expected_revenue_check;
ALTER TABLE ideas ALTER COLUMN startup_capital DROP DEFAULT;
ALTER TABLE ideas ALTER COLUMN expected_cost DROP DEFAULT;
ALTER TABLE ideas ALTER COLUMN expected_revenue DROP DEFAULT;
ALTER TABLE ideas ALTER COLUMN startup_capital TYPE TEXT USING startup_capital::TEXT;
ALTER TABLE ideas ALTER COLUMN expected_cost TYPE TEXT USING expected_cost::TEXT;
ALTER TABLE ideas ALTER COLUMN expected_revenue TYPE TEXT USING expected_revenue::TEXT;
ALTER TABLE ideas ALTER COLUMN startup_capital SET DEFAULT '';
ALTER TABLE ideas ALTER COLUMN expected_cost SET DEFAULT '';
ALTER TABLE ideas ALTER COLUMN expected_revenue SET DEFAULT '';

ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_startup_capital_check;
ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_expected_cost_check;
ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_expected_revenue_check;
ALTER TABLE opportunities ALTER COLUMN startup_capital DROP DEFAULT;
ALTER TABLE opportunities ALTER COLUMN expected_cost DROP DEFAULT;
ALTER TABLE opportunities ALTER COLUMN expected_revenue DROP DEFAULT;
ALTER TABLE opportunities ALTER COLUMN startup_capital TYPE TEXT USING startup_capital::TEXT;
ALTER TABLE opportunities ALTER COLUMN expected_cost TYPE TEXT USING expected_cost::TEXT;
ALTER TABLE opportunities ALTER COLUMN expected_revenue TYPE TEXT USING expected_revenue::TEXT;
ALTER TABLE opportunities ALTER COLUMN startup_capital SET DEFAULT '';
ALTER TABLE opportunities ALTER COLUMN expected_cost SET DEFAULT '';
ALTER TABLE opportunities ALTER COLUMN expected_revenue SET DEFAULT '';

ALTER TABLE skills DROP CONSTRAINT IF EXISTS skills_startup_capital_check;
ALTER TABLE skills DROP CONSTRAINT IF EXISTS skills_expected_cost_check;
ALTER TABLE skills DROP CONSTRAINT IF EXISTS skills_expected_revenue_check;
ALTER TABLE skills ALTER COLUMN startup_capital DROP DEFAULT;
ALTER TABLE skills ALTER COLUMN expected_cost DROP DEFAULT;
ALTER TABLE skills ALTER COLUMN expected_revenue DROP DEFAULT;
ALTER TABLE skills ALTER COLUMN startup_capital TYPE TEXT USING startup_capital::TEXT;
ALTER TABLE skills ALTER COLUMN expected_cost TYPE TEXT USING expected_cost::TEXT;
ALTER TABLE skills ALTER COLUMN expected_revenue TYPE TEXT USING expected_revenue::TEXT;
ALTER TABLE skills ALTER COLUMN startup_capital SET DEFAULT '';
ALTER TABLE skills ALTER COLUMN expected_cost SET DEFAULT '';
ALTER TABLE skills ALTER COLUMN expected_revenue SET DEFAULT '';

CREATE TABLE IF NOT EXISTS comments (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    comment VARCHAR(2000) NOT NULL,
    content_type VARCHAR(20),
    content_id BIGINT,
    approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT comments_content_type_check
        CHECK (content_type IS NULL OR content_type IN ('ideas', 'opportunities', 'skills'))
);

CREATE TABLE IF NOT EXISTS contacts (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL,
    contact_type VARCHAR(20) NOT NULL DEFAULT 'message'
        CHECK (contact_type IN ('message', 'question', 'problem', 'suggestion', 'feedback')),
    message VARCHAR(5000) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'read', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    whatsapp_number VARCHAR(16) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL,
    whatsapp_number VARCHAR(16) NOT NULL,
    contact_type VARCHAR(20) NOT NULL DEFAULT 'message'
        CHECK (contact_type IN ('message', 'question', 'problem', 'suggestion', 'feedback')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'replied')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('user', 'admin')),
    body VARCHAR(5000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_outbox (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id BIGINT REFERENCES conversation_messages(id) ON DELETE CASCADE,
    channel VARCHAR(10) NOT NULL CHECK (channel IN ('email', 'whatsapp')),
    status VARCHAR(12) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'retrying', 'sent', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_until TIMESTAMPTZ,
    last_error VARCHAR(1000),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notification_outbox
    ADD COLUMN IF NOT EXISTS message_id BIGINT REFERENCES conversation_messages(id) ON DELETE CASCADE;
ALTER TABLE notification_outbox
    DROP CONSTRAINT IF EXISTS notification_outbox_conversation_id_channel_key;
UPDATE notification_outbox n
SET message_id = (
    SELECT m.id FROM conversation_messages m
    WHERE m.conversation_id = n.conversation_id AND m.sender_type = 'user'
    ORDER BY m.created_at, m.id
    LIMIT 1
)
WHERE n.message_id IS NULL;

ALTER TABLE contacts
    ADD COLUMN IF NOT EXISTS contact_type VARCHAR(20) NOT NULL DEFAULT 'message';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'contacts_contact_type_check'
    ) THEN
        ALTER TABLE contacts
            ADD CONSTRAINT contacts_contact_type_check
            CHECK (contact_type IN ('message', 'question', 'problem', 'suggestion', 'feedback'));
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS media (
    id BIGSERIAL PRIMARY KEY,
    content_type VARCHAR(20) NOT NULL,
    content_id BIGINT,
    media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('image', 'video')),
    title VARCHAR(180) NOT NULL,
    description VARCHAR(500) NOT NULL DEFAULT '',
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    page_slug VARCHAR(50)
);

ALTER TABLE media ADD COLUMN IF NOT EXISTS page_slug VARCHAR(50);
ALTER TABLE media ALTER COLUMN content_id DROP NOT NULL;
ALTER TABLE media DROP CONSTRAINT IF EXISTS media_content_type_check;
ALTER TABLE media DROP CONSTRAINT IF EXISTS media_target_check;
ALTER TABLE media
    ADD CONSTRAINT media_target_check
    CHECK (
        (content_type = 'pages' AND content_id IS NULL AND page_slug IS NOT NULL AND page_slug IN (
            'home', 'ideas', 'skills', 'opportunities', 'about', 'contact', 'search', 'privacy', 'terms'
        ))
        OR
        (content_type IN ('ideas', 'opportunities', 'skills') AND content_id IS NOT NULL AND page_slug IS NULL)
    );

CREATE INDEX IF NOT EXISTS ideas_published_created_idx ON ideas (published, created_at DESC);
CREATE INDEX IF NOT EXISTS opportunities_published_created_idx ON opportunities (published, created_at DESC);
CREATE INDEX IF NOT EXISTS skills_published_created_idx ON skills (published, created_at DESC);
CREATE INDEX IF NOT EXISTS comments_approved_created_idx ON comments (approved, created_at DESC);
CREATE INDEX IF NOT EXISTS contacts_status_created_idx ON contacts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS media_content_idx ON media (content_type, content_id);
CREATE INDEX IF NOT EXISTS conversations_user_created_idx ON conversations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS conversations_status_created_idx ON conversations (status, created_at DESC);
CREATE INDEX IF NOT EXISTS conversation_messages_conversation_created_idx ON conversation_messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS notification_outbox_due_idx ON notification_outbox (status, next_attempt_at)
    WHERE status IN ('pending', 'retrying');
CREATE UNIQUE INDEX IF NOT EXISTS notification_outbox_message_channel_idx
    ON notification_outbox (message_id, channel)
    WHERE message_id IS NOT NULL;
