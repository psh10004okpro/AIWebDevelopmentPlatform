import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 데이터베이스 시드 시작...');

  // 테스트 사용자 생성
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: new Date(),
    },
  });

  console.log('✅ 테스트 사용자 생성:', user);

  // 샘플 프로젝트 생성
  const project = await prisma.project.create({
    data: {
      name: 'My First Project',
      description: 'A sample React project',
      template: 'react',
      userId: user.id,
      files: {
        create: [
          {
            name: 'App.tsx',
            path: '/src/App.tsx',
            language: 'typescript',
            content: `import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Hello NextGen AI Platform!</h1>
    </div>
  );
}

export default App;
`,
          },
          {
            name: 'index.tsx',
            path: '/src/index.tsx',
            language: 'typescript',
            content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
          },
        ],
      },
    },
  });

  console.log('✅ 샘플 프로젝트 생성:', project);
  console.log('🎉 시드 완료!');
}

main()
  .catch((e) => {
    console.error('❌ 시드 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
