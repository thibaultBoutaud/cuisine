const { resolveNaptr } = require("dns");
const pool = require("../connection/sqlConnection");
const { v4: uuidv4 } = require("uuid");
const fs = require('fs').promises;


exports.createRecipe = async (req, res, next) => {
    try {
        // Récupération des données
        const { name, category, author, servings, cook_time, prep_time, difficulty } = req.body;

        // Vérification des champs nécessaires
        if (!name || !category) {
            return res.status(400).json({ msg: "name, category sont obligatoires" });
        }
        //Récupération de l'autheur
        const [user] = await pool.execute('SELECT u.name, u.img_url FROM users u WHERE u._id = ?', [req.auth.userId]);


        const fileName = req.file ? req.file.filename : null;

        // Création de l'objet recipe
        const recipeData = {
            _id: uuidv4(),
            user_id: req.auth.userId,
            name,
            category,
            difficulty: difficulty || "facile",
            author: user[0].name || null,
            authorImg_url: user[0].img_url || null,
            servings: servings || null,
            cook_time: cook_time || null,
            prep_time: prep_time || null,
            img_url: fileName || "imageParDefault"
        };

        // Construction de la requête pour insérer la recette
        const columns = Object.keys(recipeData);
        const values = Object.values(recipeData);
        const placeholders = columns.map(() => "?").join(", ");

        const query = `INSERT INTO recipes (${columns.join(', ')}) VALUES (${placeholders})`;

        // Exécution de la requête
        await pool.execute(query, values);

        // Récupération et insertion des ingrédients
        const ingredients = req.body.ingredients ? JSON.parse(req.body.ingredients) : [];

        // Vérification qu'il y a des ingrédients
        if (Array.isArray(ingredients) && ingredients.length > 0) {
            // Génération des placeholders "(?, ?, ?), (?, ?, ?), ..."
            const placeholders = ingredients.map(() => "(?, ?)").join(", ");


            // Transformation de `ingredientsValues` en un seul tableau plat
            const flattenedValues = ingredients.flatMap(ingredient => [
                recipeData._id, ingredient.name
            ]);

            const query = `INSERT INTO ingredients (recipe_id, name) VALUES ${placeholders}`;

            // Exécuter la requête avec les valeurs aplaties
            await pool.execute(query, flattenedValues);
        };
        // Récupération et insertion des steps
        const steps = req.body.steps ? JSON.parse(req.body.steps) : [];

        // Vérification qu'il y a des steps
        if (Array.isArray(steps) && steps.length > 0) {
            // Génération des placeholders
            const placeholders = steps.map(() => "(?, ?, ?)").join(", ");

            // Transformation de `stepsValues` en un seul tableau plat
            const flattenedValues = steps.flatMap(step => [
                recipeData._id, step.step_number, step.step_instruction
            ]);

            const query = `INSERT INTO steps (recipe_id, step_number, step_instruction) VALUES ${placeholders}`;

            // executer la requete
            await pool.execute(query, flattenedValues);
        }
        // Récupération et insertion des tags
        const tags = req.body.tags ? JSON.parse(req.body.tags) : [];

        // Vérification qu'il y a des tags
        if (Array.isArray(tags) && tags.length > 0) {
            // Génération des placeholders
            const placeholders = tags.map(() => "(?, ?)").join(", ");

            // Transformation de `tagsValues` en un seul tableau plat
            const flattenedValues = tags.flatMap(tag => [
                recipeData._id, tag.tag
            ]);

            const query = `INSERT INTO tags (recipe_id, tag) VALUES ${placeholders}`;

            // executer la requete
            await pool.execute(query, flattenedValues);
        }
        // Réponse de succès
        res.status(201).json({ msg: "Recipe created successfully" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ err });
    }
};


