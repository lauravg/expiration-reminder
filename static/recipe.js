document.addEventListener('DOMContentLoaded', function () {

    // Function to display a recipe or message
    function displayRecipe(recipe) {
        const recipeList = document.getElementById('recipe-result');
        recipeList.innerHTML = '';

        if (recipe) {
            // If there is a recipe suggestion, display it in a <pre> element using innerHTML
            const item = document.createElement('pre');
            item.innerHTML = recipe;
            recipeList.appendChild(item);
        } else {
            // If there is no recipe suggestion, display a message
            const item = document.createElement('div');
            item.textContent = 'No recipe suggestion available.';
            recipeList.appendChild(item);
        }

        // Call toggleRegenerateButton to show the button whenever there's content
        toggleRegenerateButton(true);
    }


    // Function to display or hide the "Regenerate Recipe" button based on content
    function toggleRegenerateButton(display) {
        const regenerateButton = document.getElementById('regenerate-button');
        const recipeResultElement = document.getElementById('recipe-result');

        if (display) {
            // If display is true, show the button
            regenerateButton.style.display = 'block';
        } else {
            // If display is false, hide the button
            regenerateButton.style.display = 'none';
        }
    }

    // Event listener for the recipe form submission
    document.getElementById('recipe-form').addEventListener('submit', function (event) {
        event.preventDefault();

        // Get user input
        const userInput = document.getElementById('user-input').value;
        console.log("Clicked on Generate Recipe button");

        // Fetch a recipe suggestion from the server
        fetch('/generate_recipe', {
            method: 'POST',
            body: new URLSearchParams({ 'user-input': userInput }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
            .then(response => response.json())
            .then(data => {
                const recipeSuggestion = data.recipe_suggestion;
                // Display the recipe or message
                displayRecipe(recipeSuggestion);
            });
    });

    // Event listener for generating a recipe from the database
    document.getElementById('generate-from-database').addEventListener('click', function () {
        console.log("Clicked on Generate Recipe from Database button");
        // Fetch a recipe suggestion from the server
        fetch('/generate_recipe_from_database', {
            method: 'GET'
        })
            .then(response => response.json())
            .then(data => {
                const recipeSuggestion = data.recipe_suggestion;
                console.log("Recipe:", recipeSuggestion);

                // const recipeResultElement = document.getElementById('recipe-result');
                // Display the recipe suggestion or message
                // recipeResultElement.innerHTML = `<strong>Recipe:</strong><br><p>${recipeSuggestion}</p>`;
                const recipeResultElement = document.getElementById('recipe-result');
                recipeResultElement.textContent = recipeSuggestion; // Set the content as-is

                // Show the "Regenerate Recipe" button
                toggleRegenerateButton(true);
            });
    });

    // Event listener for the "Regenerate Recipe" button
    document.getElementById('regenerate-button').addEventListener('click', function () {
        // Get user input
        const userInput = document.getElementById('user-input').value;
        // Fetch a recipe suggestion from the server
        fetch('/generate_recipe', {
            method: 'POST',
            body: new URLSearchParams({ 'user-input': userInput }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
            .then(response => response.json())
            .then(data => {
                const recipe = data.recipe_suggestion;
                // Display the recipe or message
                displayRecipe(recipe);
            });
    });

    // Initially hide the "Regenerate Recipe" button
    toggleRegenerateButton(false);
});
