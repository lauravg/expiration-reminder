from openai import OpenAI
from secrets_manager import SecretsManager


class RecipeGenerator:
    def __init__(self, secrets: SecretsManager) -> None:
        self.__client = OpenAI(api_key=secrets.get_openai_api_key())

    def generate_recipe(self, product_names):
        messages = [
            {
                "role": "system",
                "content": "You’re a kind and helpful assistant that generates a recipe using the provided ingredients. However, no need to include all the ingredients.",
            },
            {"role": "user", "content": ", ".join(product_names)},
        ]

        response = self.__client.chat.completions.create(
            model="gpt-4o-mini", messages=messages
        )

        if len(response.choices) > 0:
            chat_response = response.choices[0].message.content
            return chat_response
        else:
            return (
                "Sorry, I cannot create a recipe at this time. Please try again later."
            )