exports.getRecipes = async (req, res, next) => {
    try {
        // Récupérer toutes les recettes
        const [recipes] = await pool.execute('SELECT * FROM recipes');

        // Récupérer les ingrédients pour chaque recette
        const ingredientsPromises = recipes.map(recipe => {
            return pool.execute('SELECT * FROM ingredients WHERE recipe_id = ?', [recipe._id]);
        });

        // Récupérer les étapes pour chaque recette
        const stepsPromises = recipes.map(recipe => {
            return pool.execute('SELECT * FROM steps WHERE recipe_id = ?', [recipe._id]);
        });

        // Récupérer les tags pour chaque recette
        const tagsPromises = recipes.map(recipe => {
            return pool.execute('SELECT * FROM tags WHERE recipe_id = ?', [recipe._id]);
        });

        // Attendre que toutes les requêtes soient exécutées
        const ingredientsResults = await Promise.all(ingredientsPromises);
        const stepsResults = await Promise.all(stepsPromises);
        const tagsResults = await Promise.all(tagsPromises);

        // Organiser les résultats pour chaque recette
        const result = recipes.map((recipe, index) => {
            return {
                ...recipe,
                ingredients: ingredientsResults[index][0],
                steps: stepsResults[index][0],
                tags: tagsResults[index][0]
            };
        });

        return res.status(200).json({ recipes: result });

    } catch (err) {
        return res.status(500).json({ err });
    }
};


exports.getOneRecipe = async (req, res, next) => {

    try {
        const recipeId = req.params.id;
        // Récupérer la recette
        const [recipe] = await pool.execute('SELECT * FROM recipes WHERE _id = ?', [recipeId]);

        // Récupérer les ingredients pour la recette
        const [ingredients] = await pool.execute('SELECT * FROM ingredients WHERE recipe_id = ?', [recipeId]);

        // Récupérer les steps pour la recette
        const [steps] = await pool.execute('SELECT * FROM steps WHERE recipe_id = ?', [recipeId]);

        // Récupérer les tags pour la recette
        const [tags] = await pool.execute('SELECT * FROM tags WHERE recipe_id = ?', [recipeId]);

        // transformation des objets en un objet unique
        const recipeData = recipe[0];
        recipeData.ingredients = [];
        recipeData.steps = [];
        recipeData.tags = [];
        for (let i = 0; i < ingredients.length; i++) {
            recipeData.ingredients.push(ingredients[i]);
        }
        for (let i = 0; i < steps.length; i++) {
            recipeData.steps.push(steps[i]);
        }
        for (let i = 0; i < tags.length; i++) {
            recipeData.tags.push(tags[i]);
        }

        res.status(200).json({ recipe: recipeData });
    } catch (err) {
        res.status(500).json({ err });
    }
};

exports.deleteRecipe = async (req, res, next) => {

    try {
        const recipeId = req.params.id;
        const userId = req.auth.userId;

        // Récupération de la recette
        const [recipe] = await pool.execute('SELECT * FROM recipes WHERE _id = ?', [recipeId]);

        // Vérification de l'existance de la recette
        if (recipe.length <= 0) return res.status(400).json({ msg: "Recipe not found" });

        // Vérification des droits
        if (recipe[0].user_id === userId || req.auth.isAdmin === 1) {
            // Suppression de l'img + recette
            await fs.unlink(`uploads/pictures/recipes/${recipe[0].img_url}`);
            const [result] = await pool.execute("DELETE FROM recipes WHERE _id = ?", [recipeId]);
            return res.status(200).json({ msg: "Recipe deleted" });
        } else {
            return res.status(400).json({ msg: "Insufficient permissions" });
        }
    } catch (err) {
        res.status(500).json({ err });
    }
};

exports.updateRecipe = async (req, res, next) => {
    const recipeId = req.params.id;
    const userId = req.auth.userId;

    // Récupération de la recette
    const [recipe] = await pool.execute('SELECT * FROM recipes WHERE _id = ?', [recipeId]);

    // Vérification de l'existance de la recette
    if (recipe.length <= 0) return res.status(400).json({ msg: "Recipe not found" });

    // Vérification des droits
    if (recipe[0].user_id !== userId) return res.status(400).json({ msg: "Insufficient permissions" });

    // récupération des données
    let { name, category, author, servings, cook_time, prep_time, difficulty } = req.body;
    const fileName = req.file ? req.file.filename : null;

    // Vérification des droits
    if (recipe[0].user_id === userId || req.auth.isAdmin === 1) {

        // Si file, suppression de l'image
        if (fileName && recipe[0].img_url) {
            try {
                await fs.unlink(`uploads/pictures/recipes/${recipe[0].img_url}`);
            } catch (err) {
                console.error("Erreur lors de la suppression de l'ancienne image:", err);
                return res.status(500).json({ msg: "Error deleting old image", error: err });
            }
        }
    } else {
        return res.status(400).json({ msg: "Insufficient permissions" });
    }

    // Créer un objet dynamique avec les champs 
    const recipeData = {};
    if (name) recipeData.name = name;
    if (difficulty) recipeData.difficulty = difficulty
    if (category) recipeData.category = category;
    if (author) recipeData.author = author;
    if (servings) recipeData.servings = servings;
    if (cook_time) recipeData.cook_time = cook_time;
    if (prep_time) recipeData.prep_time = prep_time;
    if (fileName) recipeData.img_url = fileName;

    // Vérification s'il y a des données à mettre à jour
    if (Object.keys(recipeData).length === 0) {
        return res.status(400).json({ msg: "No data provided for update" });
    }

    // 1. Mettre à jour la recette
    const columns = Object.keys(recipeData).map((col) => `${col} = ?`).join(", ");
    const values = [...Object.values(recipeData), recipeId];
    const query = `UPDATE recipes SET ${columns} WHERE _id = ?`;

    try {
        // Vérification des droits
        if (recipe[0].user_id === userId || req.auth.isAdmin === 1) {
            await pool.execute(query, values);
            return res.status(200).json({ msg: "recipe updated" })
        } else {
            return res.status(400).json({ msg: "Insufficient permissions" });
        }

    } catch (err) {
        return res.status(400).json({ err });
    }

};


