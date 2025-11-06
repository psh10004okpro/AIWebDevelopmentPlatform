import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@nextgen-ai-platform/database';

// GET: 특정 프로젝트 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        files: {
          orderBy: {
            path: 'asc',
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('프로젝트 조회 실패:', error);
    return NextResponse.json(
      { error: '프로젝트를 불러오는데 실패했습니다' },
      { status: 500 }
    );
  }
}

// DELETE: 프로젝트 삭제
export async function DELETE(
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

    // 프로젝트 삭제 (파일도 함께 삭제됨)
    await prisma.project.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('프로젝트 삭제 실패:', error);
    return NextResponse.json(
      { error: '프로젝트 삭제에 실패했습니다' },
      { status: 500 }
    );
  }
}

// PATCH: 프로젝트 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

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

    // 프로젝트 업데이트
    const updatedProject = await prisma.project.update({
      where: {
        id: params.id,
      },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    });

    return NextResponse.json({ project: updatedProject });
  } catch (error) {
    console.error('프로젝트 수정 실패:', error);
    return NextResponse.json(
      { error: '프로젝트 수정에 실패했습니다' },
      { status: 500 }
    );
  }
}
