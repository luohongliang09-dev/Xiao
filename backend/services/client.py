from openai import OpenAI

import config

# 统一使用硅基流动：嵌入 + 生成共用同一个 OpenAI 兼容客户端
client = OpenAI(api_key=config.SILICONFLOW_API_KEY, base_url=config.SILICONFLOW_BASE_URL)
