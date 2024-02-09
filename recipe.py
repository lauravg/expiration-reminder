import openai
from secrets_manager import SecretsManager

class RecipeGenerator:

    def __init__(self, secrets: SecretsManager) -> None:
        self.__openai_api_key = secrets.get_openai_api_key();

    def generate_recipe(self, product_names):
        messages = [
            {'role': 'system', 'content': 'You’re a kind helpful assistant that generates a recipe using the provided ingredients. However no need to include all the ingredients.'},
            # Convert product names to a comma-separated string
            {'role': 'user', 'content': ', '.join(product_names)}
        ]

        completion = openai.ChatCompletion.create(
            model='gpt-3.5-turbo',
            messages=messages,
            api_key=self.__openai_api_key
        )

        chat_response = completion.choices[0].message.content

        return chat_response

