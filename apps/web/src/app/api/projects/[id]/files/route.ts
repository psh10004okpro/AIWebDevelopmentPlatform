import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@nextgen-ai-platform/database';
import { z } from 'zod';

const CreateFileSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  content: z.string(),
  language: z.string().default('typescript'),
});

// POST: 파일 생성
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 프로젝트 소유권 확인
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = CreateFileSchema.parse(body);

    // 파일 생성
    const file = await prisma.file.create({
      data: {
        name: validatedData.name,
        path: validatedData.path,
        content: validatedData.content,
        language: validatedData.language,
        projectId: params.id,
      },
    });

    return NextResponse.json({ file }, { status: 201 });
  } catch (error) {
    console.error('파일 생성 실패:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '잘못된 요청 형식', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '파일 생성에 실패했습니다' },
      { status: 500 }
    );
  }
}