exports.createIngredient = async (req, res, next) => {
    const recipeId = req.params.id;

    // Vérification que la recette existe
    try {
        const [recipes] = await pool.execute("SELECT * FROM recipes WHERE _id = ?", [recipeId]);
        if (recipes.length === 0) return res.status(404).json({ msg: "Recipe not found" });

        // Vérification des champs reçus
        const { name } = req.body;
        if (!name) return res.status(400).json({ msg: "Name is required" });

        // Vérification des droits
        if (recipes[0].user_id === req.auth.userId || req.auth.isAdmin === 1) {
            // Création de l'ingrédient
            await pool.execute("INSERT INTO ingredients (recipe_id, name) VALUES (?, ?)", [recipeId, name]);
            return res.status(201).json({ msg: "Ingredient created" });
        } else {
            return res.status(400).json({ msg: "Insufficient permissions" });
        }


    } catch (err) {
        return res.status(500).json({ err })
    }
};

exports.updateIngredient = async (req, res, next) => {
    const recipeId = req.params.id;
    const ingredientId = req.params.ingredientId;

    try {

        // Vérification que la recette existe
        const [recipes] = await pool.execute("SELECT * FROM recipes WHERE _id = ?", [recipeId]);
        if (recipes.length === 0) return res.status(404).json({ msg: "Recipe not found" });

        //Vérification que l'ingredient exite
        const [ingredient] = await pool.execute("SELECT * FROM ingredients WHERE _id = ?", [ingredientId]);
        if (ingredient.length === 0) return res.status(404).json({ msg: "Ingredient not found" });

        // Vérification des champs reçus
        const { name, quantity } = req.body;
        if (!name && !quantity) return res.status(400).json({ msg: "At least one field is required" });

        // Netoyage des champs null
        const ingredientsData = {
            name: name || null,
            quantity: quantity || null
        }
        const ingredientsKeys = Object.keys(ingredientsData).filter((cell) => ingredientsData[cell] !== null);
        const ingredientsValues = Object.values(ingredientsData).filter((cell) => cell !== null);

        // Création du placeholder dynamique (?, ?)
        const placehodler = ingredientsKeys.map((key) => `${key} = ?`).join(", ");

        // Creation Query
        const query = `UPDATE ingredients SET ${placehodler} WHERE _id = ?`;

        // update
        // Vérification des droits
        if (recipes[0].user_id === req.auth.userId || req.auth.isAdmin === 1) {
            await pool.execute(query, [...ingredientsValues, ingredientId]);

            return res.status(201).json({ msg: "Ingredient Updated" });
        } else {
            return res.status(400).json({ msg: "Insufficient permissions" });
        }


    } catch (err) {
        return res.status(500).json({ err })
    }
};

