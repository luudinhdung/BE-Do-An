import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async createFeedback(data: {
    userId?: string;
    name?: string;
    email?: string;
    phone?: string;
    content: string;
    screenshots?: string[];
  }) {
    return this.prisma.feedback.create({
      data: {
        userId: data.userId ?? null,
        name: data.name ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        content: data.content,
        screenshots: data.screenshots ?? [],
      },
    });
  }

  async getAllFeedbacks() {
    return this.prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string) {
    return this.prisma.feedback.update({
      where: { id },
      data: { read: true },
    });
  }
}
