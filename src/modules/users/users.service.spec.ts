import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

describe('UsersService (BDD)', () => {
  let service: UsersService;
  let prismaService: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };

  const mockDate = new Date('2026-10-29T12:00:00.000Z');

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Cenário: Criação de novo usuário', () => {
    const createUserDto: CreateUserDto = {
      email: 'mario@example.com',
      password: 'password123#Secure',
    };

    it('Dado que os dados são válidos e o e-mail não existe, quando create() for chamado, então deve aplicar hash bcrypt com 10 salt rounds e persistir com segurança', async () => {
      // Dado
      prismaService.user.findUnique.mockResolvedValue(null);

      const fakeDbUser = {
        id: 'uuid-1234-5678',
        email: 'mario@example.com',
        passwordHash: '$2b$10$hashed_password_sample_mock',
        status: UserStatus.ACTIVE,
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      prismaService.user.create.mockResolvedValue(fakeDbUser);

      // Quando
      const result = await service.create(createUserDto);

      // Então
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'mario@example.com' },
      });

      // Valida que o hash gerado é de fato correspondente à senha original
      const callData = (
        prismaService.user.create.mock.calls[0] as [
          {
            data: {
              email: string;
              passwordHash: string;
              status: UserStatus;
            };
          },
        ]
      )[0].data;
      expect(callData.email).toBe('mario@example.com');
      expect(callData.status).toBe(UserStatus.ACTIVE);
      expect(callData.passwordHash).toMatch(/^\$2[aby]?\$10\$/);
      const isPasswordValid = await bcrypt.compare(
        'password123#Secure',
        callData.passwordHash,
      );
      expect(isPasswordValid).toBe(true);

      // Garantia de segurança: a senha/hash NUNCA deve ser retornada no DTO de resposta
      expect(result).toEqual({
        id: 'uuid-1234-5678',
        email: 'mario@example.com',
        status: UserStatus.ACTIVE,
        createdAt: mockDate,
        updatedAt: mockDate,
      });
      expect(Object.hasOwn(result, 'passwordHash')).toBe(false);
      expect(Object.hasOwn(result, 'password')).toBe(false);
    });

    it('Dado um e-mail com espaços e maiúsculas, quando create() for chamado, então deve normalizar o e-mail para lowercase e trimmed', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue({
        id: 'uuid-1234',
        email: 'mario@example.com',
        passwordHash: 'hash',
        status: UserStatus.ACTIVE,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      await service.create({
        email: '   Mario@Example.COM   ',
        password: 'password123#Secure',
      });

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'mario@example.com' },
      });
      const callData = (
        prismaService.user.create.mock.calls[0] as [{ data: { email: string } }]
      )[0].data;
      expect(callData.email).toBe('mario@example.com');
    });

    it('Dado que o e-mail já existe no sistema, quando create() for chamado, então deve lançar ConflictException e não persistir', async () => {
      // Dado
      prismaService.user.findUnique.mockResolvedValue({
        id: 'existing-uuid',
        email: 'mario@example.com',
        passwordHash: 'hash',
        status: UserStatus.ACTIVE,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      // Quando & Então
      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('Cenário: Busca de usuário por e-mail (Exposição Segura)', () => {
    it('Dado um e-mail de um usuário existente, quando findByEmail() for chamado, então deve retornar o DTO seguro SEM passwordHash', async () => {
      // Dado
      const fakeDbUser = {
        id: 'uuid-1234',
        email: 'mario@example.com',
        passwordHash: '$2b$10$very_secret_hash_that_must_not_leak',
        status: UserStatus.ACTIVE,
        createdAt: mockDate,
        updatedAt: mockDate,
      };
      prismaService.user.findUnique.mockResolvedValue(fakeDbUser);

      // Quando
      const result = await service.findByEmail('   Mario@Example.com  ');

      // Então
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'mario@example.com' },
      });
      expect(result).toBeDefined();
      expect(result).toEqual({
        id: 'uuid-1234',
        email: 'mario@example.com',
        status: UserStatus.ACTIVE,
        createdAt: mockDate,
        updatedAt: mockDate,
      });
      if (!result) {
        throw new Error('Usuário esperado no teste');
      }
      expect(Object.hasOwn(result, 'passwordHash')).toBe(false);
      expect(Object.hasOwn(result, 'password')).toBe(false);
    });

    it('Dado um e-mail inexistente, quando findByEmail() for chamado, então deve retornar null', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('inexistente@example.com');

      expect(result).toBeNull();
    });
  });

  describe('Cenário: Método interno para autenticação e verificação de senha', () => {
    it('Dado um e-mail válido, quando findByEmailWithPassword() for chamado internamente, então deve retornar o usuário com o hash', async () => {
      const fakeDbUser = {
        id: 'uuid-1234',
        email: 'mario@example.com',
        passwordHash: '$2b$10$supersecret',
        status: UserStatus.ACTIVE,
        createdAt: mockDate,
        updatedAt: mockDate,
      };
      prismaService.user.findUnique.mockResolvedValue(fakeDbUser);

      const result = await service.findByEmailWithPassword('mario@example.com');

      expect(result).toEqual(fakeDbUser);
      expect(result?.passwordHash).toBe('$2b$10$supersecret');
    });

    it('Dado uma senha e um hash bcrypt, quando comparePassword() for chamado, deve validar corretamente a correspondência', async () => {
      const plainPassword = 'mySecretPassword!';
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(plainPassword, salt);

      const isMatch = await service.comparePassword(plainPassword, hash);
      const isWrong = await service.comparePassword('wrong-password', hash);

      expect(isMatch).toBe(true);
      expect(isWrong).toBe(false);
    });
  });
});
