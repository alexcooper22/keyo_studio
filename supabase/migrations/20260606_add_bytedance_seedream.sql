-- Add ByteDance Seedream 4.5 image model
INSERT INTO ai_models (name, provider, model_id, category, enabled, sort_order, api_key_env)
VALUES ('Seedream 4.5', 'bytedance', 'seedream-4.5', 'image', true, 10, 'BYTE_DANCE_API_KEY');

INSERT INTO model_pricing (model_id, quality, credits, unit, cost_usd)
SELECT id, '1K', 1, 'per_image', 0.020 FROM ai_models WHERE name = 'Seedream 4.5'
UNION ALL
SELECT id, '2K', 2, 'per_image', 0.030 FROM ai_models WHERE name = 'Seedream 4.5'
UNION ALL
SELECT id, '4K', 3, 'per_image', 0.040 FROM ai_models WHERE name = 'Seedream 4.5';
