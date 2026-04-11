from ollama import chat
response = chat(
    model='gemma3:4b',
    messages=[{'role': 'user', 'content': '안녕하세요'}],
)
print(response.message.content)