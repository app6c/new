import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function updateUsers() {
  try {
    console.log('Iniciando atualização de usuários...');

    // Atualizar o usuário 'analista'
    const [analista] = await db
      .update(users)
      .set({
        fullName: 'Analista Eri',
        email: 'erielsonvg@gmail.com',
        birthDate: '1984-02-11',
        phone: '9736662577',
        lastLogin: new Date().toISOString(),
        status: 'active'
      })
      .where(eq(users.username, 'analista'))
      .returning();

    console.log('Usuário analista atualizado:', analista);

    // Atualizar outros usuários sem informações
    const [teste] = await db
      .update(users)
      .set({
        fullName: 'João da Silva',
        email: 'email@email.com',
        phone: '0000000000',
        status: 'active'
      })
      .where(eq(users.username, 'teste'))
      .returning();

    console.log('Usuário teste atualizado:', teste);

    console.log('Atualização de usuários concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar usuários:', error);
  } finally {
    process.exit(0);
  }
}

updateUsers();