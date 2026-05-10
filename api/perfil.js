import { getPerfil, json } from './_helpers.js';

export default async function handler(req, res) {
  try {
    const { user, perfil } = await getPerfil(req);
    if (!user) return json(res, 401, { error: 'Não autenticado.' });
    return json(res, 200, { user: { id: user.id, email: user.email }, perfil });
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
}
