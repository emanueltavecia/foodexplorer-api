const knex = require('../database/knex')
const DiskStorage = require('../providers/DiskStorage')
const AppError = require('../utils/AppError')

class DishesController {
  async create(req, res) {
    const { name, description, category, price, ingredients } = req.body
    const image = req.file.filename
    const user_id = req.user.id

    const diskStorage = new DiskStorage()
    const filename = await diskStorage.saveFile(image)

    const ingredientsArray = JSON.parse(ingredients || '[]')

    const [dish_id] = await knex('dishes').insert({
      name,
      description,
      category,
      price,
      image: filename,
      created_by: user_id,
      updated_by: user_id,
    })

    const ingredientsInsert = ingredientsArray.map((name) => {
      return {
        dish_id,
        name,
        created_by: user_id,
      }
    })

    await knex('ingredients').insert(ingredientsInsert)

    return res.json()
  }

  async show(req, res) {
    const { id } = req.params

    const dish = await knex('dishes').where({ id }).first()
    const ingredients = await knex('ingredients')
      .where({ dish_id: id })
      .orderBy('name')

    return res.json({
      ...dish,
      ingredients,
    })
  }

  async delete(req, res) {
    const { id } = req.params

    await knex('dishes').where({ id }).delete()

    return res.json()
  }

  async update(req, res) {
    const { id } = req.params
    const { name, description, category, price, ingredients } = req.body
    const imageFilename = req.file?.filename

    const ingredientsArray = JSON.parse(ingredients || '[]')

    const dish = await knex('dishes').where({ id }).first()

    if (!dish) {
      throw new AppError('Prato não encontrado.', 404)
    }

    const dishUpdate = {
      name: name ?? dish.name,
      description: description ?? dish.description,
      category: category ?? dish.category,
      price: price ?? dish.price,
      updated_by: req.user.id,
      updated_at: knex.fn.now(),
    }

    if (imageFilename) {
      const diskStorage = new DiskStorage()

      if (dish.image) {
        await diskStorage.deleteFile(dish.image)
      }

      const filename = await diskStorage.saveFile(imageFilename)
      dishUpdate.image = filename
    }

    if (ingredientsArray) {
      await knex('ingredients').where({ dish_id: id }).delete()

      const ingredientsInsert = ingredientsArray.map((name) => {
        return {
          dish_id: id,
          name,
          created_by: dish.created_by,
        }
      })

      await knex('ingredients').insert(ingredientsInsert)
    }

    await knex('dishes').where({ id }).update(dishUpdate)

    return res.json()
  }

  async index(req, res) {
    const { search } = req.query

    let dishes

    if (search) {
      const keywords = search.split(' ').map((keyword) => `%${keyword}%`)

      dishes = await knex('dishes')
        .select([
          'dishes.id',
          'dishes.name',
          'dishes.description',
          'dishes.category',
          'dishes.price',
          'dishes.image',
        ])
        .leftJoin('ingredients', 'dishes.id', 'ingredients.dish_id')
        .where((builder) => {
          builder.where((builder2) => {
            keywords.forEach((keyword) => {
              builder2.orWhere('dishes.name', 'like', keyword)
              builder2.orWhere('dishes.description', 'like', keyword)
            })
          })
          keywords.forEach((keyword) => {
            builder.orWhere('ingredients.name', 'like', keyword)
          })
        })
        .groupBy('dishes.id')
        .orderBy('dishes.name')
    } else {
      dishes = await knex('dishes')
        .select([
          'dishes.id',
          'dishes.name',
          'dishes.description',
          'dishes.category',
          'dishes.price',
          'dishes.image',
        ])
        .orderBy('dishes.name')
    }

    const dishesIngredients = await knex('ingredients')
    const dishesWithIngredients = dishes.map((dish) => {
      const dishIngredients = dishesIngredients.filter(
        (ingredient) => ingredient.dish_id === dish.id
      )

      return {
        ...dish,
        ingredients: dishIngredients,
      }
    })

    return res.json(dishesWithIngredients)
  }
}

module.exports = DishesController