exports.deleteIngredient = async (req, res, next) => {
    const recipeId = req.params.id;
    const ingredientId = req.params.ingredientId;
    try {
        // Vérification que la recette existe
        const [recipes] = await pool.execute("SELECT * FROM recipes WHERE _id = ?", [recipeId]);
        if (recipes.length === 0) return res.status(404).json({ msg: "Recipe not found" });

        // Vérification des droits
        if (recipes[0].user_id !== req.auth.userId) return res.status(400).json({ msg: "Insufficient permissions" });

        // Vérification que l'ingredient exite
        const [ingredient] = await pool.execute("SELECT * FROM ingredients WHERE _id = ?", [ingredientId]);
        if (ingredient.length === 0) return res.status(404).json({ msg: "Ingredient not found" });

        // Vérification des droits
        if (recipes[0].user_id === req.auth.userId || req.auth.isAdmin === 1) {
            // Suppression de l'ingredient
            await pool.execute('DELETE FROM ingredients WHERE _id = ?', [ingredientId]);
            return res.status(200).json({ msg: "Ingredient deleted" })
        } else {
            return res.status(400).json({ msg: "Insufficient permissions" });
        }


    } catch (err) {
        return res.status(500).json({ err })
    }

}

exports.createStep = async (req, res, next) => {
    const recipeId = req.params.id;

    // Vérification que la recette existe
    try {
        const [recipes] = await pool.execute("SELECT * FROM recipes WHERE _id = ?", [recipeId]);
        if (recipes.length === 0) return res.status(404).json({ msg: "Recipe not found" });

        // Vérification des champs reçus
        const { step_number, step_instruction } = req.body;
        if (!step_number || !step_instruction) return res.status(400).json({ msg: "Name and quantity are required" });

        // Vérification des droits
        if (recipes[0].user_id === req.auth.userId || req.auth.isAdmin === 1) {
            // Création de le l'étape
            await pool.execute("INSERT INTO steps (recipe_id, step_number, step_instruction) VALUES (?, ?, ?)", [recipeId, step_number, step_instruction]);
            return res.status(201).json({ msg: "step created" });
        } else {
            return res.status(400).json({ msg: "Insufficient permissions" });
        }


    } catch (err) {
        return res.status(500).json({ err })
    }
};


exports.updateStep = async (req, res, next) => {
    const recipeId = req.params.id;
    const stepId = req.params.stepId;

    try {

        // Vérification que la recette existe
        const [recipes] = await pool.execute("SELECT * FROM recipes WHERE _id = ?", [recipeId]);
        if (recipes.length === 0) return res.status(404).json({ msg: "Recipe not found" });

        //Vérification que la step exite
        const [step] = await pool.execute("SELECT * FROM steps WHERE _id = ?", [stepId]);
        if (step.length === 0) return res.status(404).json({ msg: "Step not found" });

        // Vérification des champs reçus
        const { step_number, step_instruction } = req.body;
        if (step_number === undefined && step_instruction === undefined) return res.status(400).json({ msg: "At least one field is required" });

        // Netoyage des champs null
        const stepData = {};
        if (step_number !== undefined) stepData.step_number = step_number;
        if (step_instruction !== undefined) stepData.step_instruction = step_instruction;
        const stepKeys = Object.keys(stepData).filter((cell) => stepData[cell] !== null);
        const stepValues = Object.values(stepData).filter((cell) => cell !== null);

        // Création du placeholder dynamique (?, ?)
        const placehodler = stepKeys.map((key) => `${key} = ?`).join(", ");

        // Creation Query
        const query = `UPDATE steps SET ${placehodler} WHERE _id = ?`;


        // Vérification des droits
        if (recipes[0].user_id === req.auth.userId || req.auth.isAdmin === 1) {
            // update
            await pool.execute(query, [...stepValues, stepId]);
            return res.status(201).json({ msg: "step Updated" });
        } else {
            return res.status(400).json({ msg: "Insufficient permissions" });
        }


    } catch (err) {
        return res.status(500).json({ err })
    }
};

exports.deleteStep = async (req, res, next) => {
    const recipeId = req.params.id;
    const stepId = req.params.stepId;
    try {
        // Vérification que la recette existe
        const [recipes] = await pool.execute("SELECT * FROM recipes WHERE _id = ?", [recipeId]);
        if (recipes.length === 0) return res.status(404).json({ msg: "Recipe not found" });

        // Vérification que l'ingredient exite
        const [steps] = await pool.execute("SELECT * FROM steps WHERE _id = ?", [stepId]);
        if (steps.length === 0) return res.status(404).json({ msg: "Step not found" });


        // Vérification des droits
        if (recipes[0].user_id === req.auth.userId || req.auth.isAdmin === 1) {
            // Suppression de l'ingredient
            await pool.execute('DELETE FROM steps WHERE _id = ?', [stepId]);
            return res.status(200).json({ msg: "step deleted" })
        } else {
            return res.status(400).json({ msg: "Insufficient permissions" });
        }


    } catch (err) {
        return res.status(500).json({ err })
    }

}

