INSERT INTO "platform_settings" (
    "id",
    "key",
    "value",
    "category",
    "description",
    "isEncrypted",
    "isPublic",
    "updatedAt"
)
VALUES
    (
        gen_random_uuid()::text,
        'INTEGRATION_OPEN_SEARCH_ACTIVE',
        'true'::jsonb,
        'INTEGRATION',
        'Enable OpenSearch index synchronisation',
        false,
        false,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid()::text,
        'INTEGRATION_GEMINI_AI',
        'true'::jsonb,
        'INTEGRATION',
        'Enable Google Gemini AI services',
        false,
        false,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid()::text,
        'INTEGRATION_SMTP_ACTIVE',
        'true'::jsonb,
        'INTEGRATION',
        'Enable SMTP platform email service',
        false,
        false,
        CURRENT_TIMESTAMP
    )
ON CONFLICT ("key") DO NOTHING;
