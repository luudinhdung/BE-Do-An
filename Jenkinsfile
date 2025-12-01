pipeline {
  agent any // node Jenkins gốc để checkout

  environment {
    IMAGE = "dungsave123/chat-backend"
    DOCKER_CRED = 'dockerhub-cred'
    SSH_CRED = 'gcp-ssh-key'
    REMOTE_USER = 'dinhtuanzzzaa'
    REMOTE_HOST = '35.188.81.254'
    REMOTE_PROJECT_DIR = '/home/dinhtuanzzzaa/chat-as'
  }

  stages {

    stage('Prepare & Checkout') {
      steps {
        deleteDir() // làm sạch workspace cũ
        sh 'git config --global --add safe.directory $WORKSPACE || true'
        checkout scm
        script {
          env.IMAGE_TAG = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
          echo "Using IMAGE_TAG=${env.IMAGE_TAG}"
        }
      }
    }

    stage('Install Dependencies') {
      steps {
        sh '''
          echo "📦 Installing Node.js 20 & dependencies..."
          apk add --no-cache nodejs npm python3 make g++ || true
          node -v
          npm -v
          npm ci
          npx prisma generate --schema=./prisma/schema.prisma
        '''
      }
    }

    stage('Build Docker Image') {
      agent {
        docker {
          image 'docker:27.0.3-cli'
          args '-u root:root -v /var/run/docker.sock:/var/run/docker.sock -v $WORKSPACE:$WORKSPACE -w $WORKSPACE'
        }
      }
      steps {
        sh '''
          echo "🐳 Building Docker image..."
          docker build --no-cache -t ${IMAGE}:${IMAGE_TAG} .
        '''
      }
    }

    stage('Push Docker Image') {
      steps {
        agent {
          docker {
            image 'docker:27.0.3-cli'
            args '-u root:root -v /var/run/docker.sock:/var/run/docker.sock -v $WORKSPACE:$WORKSPACE -w $WORKSPACE'
          }
        }
        withCredentials([usernamePassword(credentialsId: "${DOCKER_CRED}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh '''
            echo "📤 Logging in to Docker Hub..."
            echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin

            echo "📤 Pushing image..."
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
