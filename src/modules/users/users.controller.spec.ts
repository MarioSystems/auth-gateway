import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

describe('UsersController (BDD)', () => {
  let controller: UsersController;
  let usersService: {
    create: jest.Mock;
    findByEmail: jest.Mock;
  };

  const mockDate = new Date('2026-10-29T12:00:00.000Z');

  beforeEach(async () => {
    usersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('Cenário: POST /users', () => {
    it('Dado payload válido, deve chamar o serviço e retornar UserResponseDto seguro', async () => {
      const dto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedResponse: UserResponseDto = {
        id: 'uuid-1',
        email: 'test@example.com',
        status: UserStatus.ACTIVE,
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      usersService.create.mockResolvedValue(expectedResponse);

      const result = await controller.create(dto);

      expect(usersService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResponse);
      expect(Object.hasOwn(result, 'passwordHash')).toBe(false);
    });
  });

  describe('Cenário: GET /users/by-email', () => {
    it('Dado e-mail existente, deve retornar o UserResponseDto', async () => {
      const expectedResponse: UserResponseDto = {
        id: 'uuid-1',
        email: 'test@example.com',
        status: UserStatus.ACTIVE,
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      usersService.findByEmail.mockResolvedValue(expectedResponse);

      const result = await controller.findByEmail('test@example.com');

      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual(expectedResponse);
      expect(Object.hasOwn(result, 'passwordHash')).toBe(false);
    });

    it('Dado e-mail inexistente, deve lançar NotFoundException', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        controller.findByEmail('nao_existe@example.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
