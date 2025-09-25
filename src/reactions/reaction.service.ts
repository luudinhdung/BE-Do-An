import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ReactionService {
  constructor(private prisma: PrismaService) {}

  async addReaction(userId: string, messageId: string, emoji: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    let reactions = (msg?.reactions as any[]) || [];

    const existing = reactions.find((r) => r.userId === userId);
    if (existing) {
      existing.emoji = emoji;
    } else {
      reactions.push({ userId, emoji });
    }

    // ✅ Trả về full message sau khi update
    return this.prisma.message.update({
      where: { id: messageId },
      data: { reactions },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  async removeReaction(userId: string, messageId: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    let reactions = (msg?.reactions as any[]) || [];
    reactions = reactions.filter((r) => r.userId !== userId);

    // ✅ Trả về full message sau khi update
    return this.prisma.message.update({
      where: { id: messageId },
      data: { reactions },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
    });
  }
}
