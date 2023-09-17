import openai

# Set your OpenAI API key here
api_key = "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"


def generate_recipe(product_names):
    messages = [
        {"role": "system", "content": "You’re a kind helpful assistant that generates a recipe using the provided ingredients. However no need to include all the ingredians."},
        # Convert product names to a comma-separated string
        {"role": "user", "content": ', '.join(product_names)}
    ]

    completion = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=messages,
        api_key=api_key
    )

    chat_response = completion.choices[0].message.content

    return chat_response
