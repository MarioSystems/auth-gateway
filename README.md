# Auth Gateway

O **auth-gateway** é um sistema centralizado de segurança que atua como a única porta de entrada (*Edge Service*) para o ecossistema de APIs de uma organização. Ele isola toda a lógica de autenticação, autorização (RBAC), controle de tráfego (*Rate Limiting*) e gerenciamento de sessões em uma única camada robusta e de alta performance, protegendo os microsserviços internos (*downstream*).

---

## Documentação Completa

Para entender a fundo a arquitetura do projeto, modelagem de dados e decisões técnicas, acesse a documentação oficial:
* [ Documentação Online (Docs)](https://docs.google.com/document/d/1UFIm1TcWHH1bEc23Ctl5NnnnF7hC3PGC5RCMsukE-cI/edit?usp=sharing)
* [ Baixar Documentação em PDF](https://github.com/user-attachments/files/28226543/auth-gateway.pdf)

---

## Tecnologias Utilizadas

* **Framework:** [NestJS](https://nestjs.com/) (TypeScript)
* **Banco de Dados Relacional:** [PostgreSQL](https://www.postgresql.org/)
* **ORM:** [Prisma](https://www.prisma.io/)
* **Cache & Session Storage:** [Redis](https://redis.io/)
* **Segurança:** Passport JWT, Bcrypt, Helmet, NestJS Throttler

---

## Funcionalidades Chave

* **Autenticação Stateless & Stateful:** Emissão de *Access Token* (JWT) de curta duração e *Refresh Token* de longa duração (salvo no Redis com rotação de tokens).
* **Segurança de Cookies:** Refresh Tokens transmitidos via cookies seguros `$HttpOnly$` e `$Secure$`.
* **RBAC Híbrido:** Controle de acesso baseado em Papéis (*Roles*) e Permissões granulares (*Permissions*) sem necessidade de alteração de código.
* **Rate Limiting:** Proteção integrada contra ataques de força bruta e DDoS gerenciada via Redis.
* **Proxy Reverso:** Encaminhamento transparente de requisições para microsserviços internos com enriquecimento de cabeçalhos (`X-User-Id`, `X-User-Role`).

---

## Metodologia de Desenvolvimento

* **Metodologia:** TDD Estrito + BDD (*Behavior-Driven Development*)
* **Objetivo:** Determinismo absoluto e tolerância zero a regressões de comportamento.
* **Na Prática:** Testes de cenários de acesso baseados em comportamento (ex: *"Dado que um usuário possui a role 'Admin', quando ele tenta acessar a rota restrita X, então o acesso deve ser permitido"*) utilizando a sintaxe descritiva do BDD, além de 100% de cobertura de testes em componentes críticos como validadores de tokens, guards e auxiliares de criptografia.

---

## Como Executar o Projeto

### Pré-requisitos
* [Node.js](https://nodejs.org/) (v18 ou superior)
* [Docker](https://www.docker.com/) e Docker Compose

### 1. Clonar o Repositório
```bash
git clone [https://github.com/seu-usuario/auth-gateway.git](https://github.com/seu-usuario/auth-gateway.git)
cd auth-gateway

```

### 2. Configurar as Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com base no `.env.example`:

```bash
cp .env.example .env

```

Altere as credenciais no arquivo `.env` se necessário.

### 3. Subir a Infraestrutura (Docker)

Inicie os serviços do PostgreSQL e Redis:

```bash
docker-compose up -d

```

### 4. Instalar as Dependências e Rodar as Migrations

```bash
npm install
npx prisma migrate dev
npm run seed

```

### 5. Iniciar a Aplicação

```bash
# Modo de desenvolvimento
npm run start:dev

# Modo de produção
npm run build
npm run start:prod

```


## Estrutura do Projeto

```text
src/
├── modules/
│   ├── auth/          # Login, Logout e Renovação de Tokens (Refresh)
│   ├── users/         # Gerenciamento de usuários e criptografia de senhas
│   ├── rbac/          # Guards e Decorators de Roles/Permissions
│   ├── gateway/       # Proxy reverso para microsserviços downstream
│   └── rate-limiter/  # Throttling e controle de tráfego via Redis
└── shared/            # Filtros de exceção, interceptores e utilitários

```


## Autor

* **Mário Alex Barbosa Pereira** - *Idealização e Desenvolvimento* - [GitHub](https://www.google.com/search?q=https://github.com/MarioAlex1)
