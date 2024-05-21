const knex = require('../database/knex')
const AppError = require('../utils/AppError')

async function checkAdminPermission(req, res, next) {
  const user_id = req.user.id

  const user = await knex('users').where({ id: user_id }).first()

  if (!user.is_admin) {
    throw new AppError(
      'Sua conta não tem permissões de administrador para realizar essa operação.',
      401
    )
  }

  return next()
}

module.exports = checkAdminPermission
