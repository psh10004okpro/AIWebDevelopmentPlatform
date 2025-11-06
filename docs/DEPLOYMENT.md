# 배포 가이드 (Deployment Guide)

NextGen AI Platform의 프로덕션 배포 가이드입니다.

---

## 목차

1. [사전 요구사항](#사전-요구사항)
2. [AWS EKS 배포](#aws-eks-배포)
3. [Docker Compose 배포](#docker-compose-배포)
4. [환경 변수 설정](#환경-변수-설정)
5. [데이터베이스 마이그레이션](#데이터베이스-마이그레이션)
6. [모니터링 설정](#모니터링-설정)
7. [성능 테스트](#성능-테스트)
8. [보안 설정](#보안-설정)
9. [트러블슈팅](#트러블슈팅)

---

## 사전 요구사항

### 필수 도구
- AWS CLI v2
- kubectl v1.28+
- Helm v3.12+
- Docker v24+
- Docker Compose v2.20+
- k6 (성능 테스트)

### AWS 리소스
- AWS 계정
- EKS 클러스터 생성 권한
- Route 53 도메인
- ACM SSL 인증서
- RDS PostgreSQL (선택)
- S3 버킷 (백업용)

### API 키
- Anthropic Claude API Key
- OpenAI API Key
- HyperCLOVA X API Keys (3개)
- OAuth 클라이언트 ID/Secret (GitHub, Google, Kakao, Naver)

---

## AWS EKS 배포

### 1단계: EKS 클러스터 생성

```bash
# AWS CLI 설정
aws configure

# EKS 클러스터 생성 (서울 리전)
eksctl create cluster \
  --name nextgen-ai-platform \
  --region ap-northeast-2 \
  --nodegroup-name standard-workers \
  --node-type t3.xlarge \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10 \
  --managed \
  --with-oidc

# kubectl 설정
aws eks update-kubeconfig \
  --region ap-northeast-2 \
  --name nextgen-ai-platform

# 클러스터 확인
kubectl get nodes
```

**예상 소요 시간:** 15-20분

---

### 2단계: AWS Load Balancer Controller 설치

```bash
# IAM Policy 생성
curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json

aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam_policy.json

# Service Account 생성
eksctl create iamserviceaccount \
  --cluster=nextgen-ai-platform \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::ACCOUNT_ID:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve

# Helm으로 설치
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=nextgen-ai-platform \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

# 설치 확인
kubectl get deployment -n kube-system aws-load-balancer-controller
```

---

### 3단계: EBS CSI Driver 설치 (Persistent Volume용)

```bash
# IAM Role 생성
eksctl create iamserviceaccount \
  --name ebs-csi-controller-sa \
  --namespace kube-system \
  --cluster nextgen-ai-platform \
  --attach-policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy \
  --approve \
  --role-only \
  --role-name AmazonEKS_EBS_CSI_DriverRole

# EBS CSI Driver 설치
eksctl create addon \
  --name aws-ebs-csi-driver \
  --cluster nextgen-ai-platform \
  --service-account-role-arn arn:aws:iam::ACCOUNT_ID:role/AmazonEKS_EBS_CSI_DriverRole \
  --force
```

---

### 4단계: EFS CSI Driver 설치 (Audit Logs용)

```bash
# EFS 파일 시스템 생성
aws efs create-file-system \
  --region ap-northeast-2 \
  --performance-mode generalPurpose \
  --throughput-mode bursting \
  --encrypted \
  --tags Key=Name,Value=nextgen-ai-platform-efs

# EFS CSI Driver 설치
helm repo add aws-efs-csi-driver https://kubernetes-sigs.github.io/aws-efs-csi-driver/
helm repo update

helm upgrade -i aws-efs-csi-driver aws-efs-csi-driver/aws-efs-csi-driver \
  --namespace kube-system \
  --set image.repository=602401143452.dkr.ecr.ap-northeast-2.amazonaws.com/eks/aws-efs-csi-driver
```

---

### 5단계: Secrets 설정

**방법 1: AWS Secrets Manager (권장)**

```bash
# Secrets Manager에 시크릿 생성
aws secretsmanager create-secret \
  --name nextgen-ai-platform/production \
  --secret-string file://secrets.json \
  --region ap-northeast-2

# External Secrets Operator 설치
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace
```

**방법 2: kubectl로 직접 생성**

```bash
# .env.production 파일에서 시크릿 생성
kubectl create secret generic nextgen-ai-platform-secrets \
  --from-env-file=.env.production \
  --namespace=nextgen-ai-platform
```

---

### 6단계: 애플리케이션 배포

```bash
# Namespace 생성
kubectl apply -f infrastructure/kubernetes/base/namespace.yaml

# ConfigMap 배포
kubectl apply -f infrastructure/kubernetes/base/configmap.yaml

# Secrets 배포 (이미 생성한 경우 생략)
kubectl apply -f infrastructure/kubernetes/base/secrets.yaml

# Database 배포
kubectl apply -f infrastructure/kubernetes/base/postgres.yaml
kubectl apply -f infrastructure/kubernetes/base/qdrant.yaml

# 애플리케이션 배포
kubectl apply -f infrastructure/kubernetes/base/web.yaml
kubectl apply -f infrastructure/kubernetes/base/ai-orchestrator.yaml
kubectl apply -f infrastructure/kubernetes/base/microservices.yaml

# Ingress 배포
kubectl apply -f infrastructure/kubernetes/base/ingress.yaml

# 모니터링 배포
kubectl apply -f infrastructure/kubernetes/monitoring/prometheus.yaml
kubectl apply -f infrastructure/kubernetes/monitoring/grafana.yaml

# 배포 상태 확인
kubectl get pods -n nextgen-ai-platform
kubectl get svc -n nextgen-ai-platform
kubectl get ingress -n nextgen-ai-platform
```

---

### 7단계: DNS 설정

```bash
# Ingress의 Load Balancer 주소 확인
kubectl get ingress -n nextgen-ai-platform

# Route 53에서 A 레코드 생성
# ai-platform.example.com -> ALB CNAME
# api.ai-platform.example.com -> ALB CNAME
```

---

### 8단계: SSL 인증서 설정

```bash
# ACM에서 인증서 요청
aws acm request-certificate \
  --domain-name ai-platform.example.com \
  --subject-alternative-names api.ai-platform.example.com \
  --validation-method DNS \
  --region ap-northeast-2

# DNS 검증 레코드 추가
# Route 53에 CNAME 레코드 추가

# 인증서 ARN을 ingress.yaml에 업데이트
# alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:...
```

---

## Docker Compose 배포 (단일 서버용)

### 1단계: 서버 준비

```bash
# Ubuntu 22.04 서버에서

# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 설치 확인
docker --version
docker-compose --version
```

---

### 2단계: 프로젝트 클론

```bash
# Git 설치
sudo apt-get update
sudo apt-get install -y git

# 프로젝트 클론
git clone https://github.com/yourusername/nextgen-ai-platform.git
cd nextgen-ai-platform
```

---

### 3단계: 환경 변수 설정

```bash
# .env.production 파일 생성
cp .env.example .env.production

# 환경 변수 편집
nano .env.production
```

필수 환경 변수:
- `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `NEXTAUTH_SECRET`
- OAuth 클라이언트 ID/Secret

---

### 4단계: 이미지 빌드 및 배포

```bash
# 프로덕션 이미지 빌드
docker-compose -f docker-compose.prod.yml build

# 서비스 시작
docker-compose -f docker-compose.prod.yml up -d

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f

# 서비스 상태 확인
docker-compose -f docker-compose.prod.yml ps
```

---

### 5단계: NGINX 설정 (리버스 프록시)

```bash
# NGINX 설치
sudo apt-get install -y nginx

# 설정 파일 생성
sudo nano /etc/nginx/sites-available/nextgen-ai-platform
```

```nginx
upstream nextgen_web {
    server localhost:3000;
}

upstream nextgen_api {
    server localhost:3002;
}

server {
    listen 80;
    server_name ai-platform.example.com;

    # HTTPS 리다이렉트
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ai-platform.example.com;

    # SSL 인증서
    ssl_certificate /etc/letsencrypt/live/ai-platform.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ai-platform.example.com/privkey.pem;

    # SSL 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Content-Security-Policy "default-src 'self';" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;

    location / {
        proxy_pass http://nextgen_web;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://nextgen_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# 설정 활성화
sudo ln -s /etc/nginx/sites-available/nextgen-ai-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### 6단계: Let's Encrypt SSL

```bash
# Certbot 설치
sudo apt-get install -y certbot python3-certbot-nginx

# SSL 인증서 발급
sudo certbot --nginx -d ai-platform.example.com

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

---

## 환경 변수 설정

### 필수 환경 변수

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nextgen_ai_platform

# NextAuth
NEXTAUTH_URL=https://ai-platform.example.com
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# AI Providers
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
HYPERCLOVA_API_KEY=xxxxx
HYPERCLOVA_API_KEY_PRIMARY_VAL=xxxxx
HYPERCLOVA_APIGW_API_KEY=xxxxx

# OAuth
GITHUB_ID=xxxxx
GITHUB_SECRET=xxxxx
GOOGLE_ID=xxxxx
GOOGLE_SECRET=xxxxx
KAKAO_CLIENT_ID=xxxxx
KAKAO_CLIENT_SECRET=xxxxx
NAVER_CLIENT_ID=xxxxx
NAVER_CLIENT_SECRET=xxxxx

# Services
QDRANT_URL=http://qdrant:6333
RAG_SERVICE_URL=http://rag-service:3005
SECURITY_ENHANCER_URL=http://security-enhancer:3006
AUDIT_LOGGER_URL=http://audit-logger:3007
KOREAN_TEMPLATES_URL=http://korean-templates:3008

# PIPA Compliance
PIPA_COMPLIANCE_ENABLED=true
DATA_RETENTION_DAYS=2190

# Monitoring
GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 32)
```

---

## 데이터베이스 마이그레이션

### Prisma 마이그레이션

```bash
# 개발 환경에서
cd packages/database
pnpm db:push

# 프로덕션에서
DATABASE_URL="postgresql://..." pnpm db:push
```

### 백업 설정

```bash
# 자동 백업 스크립트
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
DB_NAME="nextgen_ai_platform"

# 백업 실행
pg_dump -h localhost -U postgres $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# 7일 이상 된 백업 삭제
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

# S3에 업로드
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://nextgen-backups/postgres/
```

```bash
# Cron 등록
crontab -e
# 매일 새벽 3시 백업
0 3 * * * /usr/local/bin/backup-postgres.sh
```

---

## 모니터링 설정

### Prometheus 메트릭 확인

```bash
# Prometheus UI 접속
kubectl port-forward -n nextgen-ai-platform svc/prometheus-service 9090:9090

# 브라우저에서
http://localhost:9090
```

### Grafana 대시보드

```bash
# Grafana UI 접속
kubectl port-forward -n nextgen-ai-platform svc/grafana-service 3100:3000

# 브라우저에서
http://localhost:3100

# 로그인
Username: admin
Password: (GRAFANA_ADMIN_PASSWORD 환경 변수)
```

### 알림 설정

```yaml
# prometheus/alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'

route:
  receiver: 'slack-notifications'
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h

receivers:
- name: 'slack-notifications'
  slack_configs:
  - channel: '#alerts'
    title: 'NextGen AI Platform Alert'
    text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

---

## 성능 테스트

### k6 부하 테스트

```bash
# k6 설치
brew install k6  # macOS
# or
sudo apt-get install k6  # Ubuntu

# 테스트 실행
k6 run infrastructure/scripts/load-test.js

# 특정 VU(Virtual Users) 수로 실행
k6 run --vus 100 --duration 30s infrastructure/scripts/load-test.js

# 결과를 HTML로 저장
k6 run --out json=results.json infrastructure/scripts/load-test.js
```

### 성능 목표

| 메트릭 | 목표 | 측정 방법 |
|-------|------|----------|
| 동시 접속자 | 1,000+ | k6 load test |
| API 응답 시간 (p95) | < 500ms | Prometheus |
| 코드 생성 시간 (p95) | < 3s | Application logs |
| 프리뷰 로딩 (p95) | < 1s | Browser timing |
| 가용성 | 99.9% | Uptime monitoring |

---

## 보안 설정

### WAF 설정 (AWS WAF)

```bash
# WAF WebACL 생성
aws wafv2 create-web-acl \
  --name NextGenAIPlatformWAF \
  --scope REGIONAL \
  --region ap-northeast-2 \
  --default-action Allow={} \
  --rules file://waf-rules.json
```

### Security Group 설정

```bash
# ALB Security Group
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# EKS Node Security Group
# 내부 트래픽만 허용
aws ec2 authorize-security-group-ingress \
  --group-id sg-yyyyy \
  --source-group sg-xxxxx \
  --protocol tcp \
  --port 1-65535
```

### 침투 테스트

```bash
# OWASP ZAP
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://ai-platform.example.com

# Nikto
nikto -h https://ai-platform.example.com

# SSL Labs 테스트
https://www.ssllabs.com/ssltest/analyze.html?d=ai-platform.example.com
```

---

## 트러블슈팅

### Pod가 시작되지 않음

```bash
# Pod 상태 확인
kubectl describe pod <pod-name> -n nextgen-ai-platform

# 로그 확인
kubectl logs <pod-name> -n nextgen-ai-platform

# 이전 컨테이너 로그 확인 (재시작된 경우)
kubectl logs <pod-name> -n nextgen-ai-platform --previous
```

### 데이터베이스 연결 실패

```bash
# PostgreSQL 연결 테스트
kubectl run -it --rm debug --image=postgres:16 --restart=Never -- \
  psql -h postgres-service -U postgres -d nextgen_ai_platform

# 네트워크 정책 확인
kubectl get networkpolicies -n nextgen-ai-platform
```

### 높은 메모리 사용량

```bash
# 메트릭 확인
kubectl top pods -n nextgen-ai-platform

# HPA 상태 확인
kubectl get hpa -n nextgen-ai-platform

# 리소스 제한 조정
kubectl edit deployment <deployment-name> -n nextgen-ai-platform
```

### 느린 응답 시간

```bash
# Prometheus에서 확인
http_request_duration_seconds{quantile="0.95"}

# Tracing (Jaeger 설치 필요)
kubectl port-forward -n monitoring svc/jaeger-query 16686:16686
```

---

## 롤백

### Kubernetes 배포 롤백

```bash
# 롤백 히스토리 확인
kubectl rollout history deployment/web -n nextgen-ai-platform

# 이전 버전으로 롤백
kubectl rollout undo deployment/web -n nextgen-ai-platform

# 특정 리비전으로 롤백
kubectl rollout undo deployment/web --to-revision=2 -n nextgen-ai-platform
```

### Docker Compose 롤백

```bash
# 이전 버전 이미지로 변경
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# 특정 버전으로
docker-compose -f docker-compose.prod.yml down
VERSION=v1.0.0 docker-compose -f docker-compose.prod.yml up -d
```

---

## 체크리스트

### 배포 전
- [ ] 모든 환경 변수 설정 완료
- [ ] SSL 인증서 발급
- [ ] DNS 레코드 설정
- [ ] 데이터베이스 백업
- [ ] 보안 감사 완료
- [ ] 성능 테스트 통과

### 배포 후
- [ ] 헬스체크 확인
- [ ] 로그 확인
- [ ] 모니터링 알림 설정
- [ ] 백업 자동화 설정
- [ ] 문서 업데이트

---

## 지원

문제가 발생하면 다음으로 연락하세요:

**DevOps 팀:** devops@nextgen-ai-platform.com
**긴급 연락처:** +82-10-XXXX-XXXX (24/7)
**Slack:** #platform-operations

---

**마지막 업데이트:** 2025-11-06
