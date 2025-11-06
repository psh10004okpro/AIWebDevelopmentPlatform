import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@nextgen-ai-platform/database';

// PATCH: 파일 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
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
    const { content, name } = body;

    // 파일 업데이트
    const file = await prisma.file.update({
      where: {
        id: params.fileId,
        projectId: params.id,
      },
      data: {
        ...(content !== undefined && { content }),
        ...(name && { name }),
      },
    });

    return NextResponse.json({ file });
  } catch (error) {
    console.error('파일 수정 실패:', error);
    return NextResponse.json(
      { error: '파일 수정에 실패했습니다' },
      { status: 500 }
    );
  }
}

// DELETE: 파일 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
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

    // 파일 삭제
    await prisma.file.delete({
      where: {
        id: params.fileId,
        projectId: params.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('파일 삭제 실패:', error);
    return NextResponse.json(
      { error: '파일 삭제에 실패했습니다' },
      { status: 500 }
    );
  }
}
