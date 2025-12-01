pipeline {
  agent any

  environment {
    IMAGE = "dungsave123/chat-backend"
    DOCKER_CRED = 'dockerhub-cred'
    SSH_CRED = 'gcp-ssh-key'
    REMOTE_USER = 'dinhtuanzzzaa'
    REMOTE_HOST = '35.188.81.254'
    REMOTE_PROJECT_DIR = '/home/dinhtuanzzzaa/chat-as'
  }

  stages {
    stage('Checkout SCM') {
      agent { label 'master' } // chạy trên node mặc định, không trong Docker
      steps {
        checkout scm
        script {
          // thêm safe.directory để tránh warning Git
          sh "git config --global --add safe.directory ${env.WORKSPACE}"
          env.IMAGE_TAG = sh(returnStdout: true, script: "git rev-parse --short HEAD").trim()
        }
      }
    }

    stage('Build & Push Docker') {
      agent {
        docker {
          image 'docker:27.0.3-cli'
          args '-u root:root -v /var/run/docker.sock:/var/run/docker.sock'
        }
      }
      steps {
        stage('Install Dependencies') {
          sh '''
            echo "📦 Installing Node.js 20 & dependencies..."
            apk add --no-cache nodejs npm
            node -v
            npm -v
            npm ci
            npx prisma generate --schema=./prisma/schema.prisma
          '''
        }

        stage('Build Docker Image') {
          sh "docker build -t ${IMAGE}:${IMAGE_TAG} ."
        }

        stage('Push Docker Image') {
          withCredentials([usernamePassword(credentialsId: "${DOCKER_CRED}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
            sh '''
              echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
              docker push ${IMAGE}:${IMAGE_TAG}
              docker tag ${IMAGE}:${IMAGE_TAG} ${IMAGE}:latest
              docker push ${IMAGE}:latest
            '''
          }
        }
      }
    }

    stage('Deploy to Remote VM') {
      agent { label 'master' } // deploy cũng chạy trên node mặc định
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
