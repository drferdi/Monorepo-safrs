# A1 planning model: candidates to replace o1 (decision material only)

Private, gitignored (`*_NOTES.md`). No model was changed; defaults stay `o1` / `gpt-4o`.

Source: public `GET https://openrouter.ai/api/v1/models` and `GET https://openrouter.ai/api/v1/endpoints/zdr`,
no API key, no completion call, fetched 2026-09-27 05:04 UTC. Prices change; re-run before deciding.

Filter: the model's `supported_parameters` contain `reasoning` (OpenRouter's reasoning flag) and
`structured_outputs`, AND at least one zero-data-retention endpoint that itself lists
`structured_outputs`. Price = US$ per 1M tokens on those ZDR endpoints (range when several
providers serve it; OpenRouter picks among them). Excludes OpenRouter's 5.5% credit-purchase fee.

Result: 139 of 458 listed models. For reference: `openai/o1` in 15 / out 60, no ZDR endpoint;
`openai/o3`, `o3-mini`, `o4-mini` also have no ZDR endpoint. OpenAI models below are ZDR only via Azure.

Not checked here (needs a decision, then a measured run): clinical quality, latency against the
12 s step deadline, and whether reasoning tokens are billed as output (usually yes).

| Model | Input $/1M | Output $/1M | ZDR providers | Context | Expires |
| --- | --- | --- | --- | --- | --- |
| `qwen/qwen3.8-27b:free` | 0.000 | 0.000 | ModelRun | 262144 |  |
| `openai/gpt-oss-20b` | 0.020–0.075 | 0.100–0.300 | AkashML, CoreWeave, DeepInfra, DekaLLM, Google, Groq, Novita, Parasail, SiliconFlow | 131072 |  |
| `z-ai/glm-5.3-flash` | 0.045–0.430 | 0.140–0.600 | BaseTen, CoreWeave, Crusoe, Decart, DeepInfra, DigitalOcean, Fireworks, Inceptron, InferenceNet, Io Net, Modal, Morph, Near AI, NextBit, OpenInference, Parasail, Phala, Reka, Sail Research, Together, Venice, Wafer | 1310720 |  |
| `ibm-granite/granite-4.2-8b` | 0.100 | 0.150 | CoreWeave | 131072 |  |
| `inception/mercury-2.5` | 0.040 | 0.150 | Inception | 260000 |  |
| `qwen/qwen3.5-9b` | 0.100–0.170 | 0.150–0.250 | DeepInfra, Parasail, SiliconFlow, Together, Venice | 262144 |  |
| `openai/gpt-oss-120b` | 0.030–0.350 | 0.170–0.750 | AkashML, BaseTen, Cerebras, CoreWeave, Crusoe, DeepInfra, DekaLLM, Google, Groq, Mancer 2, Mara, Nebius, Parasail, Phala, SiliconFlow, Together | 131072 |  |
| `deepseek/deepseek-v4-flash` | 0.040–0.190 | 0.180–0.500 | DeepInfra, DigitalOcean, Mancer 2, NextBit, OpenInference, Parasail, Venice | 1048576 |  |
| `deepseek/deepseek-v4-flash-0731` | 0.022–0.440 | 0.180–1.320 | Cohere, DeepInfra, DigitalOcean, Fireworks, Inceptron, Makora, Mancer 2, Morph, Nebius, NextBit, OpenInference, Parasail, Phala, Reka, Sail Research, SiliconFlow, Together, Venice, Wafer | 1310720 |  |
| `inclusionai/ling-3.0-flash-fin` | 0.060 | 0.180 | DeepInfra | 262144 |  |
| `inclusionai/ling-3.0-flash-vl` | 0.060 | 0.180 | DeepInfra | 262144 |  |
| `google/gemma-4-26b-a4b-it` | 0.060–0.150 | 0.200–0.600 | CoreWeave, DeepInfra, Google, NextBit, Parasail, Reka, SiliconFlow, Venice | 262144 |  |
| `nvidia/nemotron-3-nano-30b-a3b` | 0.050–0.060 | 0.200–0.240 | Crusoe, Nebius | 262144 |  |
| `nvidia/nemotron-3.5-lightning` | 0.070–0.080 | 0.200 | CoreWeave, DeepInfra, Phala | 1000000 |  |
| `rekaai/reka-flash-3` | 0.100 | 0.200 | Reka | 65536 |  |
| `upstage/solar-mini4` | 0.050 | 0.200 | Upstage | 524288 |  |
| `qwen/qwen3-14b` | 0.100–0.120 | 0.220–0.240 | DeepInfra, NextBit | 131072 |  |
| `xiaomi/mimo-v2.5` | 0.133–0.400 | 0.266–2.000 | DeepInfra, Venice | 1050000 |  |
| `qwen/qwen3-32b` | 0.080–0.140 | 0.280–0.570 | DeepInfra, SiliconFlow | 131072 |  |
| `xiaomi/mimo-v2.6-flash` | 0.140 | 0.280 | DeepInfra | 1048576 |  |
| `deepseek/deepseek-v4.1-flash` | 0.035–0.375 | 0.290–1.500 | CoreWeave, DeepInfra, DekaLLM, DigitalOcean, Fireworks, InferenceNet, Makora, Modal, Morph, NextBit, OpenInference, Parasail, Sail Research, Together, Venice, Wafer | 1048576 |  |
| `bytedance-seed/seed-1.6-flash` | 0.075 | 0.300 | Seed | 262144 | 2026-11-11 |
| `google/gemma-4-31b-it` | 0.080–0.750 | 0.300–1.000 | CoreWeave, Crusoe, DeepInfra, ModelRun, Novita, Parasail, Reka, SiliconFlow, Venice | 262144 |  |
| `openai/gpt-oss-safeguard-20b` | 0.075 | 0.300 | Groq | 131072 |  |
| `upstage/solar-pro4` | 0.090 | 0.360 | Upstage | 524288 |  |
| `deepseek/deepseek-v3.2` | 0.259–3.000 | 0.380–4.500 | DeepInfra, Google, Mara, Phala, SiliconFlow, Venice | 163840 | 2026-09-28 |
| `bytedance-seed/seed-2.0-mini` | 0.100 | 0.400 | Seed | 262144 |  |
| `google/gemini-2.5-flash-lite` | 0.100 | 0.400 | Google | 1048576 | 2026-10-20 |
| `openai/gpt-5-nano` | 0.050–0.055 | 0.400–0.440 | Azure | 400000 |  |
| `z-ai/glm-4.7-flash` | 0.060 | 0.400 | Venice | 200000 |  |
| `deepseek/deepseek-v3.2-exp` | 0.270 | 0.410 | Novita, SiliconFlow | 163840 | 2026-09-28 |
| `nvidia/nemotron-3-super-120b-a12b` | 0.080 | 0.450 | DekaLLM | 262144 |  |
| `openai/gpt-6-luna` | 0.100–0.110 | 0.500–0.550 | Azure | 1050000 |  |
| `openai/gpt-6-luna-pro` | 0.100–0.110 | 0.500–0.550 | Azure | 1050000 |  |
| `qwen/qwen3-30b-a3b` | 0.120 | 0.500 | DeepInfra | 131072 |  |
| `tencent/hy3` | 0.130–0.150 | 0.530–0.640 | DeepInfra, Novita, Phala | 262144 |  |
| `tencent/hunyuan-a13b-instruct` | 0.140 | 0.570 | SiliconFlow | 131072 |  |
| `mistralai/mistral-small-2603` | 0.150–0.165 | 0.600–0.660 | Mistral | 262144 |  |
| `deepseek/deepseek-v4-flash-vision-exp` | 0.216–0.220 | 0.647–0.660 | DeepInfra, Fireworks | 1048576 |  |
| `google/gemini-3.1-flash-lite` | 0.125–0.450 | 0.750–2.700 | Google | 1048576 |  |
| `inception/mercury-2` | 0.250 | 0.750 | Inception | 128000 |  |
| `xiaomi/mimo-v2.6-pro` | 0.435 | 0.870 | DeepInfra | 1050000 |  |
| `qwen/qwen3.6-35b-a3b` | 0.100–0.250 | 0.900–1.800 | AkashML, CoreWeave, DeepInfra, Parasail, Phala, Reka, SiliconFlow | 262144 |  |
| `deepseek/deepseek-chat-v3.1` | 0.250–0.600 | 0.950–1.700 | CoreWeave, DeepInfra, Google, Mara, Novita, SiliconFlow | 163840 |  |
| `minimax/minimax-m2.7` | 0.240 | 0.960 | Mara | 204800 |  |
| `minimax/minimax-m3` | 0.230–0.750 | 0.960–3.000 | CoreWeave, ModelRun, Together | 1048576 |  |
| `deepseek/deepseek-v3.1-terminus` | 0.270 | 1.000 | Novita, SiliconFlow | 163840 | 2026-09-28 |
| `qwen/qwen3-vl-30b-a3b-thinking` | 0.290 | 1.000 | SiliconFlow | 262144 | 2026-10-09 |
| `qwen/qwen3.5-35b-a3b` | 0.140–0.312 | 1.000–1.800 | DeepInfra, Parasail, SiliconFlow, Venice | 262144 |  |
| `meta/muse-glimmer-30b` | 0.300–0.350 | 1.100–1.500 | DeepInfra, Fireworks, Phala, Together | 131072 |  |
| `stepfun/step-3.7-flash` | 0.200 | 1.150 | Novita | 262144 |  |
| `xiaomi/mimo-v2.5-pro` | 0.390–0.480 | 1.170–1.800 | DeepInfra, DigitalOcean | 1050000 |  |
| `minimax/minimax-m2` | 0.300 | 1.200 | Google | 204800 |  |
| `minimax/minimax-m2.5` | 0.300 | 1.200 | DigitalOcean | 204800 |  |
| `openai/gpt-5.6-luna` | 0.200–0.220 | 1.200–1.320 | Azure | 1050000 |  |
| `openai/gpt-5.6-luna-pro` | 0.200–0.220 | 1.200–1.320 | Azure | 1050000 |  |
| `qwen/qwen3-next-80b-a3b-thinking` | 0.150 | 1.200 | Google | 262144 |  |
| `google/gemini-3.5-flash-lite` | 0.150–0.540 | 1.250–4.500 | Google | 1048576 |  |
| `openai/gpt-5.4-nano` | 0.200–0.220 | 1.250–1.375 | Azure | 400000 |  |
| `z-ai/glm-5.3` | 0.440–1.540 | 1.384–4.840 | AkashML, BaseTen, Crusoe, Decart, DeepInfra, DigitalOcean, Fireworks, InferenceNet, Io Net, Makora, Mistral, Modal, Morph, Parasail, Phala, PrimeIntellect, Reka, Sail Research, Together, Venice, Wafer | 1310720 |  |
| `cohere/command-a-plus` | 0.300 | 1.500 | Cohere | 192000 |  |
| `google/gemini-3-flash-preview` | 0.250–0.900 | 1.500–5.400 | Google | 1048576 |  |
| `perceptron/perceptron-mk1` | 0.150 | 1.500 | Perceptron | 32768 |  |
| `perceptron/perceptron-mk1.5` | 0.150 | 1.500 | Perceptron | 36864 |  |
| `z-ai/glm-5.2` | 0.489–2.250 | 1.540–8.000 | BaseTen, CoreWeave, Decart, DeepInfra, DigitalOcean, Fireworks, Inceptron, Mistral, Parasail, Phala, Together, Venice, Wafer | 1048576 |  |
| `z-ai/glm-4.6` | 0.430 | 1.750 | Venice | 204800 |  |
| `z-ai/glm-4.7` | 0.400–0.600 | 1.750–2.200 | DeepInfra, Google, Venice | 204800 |  |
| `google/gemini-3.6-flash` | 0.375–1.350 | 1.875–6.750 | Google | 1048576 |  |
| `google/gemini-3.7-flash` | 0.375–1.350 | 1.875–6.750 | Google | 1048576 |  |
| `google/gemini-3.8-flash` | 0.375–1.350 | 1.875–6.750 | Google | 1048576 |  |
| `qwen/qwen3.8-27b` | 0.080–0.450 | 1.875–4.400 | AkashML, CoreWeave, DeepInfra, DekaLLM, Ionstream, Mancer 2, Parasail, Phala, Reka, Venice, Wafer | 1000000 |  |
| `deepseek/deepseek-v4-pro-0813` | 0.245–1.650 | 1.958–4.950 | CoreWeave, DeepInfra, DigitalOcean, Fireworks, Ionstream, NextBit, Parasail, Phala, Sail Research, Together, Venice, Wafer | 1048576 |  |
| `bytedance-seed/seed-1.6` | 0.250 | 2.000 | Seed | 262144 | 2026-11-11 |
| `bytedance-seed/seed-2.0-lite` | 0.250 | 2.000 | Seed | 262144 |  |
| `openai/gpt-5-mini` | 0.250–0.275 | 2.000–2.200 | Azure | 400000 |  |
| `openai/gpt-5.1-codex-mini` | 0.250 | 2.000 | Azure | 400000 |  |
| `qwen/qwen3.5-27b` | 0.250–0.300 | 2.000–2.600 | DeepInfra, Phala, SiliconFlow | 262144 |  |
| `x-ai/grok-build-0.1` | 1.000–2.000 | 2.000–4.000 | xAI | 256000 |  |
| `qwen/qwen3.5-122b-a10b` | 0.260 | 2.080 | SiliconFlow | 262144 |  |
| `deepseek/deepseek-r1-0528` | 0.500 | 2.150–2.180 | DeepInfra, SiliconFlow | 163840 |  |
| `nvidia/nemotron-3-ultra-550b-a55b` | 0.500 | 2.200 | DeepInfra | 262144 |  |
| `moonshotai/kimi-k2.5` | 0.450–0.570 | 2.250–3.325 | Novita, SiliconFlow, Venice | 262144 |  |
| `moonshotai/kimi-k2.6` | 0.409–1.090 | 2.390–4.600 | CoreWeave, Crusoe, Decart, DeepInfra, DigitalOcean, Fireworks, Inceptron, Moonshot AI, Novita, Parasail, Phala, SiliconFlow, Venice | 262144 |  |
| `bytedance-seed/seed-2-1-turbo` | 0.500 | 2.500 | Seed | 262144 |  |
| `google/gemini-2.5-flash` | 0.300–0.540 | 2.500–4.500 | Google | 1048576 | 2026-10-20 |
| `moonshotai/kimi-k2-thinking` | 0.600 | 2.500 | Google, Novita | 262144 |  |
| `x-ai/grok-4.20` | 1.250–2.500 | 2.500–5.000 | xAI | 2000000 |  |
| `x-ai/grok-4.20-multi-agent` | 1.250–2.500 | 2.500–5.000 | xAI | 2000000 |  |
| `x-ai/grok-4.3` | 1.250–2.500 | 2.500–5.000 | xAI | 1000000 |  |
| `tencent/hy4-preview` | 0.834 | 2.501 | Novita, SiliconFlow, Tencent | 1048576 |  |
| `deepseek/deepseek-v4-pro` | 1.300–1.740 | 2.600–3.480 | DeepInfra, NextBit, Parasail, Venice | 1048576 |  |
| `qwen/qwen3.6-27b` | 0.300–0.325 | 2.700–3.250 | DeepInfra, Phala, SiliconFlow, Venice | 262144 |  |
| `bytedance-seed/seed-2.0-code` | 0.500 | 3.000 | Seed | 262144 | 2026-11-11 |
| `qwen/qwen3.5-397b-a17b` | 0.450–0.750 | 3.000–4.500 | DeepInfra, DigitalOcean, Parasail, Phala, Venice | 262144 |  |
| `z-ai/glm-5` | 1.000 | 3.200 | Venice | 204800 |  |
| `moonshotai/kimi-k2.7-code` | 0.656–1.900 | 3.300–8.000 | CoreWeave, Fireworks, Inceptron, ModelRun, Moonshot AI, Nebius, Novita, Venice | 262144 |  |
| `z-ai/glm-5.1` | 1.050–1.401 | 3.500–4.404 | DeepInfra, Nebius, Phala, Venice | 204800 |  |
| `google/gemini-3.5-flash` | 0.750–2.700 | 4.500–16.200 | Google | 1048576 |  |
| `openai/gpt-5.4-mini` | 0.750–0.825 | 4.500–4.950 | Azure | 400000 |  |
| `x-ai/grok-4.7` | 1.600–3.200 | 4.800–9.600 | xAI | 500000 |  |
| `anthropic/claude-haiku-4.5` | 1.000–1.100 | 5.000–5.500 | Amazon Bedrock, Google | 200000 |  |
| `google/gemini-3.1-pro-preview` | 1.000–3.600 | 6.000–21.600 | Google | 1048576 |  |
| `qwen/qwen3.8-2.4t-a95b` | 2.000 | 6.000 | DeepInfra, Modal, Novita, SiliconFlow, Together | 1048576 |  |
| `x-ai/grok-4.5` | 2.000–4.000 | 6.000–12.000 | xAI | 500000 |  |
| `x-ai/grok-4.6` | 2.000–4.000 | 6.000–12.000 | Amazon Bedrock, xAI | 500000 |  |
| `mistralai/mistral-medium-3-5` | 1.500–1.650 | 7.500–8.250 | Mistral | 262144 |  |
| `moonshotai/kimi-k3` | 1.000–4.500 | 9.000–22.500 | DeepInfra, DigitalOcean, Fireworks, InferenceNet, Makora, Modal, Moonshot AI, Morph, Parasail, Phala, Sail Research, Together, Wafer | 1048576 |  |
| `anthropic/claude-sonnet-5` | 2.000–2.200 | 10.000–11.000 | Google | 1000000 |  |
| `google/gemini-2.5-pro` | 1.250–2.250 | 10.000–18.000 | Google | 1048576 | 2026-10-20 |
| `google/gemini-2.5-pro-preview` | 1.250 | 10.000 | Google | 1048576 |  |
| `openai/gpt-5` | 1.250–1.375 | 10.000–11.000 | Azure | 400000 |  |
| `openai/gpt-5.1` | 1.250–1.375 | 10.000–11.000 | Azure | 400000 |  |
| `openai/gpt-5.1-codex` | 1.250 | 10.000 | Azure | 400000 |  |
| `openai/gpt-5.1-codex-max` | 1.250 | 10.000 | Azure | 400000 |  |
| `openai/gpt-6-sol` | 2.000–2.200 | 10.000–11.000 | Azure | 1050000 |  |
| `openai/gpt-6-sol-pro` | 2.000–2.200 | 10.000–11.000 | Azure | 1050000 |  |
| `google/gemini-3-pro-image` | 2.000 | 12.000 | Google | 131072 |  |
| `openai/gpt-5.6-terra` | 2.000–2.200 | 12.000–13.200 | Azure | 1050000 |  |
| `openai/gpt-5.6-terra-pro` | 2.000–2.200 | 12.000–13.200 | Azure | 1050000 |  |
| `openai/gpt-5.2` | 1.750 | 14.000 | Azure | 400000 |  |
| `openai/gpt-5.2-codex` | 1.750 | 14.000 | Azure | 400000 |  |
| `openai/gpt-5.3-codex` | 1.750 | 14.000 | Azure | 400000 |  |
| `anthropic/claude-sonnet-4.5` | 3.000–3.300 | 15.000–16.500 | Amazon Bedrock, Google | 1000000 |  |
| `anthropic/claude-sonnet-4.6` | 3.000–3.300 | 15.000–16.500 | Amazon Bedrock, Google | 1000000 |  |
| `fireworks/ember-1` | 3.000 | 15.000 | Fireworks | 1048576 |  |
| `openai/gpt-5.4` | 2.500–2.750 | 15.000–16.500 | Azure | 1050000 |  |
| `perplexity/sonar-pro-search` | 3.000 | 15.000 | Perplexity | 200000 |  |
| `anthropic/claude-opus-5.5` | 4.000–4.400 | 20.000–22.000 | Google | 1000000 |  |
| `openai/gpt-5.6-sol` | 4.000–4.400 | 20.000–22.000 | Azure | 1050000 |  |
| `openai/gpt-5.6-sol-pro` | 4.000–4.400 | 20.000–22.000 | Azure | 1050000 |  |
| `anthropic/claude-opus-4.5` | 5.000–5.500 | 25.000–27.500 | Amazon Bedrock, Google | 200000 |  |
| `anthropic/claude-opus-4.6` | 5.000–5.500 | 25.000–27.500 | Amazon Bedrock, Google | 1000000 |  |
| `anthropic/claude-opus-4.7` | 5.000–5.500 | 25.000–27.500 | Google | 1000000 |  |
| `anthropic/claude-opus-4.8` | 5.000–5.500 | 25.000–27.500 | Google | 1000000 |  |
| `anthropic/claude-opus-5` | 5.000–5.500 | 25.000–27.500 | Google | 1000000 |  |
| `openai/gpt-5.5` | 5.000–5.500 | 30.000–33.000 | Azure | 1050000 |  |
| `openai/gpt-6-astra` | 10.000–11.000 | 50.000–55.000 | Azure | 1050000 |  |
| `openai/gpt-6-astra-pro` | 10.000–11.000 | 50.000–55.000 | Azure | 1050000 |  |
| `openai/gpt-5.4-pro` | 30.000 | 180.000 | Azure | 1050000 |  |