exports.getTagId = async (req, res, next) => {
    try {
        const recipeId = req.params.id;
        const tag = req.body.tag;
        const query = `SELECT t._id FROM tags t WHERE t.recipe_id = ? AND t.tag = ?`;
        const [tagId] = await pool.execute(query, [recipeId, tag]);
        return res.status(200).json({ tag: tagId[0] });
    } catch (err) {
        return res.status(400).json({ err });
    }
}


exports.createTag = async (req, res, next) => {
    const recipeId = req.params.id;

    // Vérification que la recette existe
    try {
        const [recipes] = await pool.execute("SELECT * FROM recipes WHERE _id = ?", [recipeId]);
        if (recipes.length === 0) return res.status(404).json({ msg: "Recipe not found" });

        // Vérification des champs reçus
        const tag = req.body.tag;
        if (!tag) return res.status(400).json({ msg: "tag is required" });

        // Vérification des droits
        if (recipes[0].user_id === req.auth.userId || req.auth.isAdmin === 1) {
            // Création du tag
            await pool.execute("INSERT INTO tags (recipe_id, tag) VALUES (?, ?)", [recipeId, tag]);
            return res.status(201).json({ msg: "tag created" });
        } else {
            return res.status(400).json({ msg: "Insufficient permissions" });
        }


    } catch (err) {
        return res.status(500).json({ err });
    }
};

exports.updateTag = async (req, res, next) => {
    const recipeId = req.params.id;
    const tagId = req.params.tagId;

    try {

        // Vérification que la recette existe
        const [recipes] = await pool.execute("SELECT * FROM recipes WHERE _id = ?", [recipeId]);
        if (recipes.length === 0) return res.status(404).json({ msg: "Recipe not found" });

        // Vérification que la step exite
        const [tags] = await pool.execute("SELECT * FROM tags WHERE _id = ?", [tagId]);
        if (tags.length === 0) return res.status(404).json({ msg: "Step not found" });

        // Vérification des champs reçus
        const tag = req.body;
        if (tag === undefined) return res.status(400).json({ msg: "At least one field is required" });

        // Creation Query
        const query = `UPDATE tags SET tag = ? WHERE _id = ?`;

        // Vérification des droits
        if (recipes[0].user_id === req.auth.userId || req.auth.isAdmin === 1) {
            // update
            await pool.execute(query, [tag.tag, tagId]);
            return res.status(201).json({ msg: "tag Updated" });
        } else {
            return res.status(400).json({ msg: "Insufficient permissions" });
        }
    } catch (err) {
        return res.status(500).json({ err });
    }
};

exports.deleteTag = async (req, res, next) => {
    const recipeId = req.params.id;
    const tagId = req.params.tagId;
    try {
        // Vérification que la recette existe
        const [recipes] = await pool.execute("SELECT * FROM recipes WHERE _id = ?", [recipeId]);
        if (recipes.length === 0) return res.status(404).json({ msg: "Recipe not found" });
        // Vérification que l'ingredient exite
        const [tags] = await pool.execute("SELECT * FROM tags WHERE _id = ?", [tagId]);
        if (tags.length === 0) return res.status(404).json({ msg: "tags not found" });
        // Vérification des droits
        if (recipes[0].user_id === req.auth.userId || req.auth.isAdmin === 1) {
            // Suppression de l'ingredient
            await pool.execute('DELETE FROM tags WHERE _id = ?', [tagId]);
            return res.status(200).json({ msg: "tag deleted" })
        } else {
            return res.status(400).json({ msg: "Insufficient permissions" });
        }
    } catch (err) {
        return res.status(500).json({ err });
    }

}

exports.deleteTagsFromRecipe = async (req, res, next) => {
    try {
        const recipeId = req.params.id;
        // Vérification que la recette existe
        const [recipes] = await pool.execute("SELECT * FROM recipes WHERE _id = ?", [recipeId]);
        if (recipes.length === 0) return res.status(404).json({ msg: "Recipe not found" });
        // Vérification des droits
        if (recipes[0].user_id === req.auth.userId || req.auth.isAdmin === 1) {
            await pool.execute('DELETE FROM tags WHERE recipe_id = ?', [recipeId]);
            return res.status(200).json({ msg: "Tags deleted" });
        } else {
            return res.status(400).json({ msg: "Insufficient permissions" });
        }
    } catch (err) {
        return res.status(500).json({ err });
    }
};

