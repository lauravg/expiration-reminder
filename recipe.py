import openai

def read_api_key(filename='openai_api_key.txt'):
    try:
        with open(filename, 'r') as file:
            api_key = file.read().strip()
        return api_key
    except FileNotFoundError:
        raise Exception(f'The file {filename} containing the API key was not found.')

api_key = read_api_key()

def generate_recipe(product_names):
    messages = [
        {'role': 'system', 'content': 'You’re a kind helpful assistant that generates a recipe using the provided ingredients. However no need to include all the ingredients.'},
        # Convert product names to a comma-separated string
        {'role': 'user', 'content': ', '.join(product_names)}
    ]

    completion = openai.ChatCompletion.create(
        model='gpt-3.5-turbo',
        messages=messages,
        api_key=api_key
    )

    chat_response = completion.choices[0].message.content

    return chat_response
