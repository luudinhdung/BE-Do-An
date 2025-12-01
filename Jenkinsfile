pipeline {
  agent {
    docker {
      // Image có sẵn Docker CLI, ta mount Docker socket để Jenkins dùng Docker ngoài host
      image 'docker:27.0.3-cli'
      args '-u root:root -v /var/run/docker.sock:/var/run/docker.sock'
    }
  }

  environment {
    IMAGE = "dungsave123/chat-backend"
    DOCKER_CRED = 'dockerhub-cred'
    SSH_CRED = 'gcp-ssh-key'
    REMOTE_USER = 'dinhtuanzzzaa'
    REMOTE_HOST = '35.188.81.254'
    REMOTE_PROJECT_DIR = '/home/dinhtuanzzzaa/chat-as'
  }

  stages {

    stage('Clean & Checkout') {
      steps {
        // Xóa sạch workspace để tránh lỗi không có .git
        deleteDir()

        // Checkout repo
        checkout([
          $class: 'GitSCM',
          branches: [[name: '*/main']],
          userRemoteConfigs: [[
            url: 'https://github.com/luudinhdung/BE-Do-An'
          ]]
        ])

        // Tránh lỗi safe.directory khi Jenkins user khác
        sh 'git config --global --add safe.directory $WORKSPACE || true'

        // Lấy short commit hash làm IMAGE_TAG
        script {
          env.IMAGE_TAG = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
          echo "IMAGE_TAG=${env.IMAGE_TAG}"
        }
      }
    }

    stage('Install Dependencies') {
      steps {
        sh '''
          echo "📦 Installing Node.js 20 & dependencies..."
          apk add --no-cache nodejs npm
          node -v
          npm -v
          npm ci
          npx prisma generate --schema=./prisma/schema.prisma
        '''
      }
    }

    stage('Build Docker Image') {
      steps {
        sh '''
          echo "🐳 Building Docker image..."
          docker build -t ${IMAGE}:${IMAGE_TAG} .
        '''
      }
    }

    stage('Push Docker Image') {
      steps {
        withCredentials([usernamePassword(credentialsId: "${DOCKER_CRED}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh '''
            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
            docker push ${IMAGE}:${IMAGE_TAG}
            docker tag ${IMAGE}:${IMAGE_TAG} ${IMAGE}:latest
            docker push ${IMAGE}:latest
          '''
        }
      }
    }

    stage('Deploy to Remote VM') {
      steps {
        sshagent([SSH_CRED]) {
          sh """
            echo "🚀 Deploying to remote server..."
            ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} '
              cd ${REMOTE_PROJECT_DIR} &&
              docker compose pull backend || true &&
              docker compose up -d backend
            '
          """
        }
      }
    }
  }

  post {
    success {
      echo "✅ Successfully deployed ${IMAGE}:${IMAGE_TAG}"
    }
    failure {
      echo "❌ Pipeline failed."
    }
  }
}