exports.deleteIngredientsFromRecipe = async (req, res, next) => {
    try {
        const recipeId = req.params.id;
        // Vérification que la recette existe
        const [recipes] = await pool.execute("SELECT * FROM recipes WHERE _id = ?", [recipeId]);
        if (recipes.length === 0) return res.status(404).json({ msg: "Recipe not found" });
        // Vérification des droits
        if (recipes[0].user_id === req.auth.userId || req.auth.isAdmin === 1) {
            await pool.execute('DELETE FROM ingredients WHERE recipe_id = ?', [recipeId]);
            return res.status(200).json({ msg: "Ingredients deleted" });
        } else {
            return res.status(400).json({ msg: "Insufficient permissions" });
        }
    } catch (err) {
        return res.status(500).json({ err });
    }
};

exports.deleteStepsFromRecipe = async (req, res, next) => {
    try {
        const recipeId = req.params.id;
        // Vérification que la recette existe
        const [recipes] = await pool.execute("SELECT * FROM recipes WHERE _id = ?", [recipeId]);
        if (recipes.length === 0) return res.status(404).json({ msg: "Recipe not found" });
        // Vérification des droits
        if (recipes[0].user_id === req.auth.userId || req.auth.isAdmin === 1) {
            await pool.execute('DELETE FROM steps WHERE recipe_id = ?', [recipeId]);
            return res.status(200).json({ msg: "Steps deleted" });
        } else {
            return res.status(400).json({ msg: "Insufficient permissions" });
        }
    } catch (err) {
        return res.status(500).json({ err });
    }
};


exports.getCountOfRecipesByUserId = async (req, res, next) => {
    try {
        const userId = req.params.userId;

        const query = `SELECT COUNT(*) AS recipeCount FROM recipes r WHERE r.user_id = ?`;
        const [recipesCount] = await pool.execute(query, [userId]);

        return res.status(200).json({ recipeCount: recipesCount[0].recipeCount });
    } catch (err) {
        return res.status(400).json({ err });
    }
};

exports.getMostFavRecipe = async (req, res, next) => {
    try {
        const userId = req.params.userId;

        const query = `SELECT r._id, r.name, COUNT(f.recipe_id) AS favorites_count
                        FROM recipes r
                        LEFT JOIN favorites f ON r._id = f.recipe_id
                        WHERE r.user_id = ?
                        GROUP BY r._id, r.name
                        ORDER BY favorites_count DESC
                        LIMIT 1;`;
        const [recipe] = await pool.execute(query, [userId]);

        return res.status(200).json({ recipe: recipe[0] });
    } catch (err) {
        return res.status(400).json({ err });
    }
};



exports.getRecipesByResearch = async (req, res, next) => {
    try {
        const research = req.params.research;

        const query = `SELECT DISTINCT recipes.* 
                        FROM recipes
                        LEFT JOIN tags ON recipes._id = tags.recipe_id
                        LEFT JOIN ingredients ON recipes._id = ingredients.recipe_id
                        WHERE recipes.name LIKE ? 
                        OR tags.tag LIKE ? 
                        OR ingredients.name LIKE ?`;

        const [recipes] = await pool.execute(query, [`%${research}%`, `%${research}%`, `%${research}%`]);

        return res.status(200).json({ recipes: recipes });
    } catch (err) {
        return res.status(400).json({ err });
    }
};


exports.allMyRecipes = async (req, res, next) => {
    try {
        const userId = req.params.userId;
        const query = `SELECT * FROM recipes r WHERE r.user_id = ? `;
        const [recipes] = await pool.execute(query, [userId]);
        return res.status(200).json({ recipes: recipes });
    } catch (err) {
        return res.status(400).json({ err });
    }
};


exports.amITheOwnerOfTheRecipe = async (req, res, next) => {
    try {
        console.log(`--------CTRL amITheOwnerOfTheRecipe----------`);
        const recipeId = req.params.recipeId;
        const userId = req.auth.userId;

        // Get the ownerId
        const [ownerRecipe] = await pool.execute("SELECT user_id FROM recipes WHERE _id = ?", [recipeId]);

        if (ownerRecipe[0].user_id === userId || req.auth.isAdmin === 1) return res.status(200).json({ msg: "Autorisé" });
        return res.status(400).json({ msg: "Droits insufisants" });

    } catch (err) {
        return res.status(500).json({ err });
    }
};