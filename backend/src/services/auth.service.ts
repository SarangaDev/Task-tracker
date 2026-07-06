import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { ConflictError, UnauthorizedError } from '../utils/errors';
import { RegisterDto, LoginDto } from '../schemas/auth.schema';

export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export class AuthService {
  async register(dto: RegisterDto): Promise<AuthResult> {
    // Check if email is already taken
    const existing = await prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const hashedPassword = await hashPassword(dto.password);

    const user = await prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { token, user };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      // Use same message to avoid user enumeration
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await comparePassword(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: { tasks: true },
        },
      },
    });

    return user;
  }
}

export const authService = new AuthService();
