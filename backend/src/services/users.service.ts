import prisma from '../config/database';

export const userService = {
  async searchUsers(query: string) {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      take: 10,
    });
    return users;
  }
};
