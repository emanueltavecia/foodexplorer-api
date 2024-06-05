const { hash, compare } = require('bcryptjs')
const AppError = require('../utils/AppError')
const knex = require('../database/knex')

class UsersController {
  async create(req, res) {
    const { name, email, password } = req.body

    const checkUserExists = await knex('users').where('email', email).first()

    if (checkUserExists) {
      throw new AppError('Este e-mail já está em uso.')
    }

    const hashedPassword = await hash(password, 8)

    await knex('users').insert({
      name,
      email,
      password: hashedPassword,
    })

    return res.status(201).json()
  }

  async update(req, res) {
    const { name, email, password, old_password } = req.body
    const user_id = req.user.id

    const user = await knex('users').where('id', user_id).first()

    if (!user) {
      throw new AppError('Usuário não encontrado.')
    }

    const userWithUpdatedEmail = await knex('users')
      .where('email', email)
      .whereNot('id', user_id)
      .first()

    if (userWithUpdatedEmail) {
      throw new AppError('Este e-mail já está em uso.')
    }

    const updatedUser = { name: name ?? user.name, email: email ?? user.email }

    if (password && !old_password) {
      throw new AppError(
        'Você precisa informar a senha antiga para definir a nova senha.'
      )
    }

    if (password && old_password) {
      const checkOldPassword = await compare(old_password, user.password)

      if (!checkOldPassword) {
        throw new AppError('A senha antiga não confere.')
      }

      updatedUser.password = await hash(password, 8)
    }

    updatedUser.updated_at = knex.raw('DATETIME("now")')

    await knex('users').where('id', user_id).update(updatedUser)

    return res.status(200).json()
  }
}

module.exports = UsersController
