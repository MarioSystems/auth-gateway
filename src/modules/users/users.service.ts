import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  private static readonly SALT_ROUNDS = 10;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria um novo usuário aplicando hash bcrypt com salt (10 rounds) na senha.
   * Retorna os dados seguros do usuário (sem a senha).
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const normalizedEmail = createUserDto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('O e-mail informado já está em uso.');
    }

    const passwordHash = await bcrypt.hash(
      createUserDto.password,
      UsersService.SALT_ROUNDS,
    );

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        status: UserStatus.ACTIVE,
      },
    });

    return UserResponseDto.fromEntity(user);
  }

  /**
   * Busca um usuário pelo e-mail e retorna um DTO seguro.
   * A senha/hash nunca é retornada nesta busca.
   */
  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return null;
    }

    return UserResponseDto.fromEntity(user);
  }

  /**
   * Método interno para autenticação/validação de credenciais.
   * ATENÇÃO: Nunca exponha o retorno deste método diretamente em controllers HTTP.
   */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();

    return this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
  }

  /**
   * Compara uma senha em texto plano com um hash bcrypt armazenado.
   */
  async comparePassword(
    plainText: string,
    passwordHash: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainText, passwordHash);
  }
}
