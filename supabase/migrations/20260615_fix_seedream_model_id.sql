-- Fix Seedream 4.5 model_id to match actual ByteDance ModelArk API model name
UPDATE ai_models SET model_id = 'seedream-4-5-251128' WHERE name = 'Seedream 4.5' AND provider = 'bytedance';
