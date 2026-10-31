
const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));


const MEALDB = "https://www.themealdb.com/api/json/v1/1";
const COCKTAILDB = "https://www.thecocktaildb.com/api/json/v1/1";
const SPOONACULAR = "https://api.spoonacular.com";


async function getJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

// SEARCH RECIPE
app.get("/api/search", async (req, res) => {
  try {
    const { source, q } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        error: "Please enter a search keyword"
      });
    }

    let data = [];
    const query = encodeURIComponent(q.trim());

    if (source === "mealdb") {
      const result = await getJSON(
        `${MEALDB}/search.php?s=${query}`
      );

      data = (result.meals || []).map(item => ({
        id: item.idMeal,
        name: item.strMeal,
        image: item.strMealThumb,
        category: item.strCategory,
        area: item.strArea,
        source: "mealdb"
      }));

    } else if (source === "spoonacular") {
      const apiKey = process.env.SPOONACULAR_API_KEY;

      if (!apiKey) {
        throw new Error("Spoonacular API key is missing");
      }

      const url = new URL(`${SPOONACULAR}/recipes/complexSearch`);

      url.searchParams.set("apiKey", apiKey);
      url.searchParams.set("query", q.trim());
      url.searchParams.set("number", "12");

      const result = await getJSON(url.toString());

      data = (result.results || []).map(item => ({
        id: item.id,
        name: item.title,
        image: item.image,
        source: "spoonacular"
      }));

    } else if (source === "cocktaildb") {
      const result = await getJSON(
        `${COCKTAILDB}/search.php?s=${query}`
      );

      data = (result.drinks || []).map(item => ({
        id: item.idDrink,
        name: item.strDrink,
        image: item.strDrinkThumb,
        category: item.strCategory,
        source: "cocktaildb"
      }));

    } else {
      return res.status(400).json({
        error: "Invalid API source"
      });
    }

    res.json(data);

  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      error: "Unable to fetch recipes. Check your API key or connection."
    });
  }
});

// GET RECIPE DETAILS
app.get("/api/details", async (req, res) => {
  try {
    const { source, id } = req.query;

    if (!source || !id) {
      return res.status(400).json({
        error: "Missing source or recipe ID"
      });
    }

    let result;

    if (source === "mealdb") {
      result = await getJSON(
        `${MEALDB}/lookup.php?i=${encodeURIComponent(id)}`
      );
      result = result.meals?.[0];

    } else if (source === "cocktaildb") {
      result = await getJSON(
        `${COCKTAILDB}/lookup.php?i=${encodeURIComponent(id)}`
      );
      result = result.drinks?.[0];

    } else if (source === "spoonacular") {
      const url = new URL(
        `${SPOONACULAR}/recipes/${encodeURIComponent(id)}/information`
      );

      url.searchParams.set(
        "apiKey",
        process.env.SPOONACULAR_API_KEY
      );

      result = await getJSON(url.toString());

    } else {
      return res.status(400).json({
        error: "Invalid API source"
      });
    }

    if (!result) {
      return res.status(404).json({
        error: "Recipe not found"
      });
    }

    res.json(result);

  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      error: "Unable to load recipe details"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`NISA Recipe Finder running on port ${PORT}`);
});
