import { pool } from '../server/db.js';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

async function hashPassword(password) {
  const salt = Buffer.from(randomBytes(16)).toString('hex');
  const hash = await bcrypt.hash(password, 10);
  return hash;
}

async function seedUsers() {
  try {
    console.log('Iniciando seed de usuários...');
    
    // Deletar usuários existentes com esses nomes de usuário para evitar duplicações
    await pool.query(`DELETE FROM users WHERE username IN ('teste', 'analista')`);
    
    // Criar usuário de teste
    const testePassword = await hashPassword('teste');
    await pool.query(
      `INSERT INTO users (username, password) VALUES ($1, $2)`,
      ['teste', testePassword]
    );
    console.log('Usuário "teste" criado com sucesso');
    
    // Criar usuário analista (admin)
    const analistaPassword = await hashPassword('analista');
    await pool.query(
      `INSERT INTO users (username, password) VALUES ($1, $2)`,
      ['analista', analistaPassword]
    );
    console.log('Usuário "analista" criado com sucesso');
    
    console.log('Seed de usuários concluído!');
  } catch (error) {
    console.error('Erro ao realizar seed de usuários:', error);
  } finally {
    await pool.end();
  }
}

seedUsers();